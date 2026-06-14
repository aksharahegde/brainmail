import { errorResponse } from './api-response';
import { resolveSessionUser, type SessionUser } from './session';

export type AuthenticatedRequest = Request & {
  authUser: SessionUser;
};

export async function requireAuth(
  request: Request,
  env: Env,
): Promise<SessionUser | Response> {
  const user = await resolveSessionUser(env, request);
  if (!user) {
    return errorResponse('Authentication required', 401);
  }

  return user;
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}
