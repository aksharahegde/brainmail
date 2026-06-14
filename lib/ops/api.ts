const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type OpsStatus = {
  version: string;
  environment: string;
  releasedAt: string;
  health: {
    ok: boolean;
    service: string;
    environment: string;
    bindings: Array<{ name: string; present: boolean }>;
    database: {
      ready: boolean;
      tableCount: number;
      seeded: boolean;
    };
    timestamp: string;
  };
  monitoring: {
    healthEndpoint: string;
    opsEndpoint: string;
    observabilityEnabled: boolean;
  };
  backup: {
    strategy: string;
    script: string;
    retention: string;
  };
};

export type OpsMetrics = {
  window: {
    metrics24h: string;
    cost7d: string;
  };
  requests: {
    count24h: number;
    avgResponseMs: number;
    p95ResponseMs: number;
  };
  reliability: {
    errors24h: number;
  };
  cost: {
    aiUsd7d: number;
  };
  analytics: {
    events24h: number;
  };
  recentEvents: Array<{
    id: string;
    eventType: string | null;
    severity: string | null;
    source: string | null;
    payload: Record<string, unknown> | null;
    createdAt: string | null;
  }>;
};

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  return (await response.json()) as ApiResponse<T>;
}

export async function getOpsStatus(): Promise<{ status: OpsStatus }> {
  const result = await apiFetch<{ status: OpsStatus }>('/ops/status');

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load system status');
  }

  return result.data;
}

export async function getOpsMetrics(): Promise<{ metrics: OpsMetrics }> {
  const result = await apiFetch<{ metrics: OpsMetrics }>('/ops/metrics');

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load system metrics');
  }

  return result.data;
}
