import type { GmailSyncQueueMessage } from '../lib/gmail/types';
import { listGmailAccountsForSync } from '../lib/gmail/sync-state';
import { syncGmailAccount } from '../lib/gmail/sync';
import { renewExpiringGmailWatches } from '../lib/gmail/watch';
import { processEmailClassification } from '../processing/classify';
import { processEmailEmbedding } from '../processing/embed';
import { processEntityExtraction } from '../processing/extract-entities';
import { processEmailIngestion } from '../processing/ingest';
import { processEmailAttachments } from '../processing/process-attachments';
import { updateEmailProcessingState } from '../processing/state';
import { runScheduledInsightGeneration } from '../insights/service';
import { runScheduledAutomations } from '../automations/service';
import type {
  AttachmentPipelineMessage,
  EmailIngestedMessage,
  EmailPipelineMessage,
} from '../processing/types';

function isGmailSyncMessage(body: unknown): body is GmailSyncQueueMessage {
  if (!body || typeof body !== 'object' || !('type' in body)) {
    return false;
  }

  const type = (body as { type?: string }).type;
  return (
    type === 'sync_account' || type === 'sync_all' || type === 'renew_watches'
  );
}

function isEmailIngestedMessage(body: unknown): body is EmailIngestedMessage {
  return (
    !!body &&
    typeof body === 'object' &&
    (body as { type?: string }).type === 'email_ingested' &&
    typeof (body as EmailIngestedMessage).emailId === 'string'
  );
}

function isEmailPipelineMessage(body: unknown): body is EmailPipelineMessage {
  return (
    !!body &&
    typeof body === 'object' &&
    (body as { type?: string }).type === 'process_email' &&
    typeof (body as EmailPipelineMessage).emailId === 'string'
  );
}

function isAttachmentPipelineMessage(
  body: unknown,
): body is AttachmentPipelineMessage {
  return (
    !!body &&
    typeof body === 'object' &&
    (body as { type?: string }).type === 'process_attachments' &&
    typeof (body as AttachmentPipelineMessage).emailId === 'string'
  );
}

function isAutomationExecutionMessage(body: unknown): body is {
  type: 'run_scheduled_automations';
  schedule?: 'daily' | 'weekly';
} {
  return (
    !!body &&
    typeof body === 'object' &&
    (body as { type?: string }).type === 'run_scheduled_automations'
  );
}

function isInsightGenerationMessage(
  body: unknown,
): body is { type: 'generate_daily_insights'; scheduledAt?: string } {
  return (
    !!body &&
    typeof body === 'object' &&
    (body as { type?: string }).type === 'generate_daily_insights'
  );
}

function queueIncludes(queueName: string, token: string): boolean {
  return queueName.includes(token);
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
    const body = message.body;
    let emailId: string | undefined;

    try {
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
      } else if (
        queueIncludes(batch.queue, 'email-ingestion') &&
        isEmailIngestedMessage(body)
      ) {
        emailId = body.emailId;
        await processEmailIngestion(env, body);
      } else if (
        queueIncludes(batch.queue, 'classification') &&
        isEmailPipelineMessage(body)
      ) {
        emailId = body.emailId;
        await processEmailClassification(env, body);
      } else if (
        queueIncludes(batch.queue, 'entity-extraction') &&
        isEmailPipelineMessage(body)
      ) {
        emailId = body.emailId;
        await processEntityExtraction(env, body);
      } else if (
        queueIncludes(batch.queue, 'attachment-processing') &&
        isAttachmentPipelineMessage(body)
      ) {
        emailId = body.emailId;
        await processEmailAttachments(env, body);
      } else if (
        queueIncludes(batch.queue, 'embedding-generation') &&
        isEmailPipelineMessage(body)
      ) {
        emailId = body.emailId;
        await processEmailEmbedding(env, body);
      } else if (
        queueIncludes(batch.queue, 'insight-generation') &&
        isInsightGenerationMessage(body)
      ) {
        await runScheduledInsightGeneration(env);
      } else if (
        queueIncludes(batch.queue, 'automation-execution') &&
        isAutomationExecutionMessage(body)
      ) {
        await runScheduledAutomations(env, body.schedule ?? 'daily');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Queue processing failed';

      if (emailId) {
        await updateEmailProcessingState(env, emailId, {
          processingStatus: 'failed',
          processingError: errorMessage,
        });
      }

      console.error(
        JSON.stringify({
          event: 'queue_message_failed',
          queue: batch.queue,
          emailId,
          error: errorMessage,
        }),
      );
      message.retry();
      continue;
    }

    message.ack();
  }
}
