import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import { listGmailSyncStatusForUser } from '../lib/gmail/sync-state';
import { enqueueGmailSync } from '../lib/gmail/sync';

export async function handleSyncStatus(
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

  const accounts = await listGmailSyncStatusForUser(env, authResult.id);
  return successResponse({ accounts });
}

export async function handleSyncTrigger(
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

  let accountId: string | undefined;
  try {
    const body = (await request.json()) as { accountId?: string };
    accountId = body.accountId;
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (!accountId) {
    return errorResponse('accountId is required');
  }

  try {
    await enqueueGmailSync(env, accountId, authResult.id, 'incremental');
    return successResponse({ queued: true });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Unable to queue Gmail sync',
      500,
    );
  }
}
