'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { UiBlocksRenderer } from '@/components/generative-ui/ui-block-renderer';
import { BriefingCard } from '@/components/layout/briefing-card';
import { BriefingHeader } from '@/components/layout/briefing-header';
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
    <div className="space-y-8">
      <BriefingHeader
        eyebrow="Morning briefing"
        title="Daily briefing"
        description="What matters, why it matters, and what to do next."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              data-testid="insights-refresh-submit"
              disabled={refreshMutation.isPending || briefingQuery.isLoading}
              onClick={() => refreshMutation.mutate()}
            >
              {refreshMutation.isPending ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button
              type="button"
              className="bg-ai text-ai-foreground hover:bg-ai/90"
              data-testid="insights-generate-submit"
              disabled={generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            >
              {generateMutation.isPending ? 'Generating…' : 'Regenerate'}
            </Button>
          </>
        }
      />

      {refreshedAt ? (
        <p className="text-caption text-muted-foreground">
          Last updated {new Date(refreshedAt).toLocaleString()}
        </p>
      ) : null}

      {briefingQuery.isLoading ? (
        <p className="text-body-sm text-muted-foreground">Loading briefing…</p>
      ) : briefingQuery.isError ? (
        <p className="text-body-sm text-destructive">
          {briefingQuery.error instanceof Error
            ? briefingQuery.error.message
            : 'Unable to load briefing'}
        </p>
      ) : blocks.length === 0 ? (
        <BriefingCard>
          <p className="text-body-sm text-muted-foreground">
            No briefing prepared yet. Generate insights to receive your first
            curated report.
          </p>
        </BriefingCard>
      ) : (
        <div className="briefing-report space-y-6">
          <UiBlocksRenderer blocks={blocks} />
        </div>
      )}
    </div>
  );
}
