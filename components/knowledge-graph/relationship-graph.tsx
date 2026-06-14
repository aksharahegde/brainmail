'use client';

import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { formatEntityType, getRelationshipGraph } from '@/lib/entities/api';

export function RelationshipGraphPanel() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['relationship-graph'],
    queryFn: getRelationshipGraph,
    refetchInterval: 15000,
  });

  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="briefing-section-title">Relationship graph</h2>
          <p className="text-body-sm text-muted-foreground">
            {data?.stats.nodeCount ?? 0} nodes · {data?.stats.edgeCount ?? 0}{' '}
            relationships
          </p>
        </div>
        <div data-testid="graph-refresh-submit">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error instanceof Error ? (
        <p className="text-body-sm text-destructive" role="alert">
          {error.message}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-body-sm text-muted-foreground">Loading graph…</p>
      ) : nodes.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          Graph relationships appear once companies, contacts, invoices, and
          subscriptions are materialized from processed email.
        </p>
      ) : (
        <div className="space-y-4">
          <section className="space-y-2 rounded-lg border p-4">
            <h3 className="text-sm font-medium">Nodes</h3>
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {nodes.map((node) => (
                <li
                  key={node.id}
                  data-testid={`graph-node-${node.id}`}
                  className="rounded-md bg-muted/40 px-3 py-2 text-sm"
                >
                  <p className="font-medium">{node.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatEntityType(node.type)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2 rounded-lg border p-4">
            <h3 className="text-sm font-medium">Relationships</h3>
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {edges.length === 0 ? (
                <li className="text-body-sm text-muted-foreground">
                  No edges mapped yet.
                </li>
              ) : (
                edges.map((edge) => (
                  <li
                    key={edge.id}
                    data-testid={`graph-edge-${edge.id}`}
                    className="rounded-md bg-muted/40 px-3 py-2 text-sm"
                  >
                    <p className="font-medium">{edge.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {edge.source} → {edge.target}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
