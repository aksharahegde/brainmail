import { errorResponse } from '../lib/api-response';
import {
  handleAccountsConnect,
  handleAccountsDisconnect,
  handleAccountsList,
  handleAuthCallback,
  handleAuthLogin,
  handleAuthLogout,
  handleAuthMe,
} from './auth';
import { handleSyncStatus, handleSyncTrigger } from './sync';
import { handleGmailWebhook } from './webhooks';
import { handleEmailDetail, handleEmailsList } from './emails';

export async function handleApiRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === '/api/v1/auth/login') {
    return handleAuthLogin(request, env);
  }

  if (pathname === '/api/v1/auth/google/callback') {
    return handleAuthCallback(request, env);
  }

  if (pathname === '/api/v1/auth/me') {
    return handleAuthMe(request, env);
  }

  if (pathname === '/api/v1/auth/logout') {
    return handleAuthLogout(request, env);
  }

  if (pathname === '/api/v1/accounts') {
    return handleAccountsList(request, env);
  }

  if (pathname === '/api/v1/accounts/connect') {
    return handleAccountsConnect(request, env);
  }

  const accountMatch = pathname.match(/^\/api\/v1\/accounts\/([^/]+)$/);
  if (accountMatch) {
    return handleAccountsDisconnect(request, env, accountMatch[1]);
  }

  if (pathname === '/api/v1/sync/status') {
    return handleSyncStatus(request, env);
  }

  if (pathname === '/api/v1/sync/trigger') {
    return handleSyncTrigger(request, env);
  }

  if (pathname === '/api/v1/webhooks/gmail') {
    return handleGmailWebhook(request, env);
  }

  if (pathname === '/api/v1/emails') {
    return handleEmailsList(request, env);
  }

  const emailMatch = pathname.match(/^\/api\/v1\/emails\/([^/]+)$/);
  if (emailMatch) {
    return handleEmailDetail(request, env, emailMatch[1]);
  }

  return errorResponse('Not found', 404);
}
