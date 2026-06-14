import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import { buildArtifactExport } from '../artifacts/service';
import {
  createArtifact,
  deleteArtifact,
  getArtifactForUser,
  getSharedArtifact,
  listArtifacts,
  shareArtifact,
} from '../artifacts/service';
import { isArtifactType } from '../artifacts/types';

export async function handleArtifactsList(
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
  const artifactType = url.searchParams.get('type');
  const workspaceId = url.searchParams.get('workspaceId');

  if (artifactType && !isArtifactType(artifactType)) {
    return errorResponse('Invalid artifact type', 400);
  }

  const items = await listArtifacts(env, authResult.id, {
    artifactType,
    workspaceId,
  });

  return successResponse({
    artifacts: items.map((artifact) => ({
      id: artifact.id,
      artifactType: artifact.artifactType,
      title: artifact.title,
      workspaceId: artifact.workspaceId,
      createdBy: artifact.createdBy,
      shareToken: artifact.shareToken,
      sharedAt: artifact.sharedAt,
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt,
    })),
  });
}

export async function handleArtifactCreate(
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
    artifactType?: string;
    title?: string;
    payload?: Record<string, unknown>;
    workspaceId?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const artifactType = body.artifactType?.trim();
  const title = body.title?.trim();

  if (!artifactType || !isArtifactType(artifactType)) {
    return errorResponse('artifactType is required', 400);
  }

  if (!title) {
    return errorResponse('title is required', 400);
  }

  if (!body.payload || typeof body.payload !== 'object') {
    return errorResponse('payload is required', 400);
  }

  const artifact = await createArtifact(env, authResult.id, {
    artifactType,
    title,
    payload: body.payload,
    workspaceId: body.workspaceId,
    createdBy: 'user',
  });

  return successResponse({ artifact });
}

export async function handleArtifactDetail(
  request: Request,
  env: Env,
  artifactId: string,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const artifact = await getArtifactForUser(env, authResult.id, artifactId);
  if (!artifact) {
    return errorResponse('Artifact not found', 404);
  }

  return successResponse({ artifact });
}

export async function handleArtifactDelete(
  request: Request,
  env: Env,
  artifactId: string,
): Promise<Response> {
  if (request.method !== 'DELETE') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const deleted = await deleteArtifact(env, authResult.id, artifactId);
  if (!deleted) {
    return errorResponse('Artifact not found', 404);
  }

  return successResponse({ deleted: true });
}

export async function handleArtifactShare(
  request: Request,
  env: Env,
  artifactId: string,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const share = await shareArtifact(env, authResult.id, artifactId);
  if (!share) {
    return errorResponse('Artifact not found', 404);
  }

  const origin = new URL(request.url).origin;

  return successResponse({
    shareToken: share.shareToken,
    sharedAt: share.sharedAt,
    shareUrl: `${origin}/api/v1/artifacts/shared/${share.shareToken}`,
  });
}

export async function handleArtifactShared(
  request: Request,
  env: Env,
  shareToken: string,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const artifact = await getSharedArtifact(env, shareToken);
  if (!artifact) {
    return errorResponse('Shared artifact not found', 404);
  }

  return successResponse({ artifact });
}

export async function handleArtifactExport(
  request: Request,
  env: Env,
  artifactId: string,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  let body: { format?: string };
  try {
    body = (await request.json()) as { format?: string };
  } catch {
    body = {};
  }

  const format = body.format === 'csv' ? 'csv' : 'json';
  const artifact = await getArtifactForUser(env, authResult.id, artifactId);
  if (!artifact) {
    return errorResponse('Artifact not found', 404);
  }

  const exported = buildArtifactExport(artifact, format);

  return new Response(exported.body, {
    headers: {
      'Content-Type': exported.contentType,
      'Content-Disposition': `attachment; filename="${exported.filename}"`,
    },
  });
}
