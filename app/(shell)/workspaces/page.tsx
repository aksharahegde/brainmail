import { BriefingHeader } from '@/components/layout/briefing-header';
import { BriefingPage } from '@/components/layout/briefing-page';
import { WorkspacesDirectory } from '@/components/workspaces/workspaces-directory';

export default function WorkspacesPage() {
  return (
    <BriefingPage>
      <BriefingHeader
        eyebrow="Your environments"
        title="Workspaces"
        description="Choose where you want to focus — each workspace is a curated lens on your life."
      />
      <WorkspacesDirectory />
    </BriefingPage>
  );
}
