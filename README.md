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
