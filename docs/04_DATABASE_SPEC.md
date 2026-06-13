# AI Email OS

## Database Specification

# Design Principles

## Source Agnostic

Never store Gmail-specific business data.

Bad:

Email → Invoice

Good:

Source → Invoice

This allows:

- Gmail
- Outlook
- Slack
- Drive
- PDFs

to create identical entities.

---

## Entity First

Everything becomes an entity.

Examples:

- Invoice
- Subscription
- Contact
- Vendor
- Trip

Emails are only one source of entities.

---

## Artifact First

Every AI-generated output becomes an artifact.

Examples:

- Chart
- Dashboard
- Report
- Timeline

Artifacts are reusable.

---

# users

CREATE TABLE users (
id TEXT PRIMARY KEY,
email TEXT NOT NULL,
name TEXT,
avatar_url TEXT,
timezone TEXT,
created_at DATETIME,
updated_at DATETIME
);

---

# accounts

Connected external accounts.

CREATE TABLE accounts (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
provider TEXT NOT NULL,
provider_account_id TEXT NOT NULL,
encrypted_access_token TEXT,
encrypted_refresh_token TEXT,
metadata JSON,
created_at DATETIME,
updated_at DATETIME
);

Examples:

provider:

gmail
outlook
slack

---

# sources

Every piece of information originates from a source.

CREATE TABLE sources (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
source_type TEXT NOT NULL,
external_id TEXT,
title TEXT,
metadata JSON,
created_at DATETIME
);

Examples:

Email

PDF

Slack Message

Drive Document

---

# emails

CREATE TABLE emails (
id TEXT PRIMARY KEY,
source_id TEXT NOT NULL,
user_id TEXT NOT NULL,
thread_id TEXT,
gmail_message_id TEXT,
subject TEXT,
sender TEXT,
recipients JSON,
snippet TEXT,
received_at DATETIME,
raw_path TEXT,
created_at DATETIME
);

---

# email_threads

CREATE TABLE email_threads (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
subject TEXT,
participants JSON,
message_count INTEGER,
last_message_at DATETIME
);

---

# attachments

CREATE TABLE attachments (
id TEXT PRIMARY KEY,
email_id TEXT NOT NULL,
filename TEXT,
mime_type TEXT,
size_bytes INTEGER,
r2_path TEXT,
extracted_text TEXT,
created_at DATETIME
);

---

# entities

Master entity registry.

CREATE TABLE entities (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
entity_type TEXT NOT NULL,
confidence REAL,
source_id TEXT,
data JSON,
created_at DATETIME,
updated_at DATETIME
);

entity_type:

company
contact
invoice
receipt
subscription
trip
task
meeting
purchase

---

# companies

CREATE TABLE companies (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
name TEXT,
domain TEXT,
website TEXT,
metadata JSON,
created_at DATETIME
);

---

# contacts

CREATE TABLE contacts (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
name TEXT,
email TEXT,
company_id TEXT,
first_seen DATETIME,
last_seen DATETIME,
interaction_count INTEGER
);

---

# relationships

Used for Personal CRM.

CREATE TABLE relationships (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
contact_id TEXT,
relationship_score REAL,
last_interaction DATETIME,
metadata JSON
);

---

# invoices

CREATE TABLE invoices (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
company_id TEXT,
source_id TEXT,
invoice_number TEXT,
amount REAL,
currency TEXT,
invoice_date DATETIME,
due_date DATETIME,
confidence REAL,
attachment_id TEXT
);

---

# receipts

CREATE TABLE receipts (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
company_id TEXT,
source_id TEXT,
amount REAL,
currency TEXT,
receipt_date DATETIME
);

---

# subscriptions

CREATE TABLE subscriptions (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
company_id TEXT,
source_id TEXT,
name TEXT,
amount REAL,
currency TEXT,
billing_period TEXT,
renewal_date DATETIME,
status TEXT
);

---

# trips

CREATE TABLE trips (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
title TEXT,
destination TEXT,
start_date DATETIME,
end_date DATETIME,
metadata JSON
);

---

# trip_events

CREATE TABLE trip_events (
id TEXT PRIMARY KEY,
trip_id TEXT,
event_type TEXT,
entity_id TEXT,
occurred_at DATETIME
);

event_type:

flight
hotel
ticket
cab
expense

---

# collections

CREATE TABLE collections (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
name TEXT,
description TEXT,
collection_type TEXT,
created_at DATETIME
);

collection_type:

system
user
ai_generated

---

# collection_members

CREATE TABLE collection_members (
collection_id TEXT,
entity_id TEXT,
added_by TEXT,
created_at DATETIME
);

---

# workspaces

Top-level organizational concept.

CREATE TABLE workspaces (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
name TEXT,
description TEXT,
workspace_type TEXT,
created_at DATETIME
);

Examples:

Finance

Startup

Travel

Learning

---

# workspace_entities

CREATE TABLE workspace_entities (
workspace_id TEXT,
entity_id TEXT
);

---

# dashboards

CREATE TABLE dashboards (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
workspace_id TEXT,
name TEXT,
definition JSON,
created_at DATETIME
);

---

# reports

CREATE TABLE reports (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
workspace_id TEXT,
report_type TEXT,
definition JSON,
created_at DATETIME
);

---

# artifacts

Most important table.

CREATE TABLE artifacts (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
artifact_type TEXT,
title TEXT,
payload JSON,
created_by TEXT,
created_at DATETIME
);

artifact_type:

table
chart
report
dashboard
timeline
vendor_report
travel_report
daily_briefing

---

# automations

CREATE TABLE automations (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
name TEXT,
definition JSON,
enabled BOOLEAN,
created_at DATETIME
);

---

# automation_runs

CREATE TABLE automation_runs (
id TEXT PRIMARY KEY,
automation_id TEXT,
status TEXT,
execution_log JSON,
executed_at DATETIME
);

---

# filters

CREATE TABLE filters (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
name TEXT,
query TEXT,
metadata JSON,
created_at DATETIME
);

---

# chat_sessions

CREATE TABLE chat_sessions (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
title TEXT,
created_at DATETIME
);

---

# chat_messages

CREATE TABLE chat_messages (
id TEXT PRIMARY KEY,
session_id TEXT,
role TEXT,
content TEXT,
metadata JSON,
created_at DATETIME
);

---

# session_state

Used for follow-up questions.

CREATE TABLE session_state (
session_id TEXT PRIMARY KEY,
current_artifact_id TEXT,
current_workspace_id TEXT,
current_dashboard_id TEXT,
state JSON
);

---

# user_rules

Human correction layer.

CREATE TABLE user_rules (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
rule_type TEXT,
rule_definition JSON,
created_at DATETIME
);

Examples:

AWS → Startup

Manning → Learning

---

# insights

Generated proactively.

CREATE TABLE insights (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
insight_type TEXT,
payload JSON,
created_at DATETIME
);

Examples:

Spend Increase

Unused Subscription

Follow-up Reminder

---

# audit_logs

CREATE TABLE audit_logs (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
action TEXT,
payload JSON,
created_at DATETIME
);

---

# embeddings

Reference table for Vectorize.

CREATE TABLE embeddings (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
entity_type TEXT,
entity_id TEXT,
vector_id TEXT,
created_at DATETIME
);
