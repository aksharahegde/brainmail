import { sql } from 'drizzle-orm';
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const opsEvents = sqliteTable(
  'ops_events',
  {
    id: text('id').primaryKey(),
    eventType: text('event_type').notNull(),
    severity: text('severity'),
    source: text('source'),
    userId: text('user_id'),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
  },
  (table) => [
    index('ops_events_type_created_idx').on(table.eventType, table.createdAt),
  ],
);
