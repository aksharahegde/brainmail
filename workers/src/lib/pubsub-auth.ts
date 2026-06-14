import { getSecretEnv } from './env';

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const CERT_CACHE_MS = 60 * 60 * 1000;

type GoogleCertResponse = {
  keys: Array<{
    kid: string;
    kty: string;
    alg?: string;
    use?: string;
    n: string;
    e: string;
  }>;
};

type JwtHeader = {
  alg: string;
  kid?: string;
};

type PubSubJwtPayload = {
  iss?: string;
  aud?: string;
  exp?: number;
  email?: string;
  email_verified?: boolean;
};

let cachedCerts: {
  keys: GoogleCertResponse['keys'];
  fetchedAt: number;
} | null = null;

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded =
    normalized.length % 4 === 0
      ? normalized
      : normalized + '='.repeat(4 - (normalized.length % 4));
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function getGoogleCerts(): Promise<GoogleCertResponse['keys']> {
  const now = Date.now();
  if (cachedCerts && now - cachedCerts.fetchedAt < CERT_CACHE_MS) {
    return cachedCerts.keys;
  }

  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) {
    throw new Error('Unable to fetch Google signing certificates');
  }

  const body = (await response.json()) as GoogleCertResponse;
  cachedCerts = { keys: body.keys, fetchedAt: now };
  return body.keys;
}

async function importRsaPublicKey(
  key: GoogleCertResponse['keys'][number],
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    {
      kty: 'RSA',
      n: key.n,
      e: key.e,
      alg: 'RS256',
      ext: true,
    },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

function getWebhookAudience(request: Request, env: Env): string {
  if (env.GMAIL_WEBHOOK_AUDIENCE?.trim()) {
    return env.GMAIL_WEBHOOK_AUDIENCE.trim();
  }

  const url = new URL(request.url);
  return `${url.origin}${url.pathname}`;
}

function isLocalWebhookBypassAllowed(env: Env): boolean {
  return (env.ENVIRONMENT ?? 'local') === 'local' && !env.GMAIL_PUBSUB_TOPIC;
}

function verifyLocalWebhookSecret(request: Request, env: Env): boolean {
  const secret = getSecretEnv(env).GMAIL_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const provided = request.headers.get('X-Brainmail-Webhook-Secret');
  return provided === secret;
}

async function verifyGoogleJwt(
  token: string,
  expectedAudience: string,
): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const header = parseJson<JwtHeader>(
    new TextDecoder().decode(decodeBase64Url(parts[0])),
  );
  const payload = parseJson<PubSubJwtPayload>(
    new TextDecoder().decode(decodeBase64Url(parts[1])),
  );

  if (!header || !payload || header.alg !== 'RS256' || !header.kid) {
    return false;
  }

  const issuer = payload.iss;
  if (
    issuer !== 'https://accounts.google.com' &&
    issuer !== 'accounts.google.com'
  ) {
    return false;
  }

  if (!payload.aud || payload.aud !== expectedAudience) {
    return false;
  }

  if (!payload.exp || payload.exp * 1000 <= Date.now()) {
    return false;
  }

  if (payload.email_verified === false) {
    return false;
  }

  const certs = await getGoogleCerts();
  const cert = certs.find((entry) => entry.kid === header.kid);
  if (!cert) {
    return false;
  }

  const key = await importRsaPublicKey(cert);
  const signedContent = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = decodeBase64Url(parts[2]);

  return crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    signature,
    signedContent,
  );
}

export async function verifyGmailPubSubRequest(
  request: Request,
  env: Env,
): Promise<boolean> {
  if (!env.GMAIL_PUBSUB_TOPIC?.trim()) {
    return isLocalWebhookBypassAllowed(env)
      ? verifyLocalWebhookSecret(request, env)
      : false;
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return false;
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    return false;
  }

  try {
    return await verifyGoogleJwt(token, getWebhookAudience(request, env));
  } catch {
    return false;
  }
}
