import { sql } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const userRules = sqliteTable('user_rules', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  ruleType: text('rule_type'),
  ruleDefinition: text('rule_definition', { mode: 'json' }).$type<
    Record<string, unknown>
  >(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const insights = sqliteTable('insights', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  workspaceId: text('workspace_id'),
  insightType: text('insight_type'),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action'),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const embeddings = sqliteTable('embeddings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  vectorId: text('vector_id'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
