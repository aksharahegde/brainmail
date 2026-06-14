# BrainMail Launch Checklist

Phase 21 production release checklist.

## Pre-release

- [x] Security checklist complete (`docs/security-checklist.md`)
- [x] Ops telemetry table and monitoring APIs enabled
- [x] Health endpoint exposes service version and binding checks
- [x] Backup script available via `pnpm db:backup:production`
- [x] Release verification script available via `pnpm release:verify:production`

## Infrastructure

- [ ] `pnpm infra:provision production`
- [ ] Set production secrets in Cloudflare (`SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, Google OAuth)
- [ ] Update production `APP_URL` and Gmail Pub/Sub topic in `workers/wrangler.jsonc`
- [ ] `pnpm db:backup:production`
- [ ] `pnpm db:migrate:production`
- [ ] `pnpm workers:deploy:production`

## Frontend

- [ ] Configure production `API_URL` for the Next.js deployment
- [ ] `pnpm build` passes in CI
- [ ] Smoke test login, settings, export, and workspace navigation

## Post-release monitoring

- [ ] `pnpm release:verify:production`
- [ ] Confirm `/health` returns `ok: true` and `version: 1.0.0`
- [ ] Review settings → System status for errors and AI cost telemetry
- [ ] Confirm queue failures appear in recent ops events
- [ ] Schedule recurring D1 backups before schema changes

## Rollback

- [ ] Keep latest `backups/brainmail-production-*.sql` export
- [ ] Redeploy previous Worker version with `wrangler rollback` if needed
- [ ] Restore D1 from backup if a migration must be reversed

## Production release

BrainMail v1.0.0 is the first production release covering Phases 0–21.
