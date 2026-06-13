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
| `pnpm infra:types`               | Regenerate Worker binding types                   |
| `pnpm lint`                      | ESLint                                            |
| `pnpm typecheck`                 | TypeScript check (frontend)                       |
| `pnpm format:check`              | Prettier check                                    |
