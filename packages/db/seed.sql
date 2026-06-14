-- BrainMail demo seed data (Phase 2)
-- Safe to re-run: uses INSERT OR IGNORE

INSERT OR IGNORE INTO users (id, email, name, timezone)
VALUES ('user_demo_001', 'demo@brainmail.dev', 'Demo User', 'America/Los_Angeles');

INSERT OR IGNORE INTO workspaces (id, user_id, name, description, workspace_type)
VALUES
  (
    'startup',
    'user_demo_001',
    'Startup',
    'Customers, vendors, revenue, and operating spend.',
    'Startup'
  ),
  (
    'finance',
    'user_demo_001',
    'Finance',
    'Bills, invoices, receipts, and subscriptions.',
    'Finance'
  ),
  (
    'travel',
    'user_demo_001',
    'Travel',
    'Flights, hotels, tickets, and trip expenses.',
    'Travel'
  ),
  (
    'personal',
    'user_demo_001',
    'Personal',
    'Contacts, purchases, trips, and important personal mail.',
    'Personal'
  ),
  (
    'learning',
    'user_demo_001',
    'Learning',
    'Courses, books, newsletters, and training content.',
    'Learning'
  );

INSERT OR IGNORE INTO collections (
  id,
  user_id,
  workspace_id,
  name,
  description,
  collection_type,
  status
)
VALUES
  (
    'collection_inbox_001',
    'user_demo_001',
    NULL,
    'Inbox',
    'System inbox collection',
    'system',
    'active'
  ),
  (
    'collection_ai_expenses_001',
    'user_demo_001',
    'finance',
    'AI Expenses',
    'Invoices and receipts grouped by AI.',
    'ai_generated',
    'active'
  ),
  (
    'collection_subscriptions_001',
    'user_demo_001',
    'finance',
    'Subscriptions',
    'Recurring subscription charges and renewals.',
    'ai_generated',
    'active'
  ),
  (
    'collection_customers_001',
    'user_demo_001',
    'startup',
    'Customers',
    'Customer contacts and companies.',
    'ai_generated',
    'active'
  );

INSERT OR IGNORE INTO chat_sessions (id, user_id, title)
VALUES ('chat_session_001', 'user_demo_001', 'Welcome');

INSERT OR IGNORE INTO chat_messages (id, session_id, role, content)
VALUES (
  'chat_message_001',
  'chat_session_001',
  'assistant',
  'Welcome to BrainMail. Connect Gmail in Phase 3 to start syncing email.'
);

INSERT OR IGNORE INTO audit_logs (id, user_id, action, payload)
VALUES (
  'audit_seed_001',
  'user_demo_001',
  'seed.completed',
  '{"phase":2,"source":"packages/db/seed.sql"}'
);
