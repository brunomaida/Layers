---
title: "Auto-create `layers.json` when missing"
type: plan
solution: Layers
status: draft
created: 2026-09-18
---

# Auto-create `layers.json` when missing

Adds a step in `loadProject()` (`index.html:1088-1092`) that, when the connected local
folder has no `layers.json`: automatically creates a minimal manifest **if** the connection
came from a fresh click on "connect folder" (via a new `LayersCore.deriveManifest()` +
the existing `writeText`/`ensureWrite`); otherwise (automatic reconnect on reload, no
gesture) shows the current error panel with a "Create layers.json" button to trigger the
same process under an explicit click. Result: folders without `layers.json` (e.g.
`ccrc-cal`) stop hitting a dead-end error, without breaking the invariant that every disk
write is a direct consequence of a click (`RELEASE-CHECKLIST.md` F:66).

## Context

The user tried to connect `C:\development\ccrc\cal\ccrc-cal` (external project, single
auto-bundled HTML file, no framework, no `layers.json`) in the editor. `loadProject()`
(`index.html:1089`) requires `layers.json` at the root unconditionally — if missing, it
fails straight into a text error panel (`Pasta sem layers.json legível na raiz.`), with no
recovery path inside the app. This is already documented, accepted behavior in
`RELEASE-CHECKLIST.md` (checklist B, item 25 — "empty/error states" — `[x]`), but it only
covers the *message*, not an *exit*.

The user's original request was always-automatic creation. Architectural review (opus)
found that `loadProject()` also fires with no click at all — `restoreSession()`
(`index.html:1001-1019`) calls `useDir()` on page load, when reconnecting an already
authorized folder. Unconditional auto-create would write to disk on that path with no user
intent, breaking the checked item `RELEASE-CHECKLIST.md:66` (F): writes are always a
consequence of a click. User decision: **hybrid** — automatic only on the connect click;
error panel with a button in every other case.

Closest existing tool: `tools/layers-derive.js` (Node CLI, "slice-5 spike, disposable") —
walks the folder, picks a `mock` candidate, derives `base`/`styles`, but only prints JSON to
stdout; it writes nothing and doesn't run in the browser (uses Node's `fs`/`path`, and being
a disposable CLI it never needed a size/time cap). The core heuristic is ported — not the
disk read, nor the blind `styles` fallback (see Approach).

## Design: Architecture & Flows

Change internal to a single component (the Layers app) — no IPC, no other service. Micro
diagram of the internal modules touched and the new hybrid flow in `loadProject()`.

### Internal modules

```
┌────────────────────────┐        ┌──────────────────────────────────┐
│ lib/layers-core.js      │        │ index.html (React app)  [EDIT]    │
│  (pure logic, ES5,      │        │                                    │
│   no fs, no DOM)        │        │ useDir(dir, viaClick)  [EDIT]      │
│                          │        │  stores this.dirViaClick          │
│  deriveManifest(files)  │◀──────▶│                                    │
│   [NEW]                  │  calls │ loadProject()  [EDIT]              │
│  shouldAutoCreate(err,   │        │  readText → NotFound? → hybrid    │
│   hasDir)  [NEW]         │        │                                    │
└────────────────────────┘        │ autoCreateLayersJson()  [NEW]      │
                                    │  ensureWrite → recheck → walk →   │
                                    │  deriveManifest → writeText        │
                                    │                                    │
                                    │ error panel: button                │
                                    │  "Create layers.json"  [NEW]       │
                                    └──────────────────────────────────┘
```

### Flow: hybrid `loadProject()`

```
readText('layers.json')
        │
        ▼
   failed? ──no──▶ JSON.parse(raw) ──ok──▶ continues loading mock/css (unchanged)
        │                   │
       yes                fail
        │                   ▼
        ▼            unloadProject('layers.json inválido')  [NEW state]
 shouldAutoCreate(e, !!state.dir)?  (LayersCore, pure)
        │
        no ──▶ unloadProject(current msg)                    (current behavior)
        │
       yes
        ▼
 this.dirViaClick?  (set by useDir on the connect click)
        │
   ┌────┴─────┐
  yes          no  (reload via restoreSession, no gesture)
   │            │
   ▼            ▼
 autoCreateLayersJson()   unloadProject({ ...current msg, canCreate: true })
   │                        → panel shows "Create layers.json" button
 ┌─┴─┐
 ok    fail
 │      │
 ▼      ▼
raw=    unloadProject({ title, body: reason, canCreate: true })
manifest  → panel with button (retry under an explicit click)
 │
 ▼
JSON.parse(raw) ──▶ continues loading mock/css
(success toast + reason is also recorded in warn[]/body, not just the toast — which fades in 4.2s)
```

"Create layers.json" button (error panel, visible when `loadError.canCreate`): `onClick`
runs `autoCreateLayersJson()` directly — always a fresh click, so `ensureWrite()` never
risks an expired activation there — and on success re-calls `loadProject()`.

## Approach

Follows the separation already in place in the project: pure logic in `lib/layers-core.js`
(classic ES5, `var`/`function`, no `fs`/DOM — "loaded via `<script>` before support.js",
Vitest-testable), I/O orchestration in `index.html`.

### 1. `lib/layers-core.js` — two new pure functions

**`LayersCore.deriveManifest(files)`** — ports the heuristic from
`tools/layers-derive.js:37-82` (HTML candidate by element count, shell/static/inline
classification, `<link rel=stylesheet>` extraction, `base`/`mock` derivation), but
**data-in/data-out**: takes `[{ path: 'index.html', kind: 'html'|'css', text: '...' }, ...]`
(POSIX-relative paths, already filtered through `LayersCore.safePath`) and returns
`{ classification, base, mock, styles }`. Regex over HTML out of necessity, not shortcut: no
`jsdom` in the project, Vitest runs the `node` environment (no `DOMParser`), and an already
parsed `Document` would violate the module's "no DOM" charter — document this in the
function comment, in the same style as the existing annotations there about what the regex
doesn't see.

**Does not port** the fallback from `tools/layers-derive.js:83-89` (no `<link>` in the mock
→ dumps up to 8 arbitrary `.css` files from the tree into `styles`). Acceptable in a CLI
diagnostic that only prints; dangerous written into an authoritative manifest — it injects
unrelated stylesheets into the shadow root on every subsequent load. With no `<link>`,
`styles` stays `[]` (same shape as the `marketview` fixture); the user adjusts it by hand if
needed.

**`LayersCore.shouldAutoCreate(err, hasDir)`** — pure, testable decision, extracted from the
`if` that would otherwise be scattered through `index.html`: `true` only when
`hasDir && err && err.name === 'NotFoundError'`. `false` for `TypeMismatchError`
(`layers.json` exists as a directory), `NotAllowedError` (permission), a generic `Error`
(fixture HTTP/zip/GitHub — read-only origins, should never attempt to write), `null`/`undefined`.

Why `tools/layers-derive.js` is left untouched: it's Node/CLI, uses `fs` directly, remains
useful as a standalone diagnostic — refactoring it to reuse `deriveManifest` is a valid swap
but out of scope for this request.

### 2. `index.html` — `useDir(dir, viaClick)` marks the click origin

`useDir(dir, viaClick = false)`: stores `this.dirViaClick = !!viaClick` before
`setState(..., () => this.loadProject())`. Only the two call sites that originate from a
real click pass `true`:
- `pickDir()` (`index.html:1156`, after `showDirectoryPicker` inside the "connect folder"
  button handler) → `this.useDir(dir, true)`.
- `openHist()`'s permission retry (`index.html:1161`, also inside a click handler, when
  reopening a recent-project entry) → `this.useDir(h, true)`.

`restoreSession()` (`index.html:1019`) keeps the call with no second argument → `false`,
never triggers auto-create.

### 3. `index.html` — new `autoCreateLayersJson()` method

Only ever called (a) by `loadProject()`'s automatic branch when `this.dirViaClick` is
`true`, or (b) by the `onClick` of the "Create layers.json" error-panel button — both cases
are always a direct consequence of a click, preserving `RELEASE-CHECKLIST.md:66`.

1. **`await this.ensureWrite()` first**, before any walk — requests `readwrite` permission
   while the click's transient activation is still fresh, not after a potentially long scan.
   Failure here → returns `{ ok:false, reason: e.message }` directly, without touching disk
   or spending time walking.
2. Recursively walks `this.state.dir` via the FS Access API (`for await (const [name, handle]
   of dir.entries())`), the same `SKIP`/`MAX_DEPTH=6`/dotfile filter as
   `tools/layers-derive.js:15-16,23`, collecting `.html`/`.htm` and `.css`. Safety caps (the
   target tree is an arbitrary folder, including large bundles like `ccrc-cal`):
   - counts **entries visited** (not just matched files) and aborts the walk above a cap
     (e.g. 5000) — a directory with hundreds of thousands of files must never dodge the cap
     just because none of them are `.html`/`.css`;
   - per file, checks `(await handle.getFile()).size` before reading the text; above a cap
     (e.g. 3 MB) the file is skipped (never enters the list);
   - sums a total-bytes-read cap (e.g. 20 MB) and stops reading further content past it.
   - runs every relative path through `LayersCore.safePath` and drops anything that doesn't
     match (names with `\` on a non-Windows host would become a path the loader can't read
     later).
3. Calls `LayersCore.deriveManifest(files)`. No `mock` candidate → `{ ok:false, reason:
   'nenhum HTML legível na pasta' }`.
4. **Rechecks existence immediately before writing** — `await this.fileHandle('layers.json',
   false)`; if it resolves (the file appeared between the initial read and now — another tab,
   an external editor, `git checkout`), aborts with `{ ok:false, reason: 'layers.json
   apareceu enquanto a pasta era analisada — reconecte e tente de novo' }`. Reason:
   `writeText`'s mtime-conflict guard (`index.html:1544-1545`) is inert here —
   `this.mtimes['layers.json']` was never set, because the original read failed.
5. Builds the minimal manifest: `{ name: dirName, viewport: {width:1280,height:760}, mock,
   ...(base && {base}), ...(styles.length && {styles}) }` (same lean shape as the
   `marketview` fixture).
6. `await this.writeText('layers.json', JSON.stringify(manifest, null, 2) + '\n')` — same
   serialization already used by `writeInto` (`index.html:1628`), since the file lands in the
   user's repository. Returns `{ ok:true, manifest }`.

**Concurrency guard**: `loadProject()` is already not re-entrancy-safe for reads; the new
write makes two overlapping connects able to walk/write at the same time. Uses a sequence
token (`this.loadSeq = (this.loadSeq||0)+1`, captured at the start of `loadProject()`) —
checked before the final `setState` and before the write in `autoCreateLayersJson()`; if the
sequence changed (another connect started), aborts without writing.

### 4. `loadProject()` (`index.html:1089`) — split read/parse, decide the hybrid branch

```
try { raw = await readText('layers.json') }
catch (e):
  if LayersCore.shouldAutoCreate(e, !!state.dir):
    if this.dirViaClick:
      result = await autoCreateLayersJson()
      success → raw = JSON.stringify(result.manifest); continues
                (toast 'layers.json criado automaticamente' AND the reason/name also goes
                 into warn[], which the final toast at 1150 already concatenates — survives
                 past the 4.2s)
      fail    → unloadProject({ title: 'Pasta sem layers.json legível na raiz.',
                                 body: current reason + '\n' + result.reason,
                                 canCreate: true }); return
    else (reconnect with no gesture — restoreSession):
      unloadProject({ title: 'Pasta sem layers.json legível na raiz.', body: current msg,
                       canCreate: true }); return
  else (fixture/zip/github, or an error that isn't "doesn't exist"):
    unloadProject(current msg); return   // unchanged behavior

try { man = JSON.parse(raw) }
catch (e): unloadProject({ title: 'layers.json inválido.', body: '... não é JSON válido: ' + e.message }); return
  // NEW error state — today this fell into the same "missing" message
```

The rest of `loadProject()` (mock, css, etc.) is unchanged. The error panel (`emptyTitle`/
`emptyBody`, `index.html:1885-1887`) gets a new derived prop `emptyShowCreateBtn: !!(
s.loadError && s.loadError.canCreate)` and a handler `emptyCreateAction: () =>
this.retryCreateLayersJson()` (calls `autoCreateLayersJson()` and, on success,
`loadProject()` again) — same prop pattern already used for other template buttons (e.g.
`connectDir`, `index.html:1942`).

### The ccrc-cal case specifically

Its `index.html` is a self-unpacking bundle (base64 blob + runtime JS) — only one HTML
candidate, no external `<link>` (`styles` stays `[]`, since the blind fallback removed above
isn't ported). In the common flow (user clicks "connect folder" and picks `ccrc-cal`),
auto-creation fires directly: `{name:"ccrc-cal", viewport:{1280,760}, mock:"index.html"}`.
This clears the current block and lets the loader reach the next real state — likely "empty
mock/few elements, run `tools/layers-snapshot.js`" (`index.html:1126`, already implemented),
because the real content only exists after the runtime unpack. This is the already
documented, expected behavior for "shell" apps, not a new gap — automating the snapshot
itself is out of scope for this plan.

## Files touched

- `lib/layers-core.js` — new `deriveManifest` and `shouldAutoCreate` functions (ES5, module
  style).
- `index.html` — `useDir()` (new `viaClick` parameter), `loadProject()` (split try/catch +
  hybrid branch), new `autoCreateLayersJson()` method, new "Create layers.json" button in
  the error panel.
- `test/layers-core.test.js` — new `describe('DeriveManifest', …)`: candidate with external
  CSS; single HTML with inline `<style>` and no external CSS (`styles: []`, no blind
  fallback); multiple HTML files (tie-break by element count); no HTML (`mock: null`);
  referenced CSS missing from the list (filtered out); `base` when the mock lives in a
  subfolder; the special `base === 'layers' || '.'` case; `href` filtering for
  `http(s)://`/`//`/`data:`/`?query`; an `href` resolving outside `base` (dropped); `shell`
  classification (empty `<div id="app"></div>`). New `describe('ShouldAutoCreate', …)`:
  `NotFoundError`+dir → `true`; `NotFoundError` without dir → `false`;
  `TypeMismatchError`/`NotAllowedError`/generic `Error` (fixture/zip/repo) → `false`; null
  error → `false`.
- `docs/layers-json.md` — short note: a local folder without `layers.json`, connected via
  click, attempts auto-creation; the generated file follows the same documented contract.
- `docs/ARCHITECTURE.md` — update the loader flow (new conditional branch before the parse).
- `docs/RELEASE-CHECKLIST.md` — new line under checklist B: auto-creation of a missing
  `layers.json` (local folder, connect click) + retry button in the error panel; note that
  item 25 (empty/error states) now also covers "invalid layers.json" as a state distinct
  from "missing". F:66 stays valid as written — the new write is still always a consequence
  of a click (connect, or the retry button).
- `changelog.d/<slug>.md` — branch fragment (via the `changelog-draft` skill, at close-out).

## Verification

1. `npm test` — existing Vitest suite + new `DeriveManifest`/`ShouldAutoCreate` cases
   passing.
2. Manual (click): `run.bat` → "connect folder" → `C:\development\ccrc\cal\ccrc-cal` →
   confirm `layers.json` was created at the root with the expected content, a success notice
   visible beyond the toast's 4.2s (in the body of the next state, if any), the app advances
   to the next real state (empty mock → points at `layers-snapshot.js`).
3. Manual (reload, no gesture): with `ccrc-cal` already connected and authorized, reload the
   page (triggers `restoreSession`) before `layers.json` exists — confirm there is **no**
   write/permission attempt, and the error panel shows the "Create layers.json" button;
   click the button and confirm the file is created then.
4. Regression: open an existing fixture (e.g. `fixtures/traval`, already has `layers.json`)
   — confirm no auto-creation fires and normal loading is unchanged.
5. Destructive regression: local folder with `layers.json` present but invalid JSON —
   confirm the new "`layers.json` inválido" message (distinct from "missing") and that the
   file is **not** overwritten.
6. Confirm that denying write permission (revoke it in the browser before clicking "connect
   folder") falls through to the failure toast + error panel with the button, no unhandled
   exception.
7. Round-trip: the generated `layers.json`, read again by `loadProject()` on the next
   connect, must parse and load without difference (confirms the
   `JSON.stringify(man, null, 2) + '\n'` serialization is compatible with the existing
   parser).

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 1. `deriveManifest`/`shouldAutoCreate` + `autoCreateLayersJson` + `loadProject`/`useDir` + tests | gen | Standard | sonnet | Bounded change, no hot-path/HFT |
| 2. Architectural review of the plan (pre-implementation) | review | Architectural | opus | Already run — found the transient-activation/F:66 gap; plan revised in response |
| 3. Pre-merge review of the final diff | review | Architectural | opus | `adversarial-reviewer`; verifier ≥ generator (sonnet) |

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — new, user-visible feature, touches >2 files (`lib/layers-core.js`,
> `index.html`, `test/layers-core.test.js`, docs).
> Issue created: [`brunomaida/Layers#13`](https://github.com/brunomaida/Layers/issues/13) —
> `feat: auto-create layers.json on click-driven folder connect` (label: enhancement).
> Marker: `#13` (recorded at `~/.claude/.cache/gh-issue-gate/layers.json`, branch
> `feature/260918-13-auto-create-layers-json`).

> [!DECISION] phase-intake
> Project "Layers" has no proto config under `~/.claude/design/proto/` (not roadmap-tracked)
> → gate skipped silently, per the skill's own instructions.
