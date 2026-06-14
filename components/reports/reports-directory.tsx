'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { UiBlocksRenderer } from '@/components/generative-ui/ui-block-renderer';
import { Button } from '@/components/ui/button';
import {
  deleteReport,
  generateReport,
  getReport,
  listReports,
  listReportTypes,
  refreshReport,
} from '@/lib/reports/api';

export function ReportsDirectory({ workspaceId }: { workspaceId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const typesQuery = useQuery({
    queryKey: ['report-types'],
    queryFn: listReportTypes,
  });

  const reportsQuery = useQuery({
    queryKey: ['reports', workspaceId],
    queryFn: () => listReports({ workspaceId }),
  });

  const detailQuery = useQuery({
    queryKey: ['report', selectedId],
    queryFn: () => getReport(selectedId!),
    enabled: Boolean(selectedId),
  });

  const generateMutation = useMutation({
    mutationFn: generateReport,
    onSuccess: (data) => {
      setSelectedId(data.report.id);
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: refreshReport,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['report', selectedId] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const reports = reportsQuery.data?.reports ?? [];
  const types =
    typesQuery.data?.types.filter(
      (type) =>
        !type.defaultWorkspaceId || type.defaultWorkspaceId === workspaceId,
    ) ?? [];
  const blocks = detailQuery.data?.report.definition?.blocks ?? [];

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h2 className="briefing-section-title">Generated reports</h2>
        {reportsQuery.isLoading ? (
          <p className="text-body-sm text-muted-foreground">Loading reports…</p>
        ) : reports.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No reports yet. Generate one from a template below.
          </p>
        ) : (
          <ul className="space-y-2">
            {reports.map((report) => (
              <li key={report.id}>
                <button
                  type="button"
                  data-testid={`report-row-${report.id}`}
                  onClick={() => setSelectedId(report.id)}
                  className="briefing-list-item w-full text-left transition-colors hover:border-border"
                >
                  <p className="font-medium">{report.name}</p>
                  <p className="text-body-sm text-muted-foreground">
                    {report.reportType ?? 'report'} ·{' '}
                    {report.schedule ?? 'manual'}
                    {report.refreshedAt
                      ? ` · refreshed ${new Date(report.refreshedAt).toLocaleString()}`
                      : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="briefing-card space-y-3">
          <h3 className="font-medium">Generate report</h3>
          <div className="grid gap-2">
            {types.map((type) => (
              <div key={type.key} data-testid={`report-type-${type.key}`}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start py-3"
                  disabled={generateMutation.isPending}
                  onClick={() =>
                    generateMutation.mutate({
                      type: type.key,
                      workspaceId,
                    })
                  }
                >
                  <span className="text-left">
                    <span className="block font-medium">{type.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {type.description} · {type.schedule}
                    </span>
                  </span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="briefing-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="briefing-section-title">Report preview</h2>
          {selectedId ? (
            <div className="flex gap-2">
              <div data-testid="report-refresh-submit">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={refreshMutation.isPending}
                  onClick={() => refreshMutation.mutate(selectedId)}
                >
                  {refreshMutation.isPending ? 'Refreshing…' : 'Refresh'}
                </Button>
              </div>
              <div data-testid="report-delete-submit">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(selectedId)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {!selectedId ? (
          <p className="text-body-sm text-muted-foreground">
            Select a report to preview its blocks.
          </p>
        ) : detailQuery.isLoading ? (
          <p className="text-body-sm text-muted-foreground">Loading report…</p>
        ) : blocks.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No blocks in this report yet.
          </p>
        ) : (
          <UiBlocksRenderer blocks={blocks} />
        )}
      </section>
    </div>
  );
}
