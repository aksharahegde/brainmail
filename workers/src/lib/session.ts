import { createDb } from '@brainmail/db';
import { sessions, users } from '@brainmail/db/schema';
import { and, eq, gt } from 'drizzle-orm';

import {
  addDurationIso,
  createId,
  createSessionToken,
  hashSessionToken,
  isExpired,
} from './crypto';
import { getSecretEnv } from './env';

export const SESSION_COOKIE_NAME = 'brainmail_session';
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  timezone: string | null;
};

export type AuthSession = {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
};

function getSessionSecret(env: Env): string {
  const secret = getSecretEnv(env).SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }
  return secret;
}

export function getSessionToken(request: Request): string | null {
  const authorization = request.headers.get('Authorization');
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(';')) {
    const [name, ...valueParts] = part.trim().split('=');
    if (name === SESSION_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join('='));
    }
  }

  return null;
}

export function buildSessionCookie(
  token: string,
  expiresAt: string,
  appUrl?: string,
): string {
  const expires = new Date(expiresAt).toUTCString();
  const secure = appUrl?.startsWith('https://') ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}${secure}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function createUserSession(
  env: Env,
  userId: string,
): Promise<AuthSession> {
  const db = createDb(env.DB);
  const token = createSessionToken();
  const tokenHash = await hashSessionToken(token, getSessionSecret(env));
  const expiresAt = addDurationIso(SESSION_DURATION_MS);
  const sessionId = createId('session');

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    tokenHash,
    expiresAt,
  });

  return { id: sessionId, userId, token, expiresAt };
}

export async function resolveSessionUser(
  env: Env,
  request: Request,
): Promise<SessionUser | null> {
  const token = getSessionToken(request);
  if (!token) {
    return null;
  }

  const db = createDb(env.DB);
  const tokenHash = await hashSessionToken(token, getSessionSecret(env));
  const nowIso = new Date().toISOString();

  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      timezone: users.timezone,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, nowIso)),
    )
    .limit(1);

  const row = rows[0];
  if (!row || isExpired(row.expiresAt)) {
    return null;
  }

  await db
    .update(sessions)
    .set({ lastSeenAt: nowIso })
    .where(eq(sessions.id, row.sessionId));

  return {
    id: row.userId,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
    timezone: row.timezone,
  };
}

export async function revokeSession(
  env: Env,
  request: Request,
): Promise<boolean> {
  const token = getSessionToken(request);
  if (!token) {
    return false;
  }

  const db = createDb(env.DB);
  const tokenHash = await hashSessionToken(token, getSessionSecret(env));
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  return true;
}

export async function revokeAllUserSessions(
  env: Env,
  userId: string,
): Promise<void> {
  const db = createDb(env.DB);
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
