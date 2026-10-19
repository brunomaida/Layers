---
title: "S9.1d — Edição entre layouts e perf do Espalhar"
type: plan
solution: Layers
status: draft
created: 2026-10-19
---

# S9.1d — Edição entre layouts e perf do Espalhar

Entrega a edição entre layouts da S9.1 (undo com `layoutId`, Aplicar junta tudo, aviso "também afeta … (N usos)", watch global) em `index.html` e `lib/layers-core.js`, mais o acompanhamento de performance do Espalhar (R22): cheia congelada rebaixada a LOD e `LodPlane` agrupado por `z` no arrasto.

## Contexto

A S9.1c entregou o Espalhar com um único mock vivo (o ativo) e retratos congelados dos demais. A edição entre layouts ficou para esta leaf (decisão da S9.1c, linhas 28-33, 60-62 e 97 de `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md`). O recon (agentes Explore, 2026-10-19) mostrou:

- Só o layout ativo é montado; `state.changes`, `this.els`, `this.watch`, `this.mtimes` e `undoS/redoS` são dele. `loadProject` chama `resetUndo()` a cada troca (`index.html:1616`).
- As pendentes de cada layout já vivem em `layers/v1/pending` (uma chave por layout, `layoutPendingKey`, `lib/layers-core.js:694`) e são patches de CSS/dc: **gravar não exige montar o layout**.
- `request.layoutId` já existe (`index.html:2432`); falta em `change`, no snapshot do undo e em `watch`/`drift`.
- Não existe dedupe `arquivo|seletor|prop` (só `key = id|prop` dentro de um layout).
- Retratos LOD têm profundidade ≤ 1 (`lodSnapshot`, `index.html:2220`), então não servem para contar usos.
- R22 (limite 17 de `docs/ARCHITECTURE.md`): entrada cheia congelada sem teto e `LodPlane` sem culling/agrupamento no arrasto; 700 + 700 não medido.

Decisões do usuário (2026-10-19):

| # | Decisão | Escolha |
|---|---|---|
| 1 | Empacotamento | Tudo na S9.1d (edição + perf), uma branch |
| 2 | Undo | Pilha única com `layoutId`; desfazer passo de outro layout troca para ele; a troca deixa de zerar a pilha |
| 3 | Aplicar junta tudo | União por leitura do storage, sem montar; dedupe `arquivo\|seletor\|prop`; plano único com origem por layout |
| 4 | "Também afeta" | Varredura cheia sob demanda dos outros layouts, em cache, com ou sem Espalhar |

Decisões minhas a registrar como rulings (sem pergunta; o custo se errar é pequeno):

- **Sonda de layout** (`layoutProbe`): um cache `id → {hash, uses, files}` por layout não ativo, preenchido sob demanda (uma leitura `buildMockDom` + `scanRoot` completo, sequencial, guardada por `loadSeq`). Serve ao aviso (uses), ao Aplicar junta tudo (hash para validar a pendente) e ao watch (files). Invalidada onde `clearSpread` já limpa, mais Aplicar.
- **Watch global barato:** acrescenta ao `this.watch` o mock de cada outro layout (caminho do manifesto, só `getFile()`, sem leitura) e, se a sonda existir, os arquivos dela. O banner de stale passa a nomear o(s) layout(s). Não sonda no carregamento (Foco idêntico).
- **Conflito entre layouts** na união: vale o ativo; entre os outros vale a ordem do `layers.json`; o plano avisa o conflito (`prop` com `to` diferente).
- **Rebaixar a cheia** não muta `spreadFrozen` (specs afirmam `full:true`); a decisão é de desenho (`spreadDrawPlan`). O aviso segue somando a contagem armazenada.

Reuses: `layoutPendingKey`/`getPending`/`layoutEntries`/`clearLayoutEntries` (`lib/layers-core.js:694-1413`), `filesOf`/`patched`/`approve` (`index.html:2807-2865`), `pushSnapshot`/`inlineDelta`, `buildMockDom`/`scanRoot` (S9.1c), `groupPlanesByZ`/`viewCuller` (`lib/layers-core.js:818,878`), `staleFiles`, `spreadPlaneTotal`.
Out of scope: editar nós de layouts não ativos sem ativá-los (o clique no LOD continua ativando); montar vários mocks vivos; mudar estilo do chip (pendência do fim da S9.1); resolver as pendências da S9.1 (memória `project_s9-1-closing-pendencies`).

## Global Constraints

- Visual congelado: nenhuma cor, tipografia ou tamanho muda; só texto novo (aviso "também afeta", origem por layout no plano de salvar, nome do layout no banner de stale), com os tokens atuais.
- Projeto de 1 layout e Espalhar desligado: mesmo DOM, mesmas chaves de sessão e custo de hoje; a sonda e o watch extra só existem com 2+ layouts.
- Toda gravação em disco passa por `writeText`/`writeInto`; nada fora da pasta conectada; leitura da sonda é `quiet` (sem `mtimes`).
- `change.layoutId` é campo novo opcional: pendentes antigas (sem o campo) continuam válidas (o layout vem da chave).
- Sem rede nova; `<head>` e ordem dos `<script>` intocados; `support.js` não se edita.
- Orçamentos de `docs/RELEASE-CHECKLIST.md` § D valem; orçamento novo = 2× a mediana medida.
- Testes: `npm test` ≥ 644 verdes; commits Conventional em inglês, sufixo `(S9.1d Task <n>)`; **nunca** trailer/atribuição de IA em commits ou PR.

## Review Focus

1. **Desfazer entre layouts:** o passo do layout A, com B ativo, troca para A e só então aplica; Aplicar, descarte por deriva e unload limpam os passos afetados; passo órfão nunca aplica `inlineDelta` em layout errado.
2. **Aplicar junta tudo:** pendente de outro layout com hash velho não entra (aviso, sem escrever); a mesma `arquivo|seletor|prop` em dois layouts escreve uma vez; após gravar, os pendentes de todos os layouts incluídos somem e os hashes são recalculados.
3. **Corrida da sonda:** trocar de layout, Recarregar, Reestruturar ou Zerar durante a varredura não grava sonda velha nem vaza host temporário (`loadSeq` + semente da sonda; teste com `slowReads`).
4. **"Também afeta":** contagem correta com Espalhar desligado; layout ausente/ilegível aparece como "indisponível", não derruba o prompt; "contando…" nunca bloqueia a escolha.
5. **Perf:** com total > 1.500 a cheia congelada vira LOD sem mudar ids nem `spreadFrozen`; no arrasto os `LodPlane` são agrupados e cortados sem perder clique/hover; a órbita com 700 + 700 e 800 + 800 tem número medido.

## Design: Architecture & Flows

```
              ┌──────────────── App (index.html) ────────────────┐
 layers.json  │  loadProject(ativo)   state.changes (+layoutId)   │
 (manifesto)─▶│        │                    │                      │
              │        │            undoS/redoS  {layoutId, ch}    │  ◀── [EDIT] pilha única,
              │        ▼                    │                      │       sem resetUndo na troca
              │  layers/v1/pending ◀──── writePending (chave ativa)│
              │   byProject[base|id]  ──▶ união (Salvar)  [NOVO]   │
              │        ▲                    │ dedupe arq|sel|prop  │
              │        │                    ▼                      │
              │  layoutProbe[id] [NOVO] ─ hash · uses · files      │
              │    (buildMockDom+scanRoot cheio, quiet, em cache)  │
              │        │            │            │                 │
              │        ▼            ▼            ▼                 │
              │   valida hash   "também afeta"  watch global       │
              └────────────────────────────────────────────────────┘
```

### Fluxo: desfazer entre layouts

```
Ctrl+Z ─▶ topo = {layoutId:A, ch}          B é o ativo
            │ A ≠ ativo?
            ├─ sim ─▶ await switchLayout(A) ─▶ loadProject(A) restaura pendentes de A
            │            └─ re-lê o topo (mesmo passo?) ─▶ não: aborta com toast
            └─ aplica inlineDelta(cur, ch) em this.els ─▶ setState({changes}) ─▶ redo ◀─ {A, cur}
```

### Fluxo: Aplicar junta tudo

```
Salvar ─▶ ativo: state.changes ─┐
          outros: getPending(chave) ─▶ hash == sonda[id].hash? ─ não ─▶ ignorada + aviso
                                        │ sim
                                        ▼
          união ─▶ dedupe arquivo|patchSel|prop (ativo vence; conflito avisa)
                ─▶ filesOf ─▶ plano (modal) ─▶ Aprovar ─▶ writeText por arquivo
                ─▶ clearLayoutEntries(incluídos) ─▶ sonda invalidada ─▶ hashes recalculados
```

### Perf: cena com muitos planos

```
total = ativo + Σ frozen.count
total > 1500 ─▶ aviso (como hoje) + spreadDrawPlan marca a cheia congelada como "asLod"
arrasto: páginas LOD ─▶ viewCuller (offset da página) ─▶ groupPlanesByZ ─▶ div[data-lod-group] ─▶ LodPlane
```

### Mockup: aviso no escopo (texto novo)

```
┌ Escopo ─────────────────────────────────────────┐
│ ( ) Só este   (•) Todos iguais (4)              │
│ também afeta Config (3 usos) · Replay (1 uso)   │  <-- NOVO (texto mono pequeno, cor --mut)
│ contando outros layouts…                        │  <-- NOVO (enquanto a sonda roda)
└─────────────────────────────────────────────────┘
┌ Salvar ─ plano ─────────────────────────────────┐
│ layers/shared.css  .card { color }   [Config]   │  <-- NOVO (origem por layout)
│ 1 pendência de Replay ignorada (fonte mudou)    │  <-- NOVO
└─────────────────────────────────────────────────┘
```

## Implementation Outline

- **Núcleo puro** — funções testáveis sem DOM → `mergeLayoutChanges`, `countUses`, `undoStepApplies`, `staleLayouts`, `spreadDrawPlan` em `lib/layers-core.js`.
- **Undo único** — passos com `layoutId` → `pushUndo`/`stepHistory` e limpeza nos pontos certos.
- **Sonda e watch** — `layoutProbe` + watch global → cache invalidado, banner com nome do layout.
- **Aplicar junta tudo e aviso** — união de pendentes e contagem de usos → plano único e texto "também afeta".
- **Perf** — rebaixar a cheia e agrupar `LodPlane` → medidas 700 + 700 e 800 + 800 em `e2e/perf.spec.js`.
- **Docs e fechamento** — ARCHITECTURE, checklist, changelog, roadmap, pendências.

## Tasks

### Task 1: Leaf em andamento e núcleo puro

**Files:** Modify `docs/roadmap.md`, `docs/roadmap.config.json`, `lib/layers-core.js`, `test/layers-core.test.js`.

**Interfaces:** Produces em `LayersCore`: `mergeLayoutChanges(byLayout, activeId, order, patchSelFn) → {changes, conflicts}`; `countUses(nodes, src, tag, leaf) → n`; `undoStepApplies(step, activeId, layoutIds) → 'here'|'switch'|'drop'`; `staleLayouts(paths, stale) → ids[]`; `spreadDrawPlan(activeCount, entries, max) → {[id]: 'full'|'lod'}`.

- [ ] **Step 0 (primeiro commit da branch):** `S9.1d` → `in-progress` e link da coluna `plan` em `docs/roadmap.md`; `python ~/.claude/design/_build_proto.py .`; commit `chore(roadmap): start S9.1d (S9.1d Task 1)`.
- [ ] **Step 1:** testes `MergeLayoutChanges_*` (ativo vence, ordem do manifesto, conflito reportado, mesma chave deduplica), `CountUses_*` (src+tag+folha, nó sem `own`), `UndoStepApplies_*`, `StaleLayouts_*`, `SpreadDrawPlan_*` (1.500 exatos não rebaixa, 1.501 rebaixa só a cheia, ativo nunca).
- [ ] **Step 2:** implementar (IIFE clássica, `var`, LF); falha primeiro, depois verde; `npm test`.
- [ ] **Step 3:** commit `feat(core): add cross-layout edit helpers (S9.1d Task 1)`.

### Task 2: Pilha de undo única com `layoutId`

**Files:** Modify `index.html` (`pushUndo`, `stepHistory`, `loadProject`/`resetUndo`, `approve`, `unloadProject`, criação de `change`), `e2e/undo-redo.spec.js`, `e2e/layouts.spec.js`.

**Interfaces:** Consumes `undoStepApplies`. Produces snapshot `{layoutId, changes}` e `change.layoutId`.

- [ ] **Step 1 (falha primeiro):** `Undo_EditInOtherLayout_SwitchesBackAndRestores` (editar em `main`, trocar para `config`, Ctrl+Z volta a `main` e desfaz), `Undo_AfterApply_DropsStepsOfIncludedLayouts`, `Undo_DriftDroppedPending_DropsOwnSteps`, `Undo_PanelOpen_RefusesWithoutSwitching`.
- [ ] **Step 2:** `loadProject` só zera a pilha em projeto novo, unload e Aprovar; `stepHistory` troca de layout (assíncrono, re-lê o topo), aplica o delta e foca o layout; `change.layoutId` carimbado em `applyEdit`/`applyCodeText`.
- [ ] **Step 3:** `npm test`; specs de undo e layouts verdes; commit `feat(ui): share one undo stack across layouts (S9.1d Task 2)`.

### Task 3: Sonda de layout e watch global

**Files:** Modify `index.html` (`layoutProbe`, `probeOthers`, `checkStale`, `clearSpread`/invalidações, banner de stale), `e2e/stale-banner.spec.js`, `e2e/layouts.spec.js`.

**Interfaces:** Produces `this.layoutProbe: Map id → {hash, uses: Map, files: [{path, mtime}]} | {unavailable:true}` e `probeOthers(ids)`; consumes `staleLayouts`.

- [ ] **Step 1 (falha primeiro):** `Probe_OtherLayout_ReadsQuietAndCaches`, `Probe_SwitchDuringScan_DiscardsStaleResult` (`slowReads`), `Watch_OtherLayoutMockChanged_BannerNamesLayout`, `Probe_SingleLayoutProject_NeverRuns`.
- [ ] **Step 2:** sonda sequencial com `live()` (`loadSeq` + semente própria), host temporário descartado em `finally`; `checkStale` inclui o mock dos outros layouts e os arquivos da sonda; banner nomeia o layout; invalidação em reload, restructure, unload, Aprovar.
- [ ] **Step 3:** `npm test` e e2e do escopo; commit `feat(ui): probe other layouts and watch them (S9.1d Task 3)`.

### Task 4: Aplicar junta tudo e aviso "também afeta"

**Files:** Modify `index.html` (`openSave`/`makeDraft`/`approve`/`filesOf`, `scopeOpts`, prompt de escopo), `e2e/apply-flow.spec.js`, `e2e/scope-all-equal.spec.js`, `e2e/layouts.spec.js`.

**Interfaces:** Consumes `mergeLayoutChanges`, `countUses`, `layoutProbe`.

- [ ] **Step 1 (falha primeiro):** `Apply_PendingInTwoLayouts_WritesOnceAndClearsBoth`, `Apply_OtherLayoutStaleHash_IsSkippedWithWarning`, `Apply_ConflictingValue_ActiveWinsAndWarns`, `Scope_AllEdit_ShowsAlsoAffectsOtherLayoutsCount`, `Scope_OtherLayoutUnavailable_ShowsNoCountWithoutBlocking`.
- [ ] **Step 2:** o plano de salvar usa a união (origem por layout, avisos); `approve` grava, chama `clearLayoutEntries` dos incluídos, invalida sonda e recalcula hashes; o aviso lê `uses` da sonda ("contando…" enquanto roda).
- [ ] **Step 3:** `npm test` e e2e do escopo; commit `feat(ui): apply pending of every layout and warn on shared use (S9.1d Task 4)`.

### Task 5: Rebaixar a cheia e agrupar `LodPlane` no arrasto

**Files:** Modify `index.html` (`scene()`, `LodPlane`, `_lodEls`, `spreadView().maxD`), `e2e/spread.spec.js`, `e2e/perf-helpers.js` (se preciso).

**Interfaces:** Consumes `spreadDrawPlan`, `groupPlanesByZ`, `viewCuller`.

- [ ] **Step 1 (falha primeiro):** `SpreadDraw_TotalOverLimit_DrawsFullFrozenAsLod` (sem mudar `spreadFrozen`), `SpreadDraw_TotalAtLimit_KeepsFull`, `SpreadDrag_LodPlanes_AreGroupedByZ` (`[data-lod-group]`), `SpreadDrag_LodClickAndHover_StillWork`, `Spread_PlaneCensus_IgnoresLodGroups`.
- [ ] **Step 2:** rebaixar pelo `spreadDrawPlan` (rótulo " · LOD", borda tracejada); no arrasto, cortar com `viewCuller` (offset da página) e agrupar `LodPlane` por `z` em `div[data-lod-group]` (marca própria, nunca `data-plane-group`); chave de `_lodEls` inclui `dragging`.
- [ ] **Step 3:** `npm test`, `e2e/spread.spec.js` e `leaf-grouping.spec.js` verdes; commit `perf(ui): demote full frozen and group LOD planes on drag (S9.1d Task 5)`.

### Task 6: Medição e orçamentos

**Files:** Modify `e2e/perf.spec.js` (EXPECTED + testes), `bench/workloads.js`, `bench/core.bench.js`, `docs/RELEASE-CHECKLIST.md` § D.

- [ ] **Step 1:** `bigLayouts` parametrizado; casos 700 + 700 (silencioso, sem rebaixar) e 800 + 800 (rebaixa), ids `spread/1400/*` e `spread/1600/*` (órbita, arrasto on/off, `sceneMsPerCall`); micro `spread/draw-plan-1500` e `spread/merge-changes`.
- [ ] **Step 2:** rodar `npm run bench` e `npx playwright test e2e/perf.spec.js --project=chromium` **sozinho**; orçamentos = 2× a mediana; registrar em § D e no changelog `### Perf` (measured).
- [ ] **Step 3:** commit `test(perf): measure 1,400 and 1,600 plane spread cases (S9.1d Task 6)`.

### Task 7: Docs e fechamento

**Files:** Modify `docs/ARCHITECTURE.md` (Espalhar: fechar limites 2 e 17; Foco b/d/f; seção da sonda), `docs/RELEASE-CHECKLIST.md` § C/§ E, `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md` (§ Divergências S9.1d), `docs/layers-json.md` se tocar o manifesto, `changelog.d/feature-261019-93-s9-1d-edicao-entre-layouts.md`, `docs/roadmap.md`.

- [ ] **Step 1:** atualizar os docs, o fragmento (≤ 2048 B, bloco `### Perf`), a contagem de testes e e2e; a lista de pendências da S9.1 **não** é resolvida aqui (a varredura vem em seguida).
- [ ] **Step 2:** `npm test`, e2e do escopo, linkcheck; commit `docs: record S9.1d (S9.1d Task 7)`.

## Verification

- `npm test` (≥ 644 + novos) e `npx playwright test e2e/undo-redo.spec.js e2e/layouts.spec.js e2e/apply-flow.spec.js e2e/scope-all-equal.spec.js e2e/stale-banner.spec.js e2e/spread.spec.js` (um por vez, sozinho).
- `npx playwright test e2e/perf.spec.js --project=chromium` sozinho: casos 1.400 e 1.600 com número registrado e orçamentos 2×.
- Manual (fixture `multi-layout`): editar em `main`, trocar para `config`, Ctrl+Z; Salvar com pendências em dois layouts; escopo all com aviso; DevTools → Network sem requisição externa.
- `python ~/.claude/scripts/docs-linkcheck.py .` 0 quebrados; `precheck.py --root .` sem BLOCKED.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 1, 3, 4, 5, 7 | gen | Standard | Workhorse (Sonnet) | contratos claros; testes primeiro; rede de revisão Opus |
| 2 | gen | Standard | Workhorse (Sonnet) | undo assíncrono com troca de layout; revisão Opus por task compensa o risco |
| 6.1, 6.3 | gen | Standard | Workhorse (Sonnet) | testes de perf e orçamentos |
| 6.2 | gen | Mechanical | Executor (Haiku) | comando + `exit_code` + cauda; o chamador valida |
| revisão por task (2, 3, 4, 5) e pré-merge | review | Architectural | Architect (`adversarial-reviewer`, Opus) | verifier ≥ generator; undo, sonda e cena têm custo de erro alto |
| revisão por task (1, 6, 7) | review | Architectural | Architect (`adversarial-reviewer`, Opus) | idem; re-revisões escopadas de correções pequenas |

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — comportamento novo e visível ao usuário (desfazer, salvar e aviso entre layouts) mais correção de performance do Espalhar.
> Title: `feat: edit across layouts and harden Espalhar perf (S9.1d)`
> Labels: `enhancement`
> Milestone: (none)
> Body:
> ## Context
> S9.1c delivered Espalhar with one live layout and frozen snapshots of the others. Edits are still scoped to the mounted layout: undo is reset on every layout switch, Save writes only the active layout's pending changes, scope "all" cannot see other layouts, and file watching covers one mock. The frozen full entry also has no plane cap and LOD planes get no culling or z-grouping while dragging.
> ## Proposal
> Share one undo stack with a layoutId per step; add a cached probe of the other layouts; make Save merge the pending changes of every layout (dedupe by file|selector|prop); show "also affects <layout> (N uses)" for scope all; watch the other layouts' mocks and name the layout in the stale banner; draw the full frozen entry as LOD above 1,500 planes, group LOD planes by z while dragging, and measure the 1,400 and 1,600 plane cases.
> ## Acceptance criteria
> - [ ] Undo/redo crosses layouts and switches to the step's layout before applying it
> - [ ] Save/Apply merges pending changes of all layouts with a single write per file|selector|prop and clears them afterwards
> - [ ] Scope "all" shows the number of uses in other layouts without blocking
> - [ ] Stale banner names the layout whose mock changed
> - [ ] Above 1,500 planes the full frozen entry is drawn as LOD; LOD planes are z-grouped while dragging
> - [ ] 700 + 700 and 800 + 800 plane cases are measured and guarded in `e2e/perf.spec.js`
> ## Refs
> `docs/text-specs/2026-10-17-s9-1-layouts-newlogic.md`, `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md`

> [!DECISION] phase-intake
> Classification: **micro** `S9.1d` under **S9.1 Layouts newlogic** (meso, `in-progress`), parent **S9 Layouts múltiplos**, target **Unreleased**.
> Current tree (relevant slice): Unreleased › S9 › S9.1 (in-progress) — S9.1a `done`, S9.1b `done`, S9.1c `done`, S9.1d `registered` → `in-progress` (Task 1, first commit on the branch).
> Fork of an existing row? **No**: S9.1d already carries the editing items and the R22 follow-up; no new leaf.
> - **Option A**: tudo na S9.1d (escolhida pelo usuário)
> - **Option B**: edição na S9.1d e perf numa S9.1e

> [!DECISION] execution
> Method: **Subagent-driven** (tasks `S9.1d Task <n>` no Atlas), como na S9.1c. Não há board novo: o único texto visual novo está no mockup acima, com tokens atuais; qualquer desvio visual para antes da Task 4.
