import { createDb } from '@brainmail/db';
import { artifacts } from '@brainmail/db/schema';

import { createId } from '../lib/crypto';
import { inferArtifactType } from '../artifacts/service';
import { routeMessage } from './router';
import { dispatchAgent } from './specialists';
import { planUiResponse } from './ui-planner';
import type { AgentContext, UIResponse } from './types';

function artifactTypeForAgent(agent: UIResponse['agent']): string {
  switch (agent) {
    case 'analytics':
      return 'chart';
    case 'automation':
      return 'automation_preview';
    case 'action':
      return 'confirmation';
    case 'insight':
      return 'insight_card';
    case 'search':
    default:
      return 'report';
  }
}

export async function runAgentRuntime(
  env: Env,
  context: AgentContext,
): Promise<UIResponse> {
  const plan = await routeMessage(env, context.message, {
    lastAgent: context.memory?.lastAgent,
    entities: context.memory?.entities,
  });
  const agentResult = await dispatchAgent(env, context, plan);
  const { blocks, actions } = planUiResponse(agentResult);
  const artifactType = inferArtifactType(
    blocks,
    artifactTypeForAgent(agentResult.agent),
  );

  const db = createDb(env.DB);
  const artifactId = createId('artifact');
  const now = new Date().toISOString();

  await db.insert(artifacts).values({
    id: artifactId,
    userId: context.userId,
    workspaceId: context.workspaceId ?? null,
    artifactType,
    title: `${agentResult.agent} response`,
    payload: {
      plan: agentResult.plan,
      toolCalls: agentResult.toolCalls,
      blocks,
      actions,
    },
    createdBy: 'agent_runtime',
    updatedAt: now,
  });

  return {
    blocks,
    actions,
    artifact: {
      id: artifactId,
      type: artifactType,
    },
    plan: agentResult.plan,
    agent: agentResult.agent,
    toolCalls: agentResult.toolCalls,
  };
}
