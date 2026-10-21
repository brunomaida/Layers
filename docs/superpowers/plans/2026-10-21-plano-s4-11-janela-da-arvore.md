---
title: "Plano S4.11 — Janela da árvore: foco e congelamento"
type: plan
solution: Layers
status: draft
created: 2026-10-21
---

# Plano S4.11 — Janela da árvore: foco e congelamento

Troca o congelamento do início da faixa da árvore (`_treeFrozen` em `index.html`) por slots estáveis por linha: a janela segue o scroll e só mantém montada a linha com foco, sem mover nenhum nó sob o textarea.

## Context

A S4.10 monta só as linhas visíveis da Hierarquia e dos Elementos entre dois espaçadores (`data-tree-pad`). O `sc-for` do `support.js` (gerado, não editar) usa `key: i`, o índice na lista (`support.js:630`). A faixa começa em `start`, então mover `start` desloca todos os slots: o DOM de um slot passa a mostrar outra linha. Para o foco de textarea/teclado não sumir, a S4.10 congela `start` e só deixa o fim crescer (`treeFocus`, render em `index.html:3339`). A revisão da S4.10 achou três defeitos dessa saída:

| # | Defeito | Causa |
|---|---|---|
| 1 | clique em linha se perde ou age em outro nó depois de rolar com a textarea focada | o blur solta o congelamento e `start` salta entre o `mousedown` e o `click` |
| 2 | scroll para cima perto do início congelado deixa a vista em branco | acima de `fz.start` só há espaçador; o caminho `delta < TREE_SCROLL_STEP` não solta o congelamento |
| 3 | o fim congelado cresce sem limite | `fz.end = max(fz.end, tw.end)` a cada render, sem teto |

O desenho candidato da linha do roadmap (montar a lista inteira enquanto há foco) não vale como está: ao montar a partir do índice 0 o slot do textarea passa a exibir outra linha, o foco cai e digitar escreveria na regra errada. **Decisão do dono (2026-10-21): slots estáveis.** A lista passa a ter 1 slot por linha, e cada linha sempre ocupa o slot do seu índice. Fora da faixa o slot renderiza vazio (sem DOM), com um único espaçador por trecho vazio. Nenhum `start` se move, então não há o que congelar.

Reuses: `LayersCore.treeWindow` (`lib/layers-core.js:959`), `TREE_ROW_H`/`TREE_PAD`/`TREE_OVERSCAN`/`TREE_SCROLL_STEP` (`index.html:1145`), `treeSync`/`treeFocus`/`treeBlur`/`observeTree`/`revealInTree` (`index.html:2654-2715`, `3476`), `e2e/tree-helpers.js` (`treeWindowState`), `e2e/tree-perf-helpers.js` (`inflateTraval`), ids `tree/*` de `e2e/perf.spec.js`.
Out of scope: visual da árvore (congelado), memo de `treeRows` (S4.7), troca do `key: i` no `support.js`, S4.12+.

## Design: Architecture & Flows

Micro: só a janela da árvore dentro de `index.html` + a função pura em `lib/layers-core.js`. Nenhum componente vizinho muda; sem mudança visual, logo sem mockup.

### Topology (micro)

```
ANTES (faixa [A,B), key = índice na faixa)         DEPOIS (N slots, key = índice da linha)

 pad top ┐                                          slot 0..a-1   gap(h) no slot a0, demais vazios
 slot 0  │ linha A  ◀─ textarea em foco             slot a..b-1   linhas da faixa (viewport)
 slot 1  │ linha A+1                                slot k..k+10  linhas após o foco (Tab segue)
 ...     │          start congelado (_treeFrozen)   slot k        linha com foco (textarea)
 pad bot ┘          fim cresce sem teto             slot b..N-1   gap(h) no slot b0, demais vazios

 mover start ⇒ todo slot muda de linha ⇒ foco cai   linha i está sempre no slot i ⇒ nada se move
```

### Flow: foco e scroll

```
 foco textarea/Tab ──▶ treeFocus: _treeKeep = índice da linha ──▶ render: faixa = janela(scroll) ∪ [keep, keep+1+OVERSCAN)
 scroll (cada 110 px) ─▶ treeSync: só treeWin.top muda; a faixa segue a vista, a linha com foco permanece montada
 blur real ────────────▶ treeBlur: _treeKeep = null (os slots não mudam, o clique em andamento completa)
 blur com !document.hasFocus() ─▶ ignorado (alt-tab não solta a linha)
```

## Implementation Outline

Plano de implementação (executa sem nova parada de revisão). Os passos estão em `### Task` abaixo.

### Task A: Tracker e branch

Reservar o id (`S4.11` já existe como `registered`): `git checkout -b feature/261021-<issue>-s4-11-janela-foco` a partir de `develop` (a issue vem do `gh-issue-gate`). Primeiro commit: `docs/roadmap.md` linha S4.11 → `in-progress` com a coluna `plan` ligada a este plano, mais `roadmap.config.json` e rebuild de `roadmap.data.json` (`python ~/.claude/design/_build_proto.py`). Verificação: `git diff --stat` só em `docs/`.

### Task B: Testes de regressão (vermelhos antes do código)

Em `e2e/virtual-tree.spec.js`, fixture de 1.500 tags já usada, nomes `VirtualTree_<Cenario>_<Esperado>`:
1. `VirtualTree_CliqueEmLinhaAposRolarComTextareaFocada_SelecionaONoClicado`: foca a textarea, rola 2 telas, clica numa linha montada; `select` cai no `data-node-id` clicado (defeito 1).
2. `VirtualTree_RolarParaCimaComTextareaFocada_VistaCoberta`: foca, rola para baixo uma tela e volta 60 px; `expectCovered` (defeito 2).
3. `VirtualTree_TextareaFocadaRolandoAteOFim_MontadasNaoCrescem`: foca e rola até o fim em passos; `mounted` ≤ linhas da vista + 2 × `OVERSCAN` + 1 (defeito 3).
Os testes 1-3 devem falhar em `develop`; os 8 testes `VirtualTree_*` existentes continuam como estão. Verificação: `npx playwright test e2e/virtual-tree.spec.js` mostra exatamente 1-3 falhando.

### Task C: Spike go/no-go do custo dos slots

Protótipo descartável em `render()`: lista de N slots (item vazio compartilhado `GAP_NONE`) com o `sc-for` atual. O `sc-for` copia `vals` (todo o objeto de estado) a cada item (`support.js:628`), então N=1.500 slots podem custar mais do que a faixa de ~60 linhas. Medição em janela exclusiva do controlador (nenhum subagente roda testes), mediana de 3 execuções ABABAB, base = `develop`: `tree/1500-tags/hover-ms`, `select-ms`, `scroll-frame-ms` e `tree/traval/*`.
Critério (minha escolha, ajustável): **go** se `hover-ms` ≤ 20 ms e `select-ms` ≤ 200 ms nos 1.500 tags (S4.10: 17,1 e 181,9) e Traval sem regressão > 10 %. **No-go** → Task D′.

### Task D: Slots estáveis (caminho go)

1. `lib/layers-core.js`: `treeSlots({ n, win: { start, end }, keep, overscan, rows, rowH })` pura, ao lado de `treeWindow`: devolve as faixas montadas (`win` ∪ `[keep, keep+1+overscan)`) e a altura de cada trecho vazio, exportada em `LayersCore`. Testes Vitest `TreeSlots_*` em `test/layers-core.test.js`: sem foco, foco dentro da faixa, foco fora da faixa (2 faixas e 1 trecho vazio no meio), foco no fim da lista, `rows` com alturas medidas.
2. `index.html` render (~3338-3341): substituir a união por `_treeFrozen` por `treeSlots`; a lista vira N itens: linha real nas faixas, `{ isGap: true, gapH }` no primeiro slot de cada trecho vazio e `GAP_NONE` nos demais. `_treeA/_treeB` passam a descrever a faixa de viewport (usados por `treeVerify` e `revealInTree`).
3. Templates (Hierarquia e Elementos, linhas 304-334 e 337-364): `<div data-tree-pad>` de topo e de base saem; dentro do `sc-for` entra `<sc-if value="{{ t.isGap }}"><div data-tree-pad style="height:{{ t.gapH }}px"></div></sc-if>`. O atributo `data-tree-pad` fica para `treeWindowState` seguir tratando como espaçador.
4. `_treeFrozen` → `_treeKeep` (índice ou `null`): `treeFocus` grava o índice (mantém a exceção do foco por ponteiro em botão, `_treePtr`); `treeBlur` solta, exceto com `!document.hasFocus()`; `observeTree` (2710) solta se o foco saiu sem blur; `revealInTree` (2658) e `treeSync` perdem os ramos `fz`/`_treeFrozen`; `treeSync` mantém o `blur()` do botão focado por mouse só se os testes existentes exigirem (a linha desmontada já tira o foco).
Verificação: `npm test` e `npx playwright test e2e/virtual-tree.spec.js` verdes (os 3 testes da Task B passam); `LAYERS_VISUAL=1 npx playwright test e2e/tree-visual.spec.js` com diff zero; DevTools → Network sem requisições externas (regra "Recursos sem rede").

### Task D′: Fallback se a Task C der no-go

Mantém o congelamento e corrige os três defeitos sem slots: (a) teto no fim congelado = fim da vista + `OVERSCAN` (defeito 3); (b) o caminho de delta pequeno em `treeSync` também testa `w0.start >= fz.start`, soltando o foco quando a vista passa acima do início (defeito 2); (c) soltar o congelamento só ~250 ms depois do blur real e ignorar blur com `!document.hasFocus()` (defeito 1). Limitação aceita e documentada: o scroll para cima além do início congelado ainda solta o foco da textarea. Reavaliar com o dono antes de executar.

### Task E: Medição final e docs

Medição em janela exclusiva (ABABAB, mesmas métricas da Task C) contra `develop`. Atualizar `docs/ARCHITECTURE.md` (parágrafo da janela da árvore, linha 166: sai "início congelado ... limitações conhecidas na S4.11", entra slots estáveis), `docs/RELEASE-CHECKLIST.md` § D (item da árvore virtualizada, linha 73: medido da S4.11), `changelog.d/feature-261021-<issue>-s4-11-janela-foco.md` (`### Fixed` e `### Perf` measured, ≥1 bullet de ≥20 caracteres), linha S4.11 → `done` no `roadmap.md` e rebuild. Verificação: `python ~/.claude/hooks/docs-doctor.py` limpo, `branch-lifecycle` § sequência final (testes, `adversarial-reviewer`, `phase-close-gate`, `pr-precheck`).

### Task F: Rodar suítes e resumir

Rodar `npm test`, `npx playwright test e2e/virtual-tree.spec.js e2e/tree-visual.spec.js` (e `e2e/perf.spec.js` na janela exclusiva) e devolver `exit_code`, contagem passou/falhou e a cauda da saída. Formato: `exit_code=<n>; passed=<n>; failed=<n>; tail=<últimas 15 linhas>`; recusas `COULD NOT RUN`.

## Critical Files

| Arquivo | Mudança |
|---|---|
| `index.html` | render da janela (~3338), `treeFocus`/`treeBlur`/`treeSync`/`observeTree`/`revealInTree`, templates da Hierarquia e dos Elementos (linhas 304-364) |
| `lib/layers-core.js` | `treeSlots` pura ao lado de `treeWindow` (959) e export |
| `test/layers-core.test.js` | `TreeSlots_*` |
| `e2e/virtual-tree.spec.js` | 3 testes de regressão (Task B) |
| `docs/ARCHITECTURE.md`, `docs/RELEASE-CHECKLIST.md`, `docs/roadmap.md`, `docs/roadmap.config.json`, `docs/roadmap.data.json`, `changelog.d/` | Tasks A e E |

## Verification

1. `npm test` verde (Vitest, inclui `TreeSlots_*`).
2. `npx playwright test e2e/virtual-tree.spec.js`: os 8 testes existentes + os 3 novos verdes; antes da Task D os 3 novos falham.
3. `LAYERS_VISUAL=1 npx playwright test e2e/tree-visual.spec.js`: diff zero (visual congelado).
4. `e2e/perf.spec.js` ids `tree/*` em janela exclusiva, ABABAB: dentro do critério da Task C, com as medianas registradas no changelog e no checklist § D.
5. Manual no navegador (`npm run dev`, `?layers=fixtures/traval/`): abrir o código de uma regra, focar a textarea, rolar, clicar em outra linha, voltar com Tab e alt-tab, e conferir que o texto digitado fica na regra certa.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| A. tracker e branch | gen | Standard | Workhorse | edição de linha do roadmap + rebuild |
| B. testes de regressão | gen | Standard | Workhorse | autoria de testes (exclusão rule 7) |
| C. spike go/no-go | gen | Standard | Workhorse | protótipo em hot path de UI; medição pelo controlador |
| D, D′. slots estáveis (ou fallback) | gen | Standard | Workhorse | lógica de render e foco; desenho já decidido |
| E. medição final e docs | gen | Standard | Workhorse | prosa de docs e changelog |
| F. rodar suítes e resumir | gen | Mechanical | Executor | rodar comando e resumir, o chamador valida `exit_code` e formato |
| D. revisão por tarefa | review | Architectural | Architect | alto custo de erro: foco e identidade de nó sob digitação |
| Pré-merge | review | Architectural | Architect | verificador ≥ gerador |

## Decisões

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — corrige 3 defeitos de comportamento achados na revisão da S4.10 e toca render, núcleo e docs.
> Draft to be created (via `gh-issue-gate`):
> - **Title**: `fix: tree window focus and freeze defects (S4.11)` (≤72 chars)
> - **Labels**: bug
> - **Milestone**: (none)
> - **Body**: Context (3 defeitos da tabela acima) / Proposal (slots estáveis por linha, `treeSlots`, `_treeKeep`) / Acceptance criteria (3 testes novos verdes, `tree-visual` diff zero, `hover-ms` ≤ 20 ms e `select-ms` ≤ 200 ms em 1.500 tags)

> [!DECISION] phase-intake
> Classification: **micro** `S4.11` (leaf existente, `registered`) under **S4 Performance** (`in-progress`), target **Unreleased**.
> Current tree (relevant slice): Unreleased › S4 Performance › S4.10 done · S4.11 registered.
> Fork of an existing row? **No** — executa a linha S4.11 já registrada.
> - **Option A**: executar a S4.11 como está (recomendado)
> - **Option B**: antes, abrir a leaf do Atlas embed (spec `docs/text-specs/2026-10-19-atlas-embed-mode.md`, ainda sem linha no tracker)

> [!DECISION] execution
> Method: **Native** (inline; a Task F, Mechanical, vai ao subagente `executor`; medições de performance só na janela exclusiva do controlador).
