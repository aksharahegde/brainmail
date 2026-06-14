import { createDb } from '@brainmail/db';
import { accounts, emails, sources } from '@brainmail/db/schema';
import { and, eq } from 'drizzle-orm';

import { createId } from '../crypto';
import {
  getGmailMessageMetadata,
  getGmailMessageRaw,
  getGmailProfile,
  getHeaderValue,
  listGmailHistory,
  listGmailMessages,
  parseRecipientList,
} from './client';
import { ensureGmailSyncState, updateGmailSyncState } from './sync-state';
import { getValidAccessToken } from './tokens';
import type { GmailSyncMode } from './types';
import { setupGmailWatch } from './watch';

const INITIAL_SYNC_LIMIT = 25;

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  );
  return atob(padded);
}

async function ensureGmailSource(
  env: Env,
  userId: string,
  accountId: string,
  email: string | null,
) {
  const db = createDb(env.DB);
  const existing = await db
    .select()
    .from(sources)
    .where(
      and(
        eq(sources.userId, userId),
        eq(sources.sourceType, 'gmail'),
        eq(sources.externalId, accountId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const source = {
    id: createId('source'),
    userId,
    sourceType: 'gmail',
    externalId: accountId,
    title: email ?? 'Gmail',
    metadata: { accountId },
  };

  await db.insert(sources).values(source);
  return source;
}

async function storeGmailMessage(
  env: Env,
  input: {
    userId: string;
    sourceId: string;
    accessToken: string;
    gmailMessageId: string;
    threadId: string;
  },
): Promise<boolean> {
  const db = createDb(env.DB);
  const existing = await db
    .select({ id: emails.id })
    .from(emails)
    .where(
      and(
        eq(emails.userId, input.userId),
        eq(emails.gmailMessageId, input.gmailMessageId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return false;
  }

  const metadata = await getGmailMessageMetadata(
    input.accessToken,
    input.gmailMessageId,
  );
  const rawMessage = await getGmailMessageRaw(
    input.accessToken,
    input.gmailMessageId,
  );
  const rawPath = `raw/${input.userId}/${input.gmailMessageId}.eml`;

  if (rawMessage.raw) {
    const rawBytes = decodeBase64Url(rawMessage.raw);
    await env.ATTACHMENTS.put(rawPath, rawBytes, {
      httpMetadata: { contentType: 'message/rfc822' },
    });
  }

  const emailId = createId('email');
  await db.insert(emails).values({
    id: emailId,
    sourceId: input.sourceId,
    userId: input.userId,
    threadId: input.threadId,
    gmailMessageId: input.gmailMessageId,
    subject: getHeaderValue(metadata, 'Subject'),
    sender: getHeaderValue(metadata, 'From'),
    recipients: parseRecipientList(getHeaderValue(metadata, 'To')),
    snippet: metadata.snippet ?? null,
    receivedAt: metadata.internalDate
      ? new Date(Number(metadata.internalDate)).toISOString()
      : null,
    rawPath,
  });

  await env.EMAIL_INGESTION_QUEUE.send({
    type: 'email_ingested',
    emailId,
    userId: input.userId,
    sourceId: input.sourceId,
  });

  return true;
}

async function runInitialSync(
  env: Env,
  account: typeof accounts.$inferSelect,
  accessToken: string,
) {
  const profile = await getGmailProfile(accessToken);
  const source = await ensureGmailSource(
    env,
    account.userId,
    account.id,
    profile.emailAddress,
  );

  const listed = await listGmailMessages(accessToken, {
    maxResults: INITIAL_SYNC_LIMIT,
  });

  let importedCount = 0;
  for (const message of listed.messages ?? []) {
    const imported = await storeGmailMessage(env, {
      userId: account.userId,
      sourceId: source.id,
      accessToken,
      gmailMessageId: message.id,
      threadId: message.threadId,
    });
    if (imported) {
      importedCount += 1;
    }
  }

  await updateGmailSyncState(env, account.id, {
    status: 'idle',
    historyId: profile.historyId,
    lastSyncedAt: new Date().toISOString(),
    lastError: null,
    syncedMessageCount: importedCount,
    initialSyncComplete: true,
  });

  await setupGmailWatch(env, account, accessToken);
}

async function runIncrementalSync(
  env: Env,
  account: typeof accounts.$inferSelect,
  accessToken: string,
  startHistoryId: string,
) {
  const syncState = await ensureGmailSyncState(env, account.id, account.userId);
  const profile = await getGmailProfile(accessToken);
  const source = await ensureGmailSource(
    env,
    account.userId,
    account.id,
    profile.emailAddress,
  );

  const history = await listGmailHistory(accessToken, startHistoryId);
  let importedCount = 0;

  for (const record of history.history ?? []) {
    for (const added of record.messagesAdded ?? []) {
      const imported = await storeGmailMessage(env, {
        userId: account.userId,
        sourceId: source.id,
        accessToken,
        gmailMessageId: added.message.id,
        threadId: added.message.threadId,
      });
      if (imported) {
        importedCount += 1;
      }
    }
  }

  await updateGmailSyncState(env, account.id, {
    status: env.GMAIL_PUBSUB_TOPIC ? 'watching' : 'idle',
    historyId: history.historyId ?? profile.historyId,
    lastSyncedAt: new Date().toISOString(),
    lastError: null,
    syncedMessageCount: (syncState.syncedMessageCount ?? 0) + importedCount,
    initialSyncComplete: Boolean(syncState.initialSyncComplete),
  });
}

export async function syncGmailAccount(
  env: Env,
  accountId: string,
  userId: string,
  mode: GmailSyncMode,
): Promise<void> {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.id, accountId),
        eq(accounts.userId, userId),
        eq(accounts.provider, 'gmail'),
      ),
    )
    .limit(1);

  const account = rows[0];
  if (!account) {
    throw new Error('Gmail account not found');
  }

  await ensureGmailSyncState(env, account.id, account.userId);
  await updateGmailSyncState(env, account.id, {
    status: 'syncing',
    lastError: null,
  });

  try {
    const accessToken = await getValidAccessToken(env, account);
    const syncState = await ensureGmailSyncState(
      env,
      account.id,
      account.userId,
    );

    if (
      mode === 'incremental' &&
      syncState.historyId &&
      syncState.initialSyncComplete
    ) {
      await runIncrementalSync(env, account, accessToken, syncState.historyId);
      return;
    }

    await runInitialSync(env, account, accessToken);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Gmail sync failed';
    await updateGmailSyncState(env, account.id, {
      status: 'error',
      lastError: message,
    });
    throw error;
  }
}

export async function enqueueGmailSync(
  env: Env,
  accountId: string,
  userId: string,
  mode: GmailSyncMode = 'initial',
): Promise<void> {
  await ensureGmailSyncState(env, accountId, userId);
  await updateGmailSyncState(env, accountId, {
    status: 'pending',
    lastError: null,
  });

  await env.EMAIL_INGESTION_QUEUE.send({
    type: 'sync_account',
    accountId,
    userId,
    mode,
  });
}
