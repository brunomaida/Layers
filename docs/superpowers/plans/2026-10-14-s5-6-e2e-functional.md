---
title: "S5.6 Functional E2E Implementation Plan"
type: plan
solution: Layers
status: draft
created: 2026-10-14
---

# S5.6 Functional E2E Implementation Plan

Add `e2e/folder-helpers.js` and `e2e/apply-flow.spec.js`: a Playwright spec that connects a real folder (OPFS copy of `fixtures/plain-css`), edits `.card`, opens the diff, drafts, approves and asserts the rewritten `style.css` on disk. Close checklist E in `docs/RELEASE-CHECKLIST.md` and add a changelog fragment.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Context

Checklist E still has one open functional item: "conectar pasta → selecionar → editar → ver diff → aplicar → arquivo alterado" (`docs/RELEASE-CHECKLIST.md`, section E). The E2E infra exists (`playwright.config.js`, nine specs in `e2e/`), but no spec drives the write path end to end.

`e2e/stale-banner.spec.js` already proves the mechanism: it copies a fixture into the origin-private file system (OPFS), stubs `window.showDirectoryPicker` to return that real `FileSystemDirectoryHandle`, and clicks "Conectar pasta". On an OPFS handle the app's real write path runs unchanged: `ensureWrite()` (`queryPermission` returns `granted`), `writeText()` (mtime guard, `.bak` once per file per session, `.tmp` + `FileSystemFileHandle.move`), `makeDraft()` (`style.design-draft.css`) and `approve()` (`.design-history/style.css.<stamp>` + rewrite + draft removal). The UI steps are reachable with the selectors the existing specs already use: tree row click, "Só este", the "Sombra" text field, "Ações ▾ › Ver diff", "Ações ▾ › Aplicar nos arquivos…", "1 · Gerar rascunho paralelo", "2 · Aprovar, substituir e commitar", and the "Rollback" button of the history row in Ajustes.

No testability hook in `index.html` is needed, so this plan carries no hook decision. If execution proves otherwise (for example `queryPermission` missing on the OPFS handle in the installed Chromium), the fallback is test-side only: patch `queryPermission`/`requestPermission` onto `window.__proj` inside the helper. `index.html` is never edited.

Fixture `plain-css` is used because it is three text files, already proven in `stale-banner.spec.js`, and `.card` has a single use (no scope question; `patchSel` returns the plain `.card` selector) and no `box-shadow` declaration (the patch appends one, a visible and unambiguous change).

Flows worth covering, in priority order (this plan takes 1-3):

| # | Flow | Plan |
|---|---|---|
| 1 | connect → select → edit → diff → draft → approve → file changed; `.bak` = original, history copy = original, no draft or `.tmp` left | this plan, Task 2 |
| 2 | Rollback after approve restores the original file | this plan, Task 3 (see `[!DECISION] rollback-spec`) |
| 3 | Rollback refused when the file changed outside LAYERS after approve | this plan, Task 3 |
| 4 | "Descartar rascunho" removes the draft and leaves the original untouched | later |
| 5 | Approve refused when the file changed outside after load (`writeText` mtime guard) | later |
| 6 | `exportFull` writes full versions + `layers-export.log` (path/size only, the line format changes in S6.2) | later, after S6.2 |
| 7 | TS/JS origin: draft logs `SOURCE_NOT_CSS`, nothing written | later |
| 8 | dc template write on `dc-template` (`patchDc`) | later, after S2.19 |
| 9 | Connect a folder without `layers.json`: manifest auto-created | later |

Global constraints for every task:

- Tests only. Never edit `index.html`, `support.js`, `lib/`, `test/`, `playwright.config.js` or any existing `e2e/*.spec.js`.
- New files only: `e2e/folder-helpers.js`, `e2e/apply-flow.spec.js`.
- Specs never query `[data-node-id]` directly: S4.7 virtualizes the tree and will break that query, so it lives only in `selectLayer` of the helper.
- Assertions read the connected folder (OPFS) or visible UI state; they never assert the modal log text nor the write-log line format (S6.2 adds a hash to it).
- Test titles follow the existing specs: `Metodo_Cenario_Esperado` in English (`StaleBanner_At1024_DoesNotCoverColumnOrRightPanel`).
- E2E is a manual gate (no CI): run with `npx playwright test e2e/apply-flow.spec.js` or the whole suite with `npm run test:e2e`. The commit gate stays `npm test`.
- Conventional Commits in English with the `(S5.6)` suffix; never `Co-Authored-By` nor any AI attribution.

Reuses: OPFS + stubbed picker pattern and menu-open workaround from `e2e/stale-banner.spec.js`; `readNodes` from `e2e/tree-helpers.js`; the "Sombra" field locator and `Só este` / `Ações` / `Ver diff` steps from `e2e/undo-redo.spec.js`; `fixtures/plain-css`; `playwright.config.js` (`webServer` on port 5180).
Out of scope: flows 4-9 above; migrating `stale-banner.spec.js` to the new helper; moving `selectLayer` into `e2e/tree-helpers.js` (see `[!DECISION] select-helper-home`); new Playwright projects (S5.7); tree virtualization (S4.7); write-log hash (S6.2).

## Design: Architecture & Flows

The test owns both ends: it seeds a real folder in OPFS and reads it back after the app wrote to it. The app in between is untouched; only `showDirectoryPicker` is replaced before any page script runs.

### Topology (macro)

```
┌──────────────────────────┐  addInitScript: showDirectoryPicker = () => __proj
│ e2e/apply-flow.spec.js   │ ─────────────────────────────────────────────┐
│  [NEW]                   │                                              │
│  uses folder-helpers.js  │  seed: fixtures/plain-css/* ─▶ OPFS "proj"   │
│  [NEW]                   │ ──────────────────────────────┐              │
└───────────┬──────────────┘                               ▼              ▼
            │ UI clicks (Playwright)              ┌────────────────┐  ┌──────────────────┐
            ▼                                     │ OPFS folder    │  │ index.html app   │
┌──────────────────────────┐   pickDir → useDir   │ proj/          │  │ (unchanged)      │
│ Conectar pasta → .card   │ ───────────────────▶ │  layers.json   │◀─│ readText         │
│ → Sombra → Ver diff      │                      │  index.html    │  │ writeText:       │
│ → Gerar rascunho         │                      │  style.css     │◀─│  .bak, .tmp+move │
│ → Aprovar                │                      │  style.css.bak │  │ approve:         │
└───────────┬──────────────┘                      │  .design-      │◀─│  history + swap  │
            │ readDisk / listDisk (page.evaluate) │   history/     │  └──────────────────┘
            └───────────────────────────────────▶ └────────────────┘
                         assertions: style.css patched in .card only,
                         .bak == original, history == original, no draft/.tmp
```

### Flow: happy path (Task 2)

```
test            app (index.html)                 OPFS proj/
 │ connect ───▶ useDir(dir) → loadProject ──────▶ read layers.json, index.html, style.css
 │ select .card, "Só este", Sombra = VALUE
 │              changes[] += box-shadow           (nothing written)
 │ Ver diff ──▶ openDiff → lineDiff(orig, patched)
 │ Gerar ─────▶ makeDraft → writeText(draft) ───▶ style.design-draft.css
 │ Aprovar ───▶ approve → writeText(hist, orig) ─▶ .design-history/style.css.<stamp>
 │                      → writeText(style.css) ─▶ style.css.bak (original), style.css (patched)
 │                      → removeEntry(draft) ───▶ draft gone
 │ readDisk/listDisk ◀───────────────────────────
```

## File Structure

| File | Responsibility |
|---|---|
| `e2e/folder-helpers.js` | `connectFixture`, `selectLayer`, `readDisk`, `listDisk` |
| `e2e/apply-flow.spec.js` | flows 1-3 |
| `docs/RELEASE-CHECKLIST.md` | E item closed, counter line |
| `changelog.d/feature-261014-0-s5-6-e2e-functional.md` | fragment with `### Perf` |

---

### Task 1: Folder helper

**Files:**
- Create: `e2e/folder-helpers.js`

**Interfaces:**
- Consumes: `readNodes(page)` from `e2e/tree-helpers.js`.
- Produces: `connectFixture(page, name)`, `selectLayer(page, titlePrefix)`, `readDisk(page, rel) → string | null`, `listDisk(page, dirRel = '') → string[]`.

- [ ] **Step 1: Write the helper**

Create `e2e/folder-helpers.js`:

```js
import fs from 'node:fs';
import path from 'node:path';
import { readNodes } from './tree-helpers.js';

// A fixture copied into the origin-private file system and handed to the app through a stubbed
// showDirectoryPicker, so the real connected-folder paths (read, mtime guard, write) run unchanged.
// Text fixtures only: every file is read as UTF-8.
function fixtureFiles(name) {
  const root = path.resolve('fixtures', name);
  return fs
    .readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => {
      const abs = path.join(e.parentPath, e.name);
      return [path.relative(root, abs).split(path.sep).join('/'), fs.readFileSync(abs, 'utf8')];
    });
}

export async function connectFixture(page, name) {
  await page.addInitScript(() => {
    window.showDirectoryPicker = async () => window.__proj;
  });
  await page.goto('/');
  await page.evaluate(async (files) => {
    const root = await navigator.storage.getDirectory();
    try { await root.removeEntry('proj', { recursive: true }); } catch (e) { /* first run */ }
    const dir = await root.getDirectoryHandle('proj', { create: true });
    for (const [rel, text] of files) {
      const parts = rel.split('/');
      let d = dir;
      for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
      const w = await (await d.getFileHandle(parts[parts.length - 1], { create: true })).createWritable();
      await w.write(text);
      await w.close();
    }
    window.__proj = dir;
  }, fixtureFiles(name));
  // the menu opens on hover and pins on click, so a click can close what hover just opened
  const trigger = page.getByText('Nenhum projeto').first();
  const item = page.getByText(/Conectar pasta/i).first();
  await trigger.click();
  if (!(await item.isVisible())) await trigger.click();
  await item.click();
  await readNodes(page);
}

// The only raw tree-row query of the functional specs: S4.7 virtualizes the tree, fix it here.
export async function selectLayer(page, titlePrefix) {
  await page.locator(`[data-node-id][title^="${titlePrefix}"]`).first().click();
}

// Text of a file in the connected folder, or null when it does not exist.
export function readDisk(page, rel) {
  return page.evaluate(async (rel) => {
    const parts = rel.split('/');
    try {
      let d = window.__proj;
      for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p);
      return await (await (await d.getFileHandle(parts[parts.length - 1])).getFile()).text();
    } catch (e) {
      return null;
    }
  }, rel);
}

// Sorted entry names of a folder in the connected folder ('' = root); [] when it does not exist.
export function listDisk(page, dirRel = '') {
  return page.evaluate(async (rel) => {
    try {
      let d = window.__proj;
      for (const p of rel.split('/').filter(Boolean)) d = await d.getDirectoryHandle(p);
      const out = [];
      for await (const name of d.keys()) out.push(name);
      return out.sort();
    } catch (e) {
      return [];
    }
  }, dirRel);
}
```

- [ ] **Step 2: Verify it loads**

Run: `node -e "import('./e2e/folder-helpers.js').then(m => console.log(Object.keys(m).sort().join(',')))"`
Expected: `connectFixture,listDisk,readDisk,selectLayer`.

- [ ] **Step 3: Commit**

```bash
git add e2e/folder-helpers.js
git commit -m "test(e2e): add connected-folder helper over OPFS (S5.6)"
```

---

### Task 2: Apply flow spec (checklist E line)

**Files:**
- Create: `e2e/apply-flow.spec.js`

**Interfaces:**
- Consumes: Task 1 helpers; `fixtures/plain-css/style.css` (read-only).
- Produces: test `Apply_CardShadowOnConnectedFolder_RewritesOnlyTheRuleWithBakAndHistory`; shared `editCard`, `approveAll`, `ORIGINAL`, `DECL` reused by Task 3.

- [ ] **Step 1: Write the spec**

Create `e2e/apply-flow.spec.js`:

```js
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { connectFixture, selectLayer, readDisk, listDisk } from './folder-helpers.js';

// S5.6: checklist E end to end on a real connected folder (OPFS copy of plain-css): connect, select,
// edit, view the diff, draft, approve, and read the file back. `.card` has one use and no
// box-shadow, so the patch appends one declaration to that rule. Assertions read the folder, never
// the modal log (its wording and the write-log format are not a contract).
const ORIGINAL = fs.readFileSync(path.resolve('fixtures/plain-css/style.css'), 'utf8');
const VALUE = '0 0 0 3px rgb(1, 2, 3)';
const DECL = /box-shadow:\s*0 0 0 3px rgb\(1, 2, 3\)/;

const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

async function editCard(page) {
  await connectFixture(page, 'plain-css');
  await selectLayer(page, '.card');
  await page.getByText('Só este', { exact: false }).first().click();
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(VALUE);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
}

async function approveAll(page) {
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Aplicar nos arquivos', { exact: false }).first().click();
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'style.design-draft.css')).toMatch(DECL);
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
}

// Split around the top-level `.card { … }` block (the @media one comes later in the file).
function aroundCard(css) {
  const start = css.indexOf('.card {');
  const end = css.indexOf('}', start) + 1;
  return { before: css.slice(0, start), block: css.slice(start, end), after: css.slice(end) };
}

test('Apply_CardShadowOnConnectedFolder_RewritesOnlyTheRuleWithBakAndHistory', async ({ page }) => {
  await editCard(page);
  expect(await readDisk(page, 'style.css'), 'edits stay in memory until approval').toBe(ORIGINAL);

  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Ver diff', { exact: false }).first().click();
  await expect(page.getByText('1 arquivo(s) · 1 ajuste(s)')).toBeVisible();
  await expect(page.getByText(DECL).first()).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).first().click();

  await approveAll(page);

  const now = aroundCard(await readDisk(page, 'style.css'));
  const was = aroundCard(ORIGINAL);
  expect(now.block).toMatch(DECL);
  expect(now.before, 'text before .card untouched').toBe(was.before);
  expect(now.after, 'text after .card untouched (incl. @media .card)').toBe(was.after);

  expect(await readDisk(page, 'style.css.bak'), '.bak keeps the original').toBe(ORIGINAL);
  const hist = await listDisk(page, '.design-history');
  expect(hist).toHaveLength(1);
  expect(hist[0]).toMatch(/^style\.css\./);
  expect(await readDisk(page, '.design-history/' + hist[0])).toBe(ORIGINAL);

  const root = await listDisk(page);
  expect(root, 'draft removed after approval').not.toContain('style.design-draft.css');
  expect(root.filter((n) => n.endsWith('.tmp')), 'atomic write leaves no .tmp').toEqual([]);
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/apply-flow.spec.js`
Expected: PASS. The app is not changed by this leaf, so a failure is a selector or setup issue, or a real bug:
- `.card` row not found: inspect the tree row `title` for `.card` in plain-css and adjust only the `selectLayer` prefix.
- Draft never appears / toast "permissão de escrita não concedida": `queryPermission` is missing on the OPFS handle; in `connectFixture`, after `window.__proj = dir;`, add `dir.queryPermission ??= async () => 'granted'; dir.requestPermission ??= async () => 'granted';`.
- A failure that the app causes (wrong bytes on disk, `.tmp` left behind) is a finding: stop, record it in the report, open a separate leaf. Do not touch `index.html`.

- [ ] **Step 3: Regression of the sibling spec**

Run: `npx playwright test e2e/stale-banner.spec.js e2e/apply-flow.spec.js`
Expected: PASS (both use OPFS `proj`; each test gets a fresh context).

- [ ] **Step 4: Commit**

```bash
git add e2e/apply-flow.spec.js
git commit -m "test(e2e): cover connect, edit, diff, approve and file on disk (S5.6)"
```

---

### Task 3: Rollback specs

Runs only when `[!DECISION] rollback-spec` is Option A.

**Files:**
- Modify: `e2e/apply-flow.spec.js` (append after the Task 2 test)

**Interfaces:**
- Consumes: `editCard`, `approveAll`, `ORIGINAL`, `DECL` from Task 2; `readDisk`.
- Produces: tests `Rollback_AfterApply_RestoresOriginalFile`, `Rollback_FileChangedOutside_RefusesAndKeepsFile`.

- [ ] **Step 1: Write the tests**

Append to `e2e/apply-flow.spec.js`:

```js
test('Rollback_AfterApply_RestoresOriginalFile', async ({ page }) => {
  await editCard(page);
  await approveAll(page);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await page.getByRole('button', { name: 'Rollback' }).click();
  await expect.poll(() => readDisk(page, 'style.css')).toBe(ORIGINAL);
});

test('Rollback_FileChangedOutside_RefusesAndKeepsFile', async ({ page }) => {
  await editCard(page);
  await approveAll(page);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await page.waitForTimeout(50); // a later mtime than the one approve recorded
  const outside = (await readDisk(page, 'style.css')) + '\n/* changed outside LAYERS */\n';
  await page.evaluate(async (text) => {
    const w = await (await window.__proj.getFileHandle('style.css')).createWritable();
    await w.write(text);
    await w.close();
  }, outside);
  await page.getByRole('button', { name: 'Rollback' }).click();
  await expect(page.getByText(/Reverter recusado/)).toBeVisible();
  expect(await readDisk(page, 'style.css')).toBe(outside);
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/apply-flow.spec.js`
Expected: PASS (3 tests). If "Rollback" is not visible, the Ajustes list is collapsed: open it by clicking its header text `Ajustes` before the click, nothing else.

- [ ] **Step 3: Commit**

```bash
git add e2e/apply-flow.spec.js
git commit -m "test(e2e): cover rollback and its external-change refusal (S5.6)"
```

---

### Task 4: Checklist and changelog

**Files:**
- Modify: `docs/RELEASE-CHECKLIST.md` (counter line under the title; section E item starting `- [ ] E2E (Playwright;`)
- Create: `changelog.d/feature-261014-0-s5-6-e2e-functional.md`

**Interfaces:**
- Consumes: Tasks 1-2 (and 3 when run) committed and green.
- Produces: closing docs; the roadmap row closes later in `phase-close-gate`.

- [ ] **Step 1: Close the checklist item**

Replace the line `- [ ] E2E (Playwright; infra e specs de performance prontos em `e2e/`, faltam os specs funcionais): conectar pasta → selecionar → editar → ver diff → aplicar → arquivo alterado.` with (drop the rollback clause if Task 3 was skipped):

```md
- [x] E2E funcional (Playwright): conectar pasta → selecionar → editar → ver diff → aplicar → arquivo alterado, numa cópia real do `plain-css` no OPFS (`e2e/apply-flow.spec.js`, helper `e2e/folder-helpers.js`); confere `.bak`, histórico e ausência de rascunho/`.tmp`, mais rollback e sua recusa. Gate manual (E2E): `npm run test:e2e`.
```

In the counter line `Hoje: N concluídos, P parciais, M abertos.`, add 1 to concluídos and subtract 1 from abertos, starting from the values present at execution time (parallel leaves may have moved them).

- [ ] **Step 2: Write the changelog fragment**

Create `changelog.d/feature-261014-0-s5-6-e2e-functional.md` (drop the rollback clause if Task 3 was skipped):

```md
### Added
- `e2e/apply-flow.spec.js`: fluxo funcional do checklist E numa pasta real (cópia do `plain-css` no OPFS, `showDirectoryPicker` substituído) — conectar, selecionar `.card`, editar, ver diff, rascunho, aprovar e ler o `style.css` gravado; confere `.bak`, `.design-history/`, ausência de rascunho e `.tmp`; rollback e recusa por mudança externa.
- `e2e/folder-helpers.js`: `connectFixture`, `selectLayer`, `readDisk`, `listDisk`.

### Perf
- N/A — só testes E2E novos; `index.html` e `lib/` intocados, nenhum caminho de execução do app mudou.
```

- [ ] **Step 3: Verify and commit**

Run: `npm test` — Expected: PASS (unchanged; Vitest excludes `e2e/`).

```bash
git add docs/RELEASE-CHECKLIST.md changelog.d/feature-261014-0-s5-6-e2e-functional.md
git commit -m "docs: close checklist E functional E2E with changelog fragment (S5.6)"
```

---

## Self-Review

| Requirement | Task |
|---|---|
| connect → select → edit → diff → apply → file changed | 2 |
| `.bak` / atomic write (no `.tmp`) / history checked on disk | 2 |
| Rollback + refusal | 3 |
| No `index.html` edit, no hook | all (global constraints) |
| No raw `[data-node-id]` in specs | 1 (`selectLayer`) |
| No write-log format assertion (S6.2) | 2, 3 |
| Checklist E + counter, changelog with `### Perf` | 4 |

> [!DECISION] rollback-spec
> Rollback is outside the literal checklist line but costs two short tests on the same helper and covers a second write path (`rollback` + `movedSince` guard).
> - **Option A**: run Task 3 in this leaf (recommended: cheap, no new helper, no app change).
> - **Option B**: skip Task 3; flows 2-3 move to "later" and the checklist/changelog text drops the rollback clause.

> [!DECISION] select-helper-home
> `selectLayer` wraps the only raw `[data-node-id]` query so S4.7 has one place to fix.
> - **Option A**: keep it in the new `e2e/folder-helpers.js` (recommended: this leaf touches no shared file, disjoint from parallel leaves).
> - **Option B**: put it in `e2e/tree-helpers.js` next to `readNodes`, the natural home S4.7 will rewrite anyway.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 1. Folder helper | gen | Standard | Workhorse | test authoring (rule 7: never Executor) |
| 2. Apply flow spec | gen | Standard | Workhorse | test authoring, selector judgment on failure |
| 3. Rollback specs | gen | Standard | Workhorse | test authoring |
| 4. Checklist and changelog | gen | Mechanical | Executor | text given verbatim; caller checks diff and `npm test` exit_code |
| Pre-merge review | review | Architectural | Architect | verifier ≥ generator, via `adversarial-reviewer` |

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — test-only leaf with no app change, already tracked by roadmap row S5.6 and the checklist E item; the PR is the record (same as S5.2-S5.4).
> Draft (not created unless this verdict flips via `gh-issue-gate`):
> - **Title**: `test: functional E2E for connect, edit, diff, approve (S5.6)`
> - **Labels**: enhancement
> - **Milestone**: (none)
> - **Body**: Context: checklist E still lacks a functional E2E; the perf specs and the OPFS picker stub of `stale-banner.spec.js` exist. Proposal: `e2e/folder-helpers.js` (OPFS-connected fixture, disk readers, single tree-row selector) and `e2e/apply-flow.spec.js` driving connect → select → edit → diff → draft → approve on `plain-css`, asserting the file on disk, `.bak`, history and no leftovers; optional rollback and refusal. Acceptance criteria: `npx playwright test e2e/apply-flow.spec.js` passes; no edit to `index.html`, `lib/`, `playwright.config.js`; no assertion on log wording; checklist E item closed.

> [!DECISION] phase-intake
> Classification: **meso** `S5.6` under **S5 Testes**, target **Unreleased** (v1 gate).
> Current tree (relevant slice): S5 Testes (in-progress) › S5.1-S5.5 done · S5.6 E2E Playwright funcional (in-progress) · S5.7 Compatibilidade (registered).
> Fork of an existing row? **No** (row already registered; this plan only starts it).
> - **Option A**: keep as `S5.6` (recommended)

> [!DECISION] execution
> Method: **Native** (recommended: four small sequential tasks where Task 2 depends on Task 1 and Task 3 on Task 2; Task 4 still goes to the `executor` subagent).
