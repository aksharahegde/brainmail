import { createDb } from '@brainmail/db';
import { accounts } from '@brainmail/db/schema';
import { eq } from 'drizzle-orm';

import { encryptSecret } from '../crypto';
import { decryptAccountToken } from '../google-oauth';
import { getSecretEnv } from '../env';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type AccountRecord = typeof accounts.$inferSelect;

function getTokenExpiresAt(expiresIn?: number): string | undefined {
  if (!expiresIn) {
    return undefined;
  }

  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

function readTokenExpiresAt(
  metadata: AccountRecord['metadata'],
): string | null {
  if (
    metadata &&
    typeof metadata === 'object' &&
    'tokenExpiresAt' in metadata &&
    typeof metadata.tokenExpiresAt === 'string'
  ) {
    return metadata.tokenExpiresAt;
  }

  return null;
}

function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return true;
  }

  return Date.parse(expiresAt) <= Date.now() + 60_000;
}

async function refreshAccessToken(
  env: Env,
  account: AccountRecord,
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string }> {
  const secretEnv = getSecretEnv(env);
  if (!secretEnv.GOOGLE_CLIENT_ID || !secretEnv.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth is not configured');
  }

  const refreshToken = await decryptAccountToken(
    env,
    account.encryptedRefreshToken,
  );
  if (!refreshToken) {
    throw new Error('Gmail account is missing a refresh token');
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: secretEnv.GOOGLE_CLIENT_ID,
      client_secret: secretEnv.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed (${response.status})`);
  }

  const tokenResponse = (await response.json()) as GoogleTokenResponse;
  const encryptionKey = getSecretEnv(env).TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not configured');
  }

  const db = createDb(env.DB);
  const metadata = {
    ...(account.metadata ?? {}),
    tokenExpiresAt: getTokenExpiresAt(tokenResponse.expires_in),
  };

  await db
    .update(accounts)
    .set({
      encryptedAccessToken: await encryptSecret(
        tokenResponse.access_token,
        encryptionKey,
      ),
      encryptedRefreshToken: tokenResponse.refresh_token
        ? await encryptSecret(tokenResponse.refresh_token, encryptionKey)
        : account.encryptedRefreshToken,
      metadata,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(accounts.id, account.id));

  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresAt: metadata.tokenExpiresAt,
  };
}

export async function getValidAccessToken(
  env: Env,
  account: AccountRecord,
): Promise<string> {
  const currentToken = await decryptAccountToken(
    env,
    account.encryptedAccessToken,
  );
  const expiresAt = readTokenExpiresAt(account.metadata);

  if (currentToken && !isTokenExpired(expiresAt)) {
    return currentToken;
  }

  const refreshed = await refreshAccessToken(env, account);
  return refreshed.accessToken;
}
