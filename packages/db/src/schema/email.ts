import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const sources = sqliteTable('sources', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  sourceType: text('source_type').notNull(),
  externalId: text('external_id'),
  title: text('title'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const emailThreads = sqliteTable('email_threads', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  subject: text('subject'),
  participants: text('participants', { mode: 'json' }).$type<string[]>(),
  messageCount: integer('message_count'),
  lastMessageAt: text('last_message_at'),
});

export const emails = sqliteTable('emails', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull(),
  userId: text('user_id').notNull(),
  threadId: text('thread_id'),
  gmailMessageId: text('gmail_message_id'),
  subject: text('subject'),
  sender: text('sender'),
  recipients: text('recipients', { mode: 'json' }).$type<string[]>(),
  snippet: text('snippet'),
  receivedAt: text('received_at'),
  rawPath: text('raw_path'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  emailId: text('email_id').notNull(),
  filename: text('filename'),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  r2Path: text('r2_path'),
  extractedText: text('extracted_text'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
