import type {
  GmailHistoryRecord,
  GmailMessageListItem,
  GmailMessageMetadata,
  GmailProfile,
  GmailWatchResponse,
} from './types';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function gmailFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${GMAIL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gmail API ${path} failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

export async function getGmailProfile(
  accessToken: string,
): Promise<GmailProfile> {
  return gmailFetch<GmailProfile>(accessToken, '/profile');
}

export async function listGmailMessages(
  accessToken: string,
  options?: { maxResults?: number; pageToken?: string },
): Promise<{ messages?: GmailMessageListItem[]; nextPageToken?: string }> {
  const params = new URLSearchParams();
  if (options?.maxResults) {
    params.set('maxResults', String(options.maxResults));
  }
  if (options?.pageToken) {
    params.set('pageToken', options.pageToken);
  }

  const query = params.toString();
  return gmailFetch(accessToken, `/messages${query ? `?${query}` : ''}`);
}

export async function getGmailMessageMetadata(
  accessToken: string,
  messageId: string,
): Promise<GmailMessageMetadata> {
  return gmailFetch<GmailMessageMetadata>(
    accessToken,
    `/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
  );
}

export async function getGmailMessageRaw(
  accessToken: string,
  messageId: string,
): Promise<{ raw?: string }> {
  return gmailFetch(accessToken, `/messages/${messageId}?format=raw`);
}

export async function listGmailHistory(
  accessToken: string,
  startHistoryId: string,
): Promise<{ history?: GmailHistoryRecord[]; historyId?: string }> {
  const params = new URLSearchParams({
    startHistoryId,
    historyTypes: 'messageAdded',
  });

  return gmailFetch(accessToken, `/history?${params.toString()}`);
}

export async function startGmailWatch(
  accessToken: string,
  topicName: string,
): Promise<GmailWatchResponse> {
  return gmailFetch<GmailWatchResponse>(accessToken, '/watch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topicName,
      labelIds: ['INBOX'],
    }),
  });
}

export async function stopGmailWatch(accessToken: string): Promise<void> {
  await gmailFetch(accessToken, '/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

export function getHeaderValue(
  message: GmailMessageMetadata,
  headerName: string,
): string | null {
  const header = message.payload?.headers?.find(
    (item) => item.name.toLowerCase() === headerName.toLowerCase(),
  );
  return header?.value ?? null;
}

export function parseRecipientList(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}
