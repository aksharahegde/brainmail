'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { UiBlocksRenderer } from '@/components/generative-ui/ui-block-renderer';
import { Button } from '@/components/ui/button';
import { generateInsights, getDailyBriefing } from '@/lib/insights/api';

export function DailyBriefingPage({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();

  const briefingQuery = useQuery({
    queryKey: ['briefing', workspaceId],
    queryFn: () => getDailyBriefing({ workspaceId }),
  });

  const refreshMutation = useMutation({
    mutationFn: () => getDailyBriefing({ workspaceId, refresh: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['briefing', workspaceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['insights', workspaceId],
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => generateInsights({ workspaceId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['briefing', workspaceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['insights', workspaceId],
      });
    },
  });

  const blocks = briefingQuery.data?.blocks ?? [];
  const refreshedAt = briefingQuery.data?.refreshedAt;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Daily briefing
          </h1>
          <p className="text-sm text-muted-foreground">
            Proactive inbox health, spend anomalies, and workspace intelligence.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            data-testid="insights-refresh-submit"
            disabled={refreshMutation.isPending || briefingQuery.isLoading}
            onClick={() => refreshMutation.mutate()}
          >
            {refreshMutation.isPending ? 'Refreshing…' : 'Refresh briefing'}
          </Button>
          <Button
            type="button"
            data-testid="insights-generate-submit"
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
          >
            {generateMutation.isPending ? 'Generating…' : 'Regenerate insights'}
          </Button>
        </div>
      </div>

      {refreshedAt ? (
        <p className="text-xs text-muted-foreground">
          Last updated {new Date(refreshedAt).toLocaleString()}
        </p>
      ) : null}

      {briefingQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading briefing…</p>
      ) : briefingQuery.isError ? (
        <p className="text-sm text-destructive">
          {briefingQuery.error instanceof Error
            ? briefingQuery.error.message
            : 'Unable to load briefing'}
        </p>
      ) : blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No briefing blocks yet. Generate insights to populate this page.
        </p>
      ) : (
        <UiBlocksRenderer blocks={blocks} />
      )}
    </div>
  );
}
