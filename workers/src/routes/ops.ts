import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import { getOpsMetrics, getOpsStatus } from '../ops/service';
import { recordAnalyticsEvent } from '../ops/telemetry';

export async function handleOpsStatus(
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

  const status = await getOpsStatus(env);

  await recordAnalyticsEvent(env, {
    name: 'ops.status_viewed',
    userId: authResult.id,
  });

  return successResponse({ status });
}

export async function handleOpsMetrics(
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

  const metrics = await getOpsMetrics(env, authResult.id);
  return successResponse({ metrics });
}
