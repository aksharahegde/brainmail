import { createDb } from '@brainmail/db';
import { emails, entities } from '@brainmail/db/schema';
import { and, desc, eq, gte, inArray } from 'drizzle-orm';

import type { UIBlock } from '../agents/types';
import { getWorkspaceEmailCategories } from '../workspaces/context';
import type { ReportDefinition, ReportTypeKey } from './types';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function periodStart(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function periodLabel(days: number): string {
  if (days <= 7) {
    return 'Last 7 days';
  }
  if (days <= 31) {
    return 'Last 30 days';
  }
  return `Last ${days} days`;
}

async function listEmailsForWorkspace(
  env: Env,
  userId: string,
  workspaceId: string | null,
  since?: string,
) {
  const db = createDb(env.DB);
  const filters = [eq(emails.userId, userId)];

  if (since) {
    filters.push(gte(emails.receivedAt, since));
  }

  if (workspaceId) {
    const categories = getWorkspaceEmailCategories(workspaceId);
    if (categories.length > 0) {
      filters.push(inArray(emails.category, categories));
    }
  }

  return db
    .select({
      id: emails.id,
      subject: emails.subject,
      sender: emails.sender,
      category: emails.category,
      processingStatus: emails.processingStatus,
      receivedAt: emails.receivedAt,
    })
    .from(emails)
    .where(and(...filters))
    .orderBy(desc(emails.receivedAt))
    .limit(50);
}

async function listEntitiesForWorkspace(
  env: Env,
  userId: string,
  workspaceId: string | null,
  entityTypes: string[],
) {
  const db = createDb(env.DB);
  const rows = await db
    .select({
      id: entities.id,
      entityType: entities.entityType,
      data: entities.data,
      sourceId: entities.sourceId,
    })
    .from(entities)
    .where(
      and(
        eq(entities.userId, userId),
        inArray(entities.entityType, entityTypes),
      ),
    );

  if (!workspaceId) {
    return rows;
  }

  const categories = getWorkspaceEmailCategories(workspaceId);
  if (categories.length === 0) {
    return rows;
  }

  const emailRows = await db
    .select({ id: emails.id })
    .from(emails)
    .where(
      and(eq(emails.userId, userId), inArray(emails.category, categories)),
    );

  const emailIds = new Set(emailRows.map((row) => row.id));
  return rows.filter((row) => row.sourceId && emailIds.has(row.sourceId));
}

function buildWeeklyFounderReport(
  emailRows: Awaited<ReturnType<typeof listEmailsForWorkspace>>,
  entityRows: Awaited<ReturnType<typeof listEntitiesForWorkspace>>,
  label: string,
): UIBlock[] {
  const meetings = entityRows.filter(
    (row) => row.entityType === 'meeting',
  ).length;
  const companies = entityRows.filter(
    (row) => row.entityType === 'company',
  ).length;

  return [
    {
      id: 'founder_summary',
      type: 'markdown',
      data: {
        content: `## Weekly Founder Report\n${label}\n\nStartup workspace activity summary.`,
      },
    },
    {
      id: 'founder_metrics',
      type: 'metric_grid',
      data: {
        metrics: [
          { title: 'Emails', value: String(emailRows.length) },
          { title: 'Meetings', value: String(meetings) },
          { title: 'Companies', value: String(companies) },
        ],
      },
    },
    {
      id: 'founder_timeline',
      type: 'timeline',
      data: {
        title: 'Recent activity',
        events: emailRows.slice(0, 8).map((email) => ({
          title: email.subject ?? 'No subject',
          date: email.receivedAt ?? '',
          description: email.sender ?? 'Unknown sender',
        })),
      },
    },
  ];
}

function buildMonthlyExpenseReport(
  entityRows: Awaited<ReturnType<typeof listEntitiesForWorkspace>>,
  label: string,
): UIBlock[] {
  const expenses = entityRows.filter((row) =>
    ['invoice', 'receipt'].includes(row.entityType),
  );

  let total = 0;
  const vendorTotals = new Map<string, number>();

  for (const entity of expenses) {
    const data = asRecord(entity.data);
    const amount = asNumber(data.amount);
    const vendor = asString(data.vendor, 'Unknown');
    total += amount;
    vendorTotals.set(vendor, (vendorTotals.get(vendor) ?? 0) + amount);
  }

  return [
    {
      id: 'expense_summary',
      type: 'markdown',
      data: {
        content: `## Monthly Expense Report\n${label}\n\nTotal spend: ${formatCurrency(total)}`,
      },
    },
    {
      id: 'expense_metrics',
      type: 'metric_grid',
      data: {
        metrics: [
          { title: 'Total spend', value: formatCurrency(total) },
          { title: 'Transactions', value: String(expenses.length) },
          { title: 'Vendors', value: String(vendorTotals.size) },
        ],
      },
    },
    {
      id: 'expense_chart',
      type: 'bar_chart',
      data: {
        title: 'Spend by vendor',
        points: [...vendorTotals.entries()]
          .sort((left, right) => right[1] - left[1])
          .slice(0, 8)
          .map(([label, value]) => ({ label, value })),
      },
    },
  ];
}

function buildSubscriptionAuditReport(
  entityRows: Awaited<ReturnType<typeof listEntitiesForWorkspace>>,
  label: string,
): UIBlock[] {
  const subscriptions = entityRows.filter(
    (row) => row.entityType === 'subscription',
  );

  let monthlyTotal = 0;
  const rows: string[][] = [];

  for (const entity of subscriptions) {
    const data = asRecord(entity.data);
    const amount = asNumber(data.amount);
    monthlyTotal += amount;
    rows.push([
      asString(data.vendor, 'Unknown'),
      formatCurrency(amount),
      asString(data.status, 'active'),
    ]);
  }

  return [
    {
      id: 'subscription_summary',
      type: 'markdown',
      data: {
        content: `## Subscription Audit\n${label}\n\nMonthly recurring total: ${formatCurrency(monthlyTotal)}`,
      },
    },
    {
      id: 'subscription_metrics',
      type: 'metric_grid',
      data: {
        metrics: [
          { title: 'Subscriptions', value: String(subscriptions.length) },
          { title: 'Monthly total', value: formatCurrency(monthlyTotal) },
        ],
      },
    },
    {
      id: 'subscription_table',
      type: 'table',
      data: {
        title: 'Subscription breakdown',
        columns: ['Vendor', 'Amount', 'Status'],
        rows,
      },
    },
  ];
}

function buildTravelReport(
  emailRows: Awaited<ReturnType<typeof listEmailsForWorkspace>>,
  entityRows: Awaited<ReturnType<typeof listEntitiesForWorkspace>>,
  label: string,
): UIBlock[] {
  const flights = entityRows.filter(
    (row) => row.entityType === 'flight',
  ).length;
  const hotels = entityRows.filter((row) => row.entityType === 'hotel').length;

  return [
    {
      id: 'travel_summary',
      type: 'markdown',
      data: {
        content: `## Travel Report\n${label}`,
      },
    },
    {
      id: 'travel_metrics',
      type: 'metric_grid',
      data: {
        metrics: [
          { title: 'Travel emails', value: String(emailRows.length) },
          { title: 'Flights', value: String(flights) },
          { title: 'Hotels', value: String(hotels) },
        ],
      },
    },
    {
      id: 'travel_emails',
      type: 'email_list',
      data: {
        title: 'Recent travel mail',
        emails: emailRows.slice(0, 10),
      },
    },
  ];
}

function buildInboxReport(
  emailRows: Awaited<ReturnType<typeof listEmailsForWorkspace>>,
  label: string,
): UIBlock[] {
  const categoryCounts = new Map<string, number>();
  let failed = 0;
  let completed = 0;

  for (const email of emailRows) {
    const category = email.category ?? 'other';
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    if (email.processingStatus === 'failed') {
      failed += 1;
    }
    if (email.processingStatus === 'completed') {
      completed += 1;
    }
  }

  const healthScore = emailRows.length
    ? Math.round((completed / emailRows.length) * 100)
    : 100;

  return [
    {
      id: 'inbox_summary',
      type: 'markdown',
      data: {
        content: `## Inbox Report\n${label}`,
      },
    },
    {
      id: 'inbox_health',
      type: 'inbox_health',
      data: {
        title: 'Inbox health',
        score: healthScore,
        issues: [
          ...(failed > 0
            ? [{ label: `${failed} failed processing jobs`, severity: 'high' }]
            : []),
          {
            label: `${emailRows.length} emails in period`,
            severity: 'info',
          },
        ],
      },
    },
    {
      id: 'inbox_categories',
      type: 'pie_chart',
      data: {
        title: 'Emails by category',
        slices: [...categoryCounts.entries()].map(([label, value]) => ({
          label,
          value,
        })),
      },
    },
  ];
}

export async function buildReportDefinition(
  env: Env,
  input: {
    userId: string;
    workspaceId: string | null;
    reportType: ReportTypeKey;
  },
): Promise<ReportDefinition> {
  const days =
    input.reportType === 'weekly_founder' || input.reportType === 'inbox_report'
      ? 7
      : 30;
  const since = periodStart(days);
  const label = periodLabel(days);

  let blocks: UIBlock[] = [];

  if (input.reportType === 'weekly_founder') {
    const [emailRows, entityRows] = await Promise.all([
      listEmailsForWorkspace(env, input.userId, input.workspaceId, since),
      listEntitiesForWorkspace(env, input.userId, input.workspaceId, [
        'meeting',
        'company',
        'job',
        'invoice',
      ]),
    ]);
    blocks = buildWeeklyFounderReport(emailRows, entityRows, label);
  } else if (input.reportType === 'monthly_expense') {
    const entityRows = await listEntitiesForWorkspace(
      env,
      input.userId,
      input.workspaceId,
      ['invoice', 'receipt'],
    );
    blocks = buildMonthlyExpenseReport(entityRows, label);
  } else if (input.reportType === 'subscription_audit') {
    const entityRows = await listEntitiesForWorkspace(
      env,
      input.userId,
      input.workspaceId,
      ['subscription'],
    );
    blocks = buildSubscriptionAuditReport(entityRows, label);
  } else if (input.reportType === 'travel_report') {
    const [emailRows, entityRows] = await Promise.all([
      listEmailsForWorkspace(env, input.userId, input.workspaceId, since),
      listEntitiesForWorkspace(env, input.userId, input.workspaceId, [
        'flight',
        'hotel',
        'travel',
      ]),
    ]);
    blocks = buildTravelReport(emailRows, entityRows, label);
  } else if (input.reportType === 'inbox_report') {
    const emailRows = await listEmailsForWorkspace(
      env,
      input.userId,
      null,
      since,
    );
    blocks = buildInboxReport(emailRows, label);
  }

  return {
    reportType: input.reportType,
    blocks,
    refreshedAt: new Date().toISOString(),
    periodLabel: label,
  };
}
