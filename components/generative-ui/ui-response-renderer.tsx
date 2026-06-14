'use client';

import { ActionGroupBlock } from '@/components/generative-ui/block-renderers';
import { UiBlocksRenderer } from '@/components/generative-ui/ui-block-renderer';
import type { UIAction, UIResponse } from '@/lib/generative-ui/types';

export function UiResponseRenderer({
  response,
}: {
  response: Pick<UIResponse, 'blocks' | 'actions' | 'artifact'>;
}) {
  const actions = response.actions ?? [];

  const hasActionGroupBlock = response.blocks.some(
    (block) => block.type === 'action_group',
  );

  return (
    <div data-testid="generative-ui-response" className="space-y-4">
      <UiBlocksRenderer blocks={response.blocks} />

      {actions.length > 0 && !hasActionGroupBlock ? (
        <ActionGroupBlock
          data={{
            actions: actions.map((action: UIAction) => ({
              id: action.id,
              label: action.label,
              type: action.type,
              dangerous: action.dangerous,
            })),
          }}
        />
      ) : null}

      {response.artifact ? (
        <p className="text-xs text-muted-foreground">
          Artifact {response.artifact.id} ({response.artifact.type})
        </p>
      ) : null}
    </div>
  );
}
