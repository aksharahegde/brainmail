# AI Email OS

## Workspace Specification

# Overview

Workspaces are the highest-level organizational unit in AI Email OS.

A Workspace is an AI-powered knowledge environment that groups:

- Entities
- Collections
- Dashboards
- Reports
- Contacts
- Insights
- Automations
- Artifacts

around a common topic, goal, project, business, or area of life.

Workspaces are the primary navigation model of the platform.

---

# Philosophy

Traditional email systems organize data using:

- Labels
- Folders
- Categories

AI Email OS organizes knowledge using:

- Workspaces
- Collections
- Entities
- Reports

---

# Examples

## Startup

Contains:

- Customers
- Vendors
- Revenue
- Expenses
- Invoices
- Infrastructure

---

## Finance

Contains:

- Bills
- Invoices
- Receipts
- Subscriptions

---

## Travel

Contains:

- Flights
- Hotels
- Tickets
- Expenses

---

## Learning

Contains:

- Courses
- Books
- Newsletters
- Training

---

## Personal

Contains:

- Contacts
- Purchases
- Trips
- Important Emails

---

# Workspace Types

## System Workspace

Created automatically.

Examples:

Finance

Travel

Learning

Subscriptions

---

## AI Workspace

Suggested by AI.

Examples:

AI Vendors

Customer Support

Recruiting

Japan Trip

---

## User Workspace

Created manually.

Examples:

Startup

Family

Side Projects

---

# Workspace Structure

```text
Workspace
    ↓
Collections
    ↓
Entities
    ↓
Artifacts
    ↓
Reports
```

---

# Workspace Components

Every workspace may contain:

## Overview

Summary of workspace.

---

## Collections

Semantic groups.

---

## Entities

Knowledge objects.

---

## Dashboards

Analytics views.

---

## Reports

Generated summaries.

---

## Insights

AI-generated observations.

---

## Contacts

People associated with workspace.

---

## Automations

Workspace-specific workflows.

---

## Activity Timeline

Chronological activity feed.

---

# Workspace Homepage

Every workspace has a homepage.

Example:

Startup

Revenue

Expenses

Subscriptions

Customers

Recent Activity

Insights

Suggested Actions

---

# Workspace Summary Block

UI Type:

```text
workspace_summary
```

Displays:

- Name
- Description
- KPIs
- Activity
- Insights

---

# Workspace Membership

Entities can belong to multiple workspaces.

Example:

OpenAI

May belong to:

Finance

Startup

AI Expenses

---

# Membership Sources

## AI Classification

Automatically assigned.

---

## User Rules

Example:

```text
AWS → Startup
```

---

## Manual Assignment

User adds entity manually.

---

# Workspace Discovery

AI should continuously suggest workspaces.

Examples:

AI Vendors

Customer Success

Hiring

Conferences

Tax Preparation

---

# Workspace Creation

Users may create workspaces.

Examples:

Startup

Client Work

Personal Finance

Family

---

# Workspace Lifecycle

## Create

Workspace created.

---

## Populate

Collections and entities assigned.

---

## Analyze

Insights generated.

---

## Report

Reports generated.

---

## Automate

Automations attached.

---

## Evolve

Workspace grows over time.

---

# Workspace Sections

## Overview

High-level summary.

---

## Activity

Recent emails and entities.

---

## Collections

Workspace collections.

---

## Dashboards

Workspace dashboards.

---

## Reports

Workspace reports.

---

## Contacts

Workspace people.

---

## Vendors

Workspace companies.

---

## Insights

Generated intelligence.

---

## Automations

Associated workflows.

---

# Workspace Activity Feed

Timeline of events.

Examples:

Invoice Received

Subscription Renewed

Contact Added

Automation Executed

Report Generated

---

# Workspace Timeline

Generates historical view.

Example:

Startup

March

- Domain Purchased

April

- Stripe Added

May

- First Customer

June

- Infrastructure Upgrade

---

# Workspace Dashboards

Every workspace may have dashboards.

Examples:

Startup:

Revenue

Expenses

Customers

---

Travel:

Trips

Hotels

Flights

Expenses

---

Finance:

Bills

Invoices

Subscriptions

---

# Workspace Reports

Examples:

Weekly Startup Report

Monthly Finance Report

Travel Summary

Learning Progress Report

---

# Workspace Insights

Generated automatically.

Examples:

OpenAI spend increased 20%.

You have 3 unused subscriptions.

Customer activity increased.

No communication with vendor in 60 days.

---

# Workspace Contacts

Relationships attached to workspace.

Examples:

Founders

Customers

Vendors

Recruiters

Friends

---

# Workspace Vendors

Associated companies.

Examples:

OpenAI

AWS

Stripe

Manning

GitHub

---

# Workspace Automations

Examples:

Track invoices.

Generate weekly report.

Notify on cost increase.

Archive old newsletters.

---

# Workspace Collections

Examples:

Startup Workspace

Collections:

Revenue

Infrastructure

Customers

AI Expenses

---

# Workspace Metrics

Tracked values:

Entity Count

Collection Count

Dashboard Count

Report Count

Automation Count

Contact Count

Activity Count

---

# Workspace Artifacts

Generated artifacts linked to workspace.

Examples:

Reports

Charts

Timelines

Dashboards

Vendor Reports

Travel Reports

---

# Workspace Search

Search within workspace scope.

Examples:

Search Startup

Search Travel

Search Finance

Results prioritize workspace context.

---

# Workspace Context

When user is inside workspace:

Queries become scoped.

Example:

Workspace: Startup

User:

```text
Show invoices
```

Automatically becomes:

```text
Show Startup invoices
```

---

# Workspace Memory

Workspace stores:

- User preferences
- Collections
- Reports
- Dashboards
- Rules

Used by AI for future responses.

---

# Workspace Rules

Examples:

AWS belongs to Startup.

Manning belongs to Learning.

Uber belongs to Travel.

Used for automatic organization.

---

# Workspace Permissions

V1:

Single user.

Future:

Workspace members.

Workspace roles.

Shared workspaces.

---

# Workspace Templates

Prebuilt templates.

---

## Startup Template

Revenue

Expenses

Customers

Infrastructure

Subscriptions

---

## Finance Template

Bills

Invoices

Receipts

Taxes

Subscriptions

---

## Travel Template

Trips

Flights

Hotels

Expenses

---

## Learning Template

Books

Courses

Newsletters

Certificates

---

# Workspace Recommendations

AI should suggest:

New collections.

New dashboards.

New reports.

New automations.

Examples:

Create AI Expenses dashboard.

Generate monthly founder report.

Track subscription renewals.

---

# Workspace UI Blocks

Supported blocks:

workspace_summary

workspace_activity

workspace_metrics

workspace_dashboard

workspace_report

workspace_insight

workspace_contacts

workspace_vendors

workspace_timeline

---

# Workspace Navigation

Top-level navigation:

Workspaces

Inside Workspace:

Overview

Activity

Collections

Dashboards

Reports

Contacts

Insights

Automations

Settings

---

# Workspace Goals

Workspaces should become the primary way users interact with knowledge.

Users should think:

"I want to see my Startup workspace."

not:

"I want to search my inbox."

The workspace system transforms email from communication into an organized intelligence platform.
