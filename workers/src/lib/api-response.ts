export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export function jsonResponse<T>(
  body: ApiResponse<T>,
  init: ResponseInit = {},
): Response {
  const status = init.status ?? (body.success ? 200 : 400);
  return Response.json(body, { ...init, status });
}

export function successResponse<T>(data: T, init: ResponseInit = {}): Response {
  return jsonResponse({ success: true, data }, init);
}

export function errorResponse(
  error: string,
  status = 400,
  init: ResponseInit = {},
): Response {
  return jsonResponse({ success: false, error }, { ...init, status });
}
