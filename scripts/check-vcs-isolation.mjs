#!/usr/bin/env node

/**
 * check-vcs-isolation.mjs
 *
 * Verifies Contract E isolation for @clm/mcard-vcs and @clm/mcard-explorer/core:
 * 1. Zero references to DOM globals (window, document, HTMLElement, navigator)
 * 2. Zero imports from TikZiT host application namespaces (components, stores, services, core)
 *
 * Exits with code 0 on clean isolation, code 1 on any violation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const TARGET_DIRECTORIES = [
  path.join(projectRoot, 'src', 'packages', 'mcard-vcs', 'storage'),
  path.join(projectRoot, 'src', 'packages', 'mcard-vcs', 'vcs'),
  path.join(projectRoot, 'src', 'packages', 'mcard-vcs', 'explorer'),
  path.join(projectRoot, 'src', 'packages', 'mcard-vcs', 'cordis'),
  path.join(projectRoot, 'src', 'packages', 'mcard-vcs', 'satori'),
  path.join(projectRoot, 'src', 'packages', 'mcard-vcs', 'type'),
  path.join(projectRoot, 'src', 'packages', 'mcard-explorer', 'core'),
  path.join(projectRoot, 'src', 'packages', 'mcard-explorer', 'renderers', 'registry')
];

const FORBIDDEN_DOM_IDENTIFIERS = [
  /\bwindow\b/,
  /\bdocument\b/,
  /\bHTMLElement\b/,
  /\bnavigator\b/
];

const FORBIDDEN_HOST_IMPORTS = [
  /from\s+['"][./]*components\//,
  /from\s+['"][./]*stores\//,
  /from\s+['"][./]*services\//,
  /from\s+['"](?:\.\.\/){2,4}core\//,
  /from\s+['"]@\/components\//,
  /from\s+['"]@\/stores\//,
  /from\s+['"]@\/services\//,
  /from\s+['"]@\/core\//
];


function getFilesRecursively(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      files.push(fullPath);
    }
  }

  return files;
}

let totalViolations = 0;
console.log('=== Checking VCS & Explorer Storage Isolation (Contract E) ===\n');

for (const targetDir of TARGET_DIRECTORIES) {
  const relativeDir = path.relative(projectRoot, targetDir);
  const files = getFilesRecursively(targetDir);

  if (files.length === 0) {
    console.log(`- Skipping non-existent or empty target: ${relativeDir}`);
    continue;
  }

  console.log(`Scanning ${files.length} file(s) in ${relativeDir}...`);

  for (const file of files) {
    const relativeFile = path.relative(projectRoot, file);
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip pure comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
        continue;
      }

      // Check DOM globals
      for (const regex of FORBIDDEN_DOM_IDENTIFIERS) {
        if (regex.test(line)) {
          console.error(`  [FAIL] DOM reference '${regex.source}' found in ${relativeFile}:${i + 1}`);
          console.error(`         Line: ${line.trim()}`);
          totalViolations++;
        }
      }

      // Check host imports
      for (const regex of FORBIDDEN_HOST_IMPORTS) {
        if (regex.test(line)) {
          console.error(`  [FAIL] Host import matching '${regex.source}' found in ${relativeFile}:${i + 1}`);
          console.error(`         Line: ${line.trim()}`);
          totalViolations++;
        }
      }

      // ADR D42: mcard-explorer must never import from mcard-vcs
      if (relativeFile.startsWith('src/packages/mcard-explorer') && /from\s+['"].*mcard-vcs/.test(line)) {
        console.error(`  [FAIL] ADR D42 violation: mcard-vcs import found in explorer ${relativeFile}:${i + 1}`);
        console.error(`         Line: ${line.trim()}`);
        totalViolations++;
      }

      // Headless registry: React must be type-only
      if (relativeFile.includes('renderers/registry') && /from\s+['"]react['"]/.test(line) && !/\btype\b/.test(line)) {
        console.error(`  [FAIL] Runtime React import found in headless registry ${relativeFile}:${i + 1}`);
        console.error(`         Line: ${line.trim()}`);
        totalViolations++;
      }
    }
  }
}

console.log('');
if (totalViolations > 0) {
  console.error(`❌ Isolation Audit Failed: ${totalViolations} violation(s) detected.`);
  process.exit(1);
} else {
  console.log('✅ Isolation Audit Passed: Zero DOM references and zero host imports detected.');
  process.exit(0);
}
