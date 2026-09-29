#!/usr/bin/env node

/**
 * scripts/audit-concerns.mjs - Sprint 36
 * Concern Audit & LOC Ceiling Verification (ADR D53/D54)
 *
 * Verifies that all decomposed single-concern modules in poly/ and core/
 * strictly obey the <= 150 LOC threshold and UI viewlets satisfy their ceilings.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const THRESHOLDS = [
  // poly modules (<= 150 LOC general ceiling; specific sprint targets)
  { file: 'src/packages/mcard-explorer/poly/types.ts', max: 140 },
  { file: 'src/packages/mcard-explorer/poly/guardrails.ts', max: 100 },
  { file: 'src/packages/mcard-explorer/poly/registry.ts', max: 130 },
  { file: 'src/packages/mcard-explorer/poly/census.ts', max: 80 },
  { file: 'src/packages/mcard-explorer/poly/navigation.ts', max: 110 },
  { file: 'src/packages/mcard-explorer/poly/index.ts', max: 50 },

  // core modules (<= 150 LOC general ceiling; specific sprint targets)
  { file: 'src/packages/mcard-explorer/core/ExplorerStateStore.ts', max: 120 },
  { file: 'src/packages/mcard-explorer/core/TreeProjection.ts', max: 130 },
  { file: 'src/packages/mcard-explorer/core/FacetResolver.ts', max: 110 },
  { file: 'src/packages/mcard-explorer/core/SelectionModel.ts', max: 110 },
  { file: 'src/packages/mcard-explorer/core/ExplorerEngine.ts', max: 120 },
  { file: 'src/packages/mcard-explorer/core/MCardExplorerEngine.ts', max: 40 },
  { file: 'src/packages/mcard-explorer/core/index.ts', max: 50 },

  // UI viewlets
  { file: 'src/packages/mcard-explorer/ui/ExplorerToolbar.tsx', max: 110 },
  { file: 'src/packages/mcard-explorer/ui/FacetStrip.tsx', max: 100 },
  { file: 'src/packages/mcard-explorer/ui/ExplorerListPane.tsx', max: 130 },
  { file: 'src/packages/mcard-explorer/ui/ExplorerPreviewPane.tsx', max: 100 },
  { file: 'src/packages/mcard-explorer/ui/ExplorerKeyboardScope.tsx', max: 110 },
  { file: 'src/packages/mcard-explorer/ui/MCardExplorer.tsx', max: 120 },

  // Studio adapter
  { file: 'src/packages/mcard-explorer/renderers/forwardBrowsingAdapter.ts', max: 60 },

  // Sprint 37: cards subsystem
  { file: 'src/packages/mcard-explorer/cards/ports.ts', max: 140 },
  { file: 'src/packages/mcard-explorer/cards/legality.ts', max: 110 },
  { file: 'src/packages/mcard-explorer/cards/composition.ts', max: 170 },
  { file: 'src/packages/mcard-explorer/cards/handles.ts', max: 150 },
  { file: 'src/packages/mcard-explorer/cards/projectBadges.ts', max: 60 },
  { file: 'src/packages/mcard-explorer/cards/adapters/studioPortDescriptor.ts', max: 60 },
  { file: 'src/packages/mcard-explorer/cards/providers/tikz.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/cards/providers/tex.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/cards/providers/image.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/cards/providers/pdf.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/cards/providers/markdown.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/cards/providers/sqlite.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/cards/providers/pcard.ts', max: 90 },

  // Sprint 37: UI viewlets & hooks
  { file: 'src/packages/mcard-explorer/ui/CardRow.tsx', max: 110 },
  { file: 'src/packages/mcard-explorer/ui/PositionGroupList.tsx', max: 90 },
  { file: 'src/packages/mcard-explorer/ui/usePortDrag.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/ui/CardCompositionSurface.tsx', max: 220 },

  // Sprint 38: zoom subsystem
  { file: 'src/packages/mcard-explorer/zoom/types.ts', max: 120 },
  { file: 'src/packages/mcard-explorer/zoom/providers/sqlite.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/zoom/providers/satori.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/zoom/providers/pcard.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/zoom/providers/zx.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/zoom/providers/tikz.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/zoom/providers/markdown.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/zoom/providers/json.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/zoom/providers/namespace.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/zoom/providers/index.ts', max: 90 },
  { file: 'src/packages/mcard-explorer/zoom/stack.ts', max: 160 },
  { file: 'src/packages/mcard-explorer/zoom/boundary.ts', max: 130 },
  { file: 'src/packages/mcard-explorer/zoom/navigation.ts', max: 110 },
  { file: 'src/packages/mcard-explorer/zoom/adapters/studioTreeNode.ts', max: 60 },
  { file: 'src/packages/mcard-explorer/zoom/index.ts', max: 50 },

  // Sprint 38: UI viewlets
  { file: 'src/packages/mcard-explorer/ui/PositionTree.tsx', max: 140 },
  { file: 'src/packages/mcard-explorer/ui/ZoomBreadcrumb.tsx', max: 90 },

  // Sprint 39: time subsystem
  { file: 'src/packages/mcard-explorer/time/types.ts', max: 80 },
  { file: 'src/packages/mcard-explorer/time/InteractionTree.ts', max: 180 },
  { file: 'src/packages/mcard-explorer/time/journal.ts', max: 150 },
  { file: 'src/packages/mcard-explorer/time/replay.ts', max: 120 },
  { file: 'src/packages/mcard-explorer/time/timeline.ts', max: 110 },
  { file: 'src/packages/mcard-explorer/time/hostEffectContext.ts', max: 80 },
  { file: 'src/packages/mcard-explorer/time/index.ts', max: 50 },

  // Sprint 39: poly additions
  { file: 'src/packages/mcard-explorer/poly/coeffects.ts', max: 150 },
  { file: 'src/packages/mcard-explorer/poly/dayConvolution.ts', max: 90 },

  // Sprint 39: UI viewlets & decomposed viewer
  { file: 'src/packages/mcard-explorer/ui/TimelineScrubber.tsx', max: 140 },
  { file: 'src/packages/mcard-explorer/ui/JournalIndicator.tsx', max: 80 },
  { file: 'src/packages/mcard-explorer/ui/ViewerHeader.tsx', max: 90 },
  { file: 'src/packages/mcard-explorer/ui/ViewportHost.tsx', max: 120 },
  { file: 'src/packages/mcard-explorer/ui/ViewerShell.tsx', max: 100 },
  { file: 'src/packages/mcard-explorer/ui/MCardViewer.tsx', max: 90 }
];

let violations = 0;
console.log('=== Auditing Single-Concern Modules & LOC Ceilings (ADR D53) ===\n');

for (const entry of THRESHOLDS) {
  const fullPath = path.join(ROOT_DIR, entry.file);
  if (!fs.existsSync(fullPath)) {
    console.error(`✗ [FAIL] Missing file: ${entry.file}`);
    violations++;
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n').length;

  if (lines > entry.max) {
    console.error(`✗ [FAIL] ${entry.file}: ${lines} LOC exceeds ceiling of ${entry.max} LOC`);
    violations++;
  } else {
    console.log(`✓ [PASS] ${entry.file}: ${lines} / ${entry.max} LOC`);
  }
}

if (violations > 0) {
  console.error(`\n✗ ${violations} LOC ceiling violation(s) detected.`);
  process.exit(1);
}

console.log('\n✓ All modules satisfy concern and LOC ceiling requirements.');
process.exit(0);
