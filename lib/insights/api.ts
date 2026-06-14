const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type InsightSummary = {
  id: string;
  workspaceId: string | null;
  insightType: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type BriefingBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
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

export async function listInsights(input?: {
  workspaceId?: string;
}): Promise<{ insights: InsightSummary[] }> {
  const params = new URLSearchParams();
  if (input?.workspaceId) {
    params.set('workspaceId', input.workspaceId);
  }

  const query = params.toString();
  const result = await apiFetch<{ insights: InsightSummary[] }>(
    `/insights${query ? `?${query}` : ''}`,
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load insights');
  }

  return result.data;
}

export async function getDailyBriefing(input: {
  workspaceId: string;
  refresh?: boolean;
}): Promise<{
  blocks: BriefingBlock[];
  refreshedAt: string | null;
  workspaceId: string;
}> {
  const params = new URLSearchParams({ workspaceId: input.workspaceId });
  if (input.refresh) {
    params.set('refresh', 'true');
  }

  const result = await apiFetch<{
    blocks: BriefingBlock[];
    refreshedAt: string | null;
    workspaceId: string;
  }>(`/briefing?${params.toString()}`);

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load daily briefing');
  }

  return result.data;
}

export async function generateInsights(input: {
  workspaceId: string;
}): Promise<{ insights: InsightSummary[] }> {
  const result = await apiFetch<{ insights: InsightSummary[] }>('/insights', {
    method: 'POST',
    body: JSON.stringify({ workspaceId: input.workspaceId }),
  });

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to generate insights');
  }

  return result.data;
}
