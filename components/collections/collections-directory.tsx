'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
} from '@/lib/collections/api';

export function CollectionsDirectory({ workspaceId }: { workspaceId: string }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const collectionsQuery = useQuery({
    queryKey: ['collections', workspaceId],
    queryFn: () => listCollections({ workspaceId, status: 'active' }),
  });

  const detailQuery = useQuery({
    queryKey: ['collection', selectedId],
    queryFn: () => getCollection(selectedId!),
    enabled: Boolean(selectedId),
  });

  const createMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      setName('');
      setDescription('');
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: () => {
      setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    createMutation.mutate({
      name: trimmedName,
      description: description.trim() || undefined,
      workspaceId,
    });
  }

  const collections = collectionsQuery.data?.collections ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Collections</h2>
        {collectionsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading collections…</p>
        ) : collections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No collections yet. Create one or accept an AI suggestion.
          </p>
        ) : (
          <ul className="space-y-2">
            {collections.map((collection) => (
              <li key={collection.id}>
                <button
                  type="button"
                  data-testid={`collection-row-${collection.id}`}
                  onClick={() => setSelectedId(collection.id)}
                  className="w-full rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
                >
                  <p className="font-medium">{collection.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {collection.collectionType ?? 'user'} ·{' '}
                    {collection.memberCount} members
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="space-y-3 rounded-lg border p-4"
          onSubmit={handleCreate}
        >
          <h3 className="font-medium">Create collection</h3>
          <div data-testid="collection-create-name-input">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Collection name"
            />
          </div>
          <div data-testid="collection-create-description-input">
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description (optional)"
            />
          </div>
          {createMutation.error instanceof Error ? (
            <p className="text-sm text-destructive" role="alert">
              {createMutation.error.message}
            </p>
          ) : null}
          <div data-testid="collection-create-submit">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create collection'}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Collection detail</h2>
        {!selectedId ? (
          <p className="text-sm text-muted-foreground">
            Select a collection to view members.
          </p>
        ) : detailQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading detail…</p>
        ) : detailQuery.data ? (
          <div className="space-y-4">
            <div>
              <p className="font-medium">{detailQuery.data.collection.name}</p>
              {detailQuery.data.collection.description ? (
                <p className="text-sm text-muted-foreground">
                  {detailQuery.data.collection.description}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-muted-foreground">
                {detailQuery.data.memberCount} members
              </p>
            </div>

            {detailQuery.data.members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              <ul className="space-y-2">
                {detailQuery.data.members.map((member) => (
                  <li
                    key={member.entityId}
                    data-testid={`collection-member-${member.entityId}`}
                    className="rounded-md border p-3 text-sm"
                  >
                    <p className="font-medium">{member.entityType}</p>
                    <p className="text-muted-foreground">
                      Added by {member.addedBy ?? 'unknown'}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {detailQuery.data.collection.collectionType !== 'system' ? (
              <div data-testid="collection-delete-submit">
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(selectedId)}
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete collection'}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
