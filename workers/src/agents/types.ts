export type AgentType =
  | 'search'
  | 'analytics'
  | 'action'
  | 'automation'
  | 'insight';

export type RouterPlan = {
  intent: string;
  agent: AgentType;
  entities: string[];
  tools: string[];
  expectedArtifact?: string;
};

export type UIBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

export type UIAction = {
  id: string;
  label: string;
  type: string;
};

export type ArtifactReference = {
  id: string;
  type: string;
};

export type ToolCallResult = {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
};

export type AgentContext = {
  userId: string;
  sessionId: string;
  message: string;
};

export type AgentRunResult = {
  agent: AgentType;
  plan: RouterPlan;
  toolCalls: ToolCallResult[];
  summary: string;
};

export type UIResponse = {
  blocks: UIBlock[];
  actions?: UIAction[];
  artifact?: ArtifactReference;
  plan: RouterPlan;
  agent: AgentType;
  toolCalls: ToolCallResult[];
};

export type ToolDefinition = {
  name: string;
  description: string;
  agents: AgentType[];
  execute: (
    env: Env,
    context: AgentContext,
    input: Record<string, unknown>,
  ) => Promise<unknown>;
};
