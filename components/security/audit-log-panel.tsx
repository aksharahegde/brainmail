'use client';

import { useQuery } from '@tanstack/react-query';

import { listAuditLogs } from '@/lib/security/api';

export function AuditLogPanel() {
  const logsQuery = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => listAuditLogs({ limit: 25 }),
  });

  const logs = logsQuery.data?.logs ?? [];

  return (
    <section className="briefing-card space-y-4">
      <div>
        <h2 className="briefing-section-title">Audit log</h2>
        <p className="text-body-sm text-muted-foreground">
          Recent security and account events for your workspace.
        </p>
      </div>

      {logsQuery.isLoading ? (
        <p className="text-body-sm text-muted-foreground">Loading audit log…</p>
      ) : logs.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          No audit events yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              data-testid={`security-audit-row-${log.id}`}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <p className="font-medium">{log.action ?? 'unknown'}</p>
              <p className="text-muted-foreground">
                {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
