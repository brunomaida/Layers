---
title: "S2.22d — Deriva em snapshot: globs declarados em watch"
type: plan
solution: Layers
status: draft
created: 2026-10-16
---

# S2.22d — Deriva em snapshot (globs em `watch`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** `layers.json › watch` lista globs de fontes TS/JS; os arquivos que casam entram no watch da deriva (S2.21) com teto, então editar `workspace*.ts` depois do mock mostra o banner "Mock mais antigo que a fonte", mesmo num mock de snapshot sem `data-src` (G3, G10 do [design S2.22](../specs/2026-10-16-s2-22-loader-checkchanges-design.md)).

**Architecture:** Quatro helpers puros em `lib/layers-core.js` (`watchGlobs`, `globMatch`, `globDirMayMatch`, extensão de `citedSources`); `probeLayout` percorre a pasta conectada só nos diretórios que algum glob pode alcançar (teto de entradas visitadas) e entrega os arquivos a `citedSources` como fontes extras, depois dos citados em `data-src`. Sem `watch`, o comportamento é idêntico ao atual.

**Tech Stack:** JS puro, Vitest, Playwright.

**Spec:** [design S2.22](../specs/2026-10-16-s2-22-loader-checkchanges-design.md) (linha da S2.22d).

## Global Constraints

- Visual congelado: nenhuma UI nova; o banner da S2.21 é reaproveitado.
- `support.js` intocado; sem requisição externa; só leitura de arquivos (`getFile`), nenhuma escrita.
- Glob relativo à raiz da pasta conectada (mesmo espaço de caminhos de `data-src` e `root.src`), sintaxe `*` (não cruza `/`), `**` (cruza) e `?`; sem `..`, sem `/` inicial, sem `\`.
- Teto de 50 arquivos observados no total (`citedSources` já usa 50) e 5000 entradas visitadas na varredura; a varredura pula `node_modules`, `.git`, `dist`, `build`, `bin`, `obj`, `coverage`, `packages` e pontos, como a do projeto.
- `index.html`: âncoras únicas, contagem de matches antes de substituir. Nomes de teste `Metodo_Cenario_Esperado`; `npm test` verde antes de cada commit; commits EN, trailer de sessão, sem `Co-Authored-By`.
- Fragmento `changelog.d/feature-261016-62-s2-22d-watch-globs.md` com `### Perf` (≥20 caracteres).

## Review Focus

- `watch` ausente, não-array, com entradas não-string, vazias, com `..`, `\` ou `/` inicial: ignorado (comportamento atual) e as entradas válidas continuam.
- Glob com `**` no meio (`src/**/ui/*.ts`) casa zero ou mais diretórios; `*` nunca cruza `/`; `.` e `+` do glob são literais.
- Mais de 50 arquivos casando, ou mais de 5000 entradas visitadas: o aviso diz quantos ficaram de fora e nada quebra.
- Arquivo que casa e também é citado em `data-src`, ou é o mock/folha/`layers.json`: aparece uma vez só ou não aparece.
- Pasta sem permissão de leitura, ou fonte apagada entre a varredura e o `getFile`: sem banner e sem erro.

## Design: Architecture & Flows

```
layers.json  watch:["src/**/*.ts"]
     │ watchGlobs(man) ──▶ globs válidos
     ▼
probeLayout (após a carga, sem atrasar)
     │ walkWatch(dir, globs): só entra em pasta com globDirMayMatch; teto de 5000 entradas
     │ ──▶ extras = arquivos onde globMatch(glob, caminho) e isManualSource
     │ citedSources(srcs[data-src], known, 50, extras)  ──▶ citados primeiro, extras até o teto
     ▼
mtime de cada um ──▶ this.watch + this.structural ──▶ layoutDrift(mockMtime, mt) ──▶ banner S2.21
                                   (teto estourado ──▶ toast "watch: N arquivos além do teto de 50 ignorados")
```

## Implementation Outline

- **Task 1** — helpers puros e testes.
- **Task 2** — `probeLayout` + varredura, fixture e E2E.
- **Task 3** — docs, changelog e roadmap.

## Critical Files

`lib/layers-core.js` (`citedSources` ~537, helper novo junto de `projectStates`), `test/layers-core.test.js`, `index.html` (`probeLayout` ~1341, varredura do projeto ~1370 como modelo, `toast` ~1099), `e2e/watch-globs.spec.js` (modelo: `e2e/layout-drift.spec.js`), `docs/layers-json.md`, `docs/ARCHITECTURE.md`, `docs/RELEASE-CHECKLIST.md`.

### Task 1: Helpers puros

**Files:**
- Modify: `lib/layers-core.js` (helpers novos exportados no objeto público; `citedSources` ganha o 4º parâmetro)
- Test: `test/layers-core.test.js`

**Interfaces:**
- Produces: `LayersCore.watchGlobs(man: object): string[]`, `LayersCore.globMatch(glob: string, path: string): boolean`, `LayersCore.globDirMayMatch(glob: string, dirPath: string): boolean`, `LayersCore.citedSources(srcs, known, cap?, extra?: string[]): string[]`.

- [ ] **Step 1: Escrever os testes que falham**

  - `WatchGlobs_EntradasInvalidas_SaemEValidasFicam`: `{watch:['src/**/*.ts','', 7, '../x', '/abs', 'a\\b', null]}` → `['src/**/*.ts']`; `man` sem `watch`, `watch:'x'` e `man` indefinido → `[]`; mais de 20 válidas → só as 20 primeiras.
  - `GlobMatch_AsteriscoNaoCruzaBarra`: `src/*.ts` casa `src/a.ts`, não casa `src/ui/a.ts`.
  - `GlobMatch_DoubleStarCruzaZeroOuMaisPastas`: `src/**/*.ts` casa `src/a.ts` e `src/ui/x/a.ts`; `**/*.ts` casa `a.ts` e `src/a.ts`; `src/**` casa `src/ui/a.ts`.
  - `GlobMatch_PontoEMaisSaoLiterais`: `src/a.b+c.ts` casa só `src/a.b+c.ts`, não `src/aXb+c.ts`; `?` casa um caractere que não é `/`.
  - `GlobDirMayMatch_PodaPastasForaDoGlob`: com `src/ui/*.ts`: `''`, `src`, `src/ui` → true; `src/ui/x`, `docs`, `lib` → false. Com `src/**/*.ts`: `src/a/b/c` → true; `docs` → false.
  - `CitedSources_ExtrasDepoisDosCitadosRespeitamCapEConhecidos`: `citedSources(['a.ts|.x|1'], ['known.ts'], 3, ['a.ts','b.ts','known.ts','c.ts','d.ts','x.css'])` → `['a.ts','b.ts','c.ts']` (único, fora `known`, fora não-fonte, no máximo 3).

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run test/layers-core.test.js -t "WatchGlobs|GlobMatch|GlobDirMayMatch|CitedSources"`
Expected: FAIL (`watchGlobs is not a function`; extras ignorados).

- [ ] **Step 3: Implementar**

`watchGlobs`: lista de strings não vazias sem `..` como segmento, sem `\`, sem `/` inicial, máximo 20. `globMatch`: converte para RegExp ancorada (`**/` → `(?:.*/)?`, `**` → `.*`, `*` → `[^/]*`, `?` → `[^/]`, demais caracteres escapados). `globDirMayMatch`: compara segmento a segmento; `**` → true; diretório mais fundo que o glob sem `**` → false; segmento do glob com `*`/`?` casa pelo mesmo conversor. `citedSources`: depois do laço de `srcs`, percorre `extra` com as mesmas regras (único, `isManualSource`, fora `skip`, até `max`).

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS, sem regressão nos testes de `citedSources` existentes.

- [ ] **Step 5: Commit**

```bash
git add lib/layers-core.js test/layers-core.test.js
git commit -m "feat: watch glob helpers and extra sources in citedSources (S2.22d)"
```

### Task 2: Varredura no `probeLayout`

**Files:**
- Modify: `index.html` (`probeLayout`, método novo `walkWatch`)
- Create: `e2e/watch-globs.spec.js`

**Interfaces:**
- Consumes: `watchGlobs`, `globMatch`, `globDirMayMatch`, `citedSources` com `extra` (Task 1); `probeLayout(seq, rootEl, mockPath, known)` já recebe o `man` por `this.loaded`/estado do projeto (o implementador localiza onde o manifesto da carga fica guardado e passa `globs` como 5º argumento a `probeLayout`).
- Produces: `async walkWatch(globs: string[]): Promise<{ files: string[], capped: boolean }>` no `Component`.

- [ ] **Step 1: Escrever o E2E que falha**

`e2e/watch-globs.spec.js` com o helper `connect` de `layout-drift.spec.js` (OPFS, `showDirectoryPicker` stubado) e arquivos `layers.json` (`watch: ['src/**/*.ts']`, mock **sem** `data-src`), `layers/mock.html`, `src/ui/other.ts`, `docs/note.ts`, `node_modules/x/dep.ts`:
  - `WatchGlobs_MatchingSourceNewerThanMock_ShowsRestructureBanner`: `other.ts` mais novo que o mock → banner contém `Mock mais antigo que a fonte: src/ui/other.ts`.
  - `WatchGlobs_SourceOutsideGlobOrInSkippedDir_ShowsNoBanner`: só `docs/note.ts` e `node_modules/x/dep.ts` mais novos → sem banner.
  - `WatchGlobs_NoWatchField_ShowsNoBanner`: mesmo projeto sem `watch` → sem banner.
  - `WatchGlobs_MoreThanCapMatches_ToastsTheOverflow`: 55 arquivos `src/gen/f<i>.ts` → toast contém `watch: 5 arquivos além do teto de 50 ignorados`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/watch-globs.spec.js`
Expected: FAIL (nenhum banner; nenhum toast).

- [ ] **Step 3: Implementar em `index.html`**

`walkWatch`: percorre `this.state.dir` recursivamente com o mesmo `SKIP`, regra de ponto e teto de 5000 entradas visitadas da varredura do projeto; entra numa pasta só se algum glob passa em `globDirMayMatch(glob, caminhoDaPasta)`; devolve os caminhos (`LayersCore.safePath`) onde `globMatch` casa algum glob e `capped` quando bateu o teto de entradas. `probeLayout` chama `walkWatch(globs)` quando `globs.length`, passa `files` como `extra` a `citedSources`, e quando o total casado excede o teto de 50 chama `this.toast('watch: ' + n + ' arquivos além do teto de 50 ignorados')` (e, se `capped`, `'watch: varredura parou em 5000 entradas'`). Leitura falha ou sem permissão: segue sem extras.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` e `npx playwright test e2e/watch-globs.spec.js e2e/layout-drift.spec.js e2e/stale-banner.spec.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html e2e/watch-globs.spec.js
git commit -m "feat: watch globs feed the layout drift probe (S2.22d)"
```

### Task 3: Docs, changelog e roadmap

**Files:**
- Modify: `docs/layers-json.md`, `docs/ARCHITECTURE.md`, `docs/RELEASE-CHECKLIST.md`, `docs/roadmap.md`
- Create: `changelog.d/feature-261016-62-s2-22d-watch-globs.md`

- [ ] **Step 1: Docs**

`layers-json.md`: linha `watch` na tabela (globs relativos à raiz da pasta, `*`/`**`/`?`, até 20 globs, teto de 50 arquivos observados e 5000 entradas). `ARCHITECTURE.md`: parágrafo na seção de deriva (S2.21) com o fluxo do diagrama. `RELEASE-CHECKLIST.md`: item com `e2e/watch-globs.spec.js` e o item manual no Traval real (editar `workspace*.ts` e ver o banner; `layers.json` do Traval no WAVE passa a listar as 7 folhas e `watch: ["src/ui/**/*.ts"]`).

- [ ] **Step 2: Changelog e leaf**

Fragmento no formato da S2.22c (`adr: none`, `### Added`, `### Perf` ≥20 caracteres: varredura limitada a 5000 entradas e 50 arquivos, só na carga, em segundo plano). `docs/roadmap.md`: S2.22d com `plan` e `report` linkados e status `done`; reconstruir: `python ~/.claude/design/_build_proto.py .`

- [ ] **Step 3: Rodar e commitar**

Run: `npm test`
Expected: PASS.

```bash
git add docs changelog.d
git commit -m "docs: close S2.22d in the tracker (S2.22d)"
```

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| Task 1, 2. helpers, varredura e testes | gen | Standard | Workhorse | julgamento e autoria de testes |
| Task 3. docs, changelog e roadmap | gen | Standard | Workhorse | prosa de docs |
| Pre-merge review | review | Architectural | Architect | verificador ≥ gerador |

Executor: none — toda tarefa exige julgamento ou autoria de testes.

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — já coberto pela issue #62 (S2.22); nenhuma issue nova.

> [!DECISION] phase-intake
> Classification: **micro** `S2.22d` sob **S2.22**, alvo **Unreleased**.
> Fork of an existing row? **No**.
> - **Option A**: branch própria `feature/261016-62-s2-22d-watch-globs` (aplicada: a S2.22c já foi mesclada no PR #65)

> [!DECISION] execution
> Method: **Inline** (3 tarefas sequenciais, `index.html` e o mesmo fluxo de deriva).
