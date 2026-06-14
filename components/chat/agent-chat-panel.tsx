'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getChatSession,
  listChatSessions,
  sendChatMessage,
  type ChatAgentResponse,
  type UIBlock,
} from '@/lib/chat/api';

function renderBlock(block: UIBlock) {
  if (block.type === 'markdown' && typeof block.data.content === 'string') {
    return <p className="text-sm">{block.data.content}</p>;
  }

  if (block.type === 'kpi') {
    return (
      <div className="rounded-md border px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {String(block.data.title)}
        </p>
        <p className="text-lg font-semibold">{String(block.data.value)}</p>
      </div>
    );
  }

  if (block.type === 'email_list' && Array.isArray(block.data.emails)) {
    return (
      <ul className="space-y-2">
        {block.data.emails.map((email) => {
          const item = email as {
            id: string;
            subject: string | null;
            sender: string | null;
          };
          return (
            <li
              key={item.id}
              className="rounded-md bg-muted/40 px-3 py-2 text-sm"
            >
              <p className="font-medium">{item.subject ?? 'No subject'}</p>
              <p className="text-xs text-muted-foreground">
                {item.sender ?? 'Unknown sender'}
              </p>
            </li>
          );
        })}
      </ul>
    );
  }

  if (block.type === 'table' && Array.isArray(block.data.rows)) {
    return (
      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-sm">
          <tbody>
            {block.data.rows.map((row, index) => (
              <tr key={index} className="border-t">
                {(row as string[]).map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-xs">
      {JSON.stringify(block.data, null, 2)}
    </pre>
  );
}

export function AgentChatPanel() {
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [latestResponse, setLatestResponse] =
    useState<ChatAgentResponse | null>(null);
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

  const sendMutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (response) => {
      setSessionId(response.sessionId);
      setLatestResponse(response);
      setMessage('');
      void queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      void queryClient.invalidateQueries({
        queryKey: ['chat-session', response.sessionId],
      });
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    sendMutation.mutate({
      message: trimmed,
      sessionId,
    });
  }

  const messages = sessionQuery.data?.messages ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Agent chat</h2>
          <p className="text-sm text-muted-foreground">
            Router → specialized agent → tools → UI planner
          </p>
        </div>
        {latestResponse ? (
          <p className="text-xs text-muted-foreground">
            Routed to {latestResponse.agent} · {latestResponse.plan.intent}
          </p>
        ) : null}
      </div>

      <form className="flex gap-2" onSubmit={handleSubmit}>
        <div data-testid="chat-message-input" className="flex-1">
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask about spend, emails, automations, or insights"
          />
        </div>
        <div data-testid="chat-message-submit">
          <Button type="submit" disabled={sendMutation.isPending}>
            {sendMutation.isPending ? 'Thinking…' : 'Send'}
          </Button>
        </div>
      </form>

      {sendMutation.error instanceof Error ? (
        <p className="text-sm text-destructive" role="alert">
          {sendMutation.error.message}
        </p>
      ) : null}

      {latestResponse ? (
        <section className="space-y-3 rounded-lg border p-4">
          <h3 className="text-sm font-medium">Latest agent response</h3>
          <div className="space-y-3">
            {latestResponse.blocks.map((block) => (
              <div key={block.id}>{renderBlock(block)}</div>
            ))}
          </div>
          {latestResponse.artifact ? (
            <p className="text-xs text-muted-foreground">
              Artifact {latestResponse.artifact.id} (
              {latestResponse.artifact.type})
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 rounded-lg border p-4">
          <h3 className="text-sm font-medium">Sessions</h3>
          <ul className="space-y-2">
            {(sessionsQuery.data?.sessions ?? []).map((session) => (
              <li key={session.id}>
                <button
                  type="button"
                  data-testid={`chat-session-row-${session.id}`}
                  className="w-full rounded-md bg-muted/40 px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => setSessionId(session.id)}
                >
                  {session.title ?? 'Untitled chat'}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <h3 className="text-sm font-medium">Session history</h3>
          {sessionId && sessionQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading history…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Send a message to start a routed agent conversation.
            </p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {messages.map((entry) => (
                <li
                  key={entry.id}
                  data-testid={`chat-message-row-${entry.id}`}
                  className="rounded-md bg-muted/40 px-3 py-2 text-sm"
                >
                  <p className="text-xs uppercase text-muted-foreground">
                    {entry.role}
                  </p>
                  <p>{entry.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
