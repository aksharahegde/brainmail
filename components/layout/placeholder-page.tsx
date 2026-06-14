import { BriefingHeader } from '@/components/layout/briefing-header';
import { BriefingPage } from '@/components/layout/briefing-page';

type PlaceholderPageProps = {
  title: string;
  description: string;
  eyebrow?: string;
};

export function PlaceholderPage({
  title,
  description,
  eyebrow,
}: PlaceholderPageProps) {
  return (
    <BriefingPage>
      <BriefingHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
    </BriefingPage>
  );
}
