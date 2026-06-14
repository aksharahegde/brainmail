'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchWorkspace } from '@/lib/workspaces/api';

export function WorkspaceSearch({ workspaceId }: { workspaceId: string }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const { data, isFetching, error } = useQuery({
    queryKey: ['workspace-search', workspaceId, query],
    queryFn: () => searchWorkspace(workspaceId, query),
    enabled: query.length > 0,
  });

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(search.trim());
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="briefing-section-title">Workspace search</h2>
        <p className="text-body-sm text-muted-foreground">
          Search emails and artifacts scoped to this workspace.
        </p>
      </div>

      <form className="flex gap-2" onSubmit={handleSearch}>
        <div data-testid="workspace-search-input" className="flex-1">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search this workspace"
          />
        </div>
        <div data-testid="workspace-search-submit">
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

      {query && data ? (
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-medium">Emails</h3>
            {data.emails.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">
                No matching emails.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.emails.map((email) => (
                  <li
                    key={email.id}
                    data-testid={`workspace-search-email-${email.id}`}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <p className="font-medium">
                      {email.subject ?? 'No subject'}
                    </p>
                    <p className="text-muted-foreground">{email.sender}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">Artifacts</h3>
            {data.artifacts.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">
                No matching artifacts.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.artifacts.map((artifact) => (
                  <li
                    key={artifact.id}
                    data-testid={`workspace-search-artifact-${artifact.id}`}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <p className="font-medium">
                      {artifact.title ?? 'Untitled'}
                    </p>
                    <p className="text-muted-foreground">
                      {artifact.artifactType}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
