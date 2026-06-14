import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import {
  generateWorkspaceInsights,
  getDailyBriefing,
  listInsights,
} from '../insights/service';

export async function handleInsightsList(
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

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');
  const items = await listInsights(env, authResult.id, { workspaceId });

  return successResponse({
    insights: items.map((insight) => ({
      id: insight.id,
      workspaceId: insight.workspaceId,
      insightType: insight.insightType,
      payload: insight.payload,
      createdAt: insight.createdAt,
      updatedAt: insight.updatedAt,
    })),
  });
}

export async function handleBriefing(
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

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId')?.trim();
  if (!workspaceId) {
    return errorResponse('workspaceId is required', 400);
  }

  const forceRefresh = url.searchParams.get('refresh') === 'true';
  const briefing = await getDailyBriefing(env, authResult.id, workspaceId, {
    forceRefresh,
  });

  return successResponse({
    blocks: briefing.blocks,
    refreshedAt: briefing.refreshedAt,
    workspaceId,
  });
}

export async function handleInsightsGenerate(
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

  let body: { workspaceId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const workspaceId = body.workspaceId?.trim();
  if (!workspaceId) {
    return errorResponse('workspaceId is required', 400);
  }

  const generated = await generateWorkspaceInsights(
    env,
    authResult.id,
    workspaceId,
  );

  return successResponse({
    insights: generated.map((insight) => ({
      id: insight.id,
      workspaceId: insight.workspaceId,
      insightType: insight.insightType,
      payload: insight.payload,
      createdAt: insight.createdAt,
      updatedAt: insight.updatedAt,
    })),
  });
}
