import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import type { RendererDescriptor } from '../renderers/registry/types';
import type { CardContentDto } from '../core';

export interface ViewportHostProps {
  readonly card: CardContentDto;
  readonly descriptor: RendererDescriptor;
  readonly viewportMode: string;
  readonly universe: string;
  readonly category: string;
  readonly onAction?: (actionId: string, payload?: unknown) => Promise<void>;
  readonly fallbackCandidates?: readonly RendererDescriptor[];
}

interface State {
  hasError: boolean;
  activeCandidateIdx: number;
}

export class ViewportHost extends Component<ViewportHostProps, State> {
  public override state: State = {
    hasError: false,
    activeCandidateIdx: 0
  };

  public static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.warn('[ViewportHost] Viewlet failed rendering, attempting fallback:', error, errorInfo);
  }

  public override render(): ReactNode {
    const { card, descriptor, viewportMode, universe, category, onAction, fallbackCandidates = [] } = this.props;

    if (this.state.hasError && fallbackCandidates.length > this.state.activeCandidateIdx) {
      const fallback = fallbackCandidates[this.state.activeCandidateIdx];
      const FallbackComponent = fallback.component;
      return (
        <div
          data-testid="viewport-host"
          data-viewport-mode={fallback.viewport ?? viewportMode}
          className="viewport-host flex-1 overflow-hidden relative"
        >
          <FallbackComponent
            handle={card.handle}
            hash={card.hash}
            content={card.content}
            text={card.text}
            mimeType={card.mimeType}
            universe={universe}
            category={category}
            metadata={card.metadata}
            onAction={onAction}
          />
        </div>
      );
    }

    const ViewletComponent = descriptor.component;
    return (
      <div
        data-testid="viewport-host"
        data-viewport-mode={viewportMode}
        className="viewport-host flex-1 overflow-hidden relative"
      >
        <ViewletComponent
          handle={card.handle}
          hash={card.hash}
          content={card.content}
          text={card.text}
          mimeType={card.mimeType}
          universe={universe}
          category={category}
          metadata={card.metadata}
          onAction={onAction}
        />
      </div>
    );
  }
}
