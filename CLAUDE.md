# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BrainMail** (codenamed "AI Email OS") is an AI-native email platform that treats email as structured data rather than messages. Users connect Gmail, then interact with their email via chat, analytics dashboards, AI-generated collections, and natural-language automations.

Full product specification: `docs/base-spec.md`

This is a greenfield project. No build commands exist yet.

---

## Planned Tech Stack

| Layer            | Technology                        |
| ---------------- | --------------------------------- |
| Frontend         | Flutter                           |
| Backend / API    | Cloudflare Workers                |
| Database         | Cloudflare D1 (SQLite-compatible) |
| File Storage     | Cloudflare R2                     |
| Vector Search    | Cloudflare Vectorize              |
| Async Processing | Cloudflare Queues                 |
| On-device AI     | Workers AI                        |
| Model Routing    | Cloudflare AI Gateway             |
| Email Source     | Gmail API (OAuth)                 |

Flutter handles only UI, auth, chat interface, and chart/dashboard rendering — **no AI processing on the client**.

---

## Architecture

### Email Processing Pipeline

Emails flow through these stages after Gmail sync:

1. **Store raw email** — headers, metadata, body, attachments (R2)
2. **Categorize** — classify into one of ~13 categories (Invoice, Receipt, Travel, Newsletter, etc.)
3. **Extract entities** — Person, Company, Invoice, Flight, Hotel, Order, Subscription, Meeting, Task
4. **Embed** — generate vectors for semantic search and RAG
5. **Evaluate collections** — assign email to AI-managed semantic groups
6. **Evaluate automations** — trigger matching user-defined automation rules

Async stages (extraction, classification, automation) run via **Cloudflare Queues**.

### AI Agent Architecture

A **Router Agent** classifies user intent, then delegates to:

- **Search Agent** — semantic retrieval, Gmail search, vector search
- **Analytics Agent** — SQL queries, aggregations, chart/report generation
- **Automation Agent** — creates automation rules and triggers
- **Action Agent** — executes email mutations (delete, archive, label, filter creation, export)

The key design principle: AI queries **structured extracted data** rather than raw email bodies to avoid repeated LLM calls on unstructured content.

### Data Model (D1)

Core tables: `users`, `emails`, `invoices`, `collections`, `automations`, `filters`, `audit_logs`

Structured entities extracted per email: `invoices`, `receipts`, `subscriptions`, `travel`

Every destructive action (delete, bulk archive, unsubscribe) must be previewed, confirmed, and written to the audit log before execution.

---

## Core Design Rules

- **Safety before automation**: destructive actions require `Intent → Preview → Confirm → Execute → Audit` flow.
- **AI queries structured data**: extracted structured records, not raw email text.
- **Every insight is actionable**: AI chat responses can produce email actions, filter creation, exports, etc.
- **Gmail filters must be Gmail-compatible query syntax** (e.g., `from:(manning.com)`).
- **AI Memory**: user corrections to classifications (e.g., "Stripe emails belong to Startup") must persist and influence future classifications.
