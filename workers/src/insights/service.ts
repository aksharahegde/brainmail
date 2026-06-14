import { createDb } from '@brainmail/db';
import { insights, users } from '@brainmail/db/schema';
import { and, desc, eq } from 'drizzle-orm';

import { createId } from '../lib/crypto';
import { listWorkspaces } from '../workspaces/service';
import { generateInsightPayload } from './generate';
import {
  INSIGHT_TYPE_KEYS,
  type InsightRecord,
  type InsightTypeKey,
} from './types';

export type BriefingBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

function serializeInsight(row: typeof insights.$inferSelect): InsightRecord {
  return {
    id: row.id,
    userId: row.userId,
    workspaceId: row.workspaceId,
    insightType: row.insightType,
    payload: (row.payload as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isStale(updatedAt: string | null, maxAgeHours = 24): boolean {
  if (!updatedAt) {
    return true;
  }

  const ageMs = Date.now() - Date.parse(updatedAt);
  return ageMs > maxAgeHours * 60 * 60 * 1000;
}

function insightToBriefingBlock(insight: InsightRecord): BriefingBlock | null {
  const payload = insight.payload ?? {};

  switch (insight.insightType) {
    case 'daily_briefing':
      return {
        id: insight.id,
        type: 'daily_briefing',
        data: payload,
      };
    case 'inbox_health':
      return {
        id: insight.id,
        type: 'inbox_health',
        data: payload,
      };
    case 'vendor_insight':
      return {
        id: insight.id,
        type: 'vendor_profile',
        data: payload,
      };
    case 'cost_anomaly':
    case 'crm_insight':
    case 'travel_insight':
      return {
        id: insight.id,
        type: 'insight_card',
        data: {
          insightType: insight.insightType,
          title: payload.title,
          payload,
        },
      };
    default:
      return null;
  }
}

export function buildBriefingBlocks(items: InsightRecord[]): BriefingBlock[] {
  const order: InsightTypeKey[] = [
    'daily_briefing',
    'inbox_health',
    'cost_anomaly',
    'vendor_insight',
    'crm_insight',
    'travel_insight',
  ];

  const byType = new Map(
    items
      .filter((item) => item.insightType)
      .map((item) => [item.insightType as string, item]),
  );

  return order
    .map((type) => {
      const insight = byType.get(type);
      return insight ? insightToBriefingBlock(insight) : null;
    })
    .filter((block): block is BriefingBlock => block !== null);
}

export async function listInsights(
  env: Env,
  userId: string,
  filters?: { workspaceId?: string | null },
): Promise<InsightRecord[]> {
  const db = createDb(env.DB);
  const conditions = [eq(insights.userId, userId)];

  if (filters?.workspaceId) {
    conditions.push(eq(insights.workspaceId, filters.workspaceId));
  }

  const rows = await db
    .select()
    .from(insights)
    .where(and(...conditions))
    .orderBy(desc(insights.updatedAt), desc(insights.createdAt));

  return rows.map(serializeInsight);
}

async function upsertInsight(
  env: Env,
  userId: string,
  workspaceId: string,
  insightType: InsightTypeKey,
  payload: Record<string, unknown>,
): Promise<InsightRecord> {
  const db = createDb(env.DB);
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(insights)
    .where(
      and(
        eq(insights.userId, userId),
        eq(insights.workspaceId, workspaceId),
        eq(insights.insightType, insightType),
      ),
    )
    .limit(1);

  const current = existing[0];
  if (current) {
    await db
      .update(insights)
      .set({
        payload,
        updatedAt: now,
      })
      .where(eq(insights.id, current.id));

    return {
      id: current.id,
      userId: current.userId,
      workspaceId: current.workspaceId,
      insightType: current.insightType,
      payload,
      createdAt: current.createdAt,
      updatedAt: now,
    };
  }

  const id = createId('insight');
  await db.insert(insights).values({
    id,
    userId,
    workspaceId,
    insightType,
    payload,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    userId,
    workspaceId,
    insightType,
    payload,
    createdAt: now,
    updatedAt: now,
  };
}

export async function generateWorkspaceInsights(
  env: Env,
  userId: string,
  workspaceId: string,
): Promise<InsightRecord[]> {
  const generated: InsightRecord[] = [];

  for (const insightType of INSIGHT_TYPE_KEYS) {
    const payload = await generateInsightPayload(
      env,
      userId,
      workspaceId,
      insightType,
    );
    const saved = await upsertInsight(
      env,
      userId,
      workspaceId,
      insightType,
      payload,
    );
    generated.push(saved);
  }

  return generated;
}

export async function getDailyBriefing(
  env: Env,
  userId: string,
  workspaceId: string,
  options?: { forceRefresh?: boolean },
): Promise<{ blocks: BriefingBlock[]; refreshedAt: string | null }> {
  let items = await listInsights(env, userId, { workspaceId });

  const shouldRefresh =
    options?.forceRefresh ||
    items.length === 0 ||
    items.some((item) => isStale(item.updatedAt));

  if (shouldRefresh) {
    items = await generateWorkspaceInsights(env, userId, workspaceId);
  }

  const refreshedAt =
    items.reduce<string | null>((latest, item) => {
      if (!item.updatedAt) {
        return latest;
      }
      if (!latest || item.updatedAt > latest) {
        return item.updatedAt;
      }
      return latest;
    }, null) ?? new Date().toISOString();

  return {
    blocks: buildBriefingBlocks(items),
    refreshedAt,
  };
}

export async function runScheduledInsightGeneration(env: Env): Promise<number> {
  const db = createDb(env.DB);
  const userRows = await db.select({ id: users.id }).from(users);

  let workspaceCount = 0;

  for (const user of userRows) {
    const workspaceList = await listWorkspaces(env, user.id);
    for (const workspace of workspaceList) {
      await generateWorkspaceInsights(env, user.id, workspace.id);
      workspaceCount += 1;
    }
  }

  return workspaceCount;
}
