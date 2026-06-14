import { sql } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const artifacts = sqliteTable('artifacts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  workspaceId: text('workspace_id'),
  artifactType: text('artifact_type'),
  title: text('title'),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdBy: text('created_by'),
  shareToken: text('share_token'),
  sharedAt: text('shared_at'),
  updatedAt: text('updated_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
