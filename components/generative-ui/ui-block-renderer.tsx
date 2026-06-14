'use client';

import {
  blockRegistry,
  UnknownBlockFallback,
} from '@/components/generative-ui/block-renderers';
import type { UIBlock } from '@/lib/generative-ui/types';

export function UiBlockRenderer({ block }: { block: UIBlock }) {
  const Renderer = blockRegistry[block.type];

  if (!Renderer) {
    return <UnknownBlockFallback type={block.type} data={block.data} />;
  }

  return (
    <div data-testid={`generative-ui-block-${block.type}`}>
      <Renderer data={block.data} />
    </div>
  );
}

export function UiBlocksRenderer({ blocks }: { blocks: UIBlock[] }) {
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div data-testid="generative-ui-blocks" className="space-y-3">
      {blocks.map((block) => (
        <div key={block.id}>
          <UiBlockRenderer block={block} />
        </div>
      ))}
    </div>
  );
}
