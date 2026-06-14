import { buildHealthPayload } from './lib/health';
import { handleApiRequest } from './routes/handler';
import { handleQueueBatch } from './queues/handler';
import { handleScheduled } from './scheduled/handler';

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      const payload = await buildHealthPayload(env);
      return Response.json(payload, {
        status: payload.ok ? 200 : 503,
      });
    }

    if (url.pathname === '/api/v1' || url.pathname.startsWith('/api/v1/')) {
      return handleApiRequest(request, env);
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },

  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(handleScheduled(controller, env));
  },

  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    await handleQueueBatch(batch, env);
  },
};

export default worker;
