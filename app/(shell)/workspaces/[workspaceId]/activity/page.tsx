import { ProcessedEmailActivity } from '@/components/email/processed-email-activity';

export default function WorkspaceActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Processed emails, categories, and extraction status.
        </p>
      </div>
      <ProcessedEmailActivity />
    </div>
  );
}
