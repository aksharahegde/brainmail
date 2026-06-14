'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { UiBlocksRenderer } from '@/components/generative-ui/ui-block-renderer';
import { Button } from '@/components/ui/button';
import {
  deleteArtifact,
  downloadArtifactExport,
  getArtifact,
  listArtifacts,
  shareArtifact,
  type ArtifactSummary,
} from '@/lib/artifacts/api';
import type { UIBlock } from '@/lib/generative-ui/types';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'report', label: 'Reports' },
  { id: 'chart', label: 'Charts' },
  { id: 'dashboard', label: 'Dashboards' },
] as const;

export function ArtifactLibrary({ workspaceId }: { workspaceId: string }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const artifactsQuery = useQuery({
    queryKey: ['artifacts', workspaceId, filter],
    queryFn: () =>
      listArtifacts({
        workspaceId,
        type: filter === 'all' ? undefined : filter,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ['artifact', selectedId],
    queryFn: () => getArtifact(selectedId!),
    enabled: Boolean(selectedId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteArtifact,
    onSuccess: () => {
      setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: ['artifacts'] });
    },
  });

  const shareMutation = useMutation({
    mutationFn: shareArtifact,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['artifacts'] });
      if (selectedId) {
        void queryClient.invalidateQueries({
          queryKey: ['artifact', selectedId],
        });
      }
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (input: { id: string; format: 'json' | 'csv' }) =>
      downloadArtifactExport(
        input.id,
        input.format,
        `artifact_${input.id}.${input.format}`,
      ),
  });

  const blocks = useMemo(() => {
    const payload = detailQuery.data?.artifact.payload;
    if (!payload || !Array.isArray(payload.blocks)) {
      return [] as UIBlock[];
    }
    return payload.blocks as UIBlock[];
  }, [detailQuery.data?.artifact.payload]);

  return (
    <div className="space-y-6">
      <aside className="briefing-card space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid={`artifacts-filter-${item.id}`}
              className={`rounded-md px-3 py-1.5 text-sm ${
                filter === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 hover:bg-muted'
              }`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <ul className="space-y-2">
          {(artifactsQuery.data?.artifacts ?? []).map((artifact) => (
            <ArtifactRow
              key={artifact.id}
              artifact={artifact}
              selected={selectedId === artifact.id}
              onSelect={() => setSelectedId(artifact.id)}
            />
          ))}
        </ul>

        {artifactsQuery.isLoading ? (
          <p className="text-body-sm text-muted-foreground">Loading artifacts…</p>
        ) : null}
        {!artifactsQuery.isLoading &&
        (artifactsQuery.data?.artifacts.length ?? 0) === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No saved artifacts yet. Save a report, chart, or dashboard from
            chat.
          </p>
        ) : null}
      </aside>

      <section className="briefing-card">
        {!selectedId ? (
          <p className="text-body-sm text-muted-foreground">
            Select an artifact to preview, share, or export.
          </p>
        ) : detailQuery.isLoading ? (
          <p className="text-body-sm text-muted-foreground">Loading artifact…</p>
        ) : detailQuery.data ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="briefing-section-title">
                  {detailQuery.data.artifact.title}
                </h2>
                <p className="text-body-sm text-muted-foreground">
                  {detailQuery.data.artifact.artifactType} ·{' '}
                  {detailQuery.data.artifact.createdAt}
                </p>
              </div>
              <div
                data-testid="artifacts-detail-actions"
                className="flex flex-wrap gap-2"
              >
                <div data-testid="artifacts-share-submit">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={shareMutation.isPending}
                    onClick={() =>
                      shareMutation.mutate(detailQuery.data.artifact.id)
                    }
                  >
                    {shareMutation.isPending ? 'Sharing…' : 'Share'}
                  </Button>
                </div>
                <div data-testid="artifacts-export-json-submit">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={exportMutation.isPending}
                    onClick={() =>
                      exportMutation.mutate({
                        id: detailQuery.data.artifact.id,
                        format: 'json',
                      })
                    }
                  >
                    Export JSON
                  </Button>
                </div>
                <div data-testid="artifacts-export-csv-submit">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={exportMutation.isPending}
                    onClick={() =>
                      exportMutation.mutate({
                        id: detailQuery.data.artifact.id,
                        format: 'csv',
                      })
                    }
                  >
                    Export CSV
                  </Button>
                </div>
                <div data-testid="artifacts-delete-submit">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() =>
                      deleteMutation.mutate(detailQuery.data.artifact.id)
                    }
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>

            {shareMutation.data?.shareUrl ? (
              <p className="rounded-md bg-muted/40 px-3 py-2 text-xs">
                Share URL: {shareMutation.data.shareUrl}
              </p>
            ) : detailQuery.data.artifact.shareToken ? (
              <p className="rounded-md bg-muted/40 px-3 py-2 text-xs">
                Shared · token {detailQuery.data.artifact.shareToken}
              </p>
            ) : null}

            <UiBlocksRenderer blocks={blocks} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ArtifactRow({
  artifact,
  selected,
  onSelect,
}: {
  artifact: ArtifactSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        data-testid={`artifacts-row-${artifact.id}`}
        className={`w-full rounded-md px-3 py-2 text-left text-sm ${
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/40 hover:bg-muted'
        }`}
        onClick={onSelect}
      >
        <p className="font-medium">{artifact.title ?? 'Untitled artifact'}</p>
        <p className="text-xs opacity-80">{artifact.artifactType}</p>
      </button>
    </li>
  );
}
