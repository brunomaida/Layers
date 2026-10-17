---
title: "S4.7 — Árvore virtualizada (medir, memo, janela condicional)"
type: plan
solution: Layers
status: draft
created: 2026-10-16
---

# S4.7 — Árvore virtualizada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** medir quanto a árvore de camadas custa no frame do orbit e nos renders de hover/seleção; aplicar primeiro o memo das linhas (`treeRows`/`elemRows`) e só montar a janela de linhas (`LayersCore.treeWindow`, espaçadores, `revealInTree` por índice) se a medição depois do memo justificar (decisão D3 do [plano geral da Onda 3](2026-10-16-layers-plano-geral-da-onda-3.md)).

**Architecture:** Task 1 mede o teto com a árvore recolhida (painel e raiz L0) no Traval e num Traval inflado a ~1.500 tags, com e sem a V1 da S4.8 simulada (`pointer-events:none` nos planos), e mede o custo do scroll da árvore. Task 2 tira a construção das linhas do caminho de cada render: memo estrutural sem `selId`/`hoverId`, decoração só das linhas de `selId` e `hoverId` que existem e nenhuma linha da aba inativa; o gate 2 é provisório até o merge da S4.8 e fica final depois do rebase sobre ela. **Tasks 3-5 só rodam com "go" no gate 2 final:** helper puro `treeWindow` ao lado de `viewCuller`, ligação no template e em `render()`, E2E e migração dos seletores crus. Task 6 mede antes/depois alternados sobre `develop` já com a S4.8 e fecha a documentação.

**Tech Stack:** JS puro, Vitest, Playwright (`--project=chromium`; compat em firefox/webkit/chrome/msedge na Task 5).

## Context

Checklist D: "Árvore virtualizada" ([RELEASE-CHECKLIST.md](../../RELEASE-CHECKLIST.md) linha 51) e o orçamento da linha 52 (orbit > 50 fps; hoje ~42 fps no Traval). A leaf S4.7 está em [roadmap.md](../../roadmap.md) linha 65 (`registered`), e `"S4.7"` já é membro de `docs/roadmap.config.json:76`. Na S4.6 a base mediu script ~7,7 ms de um frame de ~23,8 ms: mesmo um teto perfeito da árvore pode não fechar os 50 fps sozinho, e a S4.8 (custo dos planos) ataca o mesmo orçamento.

Superfície verificada (`develop@0da02d6`, branch `docs/261016-0-wave-3-plan`):

| Site | Linhas | Papel |
|---|---|---|
| contêiner rolável | `index.html:270` | `ref="{{ treeScrollRef }}"`, `overflow-y:auto;padding:4px 0`, sem atributo próprio; ref criada em `:1101` |
| template Hierarquia | `index.html:272-302` | `sc-for list="{{ treeRows }}"`; linha de nó com `height:22px` fixo (`:275`), recuo `6 + depth*12` px; linha de código com textarea (`:287-300`) |
| template Elementos | `index.html:303-330` | `sc-for list="{{ elemRows }}"`; linha de nó 22 px (`:306`), linha de código (`:316-328`) |
| `sc-for` | `support.js:635-640` (gerado, não editar) | `list.map` a cada render, `key` = índice (`:639`) |
| painel recolhido | `index.html:246`, `:251`, `:2390` | `toggleTree` desmonta a árvore, mas `render()` continua construindo as linhas |
| linhas Hierarquia | `index.html:2214-2230` | `kidsOf`, busca (`tHit`), `pushRow` recursivo; closures por linha capturam `s`; `:2227` lê `this.els[n.id]` |
| linhas Elementos | `index.html:2232-2257` | construídas em todo render, mesmo com `treeTab === 'hier'`; `ruleCount` alimenta a etiqueta da aba (`:254`) nas duas abas |
| recolher tudo | `index.html:2258-2264` | `collapsible`, `hierAllClosed`, `elemAllClosed`, `treeAllClosed`, `treeCollapseAll` (`:2263`), `noCodeOpen` |
| export | `index.html:2374-2391` | `tq` (`:2374-2375`, `:2379`), `treeQHits`, `noCodeOpen` (`:2376`), `treeHier`/`treeElems`/`elemRows`/`ruleCount` (`:2377`), `treeRows`/`treeOpen`/`toggleTree` (`:2390`), `treeCollapseAll`/`treeAllClosed` (`:2391`) |
| hover de plano | `index.html:1562` | `H.enter` → `setState({ hoverId })` com o id de qualquer plano cruzado (inclusive nó sob ancestral recolhido ou fora do Filtrar), também durante o arrasto |
| hover de linha | `index.html:2225` | `hover: () => this.setState({ hoverId: n.id })` |
| `select()` | `index.html:1779` | abre ancestrais (`treeClosed`), `elOpen`, depois `revealInTree(id)` |
| `codeRow()` | `index.html:1794-1800` | valor da textarea vem de `s.codeBuf[rule.key]` (`:1795`); `rows` = 3..16; nota com `white-space:normal` (quebra com a largura); `resize:vertical` |
| `codeFor()` | `index.html:1782-1792` | lê `s.fileText` e o atributo `style` vivo de `this.els[rule.ids[0]]` |
| `revealInTree()` | `index.html:1821-1826` | `querySelector('[data-node-id=…]')`; com a linha desmontada não rola |
| `componentDidUpdate` | `index.html:1591-1601` | `JSON.stringify` da assinatura persistida (`:1598`) em todo render |
| memos existentes | `index.html:1764-1777` | `visibleMax()` (`this._vm`) e `cam()` (`this._cam`): padrão de chave + `nodes` |
| `viewCuller` | `lib/layers-core.js:751`, export `:1486` | vizinho do helper novo |
| orçamento | `e2e/perf.spec.js:146-153` | `Orbit_Budget_Above50Fps` com `test.fail` citando S4.7 e S4.8; `rec` grava `stddev: 0` (`:18`) |
| predicado de plano | `e2e/perf-helpers.js:147` | `translateZ(` + cursor `pointer`/`crosshair` (`planeCensus`) |

Seletores crus de linha da árvore nos E2E (quebram quando a linha não está montada): `e2e/folder-helpers.js:49` (`selectLayer`, comentário em `:47`; usado por `apply-flow`, `browser-compat` `:77`, `write-log-hash` ×3), `multi-state.spec.js:56` (`.last()`), `manual-marker.spec.js:34-35` e `:54`, `pending-persist.spec.js:17`, `scope-all-equal.spec.js:28`, `snap-fidelity.spec.js:45` e `:49`, `undo-redo.spec.js:19`. `browser-compat` roda em firefox/webkit/chrome/msedge e `apply-flow` em chrome/msedge (`playwright.config.js:4-5`, `:21-25`).

Branch `feature/261016-0-s4-7-virtual-tree` (regra da Onda 3, passo 0 do plano geral: `perf/` não existe em `fact-git-conventions`); o `changelog-draft` deriva o fragmento `feature-261016-0-s4-7-virtual-tree.md`. A leaf já existe no roadmap e na config: o 1º commit só troca o status e linka o plano.

Fora de escopo: navegação por teclado na árvore (colide com S3.3/S7.4); textos de `title` das linhas (S3.3; o prefixo `n.name · L…` não muda); `rail` (`:2209-2213`); custo dos planos (S4.8); o contador do checklist (linha 8); `support.js`.

## Design: Architecture & Flows

Componente único (`render()` do `index.html`) mais um helper puro. O diagrama mostra um render; o ramo `[T3-T5]` só existe com "go" no gate 2 final.

```
 setState (drag yaw/tilt · hover de plano/linha · seleção · busca · scroll da árvore)
        │
        ▼
 render() ─┬─ memo por nodes [T2 NOVO: this._treeNodes]: kidsOf, collapsible, rulesByKey, ruleCount
           │
           ├─ chave estrutural H: nodes, byId, els, treeClosed, treeQ, treeMode, hierCode, isoId,
           │   scope, codeBuf, fileText, changes, treeTab              [T2 NOVO: this._tree]
           │     igual  ──▶ reaproveita linhas + remake[] (zero closures novas)
           │     mudou  ──▶ buildHier(): pushRow como hoje, com isSel = isHov = false
           │
           ├─ decoração: out = rows.slice(); para cada id distinto de {selId, hoverId}
           │   com idx[id] definido: out[idx[id]] = remake[idx[id]](id===selId, id===hoverId)
           │   + linhas de código abertas refeitas por índice              [T2 NOVO: ≤ 2 + abertas]
           │
           ├─ aba inativa: não constrói linhas; rulesByKey/ruleCount vêm do memo por nodes
           │
           ├─ [T3-T5] janela: alturas (22 px ou altura medida da linha de código)
           │   LayersCore.treeWindow({ scrollTop - 4, viewH, rowH: 22, rows, overscan: 10 })
           │     ──▶ { start, end, top, bottom }  ──▶ treeRows = out.slice(start, end)
           │
           ▼
 template: [espaçador top] sc-for (só a faixa) [espaçador bottom]     (invisíveis, mesma altura total)
           onScroll: só setState quando o scroll anda ≥ 110 px (meia sobra) → render() completo,
                     inclusive componentDidUpdate (:1598): medido por tree/1500-tags/scroll-frame-ms
           foco de teclado/textarea no contêiner: start congelado até o blur ([!DECISION])
           ResizeObserver: altura do contêiner e das linhas de código montadas (chave lida no callback)
 revealInTree(id) ──▶ índice na lista completa ──▶ treeWindow(reveal) ──▶ box.scrollTop
```

Contrato do helper (Tasks 3-4):

```
treeWindow({ scrollTop, viewH, rowH, rows, overscan, reveal? })
  rows[i] ...... altura da linha i em px; null/undefined = rowH
  scrollTop .... limitado a [0, total - viewH] (lista encurtada por filtro não deixa faixa vazia)
  devolve ...... { start, end, top, bottom, total, scrollTo }
                 [start, end) = linhas visíveis ± overscan; top/bottom = alturas dos espaçadores
                 scrollTo = null se reveal já está em [top + rowH, top + viewH - rowH],
                 senão o scrollTop que encosta a linha nessa folga (mesma regra de :1824-1825)
```

Sem mockup. Os espaçadores são `div` vazios com altura e mantêm a altura total, então a barra de rolagem fica igual. Nada visível muda, com uma exceção: rolando além da sobra com foco de teclado ou de textarea na árvore, a área fora da faixa fica vazia até o blur ([!DECISION] `focus-empty-area`).

## Global Constraints

- Visual congelado: linha de nó com 22 px, fontes, recuo, cores e barra de rolagem iguais; Destacar/Filtrar, `treeClosed`, recolher tudo e as duas abas continuam funcionando. O `title` das linhas não muda. Única exceção aceita: a área vazia de [!DECISION] `focus-empty-area`.
- `index.html`: âncoras únicas, `grep -c` = 1 antes de substituir; `support.js` intocado; sem mudança no `<head>`, sem rede.
- **Worktree próprio.** Todo o plano roda no worktree da leaf (`.claude/worktrees/s4-7`, Task 0), nunca no checkout principal: ali há 4 `bench/results/*.json` untracked que não podem ser commitados, e `git switch`/checkout no checkout principal está proibido.
- Commits: Conventional Commits em EN com sufixo `(S4.7)`; os comandos `git commit` deste plano não escrevem trailer (D6 do [plano geral](2026-10-16-layers-plano-geral-da-onda-3.md), decisão única da Onda 3 a confirmar com o usuário; se a sessão exigir, o harness acrescenta o trailer de sessão). Nunca `Co-Authored-By` nem atribuição a IA, nada em `develop`/`master`. Nunca `git stash` (o stash é compartilhado entre worktrees; restaurar com `git checkout -- <arquivo>`).
- `bench/results`: nunca `git add bench/results` inteiro; cada `git add` nomeia os arquivos de resultado (os nomes saem do procedimento de árvore limpa).
- Testes `Metodo_Cenario_Esperado`; `npm test` verde antes de cada commit.
- **Wrapper E2E** (todo comando Playwright deste plano roda dentro dele). A S4.8 roda em worktree paralelo e `reuseExistingServer: true` testaria o código de outra branch sem avisar:

```bash
n=0; until mkdir /tmp/layers-e2e.lock 2>/dev/null; do n=$((n+1)); [ "$n" -ge 60 ] && { echo "COULD NOT RUN: stale lock"; exit 1; }; sleep 5; done
trap 'rmdir /tmp/layers-e2e.lock' EXIT
code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5180/); [ "$code" = "000" ] || { echo "COULD NOT RUN: port 5180 busy ($code)"; exit 1; }
npx playwright test --project=chromium <specs>
```

- **Tempo do wrapper.** A espera da trava (até 300 s) soma ao tempo da suíte. As execuções de `e2e/perf.spec.js` rodam com `run_in_background: true` (fora do limite de 600 s do Bash); as specs curtas usam `timeout: 600000`. Se o shell morrer antes do `trap` (timeout, kill), a trava fica: confirmar que nada responde em 5180 (`curl` dá `000`) e nenhum Playwright roda, e removê-la à mão com `rmdir /tmp/layers-e2e.lock`.
- **Procedimento de árvore limpa** (Tasks 1, 2 e 6), sempre no worktree da leaf. `writeBench` grava `git.dirty` a partir de `git status --porcelain`, e o arquivo de resultado novo fica untracked. Por isso, depois de cada execução, mover o arquivo para `$SCRATCH/s47/` (scratchpad da sessão, o mesmo em todas as Tasks) e trazer os três de volta antes da tabela:

```bash
mkdir -p "$SCRATCH/s47"
test -z "$(git status --porcelain)" || { echo "tree not clean before the run"; exit 1; }
# ... wrapper E2E com <specs> = e2e/perf.spec.js ...
mv "$(ls -t bench/results/*-layers-ui.bench.json | head -1)" "$SCRATCH/s47/"
# depois da terceira: anotar os 3 nomes (vão nomeados no git add) e trazê-los de volta
ls "$SCRATCH"/s47/*-layers-ui.bench.json
mv "$SCRATCH"/s47/*-layers-ui.bench.json bench/results/
```

- **Baselines visuais** de `e2e/tree-visual.spec.js` (Task 2): locais e nunca commitadas, como as da `menu-visual`. Ficam em `$SCRATCH/s47/tree-visual.spec.js-snapshots/` e só entram em `e2e/` durante a execução visual, senão sujam a árvore do procedimento limpo e entrariam num `git add`:

```bash
mv "$SCRATCH/s47/tree-visual.spec.js-snapshots" e2e/ 2>/dev/null
LAYERS_VISUAL=1 npx playwright test --project=chromium e2e/tree-visual.spec.js   # dentro do wrapper
mv e2e/tree-visual.spec.js-snapshots "$SCRATCH/s47/"
```

- Medição: mesma máquina, aba em foco, sem outro processo pesado; comparar só runs com o mesmo `env` ([bench-methodology.md](../../bench-methodology.md) § Decision rules). As decisões usam a mediana de 3 runs do mesmo `sha` com `dirty false,false,false`. O histórico de `orbit/traval` varia 23,0-25,3 ms com código igual: comparação antes/depois só com runs alternadas e tolerância (Task 6).

## Review Focus

- **O memo não remove o custo do React.** `sc-for` faz `list.map` e cria elementos a cada render (`support.js:635-640`): um array memoizado poupa só a construção das linhas (closures, strings, `kidsOf`, busca), nunca a criação nem o diff dos elementos. Esse resíduo é o que a janela ataca, e é o que o gate 2 mede.
- **`hoverId` fora da chave.** Durante o orbit, `H.enter` (`:1562`) troca `hoverId` a cada plano cruzado; com `hoverId`/`selId` na chave o memo invalidaria justo no cenário do orçamento. Por isso a estrutura é memoizada sem eles, e só as linhas afetadas são refeitas. A Task 1 registra `hoverSwapsPerFrame` como evidência.
- **V1 da S4.8 tira a premissa do memo.** `pointer-events:none` nos planos durante o arrasto (V1, [plano da S4.8](2026-10-16-s4-8-orbit-plane-cost.md) achados e `Orbit_NoHitTest`) elimina o churn de `hoverId` e muda `B − I`. Os ganhos de V1 e da S4.7 não se somam: os gates 1/2 medem com e sem V1 simulada e decidem pelo pior caso; se a V1 entrar no app, a S4.7 refaz o gate 1 depois do rebase (Task 2 Step 6), não só a medição final.
- **Decoração sem linha.** `hoverId` pode ser qualquer plano (`:1562`), inclusive nó sob ancestral recolhido ou fora do Filtrar, e `selId` fica sem linha depois de recolher tudo (`:2263`): a decoração só refaz ids com `idx[id] !== undefined`, e com `selId === hoverId` refaz uma vez só (`remake(true, true)`).
- **Chave completa.** As closures das linhas capturam `s`: toda leitura de `s.*` no bloco extraído (e em `codeRow`/`codeFor`) entra na chave estrutural, ou a linha fica com valor velho. Leituras fora de `s` também contam: `this.els[n.id]` (`:2227`) entra na chave pela identidade de `this.els`, e o `style` vivo lido por `codeFor` não cabe em chave, por isso as linhas de código abertas são refeitas em todo render. A Task 2 confere por `grep` (`s.*` e `this.*`). A aba Elementos inclui `selId`, `selFile` e `selSelector` na chave estrutural (`rSel`, `fSel`, `inSel` e o `click` da regra dependem deles) e decora só `hoverId`.
- **`ruleCount` nas duas abas.** Pular a aba inativa não pode zerar a etiqueta "Elementos N" (`:254`) nem `treeQHits` (`:2375`); `rulesByKey`/`ruleCount` saem do memo por `nodes`.
- **Altura da linha de código** não sai de `rows`: a nota quebra com a largura, a textarea é `resize:vertical` e há 20 px de cabeçalho mais folgas. A janela usa a altura medida (ResizeObserver, sem leitura de layout forçada no render) com estimativa até a 1ª medida.
- **`key` por índice e foco.** Quando `start` muda, o slot do `sc-for` (`support.js:639`) passa a mostrar outra linha no mesmo elemento com foco: uma tecla digitada depois do scroll cairia em outra regra, e um Enter num botão focado agiria em outro nó ([!DECISION] `focus-during-scroll`).
- **Scroll agora renderiza.** Com a janela, cada 110 px de scroll é um `render()` completo, com `componentDidUpdate` e o `JSON.stringify` de `:1598`. `tree/1500-tags/scroll-frame-ms` mede isso desde a Task 1 e a Task 6 guarda contra regressão.
- **`revealInTree` sem DOM.** Usa o índice na lista completa da aba ativa e `treeWindow(reveal)`, nunca `querySelector`; árvore recolhida (`treeOpen` falso) continua sem efeito.
- **Remontagem do contêiner.** Recolher/expandir o painel recria o contêiner com `scrollTop = 0`; o estado da janela tem de acompanhar (sem `onScroll` nesse caso).
- **Eventos do template.** `support.js:439` mapeia qualquer `on*` sem entrada no `EVENT_MAP` para o nome React (`onscroll` → `onScroll`); `onblur` → `onBlur` está no mapa (`:330`).
- **Âncoras da S3.3.** Os `title` das linhas (`:2219-2224`, `:2250`, `:2254`, citados no plano geral) passam a viver dentro de `remake`; o relatório da Task 2 registra as âncoras novas para a S3.3, e se a S3.3 ler estado num `tooltip(id)`, essa leitura entra na chave do memo.

> [!DECISION] focus-during-scroll
> O que acontece quando a janela andaria com o foco dentro do contêiner da árvore (`key` por índice no `sc-for`): textarea de código ou botão de linha (`▸`, `{ }`, `⤡`).
> - **Option A (recomendada)**: congelar `start` enquanto o foco está dentro do contêiner numa `textarea` ou num elemento `:focus-visible` (foco de teclado, Tab); `treeBlur` ignora blur com `relatedTarget` ainda dentro do contêiner (Tab entre botões) e, quando o foco sai, reaplica o `scrollTop`. Botão focado por clique de mouse (o Chromium foca o botão no clique) não congela: ele perde o foco (`blur()`) antes de a janela andar, para a janela não congelar a cada clique em `▸`/`{ }`/`⤡`. Nunca edita a regra errada nem aciona o nó errado; custo visível em [!DECISION] `focus-empty-area`.
> - **Option B**: `blur()` de qualquer foco na árvore quando a janela anda. Sem área vazia, mas a próxima tecla cai no `onKey` global (atalhos como `R`, `M`).
> - **Option C**: linhas de código sempre montadas fora da janela. Não resolve: o índice do slot ainda muda com `start`, e não cobre os botões.

> [!DECISION] focus-empty-area
> Com a Option A de `focus-during-scroll`, rolar além da sobra (220 px) com foco de teclado ou de textarea na árvore deixa vazia a área fora da faixa até o blur. É uma mudança visível, exceção ao visual congelado.
> - **Option A (recomendada)**: aceitar. Só acontece com foco de teclado/textarea e rolagem > 220 px, some no blur, e a alternativa (B) entrega teclas ao `onKey` global.
> - **Option B**: não aceitar. Usar a Option B de `focus-during-scroll`, ou fechar a S4.7 no caminho memo (sem janela).

> [!DECISION] gate-1
> Alinhado com D3 do plano geral: se o pior caso do gate 1 no Traval (com e sem V1 simulada) ficar < 10 % do frame, **parar e voltar ao usuário** com a tabela.
> - **Option A (recomendada, como D3)**: memo (Task 2) e gate 2; janela só se o gate 2 final der "go".
> - **Option B**: janela completa (Tasks 2-5) sem esperar o gate 2.
> - **Option C**: fechar como medido-negativo (Task 6), nada no app. Desvia de D3; faz sentido só se o teto for desprezível (ex.: < 3 %).

### Task 0: Iniciar a S4.7 no tracker

**Pré-condições:** a branch `docs/261016-0-wave-3-plan` já foi mesclada em `develop` (passo 0 do plano geral), então o plano geral e este plano já estão em `develop`. Verificar: `git fetch origin && git ls-tree origin/develop docs/superpowers/plans/ | grep -c "2026-10-16-s4-7-virtual-tree.md"` = 1. Senão, parar e relatar; nunca copiar plano por `git checkout <ref> -- docs/...` nem por cherry-pick.

**Files:**
- Modify: `docs/roadmap.md:65` (linha S4.7), `docs/roadmap.data.json` (rebuild)

- [ ] **Step 1: Worktree, branch e linha do roadmap**

```bash
git fetch origin && git worktree add .claude/worktrees/s4-7 -b feature/261016-0-s4-7-virtual-tree origin/develop
cd .claude/worktrees/s4-7 && npm ci
```

Todos os passos seguintes rodam nesse worktree. Em `docs/roadmap.md`, trocar a linha `| S4.7 | 2 | S4 | Árvore virtualizada | checklist D | — | — | — | — | registered |` por:

```md
| S4.7 | 2 | S4 | Árvore virtualizada | checklist D | — | [](superpowers/plans/2026-10-16-s4-7-virtual-tree.md) | — | — | in-progress |
```

`docs/roadmap.config.json` já tem `"S4.7"` (linha 76): não editar. Run: `python ~/.claude/design/_build_proto.py .` — Expected: exit 0; `docs/roadmap.data.json` com S4.7 `in-progress`.

- [ ] **Step 2: Commit**

```bash
git add docs/roadmap.md docs/roadmap.data.json
git commit -m "docs: start S4.7 in the tracker (S4.7)"
```

Expected: `git log --oneline origin/develop..HEAD` com só o commit do tracker.

### Task 1: Medir o teto da árvore (gate 1)

**Files:**
- Create: `e2e/tree-perf-helpers.js`
- Modify: `e2e/perf.spec.js` (import `:2`, `EXPECTED` `:4-14`, testes novos depois de `Orbit_ZoomedIdeal_RecordsFrameInterval`, antes de `Orbit_Budget_Above50Fps`). Helpers em arquivo próprio para não colidir com a S4.8 em `e2e/perf-helpers.js`.
- Create: `bench/results/<ts>-layers-ui.bench.json` ×3, `$SCRATCH/s47/table.cjs` (fora do repo)

**Interfaces:**
- Produces: `inflateTraval(page, tags)`, `treeMode(page, mode)`, `noPlaneHits(page)`, `countHoverSwaps(page) → stop(): Promise<number>`, `rowInputCost(page, kind, n?) → { medianMs, samples }`, `scrollFrames(page, px?, frames?) → { meanFrameMs, p95FrameMs, frames, scrolled }`. 14 bench ids novos: `orbit/traval-tree-closed`, `orbit/traval-tree-ideal`, `orbit/traval-v1`, `orbit/traval-v1-tree-ideal`, `orbit/1500-tags`, `orbit/1500-tags-tree-closed`, `orbit/1500-tags-tree-ideal`, `orbit/1500-tags-v1`, `orbit/1500-tags-v1-tree-ideal` (todos `/mean-frame-ms`), `tree/traval/hover-ms`, `tree/traval/select-ms`, `tree/1500-tags/hover-ms`, `tree/1500-tags/select-ms`, `tree/1500-tags/scroll-frame-ms`.

Leitura dos cenários: `open` = padrão (todas as linhas construídas e montadas); `closed` = painel recolhido (linhas construídas, nenhuma montada); `ideal` = raiz L0 recolhida (1 linha da Hierarquia construída e montada); `-v1` = V1 da S4.8 simulada (planos sem hit-test, `hov/f` ≈ 0). Então `B − C` ≈ montagem/diff (teto da janela) e `C − I` ≈ construção (teto do memo). Ressalvas: `I` não é o piso, porque com a raiz recolhida `kidsOf`, `rulesByKey` e as linhas da Elementos (`:2214`, `:2232-2257`) ainda são construídos, então `B − I` subestima o ganho do memo; e `C − I` mistura a construção com o que o painel desmontado deixa de pintar.

- [ ] **Step 1: Helpers**

Criar `e2e/tree-perf-helpers.js`:

```js
import { expect } from '@playwright/test';

const frames2 = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

// Same inflation as Scan_1500Tags_UnderBudget (perf.spec.js): the Traval mock body repeats until it
// has about `tags` tags. Call before page.goto.
export async function inflateTraval(page, tags) {
  await page.route('**/fixtures/traval/layers/mock.html', async (route) => {
    const html = await (await route.fetch()).text();
    const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (!m) throw new Error('traval mock has no <body>');
    const perCopy = (m[1].match(/<[a-z][^>]*>/gi) || []).length;
    await route.fulfill({ body: html.replace(m[1], m[1].repeat(Math.max(1, Math.ceil(tags / perCopy)))), contentType: 'text/html' });
  });
}

// S4.7 go/no-go states: 'open' (default), 'closed' (tree panel collapsed: rows still built by
// render(), none mounted), 'root' (L0 row collapsed: one row built and mounted).
export async function treeMode(page, mode) {
  if (mode === 'closed') await page.locator('div[title="Recolher / expandir"]').filter({ hasText: 'Árvore de camadas' }).first().click();
  if (mode === 'root') await page.locator('[data-node-id="0"] > button').first().click();
  await frames2(page);
  const n = await page.locator('[data-node-id]').count();
  if (mode === 'closed') expect(n, 'tree panel collapsed').toBe(0);
  if (mode === 'root') expect(n, 'only the L0 row').toBe(1);
}

// S4.8 V1 simulated without S4.8 code: marks the planes (planeCensus predicate, perf-helpers.js) and
// disables their hit-test, so the drag no longer swaps hoverId.
export async function noPlaneHits(page) {
  const n = await page.evaluate(() => {
    const ps = [...document.querySelectorAll('*')].filter((el) => el.style && el.style.transform.startsWith('translateZ(') && /pointer|crosshair/.test(el.style.cursor));
    ps.forEach((el) => el.setAttribute('data-s47-v1', ''));
    return ps.length;
  });
  expect(n, 'planes marked for V1').toBeGreaterThan(0);
  await page.addStyleTag({ content: '[data-s47-v1]{pointer-events:none!important}' });
}

// Counts plane-to-plane pointer transitions (each is a hoverId change, index.html H.enter) until the
// returned function is called.
export async function countHoverSwaps(page) {
  await page.evaluate(() => {
    const st = (window.__hov = { n: 0, last: null });
    const plane = (el) => {
      for (; el; el = el.parentElement) if (el.style && el.style.transform.startsWith('translateZ(') && /pointer|crosshair/.test(el.style.cursor)) return el;
      return null;
    };
    st.fn = (e) => {
      const p = plane(e.target);
      if (p && p !== st.last) { st.n++; st.last = p; }
    };
    document.addEventListener('mouseover', st.fn, true);
  });
  return () => page.evaluate(() => { document.removeEventListener('mouseover', window.__hov.fn, true); return window.__hov.n; });
}

// Median cost of n hovers or clicks on top Hierarquia rows (always mounted, with or without a
// window): from the input event (capture listener, before React) to the second frame after it.
export async function rowInputCost(page, kind, n = 5) {
  const type = kind === 'hover' ? 'mouseover' : 'click';
  const samples = [];
  for (let i = 0; i < n; i++) {
    const b = await page.locator('[data-node-id]').nth((kind === 'hover' ? 2 : 2 + n) + i).boundingBox();
    await page.mouse.move(2, 2);
    await page.evaluate((type) => {
      window.__cost = null;
      const fn = (e) => {
        if (!e.target.closest('[data-node-id]')) return;
        document.removeEventListener(type, fn, true);
        const t0 = performance.now();
        requestAnimationFrame(() => requestAnimationFrame(() => (window.__cost = performance.now() - t0)));
      };
      document.addEventListener(type, fn, true);
    }, type);
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    if (kind === 'hover') await page.mouse.move(x, y);
    else await page.mouse.click(x, y);
    samples.push(await (await page.waitForFunction(() => window.__cost)).jsonValue());
  }
  const sorted = [...samples].sort((a, b) => a - b);
  return { medianMs: sorted[n >> 1], samples };
}

// Frame interval while the tree container scrolls `px` per frame for `frames` frames (with the S4.7
// window every 110 px of scroll is a full render()). The container is the scrollable ancestor of
// the first tree row, so this works with and without the window.
export async function scrollFrames(page, px = 40, frames = 90) {
  return page.evaluate(([px, frames]) => new Promise((resolve, reject) => {
    let box = document.querySelector('[data-node-id]');
    while (box && getComputedStyle(box).overflowY !== 'auto') box = box.parentElement;
    if (!box) return reject(new Error('tree container not found'));
    box.scrollTop = 0;
    const t = [];
    const step = (now) => {
      t.push(now);
      if (t.length > frames) {
        const d = t.slice(1).map((x, i) => x - t[i]);
        const s = [...d].sort((a, b) => a - b);
        return resolve({ meanFrameMs: d.reduce((a, b) => a + b, 0) / d.length, p95FrameMs: s[Math.floor(s.length * 0.95)], frames: d.length, scrolled: box.scrollTop });
      }
      box.scrollTop += px;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), [px, frames]);
}
```

- [ ] **Step 2: Cenários no `perf.spec.js`**

- import novo: `import { inflateTraval, treeMode, noPlaneHits, countHoverSwaps, rowInputCost, scrollFrames } from './tree-perf-helpers.js';`
- `EXPECTED`: acrescentar os 14 ids de **Interfaces** depois de `'orbit/traval-zoom-ideal/mean-frame-ms',` (o `afterAll` lança erro se faltar algum).
- Inserir antes de `test('Orbit_Budget_Above50Fps'`:

```js
// S4.7 go/no-go: the tree's share of the orbit frame and of hover/select renders. 'closed' collapses
// the tree panel (rows built, not mounted); 'root' collapses the L0 row (one row built and mounted);
// v1 simulates S4.8 V1 (no plane hit-test, so no hoverId churn during the drag).
for (const [name, id, tags, mode, v1] of [
  ['Orbit_TreeClosed_RecordsFrameInterval', 'orbit/traval-tree-closed/mean-frame-ms', 0, 'closed', false],
  ['Orbit_TreeIdeal_RecordsFrameInterval', 'orbit/traval-tree-ideal/mean-frame-ms', 0, 'root', false],
  ['Orbit_V1_RecordsFrameInterval', 'orbit/traval-v1/mean-frame-ms', 0, 'open', true],
  ['Orbit_V1TreeIdeal_RecordsFrameInterval', 'orbit/traval-v1-tree-ideal/mean-frame-ms', 0, 'root', true],
  ['Orbit_1500Tags_RecordsFrameInterval', 'orbit/1500-tags/mean-frame-ms', 1500, 'open', false],
  ['Orbit_1500TagsTreeClosed_RecordsFrameInterval', 'orbit/1500-tags-tree-closed/mean-frame-ms', 1500, 'closed', false],
  ['Orbit_1500TagsTreeIdeal_RecordsFrameInterval', 'orbit/1500-tags-tree-ideal/mean-frame-ms', 1500, 'root', false],
  ['Orbit_1500TagsV1_RecordsFrameInterval', 'orbit/1500-tags-v1/mean-frame-ms', 1500, 'open', true],
  ['Orbit_1500TagsV1TreeIdeal_RecordsFrameInterval', 'orbit/1500-tags-v1-tree-ideal/mean-frame-ms', 1500, 'root', true],
]) {
  test(name, async ({ page }) => {
    await instrument(page);
    if (tags) await inflateTraval(page, tags);
    await page.goto('/?layers=fixtures/traval/');
    await waitForScan(page, tags ? 1000 : 5, tags ? 40_000 : 20_000);
    await treeMode(page, mode);
    if (v1) await noPlaneHits(page);
    const swaps = await countHoverSwaps(page);
    const o = await orbitDrag(page, 1500);
    rec(id, o.meanFrameMs, {
      fps: o.fps,
      p95FrameMs: o.p95FrameMs,
      frames: o.frames,
      loafCount: o.loafCount,
      main: o.main,
      hoverSwapsPerFrame: (await swaps()) / o.frames,
      treeRowsMounted: await page.locator('[data-node-id]').count(),
    });
    expect(o.frames).toBeGreaterThanOrEqual(30);
  });
}

for (const [name, id, tags, kind] of [
  ['Tree_HoverRow_ReportsFrameCost', 'tree/traval/hover-ms', 0, 'hover'],
  ['Tree_SelectRow_ReportsFrameCost', 'tree/traval/select-ms', 0, 'select'],
  ['Tree_1500TagsHoverRow_ReportsFrameCost', 'tree/1500-tags/hover-ms', 1500, 'hover'],
  ['Tree_1500TagsSelectRow_ReportsFrameCost', 'tree/1500-tags/select-ms', 1500, 'select'],
]) {
  test(name, async ({ page }) => {
    await instrument(page);
    if (tags) await inflateTraval(page, tags);
    await page.goto('/?layers=fixtures/traval/');
    await waitForScan(page, tags ? 1000 : 5, tags ? 40_000 : 20_000);
    const c = await rowInputCost(page, kind);
    rec(id, c.medianMs, { samples: c.samples, treeRowsMounted: await page.locator('[data-node-id]').count() });
  });
}

// Baseline for the S4.7 window: with it, scrolling re-renders every 110 px (Task 6 guards this id).
test('Tree_1500TagsScroll_RecordsFrameInterval', async ({ page }) => {
  await instrument(page);
  await inflateTraval(page, 1500);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page, 1000, 40_000);
  await page.mouse.move(2, 2);
  const o = await scrollFrames(page);
  rec('tree/1500-tags/scroll-frame-ms', o.meanFrameMs, { p95FrameMs: o.p95FrameMs, frames: o.frames, scrolled: o.scrolled, treeRowsMounted: await page.locator('[data-node-id]').count() });
  expect(o.scrolled).toBeGreaterThan(3000);
});
```

`hoverSwapsPerFrame` já registra as trocas de hover por frame (premissa do memo); nas variantes `-v1` o esperado é ≈ 0, e isso confirma que o override pegou.

- [ ] **Step 3: Rodar uma vez, commitar, medir limpo**

Run (wrapper, `run_in_background: true`): `npx playwright test --project=chromium e2e/perf.spec.js`
Expected: tudo passa, exceto `Orbit_Budget_Above50Fps` (expected-fail); um arquivo de resultado com os 14 ids novos. Apagar esse arquivo pelo nome (`rm "$(ls -t bench/results/*-layers-ui.bench.json | head -1)"`; árvore suja).

```bash
npm test
git add e2e/tree-perf-helpers.js e2e/perf.spec.js
git commit -m "test(perf): measure the tree share of orbit, hover, select and scroll (S4.7)"
```

Três execuções com o **procedimento de árvore limpa**. Registrar no relatório o SHA de `develop` sob a branch e que a S4.8 ainda não está nela.

- [ ] **Step 4: Tabela de medianas**

Este **comando da tabela de medianas** é reusado nas Tasks 2 e 6. Criar uma vez (fora do repo):

```bash
cat > "$SCRATCH/s47/table.cjs" <<'EOF'
// S4.7 medians of the 3 runs of shaA (and of shaB, with the Task 6 guards). Run from the worktree root:
// node table.cjs <shaA> [<shaB>]. rec() writes stddev 0, so sd is computed from the 3 values here.
const fs = require('fs');
const [shaA, shaB] = process.argv.slice(2);
const IDS = ['orbit/traval/mean-frame-ms', 'orbit/traval-tree-closed/mean-frame-ms', 'orbit/traval-tree-ideal/mean-frame-ms',
  'orbit/traval-v1/mean-frame-ms', 'orbit/traval-v1-tree-ideal/mean-frame-ms', 'orbit/1500-tags/mean-frame-ms',
  'orbit/1500-tags-tree-closed/mean-frame-ms', 'orbit/1500-tags-tree-ideal/mean-frame-ms', 'orbit/1500-tags-v1/mean-frame-ms',
  'orbit/1500-tags-v1-tree-ideal/mean-frame-ms', 'tree/traval/hover-ms', 'tree/traval/select-ms', 'tree/1500-tags/hover-ms',
  'tree/1500-tags/select-ms', 'tree/1500-tags/scroll-frame-ms'];
const GUARD = ['orbit/traval/mean-frame-ms', 'orbit/1500-tags/mean-frame-ms', 'tree/1500-tags/scroll-frame-ms'];
const files = fs.readdirSync('bench/results').filter((x) => x.endsWith('-layers-ui.bench.json')).sort();
let fail = 0;
const runs = (sha) => {
  const r = files.map((x) => [x, JSON.parse(fs.readFileSync('bench/results/' + x))]).filter(([, j]) => j.git.sha === sha).slice(-3);
  console.log(sha.slice(0, 7), r.map((x) => x[0]).join(' '), 'dirty', r.map((x) => x[1].git.dirty).join(','));
  if (r.length !== 3) throw new Error('need 3 runs of ' + sha + ', got ' + r.length);
  if (r.some((x) => x[1].git.dirty)) fail++;
  return r.map((x) => x[1]);
};
const med = (a) => a.slice().sort((x, y) => x - y)[1];
const sd = (a) => { const m = a.reduce((s, x) => s + x, 0) / a.length; return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const stat = (J, id) => {
  const r = J.map((j) => j.benchmarks.find((b) => b.benchId === id));
  if (r.some((b) => b === undefined)) return null;
  const x = (k) => (r[0].extra[k] === undefined ? '-' : med(r.map((b) => b.extra[k])).toFixed(2));
  const m = (k) => (r[0].extra.main ? med(r.map((b) => b.extra.main[k])).toFixed(2) : '-');
  const v = r.map((b) => b.value);
  return { med: med(v), sd: sd(v), line: `fps ${x('fps')} p95 ${x('p95FrameMs')} script ${m('scriptMs')} task ${m('taskMs')} rows ${x('treeRowsMounted')} hov/f ${x('hoverSwapsPerFrame')}` };
};
const A = runs(shaA), B = shaB ? runs(shaB) : null;
for (const id of IDS) {
  const a = stat(A, id);
  if (!a) { console.log(id, 'MISSING'); fail++; continue; }
  let out = `${id} ms ${a.med.toFixed(2)} sd ${a.sd.toFixed(2)} ${a.line}`;
  if (B) {
    const b = stat(B, id);
    if (!b) { console.log(id, 'MISSING in B'); fail++; continue; }
    const tol = Math.max(0.5, 2 * a.sd);
    const verdict = !GUARD.includes(id) ? 'report' : b.med <= a.med + tol ? 'PASS' : (fail++, 'FAIL');
    out += ` | after ms ${b.med.toFixed(2)} sd ${b.sd.toFixed(2)} delta ${(b.med - a.med).toFixed(2)} tol ${tol.toFixed(2)} ${verdict} | after ${b.line}`;
  }
  console.log(out);
}
process.exitCode = fail ? 1 : 0;
EOF
node "$SCRATCH/s47/table.cjs" "$(git rev-parse HEAD)"
```

Expected: `dirty false,false,false`, 15 linhas sem `MISSING`, exit 0; `hov/f` ≈ 0 nas linhas `-v1`. Depois: `python ~/.claude/hooks/bench-history-cli.py ingest --repo .` e `python ~/.claude/hooks/bench-history-cli.py render --repo .`.

- [ ] **Step 5: Gate 1 (teto, pior caso com e sem V1)**

Com `B` = `orbit/traval`, `I` = `orbit/traval-tree-ideal`, `Bv` = `orbit/traval-v1`, `Iv` = `orbit/traval-v1-tree-ideal` (medianas de ms/frame) e o mesmo quarteto em 1.500 tags, o ganho do teto é `g = min((B − I) / B, (Bv − Iv) / Bv)` no Traval e `g15` igual em 1.500 tags:
- **Passa** se `g ≥ 0,10`. Seguir para a Task 2.
- **Abaixo de 10 %** (`g < 0,10`, com ou sem `g15 ≥ 0,10`): parar e perguntar ao usuário com a tabela, conforme [!DECISION] `gate-1` (D3 do plano geral). O orçamento é no Traval; `g15` entra na pergunta como argumento de escala.

Registrar no relatório também `B − C` (teto da janela), `C − I` (teto do memo, com as ressalvas da leitura dos cenários), `hov/f` com e sem V1 e os quatro custos de entrada.

- [ ] **Step 6: Commit da base**

```bash
git add bench/results/<f1>-layers-ui.bench.json bench/results/<f2>-layers-ui.bench.json bench/results/<f3>-layers-ui.bench.json docs/reports/bench-history
git commit -m "test(perf): record the S4.7 tree baseline (S4.7)"
```

`<f1>`..`<f3>` = os 3 nomes anotados no procedimento de árvore limpa (os mesmos da 1ª linha da tabela). Expected: `git status --porcelain` vazio depois do commit.

### Task 2: Memo das linhas e aba inativa (gate 2)

**Files:**
- Modify: `index.html` (bloco `:2214-2257` e `:2259` extraídos para `treeModel`; `:2258` e `:2260-2264` ficam em `render()`)
- Create: `e2e/tree-rows.spec.js`, `e2e/tree-visual.spec.js`
- Create: `bench/results/<ts>-layers-ui.bench.json` ×3 (Step 5) e ×3 ou ×6 (Step 6)

**Interfaces:**
- Produces: `treeModel(s, selFile, selSelector) → { tq, treeRows, treeHits, elemRows, elemHits, ruleCount, collapsible }` no `Component`. Dois memos no padrão de `this._cam` (`:1769-1777`): `this._treeNodes` por `s.nodes` (`kidsOf`, `collapsible`, `rulesByKey`, `files`, `ruleCount`) e `this._tree` pela chave estrutural da aba ativa; só a aba ativa tem linhas, a outra recebe `[]`. `render()` desestrutura o retorno e mantém `hierAllClosed`, `elemAllClosed`, `treeAllClosed`, `treeCollapseAll` e `noCodeOpen` (`:2260-2264`) como hoje, agora lendo `collapsible` do modelo; o export (`:2374-2391`) continua lendo `tq`, `treeAllClosed`, `treeCollapseAll` e `noCodeOpen` dali.

- [ ] **Step 1: Testes de caracterização e baseline visual (verdes antes do memo)**

`e2e/tree-rows.spec.js` (Traval, `readNodes` de `tree-helpers.js`; linhas do topo, sempre montadas; cada teste coleta `page.on('pageerror')` e termina sem erro):
- `TreeRows_HoverNaLinha_SoElaGanhaFundo`: hover na linha `nth(3)` → só ela tem fundo `rgba(…, 0.08)`; sair → nenhuma.
- `TreeRows_SelecionarOutra_BadgeMudaDeLinha`: clicar `nth(4)` e depois `nth(5)` → `●` só em `nth(5)`; `{ }` visível na selecionada.
- `TreeRows_EdicaoNoPainel_CodigoDaLinhaAtualiza`: selecionar uma linha, abrir o `{ }` dela, editar `Sombra` no painel (localizador de `undo-redo.spec.js`) → a textarea da linha contém o valor novo (código sintetizado do atributo `style`).
- `TreeRows_BuscaFiltrar_SoCasamentosEAncestrais`: `treeQ` = um nome do Traval, Filtrar → toda linha montada casa ou é ancestral; Destacar → todas voltam, as que não casam com opacidade 0,45.
- `TreeRows_TrocarAba_ElementosMostraArquivos`: a aba Elementos mostra as linhas `ARQ`; a etiqueta "Elementos N" é igual antes e depois de trocar de aba.
- `TreeRows_IsolarPeloBotao_BadgeIsolado`: botão `⤡` da linha selecionada → badge `isolado`; de novo → some.
- `TreeRows_HoverPlanoComLinhaRecolhida_NaoQuebra`: (a) recolher tudo (botão `⊟` "Recolher todas as linhas…") e disparar `mouseover` (via `page.evaluate`, `bubbles: true`) no último plano do palco (filtro de plano de `planeCensus`), cujo nó fica sob ancestral recolhido; (b) com `treeQ` que não casa esse nó e Filtrar ativo, repetir o hover; (c) selecionar esse plano (`el.click()` no `evaluate`) e recolher tudo de novo, deixando `selId` sem linha. Em cada passo: nenhum `pageerror`, `[data-node-id="0"]` montada e nenhuma linha com fundo de hover ou `●` fora do lugar.

`e2e/tree-visual.spec.js` (gate de pixel manual, mesmo padrão de `menu-visual.spec.js:3-8`: `test.skip` sem `LAYERS_VISUAL`, só Chromium, `SHOT = { animations: 'disabled', caret: 'hide', maxDiffPixels: 0 }`). A `menu-visual` roda sem projeto (árvore vazia) e a `tree-snapshot` lê o shadow DOM do mock, então nenhuma das duas vê as linhas. Fixture: Traval inflado (`inflateTraval(page, 1500)`), `waitForScan(page, 1000, 40_000)`, mouse em `(2, 2)`. Screenshot só do contêiner rolável (ancestral de `[data-node-id]` com `overflow-y: auto`, marcado via `evaluate` para virar `Locator`):
- `TreeVisual_Topo_Igual`: `scrollTop = 0` → `tree-top.png`.
- `TreeVisual_RoladoNoMeio_Igual`: `scrollTop = Math.floor((scrollHeight − clientHeight) / 2)`, 2 frames → `tree-mid.png`.
- `TreeVisual_CodigoAberto_Igual`: clicar `nth(3)`, abrir o `{ }` dela, `scrollTop = 0`, 2 frames → `tree-code.png`.

Run (wrapper): `npx playwright test --project=chromium e2e/tree-rows.spec.js` — Expected: PASS no código de `develop` (caracterização). Gerar as baselines visuais agora, antes do memo e da janela: comando de **Baselines visuais** com `--update-snapshots`; Expected: 3 PNG em `$SCRATCH/s47/tree-visual.spec.js-snapshots/` depois do `mv`.

```bash
git add e2e/tree-rows.spec.js e2e/tree-visual.spec.js
git commit -m "test(e2e): characterize tree rows and pin the tree panel pixels (S4.7)"
```

- [ ] **Step 2: Extrair sem mudar comportamento**

Mover `:2214-2257` e `:2259` para `treeModel(s, selFile, selSelector)` sem mudar a lógica; em `render()`, `const { tq, treeRows, treeHits, elemRows, elemHits, ruleCount, collapsible } = this.treeModel(s, selFile, selSelector);` no lugar do bloco, com o comentário `:2258` e `:2260-2264` intactos. Run: `npm test` e (wrapper) `npx playwright test --project=chromium e2e/tree-rows.spec.js e2e/undo-redo.spec.js e2e/apply-flow.spec.js` — Expected: PASS. Commit (`git add index.html`): `refactor: extract tree row building from render (S4.7)`.

- [ ] **Step 3: Chaves e memo**

Listar as leituras de estado do bloco extraído, de `codeRow` e de `codeFor`, inclusive as fora de `s`:

```bash
awk '/^  treeModel\(/,/^  }$/' index.html | grep -oE "\b(s|this)\.[a-zA-Z]+" | sort -u
sed -n '/^  codeFor(rule) {/,/^  }$/p;/^  codeRow(rule, indent, scopeNote) {/,/^  }$/p' index.html | grep -oE "\b(s|this)\.[a-zA-Z]+" | sort -u
```

Expected: toda leitura `s.*` cabe nas chaves abaixo; das `this.*`, só métodos (`setState`, `select`, `isolate`, `codeRow`, `codeFor`, `loadFile`, `applyCode`, `resetView`) e `this.els`. Qualquer leitura nova entra na chave, ou a linha que a lê passa a ser refeita em todo render.
- **Memo por `nodes`** (`this._treeNodes`, chave `s.nodes`): `kidsOf`, `collapsible`, `rulesByKey`, `files`, `ruleCount`. Nada disso lê outro estado.
- **Hierarquia (estrutural):** `nodes`, `byId`, `this.els` (identidade; trocado junto com `nodes` em `:1758`), `treeClosed`, `treeQ`, `treeMode`, `hierCode`, `isoId`, `scope`, `codeBuf`, `fileText`, `changes`, `treeTab`, sem `selId`/`hoverId`. `pushRow` monta cada linha de nó por `remake(isSel, isHov)`, guardado em `remake[i]` com `idx[id] = i`; a passada estrutural chama `remake(false, false)`.
- **Elementos (estrutural):** `nodes`, `byId`, `treeQ`, `treeMode`, `elOpen`, `elCode`, `codeBuf`, `fileText`, `changes`, `treeTab`, `selId`, mais os parâmetros `selFile` e `selSelector`; as linhas de uso guardam `remake(isHov)` com `idx[nodeId]`.
- **Decoração** (todo render): `out = rows.slice()`. Na Hierarquia, para cada id **distinto** de `{selId, hoverId}` com `idx[id] !== undefined`: `out[idx[id]] = remake[idx[id]](id === selId, id === hoverId)`; na Elementos, só `hoverId`, com a mesma guarda. Sem linha (nó sob ancestral recolhido, fora do Filtrar, `selId` depois de recolher tudo), nada é refeito; com `selId === hoverId`, uma chamada só (`remake(true, true)`), porque duas trocas seguidas apagariam a seleção. Nenhuma outra linha de nó é refeita.
- **Linhas de código abertas** (Hierarquia e Elementos): refeitas em todo render por índice (`codeRow` lê o `style` vivo de `this.els[...]` em `codeFor`, que nenhuma chave cobre); são só as abertas.
- **Aba inativa:** sem linhas (`[]`); `rulesByKey`/`ruleCount` vêm do memo por `nodes`; `treeHits`/`elemHits` só na aba ativa (`treeQHits` só lê a da aba ativa).
- **Âncoras para a S3.3:** registrar no relatório onde os `title` das linhas ficaram (dentro de `remake`, com as linhas novas do `index.html`), no lugar de `:2219-2224`, `:2250` e `:2254` citados no plano geral.

Chave comparada elemento a elemento (`k.every((v, i) => v === c.k[i])`), como `this._cam`.

- [ ] **Step 4: Verificar**

Run: `npm test` e (wrapper) `npx playwright test --project=chromium e2e/tree-rows.spec.js e2e/undo-redo.spec.js e2e/apply-flow.spec.js e2e/manual-marker.spec.js e2e/multi-state.spec.js e2e/snap-fidelity.spec.js e2e/pending-persist.spec.js e2e/scope-all-equal.spec.js e2e/tree-snapshot.spec.js` — Expected: PASS. Comando de **Baselines visuais** (sem `--update-snapshots`) — Expected: diff zero nos 3 PNG. Commit (`git add index.html`): `perf: memoize tree rows and skip the inactive tab (S4.7)`.

- [ ] **Step 5: Medir de novo e gate 2 provisório**

Três execuções limpas e `node "$SCRATCH/s47/table.cjs" "$(git rev-parse HEAD)"`. Com `B'`/`B'v` (orbit com memo, sem e com V1 simulada) e `I`/`Iv` (ideal, das mesmas 3 execuções), e o mesmo em 1.500 tags:
- **Go provisório (Tasks 3-5)** se `min((B' − I) / B', (B'v − Iv) / B'v) ≥ 0,10` no Traval ou em 1.500 tags. Os custos de hover/seleção vão para o relatório e não decidem: medidos até o 2º frame, carregam ao menos um intervalo de vsync (~16,7 ms) mesmo com render de custo zero.
- **No-go provisório**: caminho **memo**.

Relatar a tabela, o veredito provisório e o ganho do memo (`B → B'`, `Bv → B'v`). Commit dos resultados: `git add bench/results/<f1>-layers-ui.bench.json bench/results/<f2>-layers-ui.bench.json bench/results/<f3>-layers-ui.bench.json docs/reports/bench-history` e `test(perf): record the S4.7 memo measurement (S4.7)`.

- [ ] **Step 6: Gate 2 final, depois do merge da S4.8**

Só depois do merge da S4.8 em `develop` ([plano geral](2026-10-16-layers-plano-geral-da-onda-3.md), ordem de merge 3 → 4). `git fetch origin && git rebase origin/develop`; conflito esperado e aditivo em `e2e/perf.spec.js` (`EXPECTED`, testes novos; `test.fail` fica como a S4.8 deixou). Run: `npm test` — Expected: PASS.
- **V1 entrou no app** (o changelog/relatório da S4.8 diz que a V1 foi aplicada): refazer o gate 1 com a V1 real. Worktree base no commit da Task 1 Step 3 já rebaseado (`git worktree add "$(git rev-parse --path-format=absolute --git-common-dir)/../.claude/worktrees/s4-7-base" <SHA>`, `npm ci` nele), 3 execuções limpas lá, regra do gate 1 sobre os ids sem `-v1`. Se o gate 1 falhar agora, parar e perguntar ([!DECISION] `gate-1`; o memo já existe, então a pergunta é fechar no caminho memo ou reverter o memo). Manter o worktree base para a Task 6 ou removê-lo (`git worktree remove "$(git rev-parse --path-format=absolute --git-common-dir)/../.claude/worktrees/s4-7-base"`).
- **Gate 2 final:** 3 execuções limpas no `HEAD` rebaseado e a regra do Step 5 (pior caso; com a V1 real, os ids `-v1` só confirmam). **Go** → Tasks 3-5. **No-go** → Task 6, caminho **memo**.

Commit dos resultados (nomes explícitos, 3 ou 6 arquivos, mais `docs/reports/bench-history`): `test(perf): record the S4.7 gate 2 after S4.8 (S4.7)`.

### Task 3: Helper `treeWindow` (só com "go" no gate 2 final)

**Files:**
- Modify: `lib/layers-core.js` (função depois do `}` de `viewCuller`, `:751`; export depois de `viewCuller: viewCuller,`, `:1486`)
- Test: `test/layers-core.test.js` (`describe('TreeWindow')` depois do bloco `ViewCuller`)

**Interfaces:**
- Produces: `LayersCore.treeWindow({ scrollTop, viewH, rowH, rows, overscan, reveal? }) → { start, end, top, bottom, total, scrollTo }` (contrato no Design).

- [ ] **Step 1: Testes que falham**

```js
describe('TreeWindow', () => {
  const rows = (n, h) => Array(n).fill(h);

  it('TreeWindow_ScrollNoMeio_DevolveFaixaComOverscan', () => {
    expect(core.treeWindow({ scrollTop: 440, viewH: 220, rowH: 22, rows: rows(100, null), overscan: 5 }))
      .toEqual({ start: 15, end: 35, top: 330, bottom: 1430, total: 2200, scrollTo: null });
  });

  it('TreeWindow_LinhaDeCodigoAltura_SomaOffsets', () => {
    const r = [null, null, 200, ...rows(20, null)];
    expect(core.treeWindow({ scrollTop: 0, viewH: 100, rowH: 22, rows: r, overscan: 0 }))
      .toEqual({ start: 0, end: 3, top: 0, bottom: 440, total: 684, scrollTo: null });
    expect(core.treeWindow({ scrollTop: 250, viewH: 100, rowH: 22, rows: r, overscan: 0 }))
      .toEqual({ start: 3, end: 8, top: 244, bottom: 330, total: 684, scrollTo: null });
  });

  it('TreeWindow_ListaCurta_NaoCorta', () => {
    const w = { start: 0, end: 5, top: 0, bottom: 0, total: 110, scrollTo: null };
    expect(core.treeWindow({ scrollTop: 0, viewH: 400, rowH: 22, rows: rows(5, null), overscan: 10 })).toEqual(w);
    // stale scrollTop after Filtrar shrank the list
    expect(core.treeWindow({ scrollTop: 900, viewH: 400, rowH: 22, rows: rows(5, null), overscan: 10 })).toEqual(w);
  });

  it('TreeWindow_IndiceDoSelecionado_ReveladoNoTopoOuBase', () => {
    const at = (reveal) => core.treeWindow({ scrollTop: 440, viewH: 220, rowH: 22, rows: rows(100, null), overscan: 0, reveal }).scrollTo;
    expect(at(50)).toBe(924); // below: bottom edge lands rowH above the view bottom
    expect(at(5)).toBe(88); // above: top edge lands rowH below the view top
    expect(at(25)).toBeNull(); // inside the padded view
  });
});
```

Run: `npx vitest run test/layers-core.test.js -t TreeWindow` — Expected: FAIL (`core.treeWindow is not a function`).

- [ ] **Step 2: Implementar**

```js

  // Row window for the layer tree (S4.7). rows[i] = measured height of row i, or null/undefined for
  // rowH. Returns the slice [start, end) with overscan and the spacer heights; with `reveal`, the
  // scrollTop that brings that row inside the view with a rowH margin (null when already inside).
  function treeWindow(o) {
    var rows = o.rows, n = rows.length, rowH = o.rowH, ov = o.overscan || 0;
    var off = new Array(n + 1); off[0] = 0;
    for (var i = 0; i < n; i++) off[i + 1] = off[i] + (rows[i] == null ? rowH : rows[i]);
    var total = off[n], viewH = Math.max(0, o.viewH);
    var top = Math.min(Math.max(0, o.scrollTop), Math.max(0, total - viewH));
    var a = 0; while (a < n && off[a + 1] <= top) a++;
    var b = a; while (b < n && off[b] < top + viewH) b++;
    var start = Math.max(0, a - ov), end = Math.min(n, b + ov), scrollTo = null;
    if (o.reveal != null && o.reveal >= 0 && o.reveal < n) {
      var r0 = off[o.reveal], r1 = off[o.reveal + 1];
      if (r0 < top + rowH) scrollTo = Math.max(0, r0 - rowH);
      else if (r1 > top + viewH - rowH) scrollTo = r1 - (viewH - rowH);
    }
    return { start: start, end: end, top: off[start], bottom: total - off[end], total: total, scrollTo: scrollTo };
  }
```

No objeto `api`, depois de `viewCuller: viewCuller,`: `    treeWindow: treeWindow,`.

- [ ] **Step 3: Verificar e commitar**

Run: `npm test` — Expected: PASS.

```bash
git add lib/layers-core.js test/layers-core.test.js
git commit -m "feat(core): add treeWindow row-window helper (S4.7)"
```

### Task 4: Janela no template e em `render()` (só com "go")

**Files:**
- Modify: `index.html`. Template `:270` (contêiner: `onScroll`, `onBlur`), `:273`/`:301` e `:304`/`:329` (espaçadores com `data-tree-pad`), `:288` e `:317` (`data-code-key` na linha de código). Constantes perto de `CULL_MARGIN`. `render()` (faixa no lugar de `treeRows`/`elemRows`), `revealInTree` (`:1821-1826`), `componentDidUpdate` (`:1591`), `codeRow` (`codeKey`).

**Interfaces:**
- Consumes: `LayersCore.treeWindow` (Task 3), `treeModel` (Task 2).
- Produces: estado `treeWin: { top, h, v }`; constantes `TREE_ROW_H = 22`, `TREE_PAD = 4`, `TREE_OVERSCAN = 10`; `this.codeH` (altura medida por `codeKey`); `this._treeAll`/`this._treeH` (lista completa e alturas da aba ativa).

- [ ] **Step 1: Template (invisível)**

Contar cada âncora (`grep -c` = 1) antes de trocar. Dentro de cada `sc-if` de aba, antes do `sc-for`: `<div data-tree-pad="top" style="height:{{ treePadTop }}"></div>`; depois do `</sc-for>`: `<div data-tree-pad="bottom" style="height:{{ treePadBot }}"></div>`. No contêiner `:270`: `onScroll="{{ treeScroll }}" onBlur="{{ treeBlur }}"`. Nas `div` externas das linhas de código: `data-code-key="{{ t.codeKey }}"` / `data-code-key="{{ r.codeKey }}"`. Nenhum estilo muda.

- [ ] **Step 2: Janela em `render()`**

Alturas da aba ativa: linha de nó `null`; linha de código `this.codeH[codeKey]` ou a estimativa `80 + rows * 15` até a 1ª medida. Chamar `treeWindow({ scrollTop: s.treeWin.top - TREE_PAD, viewH: s.treeWin.h || 600, rowH: TREE_ROW_H, rows, overscan: TREE_OVERSCAN })`. Exportar `treeRows`/`elemRows` = `out.slice(start, end)` da aba ativa, `treePadTop: top + 'px'` e `treePadBot: bottom + 'px'`, e guardar a lista completa e as alturas da aba ativa em `this._treeAll`/`this._treeH` (para `revealInTree` e `treeScroll`).

- [ ] **Step 3: Scroll, foco, tamanho e alturas**

- `treeScroll(e)`: com `|scrollTop − s.treeWin.top| ≥ TREE_OVERSCAN / 2 * TREE_ROW_H` (110 px), ou no início/fim da lista, faz `setState({ treeWin: { ...st.treeWin, top: scrollTop } })`; abaixo disso não há render. No mesmo `setState`, se a linha de `hoverId` sai da faixa nova (`treeWindow` sobre `this._treeH`; a linha desmontada nunca recebe `mouseleave`), `hoverId: null`.
- Foco, conforme [!DECISION] `focus-during-scroll`: com `box.contains(document.activeElement)` e o foco numa `textarea` ou `:focus-visible`, `top` não muda. Com foco de mouse num botão da linha, `document.activeElement.blur()` antes de mover `top`. `treeBlur(e)`: se `e.relatedTarget` está dentro do contêiner, nada; senão aplica o `scrollTop` atual.
- `componentDidUpdate`: se `this.treeScrollRef.current` mudou (o painel abriu de novo), redefinir `treeWin.top` a partir de `box.scrollTop` e observar o contêiner com um `ResizeObserver` (`h` = `contentRect.height` + 8). Com o mesmo RO, para cada `[data-code-key]` montada (`querySelectorAll`, sem leitura de layout) cujo `dataset.codeKey` difere do último observado nesse elemento (`WeakMap` elemento → chave): `unobserve` + `observe` (força o callback inicial, inclusive num slot reaproveitado com a mesma altura). O callback lê a chave em `entry.target.dataset.codeKey` no momento do callback (nunca a capturada no `observe`, porque com `key` = índice o mesmo `div` passa a mostrar outra regra), grava `this.codeH[key]` (`borderBoxSize`) e, se mudou, incrementa `treeWin.v`.
- Nenhuma leitura de `scrollTop`/`clientHeight`/`getBoundingClientRect` dentro de `render()`.

- [ ] **Step 4: `revealInTree` por índice**

Trocar o corpo de `revealInTree(id)`: `box` nulo → retorna; `i` = índice de `id` em `this._treeAll` (`id` na Hierarquia, `nodeId` na Elementos); `i < 0` → retorna; `w = LayersCore.treeWindow({ scrollTop: box.scrollTop - TREE_PAD, viewH: box.clientHeight, rowH: TREE_ROW_H, rows: this._treeH, overscan: 0, reveal: i })`; com `w.scrollTo !== null`, `box.scrollTop = w.scrollTo + TREE_PAD` (o `onScroll` atualiza a janela). Mesma folga de 22 px de hoje.

- [ ] **Step 5: Verificar**

Run: `npm test` e (wrapper) `npx playwright test --project=chromium e2e/tree-rows.spec.js e2e/tree-snapshot.spec.js e2e/viewport-culling.spec.js` — Expected: PASS. Comando de **Baselines visuais** (baselines da Task 2 Step 1, sem `--update-snapshots`) — Expected: diff zero em `tree-top`, `tree-mid` e `tree-code`. As specs com seletores crus podem falhar aqui; a Task 5 as corrige.

```bash
git add index.html
git commit -m "perf: render only the visible tree rows with spacers (S4.7)"
```

### Task 5: E2E da janela e seletores crus (só com "go")

**Files:**
- Create: `e2e/virtual-tree.spec.js`
- Modify: `e2e/tree-helpers.js` (`treeRow`, `lastTreeRow`, `treeWindowState`), `e2e/folder-helpers.js:47-50` (`selectLayer` delega a `treeRow`; comentário `:47` atualizado), `multi-state.spec.js:56`, `manual-marker.spec.js:34-35`/`:54` (e o `select` que chama `pick`), `pending-persist.spec.js:17`, `scope-all-equal.spec.js:28`, `snap-fidelity.spec.js:45`/`:49`, `undo-redo.spec.js:19`

**Interfaces:**
- Produces: `treeRow(page, { title?, text? }) → Locator` (rola o contêiner do topo, um `clientHeight` por vez, até montar a linha; lança `tree row not found: …` no fim); `lastTreeRow(page) → Locator` (rola até o fim e devolve a última `[data-node-id]`); `treeWindowState(page) → { mounted, scrollHeight, clientHeight, padTop, padBot, contiguous, covers }`. `contiguous` = filhos do contêiner encostados e soma das alturas = `scrollHeight − 8`. `covers` = a faixa montada cobre o retângulo visível: `(padTop === 0 || topo da 1ª linha montada ≤ topo visível do contêiner) && (padBot === 0 || base da última linha montada ≥ base visível)`. O contêiner é o ancestral de `[data-node-id]` com `overflow-y: auto` computado (como `scrollFrames`), então os helpers funcionam com e sem janela; sem janela, `padTop`/`padBot` = 0.

- [ ] **Step 1: Helpers e migração**

Escrever os três helpers. Trocar cada seletor cru por `selectLayer`/`treeRow`/`lastTreeRow` (o prefixo do `title` continua igual). Como o contêiner não depende de `[data-tree-pad]`, a troca vale com e sem janela, em qualquer fixture.

Run: `grep -rn "data-node-id" e2e/ | grep -v -e tree-helpers.js -e virtual-tree.spec.js -e tree-rows.spec.js -e tree-perf-helpers.js -e tree-visual.spec.js` — Expected: só usos por id exato (`[data-node-id="0"]`) ou por posição no topo, nenhum `title^=` nem `.last()` cru.

- [ ] **Step 2: `e2e/virtual-tree.spec.js`**

Fixture: Traval inflado (`inflateTraval(page, 1500)` de `tree-perf-helpers.js`), `waitForScan(page, 1000, 40_000)`.
- `VirtualTree_1500Nos_MontaPoucasLinhas`: `mounted ≤ ceil(clientHeight / 22) + 2 * 10 + 2`; `scrollHeight === 8 + N * 22`, com `N` da etiqueta "Hierarquia N" (tudo expandido, sem código aberto); `contiguous` e `covers`.
- `VirtualTree_RolagemEmPassos_FaixaCobreAVista`: do topo ao fim em passos de 97 px (nem múltiplo de 22 nem de 110), 2 frames por passo → `covers` e `contiguous` em **todo** passo (é o invariante central: os espaçadores somam o total por construção, então só `covers` prova que a vista não fica vazia).
- `VirtualTree_SelecionarPlano_RolaAteALinha`: `el.click()` dentro de `page.evaluate` no último elemento de plano do palco (mesmo filtro de plano de `planeCensus`; não um clique de tela, que acertaria outro plano à frente em 3D) → a linha com `●` está montada e dentro do retângulo do contêiner.
- `VirtualTree_RolagemAteOFim_MostraUltimoNo`: `scrollTop = scrollHeight`, 2 frames → `padBot === 0`, a última linha montada encosta no fim do conteúdo (≤ 1 px), `contiguous` e `covers`.
- `VirtualTree_BuscaFiltrar_MantemIndices`: rolar ao meio, buscar um nome que casa em várias cópias, Filtrar → `contiguous`, `covers`, `scrollHeight === 8 + k * 22` com `k` inteiro e menor que `N`, e toda linha montada casa ou é ancestral; limpar (Esc) → `scrollHeight` volta a `8 + N * 22`.
- `VirtualTree_CodigoAberto_AlturaVariavel`: abrir o `{ }` da linha selecionada → `scrollHeight === 8 + N * 22 + h`, com `h` = altura da linha de código; aumentar `textarea.style.height` em 60 px via `page.evaluate` (mesmo efeito da alça `resize:vertical`, sem acertar a alça) e esperar 2 frames → `scrollHeight` cresce 60 (±1); rolar até o fim e voltar → `contiguous` e `covers`.
- `VirtualTree_DigitandoNoCodigo_RolagemNaoTrocaARegra`: no meio da lista (longe do topo, onde `start` fica preso em 0 e anda menos que o scroll), abrir o `{ }` de duas linhas (hover + clique) separadas por 41 linhas de nó, para que rolar essa distância leve a 2ª linha de código ao slot da 1ª. Focar a textarea da 1ª e anotar o `data-code-key` dela; rolar o contêiner `h1 + 41 × 22` px (`h1` = altura medida da 1ª linha de código; a 2ª está desmontada, então nada de `offsetTop`), 2 frames; só então digitar `/*y*/`. Expected: `document.activeElement` é uma textarea cujo `closest('[data-code-key]').dataset.codeKey` é a chave anotada; Esc (blur); de volta ao topo, a textarea da 1ª regra contém `/*y*/` e a da 2ª não.
- `VirtualTree_BotaoComFoco_RolagemNaoTrocaONo`: focar a busca da árvore e apertar Tab até o foco entrar num botão de linha (`closest('[data-node-id]')`, no máximo 40 Tabs; foco de teclado, `:focus-visible`); anotar o `data-node-id`. Rolar o contêiner 2.000 px, 2 frames → o foco segue num botão da mesma `data-node-id`; Enter → de volta ao topo, a linha anotada mudou (ex.: `▾` → `▸` no chevron) e as linhas montadas acima dela ficaram iguais.

- [ ] **Step 3: Rodar a suíte da árvore, as specs migradas e a compat**

Run (wrapper): `npx playwright test --project=chromium e2e/virtual-tree.spec.js e2e/tree-rows.spec.js e2e/tree-snapshot.spec.js e2e/apply-flow.spec.js e2e/write-log-hash.spec.js e2e/browser-compat.spec.js e2e/multi-state.spec.js e2e/manual-marker.spec.js e2e/pending-persist.spec.js e2e/scope-all-equal.spec.js e2e/snap-fidelity.spec.js e2e/undo-redo.spec.js` — Expected: PASS.
Run (wrapper, trocando `--project=chromium` por esta lista): `npx playwright test --project=firefox --project=webkit --project=chrome --project=msedge e2e/browser-compat.spec.js e2e/apply-flow.spec.js` — Expected: PASS (`selectLayer` em `browser-compat.spec.js:77` e em `apply-flow`; o `testMatch` de `playwright.config.js:21-25` filtra cada spec para os seus engines).
Prova de regressão: trocar temporariamente `TREE_OVERSCAN = 10` por `TREE_OVERSCAN = -5`, rodar `e2e/virtual-tree.spec.js` → FAIL em `covers` (`RolagemEmPassos`) e em `RolagemAteOFim`; restaurar com `git checkout -- index.html`.

```bash
npm test
git add e2e/virtual-tree.spec.js e2e/tree-helpers.js e2e/folder-helpers.js e2e/multi-state.spec.js e2e/manual-marker.spec.js e2e/pending-persist.spec.js e2e/scope-all-equal.spec.js e2e/snap-fidelity.spec.js e2e/undo-redo.spec.js
git commit -m "test(e2e): virtual tree invariants and window-safe tree row helpers (S4.7)"
```

Expected: `git status --porcelain` vazio (as baselines visuais estão em `$SCRATCH/s47/`).

### Task 6: Medição final e documentação

**Files:**
- Modify: `docs/RELEASE-CHECKLIST.md:51-52`, `docs/ARCHITECTURE.md:126`, `e2e/perf.spec.js:146-153` (só nas condições do Step 3), `docs/roadmap.md:65`
- Create: `changelog.d/feature-261016-0-s4-7-virtual-tree.md`, `bench/results/<ts>-layers-ui.bench.json` ×6

Caminho: **janela** (Tasks 3-5 feitas), **memo** (no-go no gate 2 final) ou **medido-negativo** (parou no gate 1 com [!DECISION] `gate-1` Option C).

- [ ] **Step 1: Base atualizada**

O rebase sobre a S4.8 já aconteceu na Task 2 Step 6 (no caminho medido-negativo, fazê-lo aqui com o mesmo procedimento). Se `origin/develop` andou depois disso: `git fetch origin && git rebase origin/develop`. Run: `npm test` — Expected: PASS.

- [ ] **Step 2: Antes e depois alternados sobre a mesma base** (caminhos janela e memo)

- **Base:** worktree no commit da Task 1 Step 3 depois do último rebase: `git worktree add "$(git rev-parse --path-format=absolute --git-common-dir)/../.claude/worktrees/s4-7-base" <SHA>` (ou o da Task 2 Step 6, se ainda aponta para esse SHA) e `npm ci` nele.
- **Alternar ABABAB:** execução na base, execução no `HEAD` da leaf, e assim por diante até 3 de cada (wrapper com `run_in_background: true` e procedimento de árvore limpa em cada worktree; todo arquivo vai para `$SCRATCH/s47/`). Alternar evita que a deriva da máquina caia toda num lado.
- Trazer os 6 para `bench/results` da leaf e rodar `node "$SCRATCH/s47/table.cjs" <SHA base> "$(git rev-parse HEAD)"` (a tabela separa os trios pelo `sha`). Expected: `dirty false` nos seis, exit 0. Ingest/render do bench-history. Remover o worktree base no fim (`git worktree remove "$(git rev-parse --path-format=absolute --git-common-dir)/../.claude/worktrees/s4-7-base"`).

Guardas (calculadas pela tabela): para `orbit/traval`, `orbit/1500-tags` e `tree/1500-tags/scroll-frame-ms`, mediana depois ≤ mediana antes + `max(0,5 ms, 2σ)`, com `σ` = desvio-padrão amostral das 3 runs de antes (o `rec` grava `stddev: 0`, por isso a tabela calcula das runs). `tree/*/hover-ms` e `tree/*/select-ms` são só relatados, nunca guardas: medem até o 2º rAF e ficam presos ao vsync. `FAIL` → parar e relatar.

- [ ] **Step 3: Teste de orçamento**

- `Orbit_Budget_Above50Fps` relatado como "expected to fail, but passed" nas 3 execuções de depois → apagar a linha `test.fail(...)` e as 3 linhas de comentário acima.
- Senão: tirar a S4.7 do comentário e da mensagem do `test.fail`, mantendo só as leaves ainda abertas no roadmap nesse momento e a fps medida. Se nenhuma leaf aberta cobrir o resto do gap, parar e perguntar ao usuário qual leaf citar.

- [ ] **Step 4: Textos (sem `<…>` no resultado)**

`docs/RELEASE-CHECKLIST.md:51`, por caminho:
- janela: `- [x] Árvore virtualizada: só as linhas visíveis (± 10) são montadas, com espaçadores e altura medida das linhas de código; linhas memoizadas sem hover/seleção na chave (\`LayersCore.treeWindow\`, S4.7; \`e2e/virtual-tree.spec.js\`). Orbit Traval <a> ms/frame (antes <b>); 1.500 tags: <a15> ms (antes <b15>), mediana de 3.`
- memo: `- [~] Árvore virtualizada: linhas memoizadas e aba inativa não construída (S4.7); janela não implementada porque, depois do memo, a árvore ficou em <r> % do frame do orbit (< 10 %, mediana de 3). Detalhe no [plano da S4.7](superpowers/plans/2026-10-16-s4-7-virtual-tree.md).`
- medido-negativo: `- [~] Árvore virtualizada: medida na S4.7 fora do caminho crítico (teto com a árvore recolhida: <I> ms/frame contra <B> ms de base, mediana de 3); nada implementado. Detalhe no [plano da S4.7](superpowers/plans/2026-10-16-s4-7-virtual-tree.md).`

`docs/RELEASE-CHECKLIST.md:52`: trocar só o trecho do orbit pelos números de depois (fps, ms/frame, p95, data, base com S4.4b/S4.5/S4.8) e as leaves citadas como abertas. `[~]` → `[x]` só se scan e orbit cumprem o orçamento. A linha 8 (contador) não muda.

`docs/ARCHITECTURE.md:126`: em "Próximo passo", tirar "árvore virtualizada (S4.7)" e acrescentar à lista de mitigações uma frase do caminho (janela de linhas com espaçadores e memo / memo das linhas / árvore medida fora do caminho crítico).

- [ ] **Step 5: Fragmento, roadmap e commit**

`changelog.d/feature-261016-0-s4-7-virtual-tree.md`, no formato da S4.5 (`adr: none`, `### Added`/`### Changed` do caminho, `### Perf` com bullets `measured — …` de orbit Traval, orbit 1.500 tags, scroll a 1.500 tags e hover/seleção a 1.500 tags, antes → depois, mediana de 3 alternadas, Chromium <versão>, i7-12700; no caminho medido-negativo, `measured — teto …` e nenhum código do app mudou). Linha S4.7 de `docs/roadmap.md`: motivo curto do resultado, `report` → fragmento, status `done` (via `phase-close-gate`); `python ~/.claude/design/_build_proto.py .`.

```bash
npm test
grep -n "<[a-z]" changelog.d/feature-261016-0-s4-7-virtual-tree.md   # Expected: nenhuma linha
git add docs changelog.d/feature-261016-0-s4-7-virtual-tree.md e2e/perf.spec.js bench/results/<f1>-layers-ui.bench.json bench/results/<f2>-layers-ui.bench.json bench/results/<f3>-layers-ui.bench.json bench/results/<f4>-layers-ui.bench.json bench/results/<f5>-layers-ui.bench.json bench/results/<f6>-layers-ui.bench.json
git commit -m "docs: close S4.7 with measurements, checklist and changelog (S4.7)"
```

`<f1>`..`<f6>` = os 6 nomes do Step 2 (os da tabela). Expected: `git status --porcelain` vazio.

## Critical Files

`index.html` (`:270-330` template da árvore, `:1101` ref, `:1562` hover de plano, `:1591-1601` `componentDidUpdate`, `:1764-1777` padrão de memo, `:1779` `select`, `:1782-1800` `codeFor`/`codeRow`, `:1821-1826` `revealInTree`, `:2214-2264` linhas, `:2374-2391` export), `lib/layers-core.js` (`viewCuller` `:751`, export `:1486`), `test/layers-core.test.js`, `e2e/perf.spec.js`, `e2e/tree-perf-helpers.js` (novo), `e2e/tree-rows.spec.js` (novo), `e2e/tree-visual.spec.js` (novo), `e2e/virtual-tree.spec.js` (novo), `e2e/tree-helpers.js`, `e2e/folder-helpers.js:47-50`, `e2e/browser-compat.spec.js:77`, as 7 specs com seletor cru, `playwright.config.js:4-5`/`:21-25`, `docs/RELEASE-CHECKLIST.md:51-52`, `docs/ARCHITECTURE.md:126`, `docs/roadmap.md:65`.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 0. Worktree, linha do roadmap e rebuild | gen | Mechanical | Executor | texto da linha dado literal; caller valida o diff de uma linha e o `exit_code` do rebuild |
| 1 Steps 1-2, 5. Helpers, cenários, gate 1 | gen | Standard | Workhorse | autoria de teste e julgamento de medição |
| 1 Steps 3-4, 2 Steps 5-6 (execuções), 6 Step 2 (execuções ABABAB). Runs limpas + tabela | gen | Mechanical | Executor | rodar e resumir; caller valida `dirty false`, `sha`, sem `MISSING`, `exit_code` da tabela e os nomes dos arquivos |
| 2. Caracterização, baselines visuais, extração, memo, gates 2 | gen | Standard | Workhorse | caminho quente com julgamento de chave |
| 2. Review do memo (chaves, decoração, aba inativa) | review | Architectural | Architect | hot path, regra 5; via `adversarial-reviewer`, antes da Task 3 |
| 3. `treeWindow` + Vitest | gen | Standard | Workhorse | código e vetores dados no plano |
| 4. Template, `render()`, RO, foco, `revealInTree` | gen | Standard | Workhorse | caminho quente, âncoras únicas |
| 4. Review da janela (foco, RO, scroll, remontagem) | review | Architectural | Architect | hot path, regra 5; antes da Task 5 |
| 5. E2E e migração de seletores | gen | Standard | Workhorse | autoria de teste |
| 6 Steps 1, 3-5. Rebase, orçamento, textos, fragmento | gen | Standard | Workhorse | julgamento do resultado e prosa |
| Pre-merge review | review | Architectural | Architect | verificador ≥ gerador |

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — leaf já rastreada no roadmap (S4.7) e no checklist D, com plano versionado e PR como superfície de revisão; mesmo tratamento da S4.5/S4.6.

> [!DECISION] phase-intake
> Classification: **meso** `S4.7` sob **S4 Performance**, alvo **Unreleased** (gate da v1: checklist D).
> Current tree (relevant slice): S4 Performance › S4.5, S4.6 `done` › S4.7 Árvore virtualizada, S4.8 Custo dos planos `registered`.
> Fork of an existing row? **No** (linha S4.7 já existe; nenhuma leaf nova).
> - **Option A**: manter S4.7 como está (recomendada)
> - **Option B**: se o gate 1 falhar, fechar a S4.7 como medida-negativa e registrar o gap restante na leaf que a quebra do frame indicar

> [!DECISION] execution
> Method: **Subagent-driven**, estritamente sequencial: 0 → 1 (gate 1) → 2 Steps 1-5 (gate 2 provisório) → espera o merge da S4.8 → 2 Step 6 (rebase, gate 1 de novo se a V1 entrou, gate 2 final) → [3 → 4 → review → 5] só com "go" → 6. Tasks 0 a 2 Step 5 rodam em paralelo com a S4.8, cada uma em seu worktree. As linhas Mechanical vão para o subagente `executor`.
