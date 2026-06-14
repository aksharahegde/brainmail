'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { ChatBlockRenderer } from '@/components/chat/chat-block-renderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createChatSession,
  getChatSession,
  listChatSessions,
  streamChatMessage,
  type ChatAgentResponse,
  type ChatMessage,
  type UIBlock,
} from '@/lib/chat/api';

type StreamingState = {
  blocks: UIBlock[];
  agent: string | null;
  intent: string | null;
  artifact: ChatAgentResponse['artifact'] | null;
  status: string | null;
};

export function ChatWorkspace({ workspaceId }: { workspaceId: string }) {
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [streaming, setStreaming] = useState<StreamingState | null>(null);
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: listChatSessions,
  });

  const sessionQuery = useQuery({
    queryKey: ['chat-session', sessionId],
    queryFn: () => getChatSession(sessionId!),
    enabled: Boolean(sessionId),
  });

  const createSessionMutation = useMutation({
    mutationFn: () => createChatSession('New chat'),
    onSuccess: (result) => {
      setSessionId(result.id);
      void queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (input: { message: string; sessionId?: string }) =>
      streamChatMessage({
        ...input,
        workspaceId,
        onEvent: (event, data) => {
          if (event === 'session' && data && typeof data === 'object') {
            const payload = data as { sessionId?: string };
            if (payload.sessionId) {
              setSessionId(payload.sessionId);
            }
          }

          if (event === 'plan' && data && typeof data === 'object') {
            const payload = data as { agent?: string; intent?: string };
            setStreaming((current) => ({
              blocks: current?.blocks ?? [],
              agent: payload.agent ?? null,
              intent: payload.intent ?? null,
              artifact: current?.artifact ?? null,
              status: payload.agent ? `Running ${payload.agent} agent` : null,
            }));
          }

          if (event === 'tool' && data && typeof data === 'object') {
            const payload = data as { tool?: string; status?: string };
            setStreaming((current) => ({
              blocks: current?.blocks ?? [],
              agent: current?.agent ?? null,
              intent: current?.intent ?? null,
              artifact: current?.artifact ?? null,
              status:
                payload.status === 'started'
                  ? `Running ${payload.tool}`
                  : (current?.status ?? null),
            }));
          }

          if (event === 'block' && data && typeof data === 'object') {
            const block = data as UIBlock;
            setStreaming((current) => ({
              blocks: [...(current?.blocks ?? []), block],
              agent: current?.agent ?? null,
              intent: current?.intent ?? null,
              artifact: current?.artifact ?? null,
              status: current?.status ?? null,
            }));
          }

          if (event === 'artifact' && data && typeof data === 'object') {
            const artifact = data as ChatAgentResponse['artifact'];
            setStreaming((current) => ({
              blocks: current?.blocks ?? [],
              agent: current?.agent ?? null,
              intent: current?.intent ?? null,
              artifact: artifact ?? null,
              status: current?.status ?? null,
            }));
          }
        },
      }),
    onSuccess: () => {
      setMessage('');
      setStreaming(null);
      void queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      if (sessionId) {
        void queryClient.invalidateQueries({
          queryKey: ['chat-session', sessionId],
        });
      }
    },
    onError: () => {
      setStreaming(null);
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    setStreaming({
      blocks: [],
      agent: null,
      intent: null,
      artifact: null,
      status: 'Thinking…',
    });

    sendMutation.mutate({
      message: trimmed,
      sessionId,
    });
  }

  const messages = sessionQuery.data?.messages ?? [];
  const memory = sessionQuery.data?.memory;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Sessions</h2>
          <div data-testid="chat-session-create-submit">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => createSessionMutation.mutate()}
              disabled={createSessionMutation.isPending}
            >
              New
            </Button>
          </div>
        </div>
        <ul className="space-y-2">
          {(sessionsQuery.data?.sessions ?? []).map((session) => (
            <li key={session.id}>
              <button
                type="button"
                data-testid={`chat-session-row-${session.id}`}
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                  sessionId === session.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/40 hover:bg-muted'
                }`}
                onClick={() => setSessionId(session.id)}
              >
                {session.title ?? 'Untitled chat'}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-h-[70vh] flex-col rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-medium">Chat</h2>
          <p className="text-sm text-muted-foreground">
            Streaming agent responses with session memory and artifact
            references.
          </p>
          {memory?.lastArtifactId ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Session memory: last artifact {memory.lastArtifactId}
              {memory.lastAgent ? ` · ${memory.lastAgent}` : ''}
            </p>
          ) : null}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !streaming ? (
            <p className="text-sm text-muted-foreground">
              Ask about emails, spend, automations, or follow up on a previous
              answer with “show that again”.
            </p>
          ) : (
            messages.map((entry) => (
              <ChatMessageBubble key={entry.id} message={entry} />
            ))
          )}

          {streaming ? (
            <div
              data-testid="chat-streaming-response"
              className="space-y-3 rounded-lg border bg-muted/20 p-4"
            >
              <p className="text-xs text-muted-foreground">
                {streaming.status}
                {streaming.agent ? ` · ${streaming.agent}` : ''}
                {streaming.intent ? ` · ${streaming.intent}` : ''}
              </p>
              {streaming.blocks.map((block) => (
                <div key={block.id}>
                  <ChatBlockRenderer block={block} />
                </div>
              ))}
              {streaming.artifact ? (
                <p className="text-xs text-muted-foreground">
                  Artifact {streaming.artifact.id} ({streaming.artifact.type})
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <form className="flex gap-2 border-t px-4 py-4" onSubmit={handleSubmit}>
          <div data-testid="chat-message-input" className="flex-1">
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Message BrainMail"
            />
          </div>
          <div data-testid="chat-message-submit">
            <Button type="submit" disabled={sendMutation.isPending}>
              {sendMutation.isPending ? 'Streaming…' : 'Send'}
            </Button>
          </div>
        </form>

        {sendMutation.error instanceof Error ? (
          <p className="px-4 pb-4 text-sm text-destructive" role="alert">
            {sendMutation.error.message}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const metadata = message.metadata ?? {};
  const blocks = Array.isArray(metadata.blocks)
    ? (metadata.blocks as UIBlock[])
    : [];
  const artifact =
    metadata.artifact && typeof metadata.artifact === 'object'
      ? (metadata.artifact as { id: string; type: string })
      : null;

  return (
    <div
      data-testid={`chat-message-row-${message.id}`}
      className={`rounded-lg px-4 py-3 ${
        message.role === 'user' ? 'bg-muted/50' : 'border'
      }`}
    >
      <p className="mb-1 text-xs uppercase text-muted-foreground">
        {message.role}
      </p>
      <p className="text-sm">{message.content}</p>
      {blocks.length > 0 ? (
        <div className="mt-3 space-y-2">
          {blocks.map((block) => (
            <ChatBlockRenderer key={block.id} block={block} />
          ))}
        </div>
      ) : null}
      {artifact ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Artifact {artifact.id} ({artifact.type})
        </p>
      ) : null}
    </div>
  );
}

export function ChatWorkspaceLink({ workspaceId }: { workspaceId: string }) {
  return (
    <Link
      href={`/workspaces/${workspaceId}/chat`}
      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      Open full chat
    </Link>
  );
}
