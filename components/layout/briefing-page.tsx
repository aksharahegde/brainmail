import { cn } from '@/lib/utils';

type BriefingPageProps = {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
};

export function BriefingPage({
  children,
  className,
  narrow = false,
}: BriefingPageProps) {
  return (
    <div
      className={cn(
        narrow ? 'briefing-page-narrow' : 'briefing-page',
        'space-y-10 py-2',
        className,
      )}
    >
      {children}
    </div>
  );
}
