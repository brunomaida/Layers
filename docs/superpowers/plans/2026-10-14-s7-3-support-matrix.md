---
title: "S7.3 Support Matrix Implementation Plan"
type: plan
solution: Layers
status: draft
created: 2026-10-14
---

# S7.3 Support Matrix Implementation Plan

Publish the browser support matrix that checklist G asks for. It goes in a new `docs/support-matrix.md` (PT-BR, `type: reference`). Every cell either cites an automated test from the S5.7 evidence or says `não verificado` and names the pending manual step or gap. `README.md` and `docs/TOPOLOGY.md` link to it. A small Vitest guard (`test/support-matrix.test.js`) makes `npm test` fail when the matrix drifts from `e2e/__snapshots__/compat-probes.json`, cites a test that no longer exists, or quotes a refusal message that is no longer in `index.html`. This plan closes checklist G item "Matriz de suporte" and adds `changelog.d/docs-261014-0-s7-3-support-matrix.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (Native, see `[!DECISION] execution`). Steps use checkbox (`- [ ]`) syntax for tracking.

## Context

Checklist G item, verbatim (`docs/RELEASE-CHECKLIST.md:81`): `- [ ] Matriz de suporte: navegadores × funcionalidades (leitura, edição, gravação).` Roadmap row S7.3 (`docs/roadmap.md:69`) has status `registered` and no plan link. Its prerequisite S5.7 is merged on `develop` (`5ae19c8`, tip `aac342f`). S5.7 produced the inputs this leaf consumes. Its plan lists them in § Outputs for S7.3, and they live in these files:

| Input | File |
|---|---|
| Tested versions, date, machine | `docs/superpowers/reports/2026-10-14-s5-7-compat-evidence.md` § 1 |
| Probe matrix (machine-readable) | `e2e/__snapshots__/compat-probes.json` (5 engines × 22 probes) |
| Behavior matrix, one test or manual step per cell | report § 3 |
| Exact refusal messages | report § 4 |
| Cosmetic differences | report § 5 |
| Manual steps M1-M5 and re-run commands | report § 7 |
| Lines to reconcile | report § 8: `README.md:13`, `:36`, `:37`, `docs/TOPOLOGY.md:99` |

Inherited constraint: S5.7 `[!DECISION] version-claims` was resolved as **Option A** (approved). The matrix claims the **tested versions only**: no "Firefox ≥ X" ranges and no versions from memory. Option B (ranges from MDN browser-compat-data, one citation per probed feature) was left for S7.3 to take up. This plan does not take it up (see Non-goals). Re-opening it is listed as an open question in the hand-off, not as a task.

### Facts re-verified on `aac342f` for this plan

| Fact | Evidence |
|---|---|
| Which test runs on which Playwright project | `npx playwright test --list e2e/browser-compat.spec.js e2e/apply-flow.spec.js e2e/write-log-hash.spec.js` → 127 tests in 3 files. `apply-flow` runs on `chromium`, `chrome`, `msedge`. `write-log-hash` runs on `chromium` only, because `playwright.config.js` `WRITE` matches only `browser-compat\|apply-flow`. `browser-compat` runs on all five. The full suite lists 232 tests in 16 files. |
| `Compat_TravalLoad_NoPageErrorNoEgress` also runs on `firefox` and `webkit` | same `--list`. The test has no `test.skip`. Report § 3 cites it only in the Chromium columns, but report § 6 #4 says no page error or egress on any engine. |
| "Exportar versões completas" **is** automated on `chromium` | `e2e/write-log-hash.spec.js` `ExportLog_AfterDraft_HasSha256MatchingDisk` points the stubbed `showDirectoryPicker` at an OPFS `export` folder and asserts `layers-export.log`. Report § 3 marks this cell `não verificado (M1)`, which understates the evidence. The matrix uses `sim · E8` for `chromium` and keeps M1/M2 for `chrome`/`msedge`. |
| Refusal messages are literal strings in `index.html` | `index.html:1199`, `:1207`, `:1387`, `:1400`, `:1444` (fragment `Este navegador não grava em disco — use Chrome ou Edge.`), `:2230`. Report § 4 cites `:1938`, `:2204`, `:1931`, which moved after the S3.2 merge to `:1964`, `:2230`, `:1957`. The matrix quotes text, not line numbers. |
| Toolchain | `docs/LOCAL-SETUP.md` § Toolchain: floor Node 22.22.2+ or 24.15.0+ with npm 12+ (from npm 12's own `engines`); verified on Node 24.19.0 LTS + npm 12.0.2. This machine prints `v24.19.0` / `12.0.2` today. `package.json` has no `engines`. `package-lock.json` pins `@playwright/test` and `playwright` 1.63.0. |
| Manual evidence still pending | report § 7: "Resultados de M1-M5 nesta data: **nenhum executado**". Checklist E line 62 is `[~]` for that reason. |

Pending manual evidence, which the matrix must show as `não verificado`:

| # | Browser | Cells it would prove |
|---|---|---|
| M1 | Chrome 155, real native picker | native folder picker and readwrite prompt, approve on a real folder, reopen after reload, `.zip` open, full export |
| M2 | Edge 155, real native picker | same as M1 |
| M3 | all five (PNG review) | 3D depth, Inter/JetBrains Mono rendering, no overlapping panels |
| M4 | real Safari on macOS | every Safari cell (load, read, edit, simulated diff, draft refusal) |
| M5 | real Firefox stable | every "Firefox estável" cell |

Findings that are out of scope. Record them in the hand-off and do not fix them here:
- `docs/TOPOLOGY.md:101` (`App → rede | Nenhuma`) predates the GitHub loader. S7.1 fixed the same claim in `docs/ARCHITECTURE.md` § Rede but not in TOPOLOGY.
- `docs/RELEASE-CHECKLIST.md:75` says "Requer npm 11+". `docs/LOCAL-SETUP.md` and `README.md` say npm 12+. The matrix follows LOCAL-SETUP because it states where the floor comes from.

Reuses: report §§ 1-8 (transcribed, not re-measured, except the freshness run of Task 5); the fragment shape of `changelog.d/docs-261014-0-s7-1-readme.md`; the root/`readFileSync` style of `test/pre-push.test.js`; the lock/port wrapper from the S5.7 plan § Global Constraints (also in `docs/LOCAL-SETUP.md`); the Task 0 tracker pattern from the S5.7 plan.

### Goal

- One document answers "what works in which browser, and how do we know" for the v1 release: browser engine × capability, tested versions and date, OS, dev toolchain, refusal messages, pending verification.
- Every cell is sourced. Either a test title (with spec file and projects) or `não verificado` plus the reason: a manual step M1-M5 or a gap L1.
- The matrix stays true without a human remembering to update it, at least for the coupling that can be checked cheaply. Details in "How it stays true".

### Non-goals

- No change to `index.html`, `support.js`, `lib/`, `vendor/`, `fonts/`, `playwright.config.js` or any `e2e/` file. Visual frozen.
- No new E2E coverage. The config export/import gap (S5.7 finding #2) and the chrome/msedge export cells stay as recorded (`[!DECISION] coverage-gaps`).
- No version ranges (inherited `version-claims` A). No `engines` field in `package.json`.
- No edit to the S5.7 evidence report. It is a dated record. The matrix states where it deviates from it (export on `chromium`, `TravalLoad` on Gecko/WebKit).
- No `CHANGELOG.md` edit (release only). No edit to `docs/RELEASE-CHECKLIST.md:8` (`Hoje: …`): a dedicated integration step recounts it once.
- No fix for the two out-of-scope findings above.

## Design: Architecture & Flows

### Where the artifact lives

```
README.md ── § Requisitos ── link ──┐        docs/TOPOLOGY.md § Fronteiras (App → disco) ── link ──┐
          └─ § Estrutura (1 line) ──┤                                                              │
                                    ▼                                                              ▼
                         docs/support-matrix.md [NEW, PT-BR, type: reference] ◀──────────────────────┘
                           ├─ Resumo · Versões testadas · Matriz · Evidências (E1-E8)
                           ├─ Verificação pendente (M1-M5) · Lacunas (L1) · Mensagens
                           ├─ Sistema operacional · Ambiente de desenvolvimento
                           └─ links ─▶ S5.7 report (procedures, probe table, cosmetics) · compat-probes.json
                                    ▲
           test/support-matrix.test.js [NEW] reads it + compat-probes.json + e2e/*.spec.js + index.html
                                    │
                               npm test (commit gate) fails on drift
```

> [!DECISION] matrix-location
> The checklist item asks for a matrix of browsers × features. It does not say where.
> - **Option A (recommended)**: `docs/support-matrix.md`, kebab-case, undated, frontmatter `type: reference` (same pattern as `docs/layers-json.md`), indexed under Reference in `docs/_index.md` by the doc hook. The content (7 engine columns, 11 capability rows, evidence/manual/gap/message/OS/toolchain tables) is wider than the README can hold readably. S7.1 `[!DECISION] readme-structure` kept the README a short landing page that links to `docs/` for depth. A dedicated file is also what the guard test parses. The README gets a one-line link.
> - **Option B**: a `## Suporte` section in `README.md`. One fewer file, but the README roughly doubles, citations make the table unreadable on GitHub, and the guard test has to parse the README.

### Matrix dimensions

Columns: the five Playwright projects (their keys in backticks in the header; the guard maps columns to `compat-probes.json` through those keys) plus "Safari" and "Firefox estável", which no test drives.

Rows (capabilities): load, read ×4 sources (fixture, GitHub, local folder, `.zip`), edit in memory, simulated diff, write flow (File System Access), native picker + permission prompt, full export, config export/import, visual (3D, fonts). That covers the checklist's leitura/edição/gravação plus the export and visual cells the S5.7 report tracks.

Cell grammar (enforced in part by the guard): `sim · E<n>`, `recusa · E<n>`, `não verificado · M<n>`, `não verificado · L<n>`.

How each column/row maps to evidence:

```
row \ column        chromium   chrome    msedge    firefox   webkit    Safari   Firefox estável
load                E1         E1        E1        E1        E1        M4       M5
read fixture        E2         E3        E3        E3        E3        M4       M5
read GitHub         E4         E4        E4        E4        E4        M4       M5
read folder         E6         E6        E6        E7 (rec)  E7 (rec)  M4       M5
read .zip           M1         M1        M2        E7 (rec)  E7 (rec)  M4       M5
edit in memory      E5         E5        E5        E5        E5        M4       M5
simulated diff      E5         E5        E5        E5        E5        M4       M5
write flow          E6         E6        E6        E7 (rec)  E7 (rec)  M4       M5   ◀ guard: sim iff showDirectoryPicker
native picker       M1         M1        M2        E7 (rec)  E7 (rec)  M4       M5
full export         E8         M1        M2        E7 (rec)  E7 (rec)  M4       M5
config export/imp.  L1         L1        L1        L1        L1        M4       M5
visual 3D/fonts     M3         M3        M3        M3        M3        M4       M5
```

The `chromium` column keeps M1 for `.zip` and the native picker. M1 runs on Chrome, the same engine. The Playwright Chromium build itself is never driven by hand.

## How it stays true

The matrix can drift in three ways. The guard covers each with a cheap, browser-free check that runs in `npm test`, the commit gate:

| Drift | Example | Check in `test/support-matrix.test.js` |
|---|---|---|
| Probe snapshot changes | someone regenerates `compat-probes.json` after Firefox ships `showDirectoryPicker`, or adds an engine | every key of `compat-probes.json` has exactly one matrix column, and the write-flow row is `sim` iff `showDirectoryPicker` is `true` for that engine, else `recusa` |
| Cited test renamed or removed | `Compat_FixtureEdit_DiffShowsSimulatedPatch` renamed | every backticked test title in the matrix exists in some `e2e/*.spec.js` (`<fixture>` maps to the template literal `${name}`), and at least 9 titles are found, so the check can never pass vacuously |
| Refusal text changes | a toast is reworded | every literal in the Mensagens table is a substring of `index.html` |

Cost: one ~45-line Vitest file. It reads 4 inputs from disk, runs in milliseconds, and needs no browser, server or lock. Precedent for unit-testing a non-JS artifact: `test/pre-push.test.js`. Two things are not guarded. (a) Whether a cited test still **passes**: E2E is a manual gate (no CI), and the matrix records the run date. (b) Which projects run a test: that needs Playwright, so Task 5 checks it once with `--list`. When M1-M5 are done, a human replaces the `não verificado · M<n>` cells. The guard does not force that, by design: the checklist E line 62 tracks it.

> [!DECISION] matrix-guard
> - **Option A (recommended)**: add `test/support-matrix.test.js` as above (Task 2). It is cheap, it runs on every commit, and it turns the three silent drifts into a failing commit gate.
> - **Option B**: no test. Re-read the matrix by hand at each release (`release-1-checklist`). Zero code, but a regenerated probe snapshot or a renamed test leaves the matrix lying until someone notices.

> [!DECISION] coverage-gaps
> Two cells are `não verificado` only because no test runs there. Neither needs a manual step.
> - **Option A (recommended)**: keep S7.3 docs + guard only. L1 (config export/import, S5.7 finding #2) and the chrome/msedge full-export cells stay recorded, as a candidate follow-up leaf.
> - **Option B**: also add `write-log-hash` to the `WRITE` regex in `playwright.config.js` (one line). `chrome`/`msedge` full export become `sim · E8`. This needs an E2E run on the installed channels under the lock wrapper, and it touches a file this plan otherwise leaves alone.
> - **Option C**: B plus a refusal test for config export/import on `firefox`/`webkit` (closes L1 for those columns). This is test authoring in `e2e/browser-compat.spec.js`. It is its own leaf in all but name.

> [!DECISION] checklist-g-state
> - **Option A (recommended)**: mark G line 81 `[x]`. The artifact the item asks for exists, every cell is sourced, and the pending manual evidence is visible in the matrix and tracked by E line 62 (`[~]`).
> - **Option B**: mark it `[~]` until M1/M2 run. This double-counts the same pending work in two checklist sections.

## File Structure

| File | Change |
|---|---|
| `docs/roadmap.md`, `docs/roadmap.data.json` | S7.3 row: plan link, `in-progress` (Task 0); `.data.json` rebuilt by the `roadmap` skill, never by hand |
| `docs/support-matrix.md` | new, PT-BR (Task 1) |
| `docs/_index.md` | regenerated by the doc hook (Task 1), never hand-edited |
| `test/support-matrix.test.js` | new guard (Task 2) |
| `README.md` | § Requisitos line 13, § Estrutura one new line (Task 3) |
| `docs/TOPOLOGY.md` | line 99 only (Task 3) |
| `docs/RELEASE-CHECKLIST.md` | line 81 only; line 8 untouched (Task 4) |
| `changelog.d/docs-261014-0-s7-3-support-matrix.md` | new fragment (Task 4) |

## Global Constraints

- Leaf branch `docs/261014-0-s7-3-support-matrix` (stem = this plan's `s7-3-support-matrix`), from an up-to-date `develop`. Never commit on `develop` or `master`. Task 0 is the first commit, then the plan commit is cherry-picked (Task 0 Step 4).
- `index.html` is not modified. Visual frozen. `support.js` is never edited.
- Docs prose PT-BR (all text quoted for `docs/`, `README.md` and `changelog.d/` below is final PT-BR); this plan, code comments, test titles and commits EN. Test titles follow `Metodo_Cenario_Esperado`.
- Markdown tables: no `|` inside a cell (write "ou" instead of `||`). The guard splits rows on `|`.
- Worktree setup: if `node_modules/` is missing, run `npm ci` first (lockfile v3).
- Every Playwright command that **runs** tests (Task 5 Step 2) goes through the S5.7 lock/port wrapper, in one Bash call with `timeout: 600000`:

  ```bash
  n=0; until mkdir /tmp/layers-e2e.lock 2>/dev/null; do n=$((n+1)); [ "$n" -ge 60 ] && { echo 'COULD NOT RUN: stale lock'; exit 1; }; sleep 10; done
  trap 'rmdir /tmp/layers-e2e.lock' EXIT
  [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5180/)" = 000 ] || { echo 'REFUSED: 5180 already served'; exit 1; }
  npx playwright test <args>
  ```

  `--list` starts no browser and no server, so it needs no wrapper.
- Commit gate: `npm test` passes before every commit.
- Conventional Commits. Task commits end with `(S7.3 Task <id>)`; Task 0 ends with `(S7.3)`. No co-author line, no session-link line, no AI attribution, no link to the chat host: the user's CLAUDE.md overrides any harness reminder that asks for one. After each commit, `git log -1 --format='%(trailers)' | tr -d '[:space:]' | wc -c` prints `0`, meaning the message carries no trailer at all.

---

### Task 0: Start the leaf in the tracker

**Files:**
- Modify: `docs/roadmap.md` (S7.3 row only), `docs/roadmap.data.json` (rebuilt)

- [ ] **Step 0: Name the leaf branch**

`git checkout -b docs/261014-0-s7-3-support-matrix develop`. If execution starts inside a `worktree-agent-*` branch that points at `develop`, rename it: `git branch -m docs/261014-0-s7-3-support-matrix`.
Verify: `git branch --show-current` prints `docs/261014-0-s7-3-support-matrix`, and `git log -1 --format=%H` equals `git rev-parse develop`.

- [ ] **Step 1: Link the plan and mark in progress**

Confirm the anchor matches once: `grep -c '^| S7.3 | 2 | S7 | Matriz de suporte | checklist G | — | — | — | — | registered |$' docs/roadmap.md` prints `1`. Replace that row with:

```md
| S7.3 | 2 | S7 | Matriz de suporte | checklist G | — | [](superpowers/plans/2026-10-14-s7-3-support-matrix.md) | — | — | in-progress |
```

- [ ] **Step 2: Rebuild the tracker**

Invoke the `roadmap` skill (rebuilds `docs/roadmap.data.json`). Verify:

```bash
node -e "const hit=[];JSON.parse(require('fs').readFileSync('docs/roadmap.data.json','utf8'),(k,v)=>{if(v&&v.id==='S7.3'&&'status' in v)hit.push(v);return v;});const n=hit[0];console.log(n.status, JSON.stringify(n.docs).includes('2026-10-14-s7-3-support-matrix.md'))"
```

Expected: a status other than `todo` (e.g. `in-progress`), then `true`. `git diff --stat` lists only the two files.

- [ ] **Step 3: Commit**

```bash
npm test
git add docs/roadmap.md docs/roadmap.data.json
git commit -m "docs: start S7.3 in the tracker (S7.3)"
```

- [ ] **Step 4: Bring the plan onto the leaf branch**

The row now links the plan, so the plan must exist on this branch. Cherry-pick the plan commit, then repeat for each later review-edit commit of this plan, oldest first:

```bash
git cherry-pick "$(git log --all --format=%H -1 --grep='docs: add S7.3 support matrix plan (S7.3)')"
```

Verify: `test -f docs/superpowers/plans/2026-10-14-s7-3-support-matrix.md && git log --oneline -2` shows the plan commit above the tracker commit.

---

### Task 1: Write docs/support-matrix.md

**Files:**
- Create: `docs/support-matrix.md`
- Modify (hook-generated): `docs/_index.md`

- [ ] **Step 1: Re-check the transcribed facts**

Every count must be `1` or more. If any is `0`, stop: the matrix would cite something that no longer exists.

```bash
for t in Compat_TravalLoad_NoPageErrorNoEgress Compat_FixtureEdit_DiffShowsSimulatedPatch Compat_NoFsAccess_WriteEntryPointsNameTheBrowser Compat_GithubRepoMocked_LoadsReadOnlyAndRefusesWrite Compat_Probes_ReadPathEverywhereWriteTierAllOrNothing; do echo "$t $(grep -c "$t" e2e/browser-compat.spec.js)"; done
for t in Apply_CardShadowOnConnectedFolder_RewritesOnlyTheRuleWithBakAndHistory Rollback_AfterApply_RestoresOriginalFile Rollback_FileChangedOutside_RefusesAndKeepsFile; do echo "$t $(grep -c "$t" e2e/apply-flow.spec.js)"; done
echo "ExportLog $(grep -c 'ExportLog_AfterDraft_HasSha256MatchingDisk' e2e/write-log-hash.spec.js)"
echo "tree $(grep -c 'Tree_${name}_MatchesSnapshot' e2e/tree-snapshot.spec.js) compat-tree $(grep -c 'Compat_${name}_TreeMatchesChromiumSnapshot' e2e/browser-compat.spec.js)"
node -e "const p=require('./e2e/__snapshots__/compat-probes.json');for(const k of Object.keys(p).sort())console.log(k,p[k].showDirectoryPicker)"
```

Expected last block: `chrome true`, `chromium true`, `firefox false`, `msedge true`, `webkit false`.

- [ ] **Step 2: Create the file**

Set `created` to the execution date (`date +%F`). Write verbatim:

````md
---
title: "LAYERS — Matriz de suporte"
type: reference
solution: Layers
created: 2026-10-14
---

# LAYERS — Matriz de suporte

O que funciona em cada navegador e qual teste prova cada célula. Vale só para as versões testadas abaixo: faixas de versão não são afirmadas (decisão `version-claims` A do [plano da S5.7](superpowers/plans/2026-10-14-s5-7-browser-compat.md)). Procedimentos, sondas completas e diferenças cosméticas estão no [relatório de evidência da S5.7](superpowers/reports/2026-10-14-s5-7-compat-evidence.md); requisitos e como rodar, no [README](../README.md).

## Resumo

- **Chrome e Edge:** leitura, edição e gravação. A gravação é testada com o seletor de pasta simulado (pasta no OPFS); o seletor nativo e o prompt de permissão aguardam a verificação manual M1 e M2.
- **Firefox e Safari:** somente leitura (fixture e repositório GitHub público), edição em memória e diff simulado. Toda entrada de gravação recusa com uma mensagem que indica Chrome ou Edge. Provado nos builds do Playwright (Firefox 155.0, WebKit 26.6); Firefox estável e Safari real não verificados (M5, M4).
- O app decide por detecção de recurso (`window.showDirectoryPicker`), nunca por user-agent. Um navegador que ganhe a File System Access API passa a gravar sem mudança no app, mas só entra nesta matriz depois de testado.

## Versões testadas

Data: 2026-10-14. Sistema: Windows 11 (i7-12700). Playwright 1.63.0. Fonte: linhas `[compat]` do relatório da S5.7, § 1.

| Coluna | Projeto Playwright | Motor | Versão | Origem |
|---|---|---|---|---|
| Chromium | `chromium` | Chromium | 153.0.8010.12 | build do Playwright (rev 1243); roda a suíte E2E inteira |
| Chrome | `chrome` | Chromium | 155.0.8059.41 | Chrome instalado (`channel: 'chrome'`) |
| Edge | `msedge` | Chromium | 155.0.4283.45 | Edge instalado (`channel: 'msedge'`) |
| Firefox (build) | `firefox` | Gecko | 155.0 | build do Playwright (rev 1543), não é o Firefox estável |
| WebKit (build) | `webkit` | WebKit | 26.6 | build do Playwright (rev 2359) para Windows: aproxima o Safari, não é o Safari |
| Safari | — | WebKit | — | não testado: exige macOS (M4) |
| Firefox estável | — | Gecko | — | não testado: não instalado na máquina de referência (M5) |

Chrome e Edge se atualizam sozinhos: a versão acima é a da execução, não um piso.

## Matriz

Legenda: `sim · E<n>` = coberto pelo teste automatizado E<n> (ver Evidências); `recusa · E<n>` = a entrada existe e recusa com mensagem que indica Chrome ou Edge, provado por E<n>; `não verificado · M<n>` = sem evidência, o passo manual M<n> a fornece; `não verificado · L<n>` = sem teste e sem passo manual (ver Lacunas).

| Capacidade | Chromium (`chromium`) | Chrome (`chrome`) | Edge (`msedge`) | Firefox build (`firefox`) | WebKit build (`webkit`) | Safari | Firefox estável |
|---|---|---|---|---|---|---|---|
| Carregar sem erro de página nem requisição externa | sim · E1 | sim · E1 | sim · E1 | sim · E1 | sim · E1 | não verificado · M4 | não verificado · M5 |
| Leitura: fixture HTTP (`?layers=`) | sim · E2 | sim · E3 | sim · E3 | sim · E3 | sim · E3 | não verificado · M4 | não verificado · M5 |
| Leitura: repositório GitHub público | sim · E4 | sim · E4 | sim · E4 | sim · E4 | sim · E4 | não verificado · M4 | não verificado · M5 |
| Leitura: pasta local | sim · E6 | sim · E6 | sim · E6 | recusa · E7 | recusa · E7 | não verificado · M4 | não verificado · M5 |
| Leitura: arquivo `.zip` | não verificado · M1 | não verificado · M1 | não verificado · M2 | recusa · E7 | recusa · E7 | não verificado · M4 | não verificado · M5 |
| Edição em memória | sim · E5 | sim · E5 | sim · E5 | sim · E5 | sim · E5 | não verificado · M4 | não verificado · M5 |
| Diff simulado | sim · E5 | sim · E5 | sim · E5 | sim · E5 | sim · E5 | não verificado · M4 | não verificado · M5 |
| Gravação: rascunho, aprovar, rollback | sim · E6 | sim · E6 | sim · E6 | recusa · E7 | recusa · E7 | não verificado · M4 | não verificado · M5 |
| Gravação: seletor nativo e prompt de permissão | não verificado · M1 | não verificado · M1 | não verificado · M2 | recusa · E7 | recusa · E7 | não verificado · M4 | não verificado · M5 |
| Exportar versões completas | sim · E8 | não verificado · M1 | não verificado · M2 | recusa · E7 | recusa · E7 | não verificado · M4 | não verificado · M5 |
| Exportar/importar configuração | não verificado · L1 | não verificado · L1 | não verificado · L1 | não verificado · L1 | não verificado · L1 | não verificado · M4 | não verificado · M5 |
| Visual: profundidade 3D e fontes | não verificado · M3 | não verificado · M3 | não verificado · M3 | não verificado · M3 | não verificado · M3 | não verificado · M4 | não verificado · M5 |

A coluna Chromium usa M1 para `.zip` e seletor nativo: o M1 roda no Chrome, mesmo motor; o build do Playwright não é usado à mão.

## Evidências

Todas as execuções em 2026-10-14, nas versões acima.

| Id | Teste | Spec | Projetos |
|---|---|---|---|
| E1 | `Compat_TravalLoad_NoPageErrorNoEgress` | `e2e/browser-compat.spec.js` | os cinco |
| E2 | `Tree_<fixture>_MatchesSnapshot` (16 fixtures) | `e2e/tree-snapshot.spec.js` | `chromium` |
| E3 | `Compat_<fixture>_TreeMatchesChromiumSnapshot` (16 fixtures, mesma árvore do Chromium) | `e2e/browser-compat.spec.js` | `chrome`, `msedge`, `firefox`, `webkit` |
| E4 | `Compat_GithubRepoMocked_LoadsReadOnlyAndRefusesWrite` (GitHub simulado por `page.route`: nenhuma requisição real sai) | `e2e/browser-compat.spec.js` | os cinco |
| E5 | `Compat_FixtureEdit_DiffShowsSimulatedPatch` | `e2e/browser-compat.spec.js` | os cinco |
| E6 | `Apply_CardShadowOnConnectedFolder_RewritesOnlyTheRuleWithBakAndHistory`, `Rollback_AfterApply_RestoresOriginalFile`, `Rollback_FileChangedOutside_RefusesAndKeepsFile` (pasta no OPFS entregue por `showDirectoryPicker` simulado) | `e2e/apply-flow.spec.js` | `chromium`, `chrome`, `msedge` |
| E7 | `Compat_NoFsAccess_WriteEntryPointsNameTheBrowser` (conectar pasta, abrir `.zip`, rascunho e exportação recusam; aprovar e rollback são inalcançáveis sem pasta) | `e2e/browser-compat.spec.js` | `firefox`, `webkit` (pulado onde há File System Access) |
| E8 | `ExportLog_AfterDraft_HasSha256MatchingDisk` (destino da exportação no OPFS, seletor simulado) | `e2e/write-log-hash.spec.js` | `chromium` |

Sondas de API por motor: `Compat_Probes_ReadPathEverywhereWriteTierAllOrNothing` contra `e2e/__snapshots__/compat-probes.json` (tabela legível no relatório, § 2). O corte entre os motores é exatamente a File System Access API: seletores de pasta, de arquivo e de gravação, e permissões de handle.

## Verificação pendente

Nenhum passo manual foi executado até 2026-10-14. Procedimento de cada um no relatório da S5.7, § 7.

| Id | Navegador | O que falta provar |
|---|---|---|
| M1 | Chrome 155 instalado | seletor nativo e prompt `readwrite`, aprovar numa pasta real, reabrir após reload, exportação completa, abrir `.zip` |
| M2 | Edge 155 instalado | igual ao M1 |
| M3 | os cinco (PNGs de `Compat_TravalOrbit_ScreenshotsForManualReview`) | profundidade 3D após orbitar, Inter e JetBrains Mono renderizadas, painéis sem sobreposição |
| M4 | Safari no macOS | carregar, editar, ver o diff simulado e a recusa do rascunho |
| M5 | Firefox estável | igual ao M4 |

## Lacunas

| Id | Capacidade | Por que não verificado |
|---|---|---|
| L1 | Exportar/importar configuração (`layers-config.json`) | Nenhum teste em nenhum motor. A recusa sem File System Access existe no código (ver Mensagens), mas nenhum teste a exercita. Achado 2 do relatório da S5.7, candidato a folha própria. |

## Mensagens

Texto exibido quando falta a File System Access API (trecho literal do `index.html`).

| Entrada | Texto |
|---|---|
| Conectar pasta local… | `File System Access API indisponível — use Chrome ou Edge. Os ajustes seguem em modo simulado.` |
| Abrir arquivo .zip… | `Abrir .zip usa a File System Access API — abra no Chrome ou Edge.` |
| Gerar rascunho, Aprovar, Exportar versões completas | `Este navegador não grava em disco — use Chrome ou Edge.` |
| Exportar configuração | `Exportar configuração usa a File System Access API — abra no Chrome ou Edge.` |
| Importar configuração | `Importar configuração usa a File System Access API — abra no Chrome ou Edge.` |
| Palco vazio | `Este navegador não tem a File System Access API — use Chrome ou Edge para conectar uma pasta.` |

## Sistema operacional

| Sistema | Estado | Fonte |
|---|---|---|
| Windows 11 | verificado: todas as execuções automatizadas | relatório da S5.7, § 1 |
| macOS | não verificado · M4 | sem Mac na máquina de referência |
| Linux | não verificado | nenhuma execução registrada |

## Ambiente de desenvolvimento

Só para servir e testar; o app em si roda no navegador.

| Item | Estado | Fonte |
|---|---|---|
| Node 24.19.0 LTS + npm 12.0.2 | verificado | [LOCAL-SETUP.md](LOCAL-SETUP.md) § Toolchain (install limpo, `npm audit` sem vulnerabilidades, app sem erro de console); `npm test` verde nesta matriz |
| Node 22.22.2+ ou 24.15.0+ com npm 12+ | requisito; versões-piso não verificadas | o piso vem do `engines` do próprio npm 12 ([LOCAL-SETUP.md](LOCAL-SETUP.md) § Toolchain); `package.json` não declara `engines` |
| npm 10.9.2 | não suportado | falha conhecida no `npm install` ([LOCAL-SETUP.md](LOCAL-SETUP.md), problemas comuns) |
| Playwright 1.63.0 (E2E) | verificado | `package-lock.json`; precisa do Chrome e do Edge instalados e de `npx playwright install firefox webkit` |

## Como manter

- `npm test` falha em `test/support-matrix.test.js` quando esta matriz diverge de `e2e/__snapshots__/compat-probes.json` (uma coluna por motor; a linha "Gravação: rascunho, aprovar, rollback" é `sim` só onde há `showDirectoryPicker`), cita um teste que não existe em `e2e/` ou cita uma mensagem ausente do `index.html`.
- Ao concluir um passo M1-M5, troque as células `não verificado · M<n>` pela evidência e registre a data aqui e no relatório.
- Navegador atualizado: rode de novo `e2e/browser-compat.spec.js` (comandos no relatório, § 7) e atualize Versões testadas.
````

- [ ] **Step 3: Check the index and the links**

The doc hook regenerates `docs/_index.md` on write. Run:

```bash
grep -c 'support-matrix.md' docs/_index.md            # expect 1
head -6 docs/support-matrix.md                         # frontmatter as written (hook may add fields; keep them)
for f in superpowers/plans/2026-10-14-s5-7-browser-compat.md superpowers/reports/2026-10-14-s5-7-compat-evidence.md ../README.md LOCAL-SETUP.md; do test -e "docs/$f" && echo "ok $f" || echo "MISSING $f"; done
grep -c '||' docs/support-matrix.md                    # expect 0
```

If `_index.md` lacks the entry (hook not active in this session), run `python ~/.claude/scripts/retrofit_docs.py .`. Stage only `docs/_index.md` and `docs/support-matrix.md`, and revert any other file it touched (`git checkout -- <file>`).

- [ ] **Step 4: Commit**

```bash
npm test
git add docs/support-matrix.md docs/_index.md
git commit -m "docs: add the browser support matrix (S7.3 Task 1)"
```

---

### Task 2: Guard the matrix with a unit test

Depends on `[!DECISION] matrix-guard` = A. With B, skip this task and remove the "Como manter" first bullet in Task 1.

**Files:**
- Create: `test/support-matrix.test.js`

- [ ] **Step 1: Write the test**

```js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// S7.3: docs/support-matrix.md must agree with the probe snapshot, the e2e titles and index.html
const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const md = read('docs/support-matrix.md');
const probes = JSON.parse(read('e2e/__snapshots__/compat-probes.json'));
const specs = fs.readdirSync(path.join(root, 'e2e')).filter((f) => f.endsWith('.spec.js')).map((f) => read(`e2e/${f}`)).join('\n');

const section = (title) => md.split(/^## /m).find((s) => s.startsWith(title + '\n')) || '';
const rows = (title) => section(title).split('\n').filter((l) => l.startsWith('|')).map((l) => l.slice(1, -1).split('|').map((c) => c.trim()));

describe('support matrix', () => {
  const [head = [], , ...body] = rows('Matriz');
  // Playwright project key per column, from the backticked name in the header; undefined for untested columns
  const cols = head.map((h) => (h.match(/`(\w+)`/) || [])[1]);

  it('SupportMatrix_ProbeSnapshot_EveryEngineHasOneColumn', () => {
    expect(cols.filter(Boolean).sort()).toEqual(Object.keys(probes).sort());
  });

  it('SupportMatrix_WriteRow_MatchesFolderPickerProbe', () => {
    const row = body.find((r) => r[0].startsWith('Gravação: rascunho'));
    expect(row, 'write-flow row').toBeDefined();
    cols.forEach((k, i) => {
      if (!k) return;
      const want = probes[k].showDirectoryPicker ? 'sim' : 'recusa';
      expect(row[i].startsWith(want), `${k}: "${row[i]}"`).toBe(true);
    });
  });

  it('SupportMatrix_CitedTests_ExistInE2eSpecs', () => {
    const titles = [...new Set([...md.matchAll(/`([A-Z][A-Za-z0-9]*_[A-Za-z0-9<>]+_[A-Za-z0-9]+)`/g)].map((m) => m[1]))];
    expect(titles.length).toBeGreaterThanOrEqual(9);
    for (const t of titles) expect(specs.includes(t.replace('<fixture>', '${name}')), t).toBe(true);
  });

  it('SupportMatrix_RefusalMessages_ExistInIndexHtml', () => {
    const html = read('index.html');
    const msgs = rows('Mensagens').slice(2).map((r) => r[1].replace(/^`|`$/g, ''));
    expect(msgs.length).toBeGreaterThanOrEqual(5);
    for (const m of msgs) expect(html.includes(m), m).toBe(true);
  });
});
```

- [ ] **Step 2: Run it green**

Run: `npx vitest run test/support-matrix.test.js`
Expected: `4 passed`. Then `npm test`: all files pass.

- [ ] **Step 3: Prove each check bites (no commit)**

Run each mutation on its own, confirm that exactly the named test fails, then restore. The comment above each command names the test that must fail:

```bash
# M-a, write cell lies (Firefox write cell becomes sim) -> SupportMatrix_WriteRow_MatchesFolderPickerProbe
sed -i 's/^| Gravação: rascunho, aprovar, rollback | sim · E6 | sim · E6 | sim · E6 | recusa · E7/| Gravação: rascunho, aprovar, rollback | sim · E6 | sim · E6 | sim · E6 | sim · E7/' docs/support-matrix.md
# M-b, cited test renamed -> SupportMatrix_CitedTests_ExistInE2eSpecs
sed -i 's/Compat_FixtureEdit_DiffShowsSimulatedPatch/Compat_FixtureEdit_Renamed/' docs/support-matrix.md
# M-c, toast reworded -> SupportMatrix_RefusalMessages_ExistInIndexHtml
sed -i 's/Abrir .zip usa a File System/Abrir .zip exige a File System/' docs/support-matrix.md
# M-d, engine column lost its project key -> SupportMatrix_ProbeSnapshot_EveryEngineHasOneColumn
sed -i 's/ (`webkit`)//' docs/support-matrix.md
```

After each one: `npx vitest run test/support-matrix.test.js` reports exactly the named test as failed, then `git checkout -- docs/support-matrix.md`. Finally, `npx vitest run test/support-matrix.test.js` reports `4 passed` and `git status --short` shows only `?? test/support-matrix.test.js`.

- [ ] **Step 4: Commit**

```bash
npm test
git add test/support-matrix.test.js
git commit -m "test: guard the support matrix against probes, e2e titles and messages (S7.3 Task 2)"
```

---

### Task 3: Link the matrix from README and TOPOLOGY

`README.md:36` and `:37` ("Conectar pasta local… (Chrome/Edge)", "Abrir arquivo .zip… (Chrome/Edge)") already agree with the matrix: those entries refuse on `firefox`/`webkit` (E7). They stay unchanged. Only line 13 needs the qualifier and the link.

**Files:**
- Modify: `README.md` (line 13; one line added to § Estrutura)
- Modify: `docs/TOPOLOGY.md` (line 99 only)

Executor contract (paste into the prompt):
- Apply Steps 1-3 exactly. Edit only the three anchors. Do not commit.
- Output format, nothing else: one line `anchor <n> <count>` per Step 1 check, then `edited <file>` per file changed, then the raw output of Step 3 preceded by `exit_code <n>`.
- Refusal tokens: `NOT FOUND` (an anchor count is `0`), `AMBIGUOUS` (an anchor count is more than `1`), `COULD NOT RUN` (a command fails to start), each followed by the raw `exit_code`.
- Controller acceptance: all anchor counts `1`; Step 3 diff stat `README.md | 3 ++-` and `docs/TOPOLOGY.md | 2 +-`; the three new-text greps print `1`. Any deviation, or a missing `exit_code`: redo the task at the Workhorse. Never re-dispatch the executor.

- [ ] **Step 1: Confirm the anchors are unique**

```bash
echo "anchor 1 $(grep -c '^- Chrome ou Edge (File System Access API). Firefox/Safari: somente leitura.$' README.md)"
echo "anchor 2 $(grep -c '^- docs/layers-json.md — contrato do layers.json e das origens$' README.md)"
echo "anchor 3 $(grep -c '| Chrome/Edge apenas |$' docs/TOPOLOGY.md)"
```

Expected: `1` each.

- [ ] **Step 2: Apply the edits**

`README.md` line 13: replace `- Chrome ou Edge (File System Access API). Firefox/Safari: somente leitura.` with:

```md
- Chrome ou Edge (File System Access API). Firefox/Safari: somente leitura, testados nos builds do Playwright; Safari real e Firefox estável ainda não verificados. Versões testadas e a prova de cada recurso: [docs/support-matrix.md](docs/support-matrix.md).
```

`README.md` § Estrutura: insert right after the line `- docs/layers-json.md — contrato do layers.json e das origens`:

```md
- docs/support-matrix.md — navegadores × funcionalidades, versões testadas e verificação pendente
```

`docs/TOPOLOGY.md` line 99: replace the trailing cell `| Chrome/Edge apenas |` with `| Chrome/Edge apenas ([matriz de suporte](support-matrix.md)) |`. The rest of the line is unchanged.

- [ ] **Step 3: Verify**

```bash
git diff --stat README.md docs/TOPOLOGY.md
grep -c 'docs/support-matrix.md)' README.md                  # expect 1
grep -c '^- docs/support-matrix.md — ' README.md              # expect 1
grep -c '\[matriz de suporte\](support-matrix.md)' docs/TOPOLOGY.md   # expect 1
npm test
```

- [ ] **Step 4: Commit (controller)**

```bash
git add README.md docs/TOPOLOGY.md
git commit -m "docs: link the support matrix from README and topology (S7.3 Task 3)"
```

---

### Task 4: Checklist G item and changelog fragment

**Files:**
- Modify: `docs/RELEASE-CHECKLIST.md` (line 81 only; line 8 `Hoje: …` is not touched, a dedicated integration step recounts it)
- Create: `changelog.d/docs-261014-0-s7-3-support-matrix.md`

Executor contract: same format, refusal tokens and acceptance rules as Task 3. Output `anchor 1 <count>`, `edited <file>` / `created <file>`, then `exit_code <n>` and the raw Step 3 output. The controller passes the checklist state from `[!DECISION] checklist-g-state` (`x` by default, `~` with Option B) and commits.

- [ ] **Step 1: Close the G item**

Confirm `grep -c '^- \[ \] Matriz de suporte: navegadores × funcionalidades (leitura, edição, gravação).$' docs/RELEASE-CHECKLIST.md` prints `1`, then replace that line with (state `x` unless the controller passed `~`):

```md
- [x] Matriz de suporte: navegadores × funcionalidades (leitura, edição, gravação) em [docs/support-matrix.md](support-matrix.md); cada célula cita um teste ou fica "não verificado" com o passo manual (M1-M5) ou a lacuna, e `test/support-matrix.test.js` a mantém alinhada às sondas.
```

- [ ] **Step 2: Write the fragment**

Create `changelog.d/docs-261014-0-s7-3-support-matrix.md`:

```md
---
adr: none
---

### Docs

- Nova `docs/support-matrix.md`: navegadores × funcionalidades (carga, leitura por origem, edição, diff simulado, gravação, exportação, configuração, visual), versões testadas, sistema operacional e ambiente de desenvolvimento; cada célula cita um teste E2E ou fica "não verificado" com o passo manual pendente (M1-M5) ou a lacuna.
- README (Requisitos, Estrutura) e docs/TOPOLOGY.md (fronteira App → disco) apontam para a matriz; checklist G "Matriz de suporte" fechado.

### Tests

- `test/support-matrix.test.js`: `npm test` falha se a matriz divergir de `e2e/__snapshots__/compat-probes.json`, citar teste inexistente em `e2e/` ou citar mensagem ausente do `index.html`.

### Perf

- N/A — documentação e um teste unitário de consistência; nenhum código de runtime mudou.
```

If `[!DECISION] matrix-guard` = B, the controller drops the `### Tests` section and the "e `test/support-matrix.test.js` a mantém alinhada às sondas" clause before dispatch.

- [ ] **Step 3: Verify**

```bash
git diff --stat docs/RELEASE-CHECKLIST.md          # expect 1 file, 1 insertion, 1 deletion
git diff -U0 docs/RELEASE-CHECKLIST.md | grep -c '^@@'   # expect 1 (line 8 untouched)
grep -c '^### Perf$' changelog.d/docs-261014-0-s7-3-support-matrix.md   # expect 1
npm test
```

- [ ] **Step 4: Commit (controller)**

```bash
git add docs/RELEASE-CHECKLIST.md changelog.d/docs-261014-0-s7-3-support-matrix.md
git commit -m "docs: close checklist G support matrix item with changelog fragment (S7.3 Task 4)"
```

The roadmap row S7.3 moves to `done` (report column = fragment) in `phase-close-gate`, not here.

---

### Task 5: Freshness check at the branch tip

The matrix transcribes the S5.7 run of 2026-10-14. S4.4b and S3.2 merged after it, and Chrome/Edge auto-update. This task proves the cited tests still run where the Evidências table says, and still pass.

**Files:**
- Modify (only if Step 2 finds drift): `docs/support-matrix.md`

- [ ] **Step 1: Projects per cited test (no browser)**

```bash
npx playwright test --list e2e/browser-compat.spec.js e2e/apply-flow.spec.js e2e/write-log-hash.spec.js > /tmp/s7-3-list.txt; echo "exit_code $?"
for t in Compat_TravalLoad_NoPageErrorNoEgress Compat_GithubRepoMocked_LoadsReadOnlyAndRefusesWrite Compat_FixtureEdit_DiffShowsSimulatedPatch Compat_NoFsAccess_WriteEntryPointsNameTheBrowser Apply_CardShadowOnConnectedFolder_RewritesOnlyTheRuleWithBakAndHistory ExportLog_AfterDraft_HasSha256MatchingDisk; do echo "$t $(grep "$t" /tmp/s7-3-list.txt | sed -E 's/^ *\[([a-z]+)\].*/\1/' | sort | tr '\n' ' ')"; done
```

Expected (projects listed per title): `TravalLoad`, `GithubRepoMocked`, `FixtureEdit`, `NoFsAccess`: all five (`NoFsAccess` is listed everywhere but skips at runtime where `showDirectoryPicker` exists); `Apply_…`: `chrome chromium msedge`; `ExportLog_…`: `chromium`. Any other set: fix the Evidências "Projetos" cell and the matching matrix cells.

- [ ] **Step 2: Re-run the cited specs (lock wrapper)**

Through the § Global Constraints wrapper:

```bash
npx playwright test e2e/browser-compat.spec.js e2e/apply-flow.spec.js e2e/write-log-hash.spec.js e2e/tree-snapshot.spec.js
```

Expected: no failure. The skips are `Compat_NoFsAccess_…` on the three Chromium projects, `Compat_FsAccess_…` on `firefox`/`webkit`, and the `Compat_<fixture>_…` set on `chromium`. Copy the five `[compat]` lines. If a version differs from Versões testadas, update that row and the run date in Versões testadas and Evidências, and commit:

```bash
npm test
git add docs/support-matrix.md
git commit -m "docs: refresh tested versions in the support matrix (S7.3 Task 5)"
```

On any test failure: stop and report. A failing cited test means the matrix cell is false. Fixing that is out of scope for this leaf.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 0. Tracker row + rebuild + cherry-pick | gen | Standard | Workhorse | needs the `roadmap` skill and git judgment |
| 1. `docs/support-matrix.md` from verified facts | gen | Standard | Workhorse | PT-BR docs authoring; each cell re-checked against specs and the probe snapshot (Step 1) |
| 2. Guard test + mutation proof | gen | Standard | Workhorse | test authoring never goes to the Executor |
| 3. README/TOPOLOGY link hunks | gen | Mechanical | Executor (`executor` subagent, no `model`) | verbatim text with unique anchors and a fixed output contract; the controller validates counts, diff stat and `exit_code`, and commits |
| 4. Checklist line + fragment | gen | Mechanical | Executor (`executor` subagent, no `model`) | verbatim text, state passed by the controller; same contract; the controller commits |
| 5. `--list` cross-check + E2E rerun | gen | Standard | Workhorse | owns the lock and port; a version drift or failure needs judgment |
| Pre-merge review | review | Architectural | Architect (`adversarial-reviewer`) | verifier ≥ generator; checks every matrix cell against the cited test and `compat-probes.json`, and the guard against its mutations |

## Self-Review

| Requirement | Where |
|---|---|
| Exact artifact for checklist G:81 and where it lives | Context, `[!DECISION] matrix-location`, Task 1 |
| S5.7 output 1, versions and date | Task 1 § Versões testadas |
| S5.7 output 2, probe matrix | § Evidências note + guard (Task 2) |
| S5.7 output 3, behavior matrix, every cell sourced | Task 1 § Matriz + § Evidências |
| S5.7 output 4, refusal messages | Task 1 § Mensagens + guard |
| S5.7 output 5, cosmetic differences | linked to report § 5 (not copied) |
| S5.7 output 6, unverified cells named | § Verificação pendente (M1-M5), § Lacunas (L1) |
| S5.7 output 7, re-run commands | linked to report § 7; § Como manter |
| S5.7 output 8, README:13/:36/:37 and TOPOLOGY:99 | Task 3 (36/37 verified unchanged) |
| Node/npm and OS dimensions | Task 1 § Sistema operacional, § Ambiente de desenvolvimento |
| Matrix stays true | How it stays true, Task 2, Task 5 |
| Tested versions only | Context (inherited `version-claims` A), Non-goals |
| `index.html` untouched, visual frozen | Non-goals, Global Constraints |
| Checklist line 8 untouched; fragment with `### Perf` N/A | Task 4 |
| Leaf row first commit + plan link; task commits cite `S7.3 Task <id>` | Task 0, Global Constraints |

> [!DECISION] gh-issue-gate
> Issue-worthy: **No**. This is docs plus one consistency test with no user-visible behavior change. It is already tracked by roadmap row S7.3 and checklist G line 81, and the PR carries the history (same as S7.1 and S7.2).

> [!DECISION] phase-intake
> Classification: **meso** `S7.3` under **S7 Release e governança**, target **v1 (Unreleased)**.
> Current tree (relevant slice): S7 › S7.1 done · S7.2 done · S7.3 Matriz de suporte (registered → in-progress) · S7.4 docs/shortcuts.md (registered). Prerequisite S5.7 done.
> Fork of an existing row? **No**: the row is already registered; this plan starts it.
> - **Option A**: keep as `S7.3` (recommended)

> [!DECISION] execution
> Method: **Native** (recommended). Six small sequential tasks. Tasks 3 and 4 go to the `executor` subagent, and the pre-merge review goes to `adversarial-reviewer`. Subagent-driven adds dispatch cost with no parallelism to gain.
