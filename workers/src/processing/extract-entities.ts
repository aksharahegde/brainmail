import { createDb } from '@brainmail/db';
import { entities } from '@brainmail/db/schema';
import { and, eq } from 'drizzle-orm';

import { createId } from '../lib/crypto';
import { extractEntities } from './ai';
import { getEmailById, updateEmailProcessingState } from './state';
import type { EmailCategory, EmailPipelineMessage } from './types';

export async function processEntityExtraction(
  env: Env,
  message: EmailPipelineMessage,
): Promise<void> {
  const email = await getEmailById(env, message.emailId, message.userId);
  if (!email) {
    throw new Error('Email not found');
  }

  const extracted = await extractEntities(env, {
    subject: email.subject,
    sender: email.sender,
    bodyText: email.bodyText ?? email.snippet,
    category: (email.category ?? 'other') as EmailCategory,
  });

  const db = createDb(env.DB);
  await db
    .delete(entities)
    .where(
      and(
        eq(entities.userId, message.userId),
        eq(entities.sourceId, message.emailId),
      ),
    );

  for (const entity of extracted) {
    await db.insert(entities).values({
      id: createId('entity'),
      userId: message.userId,
      entityType: entity.entityType,
      confidence: entity.confidence,
      sourceId: message.emailId,
      data: entity.data,
    });
  }

  await updateEmailProcessingState(env, message.emailId, {
    processingStatus: 'entities_extracted',
    processingError: null,
  });

  await env.EMBEDDING_GENERATION_QUEUE.send({
    type: 'process_email',
    emailId: message.emailId,
    userId: message.userId,
  });
}
