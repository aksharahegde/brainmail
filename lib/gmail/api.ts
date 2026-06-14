const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type GmailSyncStatus =
  | 'pending'
  | 'syncing'
  | 'idle'
  | 'watching'
  | 'error';

export type GmailSyncStatusView = {
  accountId: string;
  provider: string;
  email: string | null;
  status: GmailSyncStatus;
  historyId: string | null;
  watchExpiration: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  syncedMessageCount: number;
  initialSyncComplete: boolean;
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

export async function getGmailSyncStatus(): Promise<GmailSyncStatusView[]> {
  const result = await apiFetch<{ accounts: GmailSyncStatusView[] }>(
    '/sync/status',
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load Gmail sync status');
  }

  return result.data.accounts;
}

export async function triggerGmailSync(accountId: string): Promise<void> {
  const result = await apiFetch<{ queued: boolean }>('/sync/trigger', {
    method: 'POST',
    body: JSON.stringify({ accountId }),
  });

  if (!result.success) {
    throw new Error(result.error ?? 'Unable to trigger Gmail sync');
  }
}

function formatSyncStatus(status: GmailSyncStatus): string {
  switch (status) {
    case 'pending':
      return 'Queued';
    case 'syncing':
      return 'Syncing';
    case 'watching':
      return 'Watching';
    case 'error':
      return 'Error';
    default:
      return 'Idle';
  }
}

export function getGmailSyncStatusLabel(status: GmailSyncStatus): string {
  return formatSyncStatus(status);
}
