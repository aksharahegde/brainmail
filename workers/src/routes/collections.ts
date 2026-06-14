import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import {
  acceptCollectionSuggestion,
  addCollectionMember,
  createCollection,
  deleteCollection,
  dismissCollectionSuggestion,
  getCollectionDetail,
  listCollectionSuggestions,
  listCollections,
  removeCollectionMember,
  updateCollection,
} from '../collections/service';
import { isCollectionStatus, isCollectionType } from '../collections/types';

export async function handleCollectionsList(
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
  const status = url.searchParams.get('status');
  const collectionType = url.searchParams.get('type');

  if (status && !isCollectionStatus(status)) {
    return errorResponse('Invalid collection status', 400);
  }

  if (collectionType && !isCollectionType(collectionType)) {
    return errorResponse('Invalid collection type', 400);
  }

  const items = await listCollections(env, authResult.id, {
    workspaceId,
    status,
    collectionType,
  });

  return successResponse({
    collections: items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      workspaceId: item.workspaceId,
      collectionType: item.collectionType,
      status: item.status,
      memberCount: item.memberCount,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  });
}

export async function handleCollectionCreate(
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

  let body: {
    name?: string;
    description?: string;
    workspaceId?: string;
    collectionType?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const name = body.name?.trim();
  if (!name) {
    return errorResponse('Collection name is required', 400);
  }

  if (body.collectionType && !isCollectionType(body.collectionType)) {
    return errorResponse('Invalid collection type', 400);
  }

  const collection = await createCollection(env, authResult.id, {
    name,
    description: body.description?.trim(),
    workspaceId: body.workspaceId?.trim(),
    collectionType: body.collectionType,
  });

  return successResponse({ collection }, { status: 201 });
}

export async function handleCollectionSuggestions(
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

  const suggestions = await listCollectionSuggestions(
    env,
    authResult.id,
    workspaceId,
  );

  return successResponse({ suggestions });
}

export async function handleCollectionSuggestionAccept(
  request: Request,
  env: Env,
  collectionId: string,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const collection = await acceptCollectionSuggestion(
    env,
    authResult.id,
    collectionId,
  );

  if (!collection) {
    return errorResponse('Suggestion not found', 404);
  }

  return successResponse({ collection });
}

export async function handleCollectionSuggestionDismiss(
  request: Request,
  env: Env,
  collectionId: string,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const dismissed = await dismissCollectionSuggestion(
    env,
    authResult.id,
    collectionId,
  );

  if (!dismissed) {
    return errorResponse('Suggestion not found', 404);
  }

  return successResponse({ dismissed: true });
}

export async function handleCollectionDetail(
  request: Request,
  env: Env,
  collectionId: string,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const detail = await getCollectionDetail(env, authResult.id, collectionId);
  if (!detail) {
    return errorResponse('Collection not found', 404);
  }

  return successResponse(detail);
}

export async function handleCollectionUpdate(
  request: Request,
  env: Env,
  collectionId: string,
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
    description?: string;
    workspaceId?: string;
    status?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (body.status && !isCollectionStatus(body.status)) {
    return errorResponse('Invalid collection status', 400);
  }

  const collection = await updateCollection(env, authResult.id, collectionId, {
    name: body.name?.trim(),
    description: body.description?.trim(),
    workspaceId: body.workspaceId?.trim(),
    status: body.status,
  });

  if (!collection) {
    return errorResponse('Collection not found', 404);
  }

  return successResponse({ collection });
}

export async function handleCollectionDelete(
  request: Request,
  env: Env,
  collectionId: string,
): Promise<Response> {
  if (request.method !== 'DELETE') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const deleted = await deleteCollection(env, authResult.id, collectionId);
  if (!deleted) {
    return errorResponse('Collection not found or cannot be deleted', 404);
  }

  return successResponse({ deleted: true });
}

export async function handleCollectionMemberAdd(
  request: Request,
  env: Env,
  collectionId: string,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  let body: { entityId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const entityId = body.entityId?.trim();
  if (!entityId) {
    return errorResponse('entityId is required', 400);
  }

  const added = await addCollectionMember(
    env,
    authResult.id,
    collectionId,
    entityId,
  );

  if (!added) {
    return errorResponse('Collection or entity not found', 404);
  }

  return successResponse({ added: true }, { status: 201 });
}

export async function handleCollectionMemberRemove(
  request: Request,
  env: Env,
  collectionId: string,
  entityId: string,
): Promise<Response> {
  if (request.method !== 'DELETE') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const removed = await removeCollectionMember(
    env,
    authResult.id,
    collectionId,
    entityId,
  );

  if (!removed) {
    return errorResponse('Collection not found', 404);
  }

  return successResponse({ removed: true });
}

export async function handleCollectionRoutes(
  request: Request,
  env: Env,
  collectionId: string,
): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  const memberMatch = pathname.match(
    /^\/api\/v1\/collections\/([^/]+)\/members\/([^/]+)$/,
  );
  if (memberMatch) {
    return handleCollectionMemberRemove(
      request,
      env,
      collectionId,
      memberMatch[2],
    );
  }

  if (pathname.endsWith('/members')) {
    return handleCollectionMemberAdd(request, env, collectionId);
  }

  const acceptMatch = pathname.match(
    /^\/api\/v1\/collections\/([^/]+)\/suggestions\/accept$/,
  );
  if (acceptMatch) {
    return handleCollectionSuggestionAccept(request, env, collectionId);
  }

  const dismissMatch = pathname.match(
    /^\/api\/v1\/collections\/([^/]+)\/suggestions\/dismiss$/,
  );
  if (dismissMatch) {
    return handleCollectionSuggestionDismiss(request, env, collectionId);
  }

  if (request.method === 'GET') {
    return handleCollectionDetail(request, env, collectionId);
  }

  if (request.method === 'PATCH') {
    return handleCollectionUpdate(request, env, collectionId);
  }

  if (request.method === 'DELETE') {
    return handleCollectionDelete(request, env, collectionId);
  }

  return errorResponse('Method not allowed', 405);
}
