import Link from 'next/link';

import { PlaceholderPage } from '@/components/layout/placeholder-page';
import { WORKSPACES, workspacePath } from '@/lib/navigation';

export default function WorkspacesPage() {
  return (
    <div className="space-y-6">
      <PlaceholderPage
        title="Workspaces"
        description="Choose a workspace to explore your email intelligence environment."
      />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WORKSPACES.map((workspace) => (
          <li key={workspace.id}>
            <Link
              href={workspacePath(workspace.id)}
              data-testid={`workspace-card-${workspace.id}`}
              className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <span className="font-medium">{workspace.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
