---
title: "S2.19 DC Reserved Codes Cleanup Implementation Plan"
type: plan
solution: Layers
status: draft
created: 2026-10-14
---

# S2.19 DC Reserved Codes Cleanup Implementation Plan

Remove the unused `UTILITY_SHEET` and `READONLY_ORIGIN` entries from `LayersCore.DC_CODES` and the unused `attrNames` field from `mapDcTemplate` in `lib/layers-core.js`, pin the `hoistFaces` warning order with a comment in `index.html`, and update `docs/ARCHITECTURE.md` plus a changelog fragment.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Context

Leftovers recorded by the 2026-09-18 dc writer review (`docs/superpowers/reports/2026-09-18-wnext-checkpoint-mcp-plugin-track.md:47,56`), verified on `develop` @ `8f74cb4`:

- `DC_CODES` (`lib/layers-core.js:859-872`) reserves `UTILITY_SHEET` (:864) and `READONLY_ORIGIN` (:867). No code emits them; `dcWhy` (`index.html:847-860`) has no entry for them. The two refusals they name already exist as toasts: `readOnlyBlock` (`index.html:1439-1444`) and `utilityBlock` (`index.html:1869-1874`), plus the load warning `index.html:1034-1035`. The 2026-09-18 plan kept those toasts on purpose ("existing toasts unchanged"). Only the contract test `test/layers-core.test.js:853-859` (codes at :855-856) and `docs/ARCHITECTURE.md:133,136` mention them.
- `mapDcTemplate` builds `attrNames` per element (`lib/layers-core.js:911,921,938`). The only reader is `test/layers-core.test.js:751-754`; `checkDcMap`, `dcStyleMismatch` and `patchDc` read `tplId`, `tag`, `line`, `styleRange` only. `styleRange` detection uses the local `name`, not the array.
- `hoistFaces` (`index.html:1792-1810`, pushes at :1802/:1804) runs after `buildProjectFromHtml` (`index.html:1277,1280`) since `3e47cdf`. Before that commit it ran right after scoping, so face warnings preceded the data-src, utility-sheet, dc-map and `rules` warnings. The load toast shows only `warn[0]` (`index.html:1313`). The swap is noted in `changelog.d/feature-260918-15-dc-template-writer.md:9`; no test pins the order (`e2e/dead-interactions.spec.js:11` only matches `/aviso\(s\)/`).
- Parallel leaves: S4.5 (scene/Plane), S5.6 (new e2e spec files), S6.2 (`writeText`/`exportFull`), S7.1 (README). This plan edits none of their regions; the guard call sites `index.html:1876,1892,1933` stay as they are (1933 is the guard on the first body line of `exportFull` (:1932)). Merging this leaf first shifts S4.5/S6.2 line anchors by ≤5 (one line added in `index.html`, four removed in `lib/layers-core.js`). Later leaf S5.7 (browser compatibility, read-only Firefox/Safari message) will touch `readOnlyBlock`; under the recommended delete option this plan leaves `readOnlyBlock` untouched.

Reuses: `LayersCore.DC_CODES`, `mapDcTemplate`, existing `DcCodes_EnumCongelado` and `MapDcTemplate` describes in `test/layers-core.test.js`, `bench/alloc.mjs` (`mapDcTemplate/dc-template/index` probe), `docs/bench-methodology.md`.
Out of scope: `HELMET_PLACEHOLDER` (`lib/layers-core.js:865`) is also reserved and never emitted, but the leaf names only two codes; it stays and is flagged for a follow-up. Load warning text at `index.html:1035`, guard call sites, `writeText`/`exportFull`, `docs/architecture-decisions.md` (it describes behavior, not codes).

## Design: Architecture & Flows

Micro view of the touched internals; the recommended options delete dead data and leave every runtime path and user-visible text unchanged.

### Topology (micro)

```
lib/layers-core.js                              index.html
┌──────────────────────────────┐               ┌───────────────────────────────────┐
│ DC_CODES (frozen enum)       │               │ dcWhy(code) ─▶ draft log phrase   │
│  VALUE_HAS_BINDING ...       │── codes ────▶ │  draftDc / makeDraft / notCssCode │
│  UTILITY_SHEET    [DELETE]   │  (never       │                                   │
│  READONLY_ORIGIN  [DELETE]   │   emitted)    │ readOnlyBlock() ─▶ toast (as is)  │
│  HELMET_PLACEHOLDER (kept)   │               │ utilityBlock()  ─▶ toast (as is)  │
└──────────────────────────────┘               └───────────────────────────────────┘
┌──────────────────────────────┐               ┌───────────────────────────────────┐
│ mapDcTemplate(text)          │── entries ──▶ │ checkDcMap   (tplId, tag)         │
│  { tplId, tag, line,         │               │ dcStyleMismatch (styleRange)      │
│    attrNames [DELETE],       │               │ patchDc      (tplId, styleRange)  │
│    styleRange }              │               └───────────────────────────────────┘
└──────────────────────────────┘
```

### Flow: load warnings (order kept, now documented)

```
loadProject
  ├─ useLocalFaces / css read / dcSource checks ── warn.push ──┐
  ├─ buildProjectFromHtml ── remote URL, data-src, utility,    │
  │                          dc map, rules ── warn.push ───────┤  warn[]
  ├─ hoistFaces [COMMENT] ── face 404 / remote face ── push ───┤
  ├─ deadInteractions ── warn.push ────────────────────────────┤
  └─ autoNote ── warn.unshift ─────────────────────────────────┘
toast(... warn.length + ' aviso(s): ' + warn[0])
```

## Decisions

> [!DECISION] reserved-codes
> `UTILITY_SHEET` and `READONLY_ORIGIN` are reserved but never emitted.
> - **Option A — delete (recommended)**: drop both from `DC_CODES`, flip the contract test, reword `docs/ARCHITECTURE.md:133,136`. Zero behavior change; no `index.html` edit (it never referenced them; other codes are string literals there). Leaf title is "Limpar"; the 2026-09-18 plan already chose the toasts. No overlap with S5.7.
> - **Option B — wire**: add `UTILITY_SHEET`/`READONLY_ORIGIN` entries to `dcWhy` whose phrase reproduces the current toast text from `detail` (`{ file }`, `{ what }`), and make `utilityBlock`/`readOnlyBlock` call `this.toast(dcWhy({ code: LayersCore.DC_CODES.X, detail }), 'warn')`; call sites unchanged. Task 1 then only drops "reservado no enum" from the doc and keeps the contract test as is. Verification: new e2e in fixture mode for `READONLY_ORIGIN` (fixture mode has no folder, so `readOnlyBlock` fires); `UTILITY_SHEET` is manual only, because `readOnlyBlock` runs first and e2e cannot connect a folder. Overlaps S5.7 on `readOnlyBlock`.

> [!DECISION] attr-names
> - **Option A — delete (recommended)**: remove the array and the field; one array fewer per template element, measured with `bench/alloc.mjs`.
> - **Option B — keep and wire**: no consumer exists or is planned; any wiring would be speculative. Keeping it means only adding a comment.

> [!DECISION] hoistfaces-order
> Face warnings moved behind the build's warnings in `3e47cdf`; only `warn[0]` reaches the load toast.
> - **Option A — keep current order and document (recommended)**: a write-disabling warning (utility sheet, misaligned dc map) is more actionable than a missing project font, so it should outrank it for `warn[0]`. It does not always win `warn[0]`: other pre-hoist warnings (remote URLs, CSS/`dcSource` reads, data-src, external CSS, unversioned fonts; `index.html:982,995,1010,1030,1062,1065,1273,1275-1276`, vs utility/dc map at :1035,1046) can still precede it, and `autoNote` is unshifted into `warn[0]` (:1293). One-line comment at the call site plus one sentence in `docs/ARCHITECTURE.md` § Loader de projeto. No behavior change.
> - **Option B — restore pre-`3e47cdf` order**: `buildProjectFromHtml` returns `faceWarnAt: warn.length` recorded after scoping (after `index.html:1012`); `loadProject` calls `hoistFaces(built.faces, fw)` with a local `fw = []` and then `warn.splice(built.faceWarnAt, 0, ...fw)`. Verification is manual: no fixture combines a project `@font-face` 404 with a utility-sheet, dc-map or `rules` warning.

## File Structure

| File | Task | Change |
|---|---|---|
| `test/layers-core.test.js` | 1, 2 | contract test asserts absence; `attrNames` test replaced |
| `lib/layers-core.js` | 1, 2 | 2 enum lines removed; 2 lines plus 1 field removed in `mapDcTemplate` |
| `index.html` | 3 | one comment line above `index.html:1280` |
| `docs/ARCHITECTURE.md`, `changelog.d/fix-261014-0-s2-19-dc-reserved-codes.md` | 4 | closing docs |

`docs/RELEASE-CHECKLIST.md` is not touched: no item covers these codes or the warning order, and the counter on its line 8 is never edited here (an integration task recounts it once). The roadmap row closes in `phase-close-gate`, not in this plan.

---

### Task 1: Remove reserved codes from `DC_CODES`

**Files:** Modify `test/layers-core.test.js:853-859`, `lib/layers-core.js:864,867`.

- [ ] **Step 1: Write the failing test.** Replace the `DcCodes_EnumCongelado` test (`test/layers-core.test.js:853-859`) with:

```js
  it('DcCodes_EnumCongelado', () => {
    expect(Object.isFrozen(core.DC_CODES)).toBe(true);
    const codes = ['VALUE_HAS_BINDING', 'MAP_MISALIGNED', 'SOURCE_CHANGED', 'SOURCE_NOT_CSS', 'HELMET_PLACEHOLDER',
      'SNAPSHOT_STYLE', 'TPL_FANOUT', 'NO_INLINE_STYLE', 'PROP_NOT_INLINE', 'VALUE_UNSAFE'];
    expect(Object.keys(core.DC_CODES).sort()).toEqual([...codes].sort());
    for (const c of codes) expect(core.DC_CODES[c]).toBe(c);
  });
```

The sorted-keys equality already proves both removed codes are absent, so no separate absence test is added (it would also break the Step 4 grep).

- [ ] **Step 2: Verify it fails.** Run `npx vitest run test/layers-core.test.js -t DcCodes`. Expected: FAIL only in `DcCodes_EnumCongelado` (keys list has 12 entries).
- [ ] **Step 3: Implement.** In `lib/layers-core.js` delete the lines `    UTILITY_SHEET: 'UTILITY_SHEET',` (:864) and `    READONLY_ORIGIN: 'READONLY_ORIGIN',` (:867). Confirm each anchor matches once before deleting (`grep -c`).
- [ ] **Step 4: Verify.** `grep -rn "UTILITY_SHEET\|READONLY_ORIGIN" lib index.html test bench e2e` returns nothing. `npm test` passes.
- [ ] **Step 5: Commit.** `git add lib/layers-core.js test/layers-core.test.js` then `git commit -m "fix(core): drop unused UTILITY_SHEET and READONLY_ORIGIN from DC_CODES (S2.19)"`.

---

### Task 2: Drop `attrNames` from `mapDcTemplate`

**Files:** Modify `test/layers-core.test.js:751-754`, `lib/layers-core.js:911,921,938`.

- [ ] **Step 1: Baseline alloc.** Run `node --expose-gc --max-semi-space-size=1024 --no-allocation-site-pretenuring bench/alloc.mjs` and record `mapDcTemplate/dc-template/index` (B/op).
- [ ] **Step 2: Write the failing test.** Replace `AttrNames_ListaNomesEmMinusculas` (`test/layers-core.test.js:751-754`) with:

```js
  it('Entrada_SoCamposConsumidos_StyleAindaDetectado', () => {
    const [d] = core.mapDcTemplate(dcSrc('<div CLASS="a" data-X="1" STYLE="a:b"></div>'));
    expect(Object.keys(d).sort()).toEqual(['line', 'styleRange', 'tag', 'tplId']);
    expect(d.styleRange).not.toBeNull();
  });
```

- [ ] **Step 3: Verify it fails.** Run `npx vitest run test/layers-core.test.js -t Entrada_SoCamposConsumidos`. Expected: FAIL (keys include `attrNames`).
- [ ] **Step 4: Implement.** In `lib/layers-core.js` delete `      var attrNames = [];` (:911) and `        attrNames.push(name);` (:921); at :938 the push becomes:

```js
      out.push({ tplId: out.length, tag: tag, line: lineNo, styleRange: styleRange });
```

- [ ] **Step 5: Verify.** `grep -rn attrNames lib index.html test bench` returns nothing. `npm test` passes. Re-run the Step 1 command and record the new B/op for the changelog (Task 4).
- [ ] **Step 6: Commit.** `git add lib/layers-core.js test/layers-core.test.js` then `git commit -m "refactor(core): stop building unused attrNames in mapDcTemplate (S2.19)"`.

---

### Task 3: Pin the `hoistFaces` warning order

**Files:** Modify `index.html:1280` (insert one line above it).

- [ ] **Step 1: Implement.** Confirm `grep -c "await this.hoistFaces(built.faces, warn);" index.html` is `1`. Insert directly above that line, same indentation (4 spaces):

```js
    // face warnings land after the build's (utility sheet, dc map, rules): a write-disabling one outranks a missing project font for warn[0]
```

- [ ] **Step 2: Verify.** `grep -c "a write-disabling one outranks a missing project font for warn\[0\]" index.html` is `1`. `npm test` passes. No e2e run: a comment-only insert cannot change the load toast.
- [ ] **Step 3: Commit.** `git add index.html` then `git commit -m "docs(loader): state the intended hoistFaces warning order (S2.19)"`.

---

### Task 4: Docs and changelog

**Files:** Modify `docs/ARCHITECTURE.md:133,136,149-151`; create `changelog.d/fix-261014-0-s2-19-dc-reserved-codes.md`.

- [ ] **Step 1: Write-layers table.** In `docs/ARCHITECTURE.md` § Camadas de gravação, change the last cell of two rows:

```md
| Regra em `.css` | `arquivo.css\|.classe\|linha` | `patchCssAt` | folha de utilitários recusa por toast (`utilityBlock`) |
| Origem sem pasta gravável | — | nenhuma | toast que nomeia a origem (`readOnlyBlock`) |
```

(:133 and :136; only the parenthesis changes, from `` `UTILITY_SHEET` reservado no enum `` and `` `READONLY_ORIGIN` reservado no enum ``.)
- [ ] **Step 2: Loader note.** In § Loader de projeto, after the sentence ending `monta o resultado no shadow root fora da tela.` (:151), append on the same paragraph:

```md
Os avisos do hoist entram em `warn` depois dos do build (folha de utilitários, mapa dc, `rules`); como o toast de carga mostra só `warn[0]`, um aviso que desabilita gravação ganha de uma fonte do projeto ausente.
```

- [ ] **Step 3: Changelog fragment.** Create `changelog.d/fix-261014-0-s2-19-dc-reserved-codes.md`, replacing `<antes>`/`<depois>` with the Task 2 numbers:

```md
---
adr: none
---

### Removed
- `LayersCore.DC_CODES` perde `UTILITY_SHEET` e `READONLY_ORIGIN`, reservados desde o writer dc e nunca emitidos. As recusas de folha de utilitários e de origem somente leitura seguem pelos toasts de `utilityBlock` e `readOnlyBlock`, com o mesmo texto.
- `mapDcTemplate` não devolve mais `attrNames` por elemento; nenhum código o lia.

### Changed
- A ordem dos avisos de carga passa a ser documentada: os do hoist de `@font-face` vêm depois dos do build (folha de utilitários, mapa dc, `rules`), então um aviso que desabilita gravação ganha de uma fonte do projeto ausente pelo `warn[0]` do toast.

### Perf
- measured — `mapDcTemplate/dc-template/index`: <antes> → <depois> B/op (`bench/alloc.mjs`).
```

If the Task 2 delta is within probe noise (baseline 10.64 KB/op on ~15 tags, `docs/reports/bench-history/bench-history.md:51`; heapUsed-delta median, `bench/alloc.mjs:9-25`), write the `### Perf` bullet instead as:

```md
- measured — `mapDcTemplate/dc-template/index`: sem diferença acima do ruído do probe (<antes> vs <depois> B/op, `bench/alloc.mjs`).
```

- [ ] **Step 4: Verify and commit.** `npm test` passes; `grep -n "reservado no enum" docs/ARCHITECTURE.md` returns nothing. `git add docs/ARCHITECTURE.md changelog.d/fix-261014-0-s2-19-dc-reserved-codes.md` then `git commit -m "docs: close S2.19 with architecture note and changelog fragment (S2.19)"`.

---

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 1, 2 | gen | Standard | Workhorse | test authoring (rule 7 exclusion) plus alloc measurement |
| 3 | gen | Standard | Workhorse | edits `index.html` under the unique-anchor rule |
| 4 | gen | Mechanical | Executor | verbatim text from the plan; caller fills the measured numbers and checks the grep |
| Pre-merge review | review | Architectural | Architect | verifier ≥ generator, via `adversarial-reviewer` |

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — removal of dead enum entries and one unused field plus a comment and docs; no behavior change; tracked by roadmap row S2.19 and the PR (same as S2.15).
> Draft to be created (via `gh-issue-gate`) only if overridden:
> - **Title**: `fix: drop reserved dc codes and unused attrNames, document warning order`
> - **Labels**: enhancement
> - **Milestone**: (none)
> - **Body**: **Context**: the 2026-09-18 dc writer review left `UTILITY_SHEET` and `READONLY_ORIGIN` reserved in `LayersCore.DC_CODES` without any emitter, `mapDcTemplate` building an `attrNames` array nobody reads, and the `hoistFaces` warnings moved behind the build's warnings by `3e47cdf` without a stated intent. **Proposal**: delete the two codes and `attrNames` (tests assert absence), keep the current warning order and document it in code and `docs/ARCHITECTURE.md`. **Acceptance criteria**: `npm test` green; no reference to the removed names in `lib/`, `index.html`, `test/`, `bench/`; `mapDcTemplate` alloc per op not higher than before; load toast and guard toasts unchanged; changelog fragment with a measured `### Perf` bullet.

> [!DECISION] phase-intake
> Classification: **meso** `S2.19` under **S2**, target **Unreleased**.
> Current tree (relevant slice): Unreleased › S2 › S2.19 "Limpar códigos dc reservados e avisos do hoistFaces" (in-progress since this branch).
> Fork of an existing row? **No** — already tracked; no new row, no reorder. `HELMET_PLACEHOLDER` goes to a follow-up note, not a new leaf, unless the reviewer asks for one.
> - **Option A**: keep as meso `S2.19` (recommended)
> - **Option B**: widen S2.19 to include `HELMET_PLACEHOLDER` (one more enum line and test entry)

> [!DECISION] execution
> Method: **Native** (recommended) — four small sequential tasks, Tasks 1-2 share two files; Task 4 still goes to the `executor` subagent.
