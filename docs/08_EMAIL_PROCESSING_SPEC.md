# AI Email OS

## Email Processing Specification

# Overview

The Email Processing Pipeline is responsible for converting raw emails into structured knowledge.

The goal is to transform:

```text
Raw Email
```

into:

```text
Entities
Collections
Insights
Artifacts
Automations
Knowledge Graph
```

The processing layer is the foundation of the platform.

---

# Core Principles

## Source Agnostic

Processing must not depend on Gmail-specific structures.

Future sources:

- Outlook
- Slack
- Notion
- Google Drive
- PDFs

must use the same pipeline.

---

## Entity First

The pipeline extracts entities.

Not summaries.

Not embeddings.

Entities are the primary output.

---

## Structured Before Vector

Priority:

```text
Structured Data
    ↓
Knowledge Graph
    ↓
Embeddings
```

Embeddings support retrieval.

Entities power the product.

---

# Processing Architecture

```text
Email Arrives
      ↓
Store Raw Email
      ↓
Parse Email
      ↓
Store Metadata
      ↓
Classify
      ↓
Extract Entities
      ↓
Process Attachments
      ↓
Generate Embeddings
      ↓
Update Knowledge Graph
      ↓
Update Collections
      ↓
Evaluate Automations
      ↓
Generate Insights
```

---

# Gmail Integration

# OAuth Flow

```text
User Connects Gmail
      ↓
Google OAuth
      ↓
Receive Access Token
      ↓
Receive Refresh Token
      ↓
Encrypt Tokens
      ↓
Store Account
```

---

# Initial Sync

Purpose:

Import existing emails.

Flow:

```text
Connect Gmail
      ↓
Fetch Labels
      ↓
Fetch Threads
      ↓
Fetch Messages
      ↓
Store Raw Emails
      ↓
Queue Processing
```

---

# Incremental Sync

Purpose:

Process new activity.

Flow:

```text
History ID
      ↓
Gmail Watch
      ↓
Receive Notification
      ↓
Fetch Changes
      ↓
Process Changes
```

---

# Gmail Watch

Use Gmail Push Notifications.

Store:

```json
{
  "historyId": "",
  "expiration": ""
}
```

Automatically renew before expiration.

---

# Email Storage

# Raw Email

Store:

- Full MIME
- Headers
- Body
- Metadata

Storage:

R2

---

# Parsed Email

Store:

- Subject
- Sender
- Recipients
- Thread
- Date
- Snippet

Storage:

D1

---

# Email Parsing

Extract:

```text
Subject

Sender

Recipients

CC

BCC

Date

Body

Attachments

Thread Information
```

Normalize formats.

---

# Email Classification

Purpose:

Categorize emails.

---

# Supported Categories

```text
Invoice

Receipt

Subscription

Purchase

Travel

Flight

Hotel

Newsletter

Marketing

Social

Support

Personal

Work

Meeting

Job

Security

Finance

Promotion

OTP
```

---

# Classification Output

```json
{
  "category": "invoice",
  "confidence": 0.96
}
```

Store confidence.

---

# Entity Extraction

Purpose:

Extract structured information.

---

# Company Extraction

Example:

```text
OpenAI
```

Output:

```json
{
  "name": "OpenAI",
  "domain": "openai.com"
}
```

---

# Contact Extraction

Output:

```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

---

# Invoice Extraction

Output:

```json
{
  "vendor": "OpenAI",
  "amount": 120,
  "currency": "USD",
  "invoiceDate": "2026-01-01"
}
```

---

# Receipt Extraction

Output:

```json
{
  "vendor": "Uber",
  "amount": 15
}
```

---

# Subscription Extraction

Output:

```json
{
  "vendor": "Cursor",
  "amount": 20,
  "renewalDate": "2026-07-01"
}
```

---

# Travel Extraction

Output:

```json
{
  "flight": "AI101",
  "destination": "Bangalore"
}
```

---

# Task Extraction

Output:

```json
{
  "title": "Review proposal",
  "dueDate": null
}
```

---

# Confidence Scores

Every extracted entity must contain confidence.

Example:

```json
{
  "amount": 120,
  "confidence": 0.94
}
```

---

# User Corrections

Users can correct extracted data.

Example:

```text
This is not a subscription.

This belongs to Startup.
```

Store corrections in:

```text
user_rules
```

Future processing should learn from corrections.

---

# Attachment Processing

Supported Formats:

```text
PDF

DOCX

XLSX

CSV

TXT

PNG

JPEG

WEBP
```

---

# Attachment Pipeline

```text
Attachment
      ↓
Store in R2
      ↓
Extract Text
      ↓
OCR (if required)
      ↓
Entity Extraction
      ↓
Embedding Generation
```

---

# PDF Processing

Supported:

```text
Invoices

Receipts

Contracts

Statements
```

Extract:

- Text
- Tables
- Amounts
- Dates

---

# Image Processing

Supported:

```text
Receipts

Invoices

Screenshots

Tickets
```

Use OCR.

---

# Attachment Entities

Attachments may generate:

```text
Invoice

Receipt

Contract

Ticket

Statement
```

independently of email content.

---

# Knowledge Graph Update

After extraction:

```text
Company
    ↓
Invoice
    ↓
Contact
    ↓
Subscription
```

Relationships created automatically.

---

# Relationship Examples

```text
OpenAI
    ↓
Invoice

OpenAI
    ↓
Subscription

John Doe
    ↓
Company
```

---

# Collection Evaluation

Every processed email should be evaluated against:

- User Collections
- AI Collections
- Workspaces

---

# Example

Email:

```text
OpenAI Invoice
```

May be added to:

```text
Finance

AI Expenses

Startup
```

---

# Collection Discovery

System may suggest new collections.

Example:

```text
AI Vendors

Customer Support

Recruiting
```

---

# Workspace Evaluation

Entities may be attached to workspaces.

Example:

```text
OpenAI

AWS

Stripe
```

→ Startup Workspace

---

# Automation Evaluation

After processing:

Evaluate automation rules.

---

# Example

Rule:

```text
When OpenAI invoice arrives,
add to Finance.
```

Flow:

```text
Entity Extracted
      ↓
Rule Match
      ↓
Action Executed
```

---

# Insight Generation

Generate insights after processing.

Examples:

```text
Subscription cost increased.

New vendor detected.

Travel booking found.

Potential duplicate subscription.
```

---

# Vendor Intelligence Update

Update vendor profile.

Example:

```text
OpenAI

Spend History

Invoice Count

Subscription Status
```

---

# Subscription Center Update

Update:

```text
Renewal Date

Monthly Cost

Annual Cost

Status
```

---

# Personal CRM Update

Update:

```text
Last Contact

Communication Frequency

Response Time

Relationship Score
```

---

# Travel Workspace Update

Update:

```text
Trips

Flights

Hotels

Expenses
```

---

# Embedding Generation

Purpose:

Semantic retrieval.

---

# Embedding Targets

Generate embeddings for:

```text
Email Body

Attachment Text

Entities

Reports

Artifacts
```

---

# Vector Storage

Store in:

```text
Cloudflare Vectorize
```

Reference in:

```text
embeddings
```

table.

---

# Processing Queues

Use Cloudflare Queues.

Separate queues:

```text
email_ingestion

classification

entity_extraction

attachment_processing

embedding_generation

automation_execution

insight_generation
```

---

# Retry Strategy

Transient failures:

```text
Retry 3 times
```

Dead-letter queue after failure.

---

# Processing States

Email status:

```text
pending

parsed

classified

entities_extracted

embedded

completed

failed
```

---

# Reprocessing

Support reprocessing.

Triggers:

```text
Model upgrade

Entity schema changes

User correction

Manual request
```

---

# Cost Optimization

## Cheap Models

Use for:

```text
Classification

Entity Extraction

Routing
```

---

## Premium Models

Use for:

```text
Complex Attachments

Large Documents

Advanced Reasoning
```

---

# Monitoring

Track:

```text
Emails Processed

Processing Time

Extraction Accuracy

Classification Accuracy

Attachment Failures

Embedding Costs

Queue Latency
```

---

# Success Criteria

Every processed email should produce:

1. Parsed email record.
2. Category classification.
3. Extracted entities.
4. Attachment analysis.
5. Knowledge graph updates.
6. Collection evaluation.
7. Workspace evaluation.
8. Automation evaluation.
9. Insight generation.
10. Embeddings for retrieval.

The email processing layer is considered successful only when an email has been transformed into structured knowledge usable by chat, dashboards, reports, workspaces, automations, and insights.
