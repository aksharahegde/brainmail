import { createDb } from '@brainmail/db';
import { opsEvents } from '@brainmail/db/schema';
import { and, desc, eq, gte, sql } from 'drizzle-orm';

import { buildHealthPayload } from '../lib/health';
import { APP_VERSION } from '../lib/version';

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export async function getOpsStatus(env: Env) {
  const health = await buildHealthPayload(env);

  return {
    version: APP_VERSION,
    environment: env.ENVIRONMENT ?? 'local',
    releasedAt: '2026-06-14',
    health,
    monitoring: {
      healthEndpoint: '/health',
      opsEndpoint: '/api/v1/ops/status',
      observabilityEnabled: true,
    },
    backup: {
      strategy: 'wrangler d1 export before production migrations',
      script: 'pnpm db:backup:production',
      retention: '30 days recommended',
    },
  };
}

export async function getOpsMetrics(env: Env, userId: string) {
  const db = createDb(env.DB);
  const since24h = hoursAgoIso(24);
  const since7d = hoursAgoIso(24 * 7);

  const [recentEvents, errorRows, timingRows, aiCostRows, analyticsRows] =
    await Promise.all([
      db
        .select()
        .from(opsEvents)
        .where(gte(opsEvents.createdAt, since24h))
        .orderBy(desc(opsEvents.createdAt))
        .limit(20),
      db
        .select({ count: sql<number>`count(*)` })
        .from(opsEvents)
        .where(
          and(
            eq(opsEvents.eventType, 'error'),
            gte(opsEvents.createdAt, since24h),
          ),
        ),
      db
        .select({ payload: opsEvents.payload })
        .from(opsEvents)
        .where(
          and(
            eq(opsEvents.eventType, 'request_timing'),
            gte(opsEvents.createdAt, since24h),
          ),
        ),
      db
        .select({ payload: opsEvents.payload })
        .from(opsEvents)
        .where(
          and(
            eq(opsEvents.eventType, 'ai_cost'),
            gte(opsEvents.createdAt, since7d),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(opsEvents)
        .where(
          and(
            eq(opsEvents.eventType, 'analytics'),
            gte(opsEvents.createdAt, since24h),
            eq(opsEvents.userId, userId),
          ),
        ),
    ]);

  const durations = timingRows
    .map((row) => Number(row.payload?.durationMs ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  const avgResponseMs =
    durations.length > 0
      ? Math.round(
          durations.reduce((sum, value) => sum + value, 0) / durations.length,
        )
      : 0;

  const aiCostUsd7d = aiCostRows.reduce((sum, row) => {
    const value = Number(row.payload?.estimatedCostUsd ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  return {
    window: {
      metrics24h: since24h,
      cost7d: since7d,
    },
    requests: {
      count24h: durations.length,
      avgResponseMs,
      p95ResponseMs: percentile(durations, 0.95),
    },
    reliability: {
      errors24h: errorRows[0]?.count ?? 0,
    },
    cost: {
      aiUsd7d: Number(aiCostUsd7d.toFixed(4)),
    },
    analytics: {
      events24h: analyticsRows[0]?.count ?? 0,
    },
    recentEvents: recentEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      severity: event.severity,
      source: event.source,
      payload: event.payload,
      createdAt: event.createdAt,
    })),
  };
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );
  return sorted[index] ?? 0;
}
