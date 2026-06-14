import { errorResponse } from './api-response';

type RateLimitRule = {
  windowSeconds: number;
  maxRequests: number;
};

const DEFAULT_RULE: RateLimitRule = {
  windowSeconds: 60,
  maxRequests: 120,
};

const ROUTE_RULES: Array<{ pattern: RegExp; rule: RateLimitRule }> = [
  {
    pattern: /^\/api\/v1\/chat(\/stream)?$/,
    rule: { windowSeconds: 60, maxRequests: 30 },
  },
  {
    pattern: /^\/api\/v1\/auth\/login$/,
    rule: { windowSeconds: 300, maxRequests: 20 },
  },
  {
    pattern: /^\/api\/v1\/export$/,
    rule: { windowSeconds: 3600, maxRequests: 5 },
  },
  {
    pattern: /^\/api\/v1\/account\/delete$/,
    rule: { windowSeconds: 3600, maxRequests: 3 },
  },
];

function resolveRule(pathname: string): RateLimitRule {
  const match = ROUTE_RULES.find((entry) => entry.pattern.test(pathname));
  return match?.rule ?? DEFAULT_RULE;
}

function getClientKey(request: Request): string {
  const forwarded = request.headers.get('cf-connecting-ip');
  if (forwarded) {
    return forwarded;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'local';
}

export async function enforceRateLimit(
  request: Request,
  env: Env,
  pathname: string,
  userId?: string,
): Promise<Response | null> {
  const rule = resolveRule(pathname);
  const identity = userId ?? getClientKey(request);
  const bucketKey = `${pathname}:${identity}`;
  const now = new Date();
  const nowIso = now.toISOString();
  const windowStart = new Date(
    now.getTime() - rule.windowSeconds * 1000,
  ).toISOString();

  const existing = await env.DB.prepare(
    'SELECT request_count, window_started_at FROM rate_limit_buckets WHERE bucket_key = ?',
  )
    .bind(bucketKey)
    .first<{ request_count: number; window_started_at: string }>();

  if (!existing || existing.window_started_at < windowStart) {
    await env.DB.prepare(
      `INSERT INTO rate_limit_buckets (bucket_key, request_count, window_started_at)
       VALUES (?, 1, ?)
       ON CONFLICT(bucket_key) DO UPDATE SET
         request_count = 1,
         window_started_at = excluded.window_started_at`,
    )
      .bind(bucketKey, nowIso)
      .run();

    return null;
  }

  if (existing.request_count >= rule.maxRequests) {
    return errorResponse('Rate limit exceeded', 429, {
      headers: {
        'Retry-After': String(rule.windowSeconds),
      },
    });
  }

  await env.DB.prepare(
    `UPDATE rate_limit_buckets
     SET request_count = request_count + 1
     WHERE bucket_key = ?`,
  )
    .bind(bucketKey)
    .run();

  return null;
}
