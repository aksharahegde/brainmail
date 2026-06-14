'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { UiBlocksRenderer } from '@/components/generative-ui/ui-block-renderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createDashboard,
  deleteDashboard,
  getDashboard,
  listDashboards,
  listDashboardTemplates,
  refreshDashboard,
} from '@/lib/dashboards/api';

export function DashboardsDirectory({ workspaceId }: { workspaceId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ['dashboard-templates'],
    queryFn: listDashboardTemplates,
  });

  const dashboardsQuery = useQuery({
    queryKey: ['dashboards', workspaceId],
    queryFn: () => listDashboards({ workspaceId }),
  });

  const detailQuery = useQuery({
    queryKey: ['dashboard', selectedId],
    queryFn: () => getDashboard(selectedId!),
    enabled: Boolean(selectedId),
  });

  const createMutation = useMutation({
    mutationFn: createDashboard,
    onSuccess: (data) => {
      setSelectedId(data.dashboard.id);
      setCustomName('');
      void queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: refreshDashboard,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['dashboard', selectedId],
      });
      void queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDashboard,
    onSuccess: () => {
      setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });

  const dashboards = dashboardsQuery.data?.dashboards ?? [];
  const templates = templatesQuery.data?.templates ?? [];
  const blocks = detailQuery.data?.dashboard.definition?.blocks ?? [];

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h2 className="briefing-section-title">Dashboards</h2>
        {dashboardsQuery.isLoading ? (
          <p className="text-body-sm text-muted-foreground">Loading dashboards…</p>
        ) : dashboards.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No dashboards yet. Create one from a template below.
          </p>
        ) : (
          <ul className="space-y-2">
            {dashboards.map((dashboard) => (
              <li key={dashboard.id}>
                <button
                  type="button"
                  data-testid={`dashboard-row-${dashboard.id}`}
                  onClick={() => setSelectedId(dashboard.id)}
                  className="briefing-list-item w-full text-left transition-colors hover:border-border"
                >
                  <p className="font-medium">{dashboard.name}</p>
                  <p className="text-body-sm text-muted-foreground">
                    {dashboard.templateKey ?? 'custom'}
                    {dashboard.refreshedAt
                      ? ` · refreshed ${new Date(dashboard.refreshedAt).toLocaleString()}`
                      : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="briefing-card space-y-3">
          <h3 className="font-medium">Create from template</h3>
          <div className="grid gap-2">
            {templates
              .filter((template) => template.key !== 'custom')
              .map((template) => (
                <div
                  key={template.key}
                  data-testid={`dashboard-template-${template.key}`}
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto w-full justify-start py-3"
                    disabled={createMutation.isPending}
                    onClick={() =>
                      createMutation.mutate({
                        templateKey: template.key,
                        workspaceId,
                      })
                    }
                  >
                    <span className="text-left">
                      <span className="block font-medium">{template.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {template.description}
                      </span>
                    </span>
                  </Button>
                </div>
              ))}
          </div>

          <form
            className="space-y-2 border-t pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmedName = customName.trim();
              if (!trimmedName) {
                return;
              }
              createMutation.mutate({
                name: trimmedName,
                templateKey: 'custom',
                workspaceId,
              });
            }}
          >
            <div data-testid="dashboard-create-name-input">
              <Input
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                placeholder="Custom dashboard name"
              />
            </div>
            <div data-testid="dashboard-create-submit">
              <Button type="submit" disabled={createMutation.isPending}>
                Create custom dashboard
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className="briefing-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="briefing-section-title">Dashboard preview</h2>
          {selectedId ? (
            <div className="flex gap-2">
              <div data-testid="dashboard-refresh-submit">
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
              <div data-testid="dashboard-delete-submit">
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
            Select a dashboard to preview its blocks.
          </p>
        ) : detailQuery.isLoading ? (
          <p className="text-body-sm text-muted-foreground">Loading dashboard…</p>
        ) : blocks.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No blocks yet. Refresh to populate from workspace data.
          </p>
        ) : (
          <UiBlocksRenderer blocks={blocks} />
        )}
      </section>
    </div>
  );
}
