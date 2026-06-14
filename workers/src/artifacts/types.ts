export const ARTIFACT_TYPES = [
  'report',
  'chart',
  'dashboard',
  'table',
  'timeline',
  'vendor_report',
  'travel_report',
  'daily_briefing',
  'email_list',
  'automation_preview',
  'confirmation',
  'insight_card',
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export type ArtifactRecord = {
  id: string;
  userId: string;
  workspaceId: string | null;
  artifactType: string | null;
  title: string | null;
  payload: Record<string, unknown> | null;
  createdBy: string | null;
  shareToken: string | null;
  sharedAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
};

export type SaveArtifactInput = {
  artifactType: ArtifactType;
  title: string;
  payload: Record<string, unknown>;
  workspaceId?: string | null;
  createdBy?: string;
};

export function isArtifactType(value: string): value is ArtifactType {
  return (ARTIFACT_TYPES as readonly string[]).includes(value);
}
