'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  acceptCollectionSuggestion,
  dismissCollectionSuggestion,
  listCollectionSuggestions,
} from '@/lib/collections/api';

export function CollectionSuggestions({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const queryClient = useQueryClient();

  const suggestionsQuery = useQuery({
    queryKey: ['collection-suggestions', workspaceId],
    queryFn: () => listCollectionSuggestions(workspaceId),
  });

  const acceptMutation = useMutation({
    mutationFn: acceptCollectionSuggestion,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['collection-suggestions'],
      });
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: dismissCollectionSuggestion,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['collection-suggestions'],
      });
    },
  });

  const suggestions = suggestionsQuery.data?.suggestions ?? [];

  if (suggestionsQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading suggestions…</p>
    );
  }

  if (suggestions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No AI collection suggestions right now.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {suggestions.map((suggestion) => (
        <li
          key={suggestion.id}
          data-testid={`collection-suggestion-row-${suggestion.id}`}
          className="rounded-lg border p-4"
        >
          <p className="font-medium">{suggestion.name}</p>
          {suggestion.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {suggestion.description}
            </p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <div data-testid="collection-suggestion-accept">
              <Button
                type="button"
                size="sm"
                disabled={acceptMutation.isPending}
                onClick={() => acceptMutation.mutate(suggestion.id)}
              >
                Accept
              </Button>
            </div>
            <div data-testid="collection-suggestion-dismiss">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={dismissMutation.isPending}
                onClick={() => dismissMutation.mutate(suggestion.id)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
