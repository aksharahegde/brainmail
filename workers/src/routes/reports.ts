import { errorResponse, successResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import {
  deleteReport,
  generateReport,
  getReportForUser,
  listReports,
  listReportTypes,
  refreshReport,
} from '../reports/service';
import { isReportTypeKey } from '../reports/types';

export async function handleReportTypes(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  return successResponse({ types: listReportTypes() });
}

export async function handleReportsList(
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
  const items = await listReports(env, authResult.id, { workspaceId });

  return successResponse({
    reports: items.map((report) => ({
      id: report.id,
      name: report.name,
      workspaceId: report.workspaceId,
      reportType: report.reportType,
      schedule: report.schedule,
      refreshedAt: report.refreshedAt,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
  });
}

export async function handleReportGenerate(
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

  let body: { type?: string; workspaceId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const reportType = body.type?.trim();
  if (!reportType || !isReportTypeKey(reportType)) {
    return errorResponse('Invalid report type', 400);
  }

  try {
    const report = await generateReport(env, authResult.id, {
      reportType,
      workspaceId: body.workspaceId?.trim(),
    });

    return successResponse({ report }, { status: 201 });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to generate report',
      400,
    );
  }
}

export async function handleReportDetail(
  request: Request,
  env: Env,
  reportId: string,
): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const report = await getReportForUser(env, authResult.id, reportId);
  if (!report) {
    return errorResponse('Report not found', 404);
  }

  return successResponse({ report });
}

export async function handleReportRefresh(
  request: Request,
  env: Env,
  reportId: string,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const authResult = await requireAuth(request, env);
  if (isResponse(authResult)) {
    return authResult;
  }

  const report = await refreshReport(env, authResult.id, reportId);
  if (!report) {
    return errorResponse('Report not found', 404);
  }

  return successResponse({ report });
}

export async function handleReportDelete(
  request: Request,
  env: Env,
  reportId: string,
): Promise<Response> {
  if (request.method === 'DELETE') {
    const authResult = await requireAuth(request, env);
    if (isResponse(authResult)) {
      return authResult;
    }

    const deleted = await deleteReport(env, authResult.id, reportId);
    if (!deleted) {
      return errorResponse('Report not found', 404);
    }

    return successResponse({ deleted: true });
  }

  return errorResponse('Method not allowed', 405);
}

export async function handleReportRoutes(
  request: Request,
  env: Env,
  reportId: string,
): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname.endsWith('/refresh')) {
    return handleReportRefresh(request, env, reportId);
  }

  if (request.method === 'GET') {
    return handleReportDetail(request, env, reportId);
  }

  if (request.method === 'DELETE') {
    return handleReportDelete(request, env, reportId);
  }

  return errorResponse('Method not allowed', 405);
}
