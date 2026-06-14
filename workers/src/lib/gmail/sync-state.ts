import { createDb } from '@brainmail/db';
import { accounts, gmailSyncStates } from '@brainmail/db/schema';
import { and, eq } from 'drizzle-orm';

import { createId } from '../crypto';
import type { GmailSyncStatus, GmailSyncStatusView } from './types';

function readAccountEmail(metadata: unknown): string | null {
  if (
    metadata &&
    typeof metadata === 'object' &&
    'email' in metadata &&
    typeof metadata.email === 'string'
  ) {
    return metadata.email;
  }

  return null;
}

export async function ensureGmailSyncState(
  env: Env,
  accountId: string,
  userId: string,
) {
  const db = createDb(env.DB);
  const existing = await db
    .select()
    .from(gmailSyncStates)
    .where(eq(gmailSyncStates.accountId, accountId))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const record = {
    id: createId('gmail_sync'),
    accountId,
    userId,
    status: 'pending' as GmailSyncStatus,
    historyId: null,
    watchExpiration: null,
    lastSyncedAt: null,
    lastError: null,
    syncedMessageCount: 0,
    initialSyncComplete: 0,
    updatedAt: new Date().toISOString(),
  };

  await db.insert(gmailSyncStates).values(record);
  return record;
}

export async function updateGmailSyncState(
  env: Env,
  accountId: string,
  patch: Partial<{
    status: GmailSyncStatus;
    historyId: string | null;
    watchExpiration: string | null;
    lastSyncedAt: string | null;
    lastError: string | null;
    syncedMessageCount: number;
    initialSyncComplete: boolean;
  }>,
) {
  const db = createDb(env.DB);
  await db
    .update(gmailSyncStates)
    .set({
      ...patch,
      initialSyncComplete:
        patch.initialSyncComplete === undefined
          ? undefined
          : patch.initialSyncComplete
            ? 1
            : 0,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(gmailSyncStates.accountId, accountId));
}

export async function listGmailSyncStatusForUser(
  env: Env,
  userId: string,
): Promise<GmailSyncStatusView[]> {
  const db = createDb(env.DB);
  const rows = await db
    .select({
      accountId: accounts.id,
      provider: accounts.provider,
      metadata: accounts.metadata,
      status: gmailSyncStates.status,
      historyId: gmailSyncStates.historyId,
      watchExpiration: gmailSyncStates.watchExpiration,
      lastSyncedAt: gmailSyncStates.lastSyncedAt,
      lastError: gmailSyncStates.lastError,
      syncedMessageCount: gmailSyncStates.syncedMessageCount,
      initialSyncComplete: gmailSyncStates.initialSyncComplete,
    })
    .from(accounts)
    .leftJoin(gmailSyncStates, eq(gmailSyncStates.accountId, accounts.id))
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'gmail')));

  return rows.map((row) => ({
    accountId: row.accountId,
    provider: row.provider,
    email: readAccountEmail(row.metadata),
    status: (row.status ?? 'pending') as GmailSyncStatus,
    historyId: row.historyId,
    watchExpiration: row.watchExpiration,
    lastSyncedAt: row.lastSyncedAt,
    lastError: row.lastError,
    syncedMessageCount: row.syncedMessageCount ?? 0,
    initialSyncComplete: Boolean(row.initialSyncComplete),
  }));
}

export async function findGmailAccountByEmail(env: Env, emailAddress: string) {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.provider, 'gmail'));

  return (
    rows.find((row) => readAccountEmail(row.metadata) === emailAddress) ?? null
  );
}

export async function listGmailAccountsForSync(env: Env) {
  const db = createDb(env.DB);
  return db.select().from(accounts).where(eq(accounts.provider, 'gmail'));
}
