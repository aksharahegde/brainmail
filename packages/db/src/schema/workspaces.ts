import { sql } from 'drizzle-orm';
import { primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name'),
  description: text('description'),
  workspaceType: text('workspace_type'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const workspaceEntities = sqliteTable(
  'workspace_entities',
  {
    workspaceId: text('workspace_id').notNull(),
    entityId: text('entity_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.entityId] })],
);

export const dashboards = sqliteTable('dashboards', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  workspaceId: text('workspace_id'),
  name: text('name'),
  templateKey: text('template_key'),
  definition: text('definition', { mode: 'json' }).$type<
    Record<string, unknown>
  >(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
  refreshedAt: text('refreshed_at'),
});

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  workspaceId: text('workspace_id'),
  reportType: text('report_type'),
  definition: text('definition', { mode: 'json' }).$type<
    Record<string, unknown>
  >(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
