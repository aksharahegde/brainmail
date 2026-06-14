import { executeTool } from './tools/registry';
import type {
  AgentContext,
  AgentRunResult,
  AgentType,
  RouterPlan,
} from './types';

async function runPlannedTools(
  env: Env,
  context: AgentContext,
  plan: RouterPlan,
) {
  const toolCalls = [];
  for (const toolName of plan.tools) {
    toolCalls.push(
      await executeTool(env, context, toolName, {
        query: context.message,
        vendor: plan.entities[0] ?? undefined,
      }),
    );
  }
  return toolCalls;
}

function summarize(
  agent: AgentType,
  plan: RouterPlan,
  toolCalls: AgentRunResult['toolCalls'],
) {
  if (agent === 'analytics') {
    const spending = toolCalls.find(
      (call) => call.tool === 'aggregate_spending',
    );
    if (spending && spending.output && typeof spending.output === 'object') {
      const data = spending.output as {
        combinedTotal?: number;
        vendor?: string;
      };
      const vendor = data.vendor ?? 'matching vendors';
      const total = data.combinedTotal ?? 0;
      return `Analytics agent found $${total.toFixed(2)} in combined invoice and receipt spend for ${vendor}.`;
    }
  }

  if (agent === 'search') {
    const emails = toolCalls.find((call) => call.tool === 'search_emails');
    const count = Array.isArray(emails?.output) ? emails.output.length : 0;
    return `Search agent found ${count} relevant emails.`;
  }

  if (agent === 'automation') {
    const automations = toolCalls.find(
      (call) => call.tool === 'list_automations',
    );
    const count = Array.isArray(automations?.output)
      ? automations.output.length
      : 0;
    return `Automation agent reviewed ${count} existing automations and prepared a preview plan.`;
  }

  if (agent === 'action') {
    return 'Action agent prepared a confirmation preview. No changes were executed.';
  }

  if (agent === 'insight') {
    const insights = toolCalls.find((call) => call.tool === 'list_insights');
    const count = Array.isArray(insights?.output) ? insights.output.length : 0;
    return `Insight agent surfaced ${count} stored insights and related entities.`;
  }

  return `${agent} agent completed ${plan.intent}.`;
}

export async function runSearchAgent(
  env: Env,
  context: AgentContext,
  plan: RouterPlan,
): Promise<AgentRunResult> {
  const toolCalls = await runPlannedTools(env, context, plan);
  return {
    agent: 'search',
    plan,
    toolCalls,
    summary: summarize('search', plan, toolCalls),
  };
}

export async function runAnalyticsAgent(
  env: Env,
  context: AgentContext,
  plan: RouterPlan,
): Promise<AgentRunResult> {
  const toolCalls = await runPlannedTools(env, context, plan);
  return {
    agent: 'analytics',
    plan,
    toolCalls,
    summary: summarize('analytics', plan, toolCalls),
  };
}

export async function runActionAgent(
  env: Env,
  context: AgentContext,
  plan: RouterPlan,
): Promise<AgentRunResult> {
  const toolCalls = await runPlannedTools(env, context, {
    ...plan,
    tools: ['preview_action'],
  });
  return {
    agent: 'action',
    plan,
    toolCalls,
    summary: summarize('action', plan, toolCalls),
  };
}

export async function runAutomationAgent(
  env: Env,
  context: AgentContext,
  plan: RouterPlan,
): Promise<AgentRunResult> {
  const toolCalls = await runPlannedTools(env, context, plan);
  return {
    agent: 'automation',
    plan,
    toolCalls,
    summary: summarize('automation', plan, toolCalls),
  };
}

export async function runInsightAgent(
  env: Env,
  context: AgentContext,
  plan: RouterPlan,
): Promise<AgentRunResult> {
  const toolCalls = await runPlannedTools(env, context, plan);
  return {
    agent: 'insight',
    plan,
    toolCalls,
    summary: summarize('insight', plan, toolCalls),
  };
}

export async function dispatchAgent(
  env: Env,
  context: AgentContext,
  plan: RouterPlan,
): Promise<AgentRunResult> {
  switch (plan.agent) {
    case 'analytics':
      return runAnalyticsAgent(env, context, plan);
    case 'action':
      return runActionAgent(env, context, plan);
    case 'automation':
      return runAutomationAgent(env, context, plan);
    case 'insight':
      return runInsightAgent(env, context, plan);
    case 'search':
    default:
      return runSearchAgent(env, context, plan);
  }
}
