import { createDb } from '@brainmail/db';
import { auditLogs } from '@brainmail/db/schema';
import { and, desc, eq } from 'drizzle-orm';

import { createId } from '../lib/crypto';
import type { AuditAction, AuditLogRecord } from './types';

export async function writeAuditLog(
  env: Env,
  input: {
    userId: string;
    action: AuditAction | string;
    payload?: Record<string, unknown>;
  },
): Promise<AuditLogRecord> {
  const db = createDb(env.DB);
  const id = createId('audit');
  const now = new Date().toISOString();

  await db.insert(auditLogs).values({
    id,
    userId: input.userId,
    action: input.action,
    payload: input.payload ?? {},
    createdAt: now,
  });

  return {
    id,
    userId: input.userId,
    action: input.action,
    payload: input.payload ?? {},
    createdAt: now,
  };
}

export async function listAuditLogs(
  env: Env,
  userId: string,
  input?: { limit?: number; action?: string },
): Promise<AuditLogRecord[]> {
  const db = createDb(env.DB);
  const filters = [eq(auditLogs.userId, userId)];

  if (input?.action) {
    filters.push(eq(auditLogs.action, input.action));
  }

  const rows = await db
    .select()
    .from(auditLogs)
    .where(and(...filters))
    .orderBy(desc(auditLogs.createdAt))
    .limit(input?.limit ?? 50);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    action: row.action,
    payload: row.payload,
    createdAt: row.createdAt,
  }));
}
