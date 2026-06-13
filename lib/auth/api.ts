const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export type ConnectedAccount = {
  id: string;
  provider: string;
  providerAccountId: string;
  email: string | null;
  createdAt: string | null;
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

export async function startGoogleLogin(): Promise<string> {
  const result = await apiFetch<{ url: string }>('/auth/login', {
    method: 'POST',
  });

  if (!result.success || !result.data?.url) {
    throw new Error(result.error ?? 'Unable to start Google login');
  }

  return result.data.url;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const result = await apiFetch<AuthUser>('/auth/me');
  if (!result.success || !result.data) {
    return null;
  }

  return result.data;
}

export async function logout(): Promise<void> {
  const result = await apiFetch<{ loggedOut: boolean }>('/auth/logout', {
    method: 'POST',
  });

  if (!result.success) {
    throw new Error(result.error ?? 'Unable to logout');
  }
}

export async function listConnectedAccounts(): Promise<ConnectedAccount[]> {
  const result = await apiFetch<{ accounts: ConnectedAccount[] }>('/accounts');
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load accounts');
  }

  return result.data.accounts;
}

export async function connectAccount(provider: string): Promise<string> {
  const result = await apiFetch<{ url: string }>('/accounts/connect', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });

  if (!result.success || !result.data?.url) {
    throw new Error(result.error ?? 'Unable to connect account');
  }

  return result.data.url;
}

export async function disconnectAccount(accountId: string): Promise<void> {
  const result = await apiFetch<{ disconnected: boolean }>(
    `/accounts/${accountId}`,
    { method: 'DELETE' },
  );

  if (!result.success) {
    throw new Error(result.error ?? 'Unable to disconnect account');
  }
}
