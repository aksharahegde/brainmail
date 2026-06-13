import { sql } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  timezone: text('timezone'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  encryptedAccessToken: text('encrypted_access_token'),
  encryptedRefreshToken: text('encrypted_refresh_token'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});
