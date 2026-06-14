export type SecretEnv = Env & {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
  TOKEN_ENCRYPTION_KEY?: string;
  GMAIL_WEBHOOK_SECRET?: string;
};

export function getSecretEnv(env: Env): SecretEnv {
  return env as SecretEnv;
}
