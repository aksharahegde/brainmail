import { createDb } from '@brainmail/db';
import { embeddings } from '@brainmail/db/schema';
import { eq } from 'drizzle-orm';

import { createId } from '../lib/crypto';
import { evaluateEmailCollections } from '../collections/evaluate';
import { evaluateEmailAutomations } from '../automations/service';
import { generateEmbedding } from './ai';
import { buildEmailEmbeddingInput } from './ingest';
import { getEmailById, updateEmailProcessingState } from './state';
import type { EmailPipelineMessage } from './types';

export async function processEmailEmbedding(
  env: Env,
  message: EmailPipelineMessage,
): Promise<void> {
  const email = await getEmailById(env, message.emailId, message.userId);
  if (!email) {
    throw new Error('Email not found');
  }

  const embeddingInput = buildEmailEmbeddingInput(
    email.subject,
    email.sender,
    email.bodyText,
    email.bodyHtml,
  );
  const vector = await generateEmbedding(env, embeddingInput);
  const db = createDb(env.DB);
  let vectorId: string | null = null;

  if (vector && env.EMBEDDINGS) {
    vectorId = `email_${message.emailId}`;
    await env.EMBEDDINGS.upsert([
      {
        id: vectorId,
        values: vector,
        metadata: {
          userId: message.userId,
          emailId: message.emailId,
          category: email.category ?? 'other',
        },
      },
    ]);
  }

  const existing = await db
    .select({ id: embeddings.id })
    .from(embeddings)
    .where(eq(embeddings.entityId, message.emailId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(embeddings)
      .set({
        vectorId,
        entityType: 'email',
      })
      .where(eq(embeddings.id, existing[0].id));
  } else {
    await db.insert(embeddings).values({
      id: createId('embedding'),
      userId: message.userId,
      entityType: 'email',
      entityId: message.emailId,
      vectorId,
    });
  }

  await updateEmailProcessingState(env, message.emailId, {
    processingStatus: 'completed',
    processedAt: new Date().toISOString(),
    processingError: null,
  });

  await evaluateEmailCollections(env, {
    userId: message.userId,
    emailId: message.emailId,
  });

  await evaluateEmailAutomations(env, {
    userId: message.userId,
    emailId: message.emailId,
  });
}
