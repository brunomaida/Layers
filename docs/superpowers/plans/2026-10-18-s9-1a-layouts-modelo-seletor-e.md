---
title: "S9.1a — Layouts: modelo, seletor e modo Foco — Implementation Plan"
type: plan
solution: Layers
status: draft
created: 2026-10-18
---

# S9.1a — Layouts: modelo, seletor e modo Foco — Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox syntax. Dispatch descriptions `S9.1a Task <id> …`; commit subjects end `(S9.1a Task <id>)` (Atlas convention).

## Context

A S9.1 ("Layouts newlogic", meso `in-progress`) pede vários layouts por projeto, seletor, vista espacial, cobertura % e funções atreladas ao layout. A S3.5 foi mergeada (#86) e deixou `layoutId: 'main'` fixo nas requisições. O design está fechado nos boards `S91Fluxos` e `S91Cobertura` (`docs/design/ui-mock/`) e em `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md`: **V3 Híbrido**, `states` ortogonais a layouts, `pendingKey|layoutId`, `stateMap` por layout.

Decisões do usuário (2026-10-18):
1. **Fatiar em 3 micro-leaves**: este plano detalha só a **S9.1a**; S9.1b (cobertura %) e S9.1c (Espalhar + LOD) ficam em "Fatias seguintes".
2. **Foco monta um layout por vez e recarrega ao trocar** (reaproveita `loadProject`/`switchState`): 1 shadow root, custo igual ao de hoje. A infra de vários hosts nasce só na S9.1c.

Revisão técnica Opus (`adversarial-reviewer`, 2026-10-18): 0 blockers, 7 MAJOR e 6 MINOR; todos incorporados abaixo.

**Entrega da S9.1a:** `layouts` opcional em `layers.json`; faixa **LAYOUTS** na barra inferior acima de Camadas (some com ≤ 1 layout); trocar de layout recarrega só o mock dele; seleção, explosão (`explodeFrom`/`collapseAt`), câmera, ajustes pendentes e requisições ficam atrelados ao layout; exportação de requisições agrupa por layout. **Projeto sem `layouts` se comporta byte a byte como hoje.**

Visual congelado: o seletor reusa o estilo dos chips da barra Camadas; estilo inline; `support.js` não é editado.

## Design: Architecture & Flows

### Topology (micro — `lib/layers-core.js` + `index.html`)

```
 layers.json                         LayersCore (puro, testado)
 ┌──────────────────────────┐        ┌────────────────────────────────────────┐
 │ layouts?: [{id,name,mock,│ ─────► │ projectLayouts(man) → [{id,name,mock,  │
 │            states?}]     │        │                         states}]        │
 │ (sem layouts: 'main'     │        │ pickLayout(list, wanted)               │
 │  implícito = mock+states │        │ layoutPendingKey(base,id) / stateMapKey │
 │  da raiz, como hoje)     │        │ interactionsFor(list, layoutId)        │
 └──────────────────────────┘        │ mergeLayoutRequests(...)               │
                                     │ touchLayoutEntries / clearLayoutEntries│
                                     └───────────────┬────────────────────────┘
                                                     ▼
 faixa LAYOUTS ──click──► switchLayout(id) ──► loadProject()  (1 layout montado)
   ● main  config  replay     │ salva view do layout atual em this.viewCache
   (badge = pendentes          │ layoutMap[base] = id  (session.layouts)
    em outro layout)           │ pendingKey = base|id   stateMap[base|id]
                               ▼
              scan(): nodes/byId só do layout ativo  → palco, Árvore, Camadas
```

### Chaves (compatibilidade)

| Dado | Layout `main` (ou projeto sem `layouts`) | Outro layout `<id>` |
|---|---|---|
| `pendingKey` | `<base>` (igual a hoje) | `<base>\|<id>` |
| `stateMap` | `<base>` ou `'-'` (igual a hoje) | `<base>\|<id>` |
| `session.layouts` | `{ <base>: '<id ativo>' }` (novo; gravado só se não vazio; lido com `typeof object`) | idem |
| `viewCache` (memória) | `<base>\|main`-equivalente: chave = `layoutPendingKey(base,id)` | idem |

`<id>` casa `^[A-Za-z0-9_-]{1,40}$` (nunca contém `|`). Limite conhecido: um `<base>` (nome de pasta ou `.zip`) que já contenha `|` pode colidir com `<base>|<id>`.

### Decisões de projeto (rulings propostos, a validar na aprovação)

| # | Decisão | Por quê | Custo se errado |
|---|---|---|---|
| a | Trocar de layout **não descarta** `changes`: a rajada é drenada na chave antiga (`writeConfig()` no início do `loadProject`, antes de reatribuir `pendingKey`) e volta com hash igual. Só abre modal se houver `codeBuf` sem salvar, e o `onYes` **só descarta o `codeBuf`**, nunca chama `dropPending` | `switchState` descarta porque o hash do estado difere; aqui a chave é por layout | Edição de código perdida se `hasUnsaved` for lido errado: teste cobre |
| b | **Aplicar/Salvar atuam só no layout ativo**; chips dos outros mostram badge de pendentes. Aplicar CSS compartilhado muda o hash dos outros layouts: os ajustes pendentes deles são descartados ao abri-los (limite aceito) | Só um layout está montado (Foco). "Aplicar junta tudo" vira S9.1c | Pendente de outro layout perdido por CSS compartilhado: toast ao descartar já existe |
| c | Requisições de todos os layouts saem juntas no Markdown, lidas do `layers/v1/pending` dos não ativos; o `confirm` delas é o gravado | O hash dos layouts desmontados não é conhecido | Marca desatualizada até o layout ser aberto |
| d | Undo/Redo, watch/drift e `driftAck` valem para o **layout montado**; o backup do Reanalisar também lê o mock dos demais | Pilha única com `layoutId` e watch global só fazem sentido com vários montados (S9.1c) | Drift em layout desmontado só aparece ao abri-lo |
| e | Sem botão "Espalhar" e sem novo "Foco" no dock | Evita o choque de nome com o FOCO das camadas; Espalhar é S9.1c | — |
| f | Aviso de escopo `all` ("também afeta …") fica para S9.1c | Exige contar usos em layouts desmontados | Edição de regra compartilhada sem aviso na 9.1a |
| g | Com `layouts` declarado, `mock`/`states` da raiz são ignorados e as chaves antigas (`<base>`) só voltam se existir `id:'main'`; sem ele, ficam órfãs. Documentar em `docs/layers-json.md` | Evita layout implícito que o usuário não declarou | Pendentes antigos "somem" ao adotar `layouts` sem `main`: aviso na doc |
| h | Cada escrita da chave ativa **renova o `savedAt`** das entradas irmãs `<base>\|*` (TTL de 30 dias) | O TTL apagaria o texto de layouts fechados enquanto o projeto é usado todo dia | Entradas de layouts abandonados vivem enquanto o projeto viver (aceito) |

## Critical Files

- `lib/layers-core.js` — `projectLayouts`, `pickLayout`, `layoutPendingKey`, `stateMapKey`, `interactionsFor`, `mergeLayoutRequests`, `touchLayoutEntries`, `clearLayoutEntries` (+ exports; `pendingMap` não é exportado hoje).
- `index.html` — `loadProject` (resolução de layout/chaves, `:1374-1406`, `setState` `:1458`), `switchLayout`, `switchState`/`stateMap` (`:1790`), `sessionSnapshot` (`:1224`), faixa LAYOUTS (~linha 227), `addRequest`, `requestsMd`/Ajustes (`:1986-2020`), `deadInteractions`, `backupLayout`/`layoutBackupPaths`, `unloadProject`.
- `fixtures/multi-layout/` (novo), `e2e/layouts.spec.js` (novo), `e2e/perf.spec.js`, `test/layers-core.test.js`.
- Docs: `docs/ARCHITECTURE.md` (§ Layouts), `docs/layers-json.md`, `docs/RELEASE-CHECKLIST.md` (§ D, § E), `README.md`, `docs/roadmap.md`, decisions doc, `changelog.d/`.

## Global Constraints

- Projeto sem `layouts`: mesmas chaves, mesmo `loadProject`, mesma UI; os testes existentes passam sem edição (guarda de regressão).
- Um shadow root; nenhum layout extra montado. Nenhuma requisição de rede.
- Pure logic em `LayersCore`; Vitest só no core; e2e Playwright com `ctx-helpers.js` (`act`, `open`, `reloadWith`). O `act` espera só 150 ms: após `switchLayout`, fazer poll de `project.layoutId` e da contagem de nós.
- Prosa dos docs em PT-BR; código, comentários e commits em EN; sem `Co-Authored-By`.

## Tasks

### Task 1: Funções puras de layout (TDD, `lib/layers-core.js`)

**Files:** `lib/layers-core.js`, `test/layers-core.test.js`

- [ ] `projectLayouts(man)`: lê `man.layouts` (array). Entrada válida = objeto com `id` (regex acima), `mock` string não vazia; `name` string (padrão `id`); `states` via `projectStates(entry)`. Id repetido fica o primeiro; inválida sai. Sem nenhuma válida: `[{id:'main', name: man.name || 'main', mock: man.mock (string ou null), states: projectStates(man)}]`. Com `layouts` válido, `man.states` e `man.mock` da raiz são ignorados (ruling g).
- [ ] `pickLayout(list, wanted)`: o pedido, senão o primeiro.
- [ ] `layoutPendingKey(base, id)`: `base` nulo → nulo; `id` vazio ou `'main'` → `base`; senão `base + '|' + id`. `stateMapKey(base, id)`: igual, com `base || '-'`.
- [ ] `interactionsFor(list, layoutId)`: devolve `[{item, index}]` preservando o índice original (as entradas `sep` e as chaves `'i'+i` do Interagir dependem dele); sem `layout` na interação = vale para todos; com `layout` string = só o layout dele; inválida sai.
- [ ] `mergeLayoutRequests(order, activeId, activeReqs, othersById)`: junta na ordem de `order`, `activeReqs` no lugar do ativo; descarta registro sem `id` string; devolve cópia.
- [ ] `touchLayoutEntries(storage, base, now)`: renova `savedAt` das entradas `<base>|*` existentes (ruling h); `clearLayoutEntries(storage, base)`: remove `<base>|*` (usado por "Zerar interface"). Ambos pelo mesmo read-modify-write de `setPending`.
- [ ] Testes `Metodo_Cenario_Esperado`: sem layouts (implícito main idêntico ao de hoje), ids inválidos/repetidos, `states` por layout, raiz ignorada, chaves de `main` iguais às antigas, `interactionsFor` com índices, merge ordenado, entrada irmã sobrevive ao TTL após `touchLayoutEntries`, `clearLayoutEntries` não toca a chave base nem outros projetos.
- Verify: `npm test` verde, nenhum teste existente editado.

### Task 2: Carga por layout + fixture (`index.html`, `fixtures/multi-layout/`)

**Files:** `index.html`, `fixtures/multi-layout/**`, `e2e/layouts.spec.js`

- [ ] Fixture `multi-layout`: `layers.json` com 4 layouts (`main` com 2 `states`, `config`, `replay`, `broken` com `mock` inexistente, como `missing.html` da `multi-state`), mocks pequenos (≤ 40 elementos), um CSS compartilhado e um por layout; `interactions` com e sem `layout`.
- [ ] `loadProject`: `this.baseKey = pendingKeyNow()` e `this.pendingKey = null` até o `JSON.parse`; depois `layouts = projectLayouts(man)`, `curLayout = pickLayout(layouts, this.layoutMap[baseKey||'-'])`, `this.pendingKey = layoutPendingKey(baseKey, curLayout.id)`, `project.states = curLayout.states`, `curState` por `stateMap[stateMapKey(...)]`; `mockPath = P(curState ? curState.mock : curLayout.mock || <fallback atual>)`. `project` ganha `layouts:[{id,name}]` e `layoutId`.
- [ ] Mock do layout ausente (`:1406`): apagar `stateMap[stateMapKey(...)]` **e** `layoutMap[baseKey]` antes do `unloadProject`, para o reload abrir o 1º layout em vez de prender o usuário. Trocar também o `delete` de `:1406` e o uso de `:1790` por `stateMapKey`.
- [ ] `layoutMap` em instância, semeado de `CONF.session.layouts` (só objeto), gravado em `sessionSnapshot` apenas se não vazio.
- [ ] `switchLayout(id)` (sem UI ainda, alcançável por `act`): guardas do `switchState` (modal/pending/diff, `loadedSeq`); se `hasUnsaved` por `codeBuf` → modal cujo `onYes` só limpa o `codeBuf` e segue (nunca `dropPending`, ruling a); senão `layoutMap[baseKey] = id; this.pendingSel = null; loadProject()`.
- e2e: `Layouts_Load_MountsOnlyActiveLayout` (planos = só do mock ativo, 1 shadow root), `Layouts_SingleLayoutProject_KeysUnchanged` (usar `open()` com pasta conectada e afirmar o literal da chave, ex. `'folder:proj'`; fixture zera câmera e ramo), `Layouts_SwitchLayout_ReloadsOtherMock`, `Layouts_MissingMock_ReloadFallsBackToFirstLayout`.
- Verify: `npm test` e `npx playwright test e2e/layouts.spec.js e2e/multi-state.spec.js e2e/pending-persist.spec.js e2e/request.spec.js e2e/context-menu.spec.js` (a chave do `stateMap` e a sessão mudam nesta task).

### Task 3: Faixa LAYOUTS (`index.html`)

**Files:** `index.html`, `e2e/layouts.spec.js`

- [ ] Linha "LAYOUTS" de largura total na barra inferior, antes do rótulo "Camadas" (markup ~linha 227; referência visual `S91Fluxos.dc.html` V3). Chips reusam o estilo dos chips de Camadas; ativo preenchido com "●". Não renderiza com `project.layouts.length < 2`.
- [ ] Badge numérico (`changes + requests`) nos chips dos outros layouts: calculado **uma vez no `loadProject`** (uma leitura do `layers/v1/pending`, junto com o piso do `R<n>`), nunca no `writeConfig`, que roda a cada rajada de câmera.
- [ ] `title` do chip com o nome completo; `aria-pressed`; foco por teclado (botões nativos).
- e2e: `Layouts_Strip_HiddenForSingleLayout`, `Layouts_Strip_ClickSwitchesLayout`, `Layouts_Strip_BadgeShowsPendingOfOtherLayout`.
- Verify: playwright dos specs tocados; manual: sem requisições externas no Network.

### Task 4: Funções atreladas ao layout (view cache + pendentes)

**Files:** `index.html`, `e2e/layouts.spec.js`

- [ ] `this.viewCache[layoutPendingKey(base,id)] = {selId, isoId, yaw, tilt, zoom, panX, panY, flat, explodeFrom, collapseAt}` gravado em `switchLayout`. A vista alvo entra **no payload principal do `setState` de `loadProject`**, do mesmo modo que `keep` (sem segundo render e sem câmera padrão piscando), validada pelo `scan()`; fica carimbada com `{projectId, layoutId}` e é consumida e limpa em `:1432`, inclusive nos retornos antecipados. Por usar a chave `base|id`, `useDir`/`pickZip`/`loadRepo` e a troca de fixture (`:1717`) já a invalidam sem limpeza manual; `unloadProject` a esvazia.
- [ ] A vista de sessão (`selId`, câmera) leva o `layoutId` a que pertence: fechar a aba durante a carga não pareia `layouts` novo com a vista do layout antigo.
- [ ] Reload da aba restaura só o layout ativo (campos de sessão atuais + `layouts`).
- [ ] `changes` ficam na entrada `base|layout`: ajuste em `config`, trocar para `main`, voltar → ajuste restaurado (hash igual), sem modal. Cada escrita da chave ativa chama `touchLayoutEntries` (ruling h).
- e2e: `Layouts_ViewState_PerLayoutSelectionAndExplode` (usar um id de ramo que exista nos dois mocks e afirmar que o que não existe não vaza), `Layouts_PendingChange_SurvivesSwitchAndReturn`, `Layouts_CodeBuf_AsksBeforeSwitch` (confirmar mantém `changes` pendentes), `Layouts_Reload_RestoresActiveLayout`, `Layouts_ProjectSwitch_ClearsViewCache`, `Layouts_UnopenedLayoutRequests_SurviveTtl`.
- Verify: playwright `layouts`, `context-menu`, `pending-persist`.

### Task 5: Requisições e interações por layout

**Files:** `index.html`, `e2e/layouts.spec.js`, `e2e/request.spec.js`

- [ ] `addRequest`: `layoutId` = layout ativo; o `R<n>` é global: piso lido uma vez no `loadProject` (Task 3) e mantido com o máximo do layout ativo.
- [ ] `requestsMd`: `layouts: project.layouts.length`, `requests` mescladas (cabeçalho `· N layouts` e `layout:` por item já existem no core). Guarda de vazio, contagens dos toasts (`:1994`, `:2000`), cache `_md` e habilitação de Copiar/Exportar passam a usar a lista **mesclada**: exportar funciona com o layout ativo sem requisições.
- [ ] Ajustes: lista as requisições do layout ativo; linha recolhida "outros layouts: config (2), replay (1)" (somente contagem).
- [ ] `deadInteractions` e a lista de Interagir usam `interactionsFor`, com a lista filtrada guardada em `project` no `loadProject` (não recalculada a cada render, `:2638`).
- e2e: `Request_MultiLayout_IdsUniqueAndExportGrouped`, `Request_Export_WorksWhenActiveLayoutHasNone`, `Layouts_Interactions_FilteredByLayout`; os testes de `request.spec.js` seguem verdes sem edição.
- Verify: playwright `request`, `layouts`.

### Task 6: Backup do Reanalisar e fechamento de cargas

**Files:** `index.html`, `lib/layers-core.js` (`layoutBackupPaths`), `e2e/layouts.spec.js`

- [ ] `backupLayout` (S2.21) grava também o mock de cada layout declarado, mantendo o caminho relativo (ou prefixando o `id` do layout) para que dois `.../index.html` não se sobrescrevam (`layoutBackupPaths` hoje guarda só o basename). Falha de **leitura** de outro mock vira aviso no toast; falha de **escrita** segue tudo-ou-nada, como hoje (`:1830-1833`). Se o diff passar de ~40 linhas, parar e registrar como adiado para a S9.1c.
- [ ] Reanalisar: mantém o layout ativo (não limpa `layoutMap`) e esvazia só o `viewCache` do ativo; requisições seguem a regra atual. `driftAck` é por caminho e vale para o layout montado (ruling d).
- [ ] Zerar interface: limpa `layoutMap[baseKey]`, o `viewCache` e, via `clearLayoutEntries`, as chaves `base|*`.
- e2e: `Layouts_Reanalisar_BacksUpAllLayoutMocks` (incluindo dois mocks com o mesmo basename), `Layouts_Reanalisar_KeepsActiveLayout`, `Layouts_ResetUi_ClearsLayoutKeys`.
- Verify: playwright `restructure*`, `layouts`.

### Task 7: Perf, docs e fechamento da fatia

**Files:** `e2e/perf.spec.js`, `docs/**`, `README.md`, `changelog.d/feature-<id>-s9-1a-layouts-foco.md`

- [ ] Perf: `layout-switch/<fixture>/switch-ms` (de `switchLayout` até `scan`) comparado com um `loadProject` frio do mesmo mock (A/B útil: o guarda de orbit com 1 shadow root é quase tautológico, então vira só smoke: planos do layout ativo = `planeCensus`); mediana de 3 execuções; ids em `EXPECTED`; orçamento do `switch-ms` registrado na § D. Teste de vazamento: A→B→A→B mantém 1 shadow root e `planeCensus` igual ao do layout aberto. O Executor roda; o Workhorse escreve.
- [ ] `docs/ARCHITECTURE.md` (§ Layouts: modelo, chaves, Foco, limites a→h), `docs/layers-json.md` (`layouts`, regra do `main`, `interactions[].layout`), `docs/RELEASE-CHECKLIST.md` (§ D medidas, § E fixture), `README.md`, decisions doc ("Divergências do código (S9.1a)": sem Espalhar, Aplicar só no ativo).
- [ ] Changelog (≤ 2048 B, bloco `### Perf` medido), tracker (S9.1a `done`, S9.1 segue `in-progress` até 9.1c; rebuild `roadmap.data.json`/`_index.md`), `phase-close-gate` Section A, `pr-precheck`.
- Verify: `npm test`, `npx playwright test` das áreas tocadas e `perf.spec.js`, `precheck.py` sem BLOCKED.

## Fatias seguintes (fora desta branch)

| Leaf | Escopo | Depende de |
|---|---|---|
| **S9.1b** Cobertura % | `coverageModel` puro (regiões detectadas: `[hidden]`, `role=tab`, `<dialog>`, rotas, `.html` de entrada; fórmulas `cob_reg`/`cob_el`; regra 85 % / +15 p.p. / 1.500 planos / 60 % de nós comuns), painel de resultado, `layers.json` sugerido por varredura (`deriveManifest` multi-HTML) | S9.1a (lista de layouts) |
| **S9.1c** Espalhar | hosts por layout (LRU de 2 completos, demais em LOD L0–L1), offsets no `world`, câmera de visão geral, popover "Ver todos / 1–N" + distância, aviso > 1.500 planos, undo com `layoutId`, watch/drift global, aviso de escopo `all`, Aplicar junta tudo | S9.1a + medições da 9.1a |

## Verification

- `npm test` verde após cada task (Vitest, core + guards).
- `npx playwright test e2e/layouts.spec.js e2e/multi-state.spec.js e2e/pending-persist.spec.js e2e/request.spec.js e2e/context-menu.spec.js e2e/perf.spec.js` (porta 5180 livre).
- Manual: `npm run dev` → `/?layers=fixtures/multi-layout/`: faixa LAYOUTS com chips; trocar recarrega só o mock; seleção/explosão voltam ao retornar; ajuste pendente em `config` aparece como badge; requisição em dois layouts exporta agrupada; `/?layers=fixtures/traval/` não mostra a faixa; Network sem requisições externas.
- `python -X utf8 ~/.claude/scripts/gates/precheck.py --root .` sem BLOCKED.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 1. funções puras + testes | gen | Standard | Workhorse | contratos de chave e compatibilidade pedem julgamento |
| 2, 4. carga por layout, view cache, pendentes | gen | Standard | Workhorse | multi-região de `loadProject` e persistência |
| 3, 5, 6. faixa, requisições, backup | gen | Standard | Workhorse | integração em `index.html` |
| 7. docs/changelog/roadmap | gen | Standard | Workhorse | prosa e métricas |
| 7. rodar perf e suíte, resumir | gen | Mechanical | Executor | comando + `exit_code` + cauda; validado pelo chamador |
| 1, 2, 4, 5. revisão por task | review | Architectural | Architect | regra 5; `adversarial-reviewer` em Opus (chaves e persistência) |
| 3, 6. revisão por task | review | Architectural | Architect | o model-gate rejeita revisor Sonnet |
| Pre-merge review | review | Architectural | Architect | verifier ≥ generator |

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — nova funcionalidade visível (layouts, seletor, requisições por layout) em várias regiões; a S9.1a não tem issue.
> Draft to be created (via `gh-issue-gate`):
> - **Title**: `feat: add multi-layout model, selector and Foco mode (S9.1a)` (≤72 chars)
> - **Labels**: enhancement
> - **Milestone**: (none)
> - **Body**:
>   ## Context
>   A Layers project mounts a single mock. Repositories with several screens (main, settings, function panels) cannot be covered by one layout. Design approved in the ui-mock boards S91Fluxos and S91Cobertura (V3 hybrid).
>   ## Proposal
>   Optional `layouts` in `layers.json`; a LAYOUTS strip above Camadas; one layout mounted at a time (Foco), reloaded on switch; selection, explode state, camera, pending edits and manual requests bound to the layout; requests export grouped by layout; `pendingKey|layoutId` and per-layout `stateMap`. Coverage % (S9.1b) and Espalhar (S9.1c) are separate slices.
>   ## Acceptance criteria
>   - [ ] A project without `layouts` behaves and persists exactly as before.
>   - [ ] With `layouts`, the strip lists them; switching mounts only the chosen mock (1 shadow root).
>   - [ ] Selection, explode and camera return when going back to a layout; pending edits survive the switch.
>   - [ ] Requests carry the layout id, ids stay unique, the Markdown export groups by layout.
>   - [ ] Layout switch cost stays within the measured budget (switch-ms vs a cold load of the same mock).
>   ## Refs
>   `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md`, `docs/text-specs/2026-10-17-s9-1-layouts-newlogic.md`

> [!DECISION] phase-intake
> Classification: **micro** `S9.1a` under **S9.1 Layouts newlogic** (meso, `in-progress`), parent **S9 Layouts múltiplos**, target **Unreleased**. Registrar também `S9.1b` (cobertura %) e `S9.1c` (Espalhar) como micro `registered` no primeiro commit da branch.
> Current tree (relevant slice): Unreleased › S9 Layouts múltiplos › S9.1 (in-progress) — S3.5 `done`.
> Fork of an existing row? **No** (fatiamento planejado do meso).
> - **Option A**: 3 micro-leaves, código da S9.1a nesta branch (recomendada; escolha do usuário)
> - **Option B**: S9.1a + cobertura numa branch só

> [!DECISION] execution
> Method: **Subagent-driven** (tasks com interfaces explícitas; precisa aparecer no Atlas com `S9.1a Task <id>`).
