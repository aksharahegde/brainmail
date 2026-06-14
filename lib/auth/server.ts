import { headers } from 'next/headers';

import type { AuthUser } from './api';

function getWorkerApiBaseUrl(): string {
  return process.env.API_URL ?? 'http://localhost:8787';
}

export async function getCurrentUserServer(): Promise<AuthUser | null> {
  const headerStore = await headers();
  const cookie = headerStore.get('cookie');
  if (!cookie) {
    return null;
  }

  const response = await fetch(`${getWorkerApiBaseUrl()}/api/v1/auth/me`, {
    headers: { cookie },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as {
    success: boolean;
    data?: AuthUser;
  };

  return body.success && body.data ? body.data : null;
}
