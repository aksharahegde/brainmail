import { createDb } from '@brainmail/db';
import { emails, entities } from '@brainmail/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

import type { UIBlock } from '../agents/types';
import { getWorkspaceEmailCategories } from '../workspaces/context';
import type { DashboardDefinition, DashboardTemplateKey } from './types';

type EntityRow = {
  id: string;
  entityType: string;
  data: Record<string, unknown> | null;
  sourceId: string | null;
};

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

async function listWorkspaceEntities(
  env: Env,
  userId: string,
  workspaceId: string | null,
  entityTypes: string[],
): Promise<EntityRow[]> {
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

function buildAiExpensesBlocks(entityRows: EntityRow[]): UIBlock[] {
  const expenseEntities = entityRows.filter((row) =>
    ['invoice', 'receipt'].includes(row.entityType),
  );

  let totalSpend = 0;
  const vendorTotals = new Map<string, number>();

  for (const entity of expenseEntities) {
    const data = asRecord(entity.data);
    const amount = asNumber(data.amount);
    const vendor = asString(data.vendor, 'Unknown vendor');
    totalSpend += amount;
    vendorTotals.set(vendor, (vendorTotals.get(vendor) ?? 0) + amount);
  }

  const vendorPoints = [...vendorTotals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  return [
    {
      id: 'expenses_metrics',
      type: 'metric_grid',
      data: {
        metrics: [
          { title: 'Total spend', value: formatCurrency(totalSpend) },
          { title: 'Transactions', value: String(expenseEntities.length) },
          { title: 'Vendors', value: String(vendorTotals.size) },
        ],
      },
    },
    {
      id: 'expenses_vendor_chart',
      type: 'bar_chart',
      data: {
        title: 'Spend by vendor',
        points: vendorPoints,
      },
    },
    {
      id: 'expenses_invoice_table',
      type: 'invoice_table',
      data: {
        title: 'Recent expenses',
        invoices: expenseEntities.slice(0, 10).map((entity) => {
          const data = asRecord(entity.data);
          return {
            id: entity.id,
            invoiceNumber: asString(data.vendor, '—'),
            amount: asNumber(data.amount),
            currency: asString(data.currency, 'USD'),
            invoiceDate: null,
          };
        }),
      },
    },
  ];
}

function buildSubscriptionsBlocks(entityRows: EntityRow[]): UIBlock[] {
  const subscriptionEntities = entityRows.filter(
    (row) => row.entityType === 'subscription',
  );

  let monthlyTotal = 0;
  const rows: string[][] = [];

  for (const entity of subscriptionEntities) {
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
      id: 'subscriptions_metrics',
      type: 'metric_grid',
      data: {
        metrics: [
          {
            title: 'Active subscriptions',
            value: String(subscriptionEntities.length),
          },
          { title: 'Monthly total', value: formatCurrency(monthlyTotal) },
          {
            title: 'Avg. cost',
            value:
              subscriptionEntities.length > 0
                ? formatCurrency(monthlyTotal / subscriptionEntities.length)
                : '$0',
          },
        ],
      },
    },
    {
      id: 'subscriptions_table',
      type: 'table',
      data: {
        title: 'Subscription breakdown',
        columns: ['Vendor', 'Amount', 'Status'],
        rows,
      },
    },
  ];
}

export async function buildDashboardDefinition(
  env: Env,
  input: {
    userId: string;
    workspaceId: string | null;
    templateKey: DashboardTemplateKey | string;
  },
): Promise<DashboardDefinition> {
  const entityRows = await listWorkspaceEntities(
    env,
    input.userId,
    input.workspaceId,
    ['invoice', 'receipt', 'subscription'],
  );

  let blocks: UIBlock[] = [];

  if (input.templateKey === 'ai_expenses') {
    blocks = buildAiExpensesBlocks(entityRows);
  } else if (input.templateKey === 'subscriptions') {
    blocks = buildSubscriptionsBlocks(entityRows);
  }

  return {
    templateKey: input.templateKey,
    blocks,
    refreshedAt: new Date().toISOString(),
  };
}
