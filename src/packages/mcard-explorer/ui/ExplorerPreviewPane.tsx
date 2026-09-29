/** @layer L4 interface/membrane */
import React from 'react';
import type { CardContentDto, CardContentProvider } from '../core/datasource/types';
import { MCardViewer } from './MCardViewer';

export interface ExplorerPreviewPaneProps {
  card?: CardContentDto | null;
  handle?: string | null;
  contentProvider?: CardContentProvider;
  onAction?: (actionId: string, payload?: unknown) => Promise<void>;
}

export const ExplorerPreviewPane: React.FC<ExplorerPreviewPaneProps> = ({
  card,
  handle,
  contentProvider,
  onAction
}) => {
  return (
    <div className="flex-1 h-full overflow-hidden bg-slate-950" data-testid="mcard-preview-pane">
      <MCardViewer
        card={card}
        handle={handle ?? undefined}
        contentProvider={contentProvider}
        onAction={onAction}
      />
    </div>
  );
};
