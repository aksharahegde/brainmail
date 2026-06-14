import { cn } from '@/lib/utils';

type BriefingCardProps = {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
};

export function BriefingCard({
  children,
  className,
  elevated = false,
}: BriefingCardProps) {
  return (
    <section
      className={cn(
        elevated ? 'briefing-card-elevated' : 'briefing-card',
        'space-y-4',
        className,
      )}
    >
      {children}
    </section>
  );
}
