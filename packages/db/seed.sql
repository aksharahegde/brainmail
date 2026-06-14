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

INSERT OR IGNORE INTO dashboards (
  id,
  user_id,
  workspace_id,
  name,
  template_key,
  definition,
  refreshed_at,
  updated_at
)
VALUES
  (
    'dashboard_ai_expenses_001',
    'user_demo_001',
    'finance',
    'AI Expenses',
    'ai_expenses',
    '{"templateKey":"ai_expenses","blocks":[]}',
    datetime('now'),
    datetime('now')
  ),
  (
    'dashboard_subscriptions_001',
    'user_demo_001',
    'finance',
    'Subscriptions',
    'subscriptions',
    '{"templateKey":"subscriptions","blocks":[]}',
    datetime('now'),
    datetime('now')
  );

INSERT OR IGNORE INTO reports (
  id,
  user_id,
  workspace_id,
  name,
  report_type,
  schedule,
  definition,
  refreshed_at,
  updated_at
)
VALUES
  (
    'report_monthly_expense_001',
    'user_demo_001',
    'finance',
    'Monthly Expense Report',
    'monthly_expense',
    'monthly',
    '{"reportType":"monthly_expense","blocks":[]}',
    datetime('now'),
    datetime('now')
  ),
  (
    'report_subscription_audit_001',
    'user_demo_001',
    'finance',
    'Subscription Audit',
    'subscription_audit',
    'monthly',
    '{"reportType":"subscription_audit","blocks":[]}',
    datetime('now'),
    datetime('now')
  ),
  (
    'report_weekly_founder_001',
    'user_demo_001',
    'startup',
    'Weekly Founder Report',
    'weekly_founder',
    'weekly',
    '{"reportType":"weekly_founder","blocks":[]}',
    datetime('now'),
    datetime('now')
  );

INSERT OR IGNORE INTO sources (id, user_id, source_type, title)
VALUES ('source_demo_001', 'user_demo_001', 'gmail', 'Demo Gmail');

INSERT OR IGNORE INTO emails (
  id,
  source_id,
  user_id,
  subject,
  sender,
  category,
  processing_status,
  received_at
)
VALUES
  (
    'email_sub_aws_001',
    'source_demo_001',
    'user_demo_001',
    'AWS monthly invoice',
    'billing@aws.amazon.com',
    'subscription',
    'completed',
    datetime('now', '-20 days')
  ),
  (
    'email_sub_notion_001',
    'source_demo_001',
    'user_demo_001',
    'Notion renewal notice',
    'billing@notion.so',
    'subscription',
    'completed',
    datetime('now', '-10 days')
  ),
  (
    'email_sub_aws_dup_001',
    'source_demo_001',
    'user_demo_001',
    'AWS duplicate billing',
    'aws-billing@amazon.com',
    'subscription',
    'completed',
    datetime('now', '-5 days')
  );

INSERT OR IGNORE INTO subscriptions (
  id,
  user_id,
  source_id,
  name,
  amount,
  currency,
  billing_period,
  renewal_date,
  status
)
VALUES
  (
    'subscription_aws_001',
    'user_demo_001',
    'email_sub_aws_001',
    'AWS',
    89.5,
    'USD',
    'monthly',
    datetime('now', '+12 days'),
    'active'
  ),
  (
    'subscription_notion_001',
    'user_demo_001',
    'email_sub_notion_001',
    'Notion',
    16.0,
    'USD',
    'monthly',
    datetime('now', '+28 days'),
    'active'
  ),
  (
    'subscription_aws_dup_001',
    'user_demo_001',
    'email_sub_aws_dup_001',
    'AWS',
    84.0,
    'USD',
    'monthly',
    datetime('now', '+12 days'),
    'active'
  ),
  (
    'subscription_github_001',
    'user_demo_001',
    'email_sub_aws_001',
    'GitHub',
    4.0,
    'USD',
    'monthly',
    datetime('now', '+60 days'),
    'active'
  );

INSERT OR IGNORE INTO insights (
  id,
  user_id,
  workspace_id,
  insight_type,
  payload,
  created_at,
  updated_at
)
VALUES
  (
    'insight_daily_briefing_001',
    'user_demo_001',
    'startup',
    'daily_briefing',
    '{"title":"Daily briefing","date":"2026-06-14","highlights":["3 new emails in the last 24 hours","Inbox health score: 92/100"],"priorities":["No urgent inbox issues"],"summary":"3 new emails · health 92/100"}',
    datetime('now'),
    datetime('now')
  ),
  (
    'insight_inbox_health_001',
    'user_demo_001',
    'startup',
    'inbox_health',
    '{"title":"Inbox health","score":92,"issues":[],"message":"Inbox is in good shape with no major issues.","failedCount":0,"uncategorizedCount":0,"totalEmails":12}',
    datetime('now'),
    datetime('now')
  ),
  (
    'insight_vendor_001',
    'user_demo_001',
    'finance',
    'vendor_insight',
    '{"title":"Top vendor","message":"AWS accounts for the highest spend in this workspace.","name":"AWS","spend":420.5,"currency":"USD","invoiceCount":3,"trend":"up","recentInvoices":[]}',
    datetime('now'),
    datetime('now')
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
