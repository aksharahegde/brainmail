export const AUTOMATION_TEMPLATE_KEYS = [
  'invoice_to_finance',
  'subscription_renewal_alert',
  'travel_booking_tag',
  'weekly_inbox_digest',
  'vendor_invoice_notify',
] as const;

export type AutomationTemplateKey = (typeof AUTOMATION_TEMPLATE_KEYS)[number];

export type AutomationTriggerType = 'new_email' | 'schedule' | 'manual';

export type AutomationTrigger = {
  type: AutomationTriggerType;
  schedule?: 'daily' | 'weekly';
};

export type AutomationCondition = {
  type: 'category' | 'sender_contains' | 'subject_contains' | 'workspace';
  operator: 'equals' | 'contains';
  value: string;
};

export type AutomationActionType =
  | 'add_label'
  | 'assign_workspace'
  | 'notify'
  | 'add_to_collection';

export type AutomationAction = {
  type: AutomationActionType;
  value: string;
  requiresConfirmation?: boolean;
};

export type AutomationDefinition = {
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  description?: string;
};

export type AutomationRecord = {
  id: string;
  userId: string;
  workspaceId: string | null;
  name: string | null;
  definition: AutomationDefinition | null;
  schedule: string | null;
  enabled: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AutomationRunRecord = {
  id: string;
  automationId: string | null;
  status: string | null;
  executionLog: Record<string, unknown> | null;
  executedAt: string | null;
};

export type AutomationTemplate = {
  key: AutomationTemplateKey;
  name: string;
  description: string;
  defaultWorkspaceId: string | null;
  schedule: string;
  definition: AutomationDefinition;
};

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    key: 'invoice_to_finance',
    name: 'Route invoices to Finance',
    description:
      'When a new invoice arrives, assign it to the Finance workspace.',
    defaultWorkspaceId: 'finance',
    schedule: 'manual',
    definition: {
      description: 'Route invoice emails into Finance.',
      trigger: { type: 'new_email' },
      conditions: [
        { type: 'category', operator: 'equals', value: 'invoice' },
        { type: 'workspace', operator: 'equals', value: 'finance' },
      ],
      actions: [
        { type: 'assign_workspace', value: 'finance' },
        { type: 'add_to_collection', value: 'AI Expenses' },
      ],
    },
  },
  {
    key: 'subscription_renewal_alert',
    name: 'Subscription renewal alert',
    description: 'Notify when subscription billing emails arrive.',
    defaultWorkspaceId: 'finance',
    schedule: 'manual',
    definition: {
      description: 'Alert on subscription renewal emails.',
      trigger: { type: 'new_email' },
      conditions: [
        { type: 'category', operator: 'equals', value: 'subscription' },
      ],
      actions: [{ type: 'notify', value: 'Subscription renewal detected' }],
    },
  },
  {
    key: 'travel_booking_tag',
    name: 'Tag travel bookings',
    description:
      'Label flight and hotel confirmations for the Travel workspace.',
    defaultWorkspaceId: 'travel',
    schedule: 'manual',
    definition: {
      description: 'Tag travel-related email for Travel workspace.',
      trigger: { type: 'new_email' },
      conditions: [{ type: 'workspace', operator: 'equals', value: 'travel' }],
      actions: [
        { type: 'add_label', value: 'travel' },
        { type: 'assign_workspace', value: 'travel' },
      ],
    },
  },
  {
    key: 'weekly_inbox_digest',
    name: 'Weekly inbox digest',
    description: 'Scheduled weekly summary of inbox activity.',
    defaultWorkspaceId: 'startup',
    schedule: 'weekly',
    definition: {
      description: 'Weekly digest notification for startup inbox.',
      trigger: { type: 'schedule', schedule: 'weekly' },
      conditions: [{ type: 'workspace', operator: 'equals', value: 'startup' }],
      actions: [{ type: 'notify', value: 'Weekly inbox digest ready' }],
    },
  },
  {
    key: 'vendor_invoice_notify',
    name: 'Vendor invoice notify',
    description: 'Notify when vendor invoices match finance categories.',
    defaultWorkspaceId: 'finance',
    schedule: 'daily',
    definition: {
      description: 'Daily vendor invoice notification.',
      trigger: { type: 'schedule', schedule: 'daily' },
      conditions: [
        { type: 'category', operator: 'equals', value: 'invoice' },
        { type: 'workspace', operator: 'equals', value: 'finance' },
      ],
      actions: [{ type: 'notify', value: 'Vendor invoice summary generated' }],
    },
  },
];

export function isAutomationTemplateKey(
  value: string,
): value is AutomationTemplateKey {
  return AUTOMATION_TEMPLATE_KEYS.includes(value as AutomationTemplateKey);
}

export function getAutomationTemplate(
  templateKey: string,
): AutomationTemplate | null {
  return (
    AUTOMATION_TEMPLATES.find((template) => template.key === templateKey) ??
    null
  );
}

export function parseAutomationDefinition(
  value: unknown,
): AutomationDefinition | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const trigger = record.trigger as AutomationTrigger | undefined;
  const conditions = record.conditions as AutomationCondition[] | undefined;
  const actions = record.actions as AutomationAction[] | undefined;

  if (!trigger?.type || !Array.isArray(conditions) || !Array.isArray(actions)) {
    return null;
  }

  return {
    trigger,
    conditions,
    actions,
    description:
      typeof record.description === 'string' ? record.description : undefined,
  };
}
