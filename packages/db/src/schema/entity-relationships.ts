import { sql } from 'drizzle-orm';
import { real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const entityRelationships = sqliteTable(
  'entity_relationships',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    relationshipType: text('relationship_type').notNull(),
    emailId: text('email_id'),
    confidence: real('confidence'),
    metadata: text('metadata', { mode: 'json' }).$type<
      Record<string, unknown>
    >(),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('entity_relationships_unique_edge').on(
      table.userId,
      table.sourceType,
      table.sourceId,
      table.targetType,
      table.targetId,
      table.relationshipType,
    ),
  ],
);
