import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import {
  getSubscriptionForUser,
  ignoreSubscription,
  listSubscriptions,
} from '../subscriptions/service';

export async function handleSubscriptionsList(
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
  const includeIgnored = url.searchParams.get('includeIgnored') === 'true';
  const result = await listSubscriptions(env, authResult.id, {
    workspaceId,
    includeIgnored,
  });

  return successResponse(result);
}

export async function handleSubscriptionRoutes(
  request: Request,
  env: Env,
  subscriptionId: string,
): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  const isIgnoreRoute = pathname.endsWith('/ignore');

  if (isIgnoreRoute && request.method === 'POST') {
    const authResult = await requireAuth(request, env);
    if (isResponse(authResult)) {
      return authResult;
    }

    const subscription = await ignoreSubscription(
      env,
      authResult.id,
      subscriptionId,
    );

    if (!subscription) {
      return errorResponse('Subscription not found', 404);
    }

    return successResponse({ subscription });
  }

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const subscription = await getSubscriptionForUser(
    env,
    authResult.id,
    subscriptionId,
  );

  if (!subscription) {
    return errorResponse('Subscription not found', 404);
  }

  return successResponse({ subscription });
}
