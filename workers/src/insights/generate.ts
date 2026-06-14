import { createDb } from '@brainmail/db';
import { emails, entities } from '@brainmail/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { getWorkspaceEmailCategories } from '../workspaces/context';
import type { InsightTypeKey } from './types';

type EntityRow = {
  id: string;
  entityType: string | null;
  data: Record<string, unknown> | null;
};

type EmailRow = {
  id: string;
  subject: string | null;
  sender: string | null;
  category: string | null;
  receivedAt: string | null;
  processingStatus: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function todayLabel(): string {
  return new Date().toISOString().slice(0, 10);
}

async function listWorkspaceEmails(
  env: Env,
  userId: string,
  workspaceId: string,
): Promise<EmailRow[]> {
  const db = createDb(env.DB);
  const filters = [eq(emails.userId, userId)];
  const categories = getWorkspaceEmailCategories(workspaceId);

  if (categories.length > 0) {
    filters.push(inArray(emails.category, categories));
  }

  const rows = await db
    .select({
      id: emails.id,
      subject: emails.subject,
      sender: emails.sender,
      category: emails.category,
      receivedAt: emails.receivedAt,
      processingStatus: emails.processingStatus,
    })
    .from(emails)
    .where(and(...filters))
    .orderBy(desc(emails.receivedAt))
    .limit(200);

  return rows;
}

async function listWorkspaceEntities(
  env: Env,
  userId: string,
  workspaceId: string,
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
    .where(eq(entities.userId, userId));

  const categories = getWorkspaceEmailCategories(workspaceId);
  if (categories.length === 0) {
    return rows.map((row) => ({
      id: row.id,
      entityType: row.entityType,
      data: (row.data as Record<string, unknown> | null) ?? null,
    }));
  }

  const emailRows = await db
    .select({ id: emails.id })
    .from(emails)
    .where(
      and(eq(emails.userId, userId), inArray(emails.category, categories)),
    );

  const emailIds = new Set(emailRows.map((row) => row.id));

  return rows
    .filter((row) => row.sourceId && emailIds.has(row.sourceId))
    .map((row) => ({
      id: row.id,
      entityType: row.entityType,
      data: (row.data as Record<string, unknown> | null) ?? null,
    }));
}

function buildInboxHealthScore(emails: EmailRow[]): {
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  const failed = emails.filter((email) => email.processingStatus === 'failed');
  const uncategorized = emails.filter((email) => !email.category);
  const recent = emails.filter(
    (email) => email.receivedAt && email.receivedAt >= daysAgo(7),
  );

  if (failed.length > 0) {
    issues.push(`${failed.length} emails failed processing`);
  }
  if (uncategorized.length > 5) {
    issues.push(`${uncategorized.length} emails need categorization`);
  }
  if (recent.length > 80) {
    issues.push('High inbox volume this week');
  }

  let score = 100;
  score -= failed.length * 8;
  score -= Math.min(uncategorized.length, 10) * 2;
  score -= recent.length > 80 ? 10 : 0;

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
  };
}

function buildVendorSpend(
  entities: EntityRow[],
): Map<string, { spend: number; invoices: number; currency: string }> {
  const vendors = new Map<
    string,
    { spend: number; invoices: number; currency: string }
  >();

  for (const entity of entities) {
    if (
      entity.entityType !== 'invoice' &&
      entity.entityType !== 'subscription' &&
      entity.entityType !== 'receipt'
    ) {
      continue;
    }

    const data = asRecord(entity.data);
    const vendor =
      asString(data.vendor) ||
      asString(data.merchant) ||
      asString(data.company) ||
      'Unknown vendor';
    const amount = asNumber(data.amount ?? data.total ?? data.price);
    const currency = asString(data.currency, 'USD');
    const current = vendors.get(vendor) ?? {
      spend: 0,
      invoices: 0,
      currency,
    };

    vendors.set(vendor, {
      spend: current.spend + amount,
      invoices: current.invoices + 1,
      currency: current.currency || currency,
    });
  }

  return vendors;
}

export function buildDailyBriefingPayload(input: {
  emails: EmailRow[];
  entities: EntityRow[];
  workspaceId: string;
}): Record<string, unknown> {
  const { emails, entities, workspaceId } = input;
  const recentEmails = emails.filter(
    (email) => email.receivedAt && email.receivedAt >= daysAgo(1),
  );
  const { score, issues } = buildInboxHealthScore(emails);
  const vendors = buildVendorSpend(entities);
  const topVendor = [...vendors.entries()].sort(
    (left, right) => right[1].spend - left[1].spend,
  )[0];

  const highlights = [
    `${recentEmails.length} new emails in the last 24 hours`,
    `Inbox health score: ${score}/100`,
  ];

  if (topVendor) {
    highlights.push(
      `Top vendor spend: ${topVendor[0]} (${topVendor[1].currency} ${topVendor[1].spend.toFixed(2)})`,
    );
  }

  const priorities = issues.length > 0 ? issues : ['No urgent inbox issues'];

  return {
    title: 'Daily briefing',
    date: todayLabel(),
    workspaceId,
    highlights,
    priorities,
    summary: `${recentEmails.length} new emails · health ${score}/100`,
  };
}

export function buildInboxHealthPayload(
  emails: EmailRow[],
): Record<string, unknown> {
  const { score, issues } = buildInboxHealthScore(emails);
  const failed = emails.filter((email) => email.processingStatus === 'failed');
  const uncategorized = emails.filter((email) => !email.category);

  return {
    title: 'Inbox health',
    score,
    issues: issues.map((label) => ({
      label,
      severity: label.includes('failed') ? 'high' : 'medium',
    })),
    message:
      issues.length > 0
        ? issues.join('. ')
        : 'Inbox is in good shape with no major issues.',
    failedCount: failed.length,
    uncategorizedCount: uncategorized.length,
    totalEmails: emails.length,
  };
}

export function buildCostAnomalyPayload(
  entities: EntityRow[],
): Record<string, unknown> {
  const recentCutoff = daysAgo(7);
  const baselineCutoff = daysAgo(37);
  const vendorRecent = new Map<string, number>();
  const vendorBaseline = new Map<string, number>();

  for (const entity of entities) {
    if (
      entity.entityType !== 'invoice' &&
      entity.entityType !== 'subscription' &&
      entity.entityType !== 'receipt'
    ) {
      continue;
    }

    const data = asRecord(entity.data);
    const vendor =
      asString(data.vendor) ||
      asString(data.merchant) ||
      asString(data.company);
    const amount = asNumber(data.amount ?? data.total ?? data.price);
    const occurredAt = asString(data.date ?? data.occurredAt ?? data.dueDate);

    if (!vendor || amount <= 0) {
      continue;
    }

    if (occurredAt >= recentCutoff) {
      vendorRecent.set(vendor, (vendorRecent.get(vendor) ?? 0) + amount);
    } else if (occurredAt >= baselineCutoff) {
      vendorBaseline.set(vendor, (vendorBaseline.get(vendor) ?? 0) + amount);
    }
  }

  let topAnomaly: {
    vendor: string;
    deltaPercent: number;
    recentSpend: number;
    baselineSpend: number;
  } | null = null;

  for (const [vendor, recentSpend] of vendorRecent.entries()) {
    const baselineSpend = (vendorBaseline.get(vendor) ?? 0) / 4;
    if (baselineSpend <= 0 || recentSpend <= baselineSpend * 1.35) {
      continue;
    }

    const deltaPercent = Math.round(
      ((recentSpend - baselineSpend) / baselineSpend) * 100,
    );

    if (!topAnomaly || deltaPercent > topAnomaly.deltaPercent) {
      topAnomaly = { vendor, deltaPercent, recentSpend, baselineSpend };
    }
  }

  if (!topAnomaly) {
    return {
      title: 'Cost anomalies',
      message: 'No unusual spend patterns detected in the last 7 days.',
      anomalies: [],
    };
  }

  return {
    title: 'Cost anomaly',
    message: `${topAnomaly.vendor} spend is up ${topAnomaly.deltaPercent}% vs the 30-day average.`,
    vendor: topAnomaly.vendor,
    deltaPercent: topAnomaly.deltaPercent,
    recentSpend: topAnomaly.recentSpend,
    baselineSpend: topAnomaly.baselineSpend,
    anomalies: [topAnomaly],
  };
}

export function buildVendorInsightPayload(
  entities: EntityRow[],
): Record<string, unknown> {
  const vendors = buildVendorSpend(entities);
  const ranked = [...vendors.entries()].sort(
    (left, right) => right[1].spend - left[1].spend,
  );
  const top = ranked[0];

  if (!top) {
    return {
      title: 'Vendor insights',
      message: 'No vendor spend data available yet.',
      name: 'No vendors',
      spend: 0,
      currency: 'USD',
      invoiceCount: 0,
      trend: 'flat',
      recentInvoices: [],
    };
  }

  const recentInvoices = entities
    .filter(
      (entity) =>
        entity.entityType === 'invoice' ||
        entity.entityType === 'subscription' ||
        entity.entityType === 'receipt',
    )
    .slice(0, 5)
    .map((entity) => {
      const data = asRecord(entity.data);
      return {
        invoiceNumber: asString(data.invoiceNumber ?? data.number),
        amount: asNumber(data.amount ?? data.total ?? data.price),
        currency: asString(data.currency, 'USD'),
      };
    });

  return {
    title: 'Top vendor',
    message: `${top[0]} accounts for the highest spend in this workspace.`,
    name: top[0],
    spend: top[1].spend,
    currency: top[1].currency,
    invoiceCount: top[1].invoices,
    trend:
      ranked.length > 1 && top[1].spend > ranked[1][1].spend * 1.2
        ? 'up'
        : 'flat',
    recentInvoices,
  };
}

export function buildCrmInsightPayload(
  entities: EntityRow[],
): Record<string, unknown> {
  const people = entities.filter(
    (entity) =>
      entity.entityType === 'person' || entity.entityType === 'company',
  );

  const contacts = people.slice(0, 5).map((entity) => {
    const data = asRecord(entity.data);
    return {
      name:
        asString(data.name) ||
        asString(data.company) ||
        asString(data.email) ||
        'Unknown contact',
      company: asString(data.company),
      email: asString(data.email),
      role: asString(data.role ?? data.title),
    };
  });

  return {
    title: 'CRM insights',
    message:
      contacts.length > 0
        ? `${contacts.length} key contacts surfaced from recent email entities.`
        : 'No CRM entities extracted yet.',
    contactCount: people.length,
    contacts,
  };
}

export function buildTravelInsightPayload(
  entities: EntityRow[],
): Record<string, unknown> {
  const flights = entities.filter((entity) => entity.entityType === 'flight');
  const hotels = entities.filter((entity) => entity.entityType === 'hotel');
  const trips = [...flights, ...hotels].slice(0, 5).map((entity) => {
    const data = asRecord(entity.data);
    return {
      type: entity.entityType,
      destination:
        asString(data.destination) ||
        asString(data.city) ||
        asString(data.location),
      date: asString(data.date ?? data.departureDate ?? data.checkIn),
      carrier: asString(data.airline ?? data.hotel ?? data.vendor),
    };
  });

  return {
    title: 'Travel insights',
    message:
      trips.length > 0
        ? `${flights.length} flights and ${hotels.length} hotel stays tracked.`
        : 'No travel entities found in this workspace.',
    flightCount: flights.length,
    hotelCount: hotels.length,
    trips,
  };
}

export async function generateInsightPayload(
  env: Env,
  userId: string,
  workspaceId: string,
  insightType: InsightTypeKey,
): Promise<Record<string, unknown>> {
  const [emailRows, entityRows] = await Promise.all([
    listWorkspaceEmails(env, userId, workspaceId),
    listWorkspaceEntities(env, userId, workspaceId),
  ]);

  switch (insightType) {
    case 'daily_briefing':
      return buildDailyBriefingPayload({
        emails: emailRows,
        entities: entityRows,
        workspaceId,
      });
    case 'inbox_health':
      return buildInboxHealthPayload(emailRows);
    case 'cost_anomaly':
      return buildCostAnomalyPayload(entityRows);
    case 'vendor_insight':
      return buildVendorInsightPayload(entityRows);
    case 'crm_insight':
      return buildCrmInsightPayload(entityRows);
    case 'travel_insight':
      return buildTravelInsightPayload(entityRows);
    default:
      return { title: insightType, message: 'Insight generated.' };
  }
}
