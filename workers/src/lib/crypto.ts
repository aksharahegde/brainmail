const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function importAesKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function createSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64(bytes);
}

export function createOAuthState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function hashSessionToken(
  token: string,
  secret: string,
): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(token),
  );
  return bytesToBase64(new Uint8Array(signature));
}

export async function encryptSecret(
  plaintext: string,
  encryptionKey: string,
): Promise<string> {
  const key = await importAesKey(encryptionKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  );
  return `${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptSecret(
  payload: string,
  encryptionKey: string,
): Promise<string> {
  const [ivValue, ciphertextValue] = payload.split(':');
  if (!ivValue || !ciphertextValue) {
    throw new Error('Invalid encrypted payload');
  }

  const key = await importAesKey(encryptionKey);
  const ivBytes = new Uint8Array(base64ToBytes(ivValue));
  const ciphertextBytes = new Uint8Array(base64ToBytes(ciphertextValue));
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    ciphertextBytes,
  );

  return new TextDecoder().decode(plaintext);
}

export function addDurationIso(durationMs: number): string {
  return new Date(Date.now() + durationMs).toISOString();
}

export function isExpired(isoTimestamp: string): boolean {
  return Date.parse(isoTimestamp) <= Date.now();
}
