import { OverviewDemo } from '@/features/overview/overview-demo';

export default function WorkspaceOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      <p className="mt-2 text-muted-foreground">
        Workspace summary and key metrics will appear here.
      </p>
      <OverviewDemo />
    </div>
  );
}
