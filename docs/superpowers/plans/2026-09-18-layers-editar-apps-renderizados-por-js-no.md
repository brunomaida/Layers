---
title: "Edit JS-rendered apps in Layers: dc template mapper + tiered writer"
type: plan
solution: Layers
status: done
created: 2026-09-18
---

# Edit JS-rendered apps in Layers: dc template mapper + tiered writer

Adds a pure `<x-dc>` template mapper and an inline-style patch to `lib/layers-core.js`, wires them into the `index.html` writer as tiered write paths that refuse with a stable code instead of guessing, and extracts the `buildProjectFromHtml` seam from `loadProject`. Issue: #15. Branch: `feature/260918-15-dc-template-writer`.

## Context

The editor is itself a dc app (`<x-dc>` template + `support.js` runtime), so its layers are invisible to a static parser, and the writer only patched `.css`. The runtime already stamps `data-dc-tpl="N"` on every element (`support.js:474`, `:799`) and `tools/layers-snapshot.js` keeps it, so a pure mapper is enough for the editor to be its own target. No server is needed for that.

An Opus architecture review compared three ways to read JS-rendered apps:

| Option | Verdict | Deciding reason |
|---|---|---|
| Same-origin proxy + `contentDocument` | **Refuted** | Target code would run on `:5180` and reach the writable folder handle in IndexedDB (`layers-hist`) plus the granted `readwrite` permission |
| Cross-origin iframe + injected probe | Rejected | Same serialization cost as a snapshot, plus `frame-src` and an injection that only works for proxied targets |
| Headless snapshot in a separate process (`/__layers/*` on `:5180`) | **Chosen, later** | Zero CSP delta; target JS never runs in the editor origin; reuses the existing sanitizer |

Scope decisions: slices 0-2 only (no server, no Playwright); an unwritable property is **refused with a reason and a copy-paste snippet**, never written to a `layers/overrides.css` sidecar. The ADR is in `docs/architecture-decisions.md` (2026-09-18).

## Design: Architecture & Flows

Scope: the editor write path. No new process, no CSP change.

### Topology

```
 target (dogfood = this repo)               editor (index.html, :5180)
┌──────────────────────────┐   1 snapshot   ┌─────────────────────────────────────┐
│ index.html  <x-dc> tpl   │ ─(manual)────▶ │ layers/mock.html (data-dc-tpl=N)    │
│ (source, writable)       │  layers-       └──────────────┬──────────────────────┘
└────────────▲─────────────┘  snapshot.js                  │ 2 loadProject
             │                                             ▼
             │                              ┌─────────────────────────────────┐
             │                              │ buildProjectFromHtml  [EXTRACTED]│
             │                              │ sanitize → scope → data-src     │
             │                              │ data-dc-tpl → "tpl:N" [NEW]     │
             │                              └──────────────┬──────────────────┘
             │  5 patchDc + writeText                      │ 3 user edit
             │  (.bak, mtime, .tmp)                        ▼
┌────────────┴─────────────┐  4 resolve   ┌─────────────────────────────────────┐
│ LayersCore [NEW]         │ ◀─────────── │ tiered writer [EDIT]                │
│  mapDcTemplate           │              │  css rule  → patchCssAt (existing)  │
│  patchAttrAt / patchDc   │              │  tpl:N     → patchDc                │
│  checkDcMap              │              │  otherwise → REFUSE + code + snippet│
└──────────────────────────┘              └─────────────────────────────────────┘
```

### Writer decision flow (per edit)

```
 edit (prop, from, to, data-src)
        │
        ▼
 data-src = "tpl:N"? ──no──▶ .css? ──yes──▶ patchCssAt (unchanged)
        │yes                    │no
        ▼                       ▼
 template structure still     REFUSE SOURCE_NOT_CSS / SNAPSHOT_STYLE
 the same as at load?
   │no → MAP_MISALIGNED (every edit of the file)
   │yes
   ▼
 element has style=""? ──no──▶ NO_INLINE_STYLE
 prop declared there?  ──no──▶ PROP_NOT_INLINE
 value has {{ }}?      ──yes─▶ VALUE_HAS_BINDING
 source still equals what load saw? ──no──▶ SOURCE_CHANGED
 new value safe for the attribute?  ──no──▶ VALUE_UNSAFE
   │yes → patch → draft → diff → approve
```

## Changes (as built)

- **Slice 0** (`lib/layers-core.js`): `mapDcTemplate` counts start tags of the `<x-dc>` block in runtime stamping order (comments, raw-text elements, quoted `>`, unquoted attributes, `html/head/body` handled) and records each `style=""` range and line. `styleDeclAt`, `patchAttrAt`, `checkDcMap` and the frozen `DC_CODES` enum. All DOM-free.
- **Slice 1** (`index.html`, `vite.config.js`): manifest field `dcSource`; `loadProject` validates the map against the rendered tags and stamps `data-src = file|tpl:N|line`; `patchDc` (core) applies several edits with a stale-source guard and per-edit refusal; draft/approve/diff/export use it; `dcWhy` maps codes to UI text. `server.watch.ignored` covers draft, history, `.bak`, `.tmp`. New authored fixture `fixtures/dc-template/`.
- **Slice 2** (`index.html`): `buildProjectFromHtml` is a module-level function that only returns data; the `@font-face` hoist, `varIdx` assignment and shadow-root mount stay in `loadProject`.
- **Docs**: ADR 2026-09-18; `ARCHITECTURE.md` (write-layer table, loader section, no more iframe promise); `TOPOLOGY.md` boundary row; `layers-json.md` `dcSource`.

### Deviations from the approved plan

| Plan | Built | Why |
|---|---|---|
| `patchAttrAt(text, range, prop, value)` | `patchAttrAt(text, range, prop, from, to)` | The stale-source guard needs the expected current value |
| `MapDcTemplate_TagInserida_RetornaDesalinhado` | `CheckDcMap_TagDivergente_RetornaMapaDesalinhado` | Misalignment is detected by comparing against the rendered tags, not by the mapper alone |
| Code enum of 9 | 12 (`NO_INLINE_STYLE`, `PROP_NOT_INLINE`, `VALUE_UNSAFE` added) | Three refusal cases the plan's list did not cover |
| `UTILITY_SHEET`, `READONLY_ORIGIN` as UI codes | Reserved in the enum; existing toasts unchanged | Surgical: those guards already had working messages |
| `buildProjectFromHtml(html, man)` | Takes `{ doc, html, man, css, dcFile, dcText, mockPath, mockDir, warn }` | Link discovery needs the parsed document before the seam runs |
| `dcSource` read inside the seam | Read by the caller, passed as `dcText` | Keeps the seam synchronous and side-effect free |

## Deferred (own plan)

| Item | Why later |
|---|---|
| Measurement spike (Playwright once against a Vite+React app: does `data-vite-dev-id` survive?) | Decides whether SPAs are ever patchable |
| Slice 3: `/__layers/snapshot`, `playwright.config.js`, first E2E | New security surface; ~170 MB Chromium; `npm run test:e2e` fails today |
| Slice 4: SPA provenance via `data-vite-dev-id` | Depends on the spike |
| Slice 5: re-snapshot cost; a re-snapshot must not renew `mtimes` of files with pending changes | Measure first |
| MCP / plugin / local-server track | Own plan; see the session note. Riskiest assumption: an AI that can already edit CSS files will route through Layers |

## Verification

| Check | Result |
|---|---|
| `npm test` | 122/122 (79 existing + 43 new) |
| Mapper vs the running editor (`__dcAnnotatedTemplate`) | 728/728 elements, 0 tag mismatches, 0 `style` presence mismatches |
| Loader on `fixtures/dc-template` | 5/5 elements stamped `index.html\|tpl:N\|line` with correct lines; tree renders, no error |
| Seam extraction | Identical fingerprint before/after on 4 fixtures (traval 429 nodes, plain-css 7, todomvc-react 41, dc-template 6): `data-src`, `data-name`, scoped CSS and computed styles hashes equal |
| Opus adversarial review | 1 blocker fixed: content of a nested `<template>` is not stamped by the runtime, so the tokenizer shifted every later `tplId` while the tag-only guard passed. Fixed in the tokenizer plus a second guard comparing literal `style=""` values against the render (0 false positives on 129 real editor elements; a one-index shift is caught on 95/97). Also fixed: `approve` recomputes the patch and refuses on mismatch, silent skip of an undrafted dc file, non-`tpl:` changes in the dc file, `dc.text` refresh after approve, `dcSource` must be `.html`, `Object.prototype` tag names. Not fixed, noted: warning order of `hoistFaces` changed; `attrNames` and 3 reserved codes unused |
| Perf | `mapDcTemplate` 0.68 ms per call on the 304 KB editor template (728 elements, Node 24); one-edit `patchDc` 2.85 ms |
| **Not verified** | The real write (connect folder → edit → draft → approve → one-line diff in `index.html`). `showDirectoryPicker` needs a user gesture, so it is manual. No harness exists for `index.html` (E2E is checklist E) |

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| Design review | review | Architectural | opus | Requested; verifier ≥ generator |
| Slices 0-2, docs | gen | Standard | sonnet | Pure logic with TDD; anchored edits in `index.html` |
| Pre-merge review | review | Architectural | opus | Verifier ≥ generator; disk-write surface |
