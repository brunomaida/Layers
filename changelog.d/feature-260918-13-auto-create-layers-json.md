### feature/260918-13-auto-create-layers-json — 2026-09-18

#### Added
- `LayersCore.deriveManifest()`/`shouldAutoCreate()` (pure, `lib/layers-core.js`): heuristic ported from `tools/layers-derive.js` to pick a `mock` candidate and derive `base`/`styles` from an already-collected file list.
- Auto-creation of a minimal `layers.json` when a click-driven folder connect finds none, plus a "Criar layers.json" retry button in the error panel for the no-gesture (reload) case.
- Distinct "layers.json inválido" error state for an existing-but-malformed manifest, never auto-created over.

#### Changed
- `run.bat` now passes `--open` to Vite so the dev server opens the browser automatically.

#### Fixed
- `loadProject()` no longer conflates "layers.json missing" and "layers.json present but invalid JSON" into the same error message.
  - Root-cause: single try/catch wrapped both `readText('layers.json')` and `JSON.parse` · Regression-test: manual verification step 5 in `docs/superpowers/plans/2026-09-18-layers-auto-criacao-de-layers-json-quando.md` (no automated harness for `index.html` yet — see `docs/RELEASE-CHECKLIST.md` § E)

#### Perf
- **estimated** — no `path-tiers.json` in this project (frontend/static app, no hot-path config); the new folder walk only runs once per click-driven connect when `layers.json` is absent, bounded by explicit caps (5000 entries visited, 3 MB per file, 20 MB total) — no impact on the existing load path when `layers.json` already exists (the common case, unchanged).

#### Commits
- `be9f0d5` — fix: open default browser automatically when run.bat starts
- `e7ced8c` — feat: auto-create layers.json on click-driven folder connect
