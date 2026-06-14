const API_BASE = '/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type UIBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

export type ChatAgentResponse = {
  sessionId: string;
  blocks: UIBlock[];
  actions?: Array<{ id: string; label: string; type: string }>;
  artifact?: { id: string; type: string };
  plan: {
    intent: string;
    agent: string;
    entities: string[];
    tools: string[];
    expectedArtifact?: string;
  };
  agent: string;
  toolCalls: Array<{
    tool: string;
    input: Record<string, unknown>;
    output: unknown;
  }>;
};

export type ChatSessionSummary = {
  id: string;
  title: string | null;
  createdAt: string | null;
};

export type ChatMessage = {
  id: string;
  role: string | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
};

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  return (await response.json()) as ApiResponse<T>;
}

export async function sendChatMessage(input: {
  message: string;
  sessionId?: string;
}): Promise<ChatAgentResponse> {
  const result = await apiFetch<ChatAgentResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to send chat message');
  }

  return result.data;
}

export async function listChatSessions(): Promise<{
  sessions: ChatSessionSummary[];
}> {
  const result = await apiFetch<{ sessions: ChatSessionSummary[] }>(
    '/chat/sessions',
  );

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load chat sessions');
  }

  return result.data;
}

export async function createChatSession(
  title?: string,
): Promise<{ id: string }> {
  const result = await apiFetch<{ id: string }>('/chat/session', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to create chat session');
  }

  return result.data;
}

export async function getChatSession(sessionId: string): Promise<{
  session: ChatSessionSummary;
  messages: ChatMessage[];
}> {
  const result = await apiFetch<{
    session: ChatSessionSummary;
    messages: ChatMessage[];
  }>(`/chat/session/${sessionId}`);

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load chat session');
  }

  return result.data;
}
