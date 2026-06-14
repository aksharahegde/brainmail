# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BrainMail** (codenamed "AI Email OS") is an AI-native email platform that treats email as structured data rather than messages. Users connect Gmail, then interact with their email via chat, analytics dashboards, AI-generated collections, and natural-language automations.

Full product specification: [`docs/spec.md`](docs/spec.md)

---

## Tech Stack

| Layer            | Technology                                                                           |
| ---------------- | ------------------------------------------------------------------------------------ |
| Frontend         | Next.js 16, TypeScript, Tailwind, shadcn/ui, Zustand, TanStack Query/Table, Recharts |
| Backend / API    | Cloudflare Workers (`workers/`)                                                      |
| Database         | Cloudflare D1 (SQLite-compatible)                                                    |
| File Storage     | Cloudflare R2                                                                        |
| Vector Search    | Cloudflare Vectorize                                                                 |
| Async Processing | Cloudflare Queues                                                                    |
| On-device AI     | Workers AI via AI Gateway                                                            |
| Email Source     | Gmail API (OAuth, Phase 3+)                                                          |

---

## Commands

### Frontend

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm lint
pnpm typecheck
pnpm format:check
```

### Workers

```bash
pnpm workers:dev                    # http://localhost:8787/health
pnpm infra:provision staging        # create D1/R2/Vectorize/Queues
pnpm workers:deploy:staging
pnpm --filter @brainmail/workers typecheck
pnpm infra:types                    # wrangler types
pnpm db:migrate && pnpm db:seed     # local D1 schema + demo data
pnpm db:generate                    # after schema edits in packages/db
```

Copy `workers/.dev.vars.example` → `workers/.dev.vars` and set Google OAuth + session secrets before testing auth.

```bash
# Google OAuth redirect URI (local)
# http://localhost:3000/api/v1/auth/google/callback
```

---

## Architecture

### Email Processing Pipeline

Emails flow through these stages after Gmail sync:

1. **Store raw email** — headers, metadata, body, attachments (R2)
2. **Categorize** — classify into categories (Invoice, Receipt, Travel, etc.)
3. **Extract entities** — Person, Company, Invoice, Flight, Hotel, Order, Subscription, Meeting, Task
4. **Materialize knowledge graph** — upsert companies, contacts, finance/travel records, and relationship edges
5. **Embed** — generate vectors for semantic search and RAG
6. **Agent orchestration** — router delegates to specialized agents that execute tools and return generative UI blocks
7. **Evaluate collections** — assign email to AI-managed semantic groups
8. **Evaluate automations** — trigger matching user-defined automation rules

Async stages run via **Cloudflare Queues** (`workers/wrangler.jsonc`).

### AI Agent Architecture

A **Router Agent** classifies user intent, then delegates to Search, Analytics, Automation, and Action agents. AI queries **structured extracted data**, not raw email bodies.

### Core Design Rules

- **Safety before automation**: destructive actions require `Intent → Preview → Confirm → Execute → Audit`.
- **Gmail filters** must use Gmail-compatible query syntax.
- **AI Memory**: user classification corrections persist and influence future classifications.

---

## Repository Layout

```
app/           Next.js App Router
components/    UI + layout shell
features/      Domain UI modules
workers/       Cloudflare Worker API
packages/db/   Drizzle ORM schema + D1 migrations + seed
server/        Future server actions
docs/          Product + phase specs
scripts/       Infra provision/deploy scripts
```

---

## Phase Docs

Implementation is phased — see [`docs/phases/`](docs/phases/). Phases 0–7 are complete. Phase 8 adds the AI agent runtime.
