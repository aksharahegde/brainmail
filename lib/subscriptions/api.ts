const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type SubscriptionSummary = {
  activeCount: number;
  ignoredCount: number;
  monthlyTotal: number;
  upcomingRenewals: Array<{
    id: string;
    name: string | null;
    renewalDate: string | null;
    daysUntilRenewal: number;
    monthlyCost: number;
    currency: string | null;
  }>;
  duplicateGroups: Array<{
    id: string;
    normalizedName: string;
    subscriptionIds: string[];
    names: string[];
    monthlyCostTotal: number;
    potentialMonthlySavings: number;
  }>;
  costTrend: {
    monthlyTotal: number;
    annualizedTotal: number;
    averageMonthlyCost: number;
    activeCount: number;
    direction: 'up' | 'down' | 'flat';
    changePercent: number;
    duplicateSavingsPotential: number;
  };
};

export type SubscriptionRecord = {
  id: string;
  companyId: string | null;
  sourceId: string | null;
  name: string | null;
  amount: number | null;
  currency: string | null;
  billingPeriod: string | null;
  renewalDate: string | null;
  status: string | null;
  monthlyCost: number;
  daysUntilRenewal: number | null;
  duplicateGroupId: string | null;
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

export async function listSubscriptions(input?: {
  workspaceId?: string;
  includeIgnored?: boolean;
}): Promise<{
  subscriptions: SubscriptionRecord[];
  summary: SubscriptionSummary;
}> {
  const params = new URLSearchParams();
  if (input?.workspaceId) {
    params.set('workspaceId', input.workspaceId);
  }
  if (input?.includeIgnored) {
    params.set('includeIgnored', 'true');
  }

  const query = params.toString();
  const result = await apiFetch<{
    subscriptions: SubscriptionRecord[];
    summary: SubscriptionSummary;
  }>(`/subscriptions${query ? `?${query}` : ''}`);

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load subscriptions');
  }

  return result.data;
}

export async function getSubscription(
  subscriptionId: string,
): Promise<{ subscription: SubscriptionRecord }> {
  const result = await apiFetch<{ subscription: SubscriptionRecord }>(
    `/subscriptions/${subscriptionId}`,
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load subscription');
  }

  return result.data;
}

export async function ignoreSubscription(
  subscriptionId: string,
): Promise<{ subscription: SubscriptionRecord }> {
  const result = await apiFetch<{ subscription: SubscriptionRecord }>(
    `/subscriptions/${subscriptionId}/ignore`,
    { method: 'POST' },
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to ignore subscription');
  }

  return result.data;
}

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export { formatCurrency };
