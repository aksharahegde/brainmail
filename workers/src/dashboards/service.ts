import { createDb } from '@brainmail/db';
import { dashboards } from '@brainmail/db/schema';
import { and, desc, eq } from 'drizzle-orm';

import { createId } from '../lib/crypto';
import { buildDashboardDefinition } from './refresh';
import {
  DASHBOARD_TEMPLATES,
  getDashboardTemplate,
  isDashboardTemplateKey,
  type DashboardDefinition,
  type DashboardRecord,
} from './types';

function serializeDashboard(
  row: typeof dashboards.$inferSelect,
): DashboardRecord {
  return {
    id: row.id,
    userId: row.userId,
    workspaceId: row.workspaceId,
    name: row.name,
    templateKey: row.templateKey,
    definition: (row.definition as DashboardDefinition | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    refreshedAt: row.refreshedAt,
  };
}

export function listDashboardTemplates() {
  return DASHBOARD_TEMPLATES;
}

export async function listDashboards(
  env: Env,
  userId: string,
  filters?: { workspaceId?: string | null },
): Promise<DashboardRecord[]> {
  const db = createDb(env.DB);
  const conditions = [eq(dashboards.userId, userId)];

  if (filters?.workspaceId) {
    conditions.push(eq(dashboards.workspaceId, filters.workspaceId));
  }

  const rows = await db
    .select()
    .from(dashboards)
    .where(and(...conditions))
    .orderBy(desc(dashboards.updatedAt), desc(dashboards.createdAt));

  return rows.map(serializeDashboard);
}

export async function getDashboardForUser(
  env: Env,
  userId: string,
  dashboardId: string,
): Promise<DashboardRecord | null> {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(dashboards)
    .where(and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId)))
    .limit(1);

  const row = rows[0];
  return row ? serializeDashboard(row) : null;
}

export async function createDashboard(
  env: Env,
  userId: string,
  input: {
    name: string;
    workspaceId?: string;
    templateKey?: string;
  },
): Promise<DashboardRecord> {
  const templateKey = input.templateKey ?? 'custom';
  const template = getDashboardTemplate(templateKey);
  const definition =
    templateKey !== 'custom' && isDashboardTemplateKey(templateKey)
      ? await buildDashboardDefinition(env, {
          userId,
          workspaceId: input.workspaceId ?? null,
          templateKey,
        })
      : {
          templateKey,
          blocks: [],
          refreshedAt: new Date().toISOString(),
        };

  const db = createDb(env.DB);
  const id = createId('dashboard');
  const now = new Date().toISOString();

  await db.insert(dashboards).values({
    id,
    userId,
    workspaceId: input.workspaceId ?? null,
    name: input.name || template?.name || 'Dashboard',
    templateKey,
    definition,
    updatedAt: now,
    refreshedAt: definition.refreshedAt ?? now,
  });

  const created = await getDashboardForUser(env, userId, id);
  if (!created) {
    throw new Error('Failed to create dashboard');
  }

  return created;
}

export async function updateDashboard(
  env: Env,
  userId: string,
  dashboardId: string,
  input: {
    name?: string;
    definition?: DashboardDefinition;
  },
): Promise<DashboardRecord | null> {
  const existing = await getDashboardForUser(env, userId, dashboardId);
  if (!existing) {
    return null;
  }

  const db = createDb(env.DB);
  await db
    .update(dashboards)
    .set({
      name: input.name ?? existing.name,
      definition: input.definition ?? existing.definition,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId)));

  return getDashboardForUser(env, userId, dashboardId);
}

export async function refreshDashboard(
  env: Env,
  userId: string,
  dashboardId: string,
): Promise<DashboardRecord | null> {
  const existing = await getDashboardForUser(env, userId, dashboardId);
  if (!existing) {
    return null;
  }

  const templateKey = existing.templateKey ?? 'custom';
  if (!isDashboardTemplateKey(templateKey) || templateKey === 'custom') {
    return existing;
  }

  const definition = await buildDashboardDefinition(env, {
    userId,
    workspaceId: existing.workspaceId,
    templateKey,
  });

  const db = createDb(env.DB);
  const now = new Date().toISOString();

  await db
    .update(dashboards)
    .set({
      definition,
      refreshedAt: definition.refreshedAt ?? now,
      updatedAt: now,
    })
    .where(and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId)));

  return getDashboardForUser(env, userId, dashboardId);
}

export async function deleteDashboard(
  env: Env,
  userId: string,
  dashboardId: string,
): Promise<boolean> {
  const existing = await getDashboardForUser(env, userId, dashboardId);
  if (!existing) {
    return false;
  }

  const db = createDb(env.DB);
  await db
    .delete(dashboards)
    .where(and(eq(dashboards.id, dashboardId), eq(dashboards.userId, userId)));

  return true;
}
