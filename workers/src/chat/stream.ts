import type { UIBlock, UIResponse } from '../agents/types';

export type ChatStreamEvent =
  | { event: 'session'; data: { sessionId: string } }
  | { event: 'plan'; data: UIResponse['plan'] & { agent: UIResponse['agent'] } }
  | {
      event: 'tool';
      data: { tool: string; status: 'started' | 'completed' };
    }
  | { event: 'block'; data: UIBlock }
  | { event: 'artifact'; data: NonNullable<UIResponse['artifact']> }
  | { event: 'done'; data: { sessionId: string; messageId: string } }
  | { event: 'error'; data: { message: string } };

function encodeSse(event: ChatStreamEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export function createChatStream(
  events: AsyncIterable<ChatStreamEvent>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of events) {
          controller.enqueue(encoder.encode(encodeSse(event)));
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Chat stream failed';
        controller.enqueue(
          encoder.encode(
            encodeSse({
              event: 'error',
              data: { message },
            }),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });
}

export async function* buildChatStreamEvents(input: {
  sessionId: string;
  response: UIResponse;
  assistantMessageId: string;
}): AsyncGenerator<ChatStreamEvent> {
  yield { event: 'session', data: { sessionId: input.sessionId } };
  yield {
    event: 'plan',
    data: {
      ...input.response.plan,
      agent: input.response.agent,
    },
  };

  for (const toolCall of input.response.toolCalls) {
    yield {
      event: 'tool',
      data: { tool: toolCall.tool, status: 'started' },
    };
    yield {
      event: 'tool',
      data: { tool: toolCall.tool, status: 'completed' },
    };
  }

  for (const block of input.response.blocks) {
    yield { event: 'block', data: block };
    await new Promise((resolve) => setTimeout(resolve, 40));
  }

  if (input.response.artifact) {
    yield { event: 'artifact', data: input.response.artifact };
  }

  yield {
    event: 'done',
    data: {
      sessionId: input.sessionId,
      messageId: input.assistantMessageId,
    },
  };
}
