---
title: "S9.1c — Espalhar layouts no palco 3D com LOD — Plano de implementação"
type: plan
solution: Layers
status: draft
created: 2026-10-19
---

# S9.1c — Espalhar layouts no palco 3D com LOD — Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: `superpowers:subagent-driven-development`. Passos com checkbox (`- [ ]`).

**Objetivo:** modo **Espalhar** (V3 Híbrido): vários layouts lado a lado no palco 3D, o ativo completo e os demais em LOD, com câmera de visão geral, botão `⊞ ESPALHAR ▾` + popover (Ver todos / Selecionar 1–N / distância) e aviso acima de 1.500 planos.

**Arquitetura:** um único layout **ativo** segue montado como hoje (`loadProject`, um shadow root, edição e Árvore/Camadas/Ajustes inalterados). Os outros viram **retratos congelados** (`spread.frozen[id]` = planos, sem shadow root vivo): LOD = varredura rasa (profundidade ≤ 1); o último ativo fica congelado em profundidade cheia (os "2 completos": ativo + anterior). `scene()` desenha N páginas no `world`; o clique num plano LOD ativa o layout (via `switchLayout`) e depois seleciona.

**Stack:** JS puro em `index.html` + `lib/layers-core.js` (lógica pura), Vitest e Playwright; sem bundler.

**Spec:** a escrever em `docs/superpowers/specs/2026-10-19-s9-1c-espalhar-lod-design.md` (seção *Design* abaixo) a partir de `docs/text-specs/2026-10-17-s9-1-layouts-newlogic.md`, do board `S91Fluxos` e de `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md`.

## Contexto

S9.1a entregou o modo Foco (um layout montado; trocar recarrega). S9.1b entregou a análise de cobertura. Falta o Espalhar para ver vários layouts ao mesmo tempo. O recon (agente Explore, 2026-10-19) mostrou que `loadProject` é monolítico com singletons (`mockRoot`, `els`, `loadSeq`…), então montar N layouts completos é de alto risco. O desenho abaixo mantém **um** mock vivo e trata os demais como dados congelados.

Decisões do usuário (2026-10-19):

| # | Decisão | Escolha |
|---|---|---|
| 1 | Escopo | S9.1c = 4 itens do roadmap. **Edição entre layouts** (undo com `layoutId`, watch/deriva global, aviso "também afeta … (N usos)", "Aplicar junta tudo") vira **S9.1d**, nova leaf |
| 2 | LOD | Planos L0–L1 congelados (varredura rasa; borda tracejada, opacidade .5, sufixo " · LOD") |
| 3 | Limites | Ativo + último ativo completos; aviso **não bloqueante** acima de 1.500 planos (soma completos + LOD) |
| 4 | Seleção | Ids simples no ativo; `layoutId:nodeId` só no clique/hover transitório dos planos LOD (diverge do texto literal da tabela; registrar em "Divergências do código (S9.1c)") |
| 5 | Câmera | Ativar só troca o ativo (sem voo); câmera de visão geral persiste na sessão |
| 6 | Layouts no palco | Eixo X, ordem do `layers.json`, espaço uniforme pelo slider "distância"; seleção 1–N e distância persistem; o ativo sempre entra |
| 7 | Chip ativo | Sem mudança; decisão visual fica na pendência do fim da S9.1 |
| 8 | Botão | `⊞ ESPALHAR ▾` como no board; "Foco" = Espalhar desligado |

Pendências adiadas pelo usuário para uma varredura única no fim da S9.1 (memória `project_s9-1-closing-pendencies`): checagens manuais no browser, baseline `menu-visual`, redação da regra 4, aviso de teto do modal, minors/limites da S9.1b, branch `worktree-agent-abed3f76c401c2618`, `bench/results/*.json`. A Task 8 mantém a lista e **não** as resolve.

## Global Constraints

- Visual congelado: só entram o botão `⊞ ESPALHAR ▾` (último item da linha LAYOUTS, após separador de 1 px, borda `--sel`, mono 7.5px) e o popover de 176 px (`right:10; bottom:52`), exatamente como `S91Fluxos.dc.html:83-103`; nenhum token existente muda.
- Espalhar desligado = comportamento e DOM de hoje (sem páginas extras, mesmas chaves de sessão; `Layouts_SingleLayoutSession_HasNoLayoutKeys` e `layouts.spec.js` inalterados).
- Nenhuma requisição de rede nova; nada é gravado no disco pela leitura LOD (só leitura de mocks/CSS já conhecidos pelo `layers.json`); `<head>` e a ordem dos `<script>` intocados.
- Planos LOD **não** levam `data-plane` (usam `data-lod-plane` + `data-layout`), para não alterar `planeCensus`, hit-tests e culling.
- No máximo 1 shadow root vivo no palco; leituras LOD usam um host temporário descartado a cada layout (sem acumular).
- Teto de aviso `COVERAGE.PLANES_MAX = 1500` reaproveitado (`lib/layers-core.js:1764`); orçamentos de `docs/RELEASE-CHECKLIST.md` § D valem (scan < 300 ms/1.500 nós; órbita > 50 fps).
- Testes: `npm test` ≥ 600 verdes; commits Conventional em inglês, sufixo `(S9.1c Task <n>)`; **nunca** trailer/atribuição de IA em commits ou PR.

## Review Focus

1. **Corrida de carga:** trocar de projeto/layout, Recarregar ou Zerar enquanto a leitura LOD está em voo não pode gravar retratos antigos nem vazar host temporário (guarda `loadSeq` + `spreadSeq`; teste com `slowReads`).
2. **Teto de 1.500 planos:** o aviso soma completos + LOD, aparece uma vez por mudança de seleção (não por render) e não bloqueia; a órbita com N páginas mantém > 50 fps em `multi-layout`.
3. **Layout com mock ausente/ilegível/gigante no Espalhar:** vira chip "indisponível" e fica fora do palco, sem derrubar o ativo nem o Espalhar.
4. **Clique × arrasto:** arrastar a órbita sobre um plano LOD não ativa o layout; clicar ativa e seleciona o mesmo nó (ids da varredura rasa são subconjunto dos da cheia).
5. **Projeto de 1 layout / Foco:** nenhum DOM, chave de sessão ou custo extra com Espalhar desligado.

## Design: Architecture & Flows

```
chip LAYOUTS / ⊞ ESPALHAR ▾ ──▶ popover { Ver todos | 1–N, distância }
        │                         spread = { on, mode, picked[], dist }   (session › spread, só se on)
        ▼
 loadProject(layout ativo)  ── inalterado (1 shadow root vivo, scan completo) ──▶ state.nodes/byId
        │ fim da carga vencedora (seq == loadSeq)
        ▼
 loadSpread(seq)  ── para cada layout escolhido ≠ ativo, um por vez:
        │    ler mock+CSS (mesmo pipeline do loader) → host temporário + shadow root
        │    scanRoot(host, root, {maxDepth:1}) → frozen[id] = {nodes, w, h, full:false}
        │    descartar host; guardas seq/spreadSeq a cada await
        ▼
 spread.frozen { id → {nodes, pageW, pageH, full, count} }      ativo anterior: full:true (LRU de 2)
        │
        ▼
 scene():  world ─┬─ page[ativo]   planos cheios (Plane, data-plane)        translateX(0)
                  ├─ page[LOD i]   LodPlane (data-lod-plane, data-layout)   translateX(i*(W+gap))
                  └─ overview cam: cam() com footprint = N*W + (N-1)*gap
 clique LodPlane ──▶ activateFromLod(layoutId,nodeId) = switchLayout(id) + pendingView.selId=nodeId
 selo "N planos" ──▶ soma(count) > 1.500 → aviso (popover/selo), sem bloqueio
```

**Estado.** `spread` = `{ on, mode: 'all'|'pick', picked: id[], dist: number }` em `state`; `this.spreadFrozen` (Map) e `this.spreadSeq` fora do `state`. Chave de sessão `layers/v1/session › spread` só existe com Espalhar ligado e 2+ layouts. `viewCache` por layout segue valendo só com Espalhar desligado; ligado, a câmera é a de visão geral (guardada em `spread.cam`).

**Contratos puros em `LayersCore`** (testados em `test/layers-core.test.js`):

| Função | Assinatura | Regra |
|---|---|---|
| `spreadPicked(layouts, mode, picked, activeId)` | `(Layout[], 'all'\|'pick', string[], string) => string[]` | ids na ordem do `layers.json`; ids inexistentes saem; o ativo sempre entra; `mode:'all'` = todos |
| `spreadOffsets(count, pageW, dist)` | `(number, number, number) => number[]` | `i * (pageW + gap(dist))`, `gap` linear do slider (0–100 → 0–1 × pageW) |
| `lodNodes(nodes, maxDepth)` | `(Node[], number) => Node[]` | mantém `depth ≤ maxDepth` preservando `id` |
| `spreadPlaneTotal(activeCount, frozen)` | `(number, {count:number}[]) => number` | soma; aviso se `> COVERAGE.PLANES_MAX` |
| `spreadSessionEntry(spread, layoutCount)` | `(Spread, number) => Spread\|null` | `null` com Espalhar desligado ou `layoutCount < 2` |

**Interações.** Só o layout ativo aceita seleção, edição, Árvore, Camadas, Interagir e menu de contexto (inalterados). Passar o mouse num plano LOD destaca o plano (chave transitória `layoutId:nodeId`); clique sem arrasto ativa o layout. Aplicar/Salvar/undo/watch seguem só no ativo (S9.1d cobre o resto).

**Divergências a registrar (Task 8):** ids simples no ativo em vez de `layoutId:nodeId` literal; LOD como varredura rasa em vez de montagem parcial; retratos congelados não acompanham mudanças em disco até Recarregar (limite); S9.1d recebe a edição entre layouts.

## Implementation Outline

- `lib/layers-core.js`: `spreadPicked`, `spreadOffsets`, `lodNodes`, `spreadPlaneTotal`, `spreadSessionEntry`.
- `index.html`: extrair do `loadProject` a leitura do mock em função reutilizável (`buildMockDom(man, layout, opts)`, só lê e monta) mais a montagem síncrona `mountMockDom(host, mb, active)` e `scan()` → `scanRoot(host, root, {maxDepth})` sem `setState`; `loadSpread`/`clearSpread`; `scene()` com páginas por layout e `LodPlane`; ramo de visão geral em `cam()`; botão + popover; sessão (`sessionSnapshot`/`restoreSession`); guardas em `loadProject`/`unloadProject`/Recarregar/Reanalisar/Zerar.
- Testes: `test/layers-core.test.js`, `e2e/spread.spec.js` (novo), `e2e/perf.spec.js` (+ orçamento), fixture `fixtures/multi-layout` (existente) e, se faltar, `fixtures/spread-heavy/`.
- Docs: ARCHITECTURE § Espalhar (S9.1c), `layers-json.md` (nota), RELEASE-CHECKLIST §§ C/D/E, decisions doc, README, changelog, roadmap (S9.1c `done`, S9.1d `registered`).

## Tasks

### Task 1: Núcleo puro e leaf S9.1d no roadmap

**Files:** Modify `lib/layers-core.js`, `test/layers-core.test.js`, `docs/roadmap.md`, `docs/roadmap.config.json`.

**Interfaces:** Produces as 5 funções da tabela acima, exportadas no objeto `api`.

- [ ] **Step 1:** testes `Spread*` (nomes `Metodo_Cenario_Esperado`): ordem do `layers.json`, ativo sempre incluído, id inexistente descartado, `lodNodes` preserva ids e corta profundidade, offsets e `gap` nos extremos 0/100, total exatamente 1.500 não avisa e 1.501 avisa, sessão `null` sem Espalhar ou com 1 layout.
- [ ] **Step 2:** implementar as funções (IIFE clássica, `var`, sem CRLF). Falhar primeiro, depois verde.
- [ ] **Step 3:** registrar a leaf **S9.1d** ("Edição entre layouts: undo, watch, escopo all e Aplicar junta tudo", `registered`, issue vazia) em `docs/roadmap.md` e no `members` de `docs/roadmap.config.json`; `python ~/.claude/design/_build_proto.py .`.
- [ ] **Step 4:** `npm test` verde; commit `feat(core): add spread layout helpers (S9.1c Task 1)`.

### Task 2: Extrair `buildMockDom` e `scanRoot` (refator com rede de segurança)

**Files:** Modify `index.html` (`loadProject` ~1499-1596, `scan` ~2144-2168); Test `e2e/layouts.spec.js`, `e2e/perf.spec.js` (existentes).

**Interfaces:** Produces `buildMockDom(man, layout, opts) → Promise<{rootEl, styleText, built, html, css, mockPath, dcFile, dcText, warn, dc} | {missing} | {empty} | {stale}>` (só lê e monta, nunca toca num host nem nos singletons; `opts` = `{active, state, isStale}`) e `mountMockDom(host, mb, active) → {sh, rootEl}` (síncrono; quem chama com `active` falso checa o `seq` e remove o host) e `scanRoot(host, root, {maxDepth}) → {nodes, byId, maxDepth}` (só retorna, sem `setState`).

- [ ] **Step 1:** rodar antes `npm test` e `npx playwright test e2e/layouts.spec.js e2e/multi-state.spec.js e2e/autocreate.spec.js e2e/coverage.spec.js --project=chromium` e anotar a contagem (rede de segurança: nenhum teste existente editado).
- [ ] **Step 2:** extrair as duas funções mantendo `loadProject`/`scan` como chamadoras; fontes hoisted, `applyHostAttrs` e `probeLayout` continuam só no caminho do ativo (parâmetro `{active:true}`). Teste novo `ScanRoot_MaxDepth1_IdsAreSubsetOfFullScan` (ids da varredura rasa ⊂ ids da cheia, mesmo mock).
- [ ] **Step 3:** mesmas suítes verdes e contagem igual; `Load_TravalFixture_ReportsFirstScan` e `Scan_1500Tags_UnderBudget` dentro do orçamento (sem regressão > 10 %).
- [ ] **Step 4:** commit `refactor(ui): extract buildMockDom and scanRoot from loadProject (S9.1c Task 2)`.

### Task 3: `loadSpread` — retratos congelados (LOD) e LRU de 2

**Files:** Modify `index.html`; Test `e2e/spread.spec.js` (novo).

**Interfaces:** Consumes Task 1 (`spreadPicked`, `lodNodes`) e Task 2. Produces `spreadOn(on)`, `setSpreadPick(mode, picked)`, `setSpreadDist(n)`, `loadSpread(seq)`, `clearSpread()`, `this.spreadFrozen`, `state.spread`.

- [ ] **Step 1:** testes (fixture `multi-layout`): ligar Espalhar congela os outros layouts em LOD (`count` = nós com `depth ≤ 1`), o ativo anterior vira `full:true` ao trocar, no máximo 1 shadow root vivo (`planeCensus`/contagem de roots), `Spread_ProjectSwitchDuringLoad_DropsResult` e `Spread_ReloadDuringLoad_DropsResult` (`slowReads`), mock ausente → layout marcado indisponível sem erro.
- [ ] **Step 2:** implementar `loadSpread`: um layout por vez, guardas `loadSeq` + `spreadSeq` a cada `await`, host temporário descartado em `finally`; `clearSpread` em `loadProject` (projeto/layout novo), `unloadProject`, Recarregar, Reanalisar e Zerar.
- [ ] **Step 3:** `npm test` e `e2e/spread.spec.js` + `layouts.spec.js` verdes; commit `feat(ui): freeze other layouts as LOD snapshots for Espalhar (S9.1c Task 3)`.

### Task 4: Cena com N páginas, `LodPlane` e câmera de visão geral

**Files:** Modify `index.html` (`scene()` ~2762, `cam()` ~2313, componente de plano ~1939); Test `e2e/spread.spec.js`, `e2e/perf.spec.js`.

**Interfaces:** Consumes `spreadOffsets`, `spreadFrozen`. Produces componente `LodPlane`, ramo `overview` em `cam()`.

- [ ] **Step 1:** testes: com Espalhar ligado há N `page`; planos LOD têm `data-lod-plane`/`data-layout` e **nenhum** `data-plane`; bordas/opacidade/sufixo " · LOD" como o board (`S91Fluxos.dc.html:179-195`); `planeCensus` do ativo igual ao de hoje; Espalhar desligado = DOM idêntico (snapshot de contagem de nós do `world`).
- [ ] **Step 2:** implementar páginas com `translateX(offset)`, `cam()` com footprint `N*pageW + gaps` e `visibleMax` sobre todas; foco/`Enquadrar` usam o deslocamento do ativo; `viewCuller` só na página ativa, com `fx` deslocado (ou desligado nas LOD).
- [ ] **Step 3:** órbita com 3 páginas em `multi-layout` > 50 fps (`perf.spec.js`, novo id `spread/multi-layout/orbit-mean-frame-ms`, orçamento fixado depois de medido na Task 7).
- [ ] **Step 4:** commit `feat(ui): render spread layouts with LOD planes and overview camera (S9.1c Task 4)`.

### Task 5: Botão `⊞ ESPALHAR ▾`, popover e aviso de 1.500 planos

**Files:** Modify `index.html` (faixa LAYOUTS ~229-236, `renderVals` ~2814); Test `e2e/spread.spec.js`; confira `test/uiMockCoverage.test.js`.

**Interfaces:** Consumes `spreadPlaneTotal`, `setSpreadPick`, `setSpreadDist`.

- [ ] **Step 1:** botão como último item da linha, popover (Ver todos | Selecionar 1–N, uma linha por layout com nome e contagem de elementos, slider "distância"), fecha com Esc/clique fora; selo com a contagem total e aviso (texto do board, sem bloqueio) acima de 1.500; calculado na mudança de seleção, **não** por render (cache por identidade como `covVals`).
- [ ] **Step 2:** testes: abrir/fechar, 1–N exclui layouts do palco e mantém o ativo, slider muda o espaçamento, aviso com total 1.501 (via `setState` sintético) e ausência com 1.500, Espalhar não aparece com 1 layout.
- [ ] **Step 3:** verificação visual (Playwright screenshot nos 3 temas contra o board); commit `feat(ui): add Espalhar button and popover with plane warning (S9.1c Task 5)`.

### Task 6: Ativar pelo LOD, sessão e guardas

**Files:** Modify `index.html` (`switchLayout` ~2051, `sessionSnapshot` ~1340, `restoreSession`); Test `e2e/spread.spec.js`.

**Interfaces:** Produces `activateFromLod(layoutId, nodeId)`.

- [ ] **Step 1:** testes: clique sem arrasto num plano LOD ativa o layout e seleciona o mesmo `nodeId`; arrasto da órbita sobre plano LOD **não** ativa; chip também ativa; o anterior vira completo (LRU); `session › spread` existe só com Espalhar ligado e 2+ layouts e restaura câmera de visão geral, seleção 1–N e distância; projeto de 1 layout sem chaves novas.
- [ ] **Step 2:** implementar (distinguir clique de arrasto pelo mesmo limiar do app); atualizar guardas que testam `s.modal || s.pending || s.diff` apenas se o popover for overlay modal (não é: fecha com Esc pela cadeia existente).
- [ ] **Step 3:** commit `feat(ui): activate layouts from LOD planes and persist spread session (S9.1c Task 6)`.

### Task 7: Fixture pesada, e2e final e perf

**Files:** Modify `e2e/perf.spec.js`, `bench/workloads.js`/`bench/core.bench.js`, `docs/RELEASE-CHECKLIST.md` § D; Create `fixtures/spread-heavy/` só se `multi-layout` não alcançar 1.500 planos somados.

- [ ] **Step 7.1 (Workhorse):** testes de custo: ligar Espalhar (leitura LOD de 3 layouts) em ms, órbita de 3 páginas, soma > 1.500 com aviso; ids novos em `EXPECTED`; orçamento provisório marcado.
- [ ] **Step 7.2 (Executor):** `npm run bench` e `npx playwright test e2e/perf.spec.js --project=chromium`; devolver `exit_code`, cauda e as medianas (o chamador valida contra o JSON).
- [ ] **Step 7.3:** fixar orçamento = 2× a mediana arredondada; registrar em § D; commit `test(perf): measure Espalhar cost (S9.1c Task 7)`.

### Task 8: Docs, fechamento e pendências da S9.1

**Files:** `docs/ARCHITECTURE.md` (§ Espalhar S9.1c, limites), `docs/layers-json.md`, `docs/RELEASE-CHECKLIST.md` §§ C/D/E, `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md` (§ "Divergências do código (S9.1c)"), `README.md`, `changelog.d/feature-<yyMMdd>-<issue>-s9-1c-espalhar-lod.md` (≤ 2048 B; `### Added`, `### Tests`, `### Perf` com `measured`), `docs/roadmap.md` (S9.1c `done`; S9.1d `registered`; S9.1 segue `in-progress` até a S9.1d), `docs/roadmap.data.json`, `docs/_index.md`.

- [ ] **Step 1:** documentar fluxo, contratos, limites (retratos congelados não acompanham o disco; sem edição/undo/watch entre layouts → S9.1d; LOD = varredura rasa; custo de ligar Espalhar proporcional ao nº de layouts) e as divergências do board.
- [ ] **Step 2:** atualizar a memória `project_s9-1-closing-pendencies` com os itens novos (manual do Espalhar no browser) **sem** resolver as pendências antigas; rebuild do tracker.
- [ ] **Step 3:** `phase-close-gate`, `adversarial-reviewer` da branch inteira (Opus), fix wave, `pr-precheck`; commit `docs: document Espalhar and close S9.1c (S9.1c Task 8)`.

## Verification

- `npm test` verde após cada task (baseline 600).
- `npx playwright test e2e/spread.spec.js e2e/layouts.spec.js e2e/multi-state.spec.js e2e/coverage.spec.js e2e/perf.spec.js --project=chromium`.
- Manual (vai para a varredura final da S9.1): `npm run dev` → `/?layers=fixtures/multi-layout/` → `⊞ ESPALHAR ▾` → Ver todos: 4 layouts lado a lado, ativo completo, demais em LOD tracejado; clicar num LOD o ativa; Selecionar 1–N; distância; aviso de 1.500; Network sem requisições fora de `localhost:5180`; três temas.
- `python -X utf8 ~/.claude/scripts/gates/precheck.py --root .` sem BLOCKED.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 1, 3, 5, 6, 7.1, 8 | gen | Standard | Workhorse (Sonnet) | contratos claros, testes e docs |
| 2, 4 | gen | Standard | Workhorse (Sonnet) | refator e cena sob rede de segurança; revisão Opus compensa o risco |
| 7.2 | gen | Mechanical | Executor (Haiku) | comando + `exit_code` + cauda; o chamador valida |
| revisão por task (2, 3, 4) e pré-merge | review | Architectural | Architect (`adversarial-reviewer`, Opus) | verifier ≥ generator; refator do loader e cena têm custo de erro alto |
| revisão por task (1, 5, 6, 7, 8) | review | Architectural | Architect (`adversarial-reviewer`, Opus) | idem; re-revisões escopadas de correções pequenas |

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — recurso novo e visível ao usuário (modo Espalhar).
> Title: `feat: spread layouts in the 3D stage with LOD and overview camera (S9.1c)`
> Labels: `enhancement`
> Milestone: (none)
> Body:
> ## Context
> S9.1a delivered the Foco mode (one mounted layout at a time). Projects with several screens cannot be seen side by side yet. S9.1c adds the Espalhar mode from the approved V3 design.
> ## Proposal
> Keep one live mock (the active layout) and show the other layouts as frozen snapshots in the same 3D stage: LOD planes (depth <= 1), with the previously active layout kept at full depth. Add the `⊞ ESPALHAR ▾` button and popover (all / pick 1-N / distance), an overview camera, a non-blocking warning above 1,500 planes, and activation by clicking a LOD layout. Editing across layouts (undo with layoutId, global watch/drift, "also affects" warning, apply-all) moves to a new leaf S9.1d.
> ## Acceptance criteria
> - [ ] With 2+ layouts, Espalhar shows the chosen layouts side by side on the X axis, the active one complete and the others as LOD planes
> - [ ] Clicking a LOD plane activates its layout and selects the same node; dragging the orbit over it does not
> - [ ] Pick 1-N and distance persist in the session; the active layout is always included
> - [ ] A warning appears above 1,500 total planes and never blocks
> - [ ] Espalhar off keeps today's DOM, keys and performance; single-layout projects are unchanged
> - [ ] Cost and orbit budgets are measured and guarded in `e2e/perf.spec.js`
> ## Refs
> `docs/text-specs/2026-10-17-s9-1-layouts-newlogic.md`, `docs/superpowers/specs/2026-10-19-s9-1c-espalhar-lod-design.md`

> [!DECISION] phase-intake
> Classification: **micro** `S9.1c` under **S9.1 Layouts newlogic** (meso, `in-progress`), parent **S9 Layouts múltiplos**, target **Unreleased**.
> Current tree (relevant slice): Unreleased › S9 › S9.1 (in-progress) — S9.1a `done`, S9.1b `done`, S9.1c `registered` → `in-progress`.
> Fork of an existing row? **Yes, partially**: the "editing across layouts" items deferred by S9.1a move to a new micro **S9.1d** (registered in Task 1).
> - **Option A**: S9.1c com 4 itens do roadmap + S9.1d para edição entre layouts (escolhida pelo usuário)
> - **Option B**: tudo na S9.1c
> - **Option C**: só o núcleo de hosts na S9.1c

> [!DECISION] execution
> Method: **Subagent-driven** (tasks `S9.1c Task <n>` no Atlas). Não há board novo: o desenho aprovado é o `S91Fluxos` (V3); qualquer desvio visual para antes da Task 5.
