const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type SearchMode = 'keyword' | 'vector' | 'hybrid';

export type GlobalSearchResult = {
  query: string;
  mode: SearchMode;
  emails: Array<{
    id: string;
    subject: string | null;
    sender: string | null;
    snippet: string | null;
    category: string | null;
    receivedAt: string | null;
    score: number;
    source: 'keyword' | 'vector' | 'hybrid';
  }>;
  entities: Array<{
    id: string;
    type: string;
    label: string;
    summary: string | null;
    score: number;
  }>;
  contacts: Array<{
    id: string;
    name: string | null;
    email: string | null;
    score: number;
  }>;
  vendors: Array<{
    id: string;
    name: string | null;
    domain: string | null;
    score: number;
  }>;
  artifacts: Array<{
    id: string;
    title: string | null;
    artifactType: string | null;
    score: number;
  }>;
  workspaces: Array<{
    id: string;
    name: string | null;
    description: string | null;
    workspaceType: string | null;
    score: number;
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

export async function globalSearch(
  query: string,
  options?: { mode?: SearchMode; limit?: number },
): Promise<GlobalSearchResult> {
  const params = new URLSearchParams({ q: query });
  if (options?.mode) {
    params.set('mode', options.mode);
  }
  if (options?.limit) {
    params.set('limit', String(options.limit));
  }

  const result = await apiFetch<GlobalSearchResult>(
    `/search?${params.toString()}`,
  );
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to run search');
  }

  return result.data;
}

export function formatSearchMode(mode: SearchMode): string {
  return mode.replace(/_/g, ' ');
}
