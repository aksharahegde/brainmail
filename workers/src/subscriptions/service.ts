import { createDb } from '@brainmail/db';
import { emails, subscriptions } from '@brainmail/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { getWorkspaceEmailCategories } from '../workspaces/context';
import type {
  SubscriptionCostTrend,
  SubscriptionDuplicateGroup,
  SubscriptionRecord,
  SubscriptionRenewal,
  SubscriptionSummary,
} from './types';

function normalizeName(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeMonthlyCost(
  amount: number | null,
  billingPeriod: string | null,
): number {
  if (amount == null || !Number.isFinite(amount)) {
    return 0;
  }

  const period = (billingPeriod ?? 'monthly').toLowerCase();
  if (period.includes('year') || period.includes('annual')) {
    return amount / 12;
  }
  if (period.includes('week')) {
    return amount * 4.33;
  }
  if (period.includes('quarter')) {
    return amount / 3;
  }

  return amount;
}

function daysUntil(dateValue: string | null): number | null {
  if (!dateValue) {
    return null;
  }

  const target = Date.parse(dateValue);
  if (Number.isNaN(target)) {
    return null;
  }

  const diffMs = target - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function serializeSubscription(
  row: typeof subscriptions.$inferSelect,
  duplicateGroupId: string | null = null,
): SubscriptionRecord {
  const monthlyCost = normalizeMonthlyCost(row.amount, row.billingPeriod);

  return {
    id: row.id,
    userId: row.userId,
    companyId: row.companyId,
    sourceId: row.sourceId,
    name: row.name,
    amount: row.amount,
    currency: row.currency,
    billingPeriod: row.billingPeriod,
    renewalDate: row.renewalDate,
    status: row.status,
    monthlyCost,
    daysUntilRenewal: daysUntil(row.renewalDate),
    duplicateGroupId,
  };
}

async function listRowsForUser(
  env: Env,
  userId: string,
  workspaceId?: string | null,
): Promise<Array<typeof subscriptions.$inferSelect>> {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.renewalDate));

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

function buildDuplicateGroups(
  items: SubscriptionRecord[],
): SubscriptionDuplicateGroup[] {
  const activeItems = items.filter((item) => item.status !== 'ignored');
  const groups = new Map<string, SubscriptionRecord[]>();

  for (const item of activeItems) {
    const key = normalizeName(item.name);
    if (!key) {
      continue;
    }

    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }

  const duplicateGroups: SubscriptionDuplicateGroup[] = [];

  for (const [normalizedName, groupItems] of groups.entries()) {
    if (groupItems.length < 2) {
      continue;
    }

    const monthlyCosts = groupItems.map((item) => item.monthlyCost);
    const monthlyCostTotal = monthlyCosts.reduce(
      (total, value) => total + value,
      0,
    );
    const highestCost = Math.max(...monthlyCosts);
    const potentialMonthlySavings = Math.max(0, monthlyCostTotal - highestCost);

    duplicateGroups.push({
      id: `dup_${normalizedName.replace(/\s+/g, '_')}`,
      normalizedName,
      subscriptionIds: groupItems.map((item) => item.id),
      names: groupItems.map((item) => item.name ?? 'Subscription'),
      monthlyCostTotal,
      potentialMonthlySavings,
    });
  }

  return duplicateGroups.sort(
    (left, right) =>
      right.potentialMonthlySavings - left.potentialMonthlySavings,
  );
}

function attachDuplicateGroups(
  items: SubscriptionRecord[],
  duplicateGroups: SubscriptionDuplicateGroup[],
): SubscriptionRecord[] {
  const groupBySubscriptionId = new Map<string, string>();

  for (const group of duplicateGroups) {
    for (const subscriptionId of group.subscriptionIds) {
      groupBySubscriptionId.set(subscriptionId, group.id);
    }
  }

  return items.map((item) => ({
    ...item,
    duplicateGroupId: groupBySubscriptionId.get(item.id) ?? null,
  }));
}

function buildCostTrend(
  items: SubscriptionRecord[],
  duplicateGroups: SubscriptionDuplicateGroup[],
): SubscriptionCostTrend {
  const activeItems = items.filter((item) => item.status !== 'ignored');
  const monthlyTotal = activeItems.reduce(
    (total, item) => total + item.monthlyCost,
    0,
  );
  const duplicateSavingsPotential = duplicateGroups.reduce(
    (total, group) => total + group.potentialMonthlySavings,
    0,
  );
  const optimizedMonthlyTotal = Math.max(
    0,
    monthlyTotal - duplicateSavingsPotential,
  );
  const changePercent =
    monthlyTotal > 0
      ? Math.round((duplicateSavingsPotential / monthlyTotal) * 100)
      : 0;

  let direction: SubscriptionCostTrend['direction'] = 'flat';
  if (duplicateSavingsPotential > monthlyTotal * 0.05) {
    direction = 'up';
  } else if (optimizedMonthlyTotal < monthlyTotal * 0.95) {
    direction = 'down';
  }

  return {
    monthlyTotal,
    annualizedTotal: monthlyTotal * 12,
    averageMonthlyCost:
      activeItems.length > 0 ? monthlyTotal / activeItems.length : 0,
    activeCount: activeItems.length,
    direction,
    changePercent,
    duplicateSavingsPotential,
  };
}

function buildUpcomingRenewals(
  items: SubscriptionRecord[],
): SubscriptionRenewal[] {
  return items
    .filter(
      (item) =>
        item.status !== 'ignored' &&
        item.daysUntilRenewal != null &&
        item.daysUntilRenewal >= 0 &&
        item.daysUntilRenewal <= 45,
    )
    .sort(
      (left, right) =>
        (left.daysUntilRenewal ?? 999) - (right.daysUntilRenewal ?? 999),
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      renewalDate: item.renewalDate,
      daysUntilRenewal: item.daysUntilRenewal ?? 0,
      monthlyCost: item.monthlyCost,
      currency: item.currency,
    }));
}

export function buildSubscriptionSummary(
  items: SubscriptionRecord[],
): SubscriptionSummary {
  const duplicateGroups = buildDuplicateGroups(items);
  const enrichedItems = attachDuplicateGroups(items, duplicateGroups);

  return {
    activeCount: enrichedItems.filter((item) => item.status !== 'ignored')
      .length,
    ignoredCount: enrichedItems.filter((item) => item.status === 'ignored')
      .length,
    monthlyTotal: enrichedItems
      .filter((item) => item.status !== 'ignored')
      .reduce((total, item) => total + item.monthlyCost, 0),
    upcomingRenewals: buildUpcomingRenewals(enrichedItems),
    duplicateGroups,
    costTrend: buildCostTrend(enrichedItems, duplicateGroups),
  };
}

export async function listSubscriptions(
  env: Env,
  userId: string,
  filters?: { workspaceId?: string | null; includeIgnored?: boolean },
): Promise<{
  subscriptions: SubscriptionRecord[];
  summary: SubscriptionSummary;
}> {
  const rows = await listRowsForUser(env, userId, filters?.workspaceId);
  let items = rows.map((row) => serializeSubscription(row));

  if (!filters?.includeIgnored) {
    items = items.filter((item) => item.status !== 'ignored');
  }

  const duplicateGroups = buildDuplicateGroups(items);
  const enrichedItems = attachDuplicateGroups(items, duplicateGroups);

  return {
    subscriptions: enrichedItems,
    summary: buildSubscriptionSummary(enrichedItems),
  };
}

export async function getSubscriptionForUser(
  env: Env,
  userId: string,
  subscriptionId: string,
): Promise<SubscriptionRecord | null> {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.id, subscriptionId),
        eq(subscriptions.userId, userId),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  const { subscriptions: allItems } = await listSubscriptions(env, userId, {
    includeIgnored: true,
  });
  const duplicateGroupId =
    allItems.find((item) => item.id === subscriptionId)?.duplicateGroupId ??
    null;

  return serializeSubscription(row, duplicateGroupId);
}

export async function ignoreSubscription(
  env: Env,
  userId: string,
  subscriptionId: string,
): Promise<SubscriptionRecord | null> {
  const existing = await getSubscriptionForUser(env, userId, subscriptionId);
  if (!existing) {
    return null;
  }

  const db = createDb(env.DB);
  await db
    .update(subscriptions)
    .set({ status: 'ignored' })
    .where(
      and(
        eq(subscriptions.id, subscriptionId),
        eq(subscriptions.userId, userId),
      ),
    );

  return getSubscriptionForUser(env, userId, subscriptionId);
}

export async function countWorkspaceSubscriptions(
  env: Env,
  userId: string,
  workspaceId: string,
): Promise<number> {
  const rows = await listRowsForUser(env, userId, workspaceId);
  return rows.filter((row) => row.status !== 'ignored').length;
}
