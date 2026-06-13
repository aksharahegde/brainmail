# AI Email OS

## Generative UI Specification

# Overview

AI Email OS uses Generative UI.

The backend determines:

- What UI to display
- The order of UI blocks
- Available actions
- Available follow-up interactions

The frontend is a renderer only.

Frontend never decides presentation.

---

# Design Principles

## Backend Owns Presentation

Bad:

Backend returns data.

Frontend decides layout.

Good:

Backend returns UI blocks.

Frontend renders blocks.

---

## Whitelisted Components Only

The AI may only generate approved UI blocks.

AI cannot create arbitrary UI.

This guarantees:

- Stability
- Security
- Consistency

---

## Artifact Driven

Every UI view should be backed by an artifact.

Examples:

- Dashboard
- Chart
- Timeline
- Report
- Table

---

# Response Format

All responses must follow:

```typescript
interface UIResponse {
  blocks: UIBlock[];
  actions?: Action[];
  artifact?: ArtifactReference;
}
```

---

# UIBlock

```typescript
interface UIBlock {
  id: string;
  type: string;
  data: object;
}
```

---

# Block Categories

## Content Blocks

### markdown

```typescript
{
  type: 'markdown';
}
```

---

### text

```typescript
{
  type: 'text';
}
```

---

### code

```typescript
{
  type: 'code';
}
```

---

# Metrics

### kpi

```typescript
{
  type: "kpi",
  data: {
    title: string,
    value: string
  }
}
```

---

### metric_grid

```typescript
{
  type: 'metric_grid';
}
```

---

# Data Blocks

### table

Generic table.

```typescript
{
  type: 'table';
}
```

---

### invoice_table

```typescript
{
  type: 'invoice_table';
}
```

---

### email_list

```typescript
{
  type: 'email_list';
}
```

---

### subscription_table

```typescript
{
  type: 'subscription_table';
}
```

---

### contact_list

```typescript
{
  type: 'contact_list';
}
```

---

# Chart Blocks

### line_chart

```typescript
{
  type: 'line_chart';
}
```

---

### bar_chart

```typescript
{
  type: 'bar_chart';
}
```

---

### pie_chart

```typescript
{
  type: 'pie_chart';
}
```

---

### area_chart

```typescript
{
  type: 'area_chart';
}
```

---

# Workspace Blocks

### workspace_summary

```typescript
{
  type: 'workspace_summary';
}
```

Displays:

- Overview
- KPIs
- Recent Activity

---

### collection_summary

```typescript
{
  type: 'collection_summary';
}
```

---

# Vendor Intelligence

### vendor_profile

```typescript
{
  type: 'vendor_profile';
}
```

Displays:

- Spend
- Invoices
- Trend
- Activity

---

### vendor_breakdown

```typescript
{
  type: 'vendor_breakdown';
}
```

---

# Subscription Center

### subscription_card

```typescript
{
  type: 'subscription_card';
}
```

Displays:

- Cost
- Renewal
- Status

---

### subscription_overview

```typescript
{
  type: 'subscription_overview';
}
```

---

# Personal CRM

### contact_card

```typescript
{
  type: 'contact_card';
}
```

---

### relationship_summary

```typescript
{
  type: 'relationship_summary';
}
```

---

# Travel

### trip_summary

```typescript
{
  type: 'trip_summary';
}
```

---

### travel_timeline

```typescript
{
  type: 'travel_timeline';
}
```

---

# Timeline

### timeline

```typescript
{
  type: 'timeline';
}
```

Used for:

- Startup Timeline
- Vendor Timeline
- Travel Timeline

---

# Inbox Intelligence

### daily_briefing

```typescript
{
  type: 'daily_briefing';
}
```

---

### inbox_health

```typescript
{
  type: 'inbox_health';
}
```

---

### insight_card

```typescript
{
  type: 'insight_card';
}
```

---

### suggestion_card

```typescript
{
  type: 'suggestion_card';
}
```

---

# Dashboard Blocks

### dashboard_card

```typescript
{
  type: 'dashboard_card';
}
```

---

### dashboard_template

```typescript
{
  type: 'dashboard_template';
}
```

---

# Workflow Blocks

### action_group

Displays available actions.

```typescript
{
  type: 'action_group';
}
```

---

### confirmation

Used for dangerous actions.

```typescript
{
  type: 'confirmation';
}
```

---

### filter_preview

```typescript
{
  type: 'filter_preview';
}
```

---

### automation_preview

```typescript
{
  type: 'automation_preview';
}
```

---

# Action Contract

```typescript
interface Action {
  id: string;
  type: string;
  label: string;
  dangerous: boolean;
  payload: object;
}
```

---

# Supported Actions

Archive Emails

Delete Emails

Create Filter

Create Automation

Create Dashboard

Export CSV

Export PDF

Save Report

Share Report

Create Workspace

Add To Collection

---

# Artifact Reference

```typescript
interface ArtifactReference {
  id: string;
  type: string;
}
```

---

# UI Planner Agent

Responsible for:

- Selecting blocks
- Ordering blocks
- Selecting actions
- Selecting artifacts

---

# Example 1

User:

What was my OpenAI spend?

Response:

KPI

Line Chart

Invoice Table

Actions

---

# Example 2

User:

Show my subscriptions.

Response:

Subscription Overview

Subscription Cards

Renewal Timeline

Actions

---

# Example 3

User:

Create filter for Manning.

Response:

Filter Preview

Confirmation

Actions

---

# Example 4

User:

Show everything related to Rydsta.

Response:

Workspace Summary

Timeline

Recent Activity

Related Contacts

Actions

---

# Frontend Responsibilities

The frontend must:

- Render blocks
- Execute actions
- Manage navigation
- Handle loading states

The frontend must NOT:

- Decide layouts
- Choose components
- Build analytics
- Create charts
- Generate dashboards

All presentation decisions come from the backend.

---

# Future Compatibility

New blocks may be added without changing existing APIs.

The renderer should support block registration.

```typescript
blockRegistry[type];
```

Unknown blocks should gracefully fallback.
