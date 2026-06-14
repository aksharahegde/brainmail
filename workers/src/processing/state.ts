import { createDb } from '@brainmail/db';
import { emails } from '@brainmail/db/schema';
import { eq } from 'drizzle-orm';

import type { EmailProcessingStatus } from './types';

export async function updateEmailProcessingState(
  env: Env,
  emailId: string,
  patch: Partial<{
    processingStatus: EmailProcessingStatus;
    processingError: string | null;
    processedAt: string | null;
    category: string | null;
    classificationConfidence: number | null;
    bodyText: string | null;
    bodyHtml: string | null;
    subject: string | null;
    sender: string | null;
    recipients: string[];
    cc: string[];
    bcc: string[];
  }>,
) {
  const db = createDb(env.DB);
  await db.update(emails).set(patch).where(eq(emails.id, emailId));
}

export async function getEmailById(env: Env, emailId: string, userId?: string) {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(emails)
    .where(eq(emails.id, emailId))
    .limit(1);

  const email = rows[0];
  if (!email) {
    return null;
  }

  if (userId && email.userId !== userId) {
    return null;
  }

  return email;
}
