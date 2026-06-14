'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

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
      <p className="text-sm text-muted-foreground">Loading workspace…</p>
    );
  }

  if (error instanceof Error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error.message}
      </p>
    );
  }

  if (!data) {
    return null;
  }

  const { workspace, context, stats, recentEmails, recentArtifacts } = data;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          {workspace.workspaceType ?? context.workspaceType}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {workspace.name ?? workspaceId}
        </h1>
        {workspace.description ? (
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {workspace.description}
          </p>
        ) : null}
        <div className="mt-3">
          <ChatWorkspaceLink workspaceId={workspaceId} />
        </div>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <div
          data-testid="workspace-stat-emails"
          className="rounded-lg border bg-card p-4"
        >
          <dt className="text-sm text-muted-foreground">Emails</dt>
          <dd className="mt-1 text-2xl font-semibold">{stats.emails}</dd>
        </div>
        <div
          data-testid="workspace-stat-artifacts"
          className="rounded-lg border bg-card p-4"
        >
          <dt className="text-sm text-muted-foreground">Artifacts</dt>
          <dd className="mt-1 text-2xl font-semibold">{stats.artifacts}</dd>
        </div>
        <div
          data-testid="workspace-stat-entities"
          className="rounded-lg border bg-card p-4"
        >
          <dt className="text-sm text-muted-foreground">Entities</dt>
          <dd className="mt-1 text-2xl font-semibold">{stats.entities}</dd>
        </div>
      </dl>

      <WorkspaceSearch workspaceId={workspaceId} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Recent email activity</h2>
            <Link
              href={workspacePath(workspaceId, 'activity')}
              className="text-sm text-muted-foreground hover:text-foreground"
              data-testid="workspace-activity-link"
            >
              View all
            </Link>
          </div>
          {recentEmails.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No emails in this workspace yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentEmails.map((email) => (
                <li
                  key={email.id}
                  data-testid={`workspace-email-row-${email.id}`}
                  className="rounded-lg border p-3"
                >
                  <p className="font-medium">{email.subject ?? 'No subject'}</p>
                  <p className="text-sm text-muted-foreground">
                    {email.sender ?? 'Unknown sender'}
                    {email.category ? ` · ${email.category}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Recent artifacts</h2>
          {recentArtifacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No artifacts saved in this workspace yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentArtifacts.map((artifact) => (
                <li
                  key={artifact.id}
                  data-testid={`workspace-artifact-row-${artifact.id}`}
                  className="rounded-lg border p-3"
                >
                  <p className="font-medium">{artifact.title ?? 'Untitled'}</p>
                  <p className="text-sm text-muted-foreground">
                    {artifact.artifactType ?? 'artifact'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
