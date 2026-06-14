const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type ProcessedEmailSummary = {
  id: string;
  subject: string | null;
  sender: string | null;
  snippet: string | null;
  category: string | null;
  classificationConfidence: number | null;
  processingStatus: string;
  processingError: string | null;
  processedAt: string | null;
  receivedAt: string | null;
  createdAt: string | null;
};

export type ProcessedEmailEntity = {
  id: string;
  entityType: string;
  confidence: number | null;
  data: Record<string, unknown> | null;
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

export async function listProcessedEmails(input?: {
  query?: string;
  workspaceId?: string;
}): Promise<{
  emails: ProcessedEmailSummary[];
  page: number;
  pageSize: number;
  total: number;
}> {
  const params = new URLSearchParams();
  if (input?.query) {
    params.set('q', input.query);
  }
  if (input?.workspaceId) {
    params.set('workspaceId', input.workspaceId);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const result = await apiFetch<{
    emails: ProcessedEmailSummary[];
    page: number;
    pageSize: number;
    total: number;
  }>(`/emails${suffix}`);

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load processed emails');
  }

  return result.data;
}

export async function getProcessedEmail(emailId: string): Promise<{
  email: ProcessedEmailSummary & {
    bodyText: string | null;
    recipients: string[] | null;
    cc: string[] | null;
    bcc: string[] | null;
  };
  entities: ProcessedEmailEntity[];
}> {
  const result = await apiFetch<{
    email: ProcessedEmailSummary & {
      bodyText: string | null;
      recipients: string[] | null;
      cc: string[] | null;
      bcc: string[] | null;
    };
    entities: ProcessedEmailEntity[];
  }>(`/emails/${emailId}`);

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load email details');
  }

  return result.data;
}

export function formatProcessingStatus(status: string): string {
  return status.replace(/_/g, ' ');
}
