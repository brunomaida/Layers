---
title: "S6.2 Write Log Hash Implementation Plan"
type: plan
solution: Layers
status: draft
created: 2026-10-14
---

# S6.2 Write Log Hash Implementation Plan

Add a SHA-256 of the content before and after each `writeText` to `this.writeLog`, and move the `layers-export.log` formatting into a pure `LayersCore.writeLogText` with a versioned header. Touches `lib/layers-core.js`, `test/layers-core.test.js`, `index.html` (`writeText`, `exportFull`), a new `e2e/write-log-hash.spec.js` and the closing docs.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Context

Checklist F item `[~]` (`docs/RELEASE-CHECKLIST.md:74`): `layers-export.log` already carries path, timestamp, size before/after and the `.bak` flag; the hash is missing. Current code:

- `index.html:1824-1844` `writeText(path, text)`: reads `before` (`f.text()`, `''` for a new file), writes `.bak` once per session via `rawWrite` (`:1845`) with that same `before` text, writes `.tmp` + `move`, then pushes `{ path, at, from: before.length, to: text.length, bak }` to `this.writeLog` (`:1843`).
- `index.html:1932-1946` `exportFull()`: formats `this.writeLog` inline and writes `layers-export.log` via `writeInto` (`:1942` comment, `:1943` write).
- `lib/layers-core.js:718` `hash53` (cyrb53, 53-bit, non-cryptographic) and `:732` `sourceHash`; `index.html:1108` `partHash` wraps `sourceHash`. They stay as they are (pending-change validity, S2.14).

Every `writeText` caller (`draftDc` `:1863`, `makeDraft` `:1882`, `approve` `:1898`, `rollback` `:1915`) is a user click: cold path, General tier. `writeText` is already async and only reachable in a secure context (FS Access requires one, checklist A `:14`), so `crypto.subtle` is always present where it runs. Node 24 (Vitest) exposes `globalThis.crypto.subtle` and `TextEncoder`.

Parallel leaves: S5.6 adds functional e2e specs and must not assert the exact log line; this plan's e2e asserts only hash-token presence. S5.7 later edits the FS-capability check in `exportFull` (`:1935`, ~8 lines above `:1943`); this plan's `exportFull` hunk is limited to `:1942-1943`.

Reuses: `writeText`/`writeLog`, `exportFull`/`writeInto`, the OPFS `showDirectoryPicker` stub from `e2e/stale-banner.spec.js`, `readNodes` from `e2e/tree-helpers.js`, `test/setup.js` (`core`).
In scope (small growth, user may veto): `from`/`to` are UTF-16 code units today (`String.length`) under a `bytes` label; since `contentHash` already encodes UTF-8, it also returns the UTF-8 byte length and v2 logs real bytes, so the v2 format does not lock in the wrong label.
Out of scope: `before` and `.bak` are the decoded text (`f.text()`, `index.html:1829`) re-encoded as UTF-8, so a BOM or non-UTF-8 bytes of the original file are not preserved and the `before` hash covers the re-encoded text; `writeInto` export writes and `.bak`/`.tmp` raw writes stay unlogged; `hash53`/`sourceHash`/`partHash` unchanged; no hash in the on-screen export log (`modal.log`).

## Design: Architecture & Flows

Micro: one component (`index.html` app class) plus one pure core helper pair. Data flows from the write to the export file.

### Topology (micro)

```
 click (draft / approve / rollback)
          │
          ▼
┌───────────────────────────────┐        ┌──────────────────────────────────┐
│ writeText(path, text)  [EDIT] │        │ lib/layers-core.js       [NEW]   │
│  before = f.text()            │        │ contentHash(text) -> Promise<    │
│  .bak / .tmp + move (as today)│        │   {sha256: hex, bytes: n}>       │
│  [a, b] = await hashes        │──────▶ │  SHA-256(UTF-8), crypto.subtle   │
│  (digest fail -> sha256 null) │◀────── │  catch -> {sha256: null, bytes}  │
│  writeLog.push({path, at,     │        │ writeLogText(entries) -> string  │
│   from, to, fromHash, toHash, │        │  "# layers-export.log v2 ..."    │
│   bak})                       │        │  one line per entry, null -> '-' │
└───────────────┬───────────────┘        └────────────────┬─────────────────┘
                │ this.writeLog                           │
                ▼                                         │
┌───────────────────────────────┐                         │
│ exportFull()           [EDIT] │ ── writeLogText(log) ───┘
│  writeInto(target,            │
│   'layers-export.log', text)  │
└───────────────────────────────┘
```

### Log format (v2)

```
# layers-export.log v2 — at  path  from -> to bytes (UTF-8)  sha256 before -> after  [.bak guardado]
2026-10-14T12:00:00.000Z  style.design-draft.css  0 -> 812 bytes  sha256 e3b0…b855 -> 9f1c…
2026-10-14T12:01:00.000Z  style.css  790 -> 812 bytes  sha256 41aa…07 -> 9f1c…  .bak guardado
2026-10-14T12:02:00.000Z  style.css  812 -> 815 bytes  sha256 - -> -
```

Hashes are full 64-char lowercase hex (shortened above); sizes are UTF-8 byte lengths. `after` equals `sha256sum`/`Get-FileHash` of the written file. `before` equals the hash of `<path>.bak` only for the first write of that path in the session with non-empty previous content, and only if the `.bak` write succeeded (`if (before && !this.baks[path])` in `writeText`; `.bak` failures are swallowed). `before` of a new file is the empty-string hash. If the digest fails, only the hashes print as `-` (last line above); sizes stay, and the write itself is unaffected. Paths are printed with control characters, Unicode line breaks and runs of 2+ spaces escaped (`\xNN`), so a path cannot forge or split a line.

> [!DECISION] hash-algorithm
> Integrity/audit hash owned by checklist F; writes are cold path (one click, a few FS round-trips of ~ms each).
> - **Option A (recommended)**: SHA-256 via `crypto.subtle.digest`. Collision-resistant (2^128 birthday bound) and verifiable with standard tools against the file on disk. Native digest runs at hundreds of MB/s: a 200 KB stylesheet costs well under 1 ms plus two `TextEncoder` buffers (before/after) and the digest's internal copy (short-lived, young-gen GC). Async fits `writeText`, already async; secure context is guaranteed wherever `writeText` can run.
> - **Option B**: reuse `hash53` (cyrb53). Sync, zero new code, but 53 non-cryptographic bits: collisions are craftable and the birthday bound is ~2^26.5; computed over UTF-16 code units, so no external tool reproduces it. Fit for cache keys (its S2.14 use), not for an audit trail.

> [!DECISION] hash-scope
> - **Option A (recommended)**: hash both `before` and `after`, mirroring the `from -> to` size pair. `after` proves what was written; `before` proves what was overwritten and matches the `.bak` under the conditions above.
> - **Option B**: `after` only. Half the digests, but loses the link to the overwritten version.

> [!DECISION] log-format-version
> - **Option A (recommended)**: one header line `# layers-export.log v2 — <columns>`; a column change bumps the number. One line per file, self-describing, no per-line cost.
> - **Option B**: no versioning (the log is read by humans today; no consumer in the repo).
> - **Option C**: switch to JSON Lines with a `v` field. Machine-friendly but changes every line and the human reading.

## Global Constraints

- `index.html`: confirm each anchor matches once (`grep -c`) before replacing; `support.js` is generated, never edited; visual frozen (no UI change).
- No network on load; no new `<script>`/`<link>`.
- Code comments in EN; test names `Metodo_Cenario_Esperado`; `npm test` passes before each commit.
- Conventional Commits with `(S6.2)` suffix; never `Co-Authored-By` or AI attribution; no commit on `develop`.
- Do not touch the `exportFull` FS-capability check (`:1935`, S5.7) nor the e2e files of S5.6.

---

### Task 1: Core helpers `contentHash` and `writeLogText`

**Files:**
- Modify: `lib/layers-core.js` (after `sourceHash`, line ~738; export next to `sourceHash:` at line ~1148)
- Test: `test/layers-core.test.js` (new `describe` blocks after the `SourceHash` block ending at line ~1335)

**Interfaces:**
- Produces: `LayersCore.contentHash(text: string): Promise<{ sha256: string, bytes: number }>` (64-char lowercase hex, UTF-8 byte length); `LayersCore.writeLogText(entries: {at, path, from, to, fromHash, toHash, bak}[]): string` (`null` size/hash prints `-`); `LayersCore.WRITE_LOG_VERSION = 2`.

- [ ] **Step 1: Write the failing tests**

Insert after the closing `});` of `describe('SourceHash'`:

```js
describe('ContentHash', () => {
  it('Vazio_VetorSha256', async () => {
    expect(await core.contentHash('')).toEqual({ sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', bytes: 0 });
  });

  it('Abc_VetorSha256', async () => {
    expect(await core.contentHash('abc')).toEqual({ sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', bytes: 3 });
  });

  it('NaoAscii_HashEBytesUtf8', async () => {
    expect(await core.contentHash('ç')).toEqual({ sha256: '8bfa829b8119a6f39b91fd8decec63830b556e4d88a9da29334d7b0558829f2d', bytes: 2 });
  });
});

describe('WriteLogText', () => {
  const H0 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const H1 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  const entry = (o) => ({ at: '2026-10-14T12:00:00.000Z', path: 'style.css', from: 0, to: 3, fromHash: H0, toHash: H1, bak: false, ...o });

  it('Cabecalho_PrimeiraLinhaComVersao', () => {
    expect(core.writeLogText([entry({})]).split('\n')[0]).toMatch(/^# layers-export\.log v2 /);
    expect(core.WRITE_LOG_VERSION).toBe(2);
  });

  it('Entrada_LinhaComTamanhosEHashes', () => {
    expect(core.writeLogText([entry({})]).split('\n')[1]).toBe('2026-10-14T12:00:00.000Z  style.css  0 -> 3 bytes  sha256 ' + H0 + ' -> ' + H1);
  });

  it('ComBak_SufixoBakGuardado', () => {
    expect(core.writeLogText([entry({ bak: true })]).split('\n')[1]).toMatch(/ -> [0-9a-f]{64}  \.bak guardado$/);
  });

  it('HashNulo_TracoNoLugarDeTamanhoEHash', () => {
    expect(core.writeLogText([entry({ from: null, to: null, fromHash: null, toHash: null })]).split('\n')[1]).toBe('2026-10-14T12:00:00.000Z  style.css  - -> - bytes  sha256 - -> -');
  });

  it('VariasEntradas_UmaLinhaPorEntradaETerminaComNovaLinha', () => {
    const text = core.writeLogText([entry({}), entry({ path: 'b.css' })]);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.trimEnd().split('\n')).toHaveLength(3);
  });
});
```

The three digests and byte counts were checked against `node:crypto` `createHash('sha256')` and `Buffer.byteLength` over UTF-8.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/layers-core.test.js -t "ContentHash|WriteLogText"`
Expected: FAIL with `core.contentHash is not a function` / `core.writeLogText is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `lib/layers-core.js`, immediately after the closing `}` of `function sourceHash(parts)`:

```js

  // ------------------------------------------------- write log (S6.2)

  // Bumped when a layers-export.log column changes meaning or position.
  var WRITE_LOG_VERSION = 2;

  // SHA-256 of the UTF-8 bytes (lowercase hex, same as sha256sum on the written file) and their count.
  async function contentHash(text) {
    var bytes = new TextEncoder().encode(text);
    var buf = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return { sha256: Array.from(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join(''), bytes: bytes.length };
  }

  // layers-export.log text: versioned header, then one line per writeText entry; null prints '-'.
  function writeLogText(entries) {
    var v = function (x) { return x == null ? '-' : x; };
    var lines = ['# layers-export.log v' + WRITE_LOG_VERSION + ' — at  path  from -> to bytes (UTF-8)  sha256 before -> after  [.bak guardado]'];
    (entries || []).forEach(function (w) {
      lines.push([w.at, w.path, v(w.from) + ' -> ' + v(w.to) + ' bytes', 'sha256 ' + v(w.fromHash) + ' -> ' + v(w.toHash), w.bak ? '.bak guardado' : ''].filter(Boolean).join('  '));
    });
    return lines.join('\n') + '\n';
  }
```

In the `api` object, after `sourceHash: sourceHash,`:

```js
    contentHash: contentHash,
    writeLogText: writeLogText,
    WRITE_LOG_VERSION: WRITE_LOG_VERSION,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all suites, `ContentHash` and `WriteLogText` included).

- [ ] **Step 5: Commit**

```bash
git add lib/layers-core.js test/layers-core.test.js
git commit -m "feat(core): add SHA-256 contentHash and versioned writeLogText (S6.2)"
```

---

### Task 2: Hash in `writeText` and export log, with e2e

**Files:**
- Modify: `index.html:1843` (`writeLog` entry, after the mtime refresh at `:1842`), `index.html:1942-1943` (comment + `layers-export.log` write)
- Create: `e2e/write-log-hash.spec.js`

**Interfaces:**
- Consumes: `LayersCore.contentHash`, `LayersCore.writeLogText` (Task 1).
- Produces: `this.writeLog` entries gain `fromHash`, `toHash`; `from`/`to` become UTF-8 byte lengths (kept on digest failure, only the hashes become `null`); `layers-export.log` in format v2.

- [ ] **Step 1: Write the failing e2e**

Create `e2e/write-log-hash.spec.js`:

```js
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S6.2: layers-export.log carries a SHA-256 before -> after per write, and the "after" hash
// matches the file on disk. Only token presence is asserted; the line layout belongs to the unit tests.
const FIXTURE = path.resolve('fixtures/plain-css');
const FILES = ['layers.json', 'index.html', 'style.css'].map((n) => [n, fs.readFileSync(path.join(FIXTURE, n), 'utf8')]);
const SHADOW = '0 0 0 3px rgb(1, 2, 3)';

async function connect(page) {
  await page.addInitScript(() => {
    window.showDirectoryPicker = async () => window.__proj;
  });
  await page.goto('/');
  await page.evaluate(async (files) => {
    const root = await navigator.storage.getDirectory();
    for (const name of ['proj', 'export']) { try { await root.removeEntry(name, { recursive: true }); } catch (e) { /* first run */ } }
    const dir = await root.getDirectoryHandle('proj', { create: true });
    for (const [name, text] of files) {
      const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
      await w.write(text);
      await w.close();
    }
    window.__proj = dir;
  }, FILES);
  const trigger = page.getByText('Nenhum projeto').first();
  const item = page.getByText(/Conectar pasta/i).first();
  await trigger.click();
  if (!(await item.isVisible())) await trigger.click();
  await item.click();
  await readNodes(page);
}

const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

const readOpfs = (page, dirName, file) => page.evaluate(async ([d, f]) => {
  const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(d);
  return (await (await dir.getFileHandle(f)).getFile()).text();
}, [dirName, file]);

test('ExportLog_AfterDraft_HasSha256MatchingDisk', async ({ page }) => {
  await connect(page);
  await page.locator('[data-node-id][title^=".card"]').first().click();
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(SHADOW);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);

  await page.getByText('Ações ▾').click();
  await page.getByText('Aplicar nos arquivos…').click();
  await page.getByText('1 · Gerar rascunho paralelo').click();
  await expect(page.getByText('rascunho gravado: style.design-draft.css')).toBeVisible();
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('Escape');

  await page.evaluate(async () => {
    window.__proj = await (await navigator.storage.getDirectory()).getDirectoryHandle('export', { create: true });
  });
  await page.getByText('Ações ▾').click();
  await page.getByText('Exportar versões completas…').click();
  await expect(page.getByText(/layers-export\.log \(\d+ gravação/)).toBeVisible();

  const log = await readOpfs(page, 'export', 'layers-export.log');
  const draft = await readOpfs(page, 'proj', 'style.design-draft.css');
  expect(log).toMatch(/sha256 [0-9a-f]{64} -> [0-9a-f]{64}/);
  expect(log).toContain('-> ' + sha(draft));
});

// Overwrite path: a second draft overwrites the first one, so "before" is non-empty and a .bak is made.
// Approve is not used: it clears the pending changes and exportFull then returns early (index.html:1934).
test('ExportLog_AfterRedraft_BeforeHashMatchesBak', async ({ page }) => {
  await connect(page);
  await page.locator('[data-node-id][title^=".card"]').first().click();
  for (const value of [SHADOW, SHADOW_2]) {
    await field(page).click({ clickCount: 3 });
    await page.keyboard.type(value);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    await page.getByText('Ações ▾').click();
    await page.getByText('Aplicar nos arquivos…').click();
    await page.getByText('1 · Gerar rascunho paralelo').click();
    await expect(page.getByText('rascunho gravado: style.design-draft.css').last()).toBeVisible();
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('Escape');
  }

  await page.evaluate(async () => {
    window.__proj = await (await navigator.storage.getDirectory()).getDirectoryHandle('export', { create: true });
  });
  await page.getByText('Ações ▾').click();
  await page.getByText('Exportar versões completas…').click();
  await expect(page.getByText(/layers-export\.log \(\d+ gravação/)).toBeVisible();

  const log = await readOpfs(page, 'export', 'layers-export.log');
  const bak = await readOpfs(page, 'proj', 'style.design-draft.css.bak');
  const draft = await readOpfs(page, 'proj', 'style.design-draft.css');
  expect(log).toContain('sha256 ' + sha(bak) + ' -> ' + sha(draft) + '  .bak guardado');
});
```

Add next to `SHADOW`: `const SHADOW_2 = '0 0 0 4px rgb(4, 5, 6)';` and `const sha = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/write-log-hash.spec.js`
Expected: both tests FAIL on the hash assertions (log has no hash yet). If one fails earlier, fix the driving steps only: `.card` row title (`title^=`), the edit field (open the scope prompt with `Só este` if it appears), or a modal left open (Escape). If `ensureWrite` refuses on the OPFS handle, stub `queryPermission` to return `'granted'` in `addInitScript`.

- [ ] **Step 3: Write minimal implementation**

`index.html:1843` — replace the line (single match on `this.writeLog = (this.writeLog || []).concat(`). The digest runs after the write and the mtime refresh (`:1842`), so the mtime-check→write window stays as narrow as today, and a digest failure only blanks the hash fields (`-`; `contentHash` catches it and keeps the byte counts), never blocks or aborts a write (a thrown `writeText` would be swallowed by `rollback`'s `catch (e) {}` at `:1915`, which then resets state as if it had worked):

```js
    const [a, b] = await Promise.all([LayersCore.contentHash(before), LayersCore.contentHash(text)]);
    this.writeLog = (this.writeLog || []).concat({ path, at: new Date().toISOString(), from: a.bytes, to: b.bytes, fromHash: a.sha256, toHash: b.sha256, bak: !!this.baks[path] });
```

`index.html:1942` — replace the comment:

```js
    // F:70 — what this session wrote: path, when, size before/after, SHA-256 before/after (format v2)
```

`index.html:1943` — in the same line, replace only the `writeInto` content argument:

old: `this.writeLog.map(w => [w.at, w.path, w.from + ' -> ' + w.to + ' bytes', w.bak ? '.bak guardado' : ''].filter(Boolean).join('  ')).join('\n') + '\n'`

new: `LayersCore.writeLogText(this.writeLog)`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx playwright test e2e/write-log-hash.spec.js e2e/stale-banner.spec.js` — Expected: PASS.
Then: `npm test` — Expected: PASS.

- [ ] **Step 5: Manual check**

Run `npm run dev`, connect a real folder, make one edit, `1 · Gerar rascunho paralelo`, then `Exportar versões completas…`. Expected: `layers-export.log` starts with `# layers-export.log v2`; `Get-FileHash -Algorithm SHA256 <draft>` (lower-cased) equals the `after` hash; DevTools → Network: no request outside `localhost:5180`.

- [ ] **Step 6: Commit**

```bash
git add index.html e2e/write-log-hash.spec.js
git commit -m "feat(io): log SHA-256 before and after each write in layers-export.log (S6.2)"
```

- [ ] **Step 7: Deduplicate `connect` on rebase over S5.6**

The local `connect()` is a third copy of the `e2e/stale-banner.spec.js` helper. Merge order is S2.19, S5.6, then S6.2: on rebase over S5.6, if `e2e/folder-helpers.js` exists, import `connect` from it, delete the local copy, re-run `npx playwright test e2e/write-log-hash.spec.js` (PASS) and commit `test(e2e): reuse folder-helpers connect (S6.2)`. If S5.6 has not merged yet, keep the local copy and note it in the PR body.

---

### Task 3: Docs and changelog

**Files:**
- Modify: `docs/RELEASE-CHECKLIST.md:74` (F item), `docs/ARCHITECTURE.md:185-190` (§ Guarda de conflito na gravação)
- Create: `changelog.d/feature-261014-0-s6-2-write-log-hash.md`
- Not touched: the counter on `docs/RELEASE-CHECKLIST.md:8` is left for the integration task, which recounts it once after the parallel leaves merge.

**Interfaces:**
- Produces: docs consistent with the feature; the S6.2 roadmap row closes later in `phase-close-gate`, not in this plan (same as S2.15).

- [ ] **Step 1: Close the checklist item**

Replace `docs/RELEASE-CHECKLIST.md:74` with:

```md
- [x] Log de gravações: `layers-export.log` sai na exportação com cabeçalho de versão (`v2`), caminho, timestamp, tamanho antes/depois em bytes UTF-8, SHA-256 do conteúdo antes e depois e se houve `.bak` (`LayersCore.contentHash`/`writeLogText`; `e2e/write-log-hash.spec.js`).
```

- [ ] **Step 2: Update the architecture note**

In `docs/ARCHITECTURE.md`, append to the paragraph of § Guarda de conflito na gravação (after `grava via \`.tmp\` + \`move\`.`):

```md
Depois de gravar, cada gravação entra em `this.writeLog` com tamanho em bytes UTF-8 e SHA-256 (`LayersCore.contentHash`)
do conteúdo antes e depois; se o digest falhar, só os hashes saem como `-` (os tamanhos ficam) e a gravação segue. `exportFull` grava o registro
como `layers-export.log` no formato v2 (`LayersCore.writeLogText`, cabeçalho `# layers-export.log v2`). O hash "depois"
confere com `sha256sum` do arquivo gravado. O "antes" confere com o `.bak` só na primeira gravação do caminho na sessão com
conteúdo anterior não vazio, e apenas se a gravação do `.bak` teve sucesso. "Antes" e `.bak` são o texto decodificado (`f.text()`)
regravado em UTF-8: BOM e bytes não UTF-8 do original não se preservam.
```

- [ ] **Step 3: Write the changelog fragment**

Create `changelog.d/feature-261014-0-s6-2-write-log-hash.md`:

```md
---
adr: none
---

### Added
- `layers-export.log` registra o SHA-256 do conteúdo antes e depois de cada gravação e ganha cabeçalho de versão (`# layers-export.log v2`). O hash "depois" confere com `sha256sum`/`Get-FileHash` do arquivo gravado. `LayersCore.contentHash` e `LayersCore.writeLogText` (testados).
- `e2e/write-log-hash.spec.js`: rascunho + exportação numa pasta OPFS; o log traz o hash e ele confere com o arquivo; um segundo rascunho mostra o "antes" igual ao hash do `.bak`.

### Fixed
- `layers-export.log`: os tamanhos antes/depois passam a ser bytes UTF-8 (antes eram unidades UTF-16 rotuladas como `bytes`).

### Perf
- estimated — dois `crypto.subtle.digest` SHA-256 por gravação, depois da escrita (caminho frio, um clique); abaixo de 1 ms para uma folha de 200 KB. Memória: dois buffers UTF-8 (antes/depois) e a cópia interna do digest, de vida curta.
```

- [ ] **Step 4: Verify and commit**

Run: `npm test` — Expected: PASS.

```bash
git add docs/RELEASE-CHECKLIST.md docs/ARCHITECTURE.md changelog.d/feature-261014-0-s6-2-write-log-hash.md
git commit -m "docs: close S6.2 with checklist, architecture note and changelog fragment (S6.2)"
```

---

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 1. Core helpers + unit tests | gen | Standard | Workhorse | test authoring, crypto API use |
| 1. Review | review | Architectural | Architect | security-adjacent (audit hash), rule 5 |
| 2. `writeText`/`exportFull` + e2e | gen | Standard | Workhorse | write path, e2e authoring |
| 2. Review | review | Architectural | Architect | security-adjacent write path, rule 5 |
| 3. Docs + changelog | gen | Mechanical | Executor | text given verbatim |
| Pre-merge review | review | Architectural | Architect | verifier ≥ generator (`adversarial-reviewer`) |

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — one checklist item closed by two pure helpers and a two-line wiring change; tracked by roadmap row S6.2 and its PR (same as S2.15).
> Draft, if the user wants one anyway (via `gh-issue-gate`):
> - **Title**: `feat: SHA-256 before/after in layers-export.log (S6.2)`
> - **Labels**: enhancement, security
> - **Milestone**: (none)
> - **Body**: **Context** — checklist F: `layers-export.log` has path, timestamp, sizes and `.bak`, but no hash. **Proposal** — `writeText` records SHA-256 (`crypto.subtle`) of content before and after; `exportFull` writes the log via `LayersCore.writeLogText` with header `# layers-export.log v2`. **Acceptance criteria** — unit tests pin SHA-256 vectors and the v2 line; e2e shows the log hash equals the hash of the written file; checklist F item `[x]`; `npm test` green.

> [!DECISION] phase-intake
> Classification: **meso** `S6.2` under **S6 Segurança**, target **v1 (Unreleased)**.
> Current tree (relevant slice): S6 Segurança (in-progress) › S6.1 Superfície de gravação e ingestão (done) · S6.2 Hash no log de gravação (in-progress).
> Fork of an existing row? **No** (row already tracked).
> - **Option A**: keep meso `S6.2` (recommended)
> - **Option B**: if the user vetoes the scope growth, drop the UTF-8 byte sizes from this leaf (keep `String.length`) and track the "bytes" mislabel as a new micro `S6.2a`

> [!DECISION] execution
> Method: **Native** (recommended: 3 small sequential tasks, Task 2 depends on Task 1; Task 3 still goes to the `executor` subagent; per-task reviews via `adversarial-reviewer`).
