import { createDb } from '@brainmail/db';
import { automationRuns, collections } from '@brainmail/db/schema';
import { and, eq, like } from 'drizzle-orm';

import { createId } from '../lib/crypto';
import type { AutomationAction, AutomationDefinition } from './types';

type ExecutionContext = {
  userId: string;
  emailId?: string;
  emailSubject?: string | null;
  mode: 'preview' | 'execute';
};

type ActionResult = {
  type: string;
  status: 'preview' | 'executed' | 'skipped';
  message: string;
};

async function resolveCollectionId(
  env: Env,
  userId: string,
  collectionName: string,
): Promise<string | null> {
  const db = createDb(env.DB);
  const rows = await db
    .select({ id: collections.id })
    .from(collections)
    .where(
      and(
        eq(collections.userId, userId),
        like(collections.name, collectionName),
      ),
    )
    .limit(1);

  return rows[0]?.id ?? null;
}

async function executeAction(
  env: Env,
  action: AutomationAction,
  context: ExecutionContext,
): Promise<ActionResult> {
  if (context.mode === 'preview' || action.requiresConfirmation) {
    return {
      type: action.type,
      status: 'preview',
      message: `Preview ${action.type} -> ${action.value}`,
    };
  }

  switch (action.type) {
    case 'notify':
      return {
        type: action.type,
        status: 'executed',
        message: action.value,
      };
    case 'assign_workspace':
      return {
        type: action.type,
        status: 'executed',
        message: `Assigned to workspace ${action.value}`,
      };
    case 'add_label':
      return {
        type: action.type,
        status: 'executed',
        message: `Applied label ${action.value}`,
      };
    case 'add_to_collection': {
      const collectionId = await resolveCollectionId(
        env,
        context.userId,
        action.value,
      );
      if (!collectionId) {
        return {
          type: action.type,
          status: 'skipped',
          message: `Collection not found: ${action.value}`,
        };
      }

      return {
        type: action.type,
        status: 'executed',
        message: `Queued collection assignment for ${action.value}`,
      };
    }
    default:
      return {
        type: action.type,
        status: 'skipped',
        message: 'Unknown action type',
      };
  }
}

export async function executeAutomationDefinition(
  env: Env,
  definition: AutomationDefinition,
  context: ExecutionContext,
): Promise<{
  status: 'preview' | 'executed' | 'skipped';
  actions: ActionResult[];
}> {
  const actions: ActionResult[] = [];

  for (const action of definition.actions) {
    actions.push(await executeAction(env, action, context));
  }

  const hasExecuted = actions.some((action) => action.status === 'executed');
  const hasPreview = actions.some((action) => action.status === 'preview');

  return {
    status: hasExecuted ? 'executed' : hasPreview ? 'preview' : 'skipped',
    actions,
  };
}

export async function recordAutomationRun(
  env: Env,
  automationId: string,
  status: string,
  executionLog: Record<string, unknown>,
): Promise<string> {
  const db = createDb(env.DB);
  const id = createId('automation_run');
  const now = new Date().toISOString();

  await db.insert(automationRuns).values({
    id,
    automationId,
    status,
    executionLog,
    executedAt: now,
  });

  return id;
}
