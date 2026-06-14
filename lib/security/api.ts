const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type AuditLogEntry = {
  id: string;
  userId: string;
  action: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string | null;
};

export type AccountDeletionPreview = {
  userId: string;
  email: string | null;
  counts: {
    emails: number;
    workspaces: number;
    artifacts: number;
    automations: number;
    collections: number;
    accounts: number;
    embeddings: number;
  };
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

  if (
    response.headers.get('Content-Type')?.includes('application/json') ||
    response.headers.get('Content-Type')?.includes('text/json')
  ) {
    return (await response.json()) as ApiResponse<T>;
  }

  if (!response.ok) {
    return {
      success: false,
      error: `Request failed with status ${response.status}`,
    };
  }

  return {
    success: true,
    data: (await response.text()) as T,
  };
}

export async function listAuditLogs(input?: {
  limit?: number;
  action?: string;
}): Promise<{ logs: AuditLogEntry[] }> {
  const params = new URLSearchParams();
  if (input?.limit) {
    params.set('limit', String(input.limit));
  }
  if (input?.action) {
    params.set('action', input.action);
  }

  const query = params.toString();
  const result = await apiFetch<{ logs: AuditLogEntry[] }>(
    `/audit${query ? `?${query}` : ''}`,
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load audit logs');
  }

  return result.data;
}

export async function exportUserData(input?: {
  format?: 'json' | 'csv';
}): Promise<Blob> {
  const response = await fetch(`${API_BASE}/export`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ format: input?.format ?? 'json' }),
  });

  if (!response.ok) {
    const payload = (await response
      .json()
      .catch(() => null)) as ApiResponse<never> | null;
    throw new Error(payload?.error ?? 'Unable to export data');
  }

  return response.blob();
}

export async function previewAccountDeletion(): Promise<{
  preview: AccountDeletionPreview;
}> {
  const result = await apiFetch<{ preview: AccountDeletionPreview }>(
    '/account/delete',
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load deletion preview');
  }

  return result.data;
}

export async function deleteAccount(
  confirmation: string,
): Promise<{ deleted: boolean }> {
  const result = await apiFetch<{ deleted: boolean }>('/account/delete', {
    method: 'DELETE',
    body: JSON.stringify({ confirmation }),
  });

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to delete account');
  }

  return result.data;
}
