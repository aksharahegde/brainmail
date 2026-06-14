import { errorResponse, successResponse } from '../lib/api-response';
import { findGmailAccountByEmail } from '../lib/gmail/sync-state';
import { enqueueGmailSync } from '../lib/gmail/sync';
import { enforceRateLimit } from '../lib/rate-limit';
import { verifyGmailPubSubRequest } from '../lib/pubsub-auth';

type PubSubPushBody = {
  message?: {
    data?: string;
    messageId?: string;
  };
  subscription?: string;
};

type GmailPushData = {
  emailAddress?: string;
  historyId?: string;
};

export async function handleGmailWebhook(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const authorized = await verifyGmailPubSubRequest(request, env);
  if (!authorized) {
    return errorResponse('Unauthorized webhook request', 401);
  }

  const rateLimitResponse = await enforceRateLimit(
    request,
    env,
    '/api/v1/webhooks/gmail',
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: PubSubPushBody;
  try {
    body = (await request.json()) as PubSubPushBody;
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const encoded = body.message?.data;
  if (!encoded) {
    return errorResponse('Missing Pub/Sub message data');
  }

  let pushData: GmailPushData;
  try {
    pushData = JSON.parse(atob(encoded)) as GmailPushData;
  } catch {
    return errorResponse('Invalid Pub/Sub payload');
  }

  if (!pushData.emailAddress) {
    return errorResponse('Missing emailAddress in Gmail notification');
  }

  const account = await findGmailAccountByEmail(env, pushData.emailAddress);
  if (!account) {
    return successResponse({ ignored: true });
  }

  const perMailboxLimit = await enforceRateLimit(
    request,
    env,
    `/api/v1/webhooks/gmail:${pushData.emailAddress.toLowerCase()}`,
  );
  if (perMailboxLimit) {
    return perMailboxLimit;
  }

  await enqueueGmailSync(env, account.id, account.userId, 'incremental');
  return successResponse({ queued: true });
}
