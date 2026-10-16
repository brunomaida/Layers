---
title: "S2.22a — CSS do snapshot deixa de mascarar as folhas reais"
type: plan
solution: Layers
status: draft
created: 2026-10-16
---

# S2.22a — CSS do snapshot deixa de mascarar as folhas reais — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um ajuste aplicado a uma folha CSS real sobrevive ao Recarregar num projeto cujo mock é um snapshot, e o aviso de interação morta deixa de ficar escondido atrás do aviso de `href` remoto.

**Architecture:** O snapshot passa a emitir um `<style data-layers-origin="…">` por folha. O loader descarta o bloco cuja origem é uma folha de `styles` que ele leu de fato, então a folha real vence a cópia. Mock antigo, sem o atributo, continua mascarado, e por isso suas folhas passam a contar como estruturais em `staleKind`. Nenhum interpretador novo: três helpers puros em `lib/layers-core.js` e ajustes pontuais no loader.

**Tech Stack:** JS puro (`lib/layers-core.js`, `index.html`, `tools/layers-snapshot.js`), Vitest, Playwright.

**Spec:** [design S2.22](../specs/2026-10-16-s2-22-loader-checkchanges-design.md) (fatia S2.22a: G1, G2, G9 e G11).

## Global Constraints

- Visual congelado; `support.js` não se edita; sem requisição externa; escrita só por `writeInto`/`writeText`.
- `index.html` é grande: editar com âncoras únicas e conferir a contagem de matches antes de substituir.
- Nomes de teste `Metodo_Cenario_Esperado`; commit gate `npm test` verde; Conventional Commits em EN, sem `Co-Authored-By` nem atribuição a IA.
- Fragmento `changelog.d/<slug>.md` com bloco `### Perf` (`measured | estimated | N/A`, ≥1 bullet de ≥20 caracteres).
- Mock sem `data-layers-origin` (snapshot antigo, mock autoral) mantém o comportamento atual byte a byte.

## Review Focus

- Origem com query (`?t=123`), barra invertida do Windows ou URL absoluta: deve casar com `styles` pelo caminho. Casamento só em fronteira de `/` (`xlayout.css` não casa com `layout.css`).
- Folha de `styles` que falhou na leitura (`css não encontrado`): o bloco do snapshot **fica**, senão a página perde o estilo.
- Duas folhas de mesmo basename em pastas diferentes: só a do caminho completo é descartada.
- Mock de snapshot antigo (sem atributo): mudança numa folha vira `layout`, não `style`.
- Projeto sem `interactions` ou sem aviso de URL remota: a ordem de `warn` não muda.

## Design: Architecture & Flows

Micro: o trecho snapshot → loader → classificação do banner.

```
snapshot.js ──▶ <style data-layers-origin="…/layout.css">…</style>  (um por folha)
                                │
loader (index.html) ◀───────────┘
  inlineCss[i].origin ─▶ LayersCore.snapshotOriginCovered(origin, lidas) ─sim─▶ bloco descartado
                                                                        └não─▶ bloco mantido
  LayersCore.maskedSheets(snapMock, blocos, folhas) ─▶ this.maskedCss ─▶ structural ─▶ staleKind
```

## Implementation Outline

- **Task 1** — helpers puros e testes unitários.
- **Task 2** — snapshot emite um `<style>` por folha com a origem; teste do CLI.
- **Task 3** — integração no loader, fixture e E2E.
- **Task 4** — docs, changelog e roadmap.

## Critical Files

- `lib/layers-core.js` (junto de `staleKind`, ~546) e `test/layers-core.test.js`.
- `tools/layers-snapshot.js:6-24`, `e2e/snapshot-cli.spec.js`.
- `index.html` — `buildProjectFromHtml` (~1000-1051), `loadProject` (~1280-1327), `probeLayout` (~1326).
- `fixtures/snap-origin/`, `e2e/snapshot-dedupe.spec.js`.
- `docs/ARCHITECTURE.md`, `docs/layers-json.md`, `docs/RELEASE-CHECKLIST.md`, `docs/roadmap.md`, `changelog.d/`.

### Task 1: Helpers puros no core

**Files:**
- Modify: `lib/layers-core.js` (novas funções ao lado de `staleKind`; exportar na tabela, ~1283)
- Test: `test/layers-core.test.js`

**Interfaces:**
- Produces: `core.snapshotOriginCovered(origin: string, sheetPaths: string[]) -> boolean`
- Produces: `core.maskedSheets(snapMock: boolean, blocks: {origin: string|null, text: string}[], sheetPaths: string[]) -> string[]`
- Produces: `core.placeDeadWarning(warn: string[], text: string) -> void` (muta `warn`)

- [ ] **Step 1: Escrever os testes que falham** (`describe('SnapshotOriginCovered' | 'MaskedSheets' | 'PlaceDeadWarning')`)
  - `SnapshotOriginCovered_UrlAbsolutaComQuery_Casa`: `('http://localhost:5173/src/styles/layout.css?t=1', ['src/styles/layout.css'])` → `true`.
  - `..._IdViteWindowsComBarraInvertida_Casa`: `('C:\\Dev\\WAVE\\src\\styles\\layout.css', ['src/styles/layout.css'])` → `true`.
  - `..._SufixoSemFronteira_NaoCasa`: `('/a/xlayout.css', ['layout.css'])` → `false`.
  - `..._CaminhoDiferenteMesmoBasename_NaoCasa`: `('/a/src/styles/layout.css', ['other/layout.css'])` → `false`.
  - `..._OrigemVaziaOuNula_NaoCasa`: `''` e `null` → `false`.
  - `MaskedSheets_SnapshotComBlocoSemOrigem_DevolveAsFolhas`: `(true, [{origin:'x'},{origin:null}], ['a.css'])` → `['a.css']`.
  - `MaskedSheets_TodosComOrigem_DevolveVazio`; `MaskedSheets_NaoSnapshot_DevolveVazio`; `MaskedSheets_SnapshotSemBlocos_DevolveVazio`.
  - `PlaceDeadWarning_ExisteAvisoDeUrlRemota_InsereAntes`: `['URL remota removida: href="//x"', 'outro']` → dead fica no índice 0.
  - `PlaceDeadWarning_SemAvisoDeUrlRemota_Acrescenta`: vira o último; `PlaceDeadWarning_AvisoDeCssNaoEncontrado_ContinuaPrimeiro`: `['css não encontrado: a.css', 'URL remota removida: x']` → dead no índice 1.

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run test/layers-core.test.js -t "SnapshotOriginCovered|MaskedSheets|PlaceDeadWarning"`; esperado: FAIL, funções inexistentes.

- [ ] **Step 3: Implementar as três funções** em `lib/layers-core.js`.
  - `snapshotOriginCovered`: normaliza a origem (tenta `new URL` e usa o `pathname`; troca `\` por `/`; remove `?…` e `#…`; `decodeURIComponent` em try/catch) e devolve `true` se algum `sheetPaths[i]` for igual ao caminho ou se o caminho terminar em `'/' + sheetPaths[i]`.
  - `maskedSheets`: devolve `sheetPaths.slice()` só quando `snapMock`, algum bloco tem CSS real (sem comentários) e nenhum bloco traz `origin` (snapshot antigo); senão `[]`. As-built: a regra inicial (qualquer bloco sem `origin`) foi estreitada na revisão final.
  - `placeDeadWarning`: insere `text` antes do primeiro item que casa `/^(URL remota removida|url\(\) remota neutralizada)/`; sem casamento, `push`.

- [ ] **Step 4: Rodar e ver passar** — mesmo comando; esperado: PASS. Depois `npm test` inteiro verde.

- [ ] **Step 5: Commit** — `git add lib/layers-core.js test/layers-core.test.js` · `feat: add snapshot-origin, masked-sheet and warning-order helpers (S2.22a)`

### Task 2: Snapshot emite um `<style>` por folha, com origem

**Files:**
- Modify: `tools/layers-snapshot.js:6-24`
- Test: `e2e/snapshot-cli.spec.js`

**Interfaces:**
- Consumes: nenhuma.
- Produces: no mock, para cada folha legível, `<style data-layers-origin="<id|href>">/* <rótulo> */\n<regras></style>`. A origem é `sheet.ownerNode.dataset.viteDevId`, senão `sheet.href`; sem nenhuma das duas, o `<style>` sai sem o atributo. Folha ilegível (cross-origin) segue como comentário `NÃO LIDO`, sem atributo. Valor do atributo escapado (`&`, `"`, `<`).

- [ ] **Step 1: Teste que falha** — em `e2e/snapshot-cli.spec.js` estender `Snapshot_LoopbackApp_WritesRenderedMock` (ou novo teste `Snapshot_SheetsWithOrigin_EmitsOneStylePerSheet`): o app falso ganha `<link rel="stylesheet" href="/app.css">` (servido pelo próprio servidor) e `<style data-vite-dev-id="C:/p/src/styles/x.css">.v{color:red}</style>`. Asserções: o mock contém `data-layers-origin="http://127.0.0.1:` + `/app.css"` e `data-layers-origin="C:/p/src/styles/x.css"`, e cada `<style` tem no máximo uma folha (conta de `</style>` ≥ 3).
- [ ] **Step 2: Rodar e ver falhar** — `npx playwright test e2e/snapshot-cli.spec.js`; esperado: FAIL no `data-layers-origin`.
- [ ] **Step 3: Implementar** — `css` vira lista de blocos `{origin, text}`; o `html` final concatena um `<style>` por bloco (atributo só quando há origem) em vez de um único `<style>` com tudo.
- [ ] **Step 4: Rodar e ver passar** — mesmo comando mais `npx vitest run test/snapshot-cli.test.js`.
- [ ] **Step 5: Commit** — `feat: emit one style element per sheet with its origin in the snapshot (S2.22a)`

### Task 3: Loader descarta o bloco coberto, classifica o banner e ordena o aviso

**Files:**
- Modify: `index.html` (três pontos; âncoras únicas, conferir contagem)
- Create: `fixtures/snap-origin/{layers.json,layers/mock.html,css/theme.css}` e `fixtures/snap-origin-legacy/` (mesmos arquivos, mock sem o atributo)
- Test: `e2e/snapshot-dedupe.spec.js`

**Interfaces:**
- Consumes: `core.snapshotOriginCovered`, `core.maskedSheets`, `core.placeDeadWarning` (Task 1); atributo `data-layers-origin` (Task 2).
- Produces: `inlineCss[i].origin: string|null`; blocos cobertos saem de `inlineCss` antes de `buildIndex`, `varIndex` e `inlineScoped`; `this.maskedCss: string[]` entra em `this.structural` (em `loadProject` e em `probeLayout`); o aviso de interação morta entra por `placeDeadWarning`.

- [ ] **Step 1: Fixture e teste que falha**
  - `fixtures/snap-origin/layers.json`: `{"name":"Snap origin","viewport":{"width":600,"height":300},"mock":"layers/mock.html","styles":["css/theme.css"]}`.
  - `layers/mock.html`: cabeçalho `<!-- snapshot LAYERS · http://localhost:5173/ · … -->`, um `<style data-layers-origin="http://localhost:5173/css/theme.css">.box{color:red}</style>` (cópia velha) e `<div class="box" id="b">x</div>`.
  - `css/theme.css`: `.box{color:blue}`.
  - `e2e/snapshot-dedupe.spec.js`, teste `SnapshotMock_CopyOfListedSheet_RealSheetWins`: abre `/?layers=fixtures/snap-origin/`, espera o toast `Projeto Snap origin`, lê a cor computada de `#b` no shadow root do `pageRef` e espera `rgb(0, 0, 255)`.
  - Segundo teste `SnapshotMock_CopyWithoutOrigin_KeepsLegacyBehavior`: fixture `fixtures/snap-origin-legacy/` com o mesmo mock sem o atributo e o mesmo `styles`; a cor esperada continua `rgb(255, 0, 0)` (mock antigo preservado byte a byte).
- [ ] **Step 2: Rodar e ver falhar** — `npx playwright test e2e/snapshot-dedupe.spec.js`; esperado: o primeiro FAIL (cor vermelha), o segundo PASS.
- [ ] **Step 3: Implementar no `index.html`**
  - `buildProjectFromHtml`: cada item de `inlineCss` ganha `origin: el.getAttribute('data-layers-origin')`. Depois de montar a lista, separar `kept = inlineCss.filter(c => !c.origin || !LayersCore.snapshotOriginCovered(c.origin, css.map(x => x.file)))`; usar `kept` no lugar de `inlineCss` em `buildIndex`, `varIndex`, `inlineScoped` e na condição `srcFiles[mockPath] = html`. Devolver também `maskedCss: LayersCore.maskedSheets(snapMock, inlineCss, css.map(x => x.file))` (calcular `snapMock` antes do `return`; hoje ele nasce na linha ~1036).
  - `loadProject`: guardar `this.maskedCss = built.maskedCss` e usar `['layers.json', mockPath, ...this.maskedCss]` em `this.structural`.
  - `probeLayout`: `this.structural = ['layers.json', mockPath, ...(this.maskedCss || []), ...Object.keys(mt)]`.
  - Aviso de interação morta: trocar o `warn.push(...)` por `LayersCore.placeDeadWarning(warn, ...)`.
- [ ] **Step 4: Rodar e ver passar** — `npx playwright test e2e/snapshot-dedupe.spec.js e2e/dead-interactions.spec.js e2e/stale-banner.spec.js e2e/layout-drift.spec.js` e `npm test`; esperado: tudo PASS.
- [ ] **Step 5: Commit** — `fix: drop snapshot CSS already covered by a listed sheet and classify masked sheets as layout (S2.22a)`

### Task 4: Docs, changelog e roadmap

**Files:**
- Modify: `docs/ARCHITECTURE.md`, `docs/layers-json.md`, `docs/RELEASE-CHECKLIST.md`, `docs/roadmap.md`, `docs/roadmap.config.json`, `docs/roadmap.data.json` (rebuild)
- Create: `changelog.d/feature-261016-62-s2-22-loader-checkchanges.md`

**Interfaces:** nenhuma.

- [ ] **Step 1: Roadmap** — adicionar a linha `S2.22a` (nível 3, pai `S2.22`, issue `#62`, status `done` ao fechar) e o membro na árvore de `roadmap.config.json`; preencher a coluna `plan` da linha `S2.22` com este plano; `python ~/.claude/design/_build_proto.py .`.
- [ ] **Step 2: Docs** — `ARCHITECTURE.md` (seção do loader: `data-layers-origin`, dedupe, `maskedCss`), `layers-json.md` (nota sobre mock de snapshot e `styles`), `RELEASE-CHECKLIST.md` (item do E2E de dedupe).
- [ ] **Step 3: Changelog** — fragmento com `### Fixed` e `### Perf` (`N/A`: o dedupe só remove CSS duplicado na carga, sem medição).
- [ ] **Step 4: Verificação** — `npm test` verde e `python -X utf8 ~/.claude/scripts/retrofit_docs.py .` sem pendências além do `_index.md`.
- [ ] **Step 5: Commit** — `docs: close S2.22a in the tracker (S2.22a)`

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| Task 1, 2, 3. código do loader/snapshot e testes | gen | Standard | Workhorse | julgamento e autoria de testes |
| Task 4. docs, changelog e roadmap | gen | Standard | Workhorse | prosa de docs, regra de exclusão da Mechanical |
| Task 3. revisão (precedência de CSS, `structural`) | review | Architectural | Architect | regra 5, custo de erro alto |
| Pre-merge review | review | Architectural | Architect | verificador ≥ gerador |

Executor: none — toda tarefa exige julgamento ou autoria de testes.

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — já coberto pela issue #62 (S2.22); nenhuma issue nova para esta fatia.
> Draft to be created (via `gh-issue-gate`): nenhum; reutilizar `#62`.

> [!DECISION] phase-intake
> Classification: **micro** `S2.22a` sob **S2.22 loader captura estados reais do Traval**, alvo **Unreleased**.
> Current tree (relevant slice): Unreleased › S2 › S2.22 (in-progress).
> Fork of an existing row? **No** (novo micro filho de S2.22).
> - **Option A**: micro `S2.22a` na branch do S2.22 (recomendada: a branch já carrega a leaf e o design)
> - **Option B**: branch própria `fix/261016-62-s2-22a-…` empilhada sobre a atual

> [!DECISION] execution
> Method: **Subagent-driven** (tarefas com interfaces explícitas; Tasks 1→2→3 em sequência, Task 4 ao fim).
