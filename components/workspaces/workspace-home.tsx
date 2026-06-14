'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { BriefingCard } from '@/components/layout/briefing-card';
import { BriefingSection } from '@/components/layout/briefing-section';
import { ChatWorkspaceLink } from '@/components/chat/chat-workspace';
import { WorkspaceSearch } from '@/components/workspaces/workspace-search';
import { workspacePath } from '@/lib/navigation';
import { getWorkspace } from '@/lib/workspaces/api';

export function WorkspaceHome({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => getWorkspace(workspaceId),
  });

  if (isLoading) {
    return (
      <p className="text-body-sm text-muted-foreground">Loading workspace…</p>
    );
  }

  if (error instanceof Error) {
    return (
      <p className="text-body-sm text-destructive" role="alert">
        {error.message}
      </p>
    );
  }

  if (!data) {
    return null;
  }

  const { workspace, context, stats, recentEmails, recentArtifacts } = data;

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <p className="briefing-eyebrow">
          {workspace.workspaceType ?? context.workspaceType}
        </p>
        <h1 className="text-h1">{workspace.name ?? workspaceId}</h1>
        {workspace.description ? (
          <p className="text-body-sm max-w-2xl text-muted-foreground">
            {workspace.description}
          </p>
        ) : null}
        <ChatWorkspaceLink workspaceId={workspaceId} />
      </header>

      <BriefingCard className="ai-accent-bg">
        <p className="briefing-eyebrow ai-accent">Prepared for you</p>
        <p className="text-body text-foreground/90">
          {stats.emails > 0
            ? `${stats.emails} messages reviewed across ${stats.collections} collections and ${stats.entities} tracked entities.`
            : 'Your inbox has been reviewed. Connect Gmail to begin your first briefing.'}
        </p>
        <p className="text-body-sm text-muted-foreground">
          {stats.artifacts > 0
            ? `${stats.artifacts} artifacts saved for follow-up.`
            : 'No artifacts saved yet — ask the assistant to prepare summaries or action plans.'}
        </p>
      </BriefingCard>

      <WorkspaceSearch workspaceId={workspaceId} />

      <BriefingSection
        title="What needs attention"
        description="Recent signals curated for this workspace."
        action={
          <Link
            href={workspacePath(workspaceId, 'activity')}
            className="text-body-sm text-muted-foreground transition-colors hover:text-foreground"
            data-testid="workspace-activity-link"
          >
            View all
          </Link>
        }
      >
        {recentEmails.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No emails in this workspace yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {recentEmails.map((email) => (
              <li
                key={email.id}
                data-testid={`workspace-email-row-${email.id}`}
                className="briefing-list-item"
              >
                <p className="font-medium">{email.subject ?? 'No subject'}</p>
                <p className="text-body-sm text-muted-foreground">
                  {email.sender ?? 'Unknown sender'}
                  {email.category ? ` · ${email.category}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </BriefingSection>

      <BriefingSection
        title="Saved artifacts"
        description="Documents and outputs prepared during prior conversations."
      >
        {recentArtifacts.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No artifacts saved in this workspace yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {recentArtifacts.map((artifact) => (
              <li
                key={artifact.id}
                data-testid={`workspace-artifact-row-${artifact.id}`}
                className="briefing-list-item"
              >
                <p className="font-medium">{artifact.title ?? 'Untitled'}</p>
                <p className="text-body-sm text-muted-foreground">
                  {artifact.artifactType ?? 'artifact'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </BriefingSection>
    </div>
  );
}
