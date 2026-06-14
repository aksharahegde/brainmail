import { createDb } from '@brainmail/db';
import { opsEvents } from '@brainmail/db/schema';

import { createId } from '../lib/crypto';

export type OpsEventType =
  | 'error'
  | 'request_timing'
  | 'ai_cost'
  | 'analytics'
  | 'queue_failure';

export type OpsSeverity = 'info' | 'warning' | 'error';

const AI_COST_PER_1K_TOKENS_USD = 0.0002;

export function estimateAiCostUsd(input: {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}): number {
  const tokens = (input.inputTokens ?? 0) + (input.outputTokens ?? 0);
  if (tokens <= 0) {
    return 0.0001;
  }

  return Number(((tokens / 1000) * AI_COST_PER_1K_TOKENS_USD).toFixed(6));
}

export async function recordOpsEvent(
  env: Env,
  input: {
    eventType: OpsEventType;
    severity?: OpsSeverity;
    source?: string;
    userId?: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  const db = createDb(env.DB);

  await db.insert(opsEvents).values({
    id: createId('ops'),
    eventType: input.eventType,
    severity: input.severity ?? 'info',
    source: input.source ?? null,
    userId: input.userId ?? null,
    payload: input.payload ?? {},
    createdAt: new Date().toISOString(),
  });
}

export async function recordRequestTiming(
  env: Env,
  input: {
    pathname: string;
    method: string;
    status: number;
    durationMs: number;
    userId?: string;
  },
): Promise<void> {
  await recordOpsEvent(env, {
    eventType: 'request_timing',
    severity: 'info',
    source: 'api',
    userId: input.userId,
    payload: {
      pathname: input.pathname,
      method: input.method,
      status: input.status,
      durationMs: input.durationMs,
    },
  });
}

export async function recordErrorEvent(
  env: Env,
  input: {
    source: string;
    message: string;
    userId?: string;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  await recordOpsEvent(env, {
    eventType: 'error',
    severity: 'error',
    source: input.source,
    userId: input.userId,
    payload: {
      message: input.message,
      ...input.details,
    },
  });
}

export async function recordAiCostEvent(
  env: Env,
  input: {
    model: string;
    source: string;
    userId?: string;
    inputTokens?: number;
    outputTokens?: number;
  },
): Promise<void> {
  const estimatedCostUsd = estimateAiCostUsd(input);

  await recordOpsEvent(env, {
    eventType: 'ai_cost',
    severity: 'info',
    source: input.source,
    userId: input.userId,
    payload: {
      model: input.model,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      estimatedCostUsd,
    },
  });
}

export async function recordAnalyticsEvent(
  env: Env,
  input: {
    name: string;
    userId?: string;
    properties?: Record<string, unknown>;
  },
): Promise<void> {
  await recordOpsEvent(env, {
    eventType: 'analytics',
    severity: 'info',
    source: 'product',
    userId: input.userId,
    payload: {
      name: input.name,
      ...input.properties,
    },
  });
}
