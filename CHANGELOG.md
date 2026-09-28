# Changelog

All notable changes to the TikZiT project are documented weekly in the [`docs/changelog/`](docs/changelog/) directory in accordance with ISO week naming (`YYYY-Www.md`).

## Latest Entries

- [**2026-W40 (2026-09-28 – 2026-10-04)**](docs/changelog/2026-W40.md):
  - **Web Spatial Workbench Implementation**: Sprints 00 through 08 graduated into production with 183 Vitest tests and 59 Playwright E2E tests passing.
  - **Core Engines**: TypeScript TikZ AST parser/lexer, Three.js WebGL infinite canvas, Dockview multi-dock workbench, Nanostores/Cordis state flux, live TeX preview, PDF/SVG exporters, and MCard persistence.
  - **Desktop Parity Series (Sprints 09–12)**: Authored full implementation specifications for media asset pipeline, macOS dark window chrome, green active tool borders, white paper canvas calibration, and teardrop self-loop mathematics — then audited against the C++ source, correcting constants (`#DCDCF0` axes, `0.05`-unit edges) and adding Dockview-preservation and selector-stability contracts plus per-AC verification tables.
- [**2026-W39 (2026-09-21 – 2026-09-27)**](docs/changelog/2026-W39.md):
  - Initial web-rebuild roadmap and architecture specifications.
  - 12-diagram ZX-calculus reference corpus with SVGs and build scripts.
  - CMake Qt6 build and macOS deployment fixes.

For the complete archive of weekly logs, see [docs/changelog/README.md](docs/changelog/README.md).
