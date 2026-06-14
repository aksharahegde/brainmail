import type { GmailSyncQueueMessage } from '../lib/gmail/types';
import { listGmailAccountsForSync } from '../lib/gmail/sync-state';
import { syncGmailAccount } from '../lib/gmail/sync';
import { renewExpiringGmailWatches } from '../lib/gmail/watch';

function isGmailSyncMessage(body: unknown): body is GmailSyncQueueMessage {
  if (!body || typeof body !== 'object' || !('type' in body)) {
    return false;
  }

  const type = (body as { type?: string }).type;
  return (
    type === 'sync_account' || type === 'sync_all' || type === 'renew_watches'
  );
}

export async function handleQueueBatch(
  batch: MessageBatch<unknown>,
  env: Env,
): Promise<void> {
  console.log(
    JSON.stringify({
      event: 'queue_batch_received',
      queue: batch.queue,
      messageCount: batch.messages.length,
      environment: env.ENVIRONMENT ?? 'local',
    }),
  );

  for (const message of batch.messages) {
    try {
      const body = message.body;

      if (isGmailSyncMessage(body)) {
        if (body.type === 'sync_account') {
          await syncGmailAccount(env, body.accountId, body.userId, body.mode);
        }

        if (body.type === 'sync_all') {
          const accounts = await listGmailAccountsForSync(env);
          for (const account of accounts) {
            await syncGmailAccount(env, account.id, account.userId, body.mode);
          }
        }

        if (body.type === 'renew_watches') {
          await renewExpiringGmailWatches(env);
        }
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'queue_message_failed',
          queue: batch.queue,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
      message.retry();
      continue;
    }

    message.ack();
  }
}
