import { cn } from '@/lib/utils';

type BriefingSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function BriefingSection({
  title,
  description,
  children,
  action,
  className,
}: BriefingSectionProps) {
  return (
    <section className={cn('space-y-5', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="briefing-section-title">{title}</h2>
          {description ? (
            <p className="text-body-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
