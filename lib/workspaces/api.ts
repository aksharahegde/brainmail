const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type WorkspaceSummary = {
  id: string;
  userId: string;
  name: string | null;
  description: string | null;
  workspaceType: string | null;
  createdAt: string | null;
};

export type WorkspaceDetail = {
  workspace: WorkspaceSummary;
  context: {
    categories: string[];
    workspaceType: string;
  };
  stats: {
    emails: number;
    artifacts: number;
    entities: number;
    collections: number;
    dashboards: number;
  };
  recentEmails: Array<{
    id: string;
    subject: string | null;
    sender: string | null;
    category: string | null;
    receivedAt: string | null;
  }>;
  recentArtifacts: Array<{
    id: string;
    title: string | null;
    artifactType: string | null;
    createdAt: string | null;
  }>;
};

export type WorkspaceSearchResults = {
  workspaceId: string;
  query: string;
  emails: WorkspaceDetail['recentEmails'];
  artifacts: WorkspaceDetail['recentArtifacts'];
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

export async function listWorkspaces(): Promise<{
  workspaces: WorkspaceSummary[];
}> {
  const result = await apiFetch<{ workspaces: WorkspaceSummary[] }>(
    '/workspaces',
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load workspaces');
  }

  return result.data;
}

export async function getWorkspace(
  workspaceId: string,
): Promise<WorkspaceDetail> {
  const result = await apiFetch<WorkspaceDetail>(`/workspaces/${workspaceId}`);

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load workspace');
  }

  return result.data;
}

export async function createWorkspace(input: {
  name: string;
  description?: string;
  workspaceType?: string;
}): Promise<{ workspace: WorkspaceSummary }> {
  const result = await apiFetch<{ workspace: WorkspaceSummary }>(
    '/workspaces',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to create workspace');
  }

  return result.data;
}

export async function searchWorkspace(
  workspaceId: string,
  query: string,
): Promise<WorkspaceSearchResults> {
  const params = new URLSearchParams({ q: query });
  const result = await apiFetch<WorkspaceSearchResults>(
    `/workspaces/${workspaceId}/search?${params.toString()}`,
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Workspace search failed');
  }

  return result.data;
}
