import { sql } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  lastSeenAt: text('last_seen_at').default(sql`(datetime('now'))`),
});

export const oauthStates = sqliteTable('oauth_states', {
  id: text('id').primaryKey(),
  state: text('state').notNull().unique(),
  userId: text('user_id'),
  provider: text('provider').notNull(),
  purpose: text('purpose').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
