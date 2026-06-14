export const INSIGHT_TYPE_KEYS = [
  'daily_briefing',
  'inbox_health',
  'cost_anomaly',
  'vendor_insight',
  'crm_insight',
  'travel_insight',
] as const;

export type InsightTypeKey = (typeof INSIGHT_TYPE_KEYS)[number];

export type InsightRecord = {
  id: string;
  userId: string;
  workspaceId: string | null;
  insightType: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export function isInsightTypeKey(value: string): value is InsightTypeKey {
  return INSIGHT_TYPE_KEYS.includes(value as InsightTypeKey);
}
