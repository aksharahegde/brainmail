'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { BriefingCard } from '@/components/layout/briefing-card';
import { BriefingSection } from '@/components/layout/briefing-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WORKSPACES, workspacePath } from '@/lib/navigation';
import { createWorkspace, listWorkspaces } from '@/lib/workspaces/api';

export function WorkspacesDirectory() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  });

  const createMutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      setName('');
      setDescription('');
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });

  const workspaces = data?.workspaces ?? [];

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    createMutation.mutate({
      name: trimmedName,
      description: description.trim() || undefined,
    });
  }

  return (
    <div className="space-y-10">
      <BriefingSection title="Your workspaces">
        {isLoading ? (
          <p className="text-body-sm text-muted-foreground">
            Loading workspaces…
          </p>
        ) : error instanceof Error ? (
          <div className="space-y-4">
            <p className="text-body-sm text-destructive" role="alert">
              {error.message}
            </p>
            <ul className="space-y-3">
              {WORKSPACES.map((workspace) => (
                <li key={workspace.id}>
                  <Link
                    href={workspacePath(workspace.id)}
                    data-testid={`workspace-card-${workspace.id}`}
                    className="briefing-list-item block"
                  >
                    <span className="font-medium">{workspace.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="space-y-3">
            {workspaces.map((workspace) => (
              <li key={workspace.id}>
                <Link
                  href={workspacePath(workspace.id)}
                  data-testid={`workspace-card-${workspace.id}`}
                  className="briefing-list-item block"
                >
                  <span className="font-medium">
                    {workspace.name ?? workspace.id}
                  </span>
                  {workspace.description ? (
                    <p className="mt-1 text-body-sm text-muted-foreground">
                      {workspace.description}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </BriefingSection>

      <BriefingCard className="max-w-lg">
        <h2 className="briefing-section-title">Create workspace</h2>
        <form className="space-y-4" onSubmit={handleCreate}>
          <div data-testid="workspace-create-name-input">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Workspace name"
            />
          </div>
          <div data-testid="workspace-create-description-input">
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description (optional)"
            />
          </div>
          {createMutation.error instanceof Error ? (
            <p className="text-body-sm text-destructive" role="alert">
              {createMutation.error.message}
            </p>
          ) : null}
          <div data-testid="workspace-create-submit">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create workspace'}
            </Button>
          </div>
        </form>
      </BriefingCard>
    </div>
  );
}
