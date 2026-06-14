import { createDb } from '@brainmail/db';
import { chatMessages, chatSessions } from '@brainmail/db/schema';
import { and, desc, eq } from 'drizzle-orm';

import { runAgentRuntime } from '../agents/runtime';
import { listRegisteredTools } from '../agents/tools/registry';
import { buildChatStreamEvents, createChatStream } from '../chat/stream';
import { loadSessionMemory, saveSessionMemory } from '../chat/session-memory';
import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import { createId } from '../lib/crypto';

type ChatRequestBody = {
  sessionId?: string;
  message?: string;
  workspaceId?: string;
};

function getAssistantContent(
  blocks: Array<{ type: string; data: Record<string, unknown> }>,
): string {
  const markdown = blocks.find(
    (block) =>
      block.type === 'markdown' && typeof block.data.content === 'string',
  );
  if (markdown) {
    return String(markdown.data.content);
  }
  return 'Agent response';
}

async function getOwnedSession(env: Env, userId: string, sessionId: string) {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}

async function ensureChatSession(
  env: Env,
  userId: string,
  sessionId: string | undefined,
  message: string,
) {
  const db = createDb(env.DB);
  let activeSessionId = sessionId?.trim();

  if (activeSessionId) {
    const session = await getOwnedSession(env, userId, activeSessionId);
    if (!session) {
      throw new Error('Chat session not found');
    }
  } else {
    activeSessionId = createId('chat_session');
    await db.insert(chatSessions).values({
      id: activeSessionId,
      userId,
      title: message.slice(0, 80),
    });
  }

  return activeSessionId;
}

async function persistChatExchange(
  env: Env,
  input: {
    userId: string;
    sessionId: string;
    message: string;
    workspaceId?: string | null;
  },
) {
  const db = createDb(env.DB);
  const memory = await loadSessionMemory(env, input.sessionId);

  await db.insert(chatMessages).values({
    id: createId('chat_message'),
    sessionId: input.sessionId,
    role: 'user',
    content: input.message,
  });

  const response = await runAgentRuntime(env, {
    userId: input.userId,
    sessionId: input.sessionId,
    message: input.message,
    workspaceId: input.workspaceId ?? null,
    memory: {
      recentMessages: memory.recentMessages,
      lastAgent: memory.lastAgent,
      lastArtifactId: memory.lastArtifactId,
      entities: memory.entities,
    },
  });

  const assistantMessageId = createId('chat_message');
  await db.insert(chatMessages).values({
    id: assistantMessageId,
    sessionId: input.sessionId,
    role: 'assistant',
    content: getAssistantContent(response.blocks),
    metadata: {
      agent: response.agent,
      plan: response.plan,
      toolCalls: response.toolCalls,
      blocks: response.blocks,
      artifact: response.artifact,
    },
  });

  await saveSessionMemory(
    env,
    input.sessionId,
    response,
    input.workspaceId ?? null,
  );

  return {
    assistantMessageId,
    response,
  };
}

export async function handleChatMessage(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const message = body.message?.trim();
  if (!message) {
    return errorResponse('message is required', 400);
  }

  try {
    const sessionId = await ensureChatSession(
      env,
      authResult.id,
      body.sessionId,
      message,
    );
    const { response } = await persistChatExchange(env, {
      userId: authResult.id,
      sessionId,
      message,
      workspaceId: body.workspaceId,
    });

    return successResponse({
      sessionId,
      ...response,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Chat request failed';
    return errorResponse(errorMessage, 400);
  }
}

export async function handleChatStream(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const message = body.message?.trim();
  if (!message) {
    return errorResponse('message is required', 400);
  }

  try {
    const sessionId = await ensureChatSession(
      env,
      authResult.id,
      body.sessionId,
      message,
    );
    const { assistantMessageId, response } = await persistChatExchange(env, {
      userId: authResult.id,
      sessionId,
      message,
      workspaceId: body.workspaceId,
    });

    const stream = createChatStream(
      buildChatStreamEvents({
        sessionId,
        response,
        assistantMessageId,
      }),
    );

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Chat stream failed';
    return errorResponse(errorMessage, 400);
  }
}

export async function handleChatSessionsList(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, authResult.id))
    .orderBy(desc(chatSessions.createdAt))
    .limit(50);

  return successResponse({
    sessions: rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.createdAt,
    })),
  });
}

export async function handleChatSessionCreate(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  let body: { title?: string } = {};
  try {
    body = (await request.json()) as { title?: string };
  } catch {
    body = {};
  }

  const db = createDb(env.DB);
  const sessionId = createId('chat_session');
  await db.insert(chatSessions).values({
    id: sessionId,
    userId: authResult.id,
    title: body.title?.trim() || 'New chat',
  });

  return successResponse({ id: sessionId });
}

export async function handleChatSessionDetail(
  request: Request,
  env: Env,
  sessionId: string,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const session = await getOwnedSession(env, authResult.id, sessionId);
  if (!session) {
    return errorResponse('Chat session not found', 404);
  }

  const db = createDb(env.DB);
  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt);

  const memory = await loadSessionMemory(env, sessionId);

  return successResponse({
    session: {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
    },
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      metadata: message.metadata,
      createdAt: message.createdAt,
    })),
    memory,
  });
}

export async function handleAgentToolsList(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  return successResponse({
    tools: listRegisteredTools(),
  });
}
