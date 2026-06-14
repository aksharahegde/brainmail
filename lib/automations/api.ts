const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type AutomationTemplate = {
  key: string;
  name: string;
  description: string;
  defaultWorkspaceId: string | null;
  schedule: string;
  definition: Record<string, unknown>;
};

export type AutomationSummary = {
  id: string;
  name: string | null;
  workspaceId: string | null;
  schedule: string | null;
  enabled: boolean | null;
  definition: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AutomationRun = {
  id: string;
  automationId: string | null;
  status: string | null;
  executionLog: Record<string, unknown> | null;
  executedAt: string | null;
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

export async function listAutomationTemplates(): Promise<{
  templates: AutomationTemplate[];
}> {
  const result = await apiFetch<{ templates: AutomationTemplate[] }>(
    '/automations/templates',
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load automation templates');
  }

  return result.data;
}

export async function listAutomations(input?: {
  workspaceId?: string;
}): Promise<{ automations: AutomationSummary[] }> {
  const params = new URLSearchParams();
  if (input?.workspaceId) {
    params.set('workspaceId', input.workspaceId);
  }

  const query = params.toString();
  const result = await apiFetch<{ automations: AutomationSummary[] }>(
    `/automations${query ? `?${query}` : ''}`,
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load automations');
  }

  return result.data;
}

export async function createAutomation(input: {
  templateKey: string;
  workspaceId?: string;
  name?: string;
}): Promise<{ automation: AutomationSummary }> {
  const result = await apiFetch<{ automation: AutomationSummary }>(
    '/automations',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to create automation');
  }

  return result.data;
}

export async function updateAutomation(
  automationId: string,
  input: { enabled?: boolean; name?: string },
): Promise<{ automation: AutomationSummary }> {
  const result = await apiFetch<{ automation: AutomationSummary }>(
    `/automations/${automationId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to update automation');
  }

  return result.data;
}

export async function deleteAutomation(
  automationId: string,
): Promise<{ deleted: boolean }> {
  const result = await apiFetch<{ deleted: boolean }>(
    `/automations/${automationId}`,
    { method: 'DELETE' },
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to delete automation');
  }

  return result.data;
}

export async function listAutomationRuns(
  automationId: string,
): Promise<{ runs: AutomationRun[] }> {
  const result = await apiFetch<{ runs: AutomationRun[] }>(
    `/automations/${automationId}/runs`,
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load automation runs');
  }

  return result.data;
}

export async function runAutomation(
  automationId: string,
  input?: { mode?: 'preview' | 'execute' },
): Promise<{ run: AutomationRun }> {
  const result = await apiFetch<{ run: AutomationRun }>(
    `/automations/${automationId}/run`,
    {
      method: 'POST',
      body: JSON.stringify(input ?? { mode: 'preview' }),
    },
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to run automation');
  }

  return result.data;
}
