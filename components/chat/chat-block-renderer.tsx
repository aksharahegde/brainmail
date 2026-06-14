import { UiBlockRenderer } from '@/components/generative-ui/ui-block-renderer';
import type { UIBlock } from '@/lib/generative-ui/types';

export type { UIBlock } from '@/lib/generative-ui/types';

export function ChatBlockRenderer({ block }: { block: UIBlock }) {
  return <UiBlockRenderer block={block} />;
}
