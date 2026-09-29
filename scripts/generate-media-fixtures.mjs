#!/usr/bin/env node
/**
 * scripts/generate-media-fixtures.mjs
 *
 * Deterministically generates the 14-fixture multimodal media corpus
 * in tests/fixtures/multimodal-media/ for Sprint 31-34 verification.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.join(projectRoot, 'tests', 'fixtures', 'multimodal-media');

if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

async function generateFixtures() {
  console.log(`Generating multimodal media corpus in ${FIXTURES_DIR}...`);

  // 1. sample.tikz (U0 diagram)
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'sample.tikz'),
    `\\begin{tikzpicture}
  \\node[circle, draw=black] (A) at (0, 0) {A};
  \\node[circle, draw=black] (B) at (2, 0) {B};
  \\draw[->, thick] (A) -- (B);
\\end{tikzpicture}
`,
    'utf8'
  );

  // 2. sample.zx.json (U0 diagram)
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'sample.zx.json'),
    JSON.stringify(
      {
        format: 'zx-graph',
        spiders: [
          { id: 's1', spider_type: 'Z', phase: '0', position: [0, 0] },
          { id: 's2', spider_type: 'X', phase: 'pi', position: [2, 0] },
        ],
        edges: [{ source: 's1', target: 's2', hadamard: true }],
      },
      null,
      2
    ),
    'utf8'
  );

  // 3. notes.md (U0 text)
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'notes.md'),
    `# Quantum Process Foundations

> Exploration of categorical quantum mechanics and string diagrams.

- **ZX-Calculus**: Graph rewriting with Z and X spiders.
- **PCard**: Monoidal Petri nets for linear workflows.
- **VCard**: Cryptographic proof witnesses for verified transformations.

\`\`\`tikz
\\draw (0,0) -- (1,1);
\`\`\`
`,
    'utf8'
  );

  // 4. dataset.csv (U0 data)
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'dataset.csv'),
    `id,name,role,status,confidence
1,Alice,Theorist,active,0.99
2,Bob,Engineer,active,0.95
3,Carol,Auditor,verified,1.00
4,Dave,Verifier,pending,0.88
`,
    'utf8'
  );

  // 5. config.yaml (U0 data)
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'config.yaml'),
    `workbench:
  name: TikZiT Multimodal Studio
  version: 3.0.3
  lattice:
    levels: 6
    stratified: true
  features:
    exportPng: true
    exportPdf: true
`,
    'utf8'
  );

  // 6. graph.json (U0 data)
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'graph.json'),
    JSON.stringify(
      {
        title: 'Entanglement Distribution',
        nodes: [
          { id: 'alice', label: 'Station A', coords: [0, 0] },
          { id: 'relay', label: 'Quantum Relay', coords: [5, 2] },
          { id: 'bob', label: 'Station B', coords: [10, 0] },
        ],
        links: [
          { from: 'alice', to: 'relay', bellState: 'Phi+' },
          { from: 'relay', to: 'bob', bellState: 'Psi+' },
        ],
      },
      null,
      2
    ),
    'utf8'
  );

  // 7. icon.png (U0 binary image)
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  fs.writeFileSync(path.join(FIXTURES_DIR, 'icon.png'), Buffer.from(pngBase64, 'base64'));

  // 8. logo.svg (U0 text image)
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'logo.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="45" fill="#4f46e5" />
  <path d="M30 50 L45 65 L70 35" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
</svg>
`,
    'utf8'
  );

  // 9. paper.pdf (U0 paged document)
  const minimalPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/Helvetica 12 Tf
50 100 Td
(TikZiT Multimodal MCard Paper) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
298
%%EOF
`;
  fs.writeFileSync(path.join(FIXTURES_DIR, 'paper.pdf'), Buffer.from(minimalPdf, 'utf8'));

  // 10. workflow.pcard.json (U1 process)
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'workflow.pcard.json'),
    JSON.stringify(
      {
        places: [
          { id: 'p_init', label: 'Ready', tokens: 1 },
          { id: 'p_exec', label: 'Running', tokens: 0 },
          { id: 'p_done', label: 'Finished', tokens: 0 },
        ],
        transitions: [
          { id: 't_start', label: 'Initiate' },
          { id: 't_finish', label: 'Complete' },
        ],
        arcs: [
          { source: 'p_init', target: 't_start' },
          { source: 't_start', target: 'p_exec' },
          { source: 'p_exec', target: 't_finish' },
          { source: 't_finish', target: 'p_done' },
        ],
      },
      null,
      2
    ),
    'utf8'
  );

  // 11. receipt.vcard.json (U2 proof witness)
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'receipt.vcard.json'),
    JSON.stringify(
      {
        sandwich: {
          precondition: 'x >= 0',
          program: 'y = sqrt(x)',
          postcondition: 'y * y == x',
        },
        receipt: {
          witnessHash: 'blake3:8f4c2e1b9a7d3f5e',
          authorDid: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
          verified: true,
          timestamp: '2026-09-29T12:00:00Z',
        },
      },
      null,
      2
    ),
    'utf8'
  );

  // 12. turn.satori.xml (U3 conversation)
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'turn.satori.xml'),
    `<turn speaker="assistant" timestamp="2026-09-29T12:00:00Z">
  <message>Here is the verified teleportation circuit.</message>
  <card handle="zx:diagrams:teleportation" type="diagram" />
  <execute command="verify-receipt" />
</turn>
`,
    'utf8'
  );

  // 13. collection.db (U0 sovereign SQLite archive)
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE card (
      handle TEXT PRIMARY KEY,
      hash TEXT NOT NULL,
      content BLOB,
      mime_type TEXT,
      created_at TEXT
    );
    INSERT INTO card VALUES ('zx:diagrams:test', 'blake3:123', 'test', 'text/x-tikz', datetime('now'));
  `);
  const sqliteBytes = db.export();
  fs.writeFileSync(path.join(FIXTURES_DIR, 'collection.db'), Buffer.from(sqliteBytes));

  // 14. blob.bin (U0 binary blob)
  const rawBytes = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    rawBytes[i] = (i * 31 + 7) & 0xff;
  }
  fs.writeFileSync(path.join(FIXTURES_DIR, 'blob.bin'), Buffer.from(rawBytes));

  console.log('✅ Successfully generated all 14 multimodal media fixtures:');
  const files = fs.readdirSync(FIXTURES_DIR);
  for (const f of files) {
    const size = fs.statSync(path.join(FIXTURES_DIR, f)).size;
    console.log(`  - ${f.padEnd(24)} (${size} bytes)`);
  }
}

generateFixtures().catch(err => {
  console.error('Error generating fixtures:', err);
  process.exit(1);
});
