---
title: "S3.5 — Menu de contexto, \"Explodir daqui\" e Requisição — Implementation Plan"
type: plan
solution: Layers
status: draft
created: 2026-10-17
---

# S3.5 — Menu de contexto, "Explodir daqui" e Requisição — Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox syntax. Dispatch descriptions `S3.5 Task <id> …`; commit subjects end `(S3.5 Task <id>)` (Atlas convention).

## Context

Leaf **S3.5** (`in-progress`, plano de UI já mergeado em #84). O design está fechado: boards `S35Menu.dc.html` e `S35Requisicao.dc.html` (`docs/design/ui-mock/`), decisões em `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md` (Ajustes fica na coluna esquerda; Requisições persistem como "alvo a confirmar"). Hoje o botão direito no palco é bloqueado (`onContextMenu="{{ noCtx }}"`, `index.html:201`, `noCtx` em ~2487). Esta branch entrega, **ainda com um único layout** (o `layoutId` implícito é `main`; a S9.1 depois torna `explodeFrom`/`collapseAt` por layout):

1. menu de contexto L0–Ln com o selecionado em destaque;
2. "Explodir daqui" / "Recolher até aqui" (explode só o ramo na vista plana);
3. "Requisição" → entradas no painel Ajustes + seção "Requisições Manuais" (Markdown copiável/exportável), persistidas em `layers/v1/pending › requests[]`.

Visual congelado: o menu e as entradas reusam os tokens existentes (`--bg2`, `--line1`, `--shadow2`, `--sel`).

## Design: Architecture & Flows

### Topology (micro — `index.html` + `lib/layers-core.js`)

```
 botão direito (palco / linha da Árvore)
        │ closest('[data-plane]') ou hoverId
        ▼
 ┌─────────────────────┐   ctxMenuModel()   ┌──────────────────────────┐
 │ state.ctx {x,y,id}  │ ─────────────────▶ │ LayersCore (puro, testado)│
 │ [NOVO] onContextMenu│                    │ ctxMenuModel  branchZ     │
 └─────────┬───────────┘                    │ validRequest  requestsMd  │
           │ ações                          │ get/setPending restorePlan│
   ┌───────┼──────────────┐                 └──────────────────────────┘
   ▼       ▼              ▼
 Explodir  Recolher    Requisição
 explodeFrom collapseAt  state.requests[] ──▶ painel Ajustes (Requisições)
   │          │              │                    │ Copiar / Exportar .md
   ▼          ▼              ▼                    ▼
 scene()/cam() z do ramo   writePending()    writeText(layers-requests.md)
 session.camera            pending.requests[]
```

### Mockup: menu de contexto e Ajustes

```
 palco (vista plana)                         Ajustes (coluna esquerda, sob a Árvore)
 ┌──────────────────────┐                    ┌──────────────────────────────┐
 │ .studies-toolbar     │ <-- NOVO           │ Ajustes        1 · 3  Ações ▾│
 │ L3 · studies.css › 41│                    │ De → Para (existente)        │
 │ CAMADAS              │                    │ ── Requisições (3) ── <-- NOVO│
 │ ● L0 html            │                    │ R1 .chart-stage L2 ▸ texto…  │
 │ ● L2 .chart-stage    │                    │ R3 .chip L5  ✕  (expandida)  │
 │ ▌L3 .studies-toolbar›│──┐                 │  alvo: studies.css › … · L88 │
 │   L4 … 6 no ramo     │  │                 │  [bg #3f454d][radius 3px]    │
 │ ░ L5 fora do ramo    │  │                 │  O QUE MUDAR [textarea]      │
 └──────────────────────┘  │                 │  ⊕ Mostrar no palco  salvo   │
   ┌──────────────────────┐│                 │ ▸ Requisições Manuais Copiar │
   │ ▧ Explodir daqui     ││                 └──────────────────────────────┘
   │ ✎ Requisição         │◀┘
   └──────────────────────┘
```

## Decisions

| # | Decisão | Escolha |
|---|---|---|
| 1 | Onde mora a lógica | Regras puras em `lib/layers-core.js` (único alvo do Vitest, sem jsdom); `index.html` só liga estado/UI. E2E Playwright cobre a UI |
| 2 | z do ramo em vista plana | `branchZ(depth, rootDepth, collapseAt, spacing) = (min(depth, collapseAt ?? ∞) − rootDepth) × spacing` só para nós do ramo; fora dele z = 0. `spacing` efetivo = `state.spacing` (o global segue 0 em flat) |
| 3 | Câmera | `cam()` soma a extensão do ramo ao `spreadX` quando `flat && explodeFrom`; chave de cache inclui `explodeFrom`/`collapseAt` |
| 4 | Um ramo por vez | Segundo "Explodir daqui" troca a raiz; "Recolher até aqui" na raiz zera `explodeFrom` |
| 5 | `Plane.spacing` | Nós do ramo recebem `spacing` efetivo (wireframe/sombra coerentes); demais mantêm o global |
| 6 | Persistência | `explodeFrom`/`collapseAt` em `layers/v1/session` (ao lado da câmera; Reanalisar do 0 limpa). `requests[]` na mesma entrada de `pending` (`pendingKey`) |
| 7 | "Alvo a confirmar" | Hash diferente: `changes` descartados (como hoje), `requests` mantidas com `confirm:true`; entrada só com requests não é apagada; não contam no Salvar nem no Aplicar |
| 8 | Esc / clique fora | Menu entra em `escape()` (`index.html` ~1917) e em `onDocDown` (~1627); textarea da Requisição usa `stopPropagation` em `onKeyDown` (padrão de `codeBuf`) para as teclas globais não dispararem |
| 9 | Exportar | `writeText('layers-requests.md', …)` na pasta conectada (regra do CLAUDE.md); sem pasta, só Copiar |

## Review Focus

- Botão direito num plano **não** selecionado seleciona antes de abrir o menu; em `solo` com `pointerEvents:none` o alvo cai em `hoverId`/nada → não abre menu vazio.
- Orbitar com botão direito não pode regredir (`onDown` já ignora `button===2`); `dragged` não abre menu.
- Nó fora do ramo ou ramo some após Reanalisar/trocar projeto: `explodeFrom` apontando para id inexistente deve ser ignorado e limpo.
- `pending` com só `requests` sobrevive ao `writePending` (hoje grava `null` se `changes` vazio) e o teto `PENDING_CAP` não derruba requests.
- Entrada persistida inválida (request sem `id`/`text` string) não pode derrubar `changes` válidos nem o carregamento.
- Texto da Requisição com `\`\`\``, `|`, quebras e 10 kB: Markdown gerado continua parseável; `Exportar` não escreve fora da pasta (`safePath`).
- Orbit ≥ 50 fps com 1.500 nós e ramo explodido (`e2e/perf.spec.js`); `groupPlanesByZ`/`viewCuller` assumem z global em arrasto.

## Critical Files

- `lib/layers-core.js` — novas funções puras e extensão de `getPending`/`setPending`/`restorePlan` (~1155–1208); export em `LayersCore` (~1563).
- `index.html` — stage `:201`, `noCtx` `~2487`, `scene()` `2163–2224` (z em `2176–2179`), `cam()` `1772`, `escape()` `~1917`, `onDocDown` `~1627`, painel Ajustes `339–377`, `writePending` `1131`, `loadProject` restore `1322–1328`, `sessionSnapshot` `~1117`, handlers `this.H` `1558`.
- `test/layers-core.test.js`, `e2e/context-menu.spec.js` (novo), `e2e/request.spec.js` (novo), `e2e/pending-persist.spec.js`, `e2e/perf.spec.js`.
- `docs/ARCHITECTURE.md` (Módulos, Estado, Persistência, Fluxo), `docs/RELEASE-CHECKLIST.md` § C/§ D, `docs/roadmap.md`, `docs/design/ui-mock/` (só se o código divergir do board), `changelog.d/`.

## Implementation Outline

Tasks (Atlas label `S3.5 Task <id>`):

### Task 1: Core — modelo do menu e z do ramo

**Files:** Modify `lib/layers-core.js`; Test `test/layers-core.test.js`.

**Interfaces — Produces:**
- `branchZ(depth, rootDepth, collapseAt, spacing) → number`
- `ctxMenuModel({ nodes, selId, flat, explodeFrom, collapseAt }) → { header:{ name, depth }, layers:[{ d, kind:'ancestor'|'selected'|'descendant'|'outside', count }], items:[{ id:'explode'|'collapse'|'request', label, hint }] }`
- `branchOf(nodes, byId, explodeFrom) → Set<id>|null` (ids do ramo; `null` se a raiz não existe)

- [ ] **Step 1: testes (falham primeiro)** `describe('BranchZ')`, `describe('CtxMenuModel')`: `Flat_SemRamo_OferecaExplodirERequisicao`, `Explodido_DockOn_SemExplodir`, `NoDoRamo_OferecaRecolherERequisicao`, `RaizDoRamo_RecolherDesfazExplodir`, `FueraDoRamo_NaoOfereceRecolher`, `LayersKinds_AncestorSelectedDescendantOutside`, `BranchZ_CollapseAt_ClampaProfundidade`, `BranchOf_RaizInexistente_Null`. Contagens por nível = nº de nós com `depth===d`; hints `só o ramo`, `→ Ajustes`, `L{n+1}+ → L{n}`.
- [ ] **Step 2:** `npx vitest run test/layers-core.test.js -t "BranchZ|CtxMenuModel"` → FAIL.
- [ ] **Step 3:** implementar e exportar as três funções (regras do board "Quando cada item aparece").
- [ ] **Step 4:** mesmo comando → PASS; `npm test` verde.
- [ ] **Step 5:** commit `feat(core): add context menu model and branch z (S3.5 Task 1)`.

### Task 2: Core — Requisições no pending

**Files:** Modify `lib/layers-core.js`; Test `test/layers-core.test.js`.

**Interfaces — Produces:** `validRequest(r) → boolean` (`id`,`layoutId`,`nodeKey`,`path`,`text` strings, `createdAt` number); `getPending(storage,key) → {savedAt,hash,changes,requests}`; `setPending(storage,key,{hash,changes,requests},now)` grava se `changes.length || requests.length`; `restorePlan(entry,hash) → {keep,dropped,requests,confirm}` (`confirm=true` quando o hash difere). Entradas antigas sem `requests` leem como `[]`.

- [ ] **Step 1: testes** `GetPending_SemRequests_LeComoVazio`, `GetPending_RequestInvalida_DescartaSoRequests`, `SetPending_SoRequests_NaoApaga`, `SetPending_Teto200Changes_NaoDerrubaRequests`, `RestorePlan_HashDiferente_MantemRequestsComConfirm`, `RestorePlan_HashIgual_ConfirmFalse`.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar. **Step 4:** PASS + `npm test`.
- [ ] **Step 5:** commit `feat(core): persist manual requests in pending (S3.5 Task 2)`.

### Task 3: Core — Markdown das Requisições Manuais

**Files:** Modify `lib/layers-core.js`; Test `test/layers-core.test.js`.

**Interfaces — Produces:** `requestsMarkdown({ project, version, stamp, mock, layouts, requests, confirm }) → string` no formato do board (`## Requisições Manuais · <projeto> · N`, comentário `<!-- Layers … -->`, `### R1 · seletor (L3)`, linhas `alvo`, `caminho`, `caixa`, `estilos`, `pedido`, opcional `ajuste pendente`, `texto`, `×N`, `(manual: fonte TS)`, `layout:` só com >1 layout; marca `alvo a confirmar` quando `confirm`).

- [ ] **Step 1: testes** `RequestsMarkdown_UmaRequest_FormatoDoBoard`, `_VariosUsos_MarcaXN`, `_TextoComCercaECrases_NaoQuebra`, `_SemEstilos_OmiteLinha`, `_MultiLayout_IncluiLayout`, `_Confirm_MarcaAlvoAConfirmar`, `_Lista_Vazia_String_Vazia`.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** commit `feat(core): render manual requests as markdown (S3.5 Task 3)`.

### Task 4: UI — estado e cena do ramo explodido

**Files:** Modify `index.html`; Test `e2e/context-menu.spec.js` (parte 1).

**Interfaces — Consumes:** Task 1 (`branchZ`, `branchOf`). **Produces:** `state.explodeFrom`, `state.collapseAt`, ações `explodeHere(id)`, `collapseHere(id)`.

- [ ] **Step 1: e2e** `Explode_FlatBranch_OnlyBranchGetsDepth`, `Collapse_AtL5_DeeperBackToL5Plane`, `Explode_Reanalisar_Clears`, `Explode_Reload_RestoresFromSession`. Fixture `fixtures/axai/`, `readNodes`/`treeRow`.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** em `scene()` calcular z do ramo (flat) usando `branchZ`; `Plane.spacing` efetivo; `cam()` soma a extensão do ramo ao `spreadX` e à chave de cache; `explodeFrom`/`collapseAt` em `sessionSnapshot` e leitura; limpar em Reanalisar do 0 e quando o id sumir; badge `▤ Plana · ▧ ramo` no palco, marcador `▧` na linha da Árvore (title do board) e no chip do rail.
- [ ] **Step 4:** e2e PASS + `npm test`. **Step 5:** commit `feat(ui): explode only a branch in flat view (S3.5 Task 4)`.

### Task 5: UI — menu de contexto

**Files:** Modify `index.html`; Test `e2e/context-menu.spec.js` (parte 2), `e2e/menu-visual.spec.js` se aplicável.

**Interfaces — Consumes:** Tasks 1, 4. **Produces:** `state.ctx`, `openCtx(e,id)`, `closeCtx()`.

- [ ] **Step 1: e2e** `ContextMenu_RightClickPlane_SelectsAndOpens`, `_LayersListHighlightsSelected`, `_ExplodirDaqui_Flat`, `_RecolherAteAqui_InBranch`, `_ClickLayerRow_SelectsAncestor`, `_Esc_Closes`, `_OutsideClick_Closes`, `_TreeRow_Opens`, `_RightDrag_DoesNotOpen`.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** trocar `noCtx` por `onCtx` (mantém `preventDefault`); alvo por `closest('[data-plane]')`/`hoverId`; render do menu com `ctxMenuModel` (estilo do board: 222 px, linhas 22 px, submenu 164 px, `--bg2`/`--line1`/`--shadow2`); fechar em `escape()` e `onDocDown`; ações chamam `explodeHere`/`collapseHere`/`addRequest`; `title`/`aria` conforme o board.
- [ ] **Step 4:** PASS + `npm test`. **Step 5:** commit `feat(ui): context menu with layers and branch actions (S3.5 Task 5)`.

### Task 6: UI — Requisição em Ajustes

**Files:** Modify `index.html`; Test `e2e/request.spec.js`, `e2e/pending-persist.spec.js`.

**Interfaces — Consumes:** Tasks 2, 3, 5. **Produces:** `state.requests`, `addRequest(id)`, `setRequestText(rid,t)`, `removeRequest(rid)`, `copyRequests()`, `exportRequests()`.

- [ ] **Step 1: e2e** `Request_FromMenu_AddsEntryWithChipAndTextarea`, `_Typing_DoesNotTriggerGlobalShortcuts`, `_Remove`, `_CopyMarkdown_Toast`, `_ExportMd_WritesInsideFolder`, `_Reload_RestoresRequests`, `_SourceChanged_KeepsWithAlvoAConfirmar`, `_NotCountedInSalvar`.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** registro `{id:'R<n>', layoutId:'main', nodeKey:'<arquivo>|<seletor>|<linha>', path, text, createdAt}` com âncoras `alvo`/`caminho`/`caixa`/`estilos` derivadas de `ruleOf(n)`/`data-src`; bloco "Requisições" no painel Ajustes (`339–377`), entradas recolhida/expandida, ações no menu `Ações ▾` (“Copiar requisições (Markdown)”, “Exportar requisições…”); `writePending` envia `requests` e não apaga entrada só-requests; `loadProject` restaura via `restorePlan` (toast “alvo a confirmar”); `badge` “n · m”.
- [ ] **Step 4:** PASS + `npm test`. **Step 5:** commit `feat(ui): manual requests in the Ajustes panel (S3.5 Task 6)`.

### Task 7: Desempenho, docs e fechamento

**Files:** Modify `docs/ARCHITECTURE.md`, `docs/RELEASE-CHECKLIST.md`, `docs/shortcuts.md` (se `ACTIONS` mudar), `docs/roadmap.md`, `docs/roadmap.config.json`, `docs/roadmap.data.json`; Create `changelog.d/feature-<yymmdd>-<N>-s3-5-context-menu.md`; Modify `docs/design/ui-mock/` só se divergir.

- [ ] **Step 1:** `npx playwright test e2e/perf.spec.js` (porta 5180 livre) com ramo explodido a 1.500 nós: `Orbit_Budget_Above50Fps` PASS; registrar números no changelog `### Perf` (measured).
- [ ] **Step 2:** atualizar ARCHITECTURE (Módulos: menu de contexto/Requisições; Estado: `explodeFrom`, `collapseAt`, `ctx`, `requests`; Persistência: `session` e `pending.requests[]`; Fluxo) e RELEASE-CHECKLIST (itens verificáveis do menu e do orbit com ramo).
- [ ] **Step 3:** `phase-close-gate`: S3.5 `done` no roadmap; `python ~/.claude/design/_build_proto.py Layers`; `pr-precheck` limpo.
- [ ] **Step 4:** commit `docs: close S3.5 context menu and requests (S3.5 Task 7)`.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 1, 2, 3. funções puras com teste | gen | Standard | Workhorse | contrato de assinatura + testes; lógica de pending exige julgamento |
| 4, 5, 6. integração em `index.html` | gen | Standard | Workhorse | multi-região do arquivo, cena 3D e persistência |
| 7. docs/changelog/roadmap | gen | Standard | Workhorse | prosa de ADR/arquitetura e métricas, fora de Executor |
| 7. rodar perf e suíte, resumir | gen | Mechanical | Executor | comando + `exit_code` + cauda; validado pelo chamador |
| 4, 6. revisão por task (alto custo: cena e persistência) | review | Architectural | Architect | regra 5; `adversarial-reviewer` em Opus |
| Pre-merge review | review | Architectural | Architect | verifier ≥ generator |

## Verification

- `npm test` verde após cada task (Vitest, só `lib/layers-core.js` + guards).
- `npx playwright test e2e/context-menu.spec.js e2e/request.spec.js e2e/pending-persist.spec.js e2e/menu-open.spec.js e2e/perf.spec.js` (porta 5180 livre; sem outro worktree servindo).
- Manual no browser: `npm run dev` → `/?layers=fixtures/axai/`: botão direito num plano → menu; Explodir daqui (só o ramo ganha profundidade); Recolher até aqui; Requisição → texto → recarregar → permanece; editar o mock → entrada marcada “alvo a confirmar”; DevTools → Network sem requisições externas.
- `python -X utf8 ~/.claude/scripts/gates/precheck.py --root .` sem BLOCKED.

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — nova funcionalidade visível ao usuário (menu de contexto, explodir ramo, requisições) em mais de 2 regiões do código; S3.5 não tem issue vinculada.
> Draft to be created (via `gh-issue-gate`):
> - **Title**: `feat: add context menu, branch explode and requests (S3.5)` (≤72 chars)
> - **Labels**: enhancement
> - **Milestone**: (none)
> - **Body**:
>   ## Context
>   Right-click on the 3D stage is blocked today. S3.5 adds layer-aware tools for validating and requesting visual changes. Design approved in the ui-mock boards S35Menu and S35Requisicao.
>   ## Proposal
>   Context menu listing layers L0–Ln with the selected element highlighted; "Explodir daqui" / "Recolher até aqui" to explode only a branch in the flat view; "Requisição" entries in the Ajustes panel, exported as a "Requisições Manuais" Markdown section, persisted in `layers/v1/pending › requests[]` as "alvo a confirmar".
>   ## Acceptance criteria
>   - [ ] Right-click opens the menu with L0–Ln and the selected node highlighted; Esc and outside click close it.
>   - [ ] "Explodir daqui" explodes only the branch in the flat view; "Recolher até aqui" collapses deeper levels.
>   - [ ] "Requisição" adds an entry to Ajustes with a data chip and a free-text area; the Markdown list can be copied or exported.
>   - [ ] Requests survive reload; if the source changed they are kept marked "alvo a confirmar".
>   - [ ] Orbit stays ≥ 50 fps with a branch exploded at 1,500 nodes.
>   ## Refs
>   `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md`, `docs/text-specs/2026-10-16-s3-5-visual-functions-new.md`

> [!DECISION] phase-intake
> Classification: **meso** `S3.5` (já existente, `in-progress`) under **S3 Ferramentas e UI**, target **Unreleased**.
> Current tree (relevant slice): Unreleased › S3 Ferramentas e UI › S3.5 menu/requisição (in-progress); S9 Layouts múltiplos › S9.1 (in-progress, depois desta).
> Fork of an existing row? **No** (a mesma leaf recebe o código).
> - **Option A**: código de S3.5 em uma branch única com as Tasks 1–7 (recomendada; S3.5 antes de S9.1)
> - **Option B**: separar menu/explodir da Requisição em duas branches se a revisão pedir

> [!DECISION] execution
> Method: **Subagent-driven** (tasks com interfaces explícitas; precisa aparecer no Atlas com `S3.5 Task <id>`).
