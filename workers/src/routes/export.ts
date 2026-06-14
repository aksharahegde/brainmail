import { errorResponse } from '../lib/api-response';
import { isResponse, requireAuth } from '../lib/auth';
import { exportUserData } from '../export/service';

export async function handleExportCreate(
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

  let format: 'json' | 'csv' = 'json';
  try {
    const body = (await request.json()) as { format?: 'json' | 'csv' };
    if (body.format === 'csv' || body.format === 'json') {
      format = body.format;
    }
  } catch {
    // Default to JSON when body is omitted.
  }

  try {
    const exported = await exportUserData(env, authResult.id, format);
    return new Response(exported.body, {
      status: 200,
      headers: {
        'Content-Type': exported.contentType,
        'Content-Disposition': `attachment; filename="${exported.filename}"`,
      },
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Unable to export data',
      500,
    );
  }
}
