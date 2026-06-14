import { createDb } from '@brainmail/db';
import { artifacts } from '@brainmail/db/schema';

import { createId } from '../lib/crypto';
import { routeMessage } from './router';
import { dispatchAgent } from './specialists';
import { planUiResponse } from './ui-planner';
import type { AgentContext, UIResponse } from './types';

function artifactTypeForAgent(agent: UIResponse['agent']): string {
  switch (agent) {
    case 'analytics':
      return 'table';
    case 'automation':
      return 'automation_preview';
    case 'action':
      return 'confirmation';
    case 'insight':
      return 'insight_card';
    case 'search':
    default:
      return 'email_list';
  }
}

export async function runAgentRuntime(
  env: Env,
  context: AgentContext,
): Promise<UIResponse> {
  const plan = await routeMessage(env, context.message);
  const agentResult = await dispatchAgent(env, context, plan);
  const { blocks, actions } = planUiResponse(agentResult);

  const db = createDb(env.DB);
  const artifactId = createId('artifact');
  await db.insert(artifacts).values({
    id: artifactId,
    userId: context.userId,
    artifactType: artifactTypeForAgent(agentResult.agent),
    title: `${agentResult.agent} response`,
    payload: {
      plan: agentResult.plan,
      toolCalls: agentResult.toolCalls,
      blocks,
    },
    createdBy: 'agent_runtime',
  });

  return {
    blocks,
    actions,
    artifact: {
      id: artifactId,
      type: artifactTypeForAgent(agentResult.agent),
    },
    plan: agentResult.plan,
    agent: agentResult.agent,
    toolCalls: agentResult.toolCalls,
  };
}
