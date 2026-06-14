import type { accounts } from '@brainmail/db/schema';

import { startGmailWatch } from './client';
import {
  ensureGmailSyncState,
  listGmailAccountsForSync,
  updateGmailSyncState,
} from './sync-state';
import { getValidAccessToken } from './tokens';

type AccountRecord = typeof accounts.$inferSelect;

export async function setupGmailWatch(
  env: Env,
  account: AccountRecord,
  accessToken: string,
): Promise<void> {
  const topicName = env.GMAIL_PUBSUB_TOPIC;
  if (!topicName) {
    await updateGmailSyncState(env, account.id, {
      status: 'idle',
    });
    return;
  }

  try {
    const watch = await startGmailWatch(accessToken, topicName);
    await updateGmailSyncState(env, account.id, {
      status: 'watching',
      historyId: watch.historyId,
      watchExpiration: new Date(Number(watch.expiration)).toISOString(),
      lastError: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Gmail watch setup failed';
    await updateGmailSyncState(env, account.id, {
      status: 'idle',
      lastError: message,
    });
  }
}

export async function renewExpiringGmailWatches(env: Env): Promise<void> {
  if (!env.GMAIL_PUBSUB_TOPIC) {
    return;
  }

  const accountsToRenew = await listGmailAccountsForSync(env);
  const renewBefore = Date.now() + 1000 * 60 * 60 * 24;

  for (const account of accountsToRenew) {
    const syncState = await ensureGmailSyncState(
      env,
      account.id,
      account.userId,
    );
    if (!syncState.watchExpiration) {
      continue;
    }

    if (Date.parse(syncState.watchExpiration) > renewBefore) {
      continue;
    }

    const accessToken = await getValidAccessToken(env, account);
    await setupGmailWatch(env, account, accessToken);
  }
}
