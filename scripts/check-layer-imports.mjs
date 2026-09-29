#!/usr/bin/env node

/**
 * scripts/check-layer-imports.mjs
 *
 * Enforces Kernel Layer Placement & Stratum Discipline (ADR D57):
 * 1. Declared stratum: Every file under mcard-explorer/{poly,cards,zoom,time} carries a @layer L<n> header.
 * 2. Root-only kernel imports: Specifier must be exactly 'clm-kernel'.
 * 3. No layer5 subpath: Explicitly rejects clm-kernel/layer5 and clm-kernel/dist/layer5*.
 * 4. At-or-below consumption: Declared Ln stratum cannot consume kernel symbols belonging to higher strata.
 * 5. No absorbed logic: poly/ and ui/ must not call computeContentHash, parsePortableSqlite, parseSatoriXml, fireTransition, or MCardFileSystem.
 *
 * Supports --self-test to verify rejection of all 5 rule violations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const isSelfTest = process.argv.includes('--self-test');

const KERNEL_STRATUM_MAP = {
  // L0
  PolynomialFunctor: 0,
  Monomial: 0,
  // L1
  TypeJudgment: 1,
  ExtendedTypeJudgment: 1,
  // L2
  PetriNetTopology: 2,
  parseSatoriXml: 2,
  parsePortableSqlite: 2,
  Blake3Provider: 2,
  Sha256Provider: 2,
  SatoriElement: 2,
  // L3
  SavepointGuard: 3,
  DisposableList: 3,
  MCardFileSystem: 3,
  TriDatabaseManager: 3
};

const FORBIDDEN_ABSORBED_SYMBOLS = [
  'computeContentHash',
  'parsePortableSqlite',
  'parseSatoriXml',
  'fireTransition',
  'MCardFileSystem'
];

function checkFileContent(content, filename, relativePath) {
  const violations = [];
  const lines = content.split('\n');

  // Rule 1: Declared stratum header
  const isEnforcedSubsystem =
    relativePath.includes('mcard-explorer/poly/') ||
    relativePath.includes('mcard-explorer/cards/') ||
    relativePath.includes('mcard-explorer/zoom/') ||
    relativePath.includes('mcard-explorer/time/');

  let declaredLayer = null;
  const headerMatch = content.match(/@layer\s+L(\d+)/);
  if (headerMatch) {
    declaredLayer = parseInt(headerMatch[1], 10);
  }

  if (isEnforcedSubsystem && declaredLayer === null) {
    violations.push({
      rule: 1,
      message: `Rule 1 Violation: Missing @layer L<n> stratum declaration in ${relativePath}`
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;

    // Rule 2 & 3: Kernel imports check
    const kernelImportMatch = line.match(/from\s+['"](clm-kernel[^'"]*)['"]/);
    if (kernelImportMatch) {
      const specifier = kernelImportMatch[1];
      if (specifier === 'clm-kernel/layer5' || specifier.includes('layer5')) {
        violations.push({
          rule: 3,
          message: `Rule 3 Violation: Prohibited layer5 subpath '${specifier}' in ${relativePath}:${i + 1}`
        });
      } else if (specifier !== 'clm-kernel') {
        violations.push({
          rule: 2,
          message: `Rule 2 Violation: Deep kernel import '${specifier}' in ${relativePath}:${i + 1}. Must be root-only 'clm-kernel'.`
        });
      }

      // Rule 4: At-or-below consumption check
      if (declaredLayer !== null) {
        const importedSymbolsMatch = line.match(/import\s+(?:type\s+)?(?:\{\s*([^}]+)\s*\}|([A-Za-z0-9_]+))\s+from/);
        if (importedSymbolsMatch) {
          const rawSymbols = importedSymbolsMatch[1] || importedSymbolsMatch[2];
          const symbols = rawSymbols.split(',').map((s) => s.replace(/\btype\b/, '').trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
          for (const sym of symbols) {
            const symStratum = KERNEL_STRATUM_MAP[sym];
            if (symStratum !== undefined && symStratum > declaredLayer) {
              violations.push({
                rule: 4,
                message: `Rule 4 Violation: Stratum L${declaredLayer} module imports higher-stratum symbol '${sym}' (L${symStratum}) in ${relativePath}:${i + 1}`
              });
            }
          }
        }
      }
    }

    // Rule 5: No absorbed logic in poly/ or ui/
    const isPolyOrUi = relativePath.includes('mcard-explorer/poly/') || relativePath.includes('mcard-explorer/ui/');
    if (isPolyOrUi) {
      for (const sym of FORBIDDEN_ABSORBED_SYMBOLS) {
        const regex = new RegExp(`\\b${sym}\\s*\\(`, 'g');
        if (regex.test(line)) {
          violations.push({
            rule: 5,
            message: `Rule 5 Violation: Absorbed logic call '${sym}()' in ${relativePath}:${i + 1}`
          });
        }
      }
    }
  }

  return violations;
}

if (isSelfTest) {
  console.log('=== Running Layer Conformance Self-Test (5 Rules) ===\n');

  // Test 1: Missing stratum
  const v1 = checkFileContent("export const x = 1;", "test1.ts", "mcard-explorer/poly/test1.ts");
  if (!v1.some(v => v.rule === 1)) throw new Error("Self-test failed: Rule 1 (missing stratum) not rejected");
  console.log('  [PASS] Rule 1: Missing stratum declaration rejected.');

  // Test 2: Deep path
  const v2 = checkFileContent("/** @layer L4 */\nimport { x } from 'clm-kernel/dist/layer2';", "test2.ts", "mcard-explorer/poly/test2.ts");
  if (!v2.some(v => v.rule === 2)) throw new Error("Self-test failed: Rule 2 (deep path) not rejected");
  console.log('  [PASS] Rule 2: Deep kernel import path rejected.');

  // Test 3: layer5 subpath
  const v3 = checkFileContent("/** @layer L4 */\nimport { x } from 'clm-kernel/layer5';", "test3.ts", "mcard-explorer/poly/test3.ts");
  if (!v3.some(v => v.rule === 3)) throw new Error("Self-test failed: Rule 3 (layer5 subpath) not rejected");
  console.log('  [PASS] Rule 3: layer5 subpath explicitly rejected.');

  // Test 4: Higher stratum consumption
  const v4 = checkFileContent("/** @layer L1 */\nimport { DisposableList } from 'clm-kernel';", "test4.ts", "mcard-explorer/poly/test4.ts");
  if (!v4.some(v => v.rule === 4)) throw new Error("Self-test failed: Rule 4 (wrong stratum) not rejected");
  console.log('  [PASS] Rule 4: Higher stratum symbol consumption rejected.');

  // Test 5: Absorbed logic in poly or ui
  const v5 = checkFileContent("/** @layer L4 */\nconst res = parsePortableSqlite(bytes);", "test5.ts", "mcard-explorer/poly/test5.ts");
  if (!v5.some(v => v.rule === 5)) throw new Error("Self-test failed: Rule 5 (absorbed logic) not rejected");
  console.log('  [PASS] Rule 5: Absorbed L0-L3 logic call rejected.');

  console.log('\n✅ All 5 layer conformance self-tests passed successfully.');
  process.exit(0);
}

function getFilesRecursively(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

console.log('=== Checking Kernel Layer Placement & Stratum Discipline (ADR D57) ===\n');

const explorerRoot = path.join(projectRoot, 'src', 'packages', 'mcard-explorer');
const files = getFilesRecursively(explorerRoot);

let totalViolations = 0;

for (const file of files) {
  const relPath = path.relative(projectRoot, file);
  const content = fs.readFileSync(file, 'utf8');
  const violations = checkFileContent(content, file, relPath);

  for (const v of violations) {
    console.error(`  [FAIL] ${v.message}`);
    totalViolations++;
  }
}

console.log('');
if (totalViolations > 0) {
  console.error(`❌ Layer Conformance Audit Failed: ${totalViolations} violation(s) detected.`);
  process.exit(1);
} else {
  console.log(`✅ Layer Conformance Audit Passed: All ${files.length} modules adhere to ADR D57 layer rules.`);
  process.exit(0);
}
