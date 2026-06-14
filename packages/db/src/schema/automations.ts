import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const automations = sqliteTable('automations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  workspaceId: text('workspace_id'),
  name: text('name'),
  definition: text('definition', { mode: 'json' }).$type<
    Record<string, unknown>
  >(),
  schedule: text('schedule'),
  enabled: integer('enabled', { mode: 'boolean' }),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const automationRuns = sqliteTable('automation_runs', {
  id: text('id').primaryKey(),
  automationId: text('automation_id'),
  status: text('status'),
  executionLog: text('execution_log', { mode: 'json' }).$type<
    Record<string, unknown>
  >(),
  executedAt: text('executed_at'),
});

export const filters = sqliteTable('filters', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name'),
  query: text('query'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
