import { sql } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id'),
  role: text('role'),
  content: text('content'),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const sessionState = sqliteTable('session_state', {
  sessionId: text('session_id').primaryKey(),
  currentArtifactId: text('current_artifact_id'),
  currentWorkspaceId: text('current_workspace_id'),
  currentDashboardId: text('current_dashboard_id'),
  state: text('state', { mode: 'json' }).$type<Record<string, unknown>>(),
});
