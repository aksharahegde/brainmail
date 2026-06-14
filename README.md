# BrainMail

AI-native email intelligence workspace.

## Prerequisites

- Node.js 22+
- pnpm 11+
- Cloudflare account (for Workers infrastructure)

## Frontend (Next.js)

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Workers API (Cloudflare)

```bash
pnpm workers:dev
```

Open [http://localhost:8787/health](http://localhost:8787/health).

### Database (D1)

```bash
pnpm db:migrate          # apply migrations locally
pnpm db:seed             # load demo seed data locally
pnpm db:migrate:staging  # apply migrations to staging D1
pnpm db:seed:staging     # seed staging D1
pnpm db:generate         # regenerate SQL after schema changes
```

Schema and ORM models live in [`packages/db`](packages/db/) (Drizzle ORM).

### Authentication (Google OAuth)

```bash
cp workers/.dev.vars.example workers/.dev.vars
cp .env.local.example .env.local
pnpm db:migrate
```

Configure Google OAuth credentials with redirect URI:

`http://localhost:3000/api/v1/auth/google/callback`

Then run `pnpm workers:dev` and `pnpm dev`, and open `/login`.

### Gmail sync (Phase 4)

After connecting Gmail in workspace settings, BrainMail queues an initial import of recent messages. Sync status is visible on the settings page. Optional push notifications require configuring `GMAIL_PUBSUB_TOPIC` in `workers/.dev.vars` and Google Cloud Pub/Sub.

### Email processing (Phase 5)

Imported emails move through ingestion, classification, entity extraction, attachment processing, and embedding generation via Cloudflare Queues. Processed results appear on the workspace Activity page.

### Knowledge graph (Phase 6)

Extracted entities are materialized into companies, contacts, invoices, receipts, subscriptions, trips, and relationship edges. Browse the entity explorer and relationship graph on the workspace Contacts page. APIs: `GET /api/v1/entities`, `GET /api/v1/contacts`, `GET /api/v1/graph`.

### Search (Phase 7)

Global search combines keyword retrieval across emails, entities, contacts, vendors, workspaces, and artifacts with Vectorize semantic email search. Use `GET /api/v1/search?q=...&mode=hybrid` from the app header search panel.

### AI agents (Phase 8)

Chat requests route through a Router Agent to Search, Analytics, Action, Automation, and Insight agents. Agents operate only via the tool registry and return generative UI blocks from the UI Planner. APIs: `POST /api/v1/chat`, `GET /api/v1/chat/sessions`, `GET /api/v1/agents/tools`.

### Cloudflare setup

```bash
pnpm exec wrangler login   # from workers/ if needed
pnpm infra:provision staging
pnpm workers:deploy:staging
```

Staging health check: `https://brainmail-api-staging.akshara-dt.workers.dev/health`

## Scripts

| Script                           | Description                                       |
| -------------------------------- | ------------------------------------------------- |
| `pnpm dev`                       | Next.js dev server                                |
| `pnpm build`                     | Next.js production build                          |
| `pnpm workers:dev`               | Local Cloudflare Worker                           |
| `pnpm workers:deploy:staging`    | Deploy API worker to staging                      |
| `pnpm workers:deploy:production` | Deploy API worker to production                   |
| `pnpm infra:provision`           | Provision Cloudflare resources (default: staging) |
| `pnpm db:migrate`                | Apply D1 migrations locally                       |
| `pnpm db:seed`                   | Seed local D1 with demo data                      |
| `pnpm infra:types`               | Regenerate Worker binding types                   |
| `pnpm lint`                      | ESLint                                            |
| `pnpm typecheck`                 | TypeScript check (frontend)                       |
| `pnpm format:check`              | Prettier check                                    |
