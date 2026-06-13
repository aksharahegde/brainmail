# AI Email OS

## API Contracts Specification

# Overview

This document defines all public APIs exposed by Cloudflare Workers.

Principles:

- Stateless APIs
- Artifact-first design
- Generative UI responses
- AI actions are explicit
- All responses are user-scoped

Base URL:

```text
/api/v1
```

---

# Authentication

Authentication uses session-based authentication.

Headers:

```http
Authorization: Bearer <token>
```

---

# Standard Response

All API responses follow:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

# Generative UI Response

All AI endpoints return:

```typescript
interface UIResponse {
  blocks: UIBlock[];
  actions?: Action[];
  artifact?: ArtifactReference;
}
```

---

# CHAT APIs

## POST /chat

Primary AI endpoint.

### Request

```json
{
  "sessionId": "session_123",
  "message": "What was my OpenAI spend this year?"
}
```

### Response

```json
{
  "blocks": [
    {
      "type": "kpi",
      "data": {
        "title": "Total Spend",
        "value": "$820"
      }
    }
  ],
  "actions": [],
  "artifact": {
    "id": "artifact_123",
    "type": "vendor_report"
  }
}
```

---

## GET /chat/sessions

List chat sessions.

### Response

```json
{
  "sessions": [
    {
      "id": "",
      "title": "",
      "createdAt": ""
    }
  ]
}
```

---

## POST /chat/session

Create chat session.

### Response

```json
{
  "id": "session_123"
}
```

---

## GET /chat/session/:id

Retrieve session history.

---

# AUTH APIs

## POST /auth/login

Start OAuth flow.

---

## POST /auth/logout

Logout current session.

---

## GET /auth/me

Current user.

### Response

```json
{
  "id": "",
  "email": "",
  "name": ""
}
```

---

# ACCOUNT APIs

## GET /accounts

List connected accounts.

### Response

```json
{
  "accounts": [
    {
      "id": "",
      "provider": "gmail"
    }
  ]
}
```

---

## POST /accounts/connect

Connect account.

### Request

```json
{
  "provider": "gmail"
}
```

---

## DELETE /accounts/:id

Disconnect account.

---

# EMAIL APIs

## GET /emails

Search emails.

### Query

```text
?q=openai
&page=1
```

### Response

```json
{
  "emails": []
}
```

---

## GET /emails/:id

Retrieve email.

---

## GET /threads/:id

Retrieve thread.

---

# COLLECTION APIs

## GET /collections

List collections.

---

## POST /collections

Create collection.

### Request

```json
{
  "name": "AI Expenses"
}
```

---

## GET /collections/:id

Collection detail.

---

## PATCH /collections/:id

Update collection.

---

## DELETE /collections/:id

Delete collection.

---

# WORKSPACE APIs

## GET /workspaces

List workspaces.

### Response

```json
{
  "workspaces": [
    {
      "id": "",
      "name": "Startup"
    }
  ]
}
```

---

## POST /workspaces

Create workspace.

---

## GET /workspaces/:id

Workspace detail.

Returns:

- entities
- dashboards
- reports
- insights

---

## PATCH /workspaces/:id

Update workspace.

---

## DELETE /workspaces/:id

Delete workspace.

---

# DASHBOARD APIs

## GET /dashboards

List dashboards.

---

## POST /dashboards

Create dashboard.

### Request

```json
{
  "name": "AI Expenses"
}
```

---

## GET /dashboards/:id

Dashboard detail.

---

## PATCH /dashboards/:id

Update dashboard.

---

## DELETE /dashboards/:id

Delete dashboard.

---

# REPORT APIs

## GET /reports

List reports.

---

## POST /reports

Generate report.

### Request

```json
{
  "type": "monthly_expense"
}
```

---

## GET /reports/:id

Retrieve report.

---

## POST /reports/:id/refresh

Refresh report.

---

# ARTIFACT APIs

## GET /artifacts

List artifacts.

---

## GET /artifacts/:id

Retrieve artifact.

### Response

```json
{
  "id": "",
  "type": "chart",
  "payload": {}
}
```

---

## DELETE /artifacts/:id

Delete artifact.

---

# INSIGHT APIs

## GET /insights

List generated insights.

### Response

```json
{
  "insights": []
}
```

---

## GET /briefing

Daily briefing.

### Response

```json
{
  "blocks": []
}
```

---

# VENDOR APIs

## GET /vendors

List vendors.

---

## GET /vendors/:id

Vendor profile.

Returns:

- spend
- subscriptions
- invoices
- trends

---

# SUBSCRIPTION APIs

## GET /subscriptions

List subscriptions.

---

## GET /subscriptions/:id

Subscription detail.

---

## POST /subscriptions/:id/ignore

Ignore subscription.

---

# CRM APIs

## GET /contacts

List contacts.

---

## GET /contacts/:id

Contact profile.

Returns:

- relationship score
- activity
- communication history

---

# TRAVEL APIs

## GET /trips

List trips.

---

## GET /trips/:id

Trip detail.

Returns:

- flights
- hotels
- expenses
- timeline

---

# FILTER APIs

## GET /filters

List filters.

---

## POST /filters

Create filter.

### Request

```json
{
  "name": "Manning",
  "query": "from:manning.com"
}
```

---

## DELETE /filters/:id

Delete filter.

---

# AUTOMATION APIs

## GET /automations

List automations.

---

## POST /automations

Create automation.

### Request

```json
{
  "definition": {}
}
```

---

## PATCH /automations/:id

Update automation.

---

## DELETE /automations/:id

Delete automation.

---

## GET /automations/:id/runs

Execution history.

---

# ACTION APIs

Actions are always explicit.

---

## POST /actions/archive

Archive emails.

### Request

```json
{
  "emailIds": []
}
```

---

## POST /actions/delete

Delete emails.

### Request

```json
{
  "emailIds": []
}
```

---

## POST /actions/label

Apply label.

---

## POST /actions/unsubscribe

Unsubscribe sender.

---

## POST /actions/export

Export artifact.

### Request

```json
{
  "artifactId": "",
  "format": "csv"
}
```

---

# SEARCH APIs

## GET /search

Global search.

### Query

```text
?q=openai
```

### Response

```json
{
  "emails": [],
  "vendors": [],
  "artifacts": [],
  "workspaces": []
}
```

---

# AUDIT APIs

## GET /audit

Audit log.

### Response

```json
{
  "events": []
}
```

---

# WEBHOOK APIs

## POST /webhooks/gmail

Receives Gmail push notifications.

Internal use only.

---

# HEALTH APIs

## GET /health

Health check.

### Response

```json
{
  "status": "ok"
}
```

---

# Error Response

```json
{
  "success": false,
  "error": "Permission denied"
}
```

---

# API Design Rules

1. All endpoints are user scoped.
2. AI responses return UI blocks.
3. Actions are explicit.
4. Destructive actions require confirmation.
5. Artifacts are first-class resources.
6. Workspaces are top-level organizational units.
7. Reports and dashboards are persistent resources.
8. APIs remain source-agnostic.
