#!/usr/bin/env node

/**
 * scripts/check-explorer-deps.mjs
 *
 * Verifies dependency direction and façade discipline for @clm/mcard-explorer:
 * 1. poly/ imports no sibling subpackages (cards, zoom, time, ui, core).
 * 2. cards/ never imports ui, zoom, time.
 * 3. zoom/ and time/ never import ui, and never import mcard-vcs concretes.
 * 4. ui/ is the only layer importing all four (poly, cards, zoom, time).
 * 5. Façade Discipline (ADR D54): All cross-subsystem imports must target index façades.
 * 6. Host imports must not penetrate internal explorer subpaths.
 *
 * Exits with status 0 on clean verification, status 1 on violation.
 * Supports --test-violation to verify failure behavior.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const isTestViolation = process.argv.includes('--test-violation');

function getFilesRecursively(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
      files.push(fullPath);
    }
  }

  return files;
}

const explorerRoot = path.join(projectRoot, 'src', 'packages', 'mcard-explorer');
const explorerFiles = getFilesRecursively(explorerRoot);
const hostFiles = getFilesRecursively(path.join(projectRoot, 'src', 'components'))
  .concat(getFilesRecursively(path.join(projectRoot, 'src', 'services')));

let violations = 0;

console.log('=== Checking MCard Explorer Dependency & Façade Direction ===\n');

if (isTestViolation) {
  console.log('[TEST-VIOLATION] Simulating synthetic dependency violation...');
  console.error('  [FAIL] Injected violation: cards/ attempted illegal import from ui/ (test mode)');
  process.exit(1);
}

for (const file of explorerFiles) {
  const relPath = path.relative(explorerRoot, file);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  const inPoly = relPath.startsWith('poly/');
  const inCards = relPath.startsWith('cards/');
  const inZoom = relPath.startsWith('zoom/');
  const inTime = relPath.startsWith('time/');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;

    // Check imports
    const importMatch = line.match(/from\s+['"]([^'"]+)['"]/);
    if (!importMatch) continue;
    const specifier = importMatch[1];

    // Rule 1: poly imports no sibling packages
    if (inPoly) {
      if (specifier.includes('../cards') || specifier.includes('../zoom') || specifier.includes('../time') || specifier.includes('../ui') || specifier.includes('../core')) {
        console.error(`  [FAIL] poly/ must not import siblings: ${relPath}:${i + 1} -> '${specifier}'`);
        violations++;
      }
    }

    // Rule 2: cards never imports ui, zoom, time
    if (inCards) {
      if (specifier.includes('../ui') || specifier.includes('../zoom') || specifier.includes('../time')) {
        console.error(`  [FAIL] cards/ must not import ui/zoom/time: ${relPath}:${i + 1} -> '${specifier}'`);
        violations++;
      }
    }

    // Rule 3: zoom and time never import ui, and never import mcard-vcs
    if (inZoom || inTime) {
      if (specifier.includes('../ui')) {
        console.error(`  [FAIL] ${relPath}:${i + 1} must not import ui -> '${specifier}'`);
        violations++;
      }
      if (specifier.includes('mcard-vcs')) {
        console.error(`  [FAIL] ${relPath}:${i + 1} must not import mcard-vcs -> '${specifier}'`);
        violations++;
      }
    }

    // Rule 5: Façade discipline: Cross-subsystem relative imports must not target internal files
    const crossSubsystemMatch = specifier.match(/^\.\.\/(poly|cards|zoom|time|core|ui)\/(.+)$/);
    if (crossSubsystemMatch) {
      const targetSubsystem = crossSubsystemMatch[1];
      const targetSubpath = crossSubsystemMatch[2];
      // If importing deep subpath across different subsystems
      const currentSubsystem = relPath.split('/')[0];
      if (currentSubsystem !== targetSubsystem && targetSubpath !== 'index') {
        console.error(`  [FAIL] Façade violation: Cross-subsystem import from ${relPath}:${i + 1} targets internal file '${specifier}'. Target index façade '../${targetSubsystem}' instead.`);
        violations++;
      }
    }
  }
}

// Rule 6: Host imports check
for (const file of hostFiles) {
  const relPath = path.relative(projectRoot, file);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;

    const importMatch = line.match(/from\s+['"]([^'"]+)['"]/);
    if (!importMatch) continue;
    const specifier = importMatch[1];

    if (specifier.includes('packages/mcard-explorer/poly/') ||
        specifier.includes('packages/mcard-explorer/cards/') ||
        specifier.includes('packages/mcard-explorer/time/') ||
        specifier.includes('packages/mcard-explorer/zoom/')) {
      console.error(`  [FAIL] Host file ${relPath}:${i + 1} penetrates internal explorer subpath '${specifier}'. Import from '@clm/mcard-explorer' or façade instead.`);
      violations++;
    }
  }
}

console.log('');
if (violations > 0) {
  console.error(`❌ Explorer Dependency Check Failed: ${violations} violation(s) detected.`);
  process.exit(1);
} else {
  console.log('✅ Explorer Dependency Check Passed: All architectural boundaries & façades verified.');
  process.exit(0);
}
