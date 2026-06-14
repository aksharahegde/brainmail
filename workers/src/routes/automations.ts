import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import {
  createAutomation,
  deleteAutomation,
  getAutomationForUser,
  listAutomationRuns,
  listAutomations,
  listAutomationTemplates,
  runAutomation,
  updateAutomation,
} from '../automations/service';
import { isAutomationTemplateKey } from '../automations/types';

export async function handleAutomationTemplates(
  request: Request,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  return successResponse({ templates: listAutomationTemplates() });
}

export async function handleAutomationsList(
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
  const items = await listAutomations(env, authResult.id, { workspaceId });

  return successResponse({
    automations: items.map((automation) => ({
      id: automation.id,
      name: automation.name,
      workspaceId: automation.workspaceId,
      schedule: automation.schedule,
      enabled: automation.enabled,
      definition: automation.definition,
      createdAt: automation.createdAt,
      updatedAt: automation.updatedAt,
    })),
  });
}

export async function handleAutomationCreate(
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

  let body: {
    name?: string;
    workspaceId?: string;
    templateKey?: string;
    enabled?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const templateKey = body.templateKey?.trim();
  if (templateKey && !isAutomationTemplateKey(templateKey)) {
    return errorResponse('Invalid automation template', 400);
  }

  try {
    const automation = await createAutomation(env, authResult.id, {
      name: body.name,
      workspaceId: body.workspaceId,
      templateKey,
      enabled: body.enabled,
    });

    return successResponse({ automation }, { status: 201 });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Unable to create automation',
      400,
    );
  }
}

export async function handleAutomationRoutes(
  request: Request,
  env: Env,
  automationId: string,
): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  const isRunsRoute = pathname.endsWith('/runs');
  const isRunRoute = pathname.endsWith('/run');

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  if (isRunsRoute && request.method === 'GET') {
    const runs = await listAutomationRuns(env, authResult.id, automationId);
    return successResponse({ runs });
  }

  if (isRunRoute && request.method === 'POST') {
    let body: { mode?: 'preview' | 'execute'; emailId?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }

    const run = await runAutomation(env, authResult.id, automationId, {
      mode: body.mode ?? 'preview',
      emailId: body.emailId,
    });

    if (!run) {
      return errorResponse('Automation not found', 404);
    }

    return successResponse({ run });
  }

  if (request.method === 'GET') {
    const automation = await getAutomationForUser(
      env,
      authResult.id,
      automationId,
    );

    if (!automation) {
      return errorResponse('Automation not found', 404);
    }

    return successResponse({ automation });
  }

  if (request.method === 'PATCH') {
    let body: { name?: string; enabled?: boolean };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const automation = await updateAutomation(
      env,
      authResult.id,
      automationId,
      {
        name: body.name,
        enabled: body.enabled,
      },
    );

    if (!automation) {
      return errorResponse('Automation not found', 404);
    }

    return successResponse({ automation });
  }

  if (request.method === 'DELETE') {
    const deleted = await deleteAutomation(env, authResult.id, automationId);
    if (!deleted) {
      return errorResponse('Automation not found', 404);
    }

    return successResponse({ deleted: true });
  }

  return errorResponse('Method not allowed', 405);
}
