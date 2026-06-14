'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  createAutomation,
  deleteAutomation,
  listAutomationRuns,
  listAutomations,
  listAutomationTemplates,
  runAutomation,
  updateAutomation,
} from '@/lib/automations/api';

export function AutomationBuilder({ workspaceId }: { workspaceId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ['automation-templates'],
    queryFn: listAutomationTemplates,
  });

  const automationsQuery = useQuery({
    queryKey: ['automations', workspaceId],
    queryFn: () => listAutomations({ workspaceId }),
  });

  const runsQuery = useQuery({
    queryKey: ['automation-runs', selectedId],
    queryFn: () => listAutomationRuns(selectedId!),
    enabled: Boolean(selectedId),
  });

  const createMutation = useMutation({
    mutationFn: createAutomation,
    onSuccess: (data) => {
      setSelectedId(data.automation.id);
      void queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      automationId,
      enabled,
    }: {
      automationId: string;
      enabled: boolean;
    }) => updateAutomation(automationId, { enabled }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  const runMutation = useMutation({
    mutationFn: (automationId: string) =>
      runAutomation(automationId, { mode: 'preview' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['automation-runs', selectedId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAutomation,
    onSuccess: () => {
      setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  const automations = automationsQuery.data?.automations ?? [];
  const templates =
    templatesQuery.data?.templates.filter(
      (template) =>
        !template.defaultWorkspaceId ||
        template.defaultWorkspaceId === workspaceId,
    ) ?? [];
  const selected = automations.find(
    (automation) => automation.id === selectedId,
  );
  const runs = runsQuery.data?.runs ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Automations</h2>
        {automationsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading automations…</p>
        ) : automations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No automations yet. Create one from a template below.
          </p>
        ) : (
          <ul className="space-y-2">
            {automations.map((automation) => (
              <li key={automation.id}>
                <button
                  type="button"
                  data-testid={`automation-row-${automation.id}`}
                  onClick={() => setSelectedId(automation.id)}
                  className="w-full rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
                >
                  <p className="font-medium">{automation.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {automation.schedule ?? 'manual'} ·{' '}
                    {automation.enabled ? 'enabled' : 'disabled'}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="font-medium">Templates</h3>
          <div className="grid gap-2">
            {templates.map((template) => (
              <div
                key={template.key}
                data-testid={`automation-template-${template.key}`}
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
        </div>
      </section>

      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Automation builder</h2>
        {!selected ? (
          <p className="text-sm text-muted-foreground">
            Select an automation to review triggers, conditions, actions, and
            run history.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xl font-semibold">{selected.name}</p>
              <p className="text-sm text-muted-foreground">
                {selected.schedule ?? 'manual'} schedule ·{' '}
                {selected.enabled ? 'enabled' : 'disabled'}
              </p>
            </div>

            {selected.definition ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Trigger</p>
                  <p className="text-muted-foreground">
                    {String(
                      (selected.definition as { trigger?: { type?: string } })
                        .trigger?.type ?? 'manual',
                    )}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Conditions</p>
                  <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-xs">
                    {JSON.stringify(
                      (selected.definition as { conditions?: unknown[] })
                        .conditions ?? [],
                      null,
                      2,
                    )}
                  </pre>
                </div>
                <div>
                  <p className="font-medium">Actions</p>
                  <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-xs">
                    {JSON.stringify(
                      (selected.definition as { actions?: unknown[] })
                        .actions ?? [],
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                data-testid="automation-run-submit"
                disabled={runMutation.isPending}
                onClick={() => runMutation.mutate(selected.id)}
              >
                {runMutation.isPending ? 'Running…' : 'Preview run'}
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="automation-toggle-submit"
                disabled={toggleMutation.isPending}
                onClick={() =>
                  toggleMutation.mutate({
                    automationId: selected.id,
                    enabled: !selected.enabled,
                  })
                }
              >
                {selected.enabled ? 'Disable' : 'Enable'}
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="automation-delete-submit"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(selected.id)}
              >
                Delete
              </Button>
            </div>

            {runs.length > 0 ? (
              <div className="space-y-2 border-t pt-4">
                <h3 className="font-medium">Run history</h3>
                <ul className="space-y-2 text-sm">
                  {runs.map((run) => (
                    <li
                      key={run.id}
                      className="rounded-md border px-3 py-2"
                      data-testid={`automation-run-${run.id}`}
                    >
                      <p className="font-medium">{run.status ?? 'unknown'}</p>
                      <p className="text-muted-foreground">
                        {run.executedAt
                          ? new Date(run.executedAt).toLocaleString()
                          : '—'}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
