import { createDb } from '@brainmail/db';
import { reports } from '@brainmail/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { createId } from '../lib/crypto';
import { buildReportDefinition } from './generate';
import {
  getReportTypeDefinition,
  isReportTypeKey,
  REPORT_TYPES,
  type ReportDefinition,
  type ReportRecord,
} from './types';

function serializeReport(row: typeof reports.$inferSelect): ReportRecord {
  return {
    id: row.id,
    userId: row.userId,
    workspaceId: row.workspaceId,
    name: row.name,
    reportType: row.reportType,
    schedule: row.schedule,
    definition: (row.definition as ReportDefinition | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    refreshedAt: row.refreshedAt,
  };
}

export function listReportTypes() {
  return REPORT_TYPES;
}

export async function listReports(
  env: Env,
  userId: string,
  filters?: { workspaceId?: string | null },
): Promise<ReportRecord[]> {
  const db = createDb(env.DB);
  const conditions = [eq(reports.userId, userId)];

  if (filters?.workspaceId) {
    conditions.push(eq(reports.workspaceId, filters.workspaceId));
  }

  const rows = await db
    .select()
    .from(reports)
    .where(and(...conditions))
    .orderBy(desc(reports.updatedAt), desc(reports.createdAt));

  return rows.map(serializeReport);
}

export async function getReportForUser(
  env: Env,
  userId: string,
  reportId: string,
): Promise<ReportRecord | null> {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, reportId), eq(reports.userId, userId)))
    .limit(1);

  const row = rows[0];
  return row ? serializeReport(row) : null;
}

export async function generateReport(
  env: Env,
  userId: string,
  input: {
    reportType: string;
    workspaceId?: string;
  },
): Promise<ReportRecord> {
  if (!isReportTypeKey(input.reportType)) {
    throw new Error('Invalid report type');
  }

  const typeDefinition = getReportTypeDefinition(input.reportType)!;
  const workspaceId =
    input.workspaceId ?? typeDefinition.defaultWorkspaceId ?? null;

  const definition = await buildReportDefinition(env, {
    userId,
    workspaceId,
    reportType: input.reportType,
  });

  const db = createDb(env.DB);
  const id = createId('report');
  const now = new Date().toISOString();

  await db.insert(reports).values({
    id,
    userId,
    workspaceId,
    name: typeDefinition.name,
    reportType: input.reportType,
    schedule: typeDefinition.schedule,
    definition,
    updatedAt: now,
    refreshedAt: definition.refreshedAt ?? now,
  });

  const created = await getReportForUser(env, userId, id);
  if (!created) {
    throw new Error('Failed to generate report');
  }

  return created;
}

export async function refreshReport(
  env: Env,
  userId: string,
  reportId: string,
): Promise<ReportRecord | null> {
  const existing = await getReportForUser(env, userId, reportId);
  if (
    !existing ||
    !existing.reportType ||
    !isReportTypeKey(existing.reportType)
  ) {
    return null;
  }

  const definition = await buildReportDefinition(env, {
    userId,
    workspaceId: existing.workspaceId,
    reportType: existing.reportType,
  });

  const db = createDb(env.DB);
  const now = new Date().toISOString();

  await db
    .update(reports)
    .set({
      definition,
      refreshedAt: definition.refreshedAt ?? now,
      updatedAt: now,
    })
    .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));

  return getReportForUser(env, userId, reportId);
}

export async function deleteReport(
  env: Env,
  userId: string,
  reportId: string,
): Promise<boolean> {
  const existing = await getReportForUser(env, userId, reportId);
  if (!existing) {
    return false;
  }

  const db = createDb(env.DB);
  await db
    .delete(reports)
    .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));

  return true;
}

function isDueForRefresh(
  schedule: string | null,
  refreshedAt: string | null,
): boolean {
  if (!schedule || schedule === 'manual') {
    return false;
  }

  const refreshedMs = refreshedAt ? Date.parse(refreshedAt) : 0;
  const now = Date.now();
  const daysSinceRefresh = (now - refreshedMs) / (1000 * 60 * 60 * 24);

  if (schedule === 'weekly') {
    return daysSinceRefresh >= 7;
  }

  if (schedule === 'monthly') {
    return daysSinceRefresh >= 28;
  }

  return false;
}

export async function runScheduledReportRefresh(env: Env): Promise<number> {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(reports)
    .where(inArray(reports.schedule, ['weekly', 'monthly']));

  let refreshedCount = 0;

  for (const row of rows) {
    if (!isDueForRefresh(row.schedule, row.refreshedAt)) {
      continue;
    }

    const refreshed = await refreshReport(env, row.userId, row.id);
    if (refreshed) {
      refreshedCount += 1;
    }
  }

  return refreshedCount;
}
