import { createDb } from '@brainmail/db';
import { attachments } from '@brainmail/db/schema';

import { createId } from '../lib/crypto';
import { buildEmbeddingText, parseMimeMessage } from './mime';
import { getEmailById, updateEmailProcessingState } from './state';
import type { EmailIngestedMessage } from './types';

export async function processEmailIngestion(
  env: Env,
  message: EmailIngestedMessage,
): Promise<void> {
  const email = await getEmailById(env, message.emailId, message.userId);
  if (!email?.rawPath) {
    throw new Error('Email raw content is missing');
  }

  const rawObject = await env.ATTACHMENTS.get(email.rawPath);
  if (!rawObject) {
    throw new Error('Email raw object not found in storage');
  }

  const raw = await rawObject.text();
  const parsed = parseMimeMessage(raw);
  const db = createDb(env.DB);

  for (const attachment of parsed.attachments) {
    const attachmentId = createId('attachment');
    const r2Path = `attachments/${message.userId}/${message.emailId}/${attachmentId}/${attachment.filename}`;

    await env.ATTACHMENTS.put(r2Path, attachment.content, {
      httpMetadata: { contentType: attachment.mimeType },
    });

    await db.insert(attachments).values({
      id: attachmentId,
      emailId: message.emailId,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      r2Path,
    });
  }

  await updateEmailProcessingState(env, message.emailId, {
    processingStatus: 'parsed',
    processingError: null,
    subject: parsed.subject ?? email.subject,
    sender: parsed.sender ?? email.sender,
    recipients: parsed.recipients.length
      ? parsed.recipients
      : (email.recipients ?? []),
    cc: parsed.cc,
    bcc: parsed.bcc,
    bodyText: parsed.bodyText,
    bodyHtml: parsed.bodyHtml,
  });

  await env.CLASSIFICATION_QUEUE.send({
    type: 'process_email',
    emailId: message.emailId,
    userId: message.userId,
  });

  if (parsed.attachments.length > 0) {
    await env.ATTACHMENT_PROCESSING_QUEUE.send({
      type: 'process_attachments',
      emailId: message.emailId,
      userId: message.userId,
    });
  }
}

export function buildEmailEmbeddingInput(
  subject: string | null,
  sender: string | null,
  bodyText: string | null,
  bodyHtml: string | null,
): string {
  return buildEmbeddingText({
    headers: {},
    subject,
    sender,
    recipients: [],
    cc: [],
    bcc: [],
    bodyText,
    bodyHtml,
    attachments: [],
  });
}
