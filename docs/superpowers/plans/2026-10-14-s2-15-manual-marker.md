---
title: "S2.15 Manual Marker Implementation Plan"
type: plan
solution: Layers
status: draft
created: 2026-10-14
---

# S2.15 Manual Marker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mark TS/JS origins as "manual" in the origin chip and in the Ajustes list, so a `.ts` source no longer reads as `mock`.

**Architecture:** One pure predicate `LayersCore.isManualSource(file)` in `lib/layers-core.js`; `index.html` uses it for three labels (origin chip text, origin tooltip, Ajustes row suffix). No write path changes: draft/approve/export already skip non-CSS, non-dc sources.

**Tech Stack:** JS puro, Vitest (`npm test`), Playwright (`npm run test:e2e`), fixture `traval` (root `src/ui/shell.ts|.shell|3`).

**Spec:** [../specs/2026-10-14-s2-15-manual-marker-design.md](../specs/2026-10-14-s2-15-manual-marker-design.md)

## Global Constraints

- Visual frozen: only existing tokens (`--fg3`, `--warn`), no new colors, sizes or typography.
- Inline style only; `support.js` is generated, never edited.
- No network on load; no new `<script>`/`<link>`.
- Conventional Commits in EN, `(S2.15)` suffix; never `Co-Authored-By`; no commit on `develop`.
- Test names `Metodo_Cenario_Esperado`; `npm test` must pass before each commit.
- Do not refactor the other inline `/\.css$/` tests in `index.html`.

## Review Focus

- `.d.ts`, `.mts`, `.cts`, `.cjs`, `.mjs` origins: manual (extension class is `[cm]?[jt]sx?`).
- Upper-case extension (`App.TSX`): manual (case-insensitive).
- Empty, `null` or `undefined` file (nothing selected): `false`, never throws.
- `.css`, `.scss`, `.html` (incl. dc template `index.html`): not manual; chip keeps `.css real` / `mock`.
- Path whose directory contains `.ts` (`a.ts/style.css`): not manual (anchored on the end).

## Model Routing

| Task | Tier | Executor |
|---|---|---|
| Task 1: predicate + unit tests | Standard | Workhorse (`claude-sonnet-5-5`) |
| Task 2: UI markers + e2e | Standard | Workhorse (`claude-sonnet-5-5`) |
| Task 3: docs + changelog fragment | Mechanical | `executor` |
| Whole-branch review | Architectural | `adversarial-reviewer` |

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — one pure predicate plus UI labels, spec already committed, tracked by the S2.15 roadmap row and the PR (same as S2.11/S2.12).

> [!DECISION] phase-intake: **micro** — leaf S2.15 already registered under in-progress phase S2; no new phase, no reorder.

> [!DECISION] execution
> Pending — chosen by the user at the single plan-review stop (recommendation: Native: 3 small tasks, one shared file).

## File Structure

| File | Responsibility |
|---|---|
| `lib/layers-core.js` | `isManualSource` (pure), exported on `LayersCore` |
| `test/layers-core.test.js` | unit tests for the predicate |
| `index.html` | chip label, chip tooltip, Ajustes row suffix |
| `e2e/manual-marker.spec.js` | UI proof on `traval` |
| `docs/RELEASE-CHECKLIST.md`, `docs/ARCHITECTURE.md`, `changelog.d/` | closing docs |

---

### Task 1: Predicate `isManualSource`

**Files:**
- Modify: `lib/layers-core.js` (add function before `checkOrigin`, line ~430; export next to `checkOrigin:` at line ~1139)
- Test: `test/layers-core.test.js` (new `describe` after the `checkOrigin` block ending at line ~1125)

**Interfaces:**
- Consumes: nothing.
- Produces: `LayersCore.isManualSource(file: string | null | undefined): boolean`.

- [ ] **Step 1: Write the failing test**

Insert after the closing `});` of the `checkOrigin` describe (before `describe('DismissWatchSeen'`):

```js
describe('IsManualSource', () => {
  it('ExtensoesTsJs_True', () => {
    for (const f of ['src/ui/shell.ts', 'App.tsx', 'a.js', 'b.jsx', 'c.mjs', 'd.cjs', 'e.mts', 'f.cts', 'types.d.ts']) {
      expect(core.isManualSource(f), f).toBe(true);
    }
  });

  it('ExtensaoMaiuscula_True', () => {
    expect(core.isManualSource('App.TSX')).toBe(true);
  });

  it('CssHtmlScss_False', () => {
    for (const f of ['a.css', 'index.html', 'a.scss', 'page.htm']) {
      expect(core.isManualSource(f), f).toBe(false);
    }
  });

  it('PastaComExtensaoTs_False', () => {
    expect(core.isManualSource('a.ts/style.css')).toBe(false);
  });

  it('VazioNuloIndefinido_FalseSemLancar', () => {
    expect(core.isManualSource('')).toBe(false);
    expect(core.isManualSource(null)).toBe(false);
    expect(core.isManualSource(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/layers-core.test.js -t IsManualSource`
Expected: FAIL with `core.isManualSource is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `lib/layers-core.js`, immediately before `function checkOrigin(src, files, classes, id) {` (line ~430):

```js
  // Origem TS/JS: o trecho é só referência; o ajuste fica registrado e o patch é manual.
  function isManualSource(file) {
    return typeof file === 'string' && /\.[cm]?[jt]sx?$/i.test(file);
  }

```

In the exported `api` object, add after `checkOrigin: checkOrigin,`:

```js
    isManualSource: isManualSource,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all suites, new `IsManualSource` included).

- [ ] **Step 5: Commit**

```bash
git add lib/layers-core.js test/layers-core.test.js
git commit -m "feat(core): add isManualSource predicate for TS/JS origins (S2.15)"
```

---

### Task 2: UI markers and e2e

**Files:**
- Modify: `index.html:2225` (`originShort`), `index.html:2228` (`originSource`), `index.html:2129-2130` (`changes` builder), `index.html:365` (Ajustes row template)
- Create: `e2e/manual-marker.spec.js`

**Interfaces:**
- Consumes: `LayersCore.isManualSource(file)` from Task 1.
- Produces: chip text `<ext> · manual`; tooltip `origem: <file> — patch manual`; Ajustes row suffix element `[data-manual-mark]` with text ` · patch manual`.

- [ ] **Step 1: Write the failing e2e**

Create `e2e/manual-marker.spec.js`:

```js
import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S2.15: an origin that points at TS/JS is marked "manual" in the origin chip and in the Ajustes
// list. Traval maps its root (`.shell`) to `src/ui/shell.ts|.shell|3`, a file the fixture does not vendor.
const SHADOW = '0 0 0 3px rgb(1, 2, 3)';

const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

async function typeShadow(page, text) {
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(text);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
}

test('Marker_TsOrigin_ChipAndAjustesSayManual', async ({ page }) => {
  await page.goto('/?layers=fixtures/traval/');
  await readNodes(page);
  await page.locator('[data-node-id][title^=".shell"]').first().click();
  await expect(page.locator('span[title^="origem: src/ui/shell.ts"]')).toContainText('manual');
  await page.getByText('Só este', { exact: false }).first().click();
  await typeShadow(page, SHADOW);
  await expect(page.locator('[data-manual-mark]').filter({ hasText: 'patch manual' }).first()).toBeVisible();
});

test('Marker_CssOrigin_KeepsMockOrCssReal', async ({ page }) => {
  await page.goto('/?layers=fixtures/axai/');
  await readNodes(page);
  await page.locator('[data-node-id][title^=".sum-stat"]').first().click();
  await expect(page.locator('span[title^="origem:"]').filter({ hasText: 'manual' })).toHaveCount(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/manual-marker.spec.js`
Expected: `Marker_TsOrigin_ChipAndAjustesSayManual` FAILS (chip reads `mock`, no `[data-manual-mark]`); `Marker_CssOrigin_*` passes. If the `.shell` row title differs, inspect the tree row `title` for the traval root and adjust the `title^=` prefix only.

- [ ] **Step 3: Write minimal implementation**

`index.html:2225` — replace the line (single match on `originShort:`):

```js
      originShort: s.dir && /\.css$/.test(selFile) ? '.css real' : LayersCore.isManualSource(selFile) ? selFile.slice(selFile.lastIndexOf('.')) + ' · manual' : 'mock',
```

`index.html:2228` — in the same line, replace only the `originSource:` value:

old: `originSource: s.dir && /\.css$/.test(selFile) ? 'origem: ' + selFile : 'origem: estilos do mock (conecte a pasta para ler o .css)',`

new:
```js
originSource: s.dir && /\.css$/.test(selFile) ? 'origem: ' + selFile : LayersCore.isManualSource(selFile) ? 'origem: ' + selFile + ' — patch manual (a fonte não é .css)' : 'origem: estilos do mock (conecte a pasta para ler o .css)',
```

`index.html:2130` — in the returned object of the `changes` map, add after `line: line || '?',`:

```js
manual: LayersCore.isManualSource(file) ? ' · patch manual' : '',
```

`index.html:365` — replace the row:

```html
              <div style="grid-column:1 / -1;color:var(--fg3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ c.file }} › {{ c.selector }} · L{{ c.line }}<span data-manual-mark style="color:var(--warn)">{{ c.manual }}</span></div>
```

Before each replace confirm the anchor matches exactly once (`grep -c`), per project style.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx playwright test e2e/manual-marker.spec.js e2e/origin-sample.spec.js e2e/tree-snapshot.spec.js`
Expected: PASS (new spec green, origin-sample and tree-snapshot unchanged).
Then: `npm test` — Expected: PASS.

- [ ] **Step 5: Manual check (network + visual)**

Run: `npm run dev`, open `http://localhost:5180/?layers=fixtures/traval/`.
Expected: root selected → chip `.ts · manual`; DevTools → Network: no request outside `localhost:5180`; open `?layers=fixtures/axai/` → chips unchanged (`mock` / `.css real`).

- [ ] **Step 6: Commit**

```bash
git add index.html e2e/manual-marker.spec.js
git commit -m "feat(editor): mark TS/JS origins as manual in the origin chip and Ajustes (S2.15)"
```

---

### Task 3: Docs and changelog

**Files:**
- Modify: `docs/RELEASE-CHECKLIST.md:29`, `docs/ARCHITECTURE.md:125`
- Create: `changelog.d/feature-261014-0-s2-15-manual-marker.md`

**Interfaces:**
- Consumes: Tasks 1 and 2 merged on the branch.
- Produces: docs consistent with the feature; roadmap row closes later in `phase-close-gate`.

- [ ] **Step 1: Update the checklist**

In `docs/RELEASE-CHECKLIST.md:29` change `- [~]` to `- [x]` and replace the sentence `Falta marcar TS/JS explicitamente como "manual" na interface.` with `Origem TS/JS aparece como "manual" no chip de origem e na lista de Ajustes (S2.15; `e2e/manual-marker.spec.js`).`

- [ ] **Step 2: Update the architecture note**

In `docs/ARCHITECTURE.md:125` replace the line with:

```md
- Regras vindas de TS/JS/JSX são exibidas e registradas, mas não reescritas; o chip de origem e a lista de Ajustes as marcam como "manual" (`LayersCore.isManualSource`).
```

- [ ] **Step 3: Write the changelog fragment**

Create `changelog.d/feature-261014-0-s2-15-manual-marker.md`:

```md
---
adr: none
---

### Added
- Origens TS/JS aparecem como "manual" no chip de origem (`.ts · manual`, antes `mock`) e na lista de Ajustes (sufixo "patch manual"). `LayersCore.isManualSource` (puro, testado); nenhum caminho de gravação mudou.
- `e2e/manual-marker.spec.js`: chip e Ajustes no `traval`, e chip inalterado em origem `.css`.

### Perf
- estimated — um teste de regex por seleção de nó e por linha de Ajustes; nada no caminho de câmera.
```

- [ ] **Step 4: Verify and commit**

Run: `npm test` — Expected: PASS.

```bash
git add docs/RELEASE-CHECKLIST.md docs/ARCHITECTURE.md changelog.d/feature-261014-0-s2-15-manual-marker.md
git commit -m "docs: close S2.15 with changelog fragment, checklist and architecture note (S2.15)"
```

---

## Self-Review

| Spec requirement | Task |
|---|---|
| Predicate in core, exported | A |
| Chip `.ts · manual` + tooltip | B (`originShort`, `originSource`) |
| Ajustes row suffix | B (`changes` builder + template) |
| Unit tests (Ts/Css/Html + edge cases) | A |
| E2E on a `.ts` fixture | B |
| Checklist, ARCHITECTURE, changelog | C |
| Writer unchanged | no task (by design) |
