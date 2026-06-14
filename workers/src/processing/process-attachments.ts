import { createDb } from '@brainmail/db';
import { attachments } from '@brainmail/db/schema';
import { eq } from 'drizzle-orm';

import type { AttachmentPipelineMessage } from './types';

const TEXT_MIME_PREFIXES = ['text/', 'application/json', 'application/xml'];

function extractTextFromAttachment(
  mimeType: string | null,
  content: string,
): string | null {
  if (!mimeType) {
    return null;
  }

  const normalized = mimeType.toLowerCase();
  if (!TEXT_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return null;
  }

  return content.slice(0, 20_000);
}

export async function processEmailAttachments(
  env: Env,
  message: AttachmentPipelineMessage,
): Promise<void> {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(attachments)
    .where(eq(attachments.emailId, message.emailId));

  for (const attachment of rows) {
    if (!attachment.r2Path || attachment.extractedText) {
      continue;
    }

    const object = await env.ATTACHMENTS.get(attachment.r2Path);
    if (!object) {
      continue;
    }

    const content = await object.text();
    const extractedText = extractTextFromAttachment(
      attachment.mimeType,
      content,
    );

    if (!extractedText) {
      continue;
    }

    await db
      .update(attachments)
      .set({ extractedText })
      .where(eq(attachments.id, attachment.id));
  }
}
