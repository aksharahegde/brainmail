'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { BriefingCard } from '@/components/layout/briefing-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatSearchMode, globalSearch } from '@/lib/search/api';

const SEARCH_MODES = ['hybrid', 'keyword', 'vector'] as const;

export function GlobalSearchPanel() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<(typeof SEARCH_MODES)[number]>('hybrid');

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['global-search', query, mode],
    queryFn: () => globalSearch(query, { mode, limit: 8 }),
    enabled: query.length > 0,
  });

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(search.trim());
  }

  const hasResults =
    !!data &&
    (data.emails.length > 0 ||
      data.entities.length > 0 ||
      data.contacts.length > 0 ||
      data.vendors.length > 0 ||
      data.artifacts.length > 0 ||
      data.workspaces.length > 0);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 lg:max-w-xl">
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSearch}>
        <div data-testid="search-query-input" className="min-w-0 flex-1">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search emails, entities, workspaces…"
            className="border-border/80 bg-card"
          />
        </div>
        <div data-testid="search-query-submit">
          <Button type="submit" variant="outline" disabled={isFetching}>
            Search
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {SEARCH_MODES.map((option) => (
          <div key={option} data-testid={`search-mode-${option}`}>
            <Button
              type="button"
              size="sm"
              variant={mode === option ? 'default' : 'outline'}
              className={
                mode === option
                  ? 'bg-secondary text-secondary-foreground'
                  : undefined
              }
              onClick={() => setMode(option)}
            >
              {formatSearchMode(option)}
            </Button>
          </div>
        ))}
      </div>

      {error instanceof Error ? (
        <p className="text-body-sm text-destructive" role="alert">
          {error.message}
        </p>
      ) : null}

      {query && isLoading ? (
        <p className="text-body-sm text-muted-foreground">Searching…</p>
      ) : null}

      {query && !isLoading && !hasResults ? (
        <p className="text-body-sm text-muted-foreground">
          No results for “{query}”.
        </p>
      ) : null}

      {hasResults && data ? (
        <div className="space-y-4">
          {data.emails.length > 0 ? (
            <SearchSection title="Emails">
              {data.emails.map((email) => (
                <SearchResultItem
                  key={email.id}
                  testId={`search-email-row-${email.id}`}
                  title={email.subject ?? 'No subject'}
                  subtitle={email.sender ?? 'Unknown sender'}
                  meta={`${email.source} · ${Math.round(email.score * 100)}%`}
                />
              ))}
            </SearchSection>
          ) : null}

          {data.entities.length > 0 ? (
            <SearchSection title="Entities">
              {data.entities.map((entity) => (
                <SearchResultItem
                  key={entity.id}
                  testId={`search-entity-row-${entity.id}`}
                  title={entity.label}
                  subtitle={entity.type}
                  meta={`${Math.round(entity.score * 100)}%`}
                />
              ))}
            </SearchSection>
          ) : null}

          {data.contacts.length > 0 ? (
            <SearchSection title="Contacts">
              {data.contacts.map((contact) => (
                <SearchResultItem
                  key={contact.id}
                  testId={`search-contact-row-${contact.id}`}
                  title={contact.name ?? contact.email ?? 'Contact'}
                  subtitle={contact.email}
                  meta={`${Math.round(contact.score * 100)}%`}
                />
              ))}
            </SearchSection>
          ) : null}

          {data.vendors.length > 0 ? (
            <SearchSection title="Vendors">
              {data.vendors.map((vendor) => (
                <SearchResultItem
                  key={vendor.id}
                  testId={`search-vendor-row-${vendor.id}`}
                  title={vendor.name ?? vendor.domain ?? 'Vendor'}
                  subtitle={vendor.domain}
                  meta={`${Math.round(vendor.score * 100)}%`}
                />
              ))}
            </SearchSection>
          ) : null}

          {data.workspaces.length > 0 ? (
            <SearchSection title="Workspaces">
              {data.workspaces.map((workspace) => (
                <SearchResultItem
                  key={workspace.id}
                  testId={`search-workspace-row-${workspace.id}`}
                  title={workspace.name ?? 'Workspace'}
                  subtitle={workspace.description}
                  meta={workspace.workspaceType}
                />
              ))}
            </SearchSection>
          ) : null}

          {data.artifacts.length > 0 ? (
            <SearchSection title="Artifacts">
              {data.artifacts.map((artifact) => (
                <SearchResultItem
                  key={artifact.id}
                  testId={`search-artifact-row-${artifact.id}`}
                  title={artifact.title ?? 'Artifact'}
                  subtitle={artifact.artifactType}
                  meta={`${Math.round(artifact.score * 100)}%`}
                />
              ))}
            </SearchSection>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SearchSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <BriefingCard className="space-y-3 p-4">
      <h3 className="briefing-eyebrow">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </BriefingCard>
  );
}

function SearchResultItem({
  testId,
  title,
  subtitle,
  meta,
}: {
  testId: string;
  title: string;
  subtitle: string | null;
  meta: string | null;
}) {
  return (
    <li data-testid={testId} className="briefing-list-item text-body-sm">
      <p className="font-medium">{title}</p>
      {subtitle ? (
        <p className="text-caption text-muted-foreground">{subtitle}</p>
      ) : null}
      {meta ? (
        <p className="text-caption text-muted-foreground">{meta}</p>
      ) : null}
    </li>
  );
}
