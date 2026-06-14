const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type ContactSummary = {
  id: string;
  name: string | null;
  email: string | null;
  companyId: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
  interactionCount: number | null;
  relationshipScore: number;
  daysSinceLastContact: number | null;
  followUpPriority: 'high' | 'medium' | 'low' | null;
};

export type FollowUpReminder = {
  contactId: string;
  name: string | null;
  email: string | null;
  daysSinceLastContact: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  relationshipScore: number;
};

export type CrmSummary = {
  totalContacts: number;
  averageRelationshipScore: number;
  followUpCount: number;
  followUpReminders: FollowUpReminder[];
  communicationAnalytics: {
    emailsLast30Days: number;
    activeContactsLast30Days: number;
    averageEmailsPerContact: number;
  };
};

export type ContactProfile = {
  contact: ContactSummary;
  relationship: {
    id: string;
    relationshipScore: number | null;
    lastInteraction: string | null;
    metadata: Record<string, unknown> | null;
  } | null;
  activity: Array<{
    id: string;
    subject: string | null;
    sender: string | null;
    receivedAt: string | null;
    category: string | null;
  }>;
  analytics: {
    totalEmails: number;
    emailsLast30Days: number;
    emailsLast7Days: number;
    averageGapDays: number | null;
    lastInboundAt: string | null;
    trend: 'increasing' | 'stable' | 'declining';
  };
  followUpReminder: FollowUpReminder | null;
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

export async function listContacts(input?: {
  workspaceId?: string;
  query?: string;
}): Promise<{
  contacts: ContactSummary[];
  summary: CrmSummary;
  total: number;
}> {
  const params = new URLSearchParams();
  if (input?.workspaceId) {
    params.set('workspaceId', input.workspaceId);
  }
  if (input?.query) {
    params.set('q', input.query);
  }

  const query = params.toString();
  const result = await apiFetch<{
    contacts: ContactSummary[];
    summary: CrmSummary;
    total: number;
  }>(`/contacts${query ? `?${query}` : ''}`);

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load contacts');
  }

  return result.data;
}

export async function getContactProfile(
  contactId: string,
  workspaceId?: string,
): Promise<ContactProfile> {
  const params = new URLSearchParams();
  if (workspaceId) {
    params.set('workspaceId', workspaceId);
  }

  const query = params.toString();
  const result = await apiFetch<ContactProfile>(
    `/contacts/${contactId}${query ? `?${query}` : ''}`,
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load contact profile');
  }

  return result.data;
}

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export { formatScore };
