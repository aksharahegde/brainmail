# AI Email OS

## Automation Engine Specification

# Overview

The Automation Engine allows users to create intelligent workflows using natural language.

Automations operate on:

- Emails
- Entities
- Collections
- Workspaces
- Vendors
- Contacts
- Reports
- Artifacts

The system converts natural language into executable workflows.

---

# Core Principles

## Natural Language First

Users should not write rules.

Example:

When OpenAI invoices arrive,
add them to Finance.

---

## Human Readable

Every automation must be understandable.

Example:

Trigger:
New Invoice

Condition:
Vendor = OpenAI

Action:
Add To Finance

---

## Safe By Default

Dangerous actions require confirmation.

Examples:

Delete Emails

Unsubscribe

Bulk Label Changes

---

## Source Agnostic

Automations operate on entities.

Not Gmail-specific objects.

---

# Automation Structure

Every automation contains:

```typescript
interface Automation {
  trigger: Trigger;
  conditions: Condition[];
  actions: Action[];
}
```

---

# Triggers

Triggers start workflows.

---

## New Email

```json
{
  "type": "new_email"
}
```

---

## New Entity

```json
{
  "type": "new_entity"
}
```

Examples:

Invoice

Subscription

Travel Booking

Receipt

---

## New Vendor

```json
{
  "type": "new_vendor"
}
```

---

## New Contact

```json
{
  "type": "new_contact"
}
```

---

## Subscription Renewal

```json
{
  "type": "subscription_renewal"
}
```

---

## Scheduled Trigger

```json
{
  "type": "scheduled"
}
```

Examples:

Daily

Weekly

Monthly

Quarterly

---

## Insight Trigger

```json
{
  "type": "insight_detected"
}
```

Examples:

Cost Increase

Duplicate Subscription

High Spend

---

# Conditions

Conditions narrow execution.

---

## Vendor

```json
{
  "field": "vendor",
  "operator": "=",
  "value": "OpenAI"
}
```

---

## Amount

```json
{
  "field": "amount",
  "operator": ">",
  "value": 500
}
```

---

## Category

```json
{
  "field": "category",
  "operator": "=",
  "value": "invoice"
}
```

---

## Collection

```json
{
  "field": "collection",
  "operator": "=",
  "value": "Finance"
}
```

---

## Workspace

```json
{
  "field": "workspace",
  "operator": "=",
  "value": "Startup"
}
```

---

# Actions

Actions execute after conditions pass.

---

## Email Actions

Archive Email

Delete Email

Apply Label

Remove Label

Mark Read

Mark Unread

Create Filter

Unsubscribe

---

## Collection Actions

Add To Collection

Remove From Collection

Create Collection

---

## Workspace Actions

Add To Workspace

Create Workspace

---

## Dashboard Actions

Create Dashboard

Refresh Dashboard

---

## Report Actions

Generate Report

Send Report

Export Report

---

## Notification Actions

Create Notification

Send Email

Send Push

---

# Automation Lifecycle

```text
Trigger
    ↓
Condition Evaluation
    ↓
Action Execution
    ↓
Audit Log
```

---

# Natural Language Generation

Users create automations using chat.

Example:

Archive newsletters older than 30 days.

Generated:

Trigger:
Scheduled Daily

Condition:
Newsletter
Older Than 30 Days

Action:
Archive Email

---

# Automation Categories

## Inbox Cleanup

Examples:

Archive newsletters

Delete OTP emails

Clean promotions

---

## Finance

Examples:

Track invoices

Monitor subscriptions

Detect spending increases

---

## CRM

Examples:

Follow-up reminders

Contact monitoring

Relationship tracking

---

## Travel

Examples:

Detect new trips

Build travel timelines

Generate travel reports

---

## Reporting

Examples:

Weekly founder report

Monthly expense report

Subscription audit

---

# Scheduled Automations

Supported schedules:

Hourly

Daily

Weekly

Monthly

Quarterly

Custom Cron

---

# Insight-Based Automations

Triggered by generated insights.

Examples:

OpenAI spend increased 40%.

Generate cost report.

---

Duplicate subscription detected.

Create notification.

---

# Suggested Automations

AI should recommend automations.

Examples:

Track AI Expenses

Monitor Subscription Renewals

Create Weekly Finance Report

Archive Old Newsletters

---

# Automation Templates

Prebuilt templates.

---

## Finance Tracker

Tracks:

Invoices

Receipts

Subscriptions

---

## Founder Report

Generates:

Weekly business summary

---

## Subscription Monitor

Tracks:

Renewals

Cost increases

Unused subscriptions

---

## Inbox Cleanup

Archives:

Promotions

Newsletters

Old notifications

---

# Execution Engine

Automations execute asynchronously.

Use:

Cloudflare Queues

---

# Processing Flow

```text
Trigger Event
      ↓
Queue Job
      ↓
Evaluate Conditions
      ↓
Execute Actions
      ↓
Store Results
```

---

# Execution Results

```json
{
  "status": "success",
  "actionsExecuted": 3
}
```

---

# Automation Runs

Every execution stored.

Fields:

Run ID

Status

Duration

Actions Executed

Errors

---

# Failure Handling

Failures should not stop other automations.

Store:

Error

Context

Retry Count

---

# Retry Strategy

Transient Errors

Retry 3 Times

Permanent Errors

Mark Failed

---

# Audit Logging

Every automation execution logged.

Examples:

Created Filter

Archived Emails

Generated Report

Created Dashboard

---

# Safety Layer

Dangerous actions require approval.

Examples:

Delete Emails

Bulk Unsubscribe

Delete Collection

Delete Workspace

---

# Approval Workflow

```text
Automation
      ↓
Preview
      ↓
User Approval
      ↓
Execution
```

---

# Automation UI Blocks

Supported:

automation_preview

automation_card

automation_run

automation_template

---

# Automation Metrics

Track:

Execution Count

Success Rate

Failure Rate

Average Duration

---

# Future Support

Future automation targets:

Slack

Outlook

Notion

Google Drive

Calendar

The automation engine should remain source agnostic.

Automations operate on entities and knowledge rather than provider-specific objects.
