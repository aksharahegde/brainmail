import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import { listAuditLogs } from '../audit/service';

export async function handleAuditList(
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
  const limit = Number(url.searchParams.get('limit') ?? '50');
  const action = url.searchParams.get('action') ?? undefined;

  const logs = await listAuditLogs(env, authResult.id, {
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50,
    action,
  });

  return successResponse({ logs });
}
