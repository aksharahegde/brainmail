export type UIBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

export type UIAction = {
  id: string;
  type: string;
  label: string;
  dangerous?: boolean;
  payload?: Record<string, unknown>;
};

export type UIResponse = {
  blocks: UIBlock[];
  actions?: UIAction[];
  artifact?: { id: string; type: string };
};

export const PHASE_10_BLOCK_TYPES = [
  'markdown',
  'kpi',
  'metric_grid',
  'table',
  'invoice_table',
  'email_list',
  'line_chart',
  'bar_chart',
  'pie_chart',
  'workspace_summary',
  'collection_summary',
  'vendor_profile',
  'subscription_card',
  'contact_card',
  'timeline',
  'daily_briefing',
  'inbox_health',
  'action_group',
  'confirmation',
] as const;

export type Phase10BlockType = (typeof PHASE_10_BLOCK_TYPES)[number];
