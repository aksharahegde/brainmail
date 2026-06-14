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

export const ALLOWED_UI_BLOCK_TYPES = [
  ...PHASE_10_BLOCK_TYPES,
  'text',
  'insight_card',
  'suggestion_card',
  'automation_preview',
] as const;

export type AllowedUiBlockType = (typeof ALLOWED_UI_BLOCK_TYPES)[number];

export function isAllowedUiBlockType(type: string): type is AllowedUiBlockType {
  return (ALLOWED_UI_BLOCK_TYPES as readonly string[]).includes(type);
}
