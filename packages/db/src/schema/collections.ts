import { sql } from 'drizzle-orm';
import { primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  workspaceId: text('workspace_id'),
  name: text('name'),
  description: text('description'),
  collectionType: text('collection_type'),
  status: text('status').default('active'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const collectionMembers = sqliteTable(
  'collection_members',
  {
    collectionId: text('collection_id').notNull(),
    entityId: text('entity_id').notNull(),
    addedBy: text('added_by'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
  },
  (table) => [primaryKey({ columns: [table.collectionId, table.entityId] })],
);
