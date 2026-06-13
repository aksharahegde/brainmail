import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const entities = sqliteTable('entities', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  entityType: text('entity_type').notNull(),
  confidence: real('confidence'),
  sourceId: text('source_id'),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const companies = sqliteTable('companies', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name'),
  domain: text('domain'),
  website: text('website'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name'),
  email: text('email'),
  companyId: text('company_id'),
  firstSeen: text('first_seen'),
  lastSeen: text('last_seen'),
  interactionCount: integer('interaction_count'),
});

export const relationships = sqliteTable('relationships', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  contactId: text('contact_id'),
  relationshipScore: real('relationship_score'),
  lastInteraction: text('last_interaction'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
});
