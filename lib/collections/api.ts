const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type CollectionSummary = {
  id: string;
  name: string | null;
  description: string | null;
  workspaceId: string | null;
  collectionType: string | null;
  status: string | null;
  memberCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CollectionMember = {
  entityId: string;
  addedBy: string | null;
  createdAt: string | null;
  entityType: string;
  confidence: number | null;
  sourceId: string | null;
};

export type CollectionDetail = {
  collection: Omit<CollectionSummary, 'memberCount'>;
  memberCount: number;
  members: CollectionMember[];
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

export async function listCollections(input?: {
  workspaceId?: string;
  status?: string;
  type?: string;
}): Promise<{ collections: CollectionSummary[] }> {
  const params = new URLSearchParams();
  if (input?.workspaceId) {
    params.set('workspaceId', input.workspaceId);
  }
  if (input?.status) {
    params.set('status', input.status);
  }
  if (input?.type) {
    params.set('type', input.type);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const result = await apiFetch<{ collections: CollectionSummary[] }>(
    `/collections${suffix}`,
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load collections');
  }

  return result.data;
}

export async function getCollection(
  collectionId: string,
): Promise<CollectionDetail> {
  const result = await apiFetch<CollectionDetail>(
    `/collections/${collectionId}`,
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load collection');
  }

  return result.data;
}

export async function createCollection(input: {
  name: string;
  description?: string;
  workspaceId?: string;
}): Promise<{ collection: CollectionDetail['collection'] }> {
  const result = await apiFetch<{ collection: CollectionDetail['collection'] }>(
    '/collections',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to create collection');
  }

  return result.data;
}

export async function deleteCollection(
  collectionId: string,
): Promise<{ deleted: boolean }> {
  const result = await apiFetch<{ deleted: boolean }>(
    `/collections/${collectionId}`,
    { method: 'DELETE' },
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to delete collection');
  }

  return result.data;
}

export async function listCollectionSuggestions(
  workspaceId?: string,
): Promise<{ suggestions: CollectionDetail['collection'][] }> {
  const params = new URLSearchParams();
  if (workspaceId) {
    params.set('workspaceId', workspaceId);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const result = await apiFetch<{
    suggestions: CollectionDetail['collection'][];
  }>(`/collections/suggestions${suffix}`);

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load collection suggestions');
  }

  return result.data;
}

export async function acceptCollectionSuggestion(
  collectionId: string,
): Promise<{ collection: CollectionDetail['collection'] }> {
  const result = await apiFetch<{ collection: CollectionDetail['collection'] }>(
    `/collections/${collectionId}/suggestions/accept`,
    { method: 'POST' },
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to accept suggestion');
  }

  return result.data;
}

export async function dismissCollectionSuggestion(
  collectionId: string,
): Promise<{ dismissed: boolean }> {
  const result = await apiFetch<{ dismissed: boolean }>(
    `/collections/${collectionId}/suggestions/dismiss`,
    { method: 'POST' },
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to dismiss suggestion');
  }

  return result.data;
}
