'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  formatEntityType,
  formatRelationshipScore,
  listContacts,
  listEntities,
} from '@/lib/entities/api';

const ENTITY_FILTERS = [
  { value: 'entity', label: 'All' },
  { value: 'contact', label: 'Contacts' },
  { value: 'company', label: 'Companies' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'receipt', label: 'Receipts' },
  { value: 'subscription', label: 'Subscriptions' },
  { value: 'trip', label: 'Trips' },
] as const;

export function EntityExplorer() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] =
    useState<(typeof ENTITY_FILTERS)[number]['value']>('entity');

  const {
    data: entityData,
    isLoading: entitiesLoading,
    error: entitiesError,
    refetch: refetchEntities,
    isFetching: entitiesFetching,
  } = useQuery({
    queryKey: ['entities', type, query],
    queryFn: () => listEntities({ type, query: query || undefined }),
    refetchInterval: 10000,
  });

  const {
    data: contactData,
    isLoading: contactsLoading,
    error: contactsError,
    refetch: refetchContacts,
    isFetching: contactsFetching,
  } = useQuery({
    queryKey: ['contacts', query],
    queryFn: () => listContacts(query || undefined),
    refetchInterval: 10000,
  });

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(search.trim());
  }

  const entities = entityData?.entities ?? [];
  const contacts = contactData?.contacts ?? [];
  const isFetching = entitiesFetching || contactsFetching;

  return (
    <div className="space-y-8">
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSearch}>
        <div data-testid="entity-search-input" className="flex-1">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search entities and contacts"
          />
        </div>
        <div data-testid="entity-search-submit">
          <Button type="submit" variant="outline" disabled={isFetching}>
            Search
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {ENTITY_FILTERS.map((filter) => (
          <div key={filter.value} data-testid={`entity-filter-${filter.value}`}>
            <Button
              type="button"
              size="sm"
              variant={type === filter.value ? 'default' : 'outline'}
              onClick={() => setType(filter.value)}
            >
              {filter.label}
            </Button>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium">Knowledge entities</h2>
          <p className="text-sm text-muted-foreground">
            {entities.length} result{entities.length === 1 ? '' : 's'}
          </p>
        </div>

        {entitiesError instanceof Error ? (
          <p className="text-sm text-destructive" role="alert">
            {entitiesError.message}
          </p>
        ) : null}

        {entitiesLoading ? (
          <p className="text-sm text-muted-foreground">Loading entities…</p>
        ) : entities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No entities yet. Processed emails will populate companies, invoices,
            subscriptions, and travel records here.
          </p>
        ) : (
          <ul className="space-y-3">
            {entities.map((entity) => (
              <li
                key={`${entity.type}-${entity.id}`}
                data-testid={`entity-row-${entity.id}`}
                className="rounded-lg border p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium">{entity.label}</p>
                    {entity.summary ? (
                      <p className="text-sm text-muted-foreground">
                        {entity.summary}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p data-testid={`entity-type-${entity.id}`}>
                      {formatEntityType(entity.type)}
                    </p>
                    {entity.confidence != null ? (
                      <p>{Math.round(entity.confidence * 100)}% confidence</p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium">Contacts</h2>
          <p className="text-sm text-muted-foreground">
            {contacts.length} contact{contacts.length === 1 ? '' : 's'}
          </p>
        </div>

        {contactsError instanceof Error ? (
          <p className="text-sm text-destructive" role="alert">
            {contactsError.message}
          </p>
        ) : null}

        {contactsLoading ? (
          <p className="text-sm text-muted-foreground">Loading contacts…</p>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Contacts appear after senders are extracted from processed email.
          </p>
        ) : (
          <ul className="space-y-3">
            {contacts.map((contact) => (
              <li
                key={contact.id}
                data-testid={`contact-row-${contact.id}`}
                className="rounded-lg border p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {contact.name ?? contact.email ?? 'Unknown contact'}
                    </p>
                    {contact.email ? (
                      <p className="text-sm text-muted-foreground">
                        {contact.email}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p data-testid={`contact-score-${contact.id}`}>
                      Relationship{' '}
                      {formatRelationshipScore(contact.relationshipScore)}
                    </p>
                    <p>{contact.interactionCount ?? 0} interactions</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div data-testid="entity-explorer-refresh-submit">
        <Button
          type="button"
          variant="outline"
          disabled={isFetching}
          onClick={() => {
            void refetchEntities();
            void refetchContacts();
          }}
        >
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>
    </div>
  );
}
