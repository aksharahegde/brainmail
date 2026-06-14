'use client';

import { UiBlocksRenderer } from '@/components/generative-ui/ui-block-renderer';
import { generativeUiPreviewBlocks } from '@/lib/generative-ui/preview-blocks';
import { registeredBlockTypes } from '@/lib/generative-ui';

export function GenerativeUiPreview() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {registeredBlockTypes.length} registered block types. Backend selects
        blocks; frontend renders via registry lookup.
      </p>
      <UiBlocksRenderer blocks={generativeUiPreviewBlocks} />
    </div>
  );
}
