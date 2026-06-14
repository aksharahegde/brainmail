import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import {
  parseSearchLimit,
  parseSearchMode,
  runGlobalSearch,
} from '../search/service';

export async function handleGlobalSearch(
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
  const query = url.searchParams.get('q')?.trim();
  if (!query) {
    return errorResponse('Query parameter q is required', 400);
  }

  const mode = parseSearchMode(url.searchParams.get('mode'));
  const limit = parseSearchLimit(url.searchParams.get('limit'));
  const results = await runGlobalSearch(env, authResult.id, query, mode, limit);

  return successResponse(results);
}
