import { PlaceholderPage } from '@/components/layout/placeholder-page';
import { WorkspacesDirectory } from '@/components/workspaces/workspaces-directory';

export default function WorkspacesPage() {
  return (
    <div className="space-y-6">
      <PlaceholderPage
        title="Workspaces"
        description="Choose a workspace to explore your email intelligence environment."
      />
      <WorkspacesDirectory />
    </div>
  );
}
