---
title: "S2.21 — Restructure a loaded project from scratch"
type: plan
solution: Layers
status: draft
created: 2026-10-16
---

# S2.21 — Restructure a loaded project from scratch

Add layout-drift detection to the loader (`index.html`, `lib/layers-core.js`) on load and on focus, a "Reanalisar do 0" action that backs up the previous layout to `.design-history/`, and snapshot guidance when the mock is older than the source.

## Context

Traval (`C:\Development\wave\src\ui\traval`) changed a lot (S24.4/S24.7/S24.15), but Layers keeps showing the old UI. Cause, verified in the code and in the project:

- Traval's `layers/mock.html` is hand-made, 77 KB, unchanged since 2026-09-14, and nothing regenerates it. `loadProject` only re-reads the mock, the sheets and `dcSource`; reloading never brings new UI.
- The watched set (`pickWatched`, `index.html:1310`) is `layers.json`, the mock, the CSS sheets and `dcSource`. The `.ts` files the mock cites in `data-src` (`src/ui/shell.ts`) are never seen. The mock styles everything inline, so changing the live CSS does not change what is shown either.
- `checkStale` (`index.html:1554`) only compares mtimes after a load and only says "reload", which keeps selection and camera. There is no "restructure from scratch" and no layout backup: `.bak` and `.design-history/` only cover files written by `approve`.

User decisions (2026-10-16): (1) scope = detect + reload + guide to `tools/layers-snapshot.js`; the headless snapshot from the 2026-09-18 ADR stays out; (2) watch the current set **plus** the files cited in `root.src`/`data-src`; (3) backup only when the user confirms the restructure, on click.

Reuses: `LayersCore.pickWatched/staleFiles/dismissWatch/isManualSource/staleBannerBox` (`lib/layers-core.js`), `checkStale/dismissStale/doReload/reloadProject` and the banner (`index.html:743`, `1554-1580`), `writeText`/`ensureWrite` (conflict guard, `.bak`, `writeLog`), the `.design-history/` directory (already ignored by `vite.config.js` and outside the watch), the `stage:'confirm'` modal, `e2e/stale-banner.spec.js` as the OPFS model.
Out of scope: headless snapshot (own leaf), regenerating Traval's mock, backup retention/pruning, persisting the drift "×" across loads (drift reappears on every load until the mock is regenerated), content hashing to filter a `touch` without changes.

## Design: Architecture & Flows

Flow change only inside the editor: load gains an mtime probe of the cited files; the banner gains a variant; the new action backs up and reloads as a new project.

### Topology (micro)

```
loadProject ──(end of load)──▶ probeLayout()  [NEW]
   │                              │ getFile().lastModified of
   │                              │ mock + cited sources (.ts/.js/.jsx)
   │                              ▼
   │                         LayersCore.layoutDrift(mockMtime, srcMtimes)  [NEW, pure]
   │                              │ sources newer than the mock?
   │                              ▼
   │                         state.drift = { files[] } | null
   ▼
this.watch += cited sources   [EDIT: pickWatched receives the extra list]
   │
focus ─▶ checkStale ─▶ staleFiles ─▶ LayersCore.staleKind(list, structural)  [NEW]
                                         │ 'layout' (mock/layers.json/cited source)  | 'style' (CSS only)
                                         ▼
                              banner: "Recarregar"  (style)
                                      "Reanalisar do 0" (layout or drift)

Reanalisar do 0 ─▶ confirm modal ─▶ backupLayout()  [NEW]
                                      │ ensureWrite + writeText
                                      │ .design-history/layout-<stamp>/{layers.json, <mock>}
                                      │ (in-memory text: this.loaded.{manifest,mock})
                                      ▼ failed → abort, toast, nothing reloads
                                    dropPending + pendingSel=null ─▶ loadProject
                                    (camera/selection/undo reset)
```

### Mockup: drift banner

```
┌──────────────────────────────────────────────────────────────────────┐
│ ▌Mock mais antigo que a fonte: src/ui/shell.ts +2   [Reanalisar do 0] [×] │ <-- NOVO (variant)
└──────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────┐
│ ▌Arquivos mudaram no disco: layers/mock.html        [Reanalisar do 0] [×] │ <-- button swapped (layout)
│ ▌Arquivos mudaram no disco: src/styles/layout.css   [Recarregar]      [×] │     unchanged (style)
└──────────────────────────────────────────────────────────────────────┘
```

Same container, typography and colors as the current banner; only the button label/action and the text change. The `Projetos ▾` menu gains a "Reanalisar do 0" item next to "Recarregar projeto" (`index.html:85`), visible with `hasDir`.

## Tasks

`pre-change-audit` (branch-lifecycle row 1, stack = JS, §B) runs before Task A. Commits cite `S2.21 Task <id>`.

### Task 0: Roadmap leaf and branch

Reserve the leaf before `git checkout -b feature/261016-0-s2-21-restructure-project`; the branch's first commit writes: the `S2.21` row in `docs/roadmap.md` (level 2, parent S2, spec = `docs/text-specs/2026-10-16-s2-21-restructure-project.md`, plan = this plan, status `in-progress`), `S2.21` in S2's `members` in `docs/roadmap.config.json`, and a tracker rebuild (`python ~/.claude/design/_build_proto.py <dir>`). Never on `develop`. Today's other untracked files (the Wave 1 master plan, bench result) stay out of this commit; the text-spec goes in.

### Task A: Pure core functions + tests

`lib/layers-core.js`, `test/layers-core.test.js`. Names `Metodo_Cenario_Esperado`; write the tests first.

- `citedSources(srcs, known, cap=50)`: `srcs` = `data-src` values (`file|sel|line`) plus `man.root.src`. Path contract verified at `index.html:1023-1026` and `layers-core.js:435-439`: the `data-src` `file` lives in the same path space as the sheets' `c.file`, i.e. relative to the folder root with `base` already applied (`P()`); use it as is, never join `base` again. Returns unique files for which `isManualSource(file)` is true, outside `known` (mock, `layers.json`, sheets, `dcFile`), skipping `tpl:` entries; cut at `cap`.
- `layoutDrift(mockMtime, srcMtimes)`: paths whose numeric mtime > `mockMtime`; `'missing'`/absent never count; no mock mtime → `[]`.
- `staleKind(list, structural)`: `'layout'` if any path in `list` is in `structural` (mock, `layers.json`, cited sources), else `'style'`.
- `layoutBackupPaths(stamp, mockPath)`: `{ dir, manifest, mock }` under `.design-history/layout-<stamp>/`; `mock` uses the basename only.
- Verification: `npm test` green, edge cases (empty, `missing`, `tpl:`, cap).

### Task B: Load probe, wider watch and state

`index.html`, `loadProject` and `checkStale`.

- Keep `this.loaded = { manifest: raw, mock: html, mockPath }` at the end of every winning load (the text is already in memory).
- `probeLayout(seq)`: cites sources via `LayersCore.citedSources` over the `rootEl` `data-src` values and `man.root.src`; reads `getFile().lastModified` of each and of the mock; ignores `NotFoundError`; discards if `seq !== this.loadSeq`. Called without `await` at the end of `loadProject` (does not delay the load) and only when `queryPermission==='granted'`.
- Existing cited sources enter `this.watch` (probe mtime); `checkStale` classifies with `staleKind`; `state.drift` holds `layoutDrift`.
- `dismissStale` also clears `drift` (session only).
- State: `drift: null` goes into `loadProject`'s `setState` (next to `stale: null`) and `unloadProject`'s, so the previous folder's drift never shows while the async probe runs (same class as the comment at `index.html:1238`).
- One banner: `staleOpen` becomes `(stale || drift) && dir && project`; `staleMsg` shows the `stale` message when present, else the `drift` one; the button is "Reanalisar do 0" when `staleKind==='layout'` or only `drift` is set.
- Verify with `fixtures/traval` and `fixtures/coffee-masters` (`rules` pointing to `src/pages/…ts`) that cited paths resolve through `getFile()`; `NotFoundError` is ignored.

### Task C: "Reanalisar do 0" with backup

`index.html`: `restructureProject()`, `backupLayout()`, menu item, banner button.

- `restructureProject()`: same guards as `reloadProject` (no modal/pending/diff, `loadedSeq===loadSeq`); always opens the `confirm` modal ("Reanalisar descarta ajustes, seleção e câmera; o layout atual é salvo em `.design-history/`").
- `backupLayout()`: `ensureWrite()` and `writeText` of `layers.json` and the mock from `this.loaded`, at `layoutBackupPaths`. Failure (no permission, read-only folder) aborts before reloading, with a `warn` toast; a partial backup does not count.
- On confirm: `dropPending()`, `pendingSel = null`, `loadProject()` (new project: camera, selection and undo reset, `pending` cleared).
- Banner: `staleKind==='layout'` or `drift` → "Reanalisar do 0" button; `staleMsg` gains "Mock mais antigo que a fonte: …" for drift. No new visual tokens.
- Menu item in the same block as "Recarregar projeto".

### Task D: E2E

`e2e/layout-drift.spec.js` (OPFS + stubbed `showDirectoryPicker`, as in `e2e/stale-banner.spec.js`; names `Metodo_Cenario_Esperado`).

- mtime setup: do not rely on write order (two writes can land in the same millisecond). Read the `lastModified` of the mock and the `.ts` and, if `ts <= mock`, rewrite the `.ts` after a short wait until `ts > mock`; assert `ts > mock` before loading.
- `LayoutDrift_SourceNewerThanMock_ShowsRestructureBanner`: mock, then a newer cited `.ts`; load; banner "Mock mais antigo…".
- `Restructure_Confirmed_BacksUpLayoutAndReloadsFromZero`: confirm; `layers.json` and the mock exist in `.design-history/layout-*/`; selection and camera reset; the project's `layers/v1/pending` cleared.
- `Restructure_BackupFails_DoesNotReload`: folder without write permission; the loaded project stays.
- `LayoutDrift_At1024_BannerKeepsBox`: banner inside `staleBannerBox` at 1024 px.

### Task E: Docs, roadmap and changelog

- `docs/ARCHITECTURE.md` § Recarregar projeto: probe, wider watch, `staleKind`, "Reanalisar do 0", backup and the limit (`.ts` only becomes a warning; the new UI depends on a new snapshot); update line 175 ("Editar `src/**/*.ts` não dispara").
- `docs/layers-json.md` § snapshot: the drift warning and "repeat the snapshot when the UI changes".
- `docs/RELEASE-CHECKLIST.md` reload/warning item; `docs/roadmap.md` S2.21 row: fill `report` and move `in-progress` → `done` (spec and plan already linked in Task 0); tracker rebuild.
- `changelog.d/feature-261016-0-s2-21-restructure-project.md` with `### Perf` (`estimated`: ≤50 `getFile()` per load, off the critical path, no await).

### Task F: Run gates and summarize

`npm test` (unit, commit gate) and the whole `npm run test:e2e` suite; report `exit_code` and the tail. The whole suite is needed: the banner (`z-index:109`) can show up in OPFS specs that copy files one by one (`apply-flow`, `pending-persist`, `write-log-hash`) when a cited source ends up newer than the mock, and cover clicks.

## Verification

1. `npm test` green (new Task A tests).
2. Full `npm run test:e2e` (new spec + regression of `stale-banner`, `apply-flow`, `pending-persist`, `write-log-hash`).
3. Manual, `npm run dev` (port 5180), folder `C:\Development\wave\src\ui\traval`: banner "Mock mais antigo que a fonte: src/ui/shell.ts…" shows on load; "Reanalisar do 0" → confirm → `.design-history/layout-*/` created with the previous `layers.json` and `mock.html`; the project reloads from zero. On an edited `.css` only the "Recarregar" button shows. DevTools › Network shows no request outside `localhost:5180`.
4. Note: restructuring alone does **not** bring Traval's new UI; the user must regenerate `layers/mock.html` with `tools/layers-snapshot.js` on the running app. The warning says so.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 0, A, B, C, D, E | gen | Standard | Workhorse | tracker, logic, tests and project docs; judgment, none matches the Mechanical row |
| C. disk backup (`writeText`, permission, abort) | review | Architectural | Architect | rule 5: writes to the user's disk |
| F | gen | Mechanical | Executor | run a command and summarize; the caller validates `exit_code` and the tail |
| Pre-merge review | review | Architectural | Architect | verifier ≥ generator, via `adversarial-reviewer` |

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — UI feature with disk writes, several files, a traceable follow-up (pattern of S2.10/S2.16).
> Draft to be created (via `gh-issue-gate`):
> - **Title**: `feat: reanalyze a loaded project from scratch with layout drift detection` (≤72 chars)
> - **Labels**: enhancement
> - **Milestone**: (none)
> - **Body**:
>   - `## Context`: Traval's UI changed a lot but Layers kept showing the old one: its mock is hand-made and never regenerated, and the `.ts` files the mock cites in `data-src` are not watched, so reloading reads the same stale mock.
>   - `## Proposal`: probe the cited sources' mtimes on load and on focus; show a drift banner when a source is newer than the mock; add "Reanalisar do 0" (menu and banner) that backs up `layers.json` and the mock to `.design-history/layout-<stamp>/` and reloads as a new project; point to `tools/layers-snapshot.js` for the real fix.
>   - `## Acceptance criteria`: drift banner shown when a cited `.ts` is newer than the mock; backup files exist before the reload; backup failure aborts the reload; camera, selection and saved pending changes reset; CSS-only changes keep the plain "Recarregar" banner; `npm test` and the full e2e suite pass.
>   - `## Refs`: `docs/text-specs/2026-10-16-s2-21-restructure-project.md`.

> [!DECISION] phase-intake
> Classification: **meso** `S2.21` under **S2 Loader de projeto**, target **Unreleased**.
> Current tree (relevant slice): Unreleased › S2 Loader de projeto (in-progress) › S2.20 (done); S2.21 is not in the tracker yet.
> Fork of an existing row? **No** (new sibling of S2.10 "Recarregar projeto").
> Branch: `feature/261016-0-s2-21-restructure-project`; the first commit writes the S2.21 row in `docs/roadmap.md` and `docs/roadmap.config.json` and rebuilds the tracker.
> - **Option A**: meso `S2.21` (recommended)
> - **Option B**: micro `S2.10a` under S2.10 if the scope shrinks

> [!DECISION] execution
> Method: **Subagent-driven** (Tasks A→B→C in series because they touch `index.html`; D and E in parallel after C; F last; Mechanical rows go to the `executor`).
