const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type ReportTypeDefinition = {
  key: string;
  name: string;
  description: string;
  schedule: string;
  defaultWorkspaceId: string | null;
};

export type ReportBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

export type ReportDefinition = {
  reportType: string;
  blocks: ReportBlock[];
  refreshedAt?: string;
  periodLabel?: string;
};

export type ReportSummary = {
  id: string;
  name: string | null;
  workspaceId: string | null;
  reportType: string | null;
  schedule: string | null;
  refreshedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ReportDetail = ReportSummary & {
  definition: ReportDefinition | null;
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

export async function listReportTypes(): Promise<{
  types: ReportTypeDefinition[];
}> {
  const result = await apiFetch<{ types: ReportTypeDefinition[] }>(
    '/reports/types',
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load report types');
  }

  return result.data;
}

export async function listReports(input?: {
  workspaceId?: string;
}): Promise<{ reports: ReportSummary[] }> {
  const params = new URLSearchParams();
  if (input?.workspaceId) {
    params.set('workspaceId', input.workspaceId);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const result = await apiFetch<{ reports: ReportSummary[] }>(
    `/reports${suffix}`,
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load reports');
  }

  return result.data;
}

export async function getReport(
  reportId: string,
): Promise<{ report: ReportDetail }> {
  const result = await apiFetch<{ report: ReportDetail }>(
    `/reports/${reportId}`,
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load report');
  }

  return result.data;
}

export async function generateReport(input: {
  type: string;
  workspaceId?: string;
}): Promise<{ report: ReportDetail }> {
  const result = await apiFetch<{ report: ReportDetail }>('/reports', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to generate report');
  }

  return result.data;
}

export async function refreshReport(
  reportId: string,
): Promise<{ report: ReportDetail }> {
  const result = await apiFetch<{ report: ReportDetail }>(
    `/reports/${reportId}/refresh`,
    { method: 'POST' },
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to refresh report');
  }

  return result.data;
}

export async function deleteReport(
  reportId: string,
): Promise<{ deleted: boolean }> {
  const result = await apiFetch<{ deleted: boolean }>(`/reports/${reportId}`, {
    method: 'DELETE',
  });

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to delete report');
  }

  return result.data;
}
