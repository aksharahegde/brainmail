const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type DashboardTemplate = {
  key: string;
  name: string;
  description: string;
};

export type DashboardBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

export type DashboardDefinition = {
  templateKey?: string;
  blocks: DashboardBlock[];
  refreshedAt?: string;
};

export type DashboardSummary = {
  id: string;
  name: string | null;
  workspaceId: string | null;
  templateKey: string | null;
  refreshedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DashboardDetail = DashboardSummary & {
  definition: DashboardDefinition | null;
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

export async function listDashboardTemplates(): Promise<{
  templates: DashboardTemplate[];
}> {
  const result = await apiFetch<{ templates: DashboardTemplate[] }>(
    '/dashboards/templates',
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load dashboard templates');
  }

  return result.data;
}

export async function listDashboards(input?: {
  workspaceId?: string;
}): Promise<{ dashboards: DashboardSummary[] }> {
  const params = new URLSearchParams();
  if (input?.workspaceId) {
    params.set('workspaceId', input.workspaceId);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const result = await apiFetch<{ dashboards: DashboardSummary[] }>(
    `/dashboards${suffix}`,
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load dashboards');
  }

  return result.data;
}

export async function getDashboard(
  dashboardId: string,
): Promise<{ dashboard: DashboardDetail }> {
  const result = await apiFetch<{ dashboard: DashboardDetail }>(
    `/dashboards/${dashboardId}`,
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load dashboard');
  }

  return result.data;
}

export async function createDashboard(input: {
  name?: string;
  workspaceId?: string;
  templateKey: string;
}): Promise<{ dashboard: DashboardDetail }> {
  const result = await apiFetch<{ dashboard: DashboardDetail }>('/dashboards', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to create dashboard');
  }

  return result.data;
}

export async function refreshDashboard(
  dashboardId: string,
): Promise<{ dashboard: DashboardDetail }> {
  const result = await apiFetch<{ dashboard: DashboardDetail }>(
    `/dashboards/${dashboardId}/refresh`,
    { method: 'POST' },
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to refresh dashboard');
  }

  return result.data;
}

export async function deleteDashboard(
  dashboardId: string,
): Promise<{ deleted: boolean }> {
  const result = await apiFetch<{ deleted: boolean }>(
    `/dashboards/${dashboardId}`,
    { method: 'DELETE' },
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to delete dashboard');
  }

  return result.data;
}
