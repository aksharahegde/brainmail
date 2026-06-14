import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaceDetail,
  listWorkspaces,
  runWorkspaceSearch,
  updateWorkspace,
} from '../workspaces/service';

export async function handleWorkspacesList(
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

  const workspaces = await listWorkspaces(env, authResult.id);
  return successResponse({ workspaces });
}

export async function handleWorkspaceCreate(
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

  let body: { name?: string; description?: string; workspaceType?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const name = body.name?.trim();
  if (!name) {
    return errorResponse('Workspace name is required', 400);
  }

  const workspace = await createWorkspace(env, authResult.id, {
    name,
    description: body.description?.trim(),
    workspaceType: body.workspaceType?.trim(),
  });

  return successResponse({ workspace }, { status: 201 });
}

export async function handleWorkspaceDetail(
  request: Request,
  env: Env,
  workspaceId: string,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const detail = await getWorkspaceDetail(env, authResult.id, workspaceId);
  if (!detail) {
    return errorResponse('Workspace not found', 404);
  }

  return successResponse(detail);
}

export async function handleWorkspaceUpdate(
  request: Request,
  env: Env,
  workspaceId: string,
): Promise<Response> {
  if (request.method !== 'PATCH') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  let body: { name?: string; description?: string; workspaceType?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const workspace = await updateWorkspace(env, authResult.id, workspaceId, {
    name: body.name?.trim(),
    description: body.description?.trim(),
    workspaceType: body.workspaceType?.trim(),
  });

  if (!workspace) {
    return errorResponse('Workspace not found', 404);
  }

  return successResponse({ workspace });
}

export async function handleWorkspaceDelete(
  request: Request,
  env: Env,
  workspaceId: string,
): Promise<Response> {
  if (request.method !== 'DELETE') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const deleted = await deleteWorkspace(env, authResult.id, workspaceId);
  if (!deleted) {
    return errorResponse('Workspace not found or cannot be deleted', 404);
  }

  return successResponse({ deleted: true });
}

export async function handleWorkspaceSearch(
  request: Request,
  env: Env,
  workspaceId: string,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim();
  if (!query) {
    return errorResponse('Search query is required', 400);
  }

  const results = await runWorkspaceSearch(
    env,
    authResult.id,
    workspaceId,
    query,
  );

  if (!results) {
    return errorResponse('Workspace not found', 404);
  }

  return successResponse(results);
}

export async function handleWorkspaceRoutes(
  request: Request,
  env: Env,
  workspaceId: string,
): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname.endsWith('/search')) {
    return handleWorkspaceSearch(request, env, workspaceId);
  }

  if (request.method === 'GET') {
    return handleWorkspaceDetail(request, env, workspaceId);
  }

  if (request.method === 'PATCH') {
    return handleWorkspaceUpdate(request, env, workspaceId);
  }

  if (request.method === 'DELETE') {
    return handleWorkspaceDelete(request, env, workspaceId);
  }

  return errorResponse('Method not allowed', 405);
}
