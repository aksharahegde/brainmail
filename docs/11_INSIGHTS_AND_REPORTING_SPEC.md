# AI Email OS

## Insights & Reporting Specification

# Overview

The Insights & Reporting Engine is the proactive intelligence layer of AI Email OS.

Unlike Chat, which is reactive, the Insights Engine continuously analyzes user data and surfaces valuable information without requiring a prompt.

The objective is to answer questions before users ask them.

Examples:

- Spending increases
- Subscription renewals
- Unread important emails
- Vendor activity changes
- Follow-up reminders
- Travel updates
- Inbox cleanup opportunities

---

# Philosophy

Traditional Email

```text
User searches
    ↓
Find information
```

AI Email OS

```text
System analyzes
    ↓
Generates insight
    ↓
Recommends action
```

---

# Insight Lifecycle

```text
Data Changes
      ↓
Insight Detection
      ↓
Insight Generation
      ↓
Artifact Creation
      ↓
Action Suggestions
      ↓
User Notification
```

---

# Insight Categories

## Financial

Examples:

- Spending increases
- Spending decreases
- Large invoices
- New vendors
- Subscription changes

---

## Inbox

Examples:

- Too many newsletters
- Unread backlog
- Inbox health deterioration
- High notification volume

---

## CRM

Examples:

- Follow-up reminders
- Lost contacts
- Relationship changes

---

## Travel

Examples:

- New trip detected
- Upcoming travel
- Missing receipts

---

## Workspace

Examples:

- Increased activity
- Cost spikes
- New entities

---

## Automation

Examples:

- Automation failures
- Recommended automations
- Underutilized automations

---

# Insight Object

```typescript
interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  confidence: number;
  actions: Action[];
  generatedAt: string;
}
```

---

# Severity Levels

```text
info

warning

important

critical
```

---

# Insight Examples

## Spend Increase

```text
OpenAI spending increased 32% this month.
```

---

## Duplicate Subscription

```text
You appear to have two active design tool subscriptions.
```

---

## Unread Newsletters

```text
You have 320 unread newsletters.
```

---

## Follow-Up Reminder

```text
You have not replied to Sarah in 14 days.
```

---

# Daily Briefing Engine

Generates a personalized summary.

Default schedule:

Daily

---

# Daily Briefing Sections

## Inbox Summary

Example:

```text
23 new emails

4 invoices

2 subscription renewals
```

---

## Financial Summary

Example:

```text
$420 spent this week

2 new subscriptions
```

---

## Suggested Actions

Example:

```text
Archive 120 newsletters

Create AI Expenses dashboard
```

---

## Follow-Ups

Example:

```text
3 conversations awaiting response
```

---

# Daily Briefing Artifact

Artifact Type:

```text
daily_briefing
```

Generated every day.

Stored for historical access.

---

# Inbox Health Engine

Measures inbox quality.

---

# Metrics

Unread Count

Newsletter Volume

Promotional Emails

Pending Replies

Notification Noise

---

# Health Score

Range:

```text
0 - 100
```

Example:

```text
Inbox Health

82/100
```

---

# Inbox Health Recommendations

Examples:

Archive newsletters.

Delete OTP emails.

Respond to pending conversations.

Create cleanup automation.

---

# Vendor Intelligence

Vendor profiles generate insights.

---

# Vendor Metrics

Total Spend

Average Spend

Invoice Count

Subscription Count

Email Volume

Activity Trends

---

# Vendor Insights

Examples:

OpenAI spend increased.

AWS invoice exceeds monthly average.

New vendor detected.

---

# Subscription Monitoring

Track:

Renewals

Cost Changes

New Subscriptions

Cancelled Subscriptions

---

# Subscription Insights

Examples:

Cursor renews in 3 days.

Monthly software spend increased 15%.

Unused subscription detected.

---

# Workspace Intelligence

Every workspace generates insights.

---

# Startup Workspace

Examples:

Revenue increased.

Infrastructure spend increased.

New customer activity detected.

---

# Finance Workspace

Examples:

Bills due soon.

Spending trend increasing.

New vendor detected.

---

# Travel Workspace

Examples:

Upcoming trip.

Missing receipts.

Travel costs exceeded average.

---

# CRM Intelligence

Track communication patterns.

---

# Metrics

Last Contact

Response Time

Interaction Frequency

Relationship Score

---

# CRM Insights

Examples:

Follow up with John.

No interaction with vendor in 60 days.

Communication frequency decreasing.

---

# Travel Intelligence

Track:

Flights

Hotels

Tickets

Receipts

Trips

---

# Travel Insights

Examples:

Upcoming travel detected.

Missing expense records.

Trip budget exceeded.

---

# Cost Intelligence

Financial anomaly detection.

---

# Cost Events

Spend Increase

Spend Decrease

Large Invoice

New Vendor

Subscription Changes

---

# Example

```text
OpenAI spending increased by 42%.
```

---

# Recommendation Engine

Every insight should suggest actions.

---

# Recommendation Examples

Archive old newsletters.

Generate finance report.

Create spending dashboard.

Track subscription.

Create workspace.

---

# Suggested Automation Engine

Generate automation recommendations.

Example:

```text
You receive OpenAI invoices every month.

Suggested Automation:

Add OpenAI invoices to Finance.
```

---

# Reports

Reports are persistent artifacts.

---

# Report Types

## Weekly Founder Report

Contains:

Revenue

Expenses

Customers

Subscriptions

Insights

---

## Monthly Expense Report

Contains:

Invoices

Subscriptions

Vendors

Cost Trends

---

## Subscription Audit

Contains:

Active Subscriptions

Renewals

Cost Breakdown

Unused Services

---

## Travel Report

Contains:

Flights

Hotels

Expenses

Trips

---

## Inbox Report

Contains:

Inbox Health

Unread Volume

Response Backlog

Cleanup Suggestions

---

## Workspace Report

Generated per workspace.

Contains:

Activity

Insights

Metrics

Recommendations

---

# Report Structure

```typescript
interface Report {
  id: string;
  title: string;
  sections: ReportSection[];
}
```

---

# Report Sections

Supported:

Summary

Metrics

Charts

Tables

Insights

Recommendations

Timeline

Actions

---

# Report Scheduling

Supported schedules:

Daily

Weekly

Monthly

Quarterly

Custom

---

# Report Delivery

Methods:

In-App

Email

Push Notification

---

# Report Artifacts

Artifact Types:

weekly_report

expense_report

subscription_report

travel_report

workspace_report

inbox_report

---

# Insight Artifacts

Artifact Types:

insight_report

daily_briefing

vendor_report

timeline_report

---

# Insight UI Blocks

Supported:

daily_briefing

insight_card

inbox_health

vendor_profile

subscription_card

workspace_insight

recommendation_card

---

# Insight Agent

Responsible for:

Insight Detection

Report Generation

Recommendation Generation

Daily Briefings

Inbox Health

Vendor Intelligence

Subscription Monitoring

CRM Intelligence

Travel Intelligence

---

# Insight Generation Frequency

Real-Time:

Critical Insights

---

Hourly:

Operational Insights

---

Daily:

Briefings

Health Scores

Recommendations

---

Weekly:

Founder Reports

Workspace Reports

---

Monthly:

Expense Reports

Subscription Audits

---

# Insight Prioritization

Priority Order:

```text
Critical

Important

Warning

Informational
```

Critical insights always appear first.

---

# Success Criteria

The platform should provide value even when users do not interact with chat.

A successful Insights & Reporting system should:

- Surface valuable information proactively
- Recommend useful actions
- Generate meaningful reports
- Improve inbox organization
- Help users save money
- Help users maintain relationships
- Help users understand their data

The ultimate goal is to transform email data into continuous intelligence.
