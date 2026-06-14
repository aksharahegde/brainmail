export const AUDIT_ACTIONS = [
  'auth.login',
  'auth.logout',
  'auth.account_connected',
  'auth.account_disconnected',
  'export.requested',
  'export.completed',
  'account.deletion_previewed',
  'account.deleted',
  'automation.executed',
  'artifact.exported',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditLogRecord = {
  id: string;
  userId: string;
  action: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string | null;
};
