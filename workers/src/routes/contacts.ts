import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import { getContactProfile, listContacts } from '../crm/service';

export async function handleContactsList(
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
  const workspaceId = url.searchParams.get('workspaceId');
  const result = await listContacts(env, authResult.id, { workspaceId, query });

  return successResponse({
    contacts: result.contacts,
    summary: result.summary,
    total: result.contacts.length,
  });
}

export async function handleContactDetail(
  request: Request,
  env: Env,
  contactId: string,
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
  const profile = await getContactProfile(
    env,
    authResult.id,
    contactId,
    workspaceId,
  );

  if (!profile) {
    return errorResponse('Contact not found', 404);
  }

  return successResponse(profile);
}
