import { getDatabaseHealth } from './db-health';

type BindingCheck = {
  name: string;
  present: boolean;
};

export function getBindingChecks(env: Env): BindingCheck[] {
  return [
    { name: 'DB', present: Boolean(env.DB) },
    { name: 'ATTACHMENTS', present: Boolean(env.ATTACHMENTS) },
    { name: 'EMBEDDINGS', present: Boolean(env.EMBEDDINGS) },
    { name: 'AI', present: Boolean(env.AI) },
    {
      name: 'EMAIL_INGESTION_QUEUE',
      present: Boolean(env.EMAIL_INGESTION_QUEUE),
    },
    {
      name: 'CLASSIFICATION_QUEUE',
      present: Boolean(env.CLASSIFICATION_QUEUE),
    },
    {
      name: 'ENTITY_EXTRACTION_QUEUE',
      present: Boolean(env.ENTITY_EXTRACTION_QUEUE),
    },
    {
      name: 'ATTACHMENT_PROCESSING_QUEUE',
      present: Boolean(env.ATTACHMENT_PROCESSING_QUEUE),
    },
    {
      name: 'EMBEDDING_GENERATION_QUEUE',
      present: Boolean(env.EMBEDDING_GENERATION_QUEUE),
    },
    {
      name: 'AUTOMATION_EXECUTION_QUEUE',
      present: Boolean(env.AUTOMATION_EXECUTION_QUEUE),
    },
    {
      name: 'INSIGHT_GENERATION_QUEUE',
      present: Boolean(env.INSIGHT_GENERATION_QUEUE),
    },
  ];
}

export async function buildHealthPayload(env: Env) {
  const bindings = getBindingChecks(env);
  const bindingsOk = bindings.every((binding) => binding.present);
  const database = await getDatabaseHealth(env);
  const ok = bindingsOk && database.ready;

  return {
    ok,
    service: 'brainmail-api',
    environment: env.ENVIRONMENT ?? 'local',
    bindings,
    database,
    timestamp: new Date().toISOString(),
  };
}
