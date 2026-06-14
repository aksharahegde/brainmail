import { classifyEmail } from './ai';
import { getEmailById, updateEmailProcessingState } from './state';
import type { EmailPipelineMessage } from './types';

export async function processEmailClassification(
  env: Env,
  message: EmailPipelineMessage,
): Promise<void> {
  const email = await getEmailById(env, message.emailId, message.userId);
  if (!email) {
    throw new Error('Email not found');
  }

  const result = await classifyEmail(env, {
    subject: email.subject,
    sender: email.sender,
    bodyText: email.bodyText ?? email.snippet,
  });

  await updateEmailProcessingState(env, message.emailId, {
    processingStatus: 'classified',
    category: result.category,
    classificationConfidence: result.confidence,
    processingError: null,
  });

  await env.ENTITY_EXTRACTION_QUEUE.send({
    type: 'process_email',
    emailId: message.emailId,
    userId: message.userId,
  });
}
