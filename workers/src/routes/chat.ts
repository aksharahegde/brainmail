import { createDb } from '@brainmail/db';
import { chatMessages, chatSessions } from '@brainmail/db/schema';
import { and, desc, eq } from 'drizzle-orm';

import { runAgentRuntime } from '../agents/runtime';
import { listRegisteredTools } from '../agents/tools/registry';
import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import { createId } from '../lib/crypto';

async function getOwnedSession(env: Env, userId: string, sessionId: string) {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
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

  let body: { sessionId?: string; message?: string };
  try {
    body = (await request.json()) as { sessionId?: string; message?: string };
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const message = body.message?.trim();
  if (!message) {
    return errorResponse('message is required', 400);
  }

  const db = createDb(env.DB);
  let sessionId = body.sessionId?.trim();

  if (sessionId) {
    const session = await getOwnedSession(env, authResult.id, sessionId);
    if (!session) {
      return errorResponse('Chat session not found', 404);
    }
  } else {
    sessionId = createId('chat_session');
    await db.insert(chatSessions).values({
      id: sessionId,
      userId: authResult.id,
      title: message.slice(0, 80),
    });
  }

  const userMessageId = createId('chat_message');
  await db.insert(chatMessages).values({
    id: userMessageId,
    sessionId,
    role: 'user',
    content: message,
  });

  const response = await runAgentRuntime(env, {
    userId: authResult.id,
    sessionId,
    message,
  });

  const assistantMessageId = createId('chat_message');
  await db.insert(chatMessages).values({
    id: assistantMessageId,
    sessionId,
    role: 'assistant',
    content: response.blocks[0]?.data.content?.toString() ?? 'Agent response',
    metadata: {
      agent: response.agent,
      plan: response.plan,
      toolCalls: response.toolCalls,
      blocks: response.blocks,
      artifact: response.artifact,
    },
  });

  return successResponse({
    sessionId,
    ...response,
  });
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
