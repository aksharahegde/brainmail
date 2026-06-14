import { createDb } from '@brainmail/db';
import { automations, automationRuns } from '@brainmail/db/schema';
import { and, desc, eq } from 'drizzle-orm';

import { createId } from '../lib/crypto';
import { getEmailById } from '../processing/state';
import {
  evaluateAutomationConditions,
  shouldRunOnNewEmail,
  shouldRunOnSchedule,
} from './evaluate';
import { executeAutomationDefinition, recordAutomationRun } from './execute';
import {
  AUTOMATION_TEMPLATES,
  getAutomationTemplate,
  isAutomationTemplateKey,
  parseAutomationDefinition,
  type AutomationDefinition,
  type AutomationRecord,
  type AutomationRunRecord,
} from './types';

function serializeAutomation(
  row: typeof automations.$inferSelect,
): AutomationRecord {
  return {
    id: row.id,
    userId: row.userId,
    workspaceId: row.workspaceId,
    name: row.name,
    definition: parseAutomationDefinition(row.definition),
    schedule: row.schedule,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function serializeRun(
  row: typeof automationRuns.$inferSelect,
): AutomationRunRecord {
  return {
    id: row.id,
    automationId: row.automationId,
    status: row.status,
    executionLog: (row.executionLog as Record<string, unknown> | null) ?? null,
    executedAt: row.executedAt,
  };
}

export function listAutomationTemplates() {
  return AUTOMATION_TEMPLATES;
}

export async function listAutomations(
  env: Env,
  userId: string,
  filters?: { workspaceId?: string | null },
): Promise<AutomationRecord[]> {
  const db = createDb(env.DB);
  const conditions = [eq(automations.userId, userId)];

  if (filters?.workspaceId) {
    conditions.push(eq(automations.workspaceId, filters.workspaceId));
  }

  const rows = await db
    .select()
    .from(automations)
    .where(and(...conditions))
    .orderBy(desc(automations.updatedAt), desc(automations.createdAt));

  return rows.map(serializeAutomation);
}

export async function getAutomationForUser(
  env: Env,
  userId: string,
  automationId: string,
): Promise<AutomationRecord | null> {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(automations)
    .where(
      and(eq(automations.id, automationId), eq(automations.userId, userId)),
    )
    .limit(1);

  const row = rows[0];
  return row ? serializeAutomation(row) : null;
}

export async function createAutomation(
  env: Env,
  userId: string,
  input: {
    name?: string;
    workspaceId?: string;
    templateKey?: string;
    definition?: AutomationDefinition;
    enabled?: boolean;
  },
): Promise<AutomationRecord> {
  let definition = input.definition ?? null;
  let name = input.name?.trim() ?? '';
  let workspaceId = input.workspaceId?.trim() ?? null;
  let schedule = 'manual';

  if (input.templateKey) {
    if (!isAutomationTemplateKey(input.templateKey)) {
      throw new Error('Invalid automation template');
    }

    const template = getAutomationTemplate(input.templateKey)!;
    definition = template.definition;
    name = name || template.name;
    workspaceId = workspaceId ?? template.defaultWorkspaceId;
    schedule = template.schedule;
  }

  if (!definition) {
    throw new Error('Automation definition is required');
  }

  const db = createDb(env.DB);
  const id = createId('automation');
  const now = new Date().toISOString();

  await db.insert(automations).values({
    id,
    userId,
    workspaceId,
    name,
    definition,
    schedule,
    enabled: input.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  });

  const created = await getAutomationForUser(env, userId, id);
  if (!created) {
    throw new Error('Failed to create automation');
  }

  return created;
}

export async function updateAutomation(
  env: Env,
  userId: string,
  automationId: string,
  input: {
    name?: string;
    enabled?: boolean;
    definition?: AutomationDefinition;
  },
): Promise<AutomationRecord | null> {
  const existing = await getAutomationForUser(env, userId, automationId);
  if (!existing) {
    return null;
  }

  const db = createDb(env.DB);
  const now = new Date().toISOString();

  await db
    .update(automations)
    .set({
      name: input.name?.trim() ?? existing.name,
      enabled: input.enabled ?? existing.enabled,
      definition: input.definition ?? existing.definition,
      updatedAt: now,
    })
    .where(
      and(eq(automations.id, automationId), eq(automations.userId, userId)),
    );

  return getAutomationForUser(env, userId, automationId);
}

export async function deleteAutomation(
  env: Env,
  userId: string,
  automationId: string,
): Promise<boolean> {
  const existing = await getAutomationForUser(env, userId, automationId);
  if (!existing) {
    return false;
  }

  const db = createDb(env.DB);
  await db
    .delete(automationRuns)
    .where(eq(automationRuns.automationId, automationId));
  await db
    .delete(automations)
    .where(
      and(eq(automations.id, automationId), eq(automations.userId, userId)),
    );

  return true;
}

export async function listAutomationRuns(
  env: Env,
  userId: string,
  automationId: string,
): Promise<AutomationRunRecord[]> {
  const automation = await getAutomationForUser(env, userId, automationId);
  if (!automation) {
    return [];
  }

  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(automationRuns)
    .where(eq(automationRuns.automationId, automationId))
    .orderBy(desc(automationRuns.executedAt))
    .limit(25);

  return rows.map(serializeRun);
}

async function runAutomationRecord(
  env: Env,
  automation: AutomationRecord,
  input: {
    mode: 'preview' | 'execute';
    emailId?: string;
    userId: string;
  },
): Promise<AutomationRunRecord | null> {
  if (!automation.definition || !automation.enabled) {
    return null;
  }

  const email = input.emailId
    ? await getEmailById(env, input.emailId, input.userId)
    : null;

  const result = await executeAutomationDefinition(env, automation.definition, {
    userId: input.userId,
    emailId: input.emailId,
    emailSubject: email?.subject,
    mode: input.mode,
  });

  const runId = await recordAutomationRun(env, automation.id, result.status, {
    automationId: automation.id,
    automationName: automation.name,
    emailId: input.emailId ?? null,
    emailSubject: email?.subject ?? null,
    mode: input.mode,
    actions: result.actions,
  });

  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(automationRuns)
    .where(eq(automationRuns.id, runId))
    .limit(1);

  const row = rows[0];
  return row ? serializeRun(row) : null;
}

export async function runAutomation(
  env: Env,
  userId: string,
  automationId: string,
  options?: { mode?: 'preview' | 'execute'; emailId?: string },
): Promise<AutomationRunRecord | null> {
  const automation = await getAutomationForUser(env, userId, automationId);
  if (!automation) {
    return null;
  }

  return runAutomationRecord(env, automation, {
    userId,
    mode: options?.mode ?? 'preview',
    emailId: options?.emailId,
  });
}

export async function evaluateEmailAutomations(
  env: Env,
  input: { userId: string; emailId: string },
): Promise<number> {
  const email = await getEmailById(env, input.emailId, input.userId);
  if (!email) {
    return 0;
  }

  const items = await listAutomations(env, input.userId);
  let triggered = 0;

  for (const automation of items) {
    if (!automation.enabled || !automation.definition) {
      continue;
    }

    if (!shouldRunOnNewEmail(automation.definition)) {
      continue;
    }

    const matches = evaluateAutomationConditions(automation.definition, {
      id: email.id,
      subject: email.subject,
      sender: email.sender,
      category: email.category,
    });

    if (!matches) {
      continue;
    }

    await runAutomationRecord(env, automation, {
      userId: input.userId,
      emailId: input.emailId,
      mode: 'execute',
    });
    triggered += 1;
  }

  return triggered;
}

function isDueForSchedule(
  schedule: string | null,
  lastRunAt: string | null,
): boolean {
  if (!schedule || schedule === 'manual') {
    return false;
  }

  const lastMs = lastRunAt ? Date.parse(lastRunAt) : 0;
  const daysSince = (Date.now() - lastMs) / (1000 * 60 * 60 * 24);

  if (schedule === 'daily') {
    return daysSince >= 1;
  }

  if (schedule === 'weekly') {
    return daysSince >= 7;
  }

  return false;
}

export async function runScheduledAutomations(
  env: Env,
  schedule: 'daily' | 'weekly',
): Promise<number> {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(automations)
    .where(eq(automations.enabled, true));

  let runCount = 0;

  for (const row of rows) {
    const automation = serializeAutomation(row);
    if (
      !automation.definition ||
      !shouldRunOnSchedule(automation.definition, schedule)
    ) {
      continue;
    }

    const lastRunRows = await db
      .select({ executedAt: automationRuns.executedAt })
      .from(automationRuns)
      .where(eq(automationRuns.automationId, automation.id))
      .orderBy(desc(automationRuns.executedAt))
      .limit(1);

    if (
      !isDueForSchedule(automation.schedule, lastRunRows[0]?.executedAt ?? null)
    ) {
      continue;
    }

    const run = await runAutomationRecord(env, automation, {
      userId: automation.userId,
      mode: 'execute',
    });

    if (run) {
      runCount += 1;
    }
  }

  return runCount;
}

export async function countWorkspaceAutomations(
  env: Env,
  userId: string,
  workspaceId: string,
): Promise<number> {
  const items = await listAutomations(env, userId, { workspaceId });
  return items.length;
}
