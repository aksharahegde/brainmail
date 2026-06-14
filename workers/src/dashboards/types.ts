import type { UIBlock } from '../agents/types';

export const DASHBOARD_TEMPLATE_KEYS = [
  'ai_expenses',
  'subscriptions',
  'custom',
] as const;

export type DashboardTemplateKey = (typeof DASHBOARD_TEMPLATE_KEYS)[number];

export type DashboardDefinition = {
  templateKey?: DashboardTemplateKey | string;
  blocks: UIBlock[];
  refreshedAt?: string;
};

export type DashboardRecord = {
  id: string;
  userId: string;
  workspaceId: string | null;
  name: string | null;
  templateKey: string | null;
  definition: DashboardDefinition | null;
  createdAt: string | null;
  updatedAt: string | null;
  refreshedAt: string | null;
};

export type DashboardTemplate = {
  key: DashboardTemplateKey;
  name: string;
  description: string;
};

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    key: 'ai_expenses',
    name: 'AI Expenses',
    description: 'Track invoices, receipts, and vendor spend.',
  },
  {
    key: 'subscriptions',
    name: 'Subscriptions',
    description: 'Monitor recurring subscriptions and monthly costs.',
  },
  {
    key: 'custom',
    name: 'Custom',
    description: 'Start with an empty dashboard layout.',
  },
];

export function isDashboardTemplateKey(
  value: string,
): value is DashboardTemplateKey {
  return DASHBOARD_TEMPLATE_KEYS.includes(value as DashboardTemplateKey);
}

export function getDashboardTemplate(
  templateKey: string,
): DashboardTemplate | null {
  return (
    DASHBOARD_TEMPLATES.find((template) => template.key === templateKey) ?? null
  );
}
