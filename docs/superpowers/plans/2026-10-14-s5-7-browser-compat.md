---
title: "S5.7 Browser Compatibility Implementation Plan"
type: plan
solution: Layers
status: draft
created: 2026-10-14
---

# S5.7 Browser Compatibility Implementation Plan

Prove the checklist E line "Chrome/Edge completos; Firefox/Safari em somente leitura com mensagem" with Playwright projects per engine (`chromium`, `chrome`, `msedge`, `firefox`, `webkit`), a new `e2e/browser-compat.spec.js` with an in-page feature-detection matrix, one-line fix of the read-only refusal hint in `index.html`, explicit manual checks for what Playwright cannot drive, and an evidence report that S7.3 "Matriz de suporte" consumes.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Context

Checklist E, last open item (`docs/RELEASE-CHECKLIST.md:62`): `- [ ] Compatibilidade: Chrome/Edge completos; Firefox/Safari em somente leitura com mensagem.` Roadmap row S5.7 (`docs/roadmap.md:61`, status `registered`). S7.3 (`docs/RELEASE-CHECKLIST.md:81`, browsers × leitura/edição/gravação) waits on this leaf; S7.1 already deferred the README "(Chrome/Edge)" marks (`README.md:13`, `:36`, `:37`) to S7.3.

### Goal

- "Compatible" is the checklist line, made testable:
  - **Full tier (Chrome, Edge):** read, edit, diff, draft, approve, rollback, export, on a real connected folder.
  - **Read-only tier (Firefox, Safari):** the app loads with no page error and no external request, reads projects from the sources that do not need File System Access (fixture `?layers=`, public GitHub repo), edits in memory and shows the simulated diff; every write entry point refuses with a message that names the limitation and the browsers that write.
- Verification by in-page feature detection, never by user-agent or project name: the app itself branches on `window.showDirectoryPicker` (`index.html:1387`, `:2203`), so the tests do too.
- Claims hold for the **tested versions only** (`[!DECISION] version-claims`): what is installed on the reference machine at execution time. Today: Playwright 1.63.0 with Chromium 153.0.8010.12 (rev 1243), Firefox 155.0 (rev 1543), WebKit 26.6 (rev 2359), all already in `%LOCALAPPDATA%\ms-playwright`; system Chrome 155.0.x and Edge 155.0.x installed (`channel: 'chrome'` / `'msedge'`).

### Non-goals

- Making Firefox or Safari write (no polyfill, no download-based "save as" fallback).
- New read sources for non-Chromium engines (`<input type="file">` for `.zip`, `<input webkitdirectory>` for folders): `[!DECISION] readonly-sources`.
- Any visual change: no new UI element, color, typography or spacing. Known cosmetic engine differences are recorded, not fixed (below).
- Performance budgets on Firefox/WebKit (checklist D is measured on Chromium; `e2e/perf.spec.js` stays Chromium-only, it needs CDP/LoAF).
- The S7.3 support-matrix document, README edits, and the checklist counter (`docs/RELEASE-CHECKLIST.md:8`, recounted by the dedicated integration step, not by this leaf).

### Feature inventory (verified by grep, not recalled)

| Feature | Where | Tier | Behavior when absent |
|---|---|---|---|
| `showDirectoryPicker` | `index.html:1387-1389` (connect), `:1937-1939` (export target), `:2203` (empty-stage text) | write | toast "File System Access API indisponível — use Chrome ou Edge…" / empty-stage text "Este navegador não tem a File System Access API…" |
| `showOpenFilePicker` | `:1400-1402` (`.zip`), `:1207-1209` (import config) | write (zip is a read source, but its picker is FS Access) | toast "Abrir .zip usa a File System Access API — abra no Chrome ou Edge." |
| `showSaveFilePicker` | `:1199-1201` (export config) | write | toast "Exportar configuração usa…" |
| `queryPermission` / `requestPermission` | `:1161-1162`, `:1394`, `:1532`, `:1818-1820` | write | guarded (`if (!d.queryPermission) return true`) |
| `createWritable` | `:903` `writeInto`, `:1839`, `:1847` | write | only reached with a handle |
| `FileSystemFileHandle.move` | `:1840-1841` | write | falls back to `rawWrite` + `removeEntry` |
| `for await … dirHandle.entries()` | `:1336` (auto-create `layers.json`) | write | only reached with a handle |
| IndexedDB (stores the folder handle) | `:974` `idb` | read (history) | rejects `no idb`; history keeps working from `localStorage` |
| `fetch` | `:1427`, `:1773`, `:1778`, `:1786` (fixture, GitHub) | read | — (baseline) |
| `TextDecoder` | `:1779` (`readText` for `.zip` and GitHub sources) | read | — (baseline) |
| `DOMParser`, `attachShadow`, `ResizeObserver`, `document.fonts`, `URL.createObjectURL` (`blob:` fonts) | `:1283`, `:1285`, `:1488`, `:1503`, `:1804`, `:1312` | read | — (baseline) |
| `CSS.supports` | `:1656`, `:1724` (edit validation) | edit | guarded (`window.CSS && CSS.supports`) |
| `crypto.subtle.digest` | `lib/layers-core.js:772-774` | write log | degrades to `sha256: null` |
| `DecompressionStream('deflate-raw')` | `lib/layers-core.js:609-610` | `.zip` read | `.zip` unreachable without `showOpenFilePicker` anyway |
| `transform-style: preserve-3d`, `perspective` | `:2004-2005` (`preserve-3d`), `:2007` (`perspective`) | read (the 3D view) | would flatten: the visual check M3 below |
| `?.` / `??`, `customElements` | `support.js` (generated runtime, 20 / 16 / 4 occurrences) | read | — (baseline) |
| Cosmetic: `::-webkit-scrollbar` (`index.html` `<style>`), `text-wrap:pretty` (7 hits), `accent-color` (9 hits) | `<helmet>` and inline styles | none | ignored by the engine; range inputs already have both `::-webkit-slider-*` and `::-moz-range-*` |

Grep hits that are **not** dependencies: `oklch` (`:878`, a value-classifier regex), `popover` (`:2159`, a PT-BR UI string), `@layer` (`:1018`, a comment), `findLast` (`vendor/csstree.js`, css-tree's own `walk.findLast`, not `Array.prototype.findLast`), `\p{` in `support.js` (matches CSS text like `.nowrap{`, not a Unicode-property regex).

Cosmetic differences recorded, not fixed (visual frozen): Firefox ignores `::-webkit-scrollbar` and shows its default scrollbars. Adding `scrollbar-width`/`scrollbar-color` is **not** an option: Chromium 121+ honors them too and they override `::-webkit-scrollbar`, so the frozen Chrome look would change.

### Gaps found in the code today

1. `readOnlyBlock()` (`index.html:1440-1445`, comment `:1438-1439`, toast `:1443`) is the refusal for draft (`:1878`), approve (`:1894`) and full export (`:1935`). Without a connected folder it says "… que é somente leitura. Conecte a pasta local para gravar." On Firefox/Safari a folder can never be connected, so the hint is wrong. One-line fix (`[!DECISION] readonly-message`): pick the hint by `window.showDirectoryPicker`. Because `readOnlyBlock` runs before the `exportFull` capability check (`:1935` vs `:1937`), the same line also fixes export. No reorder of `exportFull` is needed. That hunk was reserved for S5.7 by the S6.2 plan and stays untouched.
2. The simulated-diff note (`:1930`, "(simulado — conecte a pasta para o diff real)") has the same wording problem but describes a diff, not a refusal. It stays as is unless Option B of `[!DECISION] readonly-message` is chosen.
3. No test runs outside Chromium: `playwright.config.js` pins `browserName: 'chromium'`, `channel: 'chromium'` at top level and defines no `projects`.

Reuses: `readNodes` from `e2e/tree-helpers.js`; `selectLayer` from `e2e/folder-helpers.js`; `e2e/__snapshots__/tree.json` (expected trees); the "Sombra" field locator and `.card` edit from `e2e/apply-flow.spec.js` / `e2e/undo-redo.spec.js`; `e2e/apply-flow.spec.js` itself, unchanged, as the write-path proof on `chrome`/`msedge`; snapshot regeneration convention `UPDATE_SNAPSHOT=1` from `e2e/tree-snapshot.spec.js`.
Parallel leaves: merge order is **S5.7 first**, then S4.4b → S3.2 → S4.6. S3.2 depends on this leaf's `playwright.config.js`: its `e2e/menu-visual.spec.js` screenshots must keep resolving once projects are named, hence the top-level `snapshotPathTemplate` of Task 1. No other leaf touches `readOnlyBlock`. `docs/roadmap.data.json` is regenerated by several leaves: rebuild it with the `roadmap` skill after each merge, never merge it by hand. S4.7 virtualizes the tree, so raw `[data-node-id]` stays inside `selectLayer`.

## Design: Architecture & Flows

### Topology (macro)

```
                         playwright.config.js [EDIT]: top-level use keeps baseURL/viewport only
 ┌────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
 │ chromium   │ chrome       │ msedge       │ firefox      │ webkit       │
 │ PW 153     │ installed 155│ installed 155│ PW 155.0     │ PW 26.6      │
 │ all specs  │ compat +     │ compat +     │ compat only  │ compat only  │
 │ (as today) │ apply-flow   │ apply-flow   │              │ (Safari proxy)│
 └─────┬──────┴──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘
       └─────────────┴──────┬───────┴──────────────┴──────────────┘
                            ▼
            e2e/browser-compat.spec.js [NEW]
            ├─ probes ─────────────────▶ e2e/__snapshots__/compat-probes.json [NEW]
            ├─ read: ?layers=fixtures/* vs tree.json (no rootBox), no pageerror, no egress
            ├─ edit: plain-css .card › Sombra › Ver diff (simulated)
            ├─ write, FS present: proven by apply-flow.spec.js on chrome/msedge (OPFS stub)
            ├─ write, FS absent: each entry point refuses naming the browser
            │                         ▲
            │            index.html readOnlyBlock() [EDIT, 1 line + 1 comment line]
            ├─ GitHub source: page.route(api/raw) ─▶ fixtures/plain-css (no real egress)
            └─ screenshots ─▶ test-results/ (gitignored) ─▶ human visual review (M3)
                            │
                            ▼
            docs/superpowers/reports/2026-10-14-s5-7-compat-evidence.md [NEW, PT-BR]
            = input of S7.3 (versions, probe matrix, behavior matrix, messages, manual results)
```

### Flow: write entry points by capability (micro)

```
click                                   capability                     message (toast)
───────────────────────────────────────────────────────────────────────────────────────────────
Conectar pasta local…        ──▶ !showDirectoryPicker ──▶ "File System Access API indisponível — use Chrome ou Edge. …" (exists)
Abrir arquivo .zip…          ──▶ !showOpenFilePicker  ──▶ "Abrir .zip usa a File System Access API — …"            (exists)
Exportar/Importar config     ──▶ !show{Save,Open}FilePicker ──▶ "… use a File System Access API — …"                 (exists)
Gerar rascunho / Aprovar /   ──▶ readOnlyBlock(): !state.dir
Exportar versões completas          ├─ showDirectoryPicker present ──▶ "… somente leitura. Conecte a pasta local para gravar." (unchanged)
                                    └─ absent ──────────────────────▶ "… somente leitura. Este navegador não grava em disco — use Chrome ou Edge." [NEW]
```

## File Structure

| File | Responsibility |
|---|---|
| `playwright.config.js` | five projects; existing suite stays on `chromium` |
| `e2e/browser-compat.spec.js` | probes, read parity, edit/diff, no-FS refusals, GitHub source, screenshots |
| `e2e/__snapshots__/compat-probes.json` | per-project feature-detection matrix (regression guard + S7.3 data) |
| `index.html` | `readOnlyBlock` hint by capability (Task 3, one anchor) |
| `docs/superpowers/reports/2026-10-14-s5-7-compat-evidence.md` | evidence for S7.3 (PT-BR) |
| `docs/RELEASE-CHECKLIST.md` | line 62 only (line 8 untouched) |
| `docs/LOCAL-SETUP.md` | § Rodar: E2E browsers and the lock/port wrapper (Task 7) |
| `docs/roadmap.md`, `docs/roadmap.data.json` | S5.7 row: plan link, `in-progress` (Task 0) |
| `changelog.d/feature-261014-0-s5-7-browser-compat.md` | fragment with `### Perf` |

## Global Constraints

- Leaf branch `feature/261014-0-s5-7-browser-compat` from `develop` (never commit on `develop`/`master`); Task 0 is its first commit, then the plan commits are cherry-picked (Task 0 Step 4).
- `index.html`: only the Task 3 anchor; confirm `grep -c` = 1 before replacing; `support.js` never edited; visual frozen; no new `<script>`/`<link>`, no request at load.
- Never edit `lib/`, `test/`, `vendor/`, `fonts/`, nor any existing `e2e/*.spec.js` or helper. `e2e/apply-flow.spec.js` runs on more projects, unchanged.
- Specs never query `[data-node-id]` directly (use `selectLayer`); assertions never depend on how an engine serializes `el.style` (Chromium and Gecko order `box-shadow` parts differently), only on app-generated text (diff lines, toasts) or the DOM tree.
- Worktree setup: if `node_modules/` is missing, run `npm ci` first (lockfile v3).
- **Every Playwright run (each "Run: `npx playwright …`" below) goes through this wrapper**, in one Bash call with `timeout: 600000`. Port 5180 is shared by all worktrees and `reuseExistingServer: true` would silently test another branch's server, so the wrapper serializes runs with an atomic `mkdir` lock and refuses when 5180 already answers:

  ```bash
  n=0; until mkdir /tmp/layers-e2e.lock 2>/dev/null; do n=$((n+1)); [ "$n" -ge 60 ] && { echo 'COULD NOT RUN: stale lock'; exit 1; }; sleep 10; done
  trap 'rmdir /tmp/layers-e2e.lock' EXIT
  [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5180/)" = 000 ] || { echo 'REFUSED: 5180 already served'; exit 1; }
  npx playwright test <args>
  ```

  `000` means nothing listens on 5180, so Playwright starts this worktree's own server and stops it at the end. On `REFUSED`, do not kill the other server: wait and retry, or ask.
- Test titles `Metodo_Cenario_Esperado` in English; code comments EN, one line max (also inside the code blocks of this plan); docs prose PT-BR.
- Commit gate `npm test` (Vitest; it excludes `e2e/`). E2E is a manual gate (no CI).
- Conventional Commits; task commits end with `(S5.7 Task N)`, Task 0 with `(S5.7)`. No co-author trailer, no session-link trailer (the user's CLAUDE.md overrides the harness reminder that asks for one), no AI attribution, no link to the chat host. Check each commit: `git log -1 --format=%B | grep -ciE '^[a-z-]+: '` prints `0` (the message carries no trailer at all).

---

### Task 0: Start the leaf in the tracker

**Files:**
- Modify: `docs/roadmap.md:61` (S5.7 row), `docs/roadmap.data.json` (rebuilt, not hand-edited)

- [ ] **Step 0: Name the leaf branch**

The leaf branch is `feature/261014-0-s5-7-browser-compat`, created from an up-to-date `develop`: `git checkout -b feature/261014-0-s5-7-browser-compat develop`.
If implementation starts inside a `worktree-agent-*` branch that already points at `develop`, rename it instead: `git branch -m feature/261014-0-s5-7-browser-compat`.
Verify: `git branch --show-current` prints `feature/261014-0-s5-7-browser-compat` and `git log -1 --format=%H` equals `git rev-parse develop`.

- [ ] **Step 1: Link the plan and mark in progress**

Replace the row `| S5.7 | 2 | S5 | Compatibilidade de navegadores | checklist E | — | — | — | — | registered |` with:

```md
| S5.7 | 2 | S5 | Compatibilidade de navegadores | checklist E | — | [](superpowers/plans/2026-10-14-s5-7-browser-compat.md) | — | — | in-progress |
```

- [ ] **Step 2: Rebuild the tracker**

Invoke the `roadmap` skill (rebuilds `docs/roadmap.data.json`).
Verify (the S5.7 node must have left `todo` and list the plan; at base it is `todo` with `docs: []`):

```bash
node -e "const hit=[];JSON.parse(require('fs').readFileSync('docs/roadmap.data.json','utf8'),(k,v)=>{if(v&&v.id==='S5.7'&&'status' in v)hit.push(v);return v;});const n=hit[0];console.log(n.status, JSON.stringify(n.docs).includes('2026-10-14-s5-7-browser-compat.md'))"
```

Expected: a status other than `todo` (e.g. `in-progress`), then `true`. At base it prints `todo false`. `git diff --stat` lists only the two files.

- [ ] **Step 3: Commit**

```bash
git add docs/roadmap.md docs/roadmap.data.json
git commit -m "docs: start S5.7 in the tracker (S5.7)"
```

- [ ] **Step 4: Bring the plan onto the leaf branch**

The row now links the plan, so the plan must exist on this branch (precedent: S5.6 tracker commit `0b704f5`, then plan `ee6595d`). Cherry-pick the plan commit and its review-edit commit, in order:

```bash
git cherry-pick 36148ed
git cherry-pick "$(git log --all --format=%H -1 --grep='docs: apply review edits to S5.7 plan (S5.7)')"
```

Verify: `test -f docs/superpowers/plans/2026-10-14-s5-7-browser-compat.md && git log --oneline -3` shows the two plan commits above the tracker commit.

---

### Task 1: Playwright projects per engine

**Files:**
- Modify: `playwright.config.js`

**Interfaces:**
- Produces: projects `chromium` (every spec, as today), `chrome` and `msedge` (`browser-compat` + `apply-flow`), `firefox` and `webkit` (`browser-compat` only).

- [ ] **Step 1: Record the baseline**

Run: `npx playwright test --list | tail -1`
Expected: `Total: <N> tests in <F> files`. Write N and F down; Step 4 compares against them.

- [ ] **Step 2: Check the engines are present (no download)**

Run: `npx playwright --version` — Expected: `Version 1.63.0`.
Run: `ls "$LOCALAPPDATA/ms-playwright"` — Expected: lists `chromium-1243`, `firefox-1543`, `webkit-2359`.
If `firefox-*`/`webkit-*` are missing: stop and ask the human before `npx playwright install firefox webkit` (network download).

- [ ] **Step 3: Rewrite the config**

Replace the whole `playwright.config.js` with:

```js
import { defineConfig } from '@playwright/test';

// S5.7: suite on Chromium; compat spec on every engine; write path also on installed Chrome/Edge
const COMPAT = /browser-compat\.spec\.js$/;
const WRITE = /(browser-compat|apply-flow)\.spec\.js$/;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  // same path an unnamed project resolved to: screenshot baselines must not move when projects get names
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-snapshotSuffix}{ext}',
  use: {
    baseURL: 'http://localhost:5180',
    viewport: { width: 1280, height: 760 },
  },
  projects: [
    // full Chromium (new headless, GPU compositing); the default headless shell rasterizes 3D in software
    { name: 'chromium', use: { browserName: 'chromium', channel: 'chromium' } },
    { name: 'chrome', testMatch: WRITE, use: { browserName: 'chromium', channel: 'chrome' } },
    { name: 'msedge', testMatch: WRITE, use: { browserName: 'chromium', channel: 'msedge' } },
    { name: 'firefox', testMatch: COMPAT, use: { browserName: 'firefox' } },
    // Playwright WebKit on Windows: a Safari proxy, not Safari (see the evidence report)
    { name: 'webkit', testMatch: COMPAT, use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'npm run dev -- --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
```

`channel` moves into the `chromium` project: left at top level it would leak into `firefox`/`webkit`.
`snapshotPathTemplate` drops `{-projectName}` from Playwright's default, so `toHaveScreenshot` baselines (S3.2's `e2e/menu-visual.spec.js`) resolve to the same files as before. Only `chromium` runs screenshot assertions (`firefox`/`webkit` match only the compat spec, which has none), so no two projects share a baseline.

- [ ] **Step 4: Verify the existing suite is unchanged**

Run: `npx playwright test --list --project=chromium | tail -1`
Expected: `Total: <N> tests in <F> files` (same N and F as Step 1).
Run: `npx playwright test --list --project=chrome | tail -1`
Expected: `Total: 3 tests in 1 file` (the three `apply-flow` tests; `browser-compat` does not exist yet).
If `e2e/menu-visual.spec.js` exists on this branch (only if S3.2 landed on `develop` before this branch was cut or rebased; the planned order merges S5.7 first), run it through the wrapper: `npx playwright test e2e/menu-visual.spec.js --project=chromium`. Expected: PASS against the existing baselines, and `git status --short e2e/` shows no new `*-snapshots/` file.

- [ ] **Step 5: Smoke the branded channels on the write path**

Run: `npx playwright test --project=chrome --project=msedge`
Expected: PASS, 6 tests (apply-flow × 2 channels). A failure here is a finding about Chrome/Edge as installed: stop and report it, do not touch the spec.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.js
git commit -m "test(e2e): add chrome, msedge, firefox and webkit projects (S5.7 Task 1)"
```

---

### Task 2: Compat spec, read path and probe matrix

**Files:**
- Create: `e2e/browser-compat.spec.js`, `e2e/__snapshots__/compat-probes.json` (generated)

**Interfaces:**
- Consumes: `readNodes`, `readTree` (`e2e/tree-helpers.js`); `selectLayer` (`e2e/folder-helpers.js`); `e2e/__snapshots__/tree.json`.
- Produces: tests `Compat_Probes_ReadPathEverywhereWriteTierAllOrNothing`, `Compat_<fixture>_TreeMatchesChromiumSnapshot` (non-Chromium only), `Compat_TravalLoad_NoPageErrorNoEgress`, `Compat_FixtureEdit_DiffShowsSimulatedPatch`; shared `editCard`, `openProjects`, `guardEgress`, `VALUE`, `DECL`, `field` reused by Tasks 3-5.

- [ ] **Step 1: Write the spec**

Create `e2e/browser-compat.spec.js`:

```js
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { readNodes, readTree } from './tree-helpers.js';
import { selectLayer } from './folder-helpers.js';

// S5.7 checklist E: branch on in-page feature detection (as the app does), never on the UA
const SNAP = new URL('./__snapshots__/compat-probes.json', import.meta.url);
const TREE = JSON.parse(fs.readFileSync(new URL('./__snapshots__/tree.json', import.meta.url), 'utf8'));
const update = process.env.UPDATE_SNAPSHOT === '1';
const stored = fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP, 'utf8')) : {};
const fresh = {};

const READ_PATH = ['secureContext', 'fetch', 'domParser', 'shadowDom', 'customElements', 'resizeObserver',
  'indexedDB', 'fontsApi', 'blobUrl', 'cssSupports', 'preserve3d'];
const WRITE_TIER = ['showDirectoryPicker', 'showOpenFilePicker', 'showSaveFilePicker', 'handlePermissions', 'createWritable'];
// installed Chrome/Edge auto-update: compare only the probes the app depends on, not the cosmetic ones
const UNPINNED = new Set(['chrome', 'msedge']);
const pick = (p) => Object.fromEntries([...READ_PATH, ...WRITE_TIER].map((k) => [k, p[k]]));

const VALUE = '0 0 0 3px rgb(1, 2, 3)';
const DECL = /box-shadow:\s*0 0 0 3px rgb\(1, 2, 3\)/;
const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

function probe() {
  const proto = (name, key) => typeof window[name] === 'function' && key in window[name].prototype;
  let deflateRaw = false;
  try { new DecompressionStream('deflate-raw'); deflateRaw = true; } catch (e) { /* unsupported */ }
  return {
    secureContext: window.isSecureContext,
    fetch: typeof fetch === 'function',
    domParser: typeof DOMParser === 'function',
    shadowDom: proto('Element', 'attachShadow'),
    customElements: 'customElements' in window,
    resizeObserver: typeof ResizeObserver === 'function',
    indexedDB: 'indexedDB' in window,
    fontsApi: 'fonts' in document,
    blobUrl: typeof URL.createObjectURL === 'function',
    cssSupports: !!(window.CSS && CSS.supports),
    preserve3d: CSS.supports('transform-style', 'preserve-3d'),
    showDirectoryPicker: 'showDirectoryPicker' in window,
    showOpenFilePicker: 'showOpenFilePicker' in window,
    showSaveFilePicker: 'showSaveFilePicker' in window,
    handlePermissions: proto('FileSystemHandle', 'queryPermission'),
    createWritable: proto('FileSystemFileHandle', 'createWritable'),
    handleMove: proto('FileSystemFileHandle', 'move'),
    opfs: !!(navigator.storage && navigator.storage.getDirectory),
    cryptoDigest: !!(window.crypto && crypto.subtle && crypto.subtle.digest),
    deflateRaw,
    accentColor: CSS.supports('accent-color', 'red'),
    textWrapPretty: CSS.supports('text-wrap', 'pretty'),
  };
}

// aborts any request leaving localhost:5180 and records every URL; later routes (GitHub mock) win
async function guardEgress(page) {
  const seen = [];
  page.on('request', (r) => seen.push(r.url()));
  await page.route(/^https?:\/\/(?!localhost:5180\/)/, (r) => r.abort());
  return seen;
}

// the menu opens on hover and pins on click, so a click can close what hover just opened
async function openProjects(page, itemText) {
  const trigger = page.getByText('Nenhum projeto').first();
  const item = page.getByText(itemText).first();
  await trigger.click();
  if (!(await item.isVisible())) await trigger.click();
  await item.click();
}

// plain-css `.card` has one use (no scope chips) and no box-shadow: the edit is auto-decided.
async function editCard(page, url = '/?layers=fixtures/plain-css/') {
  if (url) await page.goto(url);
  await readNodes(page);
  await selectLayer(page, '.card');
  await expect(page.getByText('elemento único — sem irmãos na regra').first()).toBeVisible();
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(VALUE);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
}

test('Compat_Probes_ReadPathEverywhereWriteTierAllOrNothing', async ({ page, browser }, info) => {
  await page.goto('/');
  const p = await page.evaluate(probe);
  console.log(`[compat] ${info.project.name} ${browser.browserType().name()} ${browser.version()}`);
  for (const k of READ_PATH) expect(p[k], `${info.project.name}: read path needs ${k}`).toBe(true);
  // the app never half-enables writing: with the folder picker present, the whole tier must be there
  if (p.showDirectoryPicker) for (const k of WRITE_TIER) expect(p[k], `${info.project.name}: write tier needs ${k}`).toBe(true);
  fresh[info.project.name] = p;
  const want = stored[info.project.name];
  if (!update && want) {
    if (UNPINNED.has(info.project.name)) expect(pick(p)).toEqual(pick(want));
    else expect(p).toEqual(want);
  }
});

// same DOM as the Chromium snapshot; rootBox is layout (fonts, text metrics), so it is left out
for (const name of Object.keys(TREE)) {
  test(`Compat_${name}_TreeMatchesChromiumSnapshot`, async ({ page, browserName }) => {
    test.skip(browserName === 'chromium', 'Chromium engine (chromium, chrome, msedge): covered by tree-snapshot.spec.js');
    await page.goto(`/?layers=fixtures/${name}/`);
    const { rootBox, ...tree } = await readTree(page);
    const { rootBox: _, ...want } = TREE[name];
    expect(tree, `${name}: same mounted tree as Chromium`).toEqual(want);
  });
}

test('Compat_TravalLoad_NoPageErrorNoEgress', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && /Content.Security.Policy/i.test(m.text())) errors.push(m.text()); });
  // Firefox/WebKit do not always log CSP blocks to the console: catch the DOM event instead
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => (window.__csp = window.__csp || []).push(e.violatedDirective + ' ' + e.blockedURI)));
  const seen = await guardEgress(page);
  await page.goto('/?layers=fixtures/traval/');
  await readNodes(page);
  expect(errors, 'no uncaught error and no CSP violation in the console').toEqual([]);
  expect(await page.evaluate(() => window.__csp || []), 'no securitypolicyviolation event').toEqual([]);
  const foreign = seen.filter((u) => !/^(http:\/\/localhost:5180\/|blob:|data:)/.test(u));
  expect(foreign, 'no request outside localhost:5180 at load').toEqual([]);
});

test('Compat_FixtureEdit_DiffShowsSimulatedPatch', async ({ page }) => {
  await editCard(page);
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Ver diff', { exact: false }).first().click();
  await expect(page.getByText('1 arquivo(s) · 1 ajuste(s)')).toBeVisible();
  await expect(page.getByText('(simulado', { exact: false }).first()).toBeVisible();
  await expect(page.getByText(DECL).first()).toBeVisible();
});

test.afterAll(() => {
  const keys = Object.keys(fresh).filter((k) => update || !stored[k]);
  if (!keys.length) return;
  // one worker per project: merge with what other projects already wrote this run
  const cur = fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP, 'utf8')) : {};
  for (const k of keys) cur[k] = fresh[k];
  const sorted = Object.fromEntries(Object.keys(cur).sort().map((k) => [k, cur[k]]));
  fs.writeFileSync(SNAP, JSON.stringify(sorted, null, 2) + '\n');
});
```

- [ ] **Step 2: Generate the probe matrix**

Run: `UPDATE_SNAPSHOT=1 npx playwright test e2e/browser-compat.spec.js`
Expected: PASS on all five projects (`chromium`, `chrome` and `msedge` skip the 16 tree tests, since all three have `browserName` `chromium`; `firefox`/`webkit` run them), and the list output shows five `[compat] <project> <engine> <version>` lines. Copy those five lines into the Task 6 report.
Then: `git status --short e2e/__snapshots__/` shows `?? e2e/__snapshots__/compat-probes.json`, and `node -e "console.log(Object.keys(require('./e2e/__snapshots__/compat-probes.json')).join(','))"` prints `chrome,chromium,firefox,msedge,webkit`.
Review the file by hand: `showDirectoryPicker` must be `true` on the three Chromium projects and `false` on `firefox`/`webkit`. Anything else is a finding: stop and report.

- [ ] **Step 3: Re-run against the snapshot**

Run: `npx playwright test e2e/browser-compat.spec.js`
Expected: PASS, no file change (`git status --short e2e/__snapshots__/` shows only the new file as untracked).
Regenerate later only with the file path: `UPDATE_SNAPSHOT=1 npx playwright test e2e/browser-compat.spec.js`. Without it the variable also rewrites `tree.json` through `tree-snapshot.spec.js`. `firefox`/`webkit`/`chromium` are pinned by Playwright 1.63, so their whole probe object is compared. `chrome`/`msedge` auto-update, so they compare only the read-path and write-tier probes. A failure there after a browser update is a real capability change: report it.

Failure triage (applies to Tasks 2-5):
- Tree mismatch on firefox/webkit, page error, or egress: an app finding on that engine. Stop, record engine + fixture + diff in the report, and ask the human: fix in this leaf (only if it is a one-anchor change with no visual effect) or a new leaf. Never "fix" by loosening the assertion.
- Selector not found on one engine only (timing): raise that `expect` timeout locally, nothing else.

- [ ] **Step 4: Commit**

```bash
git add e2e/browser-compat.spec.js e2e/__snapshots__/compat-probes.json
git commit -m "test(e2e): cross-engine read, edit and probe matrix (S5.7 Task 2)"
```

---

### Task 3: Read-only refusal names the browser (test first, one-line fix)

Depends on `[!DECISION] readonly-message` = A. With C, skip Steps 3-4 and turn the `HINT_NO_FS` assertion into a recorded finding.

**Files:**
- Modify: `e2e/browser-compat.spec.js` (append), `index.html:1443` (one anchor)

**Interfaces:**
- Produces: tests `Compat_NoFsAccess_WriteEntryPointsNameTheBrowser`, `Compat_FsAccess_FixtureDraftAsksToConnectFolder`.

- [ ] **Step 1: Write the failing tests**

Append to `e2e/browser-compat.spec.js`:

```js
const HINT_NO_FS = 'Este navegador não grava em disco — use Chrome ou Edge.';
const HINT_FS = 'Conecte a pasta local para gravar.';
const hasFs = (page) => page.evaluate(() => 'showDirectoryPicker' in window);

async function draftAndExport(page) {
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Aplicar nos arquivos', { exact: false }).first().click();
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
}

test('Compat_NoFsAccess_WriteEntryPointsNameTheBrowser', async ({ page }) => {
  await page.goto('/');
  test.skip(await hasFs(page), 'File System Access present: write path covered by apply-flow.spec.js');
  await expect(page.getByText('Este navegador não tem a File System Access API', { exact: false })).toBeVisible();
  await openProjects(page, /Conectar pasta local/);
  await expect(page.getByText('File System Access API indisponível — use Chrome ou Edge', { exact: false })).toBeVisible();
  await openProjects(page, /Abrir arquivo \.zip/);
  await expect(page.getByText('Abrir .zip usa a File System Access API', { exact: false })).toBeVisible();

  await editCard(page);
  await draftAndExport(page);
  await expect(page.getByText(HINT_NO_FS, { exact: false })).toBeVisible();
  await expect(page.getByText(HINT_FS, { exact: false })).toHaveCount(0);
  // the toast lives 4.2 s: close it so the export assertion cannot pass on the draft's toast
  await page.getByTitle('Fechar').click();
  await expect(page.getByText(HINT_NO_FS, { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Exportar versões completas', { exact: false }).first().click();
  await expect(page.getByText(HINT_NO_FS, { exact: false })).toBeVisible();
});

test('Compat_FsAccess_FixtureDraftAsksToConnectFolder', async ({ page }) => {
  await page.goto('/');
  test.skip(!(await hasFs(page)), 'no File System Access: covered by the NoFsAccess test');
  await editCard(page);
  await draftAndExport(page);
  await expect(page.getByText(HINT_FS, { exact: false })).toBeVisible();
});
```

- [ ] **Step 2: Run it, expect the red**

Run: `npx playwright test e2e/browser-compat.spec.js --project=firefox --project=webkit --project=chromium -g "NoFsAccess|FsAccess_"`
Expected: `Compat_NoFsAccess_…` FAILS on firefox and webkit at the first `HINT_NO_FS` assertion (the toast still says "Conecte a pasta local para gravar."); it is skipped on chromium. `Compat_FsAccess_…` PASSES on chromium and is skipped on firefox/webkit. `getByTitle('Fechar')` is the toast's "×" button (`index.html:753`, `title="Fechar"`); the button with text "Fechar" is the modal's (`:783`). If the modal is already gone when the second one is clicked, drop that click only.

- [ ] **Step 3: Fix `readOnlyBlock`**

Run: `grep -cF "que é somente leitura. Conecte a pasta local para gravar.', 'warn');" index.html` — Expected: `1`.
In `index.html`, replace:

```js
    this.toast('Projeto carregado de ' + what + ', que é somente leitura. Conecte a pasta local para gravar.', 'warn');
```

with:

```js
    // no File System Access (Firefox, Safari): no folder can be connected, so name the browser
    this.toast('Projeto carregado de ' + what + ', que é somente leitura. ' + (window.showDirectoryPicker ? 'Conecte a pasta local para gravar.' : 'Este navegador não grava em disco — use Chrome ou Edge.'), 'warn');
```

Run: `git diff --stat index.html` — Expected: `1 file changed, 2 insertions(+), 1 deletion(-)`.

- [ ] **Step 4: Run it, expect the green**

Run: `npx playwright test e2e/browser-compat.spec.js`
Expected: PASS on all five projects.
Run: `npx playwright test --project=chromium $(ls e2e/*.spec.js | grep -v 'e2e/perf.spec.js')`
Expected: PASS (the existing suite without `perf.spec.js`, which flakes 40-50 %, writes untracked `bench/results/*.bench.json` and exceeds 120 s). No spec asserts the old hint: `grep -rn "Conecte a pasta local" e2e test` lists only `browser-compat.spec.js`.
Then delete any `bench/results/*` file this run created: `git status --short bench/results/` must print nothing.
Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add e2e/browser-compat.spec.js index.html
git commit -m "fix: read-only refusal names the browser when it cannot write (S5.7 Task 3)"
```

---

### Task 4: Public GitHub source on every engine (mocked, no egress)

The GitHub loader is the only real read source a Firefox/Safari user has besides fixtures. `page.route` answers `api.github.com` and `raw.githubusercontent.com` from `fixtures/plain-css`, so no request leaves the machine (the `guardEgress` catch-all aborts anything else).

**Files:**
- Modify: `e2e/browser-compat.spec.js` (append)

**Interfaces:**
- Produces: test `Compat_GithubRepoMocked_LoadsReadOnlyAndRefusesWrite`.

- [ ] **Step 1: Write the test**

Append to `e2e/browser-compat.spec.js` (add `import path from 'node:path';` to the imports at the top):

```js
// serves github.com/acme/demo from a fixture: API for default_branch, raw for the files
async function mockRepo(page, fixture) {
  const root = path.resolve('fixtures', fixture);
  const cors = { 'access-control-allow-origin': '*' };
  await page.route('https://api.github.com/repos/acme/demo', (r) => r.fulfill({ json: { default_branch: 'main' }, headers: cors }));
  await page.route('https://raw.githubusercontent.com/acme/demo/main/**', (r) => {
    const rel = decodeURIComponent(new URL(r.request().url()).pathname.replace('/acme/demo/main/', ''));
    const abs = path.join(root, rel);
    const ok = abs.startsWith(root + path.sep) && fs.existsSync(abs);
    return r.fulfill({ status: ok ? 200 : 404, body: ok ? fs.readFileSync(abs) : '', headers: cors });
  });
}

test('Compat_GithubRepoMocked_LoadsReadOnlyAndRefusesWrite', async ({ page }) => {
  const seen = await guardEgress(page);
  await mockRepo(page, 'plain-css');
  await page.goto('/');
  await openProjects(page, /Registrar repositório GitHub/);
  await page.getByPlaceholder('github.com/usuario/repo').fill('github.com/acme/demo');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Repositório acme/demo registrado.')).toBeVisible();
  // the Projetos menu is still open after addRepo; exact text skips the toast that also says acme/demo
  await page.getByText('acme/demo', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Carregar' }).click();
  await editCard(page, null);
  await draftAndExport(page);
  await expect(page.getByText('Projeto carregado de um repositório remoto, que é somente leitura.', { exact: false })).toBeVisible();
  const hosts = new Set(seen.filter((u) => /^https?:/.test(u)).map((u) => new URL(u).host));
  hosts.delete('localhost:5180');
  expect([...hosts].sort(), 'only the two mocked GitHub hosts').toEqual(['api.github.com', 'raw.githubusercontent.com']);
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/browser-compat.spec.js -g GithubRepoMocked`
Expected: PASS on all five projects. Known adjustments (selectors only): if the menu closed after registering, reopen it with `openProjects(page, …)` only after closing the toast (`getByTitle('Fechar')`); if the history row is not `acme/demo` text, use the row title shown in the Projetos dropdown; if Enter does not register, click the button next to the input. A CORS or `TextDecoder` failure on one engine is an app finding (triage of Task 2).

- [ ] **Step 3: Commit**

```bash
git add e2e/browser-compat.spec.js
git commit -m "test(e2e): GitHub source read-only on every engine, mocked (S5.7 Task 4)"
```

---

### Task 5: Screenshots and manual checks

Playwright cannot drive the native folder picker, the permission prompts, nor a real Safari. This task captures what it can and lists the human steps. Steps marked **MANUAL** are done by the human; the implementer prepares them and records the answers in the Task 6 report.

**Files:**
- Modify: `e2e/browser-compat.spec.js` (append)

- [ ] **Step 1: Screenshot test (not asserted)**

Append:

```js
// not an assertion: images for the manual visual review (3D depth, fonts, layout) per engine
test('Compat_TravalOrbit_ScreenshotsForManualReview', async ({ page }, info) => {
  await page.goto('/?layers=fixtures/traval/');
  await readNodes(page);
  await page.screenshot({ path: info.outputPath(`${info.project.name}-traval-default.png`) });
  const c = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) => getComputedStyle(el).backgroundImage.includes('radial-gradient'));
    const b = stage.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 160, c.y - 60, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  await page.screenshot({ path: info.outputPath(`${info.project.name}-traval-orbit.png`) });
});
```

Run: `npx playwright test e2e/browser-compat.spec.js -g Screenshots`
Expected: PASS on five projects; 10 PNGs under `test-results/` (gitignored, never committed). `find test-results -name '*-traval-*.png' | wc -l` → `10`.

- [ ] **Step 2: Commit**

```bash
git add e2e/browser-compat.spec.js
git commit -m "test(e2e): per-engine screenshots for the manual visual review (S5.7 Task 5)"
```

- [ ] **Step 3: MANUAL checks (human)**

Prepare: copy `fixtures/plain-css` to a scratch folder outside the repo (e.g. `%TEMP%\layers-compat\plain-css`) and zip a second copy.
The manual session holds the E2E lock from start to end. Other worktrees reuse whatever answers on 5180 (`reuseExistingServer: true`), so a dev server left running would be tested by their runs:

```bash
mkdir /tmp/layers-e2e.lock || { echo 'COULD NOT RUN: lock held'; exit 1; }
[ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5180/)" = 000 ] || { rmdir /tmp/layers-e2e.lock; echo 'REFUSED: 5180 already served'; exit 1; }
npm run dev    # keep running through M1-M3 and M5
```

After the last manual step: stop the dev server (Ctrl+C), check `curl -s -o /dev/null -w '%{http_code}' http://localhost:5180/` prints `000`, then `rmdir /tmp/layers-e2e.lock`. M4 runs on a Mac and does not touch this lock.

| # | Browser | What the human does | Pass when |
|---|---|---|---|
| M1 | Chrome 155 (installed) | Conectar pasta local → native picker → scratch folder; select `.card`, Sombra = `0 0 0 3px rgb(1, 2, 3)`; Aplicar → Gerar rascunho → accept the **readwrite prompt** → Aprovar; reload the tab; Exportar versões completas into another folder; Abrir arquivo .zip with the zip copy | `style.css` patched on disk, `style.css.bak` and `.design-history/` exist; after reload the folder reopens or the reconnect hint shows; export folder has `layers-export.log` with sha256; zip loads read-only |
| M2 | Edge 155 (installed) | Same as M1 | Same as M1 |
| M3 | — | Open the 10 PNGs of Step 1 side by side with the `chromium` pair | Planes show depth (not flattened) in firefox/webkit after orbit; Inter/JetBrains Mono rendered (no fallback serif); no overlapping panels. Scrollbar look in Firefox differs: expected, recorded only |
| M4 | Safari on macOS (per `[!DECISION] engine-evidence`) | `http://<host>:5180/?layers=fixtures/traval/` from a Mac on the LAN is **not** a secure context; run the repo on the Mac instead (`npm ci && npm run dev`), open `localhost:5180/?layers=fixtures/plain-css/`, edit `.card`, Ver diff, Aplicar → Gerar rascunho | Loads, edits, simulated diff, toast with the no-FS hint. If no Mac: record "Safari real: não verificado" |
| M5 | Firefox stable (optional, not installed on the reference machine) | Same as M4 on `localhost:5180` | Same as M4. If skipped: record "Firefox real: não verificado; evidência = build Playwright 155.0" |

---

### Task 6: Evidence report for S7.3

**Files:**
- Create: `docs/superpowers/reports/2026-10-14-s5-7-compat-evidence.md` (PT-BR prose; not the `impl-report` output, which comes after merge with its own name)

- [ ] **Step 1: Write the report**

Frontmatter `type: report`, `solution: Layers`, `status: draft`, `created: <date>`. Sections, in this order:

1. **Versões testadas**: the five `[compat]` lines of Task 2 Step 2, date, machine (Windows 11, i7-12700), Playwright version; branded Chrome/Edge exact versions.
2. **Sondas de API**: table generated from `e2e/__snapshots__/compat-probes.json` (rows = probe, columns = project). State that the JSON is the source and the table a copy.
3. **Comportamento**: table rows = Leitura (fixture), Leitura (GitHub), Leitura (pasta local), Leitura (`.zip`), Edição em memória + diff simulado, Gravação (rascunho/aprovar/rollback), Exportação, Config export/import; columns = the five projects + "Safari real" + "Firefox real". Cells: `ok (spec)`, `ok (manual Mx)`, `recusa com mensagem`, `não verificado`. Each cell cites the test title or manual step.
4. **Mensagens ao usuário**: each refused entry point with its exact PT-BR string and `index.html` line.
5. **Diferenças cosméticas**: scrollbars in Firefox (`::-webkit-scrollbar` ignored; why `scrollbar-width` is not an option), `text-wrap:pretty` support from the probe, plus whatever M3 found. No fix: visual frozen.
6. **Achados**: any app finding from the triage of Tasks 2-4, with the decision taken (fixed here / new leaf id).
7. **Como reproduzir**: the lock + port wrapper, `npx playwright test e2e/browser-compat.spec.js`, `UPDATE_SNAPSHOT=1 npx playwright test e2e/browser-compat.spec.js` to regenerate (always with the file path), the M1-M5 table.
8. **Para a S7.3**: the list in § Outputs for S7.3 below, with the README lines (`README.md:13`, `:36`, `:37`) to reconcile.

Verify: `grep -c "não verificado\|ok (spec)\|ok (manual" docs/superpowers/reports/2026-10-14-s5-7-compat-evidence.md` ≥ 10; every manual step M1-M5 appears with a result.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/reports/2026-10-14-s5-7-compat-evidence.md
git commit -m "docs: add S5.7 browser compatibility evidence (S5.7 Task 6)"
```

---

### Task 7: Checklist, local setup and changelog

**Files:**
- Modify: `docs/RELEASE-CHECKLIST.md:62` only (line 8, the counter, stays untouched: the dedicated integration step recounts it)
- Modify: `docs/LOCAL-SETUP.md` (one paragraph after the toolchain paragraph of § Rodar)
- Create: `changelog.d/feature-261014-0-s5-7-browser-compat.md`

**Executor contract** (dispatched to the `executor` subagent, no `model`):
- Before dispatch, the caller reads M1 and M2 in the Task 6 report and passes **one** state: `x` when both passed, `~` otherwise. The executor writes that character in the checklist line, nothing else varies.
- Output format: `DONE <commit sha>`, then the raw `exit_code` of `npm test` and the last 15 lines of its output.
- Refusal tokens: `NOT FOUND` (an anchor of Step 1 or Step 2 absent), `AMBIGUOUS` (an anchor matches more than one line), `COULD NOT RUN` (`npm test` did not start), `OUT OF SCOPE` (any edit beyond the three files or beyond the anchors).
- Caller validates: `git show --stat HEAD` lists exactly the three files; the checklist diff is one line and line 8 is unchanged (`git diff HEAD~1 -- docs/RELEASE-CHECKLIST.md | grep -c '^[-+]Estados'` = 0); the state character matches M1/M2; `exit_code` is 0. Any deviation: redo at Workhorse, never re-dispatch the executor.
- If `[!DECISION] readonly-message` ≠ A: the caller edits the `### Fixed` section before dispatch.

- [ ] **Step 1: Close (or mark partial) the checklist item**

`[x]` only when M1 (Chrome) and M2 (Edge) passed; otherwise `[~]`, and the report says which step failed.
Replace the line `- [ ] Compatibilidade: Chrome/Edge completos; Firefox/Safari em somente leitura com mensagem.` with (`<S>` = `x` or `~`, as passed by the caller):

```md
- [<S>] Compatibilidade: Chrome/Edge completos; Firefox/Safari em somente leitura com mensagem. Projetos Playwright `chromium`, `chrome`, `msedge`, `firefox` e `webkit` (proxy do Safari): leitura de fixtures e de repositório GitHub (simulado), edição em memória e diff simulado nos cinco; gravação (OPFS, seletor simulado) em Chrome/Edge (`e2e/apply-flow.spec.js` nos canais instalados) + manual M1/M2 com seletor nativo e permissões; sem File System Access, cada entrada de gravação recusa nomeando o navegador (`e2e/browser-compat.spec.js`, sondas em `e2e/__snapshots__/compat-probes.json`). Versões, verificação manual (M1-M5, Safari real) e lacunas no [relatório de evidência](superpowers/reports/2026-10-14-s5-7-compat-evidence.md). Gate manual (E2E).
```

- [ ] **Step 2: Document the E2E browsers and the lock**

In `docs/LOCAL-SETUP.md`, after the line ending `não suporta a linha 23 (`^20.0.0 || ^22.0.0 || >=24.0.0`).` (`grep -cF` = 1), insert a blank line and:

```md
**E2E (Playwright):** `npm run test:e2e` roda cinco projetos e precisa do Chrome e do Edge instalados, mais `npx playwright install firefox webkit` uma vez. A porta 5180 é compartilhada entre worktrees (`reuseExistingServer: true`): cada execução pega a trava `/tmp/layers-e2e.lock` com `mkdir` (espera até 60 tentativas, depois desiste), recusa se a 5180 já responde (`curl` diferente de `000`) e remove a trava ao sair (`trap 'rmdir /tmp/layers-e2e.lock' EXIT`). Sessão manual no navegador: segure a trava do início ao fim e pare o dev server antes de soltá-la. Script completo no plano da S5.7, § Global Constraints.
```

- [ ] **Step 3: Write the changelog fragment**

Create `changelog.d/feature-261014-0-s5-7-browser-compat.md`:

```md
---
adr: none
---

### Added
- Projetos Playwright `chrome`, `msedge`, `firefox` e `webkit` ao lado do `chromium` (que segue rodando toda a suíte): `e2e/browser-compat.spec.js` roda nos cinco — sondas de API em `e2e/__snapshots__/compat-probes.json`, árvore das fixtures igual à do Chromium, carga sem erro e sem requisição externa, edição com diff simulado, repositório GitHub simulado por `page.route` e capturas para revisão visual; `e2e/apply-flow.spec.js` também roda no Chrome e no Edge instalados.
- `docs/LOCAL-SETUP.md`: navegadores exigidos pelo E2E e a trava `/tmp/layers-e2e.lock` que serializa as execuções na porta 5180 compartilhada.

### Fixed
- Sem File System Access (Firefox, Safari), a recusa de rascunho, aprovação e exportação dizia "Conecte a pasta local para gravar.", o que não é possível nesses navegadores; agora diz que o navegador não grava em disco e indica Chrome ou Edge.

### Perf
- N/A — o app só ganha uma escolha de texto por `window.showDirectoryPicker` num toast de recusa (caminho frio, um clique); o resto é teste E2E e configuração do Playwright.
```

- [ ] **Step 4: Verify and commit**

Run: `npm test` — Expected: PASS.

```bash
git add docs/RELEASE-CHECKLIST.md docs/LOCAL-SETUP.md changelog.d/feature-261014-0-s5-7-browser-compat.md
git commit -m "docs: close checklist E compatibility with local setup and changelog (S5.7 Task 7)"
```

---

## Outputs for S7.3

S7.3 (checklist G "Matriz de suporte: navegadores × funcionalidades (leitura, edição, gravação)") is out of scope here. It consumes, from this leaf:

| # | Output | Where |
|---|---|---|
| 1 | Tested engine versions and date | report § Versões testadas |
| 2 | Per-engine API/CSS probe matrix (machine-readable) | `e2e/__snapshots__/compat-probes.json`; table copy in report § Sondas |
| 3 | Behavior matrix: source (fixture, GitHub, pasta, `.zip`) × leitura/edição/gravação × engine, each cell backed by a test title or manual step | report § Comportamento |
| 4 | Exact user-facing messages for every refused entry point | report § Mensagens |
| 5 | Known cosmetic differences, and why they are not fixed | report § Diferenças cosméticas |
| 6 | Unverified cells, named (Safari real, Firefox real) | report § Comportamento |
| 7 | Re-run commands (`npx playwright test e2e/browser-compat.spec.js`, `--project=…`, `UPDATE_SNAPSHOT=1 npx playwright test e2e/browser-compat.spec.js`) | report § Como reproduzir |
| 8 | README lines to reconcile (`README.md:13`, `:36`, `:37`) and the `docs/TOPOLOGY.md:99` "Chrome/Edge apenas" row | report § Para a S7.3 |

## Self-Review

| Requirement | Task |
|---|---|
| "Compatible" defined per tier, tested versions only | Context, 2 |
| Features from grep with `file:line`; false positives excluded | Context § Feature inventory |
| Existing Chromium suite unchanged | 1 (Step 4 count check) |
| Chrome/Edge write path on installed channels | 1 (Step 5) |
| Firefox/WebKit read + edit, no page error, no egress | 2 |
| Every write entry point refuses with a browser-naming message | 3 |
| Read-only GitHub source on every engine, no real egress | 4 |
| What Playwright cannot do is listed as MANUAL | 5 (M1-M5) |
| Visual frozen; one `index.html` anchor | 3 (Step 3), Global Constraints |
| Data for S7.3 | 6, § Outputs for S7.3 |
| Checklist line 62 only, `[x]` only after M1/M2 (line 8 untouched); LOCAL-SETUP line; changelog with `### Perf` | 7 |
| Screenshot baselines keep their path for S3.2 (`snapshotPathTemplate`) | 1 |
| Every Playwright run serialized by the lock/port wrapper | Global Constraints, 5 |

> [!DECISION] support-tiers
> Resolved: **Option A** (approved).
> - **Option A (recommended)**: degrade. Firefox/Safari run read-only with messages, as the checklist line already states; nothing blocks the app.
> - **Option B**: block. Non-Chromium engines get a full-stage "use Chrome ou Edge" and nothing loads. Simpler to support, but it throws away a working read path (fixtures, GitHub) and needs a new UI state (visual-freeze exception).

> [!DECISION] readonly-message
> Resolved: **Option A** (approved).
> - **Option A (recommended)**: the one-line `readOnlyBlock` change of Task 3 (draft, approve, full export). Text only, through the existing toast; no visual change.
> - **Option B**: A plus the simulated-diff note (`index.html:1930`), same pattern, second anchor.
> - **Option C**: no app change; the misleading hint becomes a finding in the report and a follow-up leaf. Task 3 keeps only the assertions that pass today.
> - **Option D**: A plus a persistent "somente leitura" indicator. New UI element: needs an explicit visual-freeze exception.

> [!DECISION] engine-evidence
> Resolved: **Option A** (approved).
> Safari cannot run on this Windows machine; Firefox stable is not installed (Playwright's Firefox 155.0 build is).
> - **Option A (recommended)**: Playwright `webkit`/`firefox` builds are the automated evidence; M4/M5 run if a Mac / Firefox install is available, else the report and S7.3 mark "Safari real / Firefox real: não verificado".
> - **Option B**: closing S5.7 requires M4 on a real Mac and M5 on real Firefox.
> - **Option C**: drop Safari from the claim (S7.3 says "não suportado"); the `webkit` project stays as a smoke test.

> [!DECISION] version-claims
> Resolved: **Option A** (approved).
> - **Option A (recommended)**: claim only the tested versions (report § Versões testadas); re-run the spec when a browser updates.
> - **Option B**: claim ranges ("Firefox ≥ X") from MDN browser-compat-data per probed feature; done in S7.3 with a citation per feature, never from memory.

> [!DECISION] readonly-sources
> Resolved: **Option A** (approved).
> - **Option A (recommended)**: no new read sources here. Non-Chromium users read fixtures and public GitHub repos.
> - **Option B**: add an `<input type="file" accept=".zip">` fallback for `.zip` (and/or `<input webkitdirectory>` for folders) so Firefox/Safari open local projects read-only. New behavior and a hidden input: own leaf (S2.x), not S5.7.

> [!DECISION] e2e-default-run
> Resolved: **Option A** (approved).
> - **Option A (recommended)**: `npm run test:e2e` runs all five projects (one gate command; this machine has every browser). A machine without Chrome or Edge installed fails those two projects with "distribution not found".
> - **Option B**: keep `test:e2e` = `playwright test --project=chromium` and add `test:compat` for the other four (touches `package.json` scripts and README/CLAUDE.md mentions).

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 0. Tracker row | gen | Standard | Workhorse | needs the `roadmap` skill to rebuild `roadmap.data.json` |
| 1. Playwright projects | gen | Standard | Workhorse | config with judgment (channel scope, testMatch) |
| 2. Compat spec: probes, read, edit | gen | Standard | Workhorse | test authoring (never Executor) |
| 3. Refusal hint: tests + one-line app fix | gen | Standard | Workhorse | `index.html` edit, TDD |
| 3. Review | review | Architectural | Architect | app change + cross-engine assertions, via `adversarial-reviewer` |
| 4. GitHub source mocked | gen | Standard | Workhorse | test authoring, network mocking |
| 5. Screenshots | gen | Standard | Workhorse | test authoring |
| 5. M1-M5 | manual | — | human | native picker, permission prompts, real Safari/Firefox |
| 6. Evidence report | gen | Standard | Workhorse | synthesis of runs and manual results |
| 7. Checklist + LOCAL-SETUP + changelog | gen | Mechanical | Executor | text given verbatim, state `x`/`~` passed by the caller; caller validates format, refusal tokens, diff and `npm test` exit_code (Task 7 contract) |
| Pre-merge review | review | Architectural | Architect | verifier ≥ generator, via `adversarial-reviewer` |

> [!DECISION] e2e-lock
> Resolved: **Option A** (approved): the `/tmp/layers-e2e.lock` wrapper of § Global Constraints is the project convention and is documented in `docs/LOCAL-SETUP.md` (Task 7 Step 2).

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — one checklist item, tracked by roadmap row S5.7 and its PR; the app change is one line (same as S5.6).
> Draft (not created unless this verdict flips via `gh-issue-gate`):
> - **Title**: `test: browser compatibility per engine (S5.7)`
> - **Labels**: enhancement
> - **Milestone**: (none)
> - **Body**: Context: checklist E promises Chrome/Edge full and Firefox/Safari read-only with a message; nothing runs outside Chromium. Proposal: Playwright projects per engine, `e2e/browser-compat.spec.js` with a probe matrix, read/edit parity, refusal messages and a mocked GitHub source; one-line fix of the read-only hint; evidence report for S7.3. Acceptance criteria: the spec passes on five projects; existing suite unchanged on `chromium`; checklist E line closed; M1-M5 recorded.

> [!DECISION] phase-intake
> Classification: **meso** `S5.7` under **S5 Testes**, target **v1 (Unreleased)**.
> Current tree (relevant slice): S5 Testes (in-progress) › S5.1-S5.6 done · S5.7 Compatibilidade de navegadores (registered → in-progress). Unblocks S7.3 (S7 › registered).
> Fork of an existing row? **No** (row already registered; this plan starts it).
> - **Option A**: keep as `S5.7` (recommended)

> [!DECISION] execution
> Method: **Native** (recommended: sequential tasks sharing one spec file; Task 7 still goes to the `executor` subagent; Task 3 and pre-merge reviews via `adversarial-reviewer`).
