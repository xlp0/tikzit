/**
 * @clm/mcard-explorer: Universal Reusable MCard Explorer Subsystem
 *
 * Public API Barrel.
 * Zero DOM dependencies in core. Contract D ceiling: <= 250 LOC.
 */

// Core Headless State Machine
export { MCardExplorerEngine } from './core/MCardExplorerEngine';
export type {
  ExplorerState,
  ExplorerTreeNode
} from './core/MCardExplorerEngine';

// Data Source & Content Provider Ports (ADR D42)
export type {
  CardCategory,
  MCardPayloadKind,
  ExplorerCardSummaryDto,
  CardContentDto,
  ExplorerSearchFilter,
  ExplorerHistoryEntryDto,
  CardContentProvider,
  ExplorerDataSource
} from './core/datasource/types';

// Pluggable Action Registry
export { ExplorerActionRegistry } from './actions/ExplorerActionRegistry';
export type {
  ExplorerAction,
  CardSummaryItem,
  ExplorerActionContext,
  ActionResult
} from './actions/ExplorerActionRegistry';

// Universal UI Viewlets
export { MCardExplorer } from './ui/MCardExplorer';
export type { MCardExplorerProps } from './ui/MCardExplorer';
export { PositionTree } from './ui/PositionTree';
export type { PositionTreeProps, PositionTreeNode } from './ui/PositionTree';
export { ZoomBreadcrumb } from './ui/ZoomBreadcrumb';
export type { ZoomBreadcrumbProps } from './ui/ZoomBreadcrumb';
export { MCardSearchBar } from './ui/MCardSearchBar';
export type { MCardSearchBarProps } from './ui/MCardSearchBar';
export { MCardEntryRow } from './ui/MCardEntryRow';
export type { MCardEntryRowProps } from './ui/MCardEntryRow';
export { MCardViewer, renderCardToHypermedia } from './ui/MCardViewer';
export type { MCardViewerProps } from './ui/MCardViewer';
export { MCardViewerToolbar } from './ui/MCardViewerToolbar';
export type { MCardViewerToolbarProps } from './ui/MCardViewerToolbar';
export { MCardExportDropdown } from './ui/MCardExportDropdown';
export type { MCardExportDropdownProps } from './ui/MCardExportDropdown';

// Pluggable Polyglot Renderer Registry & Viewlets
export * from './renderers';

// Polynomial Interface Core & Affordance Algebra (Sprint 36)
export * from './poly';
export * from './core';

// MCard-First Card Algebra & Composition Surface (Sprint 37)
export * from './cards';

// Operadic Zoom & Multi-Level Navigation (Sprint 38)
export * from './zoom';

// Cofree Timeline, Revertible Effects & Coeffect Panels (Sprint 39)
export * from './time';
export { TimelineScrubber } from './ui/TimelineScrubber';
export type { TimelineScrubberProps } from './ui/TimelineScrubber';
export { JournalIndicator } from './ui/JournalIndicator';
export type { JournalIndicatorProps } from './ui/JournalIndicator';
export { ViewerHeader } from './ui/ViewerHeader';
export type { ViewerHeaderProps } from './ui/ViewerHeader';
export { ViewportHost } from './ui/ViewportHost';
export type { ViewportHostProps } from './ui/ViewportHost';
export { ViewerShell } from './ui/ViewerShell';
export type { ViewerShellProps } from './ui/ViewerShell';


