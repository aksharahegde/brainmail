export const PIPELINE_QUEUES = [
  'email_ingestion',
  'classification',
  'entity_extraction',
  'attachment_processing',
  'embedding_generation',
  'automation_execution',
  'insight_generation',
] as const;

export type PipelineQueue = (typeof PIPELINE_QUEUES)[number];

export function queueResourceName(
  queue: PipelineQueue,
  environment = 'local',
): string {
  if (environment === 'local') {
    return `brainmail-${queue.replace(/_/g, '-')}`;
  }

  return `brainmail-${queue.replace(/_/g, '-')}-${environment}`;
}

export function deadLetterQueueName(environment = 'local'): string {
  if (environment === 'local') {
    return 'brainmail-dead-letter';
  }

  return `brainmail-dead-letter-${environment}`;
}
