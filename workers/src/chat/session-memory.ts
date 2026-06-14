import { createDb } from '@brainmail/db';
import { chatMessages, sessionState } from '@brainmail/db/schema';
import { desc, eq } from 'drizzle-orm';

import type { AgentType, UIResponse } from '../agents/types';

export type SessionMemoryMessage = {
  role: string;
  content: string;
};

export type SessionMemory = {
  recentMessages: SessionMemoryMessage[];
  lastAgent: AgentType | null;
  lastArtifactId: string | null;
  lastIntent: string | null;
  entities: string[];
};

export async function loadSessionMemory(
  env: Env,
  sessionId: string,
): Promise<SessionMemory> {
  const db = createDb(env.DB);
  const messageRows = await db
    .select({
      role: chatMessages.role,
      content: chatMessages.content,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(8);

  const stateRows = await db
    .select()
    .from(sessionState)
    .where(eq(sessionState.sessionId, sessionId))
    .limit(1);

  const state = stateRows[0]?.state ?? {};
  const lastAgent =
    typeof state.lastAgent === 'string' ? (state.lastAgent as AgentType) : null;

  return {
    recentMessages: messageRows
      .reverse()
      .filter((row) => row.role && row.content)
      .map((row) => ({
        role: row.role!,
        content: row.content!,
      })),
    lastAgent,
    lastArtifactId:
      stateRows[0]?.currentArtifactId ??
      (typeof state.lastArtifactId === 'string' ? state.lastArtifactId : null),
    lastIntent: typeof state.lastIntent === 'string' ? state.lastIntent : null,
    entities: Array.isArray(state.entities)
      ? state.entities.filter(
          (value): value is string => typeof value === 'string',
        )
      : [],
  };
}

export async function saveSessionMemory(
  env: Env,
  sessionId: string,
  response: UIResponse,
  workspaceId?: string | null,
) {
  const db = createDb(env.DB);
  const existing = await db
    .select()
    .from(sessionState)
    .where(eq(sessionState.sessionId, sessionId))
    .limit(1);

  const nextState = {
    lastAgent: response.agent,
    lastArtifactId: response.artifact?.id ?? null,
    lastIntent: response.plan.intent,
    entities: response.plan.entities,
    updatedAt: new Date().toISOString(),
  };

  if (existing[0]) {
    await db
      .update(sessionState)
      .set({
        currentArtifactId:
          response.artifact?.id ?? existing[0].currentArtifactId,
        currentWorkspaceId: workspaceId ?? existing[0].currentWorkspaceId,
        state: nextState,
      })
      .where(eq(sessionState.sessionId, sessionId));
    return;
  }

  await db.insert(sessionState).values({
    sessionId,
    currentArtifactId: response.artifact?.id ?? null,
    currentWorkspaceId: workspaceId ?? null,
    state: nextState,
  });
}

export function applySessionMemoryToPlan(
  message: string,
  memory: SessionMemory,
): { agentOverride?: AgentType; entities: string[] } {
  const followUp = /\b(that|those|it|same|again|more)\b/i.test(message);
  if (!followUp || !memory.lastAgent) {
    return { entities: memory.entities };
  }

  return {
    agentOverride: memory.lastAgent,
    entities: memory.entities.length ? memory.entities : [],
  };
}
