import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const trips = sqliteTable('trips', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title'),
  destination: text('destination'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
});

export const tripEvents = sqliteTable('trip_events', {
  id: text('id').primaryKey(),
  tripId: text('trip_id'),
  eventType: text('event_type'),
  entityId: text('entity_id'),
  occurredAt: text('occurred_at'),
});
