import React from 'react';

export interface ViewerShellProps {
  readonly children: React.ReactNode;
  readonly header?: React.ReactNode;
  readonly toolbar?: React.ReactNode;
  readonly scrubber?: React.ReactNode;
  readonly viewportMode?: string;
  readonly zoomDepth?: number;
  readonly className?: string;
  readonly style?: React.CSSProperties;
}

export const ViewerShell: React.FC<ViewerShellProps> = ({
  children,
  header,
  toolbar,
  scrubber,
  viewportMode = 'scroll',
  zoomDepth = 0,
  className = '',
  style
}) => {
  return (
    <div
      data-testid="mcard-viewer"
      data-viewport-mode={viewportMode}
      data-zoom-depth={zoomDepth}
      className={`viewer-shell flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden ${className}`}
      style={style}
    >
      {header}
      {toolbar}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
      {scrubber}
    </div>
  );
};
