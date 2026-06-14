'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { saveArtifact, type ArtifactType } from '@/lib/artifacts/api';
import type { ChatAgentResponse } from '@/lib/chat/api';

export function ArtifactSaveMenu({
  workspaceId,
  response,
}: {
  workspaceId: string;
  response: Pick<ChatAgentResponse, 'blocks' | 'actions' | 'plan' | 'agent'>;
}) {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (artifactType: ArtifactType) =>
      saveArtifact({
        artifactType,
        title: `${artifactType} · ${response.plan.intent}`,
        workspaceId,
        payload: {
          blocks: response.blocks,
          actions: response.actions,
          plan: response.plan,
          agent: response.agent,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['artifacts'] });
    },
  });

  return (
    <div
      data-testid="artifacts-save-menu"
      className="flex flex-wrap gap-2 border-t pt-3"
    >
      <SaveButton
        testId="artifacts-save-report-submit"
        label="Save report"
        disabled={saveMutation.isPending}
        onClick={() => saveMutation.mutate('report')}
      />
      <SaveButton
        testId="artifacts-save-chart-submit"
        label="Save chart"
        disabled={saveMutation.isPending}
        onClick={() => saveMutation.mutate('chart')}
      />
      <SaveButton
        testId="artifacts-save-dashboard-submit"
        label="Save dashboard"
        disabled={saveMutation.isPending}
        onClick={() => saveMutation.mutate('dashboard')}
      />
      {saveMutation.isSuccess ? (
        <p className="w-full text-xs text-muted-foreground">
          Saved {saveMutation.data.artifact.title}
        </p>
      ) : null}
      {saveMutation.error instanceof Error ? (
        <p className="w-full text-xs text-destructive" role="alert">
          {saveMutation.error.message}
        </p>
      ) : null}
    </div>
  );
}

function SaveButton({
  testId,
  label,
  disabled,
  onClick,
}: {
  testId: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div data-testid={testId}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={onClick}
      >
        {label}
      </Button>
    </div>
  );
}
