import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import {
  createOAuthAuthorizationUrl,
  disconnectAccount,
  handleGoogleOAuthCallback,
  listUserAccounts,
} from '../lib/google-oauth';
import {
  buildSessionCookie,
  clearSessionCookie,
  createUserSession,
  revokeSession,
} from '../lib/session';

function getAppUrl(env: Env): string {
  return env.APP_URL ?? 'http://localhost:3000';
}

export async function handleAuthLogin(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const url = await createOAuthAuthorizationUrl(env, {
      provider: 'google',
      purpose: 'login',
    });
    return successResponse({ url });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Unable to start login',
      500,
    );
  }
}

export async function handleAuthCallback(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    return Response.redirect(
      `${getAppUrl(env)}/login?error=${encodeURIComponent(oauthError)}`,
      302,
    );
  }

  if (!code || !state) {
    return Response.redirect(`${getAppUrl(env)}/login?error=missing_code`, 302);
  }

  try {
    const result = await handleGoogleOAuthCallback(env, code, state);

    if (result.purpose === 'connect') {
      return Response.redirect(
        `${getAppUrl(env)}/workspaces/startup/settings?connected=true`,
        302,
      );
    }

    const session = await createUserSession(env, result.userId);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${getAppUrl(env)}/workspaces`,
        'Set-Cookie': buildSessionCookie(
          session.token,
          session.expiresAt,
          getAppUrl(env),
        ),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'OAuth callback failed';
    return Response.redirect(
      `${getAppUrl(env)}/login?error=${encodeURIComponent(message)}`,
      302,
    );
  }
}

export async function handleAuthMe(
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

  return successResponse({
    id: authResult.id,
    email: authResult.email,
    name: authResult.name,
  });
}

export async function handleAuthLogout(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  await revokeSession(env, request);

  return successResponse(
    { loggedOut: true },
    {
      headers: {
        'Set-Cookie': clearSessionCookie(),
      },
    },
  );
}

export async function handleAccountsList(
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

  const accounts = await listUserAccounts(env, authResult.id);
  return successResponse({ accounts });
}

export async function handleAccountsConnect(
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

  let provider = 'gmail';
  try {
    const body = (await request.json()) as { provider?: string };
    if (body.provider) {
      provider = body.provider;
    }
  } catch {
    return errorResponse('Invalid JSON body');
  }

  try {
    const url = await createOAuthAuthorizationUrl(env, {
      provider,
      purpose: 'connect',
      userId: authResult.id,
    });
    return successResponse({ url });
  } catch (error) {
    return errorResponse(
      error instanceof Error
        ? error.message
        : 'Unable to start account linking',
      500,
    );
  }
}

export async function handleAccountsDisconnect(
  request: Request,
  env: Env,
  accountId: string,
): Promise<Response> {
  if (request.method !== 'DELETE') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const removed = await disconnectAccount(env, authResult.id, accountId);
  if (!removed) {
    return errorResponse('Account not found', 404);
  }

  return successResponse({ disconnected: true });
}
