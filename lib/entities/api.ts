const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type EntitySummary = {
  id: string;
  type: string;
  label: string;
  summary: string | null;
  confidence: number | null;
  sourceId: string | null;
  createdAt: string | null;
};

export type ContactSummary = {
  id: string;
  name: string | null;
  email: string | null;
  companyId: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
  interactionCount: number | null;
  relationshipScore: number | null;
};

export type GraphNode = {
  id: string;
  type: string;
  label: string;
  metadata: Record<string, unknown>;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  confidence: number | null;
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

export async function listEntities(options?: {
  type?: string;
  query?: string;
}): Promise<{ entities: EntitySummary[]; type: string; total: number }> {
  const params = new URLSearchParams();
  if (options?.type) {
    params.set('type', options.type);
  }
  if (options?.query) {
    params.set('q', options.query);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const result = await apiFetch<{
    entities: EntitySummary[];
    type: string;
    total: number;
  }>(`/entities${suffix}`);

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load entities');
  }

  return result.data;
}

export async function listContacts(query?: string): Promise<{
  contacts: ContactSummary[];
  total: number;
}> {
  const params = new URLSearchParams();
  if (query) {
    params.set('q', query);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const result = await apiFetch<{
    contacts: ContactSummary[];
    total: number;
  }>(`/contacts${suffix}`);

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load contacts');
  }

  return result.data;
}

export async function getRelationshipGraph(): Promise<{
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: { nodeCount: number; edgeCount: number };
}> {
  const result = await apiFetch<{
    nodes: GraphNode[];
    edges: GraphEdge[];
    stats: { nodeCount: number; edgeCount: number };
  }>('/graph');

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load relationship graph');
  }

  return result.data;
}

export function formatEntityType(type: string): string {
  return type.replace(/_/g, ' ');
}

export function formatRelationshipScore(score: number | null): string {
  if (score == null) {
    return '—';
  }
  return `${Math.round(score * 100)}%`;
}
