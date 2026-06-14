const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type ArtifactSummary = {
  id: string;
  artifactType: string | null;
  title: string | null;
  workspaceId: string | null;
  createdBy: string | null;
  shareToken: string | null;
  sharedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ArtifactDetail = ArtifactSummary & {
  payload: Record<string, unknown> | null;
};

export type ArtifactType = 'report' | 'chart' | 'dashboard';

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

  if (!response.ok && init?.method === 'POST' && path.endsWith('/export')) {
    const payload = (await response.json()) as ApiResponse<T>;
    throw new Error(payload.error ?? 'Export failed');
  }

  return (await response.json()) as ApiResponse<T>;
}

export async function listArtifacts(input?: {
  type?: string;
  workspaceId?: string;
}): Promise<{ artifacts: ArtifactSummary[] }> {
  const params = new URLSearchParams();
  if (input?.type) {
    params.set('type', input.type);
  }
  if (input?.workspaceId) {
    params.set('workspaceId', input.workspaceId);
  }

  const query = params.toString();
  const result = await apiFetch<{ artifacts: ArtifactSummary[] }>(
    `/artifacts${query ? `?${query}` : ''}`,
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load artifacts');
  }

  return result.data;
}

export async function getArtifact(
  artifactId: string,
): Promise<{ artifact: ArtifactDetail }> {
  const result = await apiFetch<{ artifact: ArtifactDetail }>(
    `/artifacts/${artifactId}`,
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load artifact');
  }

  return result.data;
}

export async function saveArtifact(input: {
  artifactType: ArtifactType;
  title: string;
  payload: Record<string, unknown>;
  workspaceId?: string;
}): Promise<{ artifact: ArtifactDetail }> {
  const result = await apiFetch<{ artifact: ArtifactDetail }>('/artifacts', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to save artifact');
  }

  return result.data;
}

export async function deleteArtifact(artifactId: string): Promise<void> {
  const result = await apiFetch<{ deleted: boolean }>(
    `/artifacts/${artifactId}`,
    { method: 'DELETE' },
  );

  if (!result.success) {
    throw new Error(result.error ?? 'Unable to delete artifact');
  }
}

export async function shareArtifact(artifactId: string): Promise<{
  shareToken: string;
  sharedAt: string;
  shareUrl: string;
}> {
  const result = await apiFetch<{
    shareToken: string;
    sharedAt: string;
    shareUrl: string;
  }>(`/artifacts/${artifactId}/share`, { method: 'POST' });

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to share artifact');
  }

  return result.data;
}

export async function exportArtifact(
  artifactId: string,
  format: 'json' | 'csv' = 'json',
): Promise<Blob> {
  const response = await fetch(`${API_BASE}/artifacts/${artifactId}/export`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ format }),
  });

  if (!response.ok) {
    let message = 'Unable to export artifact';
    try {
      const payload = (await response.json()) as ApiResponse<unknown>;
      message = payload.error ?? message;
    } catch {
      // Ignore JSON parse errors for non-JSON responses.
    }
    throw new Error(message);
  }

  return response.blob();
}

export async function downloadArtifactExport(
  artifactId: string,
  format: 'json' | 'csv',
  filename: string,
): Promise<void> {
  const blob = await exportArtifact(artifactId, format);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
