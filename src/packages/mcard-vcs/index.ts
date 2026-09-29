/**
 * @clm/mcard-vcs: Universal Operadic MCard Virtual File System & Merkle-VCS Engine
 *
 * Public API Barrel.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

// Storage Facade & VFS
export { OperadicMCardVfs } from './storage/OperadicMCardVfs';
export { ContentHasher } from './storage/hash/ContentHasher';
export { VfsEventBus } from './storage/events/VfsEventBus';
export { SavepointGuard } from './storage/kernel/SavepointGuard';

// Pluggable Storage Backends
export { MemoryStorageVFS } from './storage/vfs/MemoryStorageVFS';
export { IndexedDbStorageVFS } from './storage/vfs/IndexedDbStorageVFS';
export { NodeFsStorageVFS } from './storage/vfs/NodeFsStorageVFS';

// Canonical Schemas & DDL
export {
  MCARD_SCHEMA_DDL,
  KNOWLEDGE_SCHEMA_DDL,
  EXECUTION_LOG_SCHEMA_DDL,
  getDdlForPillar
} from './storage/schema/ddl';

// Storage Types
export type {
  StorageVFS,
  TriDatabasePillar,
  VfsBackendKind,
  VfsOptions,
  QueryResultRow
} from './storage/vfs/types';

export type {
  ConversationalLens,
  CardView,
  SetCardOptions,
  CardStateRecord,
  LensLawVerificationResult
} from './storage/lens/types';

export type {
  VfsEventType,
  VfsEventPayloadMap,
  VfsEventCallback
} from './storage/events/VfsEventBus';

// VCS Types & Models
export type {
  VcsIntentType,
  VcsStageIntent,
  VcsCommitIntent,
  VcsBranchIntent,
  VcsCheckoutIntent,
  VcsMergeIntent,
  VcsInputIntent,
  VcsTransitionOutput,
  VcsState,
  MealyVcsMachine
} from './vcs/types/mealy';

export type {
  TreeEntry,
  TreeMCard,
  CommitMCard,
  CommitRecord,
  BranchRef,
  DiffChangeType,
  DiffHunk,
  GraphNodeDiff,
  GraphEdgeDiff,
  SemanticDiffResult,
  MergeConflict,
  MergeResult
} from './vcs/types/commit';

// VCS Kernel & Lineage
export { CommitManager } from './vcs/kernel/CommitManager';
export { RefStore } from './vcs/kernel/RefStore';
export { AncestryGraph } from './vcs/lineage/AncestryGraph';
export { GraphAstDiffer } from './vcs/diff/GraphAstDiffer';
export { SemanticDiffEngine } from './vcs/diff/SemanticDiffEngine';
export { ConflictResolver } from './vcs/merge/ConflictResolver';
export { ThreeWayMergeEngine } from './vcs/merge/ThreeWayMergeEngine';
export { MCardVcsEngine } from './vcs/MCardVcsEngine';

// Explorer Facade
export { ExplorerQueryFacade } from './explorer/ExplorerQueryFacade';
export type {
  ExplorerSearchFilter,
  ExplorerCardSummaryDto,
  ExplorerHistoryEntryDto
} from './explorer/ExplorerQueryFacade';

// Cordis Services & Fibers
export {
  MCardStorageService,
  MCardVcsService,
  MCardExplorerService
} from './cordis/services';
export { VcsFiber } from './cordis/VcsFiber';
export type { FiberState, DisposableClosure } from './cordis/VcsFiber';
export { validateCoeffects, assertCoeffects, isServiceAvailable } from './cordis/coeffects';

// Satori Protocol & Codecs
export type {
  SatoriCardElement,
  SatoriCommitElement,
  SatoriVersionDagElement,
  SatoriDiffViewElement,
  SatoriExplorerElement,
  SatoriExplorerItemElement,
  TurnProposal,
  TurnExecutionResult
} from './satori/types';
export { SatoriXmlCodec } from './satori/SatoriXmlCodec';
export { VcsTurnOrchestrator } from './satori/VcsTurnOrchestrator';
export { HypermediaRenderer } from './satori/HypermediaRenderer';
export { PromptContinuation } from './satori/PromptContinuation';

// Plugin Architecture & Bridge
export { createMCardVcsPlugin } from './plugin/manifest';
export {
  StudioMCardPluginBridge,
  getPluginBridge,
  registerPluginBridge
} from './plugin/bridge';
export type {
  PtrPluginDefinition,
  PtrTransitionDefinition
} from './plugin/types';

// Type Judgment & Stratified Type Lattice
export {
  CardTypeJudgeService,
  registerTypeJudgeService
} from './type/CardTypeJudgeService';
export type {
  CardCategory,
  ExtendedTypeJudgment,
  TypeJudgeOptions
} from './type/types';
export {
  universeLevelOf,
  universeNameOf
} from './type/types';

