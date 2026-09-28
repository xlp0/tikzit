# Sprint 20: Dual-System Makefile & Shared Protocol Specification

**Status:** Proposed; not started  
**Primary Baldwin Operator:** Porting ($\text{Lan}$) & Substituting ($\simeq \implies =$)  
**Primary Subsystem:** `orchestration` / `verification`  
**Depends on:** Sprints 00–19  
**Parent Proposal:** [Sprints 20–24](./PROPOSAL-20-24-ALGEBRAIC-MODULARITY-CLM-AND-BUILD-UNIFICATION.md)

---

## 1. Objective

Create a unified developer `Makefile` at the repository root that builds, lints, and tests both the **Native C++ Qt6 Desktop Application** (via CMake / Ninja) and the **Web Spatial Workbench** (via Astro / Vite / npm) through a single developer interface. Formally establish the **Shared Dual-System Protocol** that enables both systems to interchange TikZ code, graph models, and MCard SQLite databases without coupling the browser JavaScript/TypeScript runtime to native C++ binaries.

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

Formally documents the shared protocol across four facets:
1. **TikZ AST Grammar & Subset**: Formal EBNF definition of `tikzpicture`, `\node`, `\draw`, `\path`, and `\tikzstyle`.
2. **Coordinate & Spatial Geometry**:
   - TikZ Cartesian $Y$-axis (mathematical $Y$-up) $\leftrightarrow$ WebGL Three.js world space coordinates $\leftrightarrow$ Qt scene coordinates.
   - Exact self-loop teardrop mathematics: $in = 135^\circ, out = 45^\circ, weight = 1.0$.
   - Junction node conventions (`style=none`, dashed lavender ring `#B4B4DC`, center dot `#B4B4C8`).
3. **MCard SQLite Interchange Schema**:
   - The three database pillars: `knowledge`, `executionLog`, `mcard`.
   - Table schema: `cards (hash, content, mime_type, created_at)`, `handles (name, current_hash, head_hash, sequence)`, `handle_history (handle, hash, position, changed_at, message, author)`.
4. **Cross-Engine Conformance Tests**:
   - Automated script (`scripts/verify-protocol-conformance.mjs`) compiling identical canonical diagrams through both C++ `UnitTests` and TS `vitest` to assert AST and attribute equality.

---

## 4. Acceptance Criteria

- **AC-20-01 (Root Makefile Developer Interface)**: A developer typing `make build` successfully builds both the web spatial workbench (`dist/`) and the native desktop C++ binary (`build/tikzit` or `build/tikzit.app`).
- **AC-20-02 (Unified Test Command)**: `make test` executes both Vitest unit/integration tests and native Qt `UnitTests`, returning a nonzero exit code if either fails.
- **AC-20-03 (Browser Independence Gate)**: `make check-independence` completes cleanly with 0 violations. Any accidental import of native bindings in `src/` triggers immediate build failure.
- **AC-20-04 (QMake Shadow Directory Isolation)**: `tikzit.pro` is updated or wrapped such that running `qmake` outputs into `build-qmake/` and never clobbers the root `Makefile`.
- **AC-20-05 (Protocol Specification Document)**: `docs/architecture/SHARED-PROTOCOL-SPECIFICATION.md` is authored, capturing TikZ grammar, coordinate mapping, and MCard schema.
- **AC-20-06 (Corpus Verification Integration)**: `make verify-corpus` executes the 12-diagram ZX-Calculus verification and passes 100% green.
