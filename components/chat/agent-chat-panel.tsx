'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { UiResponseRenderer } from '@/components/generative-ui/ui-response-renderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getChatSession,
  listChatSessions,
  sendChatMessage,
  type ChatAgentResponse,
} from '@/lib/chat/api';

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
          <h2 className="briefing-section-title">Agent chat</h2>
          <p className="text-body-sm text-muted-foreground">
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
        <p className="text-body-sm text-destructive" role="alert">
          {sendMutation.error.message}
        </p>
      ) : null}

      {latestResponse ? (
        <section className="briefing-card space-y-3">
          <h3 className="text-sm font-medium">Latest agent response</h3>
          <UiResponseRenderer response={latestResponse} />
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="briefing-card space-y-2">
          <h3 className="text-sm font-medium">Sessions</h3>
          <ul className="space-y-2">
            {(sessionsQuery.data?.sessions ?? []).map((session) => (
              <li key={session.id}>
                <button
                  type="button"
                  data-testid={`chat-session-row-${session.id}`}
                  className="w-full w-full rounded-[10px] px-3 py-2 text-left text-body-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  onClick={() => setSessionId(session.id)}
                >
                  {session.title ?? 'Untitled chat'}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="briefing-card space-y-2">
          <h3 className="text-sm font-medium">Session history</h3>
          {sessionId && sessionQuery.isLoading ? (
            <p className="text-body-sm text-muted-foreground">Loading history…</p>
          ) : messages.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
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
