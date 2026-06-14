import type { UIBlock } from '../agents/types';

export const REPORT_TYPE_KEYS = [
  'weekly_founder',
  'monthly_expense',
  'subscription_audit',
  'travel_report',
  'inbox_report',
] as const;

export type ReportTypeKey = (typeof REPORT_TYPE_KEYS)[number];

export const REPORT_SCHEDULES = ['manual', 'weekly', 'monthly'] as const;
export type ReportSchedule = (typeof REPORT_SCHEDULES)[number];

export type ReportDefinition = {
  reportType: ReportTypeKey | string;
  blocks: UIBlock[];
  refreshedAt?: string;
  periodLabel?: string;
};

export type ReportRecord = {
  id: string;
  userId: string;
  workspaceId: string | null;
  name: string | null;
  reportType: string | null;
  schedule: string | null;
  definition: ReportDefinition | null;
  createdAt: string | null;
  updatedAt: string | null;
  refreshedAt: string | null;
};

export type ReportTypeDefinition = {
  key: ReportTypeKey;
  name: string;
  description: string;
  schedule: ReportSchedule;
  defaultWorkspaceId: string | null;
};

export const REPORT_TYPES: ReportTypeDefinition[] = [
  {
    key: 'weekly_founder',
    name: 'Weekly Founder Report',
    description: 'Startup activity, meetings, and operating signals.',
    schedule: 'weekly',
    defaultWorkspaceId: 'startup',
  },
  {
    key: 'monthly_expense',
    name: 'Monthly Expense Report',
    description: 'Monthly spend across invoices and receipts.',
    schedule: 'monthly',
    defaultWorkspaceId: 'finance',
  },
  {
    key: 'subscription_audit',
    name: 'Subscription Audit',
    description: 'Recurring subscriptions and monthly cost totals.',
    schedule: 'monthly',
    defaultWorkspaceId: 'finance',
  },
  {
    key: 'travel_report',
    name: 'Travel Report',
    description: 'Flights, hotels, and trip-related email activity.',
    schedule: 'monthly',
    defaultWorkspaceId: 'travel',
  },
  {
    key: 'inbox_report',
    name: 'Inbox Report',
    description: 'Inbox volume, categories, and processing health.',
    schedule: 'weekly',
    defaultWorkspaceId: null,
  },
];

export function isReportTypeKey(value: string): value is ReportTypeKey {
  return REPORT_TYPE_KEYS.includes(value as ReportTypeKey);
}

export function getReportTypeDefinition(
  reportType: string,
): ReportTypeDefinition | null {
  return REPORT_TYPES.find((type) => type.key === reportType) ?? null;
}

export function isReportSchedule(value: string): value is ReportSchedule {
  return REPORT_SCHEDULES.includes(value as ReportSchedule);
}
