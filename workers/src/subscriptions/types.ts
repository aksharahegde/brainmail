export type SubscriptionRecord = {
  id: string;
  userId: string;
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

export type SubscriptionRenewal = {
  id: string;
  name: string | null;
  renewalDate: string | null;
  daysUntilRenewal: number;
  monthlyCost: number;
  currency: string | null;
};

export type SubscriptionDuplicateGroup = {
  id: string;
  normalizedName: string;
  subscriptionIds: string[];
  names: string[];
  monthlyCostTotal: number;
  potentialMonthlySavings: number;
};

export type SubscriptionCostTrend = {
  monthlyTotal: number;
  annualizedTotal: number;
  averageMonthlyCost: number;
  activeCount: number;
  direction: 'up' | 'down' | 'flat';
  changePercent: number;
  duplicateSavingsPotential: number;
};

export type SubscriptionSummary = {
  activeCount: number;
  ignoredCount: number;
  monthlyTotal: number;
  upcomingRenewals: SubscriptionRenewal[];
  duplicateGroups: SubscriptionDuplicateGroup[];
  costTrend: SubscriptionCostTrend;
};
