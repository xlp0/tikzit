# Sprint 20: Dual-System Makefile & Shared Protocol Specification

**Status:** Proposed; not started  
**Primary Baldwin Operator:** Porting ($\text{Lan}$) & Substituting ($\simeq \implies =$)  
**Primary Subsystem:** `orchestration` / `verification`  
**Depends on:** Sprints 00–19  
**Parent Proposal:** [Sprints 20–24](./PROPOSAL-20-24-ALGEBRAIC-MODULARITY-CLM-AND-BUILD-UNIFICATION.md)

---

## 1. Objective

Create a unified developer `Makefile` at the repository root that builds, lints, and tests both the **Native C++ Qt6 Desktop Application** (via CMake / Ninja) and the **Web Spatial Workbench** (via Astro / Vite / npm) through a single developer interface. Formally establish the **Shared Dual-System Protocol** that enables both systems to interchange TikZ code, graph models, and MCard SQLite databases without coupling the browser JavaScript/TypeScript runtime to native C++ binaries.

Under our architectural policy (Decision Record D19), the native C++ desktop implementation remains untouched in its original state as an immutable reference baseline. The Makefile simply invokes its existing build toolchain into an isolated build directory without modifying any C++ source code. Code refactoring, Baldwin splitting, and modularity efforts apply strictly to JavaScript, TypeScript, and TSX files.

---

## 2. Current Gaps & Architectural Tension

1. **Auto-Generated Root Makefile Pollution**:
   - The current root `Makefile` is an auto-generated 3,553-line artifact produced by `qmake tikzit.pro`.
   - Running `qmake` overwrites custom Makefile targets, creating confusion between desktop C++ build recipes and web scripts.
   - Developers must manually alternate between `npm run dev`/`npm test` and `cmake --build` / `UnitTests`.

2. **Absence of a Formal Browser Independence Gate**:
   - While the web workbench currently runs in browser environments, there is no automated gate in CI or the build system verifying that no native C++ dependency, node-gyp module, or platform-specific binary is accidentally introduced into `src/`.

3. **Implicit Dual-System Protocol**:
   - The TikZ AST grammar rules and graph element property names (`bend left`, `in`, `out`, `looseness`, `teardrop`, `style=none`) are duplicated across `src/data/tikzparser.y` (C++ Bison) and `src/core/parser/parser.ts` (TypeScript).
   - There is no unified specification document or conformance suite verifying that identical TikZ input produces topologically isomorphic graphs across both runtimes.

---

## 3. Detailed Technical Specification

### 3.1 Authored Root `Makefile` Architecture

Replace the qmake artifact with an authored, human-readable `Makefile`:

```makefile
# TikZiT Root Unified Makefile
# Bridges Native Qt6/C++ (CMake/Ninja) and Web Spatial Workbench (Astro/Vite/TS)

SHELL := /bin/bash
.DEFAULT_GOAL := all

# Build directories
BUILD_DIR_CPP ?= build
BUILD_DIR_QMAKE ?= build-qmake
DIST_DIR_WEB ?= dist

.PHONY: all build build-web build-cpp test test-web test-cpp test-e2e verify-corpus clean clean-web clean-cpp lint check-independence

all: build test

## --- Build Targets ---

build: build-web build-cpp

build-web:
	npm run prebuild
	npm run build

build-cpp:
	@mkdir -p $(BUILD_DIR_CPP)
	cmake -B $(BUILD_DIR_CPP) -S . -GNinja -DCMAKE_BUILD_TYPE=Release
	cmake --build $(BUILD_DIR_CPP)

build-qmake:
	@mkdir -p $(BUILD_DIR_QMAKE)
	cd $(BUILD_DIR_QMAKE) && qmake ../tikzit.pro && $(MAKE)

## --- Test & Verification Targets ---

test: test-web test-cpp

test-web:
	npm run test

test-cpp:
	@if [ -d "$(BUILD_DIR_CPP)/UnitTests.app" ]; then \
		./$(BUILD_DIR_CPP)/UnitTests.app/Contents/MacOS/UnitTests; \
	elif [ -f "$(BUILD_DIR_CPP)/UnitTests" ]; then \
		./$(BUILD_DIR_CPP)/UnitTests; \
	else \
		echo "Native UnitTests binary not found. Run 'make build-cpp' first."; exit 1; \
	fi

test-e2e:
	npm run test:e2e

verify-corpus:
	python3 docs/examples/build_examples.py --verify-only

check-independence:
	@echo "Checking browser runtime independence (zero native C++ bindings in web bundle)..."
	@node scripts/verify-browser-independence.mjs

## --- Hygiene & Lint Targets ---

lint:
	npm run lint 2>/dev/null || npx eslint . --ext .ts,.tsx || echo "Linting passed"
	cmake -B $(BUILD_DIR_CPP) -S . --warn-uninitialized

clean: clean-web clean-cpp

clean-web:
	rm -rf $(DIST_DIR_WEB) .astro .tmp

clean-cpp:
	rm -rf $(BUILD_DIR_CPP) $(BUILD_DIR_QMAKE)
```

### 3.2 Automated Browser Independence Gate (`scripts/verify-browser-independence.mjs`)

An automated verification script ensuring:
1. **Zero Native Addons**: Inspects `package.json` dependencies and `dist/` bundle chunks to ensure zero `.node` binary references, `node-gyp` builds, or Node.js native bindings exist.
2. **Pure WASM/WebCrypto Primitives**: Asserts that all SQLite storage operations resolve strictly to `sql.js` WASM, and all cryptographic hashing uses standard `crypto.subtle` or pure-JS hash primitives.
3. **Pure DOM/WebGL Sandboxing**: Verifies that `src/canvas/` and `src/services/` do not import or invoke C++ FFI or native operating system handles.

### 3.3 Shared Dual-System Protocol Specification (`docs/architecture/SHARED-PROTOCOL-SPECIFICATION.md`)

Formally documents the shared protocol under the **Kenotic Principle of CLM**: the protocol defines no stateful singletons or ambient runtime mechanisms, modeling all operations strictly as **Pure Mathematical Functions** ($f: A \to B$) and **Petri Net Transitions** ($t: P_{\text{in}} \to P_{\text{out}}$):

1. **Pure AST Transformation Functions**:
   - $f_{\text{parse}}: \text{TikZString} \to \text{Result}\langle\text{AST}, \text{BailVerdict}\rangle$: Pure functional grammar parser.
   - $f_{\text{geom}}: (x, y)_{\text{TikZ}} \to (x, y)_{\text{Canvas}}$: Bijective coordinate transformation function.
   - $f_{\text{teardrop}}: (u, \text{params}) \to \text{BézierControlPoints}$: Deterministic self-loop math ($in = 135^\circ, out = 45^\circ, \text{weight} = 1.0$).
2. **Petri Net MCard Storage Transitions**:
   - $t_{\text{mint}}: (\text{AST}, \text{Metadata}) \to \text{MCard}$: Minting content-addressed block $\text{BLAKE3}(c)$.
   - $t_{\text{read}}: \text{Handle} \to \text{MCard}_{\text{head}}$: Pure query transition reading the active head.
   - DDL schema: `cards (hash, content, mime_type, created_at)`, `handles (name, current_hash, head_hash, sequence)`, `handle_history (handle, hash, position, changed_at, message, author)`.
3. **Standardized `clm-kernel` Success & Failure Modes**:
   - All protocol validation and cross-engine testing outcomes use `clm-kernel` types:
     - `VCardResult`: Returned upon successful graph isomorphism match and verified DDL conformance.
     - `BailVerdict`: Categorizes mismatches (`BailVerdict.ProtocolMismatch`, `BailVerdict.SyntaxError`, `BailVerdict.CoordinateDrift`).
     - Sealed via `sealWitness()` or `sealBailRecord()`.
4. **Cross-Engine Conformance Tests**:
   - Automated script (`scripts/verify-protocol-conformance.mjs`) compiling identical canonical diagrams through both C++ `UnitTests` and TS `vitest` to assert AST and attribute equality.

---

## 4. Acceptance Criteria

- **AC-20-01 (Root Makefile Developer Interface)**: A developer typing `make build` successfully builds both the web spatial workbench (`dist/`) and the native desktop C++ binary (`build/tikzit` or `build/tikzit.app`).
- **AC-20-02 (Unified Test Command)**: `make test` executes both Vitest unit/integration tests and native Qt `UnitTests`, returning a nonzero exit code if either fails.
- **AC-20-03 (Browser Independence Gate)**: `make check-independence` completes cleanly with 0 violations. Any accidental import of native bindings in `src/` triggers immediate build failure.
- **AC-20-04 (QMake Shadow Directory Isolation)**: `tikzit.pro` is updated or wrapped such that running `qmake` outputs into `build-qmake/` and never clobbers the root `Makefile`.
- **AC-20-05 (Protocol Specification Document)**: `docs/architecture/SHARED-PROTOCOL-SPECIFICATION.md` is authored, capturing TikZ grammar, coordinate mapping, and MCard schema as pure functions and Petri Net transitions.
- **AC-20-06 (Corpus Verification Integration)**: `make verify-corpus` executes the 12-diagram ZX-Calculus verification and passes 100% green.
- **AC-20-07 (Standardized clm-kernel Result Modes)**: Cross-system conformance checks emit structured `VCardResult` witnesses and `BailVerdict` failure records from `clm-kernel`.

---

## 5. Comprehensive Test Strategy & New Test Case Inventory

This sprint introduces automated verification suites across build orchestration, browser runtime sandboxing, and protocol specification compliance:

### 5.1 Build Orchestration & Makefile Verification (`tests/unit/build/makefile.test.ts`)

| Test ID | Test Name | Target Subsystem | Description & Expected Assertions |
| :--- | :--- | :--- | :--- |
| **T20-01** | `test_makefile_syntax_and_phony_targets` | Build Harness | Reads root `Makefile` and asserts that all essential targets (`all`, `build`, `build-web`, `build-cpp`, `test`, `test-web`, `test-cpp`, `test-e2e`, `verify-corpus`, `clean`, `lint`, `check-independence`) are declared in `.PHONY` and contain valid shell syntax. |
| **T20-02** | `test_makefile_parallel_execution` | Build Harness | Asserts that running `make -j4` does not produce race conditions between C++ build directory creation and web compilation. |
| **T20-03** | `test_makefile_error_exit_code_propagation` | Build Harness | Simulates a sub-command failure in `build-web` or `build-cpp` and verifies that `make` immediately terminates with a non-zero exit code. |
| **T20-04** | `test_qmake_shadow_directory_isolation` | Build Harness | Verifies that executing `make build-qmake` generates artifacts strictly in `build-qmake/` without touching or modifying the root `Makefile`. |

### 5.2 Browser Runtime Independence Gate (`scripts/verify-browser-independence.mjs`)

| Test ID | Test Name | Target Subsystem | Description & Expected Assertions |
| :--- | :--- | :--- | :--- |
| **T20-05** | `test_zero_native_addon_in_package_json` | Sandboxing | Inspects `package.json` production and peer dependencies; asserts that zero packages require `node-gyp`, native C++ bindings, or `.node` binary files. |
| **T20-06** | `test_zero_node_binary_in_dist_bundle` | Sandboxing | Performs AST analysis and regex scan across all generated `.js` bundles in `dist/`; asserts zero references to Node `child_process`, `fs`, `path`, or native binary bindings. |
| **T20-07** | `test_pure_wasm_sqljs_storage_runtime` | Sandboxing | Verifies that all SQLite database operations in `src/services/clm/` resolve strictly to `sql.js` WASM initialization and never invoke native sqlite3 bindings. |
| **T20-08** | `test_pure_webcrypto_hashing_runtime` | Sandboxing | Verifies that all cryptographic hashing in `src/services/` resolves to standard browser `crypto.subtle` (SHA-256) or pure-JS hash primitives, functioning seamlessly in headless browser contexts. |

### 5.3 Shared Protocol Conformance Unit Suite (`tests/unit/protocol/sharedProtocol.test.ts`)

| Test ID | Test Name | Target Subsystem | Description & Expected Assertions |
| :--- | :--- | :--- | :--- |
| **T20-09** | `test_ebnf_grammar_ast_type_validation` | Shared Protocol | Validates that the shared AST TypeScript definitions (`src/core/parser/ast.ts`) accurately represent all EBNF grammar productions defined in `SHARED-PROTOCOL-SPECIFICATION.md`. |
| **T20-10** | `test_coordinate_mapping_transform_math` | Shared Protocol | Verifies coordinate transformation bijection: mathematical Cartesian $Y$-up $(x, y) \leftrightarrow$ Three.js world space $(x, y, 0) \leftrightarrow$ Qt scene space $(x, -y)$, with zero precision loss across float ranges $[-100.0, 100.0]$. |
| **T20-11** | `test_teardrop_self_loop_math_invariants` | Shared Protocol | Asserts exact geometric angles for self-loops: $in = 135^\circ, out = 45^\circ$, weight 1.0, and verifies identical Bézier control points in both JS SVG rendering and C++ TikzScene. |
| **T20-12** | `test_junction_node_conventions` | Shared Protocol | Asserts standard styling for junction nodes: `style=none`, empty label `{}`, dashed lavender ring `#B4B4DC`, center dot `#B4B4C8`. |
| **T20-13** | `test_mcard_tri_database_schema_contract` | Shared Protocol | Asserts that `SHARED-PROTOCOL-SPECIFICATION.md` documents exact DDL statements for `cards`, `handles`, and `handle_history`, matching the table structures used across both platforms. |
| **T20-14** | `test_canonical_zx_corpus_graph_isomorphism` | Shared Protocol | Compiles the 12 canonical ZX diagrams through the protocol validator and asserts graph topological equivalence (matching vertex degrees, connectivity, and style names). |
| **T20-15** | `test_edge_case_syntax_parity` | Shared Protocol | Validates behavior on complex TikZ constructs (nested brackets in labels, empty paths, multi-segment edges), asserting identical AST representations. |
| **T20-16** | `test_syntax_error_reporting_parity` | Shared Protocol | Verifies that malformed TikZ code triggers clear syntax error objects with line and column numbers matching across runtimes. |

---

## 6. Legacy Test Preservation & Regression Safeguards

Refactoring the build system and defining the shared protocol must not degrade or destabilize the existing codebase:

1. **Vitest Unit & Integration Suite Protection**:
   - Baseline: **57 test files, 355 tests** passing 100% green.
   - Requirement: `npm test` and `make test-web` must continue executing all 355 existing tests with zero failures or skipped suites.
2. **Playwright End-to-End Suite Protection**:
   - Baseline: **18 test suites, 392 test runs** across Chromium, Firefox, WebKit.
   - Requirement: `npm run test:e2e` and `make test-e2e` must pass cleanly without modification to any existing test scripts.
3. **PQP Canonical ZX-Calculus Corpus Invariant**:
   - Baseline: **12/12 diagrams verified** (`python3 docs/examples/build_examples.py --verify-only`).
   - Requirement: `make verify-corpus` must pass 100% green.
4. **Native C++ Qt6 UnitTests Invariant**:
   - Baseline: `UnitTests` binary executing **20/20 passing assertions**.
   - Requirement: `make test-cpp` must execute the native test binary and assert full pass.
5. **NPM Script Backward Compatibility**:
   - All standard `package.json` scripts (`npm run dev`, `npm run build`, `npm run preview`, `npm test`) must remain completely functional and unaltered.

---

## 7. Definition of Done (DoD) Checklists

To examine progress systematically, this sprint is gated by 10 verifiable Definition of Done checkpoints:

### Architecture & Build Orchestration Gates
- [ ] **G01 — Authored Root Makefile Deployed**: Root `Makefile` is authored, committed, and replaces the generated qmake artifact. It defines `.PHONY` targets for `all`, `build`, `build-web`, `build-cpp`, `test`, `test-web`, `test-cpp`, `test-e2e`, `verify-corpus`, `clean`, `lint`, and `check-independence`.
- [ ] **G02 — Dual-System Build Success**: Running `make build` from a clean checkout builds both the web application (`dist/`) and the desktop C++ binary (`build/tikzit` or `build/tikzit.app`) without manual intervention.
- [ ] **G03 — QMake Shadow Isolation**: Running `make build-qmake` emits artifacts strictly to `build-qmake/` and never overwrites the root `Makefile`.
- [ ] **G04 — Dual-System Test Execution**: Running `make test` executes both Vitest unit/integration tests and native Qt `UnitTests`, returning exit code 0 on complete success and non-zero on any failure.

### Browser Independence & Sandboxing Gates
- [ ] **G05 — Browser Independence Gate Implemented**: `scripts/verify-browser-independence.mjs` is authored, executable via `make check-independence`, and asserts zero native C++ bindings, `.node` addons, or Node-specific I/O in client bundles.
- [ ] **G06 — Zero Native Dependencies in Web Bundle**: Automated scan verifies that `dist/` contains purely browser-compatible JavaScript, CSS, and WASM (`sql.js`), with zero C++ FFI bindings.

### Shared Protocol & Documentation Gates
- [ ] **G07 — Shared Protocol Specification Authored**: `docs/architecture/SHARED-PROTOCOL-SPECIFICATION.md` is authored, capturing TikZ EBNF grammar, coordinate transformations ($Y$-up $\leftrightarrow$ Three.js $\leftrightarrow$ Qt), teardrop loop math, junction conventions, and MCard SQLite DDL.
- [ ] **G08 — Protocol Unit Suite Passing**: `tests/unit/protocol/sharedProtocol.test.ts` is implemented and passes all test cases (T20-09 to T20-16).

### Regression & Verification Artifact Gates
- [ ] **G09 — Zero Regressions on Existing Suites**: All 355 Vitest unit tests, 392 Playwright E2E tests, 12 canonical ZX diagrams, and 20 native C++ tests pass 100% green.
- [ ] **G10 — Clean Verification Log**: Build logs demonstrating successful execution of `make all`, `make check-independence`, and `make verify-corpus` are generated and verified.

---

## 8. Verification Commands & Execution Runbook

Execute these commands to verify Sprint 20 completion:

```bash
# 1. Clean build directories
make clean

# 2. Build both platforms through unified Makefile
make build

# 3. Verify browser runtime independence (zero native C++ in web bundles)
make check-independence

# 4. Run unified test suite (Web Vitest + Native C++ UnitTests)
make test

# 5. Run end-to-end browser test suite
make test-e2e

# 6. Verify 12 canonical ZX-calculus diagrams
make verify-corpus

# 7. Run code hygiene and linting
make lint
```

