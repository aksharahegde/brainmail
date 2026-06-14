import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const gmailSyncStates = sqliteTable('gmail_sync_states', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().unique(),
  userId: text('user_id').notNull(),
  status: text('status').notNull().default('pending'),
  historyId: text('history_id'),
  watchExpiration: text('watch_expiration'),
  lastSyncedAt: text('last_synced_at'),
  lastError: text('last_error'),
  syncedMessageCount: integer('synced_message_count').default(0),
  initialSyncComplete: integer('initial_sync_complete').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});
