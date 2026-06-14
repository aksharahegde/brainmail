import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import { deleteUserAccount, previewAccountDeletion } from '../account/deletion';
import { clearSessionCookie } from '../lib/session';

export async function handleAccountDeletePreview(
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

  const preview = await previewAccountDeletion(env, authResult.id);
  if (!preview) {
    return errorResponse('User not found', 404);
  }

  return successResponse({ preview });
}

export async function handleAccountDelete(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'DELETE') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  let confirmation = '';
  try {
    const body = (await request.json()) as { confirmation?: string };
    confirmation = body.confirmation?.trim() ?? '';
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!confirmation) {
    return errorResponse('Confirmation is required', 400);
  }

  try {
    const result = await deleteUserAccount(env, authResult.id, confirmation);
    return successResponse(result, {
      headers: {
        'Set-Cookie': clearSessionCookie(),
      },
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Unable to delete account',
      400,
    );
  }
}
