'use client';

import { useQuery } from '@tanstack/react-query';

import { getOpsMetrics, getOpsStatus } from '@/lib/ops/api';

export function SystemStatusPanel() {
  const statusQuery = useQuery({
    queryKey: ['ops-status'],
    queryFn: getOpsStatus,
  });
  const metricsQuery = useQuery({
    queryKey: ['ops-metrics'],
    queryFn: getOpsMetrics,
  });

  const status = statusQuery.data?.status;
  const metrics = metricsQuery.data?.metrics;

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h2 className="text-lg font-medium">System status</h2>
        <p className="text-sm text-muted-foreground">
          Production monitoring, reliability, and estimated AI cost for this
          environment.
        </p>
      </div>

      {statusQuery.isLoading || metricsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading system status…</p>
      ) : !status || !metrics ? (
        <p className="text-sm text-muted-foreground">
          System status is unavailable.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div
            className="rounded-md border p-3 text-sm"
            data-testid="ops-status-summary"
          >
            <p className="font-medium">
              {status.health.ok ? 'Healthy' : 'Degraded'} · v{status.version}
            </p>
            <p className="text-muted-foreground">
              {status.environment} · {status.health.database.tableCount} tables
            </p>
            <p className="text-muted-foreground">
              Backup: {status.backup.script}
            </p>
          </div>

          <div
            className="rounded-md border p-3 text-sm"
            data-testid="ops-metrics-summary"
          >
            <p className="font-medium">24h operations</p>
            <p className="text-muted-foreground">
              {metrics.requests.count24h} requests · avg{' '}
              {metrics.requests.avgResponseMs}ms · p95{' '}
              {metrics.requests.p95ResponseMs}ms
            </p>
            <p className="text-muted-foreground">
              {metrics.reliability.errors24h} errors · AI cost 7d $
              {metrics.cost.aiUsd7d.toFixed(4)}
            </p>
          </div>
        </div>
      )}

      {metrics && metrics.recentEvents.length > 0 ? (
        <div className="space-y-2 border-t pt-4">
          <h3 className="font-medium">Recent events</h3>
          <ul className="space-y-2 text-sm">
            {metrics.recentEvents.slice(0, 8).map((event) => (
              <li
                key={event.id}
                data-testid={`ops-event-row-${event.id}`}
                className="rounded-md border px-3 py-2"
              >
                <p className="font-medium">
                  {event.eventType} · {event.severity}
                </p>
                <p className="text-muted-foreground">
                  {event.source ?? 'system'} ·{' '}
                  {event.createdAt
                    ? new Date(event.createdAt).toLocaleString()
                    : '—'}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
