### feature/260918-15-dc-template-writer — 2026-09-18

#### Added
- `LayersCore.mapDcTemplate`, `patchAttrAt`, `patchDc`, `styleDecls`, `styleDeclAt`, `checkDcMap` and a frozen `DC_CODES` enum: an element rendered from a dc `<x-dc>` template can now be mapped back to its `style=""` in the source file and edited, and every refusal returns a stable code instead of guessing.
- `layers.json` field `dcSource`: elements with `data-dc-tpl` get `data-src` `file|tpl:N|line`; draft, diff, approve and export patch literal `style=""` values in the template, with a reason and a copy-paste snippet for every refused edit.
- Fixture `fixtures/dc-template/` (authored, 5 elements) for the dc template path.

#### Changed
- `loadProject` delegates sanitize, scoping, root and `data-src` assignment to a module-level `buildProjectFromHtml` that only returns data; the `@font-face` hoist and shadow-root mount stay with the caller. Rendered output is identical on four fixtures. `hoistFaces` warnings now come after the utility-sheet and `rules` warnings, so `warn[0]` in the toast can differ.
- `approve` recomputes the dc patch on the current file and refuses to promote a draft that no longer matches it.
- `vite.config.js` ignores draft, history, `.bak` and `.tmp` files so writing a `.html` draft does not reload the editor.
- ADR 2026-09-18 (JS-rendered targets: no iframe, no same origin), `ARCHITECTURE.md` write-layer table and loader section, `TOPOLOGY.md` boundary row, `layers-json.md` `dcSource`.

#### Fixed
- Pre-merge review blocker: the content of a nested `<template>` is not stamped by the runtime but was counted by the mapper, shifting every later `tplId` while the tag-only guard passed, so an edit could land on the wrong element.
  - Root-cause: #15 · Regression-test: `test/layers-core.test.js` › `PatchDc` › `TemplateAninhado_EditaOElementoVisivelENaoOEscondido`

#### Perf
- **measured** — `mapDcTemplate` on the 304 KB editor template (728 elements): 0.68 ms per call; `patchDc` with one edit: 2.85 ms (Node 24, warm). The map is built once per load and once per edit, so the cost is negligible next to the existing `scan()`.

#### Commits
- `f182b14` — feat: add dc template mapper and inline style patch to core
- `548cc31` — feat: add patchDc to apply template edits with stale-source guard
- `279aa7c` — feat: tiered writer for dc template inline styles with coded refusals
- `3e47cdf` — refactor: extract buildProjectFromHtml seam from loadProject
- `21411e9` — docs: add ADR for JS-rendered targets, write-layer table and dcSource field
- `aa48eeb` — fix: close pre-merge review findings in dc template writer
- `592c823` — docs: record pre-merge review outcome in the canonical plan
