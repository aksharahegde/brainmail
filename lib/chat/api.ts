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

export type SessionMemory = {
  recentMessages: Array<{ role: string; content: string }>;
  lastAgent: string | null;
  lastArtifactId: string | null;
  lastIntent: string | null;
  entities: string[];
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

function parseSseChunk(
  chunk: string,
  onEvent: (event: string, data: unknown) => void,
) {
  const events = chunk.split('\n\n').filter(Boolean);
  for (const entry of events) {
    const lines = entry.split('\n');
    let eventName = 'message';
    let dataLine = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      }
      if (line.startsWith('data:')) {
        dataLine = line.slice(5).trim();
      }
    }

    if (!dataLine) {
      continue;
    }

    try {
      onEvent(eventName, JSON.parse(dataLine));
    } catch {
      onEvent(eventName, dataLine);
    }
  }
}

export async function sendChatMessage(input: {
  message: string;
  sessionId?: string;
  workspaceId?: string;
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

export async function streamChatMessage(input: {
  message: string;
  sessionId?: string;
  workspaceId?: string;
  onEvent: (event: string, data: unknown) => void;
}): Promise<ChatAgentResponse> {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      message: input.message,
      sessionId: input.sessionId,
      workspaceId: input.workspaceId,
    }),
  });

  if (!response.ok) {
    let errorMessage = 'Unable to stream chat response';
    try {
      const payload = (await response.json()) as ApiResponse<unknown>;
      errorMessage = payload.error ?? errorMessage;
    } catch {
      // Ignore JSON parse errors for non-JSON responses.
    }
    throw new Error(errorMessage);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Streaming is not supported in this browser');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finalPayload: ChatAgentResponse | null = null;
  const blocks: UIBlock[] = [];
  let sessionId = input.sessionId ?? '';
  let artifact: ChatAgentResponse['artifact'];
  let plan: ChatAgentResponse['plan'] | null = null;
  let agent = 'search';
  const toolCalls: ChatAgentResponse['toolCalls'] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lastBreak = buffer.lastIndexOf('\n\n');
    if (lastBreak === -1) {
      continue;
    }

    const chunk = buffer.slice(0, lastBreak + 2);
    buffer = buffer.slice(lastBreak + 2);

    parseSseChunk(chunk, (event, data) => {
      input.onEvent(event, data);

      if (event === 'session' && data && typeof data === 'object') {
        const payload = data as { sessionId?: string };
        if (payload.sessionId) {
          sessionId = payload.sessionId;
        }
      }

      if (event === 'plan' && data && typeof data === 'object') {
        const payload = data as ChatAgentResponse['plan'] & { agent?: string };
        plan = {
          intent: payload.intent,
          agent: payload.agent ?? 'search',
          entities: payload.entities ?? [],
          tools: payload.tools ?? [],
          expectedArtifact: payload.expectedArtifact,
        };
        agent = payload.agent ?? 'search';
      }

      if (event === 'block' && data && typeof data === 'object') {
        blocks.push(data as UIBlock);
      }

      if (event === 'artifact' && data && typeof data === 'object') {
        artifact = data as ChatAgentResponse['artifact'];
      }

      if (event === 'error' && data && typeof data === 'object') {
        const payload = data as { message?: string };
        throw new Error(payload.message ?? 'Chat stream failed');
      }
    });
  }

  if (buffer.trim()) {
    parseSseChunk(buffer, input.onEvent);
  }

  finalPayload = {
    sessionId,
    blocks,
    artifact,
    plan: plan ?? {
      intent: 'streamed',
      agent,
      entities: [],
      tools: [],
    },
    agent,
    toolCalls,
  };

  return finalPayload;
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
  memory: SessionMemory;
}> {
  const result = await apiFetch<{
    session: ChatSessionSummary;
    messages: ChatMessage[];
    memory: SessionMemory;
  }>(`/chat/session/${sessionId}`);

  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Unable to load chat session');
  }

  return result.data;
}
