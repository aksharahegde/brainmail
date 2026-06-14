import { cn } from '@/lib/utils';

type BriefingHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function BriefingHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: BriefingHeaderProps) {
  return (
    <header className={cn('briefing-header space-y-4', className)}>
      {eyebrow ? <p className="briefing-eyebrow">{eyebrow}</p> : null}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-3">
          <h1 className="text-h1">{title}</h1>
          {description ? (
            <p className="text-body-sm max-w-2xl text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
