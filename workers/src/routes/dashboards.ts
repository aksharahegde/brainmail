import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import {
  createDashboard,
  deleteDashboard,
  getDashboardForUser,
  listDashboards,
  listDashboardTemplates,
  refreshDashboard,
  updateDashboard,
} from '../dashboards/service';
import { isDashboardTemplateKey } from '../dashboards/types';

export async function handleDashboardTemplates(
  request: Request,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  return successResponse({ templates: listDashboardTemplates() });
}

export async function handleDashboardsList(
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
  const items = await listDashboards(env, authResult.id, { workspaceId });

  return successResponse({
    dashboards: items.map((dashboard) => ({
      id: dashboard.id,
      name: dashboard.name,
      workspaceId: dashboard.workspaceId,
      templateKey: dashboard.templateKey,
      refreshedAt: dashboard.refreshedAt,
      createdAt: dashboard.createdAt,
      updatedAt: dashboard.updatedAt,
    })),
  });
}

export async function handleDashboardCreate(
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

  let body: { name?: string; workspaceId?: string; templateKey?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const templateKey = body.templateKey?.trim() ?? 'custom';
  if (!isDashboardTemplateKey(templateKey)) {
    return errorResponse('Invalid dashboard template', 400);
  }

  const name = body.name?.trim();
  if (!name && templateKey === 'custom') {
    return errorResponse('Dashboard name is required', 400);
  }

  const dashboard = await createDashboard(env, authResult.id, {
    name: name ?? '',
    workspaceId: body.workspaceId?.trim(),
    templateKey,
  });

  return successResponse({ dashboard }, { status: 201 });
}

export async function handleDashboardDetail(
  request: Request,
  env: Env,
  dashboardId: string,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const dashboard = await getDashboardForUser(env, authResult.id, dashboardId);
  if (!dashboard) {
    return errorResponse('Dashboard not found', 404);
  }

  return successResponse({ dashboard });
}

export async function handleDashboardUpdate(
  request: Request,
  env: Env,
  dashboardId: string,
): Promise<Response> {
  if (request.method !== 'PATCH') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  let body: {
    name?: string;
    definition?: { blocks?: unknown[] };
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const dashboard = await updateDashboard(env, authResult.id, dashboardId, {
    name: body.name?.trim(),
    definition: body.definition
      ? {
          blocks: (body.definition.blocks ?? []) as Array<{
            id: string;
            type: string;
            data: Record<string, unknown>;
          }>,
        }
      : undefined,
  });

  if (!dashboard) {
    return errorResponse('Dashboard not found', 404);
  }

  return successResponse({ dashboard });
}

export async function handleDashboardRefresh(
  request: Request,
  env: Env,
  dashboardId: string,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const dashboard = await refreshDashboard(env, authResult.id, dashboardId);
  if (!dashboard) {
    return errorResponse('Dashboard not found', 404);
  }

  return successResponse({ dashboard });
}

export async function handleDashboardDelete(
  request: Request,
  env: Env,
  dashboardId: string,
): Promise<Response> {
  if (request.method !== 'DELETE') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const deleted = await deleteDashboard(env, authResult.id, dashboardId);
  if (!deleted) {
    return errorResponse('Dashboard not found', 404);
  }

  return successResponse({ deleted: true });
}

export async function handleDashboardRoutes(
  request: Request,
  env: Env,
  dashboardId: string,
): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname.endsWith('/refresh')) {
    return handleDashboardRefresh(request, env, dashboardId);
  }

  if (request.method === 'GET') {
    return handleDashboardDetail(request, env, dashboardId);
  }

  if (request.method === 'PATCH') {
    return handleDashboardUpdate(request, env, dashboardId);
  }

  if (request.method === 'DELETE') {
    return handleDashboardDelete(request, env, dashboardId);
  }

  return errorResponse('Method not allowed', 405);
}
