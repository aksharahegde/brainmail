'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatProcessingStatus, listProcessedEmails } from '@/lib/emails/api';

export function ProcessedEmailActivity({
  workspaceId,
}: {
  workspaceId?: string;
}) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['processed-emails', workspaceId, query],
    queryFn: () =>
      listProcessedEmails({
        query: query || undefined,
        workspaceId,
      }),
    refetchInterval: 5000,
  });

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(search.trim());
  }

  const emails = data?.emails ?? [];

  return (
    <div className="space-y-6">
      <form className="flex gap-2" onSubmit={handleSearch}>
        <div data-testid="email-search-input" className="flex-1">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search processed emails"
          />
        </div>
        <div data-testid="email-search-submit">
          <Button type="submit" variant="outline" disabled={isFetching}>
            Search
          </Button>
        </div>
      </form>

      {error instanceof Error ? (
        <p className="text-body-sm text-destructive" role="alert">
          {error.message}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-body-sm text-muted-foreground">
          Loading processed emails…
        </p>
      ) : emails.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          No processed emails yet. Connect Gmail and run a sync to populate
          activity.
        </p>
      ) : (
        <ul className="space-y-3">
          {emails.map((email) => (
            <li
              key={email.id}
              data-testid={`email-row-${email.id}`}
              className="briefing-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium">{email.subject ?? 'No subject'}</p>
                  <p className="text-body-sm text-muted-foreground">
                    {email.sender ?? 'Unknown sender'}
                  </p>
                  <p className="text-body-sm text-muted-foreground">
                    {email.snippet ?? 'No preview available'}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p data-testid={`email-status-${email.id}`}>
                    {formatProcessingStatus(email.processingStatus)}
                  </p>
                  {email.category ? <p>{email.category}</p> : null}
                </div>
              </div>
              {email.processingError ? (
                <p className="mt-2 text-xs text-destructive">
                  {email.processingError}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div data-testid="email-activity-refresh-submit">
        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>
    </div>
  );
}
