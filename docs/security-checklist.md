# BrainMail Security Checklist

Phase 20 production-readiness checklist for BrainMail.

## Audit logging

- [x] `audit_logs` table stores user-scoped security events
- [x] Login, logout, account connect/disconnect events are logged
- [x] Data export requests are logged
- [x] Account deletion previews are logged
- [x] `GET /api/v1/audit` exposes recent events to the authenticated user

## Rate limiting

- [x] API routes enforce per-identity request limits via D1 buckets
- [x] Stricter limits on chat, login, export, and account deletion endpoints
- [x] Rate-limited responses return HTTP 429 with `Retry-After`

## Prompt injection protection

- [x] Email content is wrapped in untrusted content boundaries before LLM calls
- [x] Chat routing wraps user input as untrusted content
- [x] System prompts include explicit security rules for untrusted blocks
- [x] Known injection override patterns downgrade routing to safe search intent
- [x] Tool execution remains server-side only

## Ownership validation

- [x] Protected routes require authenticated sessions
- [x] Resource services scope queries by `user_id`
- [x] Shared ownership helpers reject cross-tenant access

## Data export

- [x] `POST /api/v1/export` exports user-owned workspaces, emails, collections, dashboards, reports, automations, artifacts, contacts, and subscriptions
- [x] JSON and CSV export formats are supported
- [x] Export actions are audit logged

## Account deletion

- [x] `GET /api/v1/account/delete` returns deletion preview counts
- [x] `DELETE /api/v1/account/delete` requires email confirmation
- [x] Deletion revokes sessions, removes vectors, deletes R2 files, and cascades D1 user data
- [x] Settings UI exposes export, audit log, and account deletion controls

## Encryption review

- [x] OAuth access and refresh tokens are encrypted at rest with AES-GCM
- [x] Session tokens are hashed before persistence
- [x] Secrets are loaded from Worker secrets / `.dev.vars`, not committed to git
- [x] Email bodies and attachments remain plaintext in D1/R2 by design for search and processing
- [x] All AI traffic is routed through Workers AI / AI Gateway bindings

## Operational follow-ups

- [ ] Rotate `TOKEN_ENCRYPTION_KEY` and `SESSION_SECRET` on a defined schedule
- [ ] Add automated alerts for unusual export or deletion volume
- [ ] Run periodic Vectorize and R2 orphan cleanup after failed deletions
- [ ] Extend PDF export once report rendering is standardized
