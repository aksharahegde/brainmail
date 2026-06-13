export async function handleQueueBatch(
  batch: MessageBatch<unknown>,
  env: Env,
): Promise<void> {
  console.log(
    JSON.stringify({
      event: 'queue_batch_received',
      queue: batch.queue,
      messageCount: batch.messages.length,
      environment: env.ENVIRONMENT ?? 'local',
    }),
  );

  for (const message of batch.messages) {
    message.ack();
  }
}
