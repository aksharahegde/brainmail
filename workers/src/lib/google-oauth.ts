import { createDb } from '@brainmail/db';
import { accounts, gmailSyncStates, oauthStates, users } from '@brainmail/db/schema';
import { and, eq } from 'drizzle-orm';

import {
  addDurationIso,
  createId,
  createOAuthState,
  decryptSecret,
  encryptSecret,
  isExpired,
} from './crypto';
import { enqueueGmailSync } from './gmail/sync';
import { getSecretEnv } from './env';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

const LOGIN_SCOPES = ['openid', 'email', 'profile'];
const GMAIL_CONNECT_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
];

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

export type OAuthPurpose = 'login' | 'connect';

function requireGoogleConfig(env: Env): {
  clientId: string;
  clientSecret: string;
} {
  const secretEnv = getSecretEnv(env);
  if (!secretEnv.GOOGLE_CLIENT_ID || !secretEnv.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth is not configured');
  }

  return {
    clientId: secretEnv.GOOGLE_CLIENT_ID,
    clientSecret: secretEnv.GOOGLE_CLIENT_SECRET,
  };
}

function getAppUrl(env: Env): string {
  return env.APP_URL ?? 'http://localhost:3000';
}

export function getGoogleRedirectUri(env: Env): string {
  const path = env.GOOGLE_OAUTH_REDIRECT_PATH ?? '/api/v1/auth/google/callback';
  return new URL(path, getAppUrl(env)).toString();
}

function scopesForProvider(provider: string, purpose: OAuthPurpose): string[] {
  if (purpose === 'login') {
    return LOGIN_SCOPES;
  }

  if (provider === 'gmail') {
    return GMAIL_CONNECT_SCOPES;
  }

  return LOGIN_SCOPES;
}

export async function createOAuthAuthorizationUrl(
  env: Env,
  options: {
    provider: string;
    purpose: OAuthPurpose;
    userId?: string;
  },
): Promise<string> {
  const { clientId } = requireGoogleConfig(env);
  const db = createDb(env.DB);
  const state = createOAuthState();
  const stateId = createId('oauth_state');

  await db.insert(oauthStates).values({
    id: stateId,
    state,
    userId: options.userId ?? null,
    provider: options.provider,
    purpose: options.purpose,
    expiresAt: addDurationIso(1000 * 60 * 10),
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(env),
    response_type: 'code',
    scope: scopesForProvider(options.provider, options.purpose).join(' '),
    state,
    include_granted_scopes: 'true',
  });

  if (options.purpose === 'connect') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  } else {
    params.set('prompt', 'select_account');
  }

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function exchangeAuthorizationCode(
  env: Env,
  code: string,
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = requireGoogleConfig(env);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleRedirectUri(env),
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status})`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

async function fetchGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Google userinfo failed (${response.status})`);
  }

  return (await response.json()) as GoogleUserInfo;
}

async function loadOAuthState(env: Env, state: string) {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(oauthStates)
    .where(eq(oauthStates.state, state))
    .limit(1);

  const record = rows[0];
  if (!record || isExpired(record.expiresAt)) {
    return null;
  }

  await db.delete(oauthStates).where(eq(oauthStates.id, record.id));
  return record;
}

async function upsertGoogleAccount(
  env: Env,
  input: {
    userId: string;
    provider: string;
    providerAccountId: string;
    accessToken?: string;
    refreshToken?: string;
    metadata?: Record<string, unknown>;
    tokenExpiresIn?: number;
  },
) {
  if (!getSecretEnv(env).TOKEN_ENCRYPTION_KEY) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not configured');
  }

  const db = createDb(env.DB);
  const existing = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, input.userId),
        eq(accounts.provider, input.provider),
        eq(accounts.providerAccountId, input.providerAccountId),
      ),
    )
    .limit(1);

  const encryptionKey = getSecretEnv(env).TOKEN_ENCRYPTION_KEY!;
  const encryptedAccessToken = input.accessToken
    ? await encryptSecret(input.accessToken, encryptionKey)
    : undefined;
  const encryptedRefreshToken = input.refreshToken
    ? await encryptSecret(input.refreshToken, encryptionKey)
    : undefined;

  if (existing[0]) {
    const mergedMetadata = {
      ...(existing[0].metadata ?? {}),
      ...(input.metadata ?? {}),
      ...(input.tokenExpiresIn
        ? {
            tokenExpiresAt: new Date(
              Date.now() + input.tokenExpiresIn * 1000,
            ).toISOString(),
          }
        : {}),
    };

    await db
      .update(accounts)
      .set({
        encryptedAccessToken:
          encryptedAccessToken ?? existing[0].encryptedAccessToken,
        encryptedRefreshToken:
          encryptedRefreshToken ?? existing[0].encryptedRefreshToken,
        metadata: mergedMetadata,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(accounts.id, existing[0].id));
    return existing[0].id;
  }

  const accountId = createId('account');
  const mergedMetadata = {
    ...(input.metadata ?? {}),
    ...(input.tokenExpiresIn
      ? {
          tokenExpiresAt: new Date(
            Date.now() + input.tokenExpiresIn * 1000,
          ).toISOString(),
        }
      : {}),
  };

  await db.insert(accounts).values({
    id: accountId,
    userId: input.userId,
    provider: input.provider,
    providerAccountId: input.providerAccountId,
    encryptedAccessToken: encryptedAccessToken ?? null,
    encryptedRefreshToken: encryptedRefreshToken ?? null,
    metadata: mergedMetadata,
  });

  return accountId;
}

async function findUserByEmail(env: Env, email: string) {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0] ?? null;
}

export async function handleGoogleOAuthCallback(
  env: Env,
  code: string,
  state: string,
): Promise<{ userId: string; purpose: OAuthPurpose }> {
  const oauthState = await loadOAuthState(env, state);
  if (!oauthState) {
    throw new Error('Invalid or expired OAuth state');
  }

  const tokenResponse = await exchangeAuthorizationCode(env, code);
  const profile = await fetchGoogleUserInfo(tokenResponse.access_token);
  const db = createDb(env.DB);

  if (oauthState.purpose === 'connect') {
    if (!oauthState.userId) {
      throw new Error('OAuth connect requires an authenticated user');
    }

    const accountId = await upsertGoogleAccount(env, {
      userId: oauthState.userId,
      provider: oauthState.provider,
      providerAccountId: profile.sub,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenExpiresIn: tokenResponse.expires_in,
      metadata: {
        email: profile.email,
        scope: tokenResponse.scope,
      },
    });

    if (oauthState.provider === 'gmail') {
      await enqueueGmailSync(env, accountId, oauthState.userId, 'initial');
    }

    return { userId: oauthState.userId, purpose: 'connect' };
  }

  let user = await findUserByEmail(env, profile.email);

  if (!user) {
    const newUser = {
      id: createId('user'),
      email: profile.email,
      name: profile.name ?? null,
      avatarUrl: profile.picture ?? null,
      timezone: null,
    };
    await db.insert(users).values(newUser);
    user = { ...newUser, createdAt: null, updatedAt: null };
  } else if (profile.name || profile.picture) {
    await db
      .update(users)
      .set({
        name: profile.name ?? user.name,
        avatarUrl: profile.picture ?? user.avatarUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));
  }

  await upsertGoogleAccount(env, {
    userId: user.id,
    provider: 'google',
    providerAccountId: profile.sub,
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    tokenExpiresIn: tokenResponse.expires_in,
    metadata: {
      email: profile.email,
      scope: tokenResponse.scope,
    },
  });

  return { userId: user.id, purpose: 'login' };
}

export async function listUserAccounts(env: Env, userId: string) {
  const db = createDb(env.DB);
  const rows = await db
    .select({
      id: accounts.id,
      provider: accounts.provider,
      providerAccountId: accounts.providerAccountId,
      metadata: accounts.metadata,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .where(eq(accounts.userId, userId));

  return rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    providerAccountId: row.providerAccountId,
    email:
      typeof row.metadata === 'object' &&
      row.metadata &&
      'email' in row.metadata &&
      typeof row.metadata.email === 'string'
        ? row.metadata.email
        : null,
    createdAt: row.createdAt,
  }));
}

export async function disconnectAccount(
  env: Env,
  userId: string,
  accountId: string,
): Promise<boolean> {
  const db = createDb(env.DB);
  const rows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);

  if (!rows[0]) {
    return false;
  }

  await db.delete(accounts).where(eq(accounts.id, accountId));
  await db
    .delete(gmailSyncStates)
    .where(eq(gmailSyncStates.accountId, accountId));
  return true;
}

export async function decryptAccountToken(
  env: Env,
  encryptedValue: string | null,
): Promise<string | null> {
  if (!encryptedValue) {
    return null;
  }

  const encryptionKey = getSecretEnv(env).TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) {
    return null;
  }

  return decryptSecret(encryptedValue, encryptionKey);
}
