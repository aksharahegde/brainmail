import type { AgentType, RouterPlan } from './types';

const ROUTER_MODEL = '@cf/meta/llama-3.1-8b-instruct';

const SEARCH_PATTERNS = [
  /\b(search|find|show|list|look up|what emails)\b/i,
  /\bwho (emailed|sent|wrote)\b/i,
];

const ANALYTICS_PATTERNS = [
  /\b(spend|spent|total|how much|sum|average|count|expense|cost)\b/i,
  /\binvoices?\b/i,
];

const AUTOMATION_PATTERNS = [
  /\b(automate|automation|rule|when\b.+\bthen)\b/i,
  /\bcreate (a )?filter\b/i,
];

const ACTION_PATTERNS = [/\b(archive|delete|mark|move|send|unsubscribe)\b/i];

const INSIGHT_PATTERNS = [
  /\b(insight|briefing|recommend|suggestion|trend|summary)\b/i,
];

function extractEntities(message: string): string[] {
  const entities: string[] = [];
  const quoted = message.match(/"([^"]+)"/g) ?? [];
  for (const value of quoted) {
    entities.push(value.replace(/"/g, ''));
  }

  const capitalized = message.match(/\b([A-Z][a-zA-Z0-9._-]{1,30})\b/g);
  if (capitalized) {
    for (const value of capitalized.slice(0, 5)) {
      if (!entities.includes(value)) {
        entities.push(value);
      }
    }
  }

  return entities;
}

function heuristicRoute(message: string): RouterPlan {
  const trimmed = message.trim();
  const entities = extractEntities(trimmed);

  if (AUTOMATION_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      intent: 'automation_planning',
      agent: 'automation',
      entities,
      tools: ['list_automations'],
      expectedArtifact: 'automation_preview',
    };
  }

  if (ACTION_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      intent: 'action_preview',
      agent: 'action',
      entities,
      tools: ['preview_action'],
      expectedArtifact: 'confirmation',
    };
  }

  if (ANALYTICS_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      intent: 'analytics_query',
      agent: 'analytics',
      entities,
      tools: ['aggregate_spending', 'search_invoices', 'search_emails'],
      expectedArtifact: 'table',
    };
  }

  if (INSIGHT_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      intent: 'insight_generation',
      agent: 'insight',
      entities,
      tools: ['list_insights', 'search_entities', 'search_emails'],
      expectedArtifact: 'insight_card',
    };
  }

  if (SEARCH_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      intent: 'information_retrieval',
      agent: 'search',
      entities,
      tools: ['search_emails', 'search_entities'],
      expectedArtifact: 'email_list',
    };
  }

  return {
    intent: 'general_search',
    agent: 'search',
    entities,
    tools: ['search_emails', 'search_entities'],
    expectedArtifact: 'email_list',
  };
}

function extractJsonObject<T>(text: string): T | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

const AGENT_TYPES: AgentType[] = [
  'search',
  'analytics',
  'action',
  'automation',
  'insight',
];

export async function routeMessage(
  env: Env,
  message: string,
  memory?: {
    lastAgent?: AgentType | null;
    entities?: string[];
  },
): Promise<RouterPlan> {
  if (
    memory?.lastAgent &&
    /\b(that|those|it|same|again|more)\b/i.test(message)
  ) {
    const plan = heuristicRoute(message);
    return {
      ...plan,
      agent: memory.lastAgent,
      entities: memory.entities?.length ? memory.entities : plan.entities,
      intent: 'follow_up',
    };
  }

  if (!env.AI) {
    return heuristicRoute(message);
  }

  try {
    const response = await env.AI.run(ROUTER_MODEL, {
      messages: [
        {
          role: 'system',
          content:
            'Route the user query to one agent. Return JSON only: {"intent":"analytics_query","agent":"analytics","entities":["OpenAI"],"tools":["aggregate_spending"],"expectedArtifact":"table"}. Allowed agents: search, analytics, action, automation, insight.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 180,
    });

    const text =
      typeof response === 'object' &&
      response &&
      'response' in response &&
      typeof response.response === 'string'
        ? response.response
        : JSON.stringify(response);

    const parsed = extractJsonObject<RouterPlan>(text);
    if (parsed && AGENT_TYPES.includes(parsed.agent) && parsed.tools?.length) {
      return {
        intent: parsed.intent ?? 'routed',
        agent: parsed.agent,
        entities: parsed.entities ?? [],
        tools: parsed.tools,
        expectedArtifact: parsed.expectedArtifact,
      };
    }
  } catch {
    // Fall back to heuristics when Workers AI is unavailable locally.
  }

  return heuristicRoute(message);
}
