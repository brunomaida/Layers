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

**Architecture:** Task 1 mede o teto com a árvore recolhida (painel e raiz L0) no Traval e num Traval inflado a ~1.500 tags. Task 2 tira a construção das linhas do caminho de cada render: memo estrutural sem `selId`/`hoverId`, decoração só das linhas de `selId` e `hoverId` e nenhuma linha da aba inativa. **Tasks 3-5 só rodam com "go" numérico na Task 2:** helper puro `treeWindow` ao lado de `viewCuller`, ligação no template e em `render()`, E2E e migração dos seletores crus. Task 6 mede sobre `develop` já com a S4.8 e fecha a documentação.

**Tech Stack:** JS puro, Vitest, Playwright (`--project=chromium`).

## Context

Checklist D: "Árvore virtualizada" ([RELEASE-CHECKLIST.md](../../RELEASE-CHECKLIST.md) linha 51) e o orçamento da linha 52 (orbit > 50 fps; hoje ~42 fps no Traval). A leaf S4.7 está em [roadmap.md](../../roadmap.md) linha 65 (`registered`), e `"S4.7"` já é membro de `docs/roadmap.config.json:76`. Na S4.6 a base mediu script ~7,7 ms de um frame de ~23,8 ms: mesmo um teto perfeito da árvore pode não fechar os 50 fps sozinho, e a S4.8 (custo dos planos) ataca o mesmo orçamento.

Superfície verificada (`develop@0da02d6`, branch `docs/261016-0-wave-3-plan`):

| Site | Linhas | Papel |
|---|---|---|
| contêiner rolável | `index.html:270` | `ref="{{ treeScrollRef }}"`, `overflow-y:auto;padding:4px 0`; ref criada em `:1101` |
| template Hierarquia | `index.html:272-302` | `sc-for list="{{ treeRows }}"`; linha de nó com `height:22px` fixo (`:275`), recuo `6 + depth*12` px; linha de código com textarea (`:287-300`) |
| template Elementos | `index.html:303-330` | `sc-for list="{{ elemRows }}"`; linha de nó 22 px (`:306`), linha de código (`:316-328`) |
| `sc-for` | `support.js:635-640` (gerado, não editar) | `list.map` a cada render, `key` = índice |
| painel recolhido | `index.html:246`, `:251`, `:2390` | `toggleTree` desmonta a árvore, mas `render()` continua construindo as linhas |
| linhas Hierarquia | `index.html:2214-2230` | `kidsOf`, busca (`tHit`), `pushRow` recursivo; closures por linha capturam `s` |
| linhas Elementos | `index.html:2232-2257` | construídas em todo render, mesmo com `treeTab === 'hier'`; `ruleCount` alimenta a etiqueta da aba (`:254`) nas duas abas |
| recolher tudo | `index.html:2258-2264` | `collapsible`, `hierAllClosed`, `elemAllClosed` |
| export | `index.html:2375`, `:2377`, `:2390` | `treeQHits`, `treeHier`/`treeElems`/`elemRows`/`ruleCount`, `treeRows`/`treeOpen`/`toggleTree` |
| hover de plano | `index.html:1562` | `H.enter` → `setState({ hoverId })` a cada plano cruzado, inclusive durante o arrasto |
| hover de linha | `index.html:2225` | `hover: () => this.setState({ hoverId: n.id })` |
| `select()` | `index.html:1779` | abre ancestrais (`treeClosed`), `elOpen`, depois `revealInTree(id)` |
| `codeRow()` | `index.html:1794-1800` | textarea com `rows` = 3..16; nota com `white-space:normal` (quebra com a largura); `resize:vertical` |
| `codeFor()` | `index.html:1782-1792` | lê `s.fileText` e o atributo `style` vivo do elemento |
| `revealInTree()` | `index.html:1821-1826` | `querySelector('[data-node-id=…]')`; com a linha desmontada não rola |
| memos existentes | `index.html:1764-1777` | `visibleMax()` (`this._vm`) e `cam()` (`this._cam`): padrão de chave + `nodes` |
| `viewCuller` | `lib/layers-core.js:751`, export `:1486` | vizinho do helper novo |
| orçamento | `e2e/perf.spec.js:146-153` | `Orbit_Budget_Above50Fps` com `test.fail` citando S4.7 e S4.8 |

Seletores crus de linha da árvore nos E2E (quebram quando a linha não está montada): `e2e/folder-helpers.js:49` (`selectLayer`, comentário em `:47`; usado por `apply-flow`, `browser-compat`, `write-log-hash` ×3), `multi-state.spec.js:56` (`.last()`), `manual-marker.spec.js:34-35` e `:54`, `pending-persist.spec.js:17`, `scope-all-equal.spec.js:28`, `snap-fidelity.spec.js:45` e `:49`, `undo-redo.spec.js:19`.

Desvios do briefing, a confirmar ([!DECISION] `branch`): a branch usa `feature/` porque `perf/` não está na lista de tipos de `fact-git-conventions`, e o `changelog-draft` deriva o fragmento do nome da branch. A leaf já existe no roadmap e na config: o 1º commit só troca o status e linka o plano.

Fora de escopo: navegação por teclado na árvore (colide com S3.3/S7.4); textos de `title` das linhas (S3.3; o prefixo `n.name · L…` não muda); `rail` (`:2209-2213`); custo dos planos (S4.8); o contador do checklist (linha 8); `support.js`.

## Design: Architecture & Flows

Componente único (`render()` do `index.html`) mais um helper puro. O diagrama mostra um render; o ramo `[T3-T5]` só existe com "go" na Task 2.

```
 setState (drag yaw/tilt · hover de plano/linha · seleção · busca · scroll da árvore)
        │
        ▼
 render() ─┬─ chave estrutural H: nodes, byId, treeClosed, treeQ, treeMode, hierCode, isoId,
           │   scope, codeBuf, fileText, changes, treeTab              [T2 NOVO: this._tree]
           │     igual  ──▶ reaproveita linhas + remake[] (zero closures novas)
           │     mudou  ──▶ buildHier(): pushRow como hoje, com isSel = isHov = false
           │
           ├─ decoração: out = rows.slice(); só as linhas de selId e hoverId
           │   refeitas por remake[i](isSel, isHov)                    [T2 NOVO: ≤ 2 linhas]
           │
           ├─ aba inativa: não constrói linhas; rulesByKey/ruleCount continuam
           │
           ├─ [T3-T5] janela: alturas (22 px ou altura medida da linha de código)
           │   LayersCore.treeWindow({ scrollTop - 4, viewH, rowH: 22, rows, overscan: 10 })
           │     ──▶ { start, end, top, bottom }  ──▶ treeRows = out.slice(start, end)
           │
           ▼
 template: [espaçador top] sc-for (só a faixa) [espaçador bottom]     (invisíveis, mesma altura total)
           onScroll: só setState quando o scroll anda ≥ 110 px (meia sobra)
           ResizeObserver: altura do contêiner e das linhas de código montadas
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

Sem mockup: nada visível muda (visual congelado). Os espaçadores são `div` vazios com altura e mantêm a altura total, então a barra de rolagem fica igual.

## Global Constraints

- Visual congelado: linha de nó com 22 px, fontes, recuo, cores e barra de rolagem iguais; Destacar/Filtrar, `treeClosed`, recolher tudo e as duas abas continuam funcionando. O `title` das linhas não muda.
- `index.html`: âncoras únicas, `grep -c` = 1 antes de substituir; `support.js` intocado; sem mudança no `<head>`, sem rede.
- Commits: Conventional Commits em EN com sufixo `(S4.7)`, nunca `Co-Authored-By` nem atribuição a IA, nada em `develop`/`master`. Nunca usar `git stash` (o stash é compartilhado entre worktrees; restaurar com `git checkout -- <arquivo>`).
- Testes `Metodo_Cenario_Esperado`; `npm test` verde antes de cada commit.
- **Wrapper E2E** (todo comando Playwright deste plano roda dentro dele; Bash `timeout: 600000`). A S4.8 roda em worktree paralelo e `reuseExistingServer: true` testaria o código de outra branch sem avisar:

```bash
n=0; until mkdir /tmp/layers-e2e.lock 2>/dev/null; do n=$((n+1)); [ "$n" -ge 60 ] && { echo "COULD NOT RUN: stale lock"; exit 1; }; sleep 5; done
trap 'rmdir /tmp/layers-e2e.lock' EXIT
code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5180/); [ "$code" = "000" ] || { echo "COULD NOT RUN: port 5180 busy ($code)"; exit 1; }
npx playwright test --project=chromium <specs>
```

- **Procedimento de árvore limpa** (Tasks 1, 2 e 6). `writeBench` grava `git.dirty` a partir de `git status --porcelain`, e o arquivo de resultado novo fica untracked. Por isso, depois de cada execução, mover o arquivo para `$SCRATCH` (scratchpad da sessão) e trazer os três de volta antes da tabela:

```bash
test -z "$(git status --porcelain)" || { echo "tree not clean before the run"; exit 1; }
# ... wrapper E2E com <specs> = e2e/perf.spec.js ...
mv "$(ls -t bench/results/*-layers-ui.bench.json | head -1)" "$SCRATCH/"
# depois da terceira:
mv "$SCRATCH"/*-layers-ui.bench.json bench/results/
```

- Medição: mesma máquina, aba em foco, sem outro processo pesado; comparar só runs com o mesmo `env` ([bench-methodology.md](../../bench-methodology.md) § Decision rules). As decisões usam a mediana de 3 runs com `dirty false,false,false`.

## Review Focus

- **O memo não remove o custo do React.** `sc-for` faz `list.map` e cria elementos a cada render (`support.js:635-640`): um array memoizado poupa só a construção das linhas (closures, strings, `kidsOf`, busca), nunca a criação nem o diff dos elementos. Esse resíduo é o que a janela ataca, e é o que o gate da Task 2 mede.
- **`hoverId` fora da chave.** Durante o orbit, `H.enter` (`:1562`) troca `hoverId` a cada plano cruzado; com `hoverId`/`selId` na chave o memo invalidaria justo no cenário do orçamento. Por isso a estrutura é memoizada sem eles, e só as linhas afetadas são refeitas. A Task 1 registra `hoverSwapsPerFrame` como evidência.
- **Chave completa.** As closures das linhas capturam `s`: toda leitura de `s.*` no bloco extraído (e em `codeRow`/`codeFor`) entra na chave estrutural, ou a linha fica com valor velho. A Task 2 confere por `grep`. A aba Elementos inclui `selId` na chave estrutural (`rSel`, `fSel`, `inSel` e o `click` da regra dependem dele) e decora só `hoverId`.
- **`ruleCount` nas duas abas.** Pular a aba inativa não pode zerar a etiqueta "Elementos N" (`:254`) nem `treeQHits` (`:2375`).
- **Altura da linha de código** não sai de `rows`: a nota quebra com a largura, a textarea é `resize:vertical` e há 20 px de cabeçalho mais folgas. A janela usa a altura medida (ResizeObserver, sem leitura de layout forçada no render) com estimativa até a 1ª medida.
- **`key` por índice e textarea com foco.** Quando `start` muda, o slot do `sc-for` pode passar a mostrar outra regra no mesmo `<textarea>` com foco, e a digitação iria para a regra errada ([!DECISION] `focus-during-scroll`).
- **`revealInTree` sem DOM.** Usa o índice na lista completa da aba ativa e `treeWindow(reveal)`, nunca `querySelector`; árvore recolhida (`treeOpen` falso) continua sem efeito.
- **Remontagem do contêiner.** Recolher/expandir o painel recria o contêiner com `scrollTop = 0`; o estado da janela tem de acompanhar (sem `onScroll` nesse caso).
- **Eventos do template.** `support.js:439` mapeia qualquer `on*` sem entrada no `EVENT_MAP` para o nome React (`onscroll` → `onScroll`); `onblur` → `onBlur` está no mapa (`:330`).

> [!DECISION] focus-during-scroll
> O que acontece quando a janela andaria com o foco numa textarea de código da árvore (`key` por índice no `sc-for`).
> - **Option A (recomendada)**: congelar `start` enquanto há foco numa textarea da árvore; `onBlur` no contêiner reaplica o `scrollTop`. Nunca edita a regra errada nem perde o foco; rolando além da sobra (220 px), a área fora da faixa fica vazia até o blur.
> - **Option B**: `blur()` da textarea quando a janela anda. Sem área vazia, mas a próxima tecla cai no `onKey` global (atalhos como `R`, `M`).
> - **Option C**: linhas de código sempre montadas fora da janela. Não resolve: o índice do slot ainda muda com `start`.

> [!DECISION] branch
> - **Option A (recomendada)**: `feature/261016-0-s4-7-virtual-tree`. Tipo válido em `fact-git-conventions`; o fragmento derivado pelo `changelog-draft` é `feature-261016-0-s4-7-virtual-tree.md`, o nome pedido; mesmo padrão da S4.5/S4.6.
> - **Option B**: `perf/261016-0-s4-7-virtual-tree`, como no briefing. Tipo fora da lista; o fragmento passaria a `perf-261016-0-s4-7-virtual-tree.md`.

### Task 0: Iniciar a S4.7 no tracker

**Files:**
- Modify: `docs/roadmap.md:65` (linha S4.7), `docs/roadmap.data.json` (rebuild)

- [ ] **Step 1: Branch e linha do roadmap**

```bash
git switch develop && git pull --ff-only
git switch -c feature/261016-0-s4-7-virtual-tree
```

Em `docs/roadmap.md`, trocar a linha `| S4.7 | 2 | S4 | Árvore virtualizada | checklist D | — | — | — | — | registered |` por:

```md
| S4.7 | 2 | S4 | Árvore virtualizada | checklist D | — | [](superpowers/plans/2026-10-16-s4-7-virtual-tree.md) | — | — | in-progress |
```

`docs/roadmap.config.json` já tem `"S4.7"` (linha 76): não editar. Run: `python ~/.claude/design/_build_proto.py .` — Expected: exit 0; `docs/roadmap.data.json` com S4.7 `in-progress`.

- [ ] **Step 2: Commit e plano**

```bash
git add docs/roadmap.md docs/roadmap.data.json
git commit -m "docs: start S4.7 in the tracker (S4.7)"
```

Se este plano ainda não estiver em `develop`: `git cherry-pick <commit do plano na branch docs/261016-0-wave-3-plan>`. Expected: `test -f docs/superpowers/plans/2026-10-16-s4-7-virtual-tree.md` ok e `git log --oneline develop..HEAD` com o commit do tracker primeiro.

### Task 1: Medir o teto da árvore (gate 1)

**Files:**
- Create: `e2e/tree-perf-helpers.js`
- Modify: `e2e/perf.spec.js` (import `:2`, `EXPECTED` `:4-14`, testes novos depois de `Orbit_ZoomedIdeal_RecordsFrameInterval`, antes de `Orbit_Budget_Above50Fps`). Helpers em arquivo próprio para não colidir com a S4.8 em `e2e/perf-helpers.js`.
- Create: `bench/results/<ts>-layers-ui.bench.json` ×3

**Interfaces:**
- Produces: `inflateTraval(page, tags)`, `treeMode(page, mode)`, `countHoverSwaps(page) → stop(): Promise<number>`, `rowInputCost(page, kind, n?) → { medianMs, samples }`; bench ids `orbit/traval-tree-closed`, `orbit/traval-tree-ideal`, `orbit/1500-tags`, `orbit/1500-tags-tree-closed`, `orbit/1500-tags-tree-ideal` (todos `/mean-frame-ms`), `tree/traval/hover-ms`, `tree/traval/select-ms`, `tree/1500-tags/hover-ms`, `tree/1500-tags/select-ms`.

Leitura dos cenários: `open` = padrão (todas as linhas construídas e montadas); `closed` = painel recolhido (linhas construídas, nenhuma montada); `ideal` = raiz L0 recolhida (1 linha construída e montada). Então `B − C` ≈ montagem/diff (teto da janela) e `C − I` ≈ construção (teto do memo).

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
```

- [ ] **Step 2: Cenários no `perf.spec.js`**

- import novo: `import { inflateTraval, treeMode, countHoverSwaps, rowInputCost } from './tree-perf-helpers.js';`
- `EXPECTED`: acrescentar os 9 ids de **Interfaces** depois de `'orbit/traval-zoom-ideal/mean-frame-ms',` (o `afterAll` lança erro se faltar algum).
- Inserir antes de `test('Orbit_Budget_Above50Fps'`:

```js
// S4.7 go/no-go: the tree's share of the orbit frame and of hover/select renders. 'closed' collapses
// the tree panel (rows built, not mounted); 'root' collapses the L0 row (one row built and mounted).
for (const [name, id, tags, mode] of [
  ['Orbit_TreeClosed_RecordsFrameInterval', 'orbit/traval-tree-closed/mean-frame-ms', 0, 'closed'],
  ['Orbit_TreeIdeal_RecordsFrameInterval', 'orbit/traval-tree-ideal/mean-frame-ms', 0, 'root'],
  ['Orbit_1500Tags_RecordsFrameInterval', 'orbit/1500-tags/mean-frame-ms', 1500, 'open'],
  ['Orbit_1500TagsTreeClosed_RecordsFrameInterval', 'orbit/1500-tags-tree-closed/mean-frame-ms', 1500, 'closed'],
  ['Orbit_1500TagsTreeIdeal_RecordsFrameInterval', 'orbit/1500-tags-tree-ideal/mean-frame-ms', 1500, 'root'],
]) {
  test(name, async ({ page }) => {
    await instrument(page);
    if (tags) await inflateTraval(page, tags);
    await page.goto('/?layers=fixtures/traval/');
    await waitForScan(page, tags ? 1000 : 5, tags ? 40_000 : 20_000);
    await treeMode(page, mode);
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
```

- [ ] **Step 3: Rodar uma vez, commitar, medir limpo**

Run (wrapper): `npx playwright test --project=chromium e2e/perf.spec.js`
Expected: tudo passa, exceto `Orbit_Budget_Above50Fps` (expected-fail); um arquivo de resultado com os 9 ids novos. Apagar esse arquivo (árvore suja).

```bash
npm test
git add e2e/tree-perf-helpers.js e2e/perf.spec.js
git commit -m "test(perf): measure the tree share of orbit, hover and select renders (S4.7)"
```

Três execuções com o **procedimento de árvore limpa**. Registrar no relatório o SHA de `develop` sob a branch e se a S4.8 já está nela.

- [ ] **Step 4: Tabela de medianas**

Este **comando da tabela de medianas** é reusado nas Tasks 2 e 6:

```bash
node -e "const fs=require('fs');const f=fs.readdirSync('bench/results').filter(x=>x.endsWith('-layers-ui.bench.json')).sort().slice(-3);const J=f.map(x=>JSON.parse(fs.readFileSync('bench/results/'+x)));console.log(f.join(' '),'dirty',J.map(j=>j.git.dirty).join(','),'sha',J.map(j=>String(j.git.sha).slice(0,7)).join(','));const med=a=>a.slice().sort((x,y)=>x-y)[1];const ids=['orbit/traval/mean-frame-ms','orbit/traval-tree-closed/mean-frame-ms','orbit/traval-tree-ideal/mean-frame-ms','orbit/1500-tags/mean-frame-ms','orbit/1500-tags-tree-closed/mean-frame-ms','orbit/1500-tags-tree-ideal/mean-frame-ms','tree/traval/hover-ms','tree/traval/select-ms','tree/1500-tags/hover-ms','tree/1500-tags/select-ms'];for(const id of ids){const r=J.map(j=>j.benchmarks.find(b=>b.benchId===id));if(r.some(b=>b===undefined)){console.log(id,'MISSING');continue}const x=k=>r[0].extra[k]===undefined?'-':med(r.map(b=>b.extra[k])).toFixed(2);const m=k=>r[0].extra.main?med(r.map(b=>b.extra.main[k])).toFixed(2):'-';console.log(id,'ms',med(r.map(b=>b.value)).toFixed(2),'fps',x('fps'),'p95',x('p95FrameMs'),'script',m('scriptMs'),'task',m('taskMs'),'rows',x('treeRowsMounted'),'hov/f',x('hoverSwapsPerFrame'))}"
```

Expected: `dirty false,false,false` e 10 linhas sem `MISSING`. Depois: `python ~/.claude/hooks/bench-history-cli.py ingest --repo .` e `python ~/.claude/hooks/bench-history-cli.py render --repo .`.

- [ ] **Step 5: Gate 1 (teto)**

Com `B` = `orbit/traval`, `C` = `orbit/traval-tree-closed`, `I` = `orbit/traval-tree-ideal` (medianas de ms/frame) e o mesmo trio `B15`/`C15`/`I15` em 1.500 tags:
- **Passa** se `(B − I) / B ≥ 0,10`. Seguir para a Task 2.
- **Para** se `(B − I) / B < 0,10` e `(B15 − I15) / B15 < 0,10`. Pular as Tasks 2-5 e ir à Task 6, caminho **medido-negativo**.
- **Para e pergunta** se só o cenário de 1.500 tags passa. O orçamento é no Traval: relatar a tabela e pedir ao usuário que escolha entre fechar como medido-negativo e seguir pela escala de 1.500.

Registrar no relatório também `B − C` (teto da janela), `C − I` (teto do memo), `hov/f` e os quatro custos de entrada.

- [ ] **Step 6: Commit da base**

```bash
git add bench/results docs/reports/bench-history
git commit -m "test(perf): record the S4.7 tree baseline (S4.7)"
```

### Task 2: Memo das linhas e aba inativa (gate 2)

**Files:**
- Modify: `index.html` (bloco `:2214-2264` extraído para métodos; `render()` consome o memo)
- Create: `e2e/tree-rows.spec.js`
- Create: `bench/results/<ts>-layers-ui.bench.json` ×3

**Interfaces:**
- Produces: `treeModel(s, selFile, selSelector) → { treeRows, treeHits, elemRows, elemHits, ruleCount, kidsOf, collapsible }` no `Component`, memoizado em `this._tree` (padrão de `this._cam`, `:1769-1777`); só a aba ativa tem linhas, a outra recebe `[]`.

- [ ] **Step 1: Testes de caracterização (verdes antes do memo)**

`e2e/tree-rows.spec.js` (Traval, `readNodes` de `tree-helpers.js`; linhas do topo, sempre montadas):
- `TreeRows_HoverNaLinha_SoElaGanhaFundo`: hover na linha `nth(3)` → só ela tem fundo `rgba(…, 0.08)`; sair → nenhuma.
- `TreeRows_SelecionarOutra_BadgeMudaDeLinha`: clicar `nth(4)` e depois `nth(5)` → `●` só em `nth(5)`; `{ }` visível na selecionada.
- `TreeRows_EdicaoNoPainel_CodigoDaLinhaAtualiza`: selecionar uma linha, abrir o `{ }` dela, editar `Sombra` no painel (localizador de `undo-redo.spec.js`) → a textarea da linha contém o valor novo (código sintetizado do atributo `style`).
- `TreeRows_BuscaFiltrar_SoCasamentosEAncestrais`: `treeQ` = um nome do Traval, Filtrar → toda linha montada casa ou é ancestral; Destacar → todas voltam, as que não casam com opacidade 0,45.
- `TreeRows_TrocarAba_ElementosMostraArquivos`: a aba Elementos mostra as linhas `ARQ`; a etiqueta "Elementos N" é igual antes e depois de trocar de aba.
- `TreeRows_IsolarPeloBotao_BadgeIsolado`: botão `⤡` da linha selecionada → badge `isolado`; de novo → some.

Run (wrapper): `npx playwright test --project=chromium e2e/tree-rows.spec.js` — Expected: PASS em `develop` (caracterização).

- [ ] **Step 2: Extrair sem mudar comportamento**

Mover `:2214-2264` para `treeModel(s, selFile, selSelector)` sem mudar a lógica e chamar o método em `render()`. Run: `npm test` e (wrapper) `npx playwright test --project=chromium e2e/tree-rows.spec.js e2e/undo-redo.spec.js e2e/apply-flow.spec.js` — Expected: PASS. Commit: `refactor: extract tree row building from render (S4.7)`.

- [ ] **Step 3: Chaves e memo**

Listar as leituras de estado do bloco extraído, de `codeRow` e de `codeFor`:

```bash
awk '/^  treeModel\(/,/^  }$/' index.html | grep -oE "\bs\.[a-zA-Z]+" | sort -u
sed -n '/^  codeFor(rule) {/,/^  }$/p;/^  codeRow(rule, indent, scopeNote) {/,/^  }$/p' index.html | grep -oE "\bs\.[a-zA-Z]+" | sort -u
```

Expected: o conjunto cabe nas chaves abaixo; qualquer leitura nova entra na chave.
- **Hierarquia (estrutural):** `nodes`, `byId`, `treeClosed`, `treeQ`, `treeMode`, `hierCode`, `isoId`, `scope`, `codeBuf`, `fileText`, `changes`, `treeTab`, sem `selId`/`hoverId`. `pushRow` monta cada linha de nó por `remake(isSel, isHov)`, guardado por índice com `idx[id]`; a passada estrutural chama `remake(false, false)`.
- **Elementos (estrutural):** `nodes`, `byId`, `treeQ`, `treeMode`, `elOpen`, `elCode`, `codeBuf`, `fileText`, `changes`, `treeTab`, `selId`; as linhas de uso guardam `remake(isHov)`.
- **Decoração** (todo render): `out = rows.slice()` e, para `selId` e `hoverId` da aba ativa, `out[idx[id]] = remake(...)`. Nenhuma outra linha é refeita.
- **Aba inativa:** sem linhas (`[]`); `rulesByKey`/`ruleCount` continuam calculados; `treeHits`/`elemHits` só na aba ativa (`treeQHits` só lê a da aba ativa).
- `collapsible`/`hierAllClosed` saem do memo da Hierarquia; `elemAllClosed` continua lendo `s.elOpen`.

Chave comparada elemento a elemento (`k.every((v, i) => v === c.k[i])`), como `this._cam`.

- [ ] **Step 4: Verificar**

Run: `npm test` e (wrapper) `npx playwright test --project=chromium e2e/tree-rows.spec.js e2e/undo-redo.spec.js e2e/apply-flow.spec.js e2e/manual-marker.spec.js e2e/multi-state.spec.js e2e/snap-fidelity.spec.js e2e/pending-persist.spec.js e2e/scope-all-equal.spec.js e2e/tree-snapshot.spec.js` — Expected: PASS. Commit: `perf: memoize tree rows and skip the inactive tab (S4.7)`.

- [ ] **Step 5: Medir de novo e Gate 2 (janela)**

Três execuções limpas e o comando da tabela de medianas. Com `B'`/`B'15` (orbit com memo) e `I`/`I15` (ideal, das mesmas 3 execuções):
- **Go (Tasks 3-5)** se ao menos uma condição vale: `(B' − I) / B' ≥ 0,10`; `(B'15 − I15) / B'15 ≥ 0,10`. Os custos de hover/seleção vão para o relatório e não decidem: medidos até o 2º frame, carregam ao menos um intervalo de vsync (~16,7 ms) mesmo com render de custo zero.
- **No-go**: pular as Tasks 3-5 e ir à Task 6, caminho **memo**.

Relatar a tabela, o veredito e o ganho do memo (`B → B'`). Commit dos resultados: `test(perf): record the S4.7 memo measurement (S4.7)` (`bench/results`, `docs/reports/bench-history`).

### Task 3: Helper `treeWindow` (só com "go" na Task 2)

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
- Produces: estado `treeWin: { top, h, v }`; constantes `TREE_ROW_H = 22`, `TREE_PAD = 4`, `TREE_OVERSCAN = 10`; `this.codeH` (altura medida por `codeKey`).

- [ ] **Step 1: Template (invisível)**

Contar cada âncora (`grep -c` = 1) antes de trocar. Dentro de cada `sc-if` de aba, antes do `sc-for`: `<div data-tree-pad="top" style="height:{{ treePadTop }}"></div>`; depois do `</sc-for>`: `<div data-tree-pad="bottom" style="height:{{ treePadBot }}"></div>`. No contêiner `:270`: `onScroll="{{ treeScroll }}" onBlur="{{ treeBlur }}"`. Nas `div` externas das linhas de código: `data-code-key="{{ t.codeKey }}"` / `data-code-key="{{ r.codeKey }}"`. Nenhum estilo muda.

- [ ] **Step 2: Janela em `render()`**

Alturas da aba ativa: linha de nó `null`; linha de código `this.codeH[codeKey]` ou a estimativa `80 + rows * 15` até a 1ª medida. Chamar `treeWindow({ scrollTop: s.treeWin.top - TREE_PAD, viewH: s.treeWin.h || 600, rowH: TREE_ROW_H, rows, overscan: TREE_OVERSCAN })`. Exportar `treeRows`/`elemRows` = `out.slice(start, end)` da aba ativa, `treePadTop: top + 'px'` e `treePadBot: bottom + 'px'`, e guardar a lista completa da aba ativa em `this._treeAll` (para `revealInTree`).

- [ ] **Step 3: Scroll, tamanho e alturas**

- `treeScroll(e)`: com `|scrollTop − s.treeWin.top| ≥ TREE_OVERSCAN / 2 * TREE_ROW_H` (110 px), ou no início/fim da lista, faz `setState({ treeWin: { ...st.treeWin, top: scrollTop } })`; abaixo disso não há render. O foco em textarea segue [!DECISION] `focus-during-scroll`: com foco numa textarea da árvore, `top` não muda, e `treeBlur` aplica o `scrollTop` atual.
- `componentDidUpdate`: se `this.treeScrollRef.current` mudou (o painel abriu de novo), redefinir `treeWin.top` a partir de `box.scrollTop` e observar o contêiner com um `ResizeObserver` (`h` = `contentRect.height` + 8). Observar com o mesmo RO as `[data-code-key]` montadas que ainda não são observadas (`querySelectorAll`, sem leitura de layout). O callback grava `this.codeH[key]` (`borderBoxSize`) e, se mudou, incrementa `treeWin.v`.
- Nenhuma leitura de `scrollTop`/`clientHeight`/`getBoundingClientRect` dentro de `render()`.

- [ ] **Step 4: `revealInTree` por índice**

Trocar o corpo de `revealInTree(id)`: `box` nulo → retorna; `i` = índice de `id` em `this._treeAll` (`id` na Hierarquia, `nodeId` na Elementos); `i < 0` → retorna; `w = LayersCore.treeWindow({ scrollTop: box.scrollTop - TREE_PAD, viewH: box.clientHeight, rowH: TREE_ROW_H, rows, overscan: 0, reveal: i })`; com `w.scrollTo !== null`, `box.scrollTop = w.scrollTo + TREE_PAD` (o `onScroll` atualiza a janela). Mesma folga de 22 px de hoje.

- [ ] **Step 5: Verificar**

Run: `npm test` e (wrapper) `npx playwright test --project=chromium e2e/tree-rows.spec.js e2e/tree-snapshot.spec.js e2e/viewport-culling.spec.js` — Expected: PASS. Run (wrapper): `LAYERS_VISUAL=1 npx playwright test --project=chromium e2e/menu-visual.spec.js` — Expected: diff zero. As specs com seletores crus podem falhar aqui; a Task 5 as corrige.

```bash
git add index.html
git commit -m "perf: render only the visible tree rows with spacers (S4.7)"
```

### Task 5: E2E da janela e seletores crus (só com "go")

**Files:**
- Create: `e2e/virtual-tree.spec.js`
- Modify: `e2e/tree-helpers.js` (`treeRow`, `lastTreeRow`, `treeWindowState`), `e2e/folder-helpers.js:47-50` (`selectLayer` delega a `treeRow`; comentário `:47` atualizado), `multi-state.spec.js:56`, `manual-marker.spec.js:34-35`/`:54` (e o `select` que chama `pick`), `pending-persist.spec.js:17`, `scope-all-equal.spec.js:28`, `snap-fidelity.spec.js:45`/`:49`, `undo-redo.spec.js:19`

**Interfaces:**
- Produces: `treeRow(page, { title?, text? }) → Locator` (rola o contêiner do topo, um `clientHeight` por vez, até montar a linha; lança `tree row not found: …` no fim); `lastTreeRow(page) → Locator` (rola até o fim e devolve a última `[data-node-id]`); `treeWindowState(page) → { mounted, scrollHeight, clientHeight, padTop, padBot, contiguous }` (`contiguous` = filhos do contêiner encostados e soma das alturas = `scrollHeight − 8`). O contêiner é achado subindo de `[data-tree-pad]` até o pai.

- [ ] **Step 1: Helpers e migração**

Escrever os três helpers. Trocar cada seletor cru por `selectLayer`/`treeRow`/`lastTreeRow` (o prefixo do `title` continua igual). Os helpers também funcionam sem janela, então a troca é segura em qualquer fixture.

Run: `grep -rn "data-node-id" e2e/ | grep -v -e tree-helpers.js -e virtual-tree.spec.js -e tree-rows.spec.js -e tree-perf-helpers.js` — Expected: só usos por id exato (`[data-node-id="0"]`) ou por posição no topo, nenhum `title^=` nem `.last()` cru.

- [ ] **Step 2: `e2e/virtual-tree.spec.js`**

Fixture: Traval inflado (`inflateTraval(page, 1500)` de `tree-perf-helpers.js`), `waitForScan(page, 1000, 40_000)`.
- `VirtualTree_1500Nos_MontaPoucasLinhas`: `mounted ≤ ceil(clientHeight / 22) + 2 * 10 + 2`; `scrollHeight === 8 + N * 22`, com `N` da etiqueta "Hierarquia N" (tudo expandido, sem código aberto); `contiguous`.
- `VirtualTree_SelecionarPlano_RolaAteALinha`: `el.click()` dentro de `page.evaluate` no último elemento de plano do palco (mesmo filtro de plano de `planeCensus`; não um clique de tela, que acertaria outro plano à frente em 3D) → a linha com `●` está montada e dentro do retângulo do contêiner.
- `VirtualTree_RolagemAteOFim_MostraUltimoNo`: `scrollTop = scrollHeight`, 2 frames → `padBot === 0`, a última linha montada encosta no fim do conteúdo (≤ 1 px) e `contiguous`.
- `VirtualTree_BuscaFiltrar_MantemIndices`: rolar ao meio, buscar um nome que casa em várias cópias, Filtrar → `contiguous`, `scrollHeight === 8 + k * 22` com `k` inteiro e menor que `N`, e toda linha montada casa ou é ancestral; limpar (Esc) → `scrollHeight` volta a `8 + N * 22`.
- `VirtualTree_CodigoAberto_AlturaVariavel`: abrir o `{ }` da linha selecionada → `scrollHeight === 8 + N * 22 + h`, com `h` = altura da linha de código; aumentar `textarea.style.height` em 60 px via `page.evaluate` (mesmo efeito da alça `resize:vertical`, sem acertar a alça) e esperar 2 frames → `scrollHeight` cresce 60 (±1); rolar até o fim e voltar → `contiguous`.
- `VirtualTree_DigitandoNoCodigo_RolagemNaoTrocaARegra`: abrir o código, digitar `/*x*/` na textarea, rolar o contêiner 2.000 px com a textarea em foco → nenhuma outra textarea montada contém `/*x*/`, e o foco segue na mesma regra ou saiu da árvore; ao voltar, a textarea original ainda contém `/*x*/`.

- [ ] **Step 3: Rodar a suíte da árvore e as specs migradas**

Run (wrapper): `npx playwright test --project=chromium e2e/virtual-tree.spec.js e2e/tree-rows.spec.js e2e/tree-snapshot.spec.js e2e/apply-flow.spec.js e2e/write-log-hash.spec.js e2e/multi-state.spec.js e2e/manual-marker.spec.js e2e/pending-persist.spec.js e2e/scope-all-equal.spec.js e2e/snap-fidelity.spec.js e2e/undo-redo.spec.js` — Expected: PASS.
Prova de regressão: trocar temporariamente `TREE_OVERSCAN = 10` por `TREE_OVERSCAN = -5`, rodar `e2e/virtual-tree.spec.js` → FAIL em `contiguous`/`RolagemAteOFim`; restaurar com `git checkout -- index.html`.

```bash
npm test
git add e2e
git commit -m "test(e2e): virtual tree invariants and window-safe tree row helpers (S4.7)"
```

### Task 6: Medição final e documentação

**Files:**
- Modify: `docs/RELEASE-CHECKLIST.md:51-52`, `docs/ARCHITECTURE.md:126`, `e2e/perf.spec.js:146-153` (só nas condições do Step 3), `docs/roadmap.md:65`
- Create: `changelog.d/feature-261016-0-s4-7-virtual-tree.md`, `bench/results/<ts>-layers-ui.bench.json` ×6

Caminho: **janela** (Tasks 3-5 feitas), **memo** (no-go na Task 2) ou **medido-negativo** (parou no gate 1).

- [ ] **Step 1: Rebase sobre `develop` com a S4.8**

Só depois do merge da S4.8 ([plano geral](2026-10-16-layers-plano-geral-da-onda-3.md), ordem de merge 3 → 4). `git fetch && git rebase origin/develop`; conflito esperado e aditivo em `e2e/perf.spec.js` (`EXPECTED`, testes novos; `test.fail` fica como a S4.8 deixou). Run: `npm test` — Expected: PASS.

- [ ] **Step 2: Antes e depois sobre a mesma base** (caminhos janela e memo)

- **Antes:** `git worktree add ../layers-s4-7-base <SHA do commit da Task 1 Step 3 depois do rebase>`, `npm ci` nele e 3 execuções limpas lá (wrapper e procedimento de árvore limpa; os arquivos vêm para `bench/results` desta branch com o `sha` do commit base). Remover o worktree no fim (`git worktree remove ../layers-s4-7-base`).
- **Depois:** 3 execuções limpas no `HEAD`.
- A tabela de medianas roda duas vezes (as 3 de antes, depois as 3 de depois; mover o outro trio para `$SCRATCH` durante cada tabela). Expected: `dirty false` nos seis e `sha` coerente. Ingest/render do bench-history.

Guardas: `orbit/traval` depois ≤ antes; `tree/traval/select-ms` depois ≤ antes × 1,10. Violou → parar e relatar.

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

`changelog.d/feature-261016-0-s4-7-virtual-tree.md`, no formato da S4.5 (`adr: none`, `### Added`/`### Changed` do caminho, `### Perf` com bullets `measured — …` de orbit Traval, orbit 1.500 tags e hover/seleção a 1.500 tags, antes → depois, mediana de 3, Chromium <versão>, i7-12700; no caminho medido-negativo, `measured — teto …` e nenhum código do app mudou). Linha S4.7 de `docs/roadmap.md`: motivo curto do resultado, `report` → fragmento, status `done` (via `phase-close-gate`); `python ~/.claude/design/_build_proto.py .`.

```bash
npm test
grep -n "<[a-z]" changelog.d/feature-261016-0-s4-7-virtual-tree.md   # Expected: nenhuma linha
git add docs changelog.d e2e/perf.spec.js bench/results
git commit -m "docs: close S4.7 with measurements, checklist and changelog (S4.7)"
```

## Critical Files

`index.html` (`:270-330` template da árvore, `:1101` ref, `:1562` hover de plano, `:1764-1777` padrão de memo, `:1779` `select`, `:1782-1800` `codeFor`/`codeRow`, `:1821-1826` `revealInTree`, `:2214-2264` linhas, `:2375-2390` export), `lib/layers-core.js` (`viewCuller` `:751`, export `:1486`), `test/layers-core.test.js`, `e2e/perf.spec.js`, `e2e/tree-perf-helpers.js` (novo), `e2e/tree-rows.spec.js` (novo), `e2e/virtual-tree.spec.js` (novo), `e2e/tree-helpers.js`, `e2e/folder-helpers.js:47-50`, as 7 specs com seletor cru, `docs/RELEASE-CHECKLIST.md:51-52`, `docs/ARCHITECTURE.md:126`, `docs/roadmap.md:65`.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 0. Linha do roadmap e rebuild | gen | Mechanical | Executor | texto da linha dado literal; caller valida o diff de uma linha e o `exit_code` do rebuild |
| 1 Steps 1-2, 5. Helpers, cenários, gate 1 | gen | Standard | Workhorse | autoria de teste e julgamento de medição |
| 1 Steps 3-4, 2 Step 5 (execuções), 6 Step 2 (execuções). Três runs limpas + tabela | gen | Mechanical | Executor | rodar e resumir; caller valida `dirty false`, `sha`, sem `MISSING`, `exit_code` |
| 2. Caracterização, extração, memo, gate 2 | gen | Standard | Workhorse | caminho quente com julgamento de chave |
| 2. Review do memo (chaves, decoração, aba inativa) | review | Architectural | Architect | hot path, regra 5; via `adversarial-reviewer`, antes da Task 3 |
| 3. `treeWindow` + Vitest | gen | Standard | Workhorse | código e vetores dados no plano |
| 4. Template, `render()`, RO, `revealInTree` | gen | Standard | Workhorse | caminho quente, âncoras únicas |
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
> Method: **Subagent-driven**, estritamente sequencial: 0 → 1 (gate 1) → 2 (gate 2) → [3 → 4 → review → 5] só com "go" → 6. Tasks 1-5 rodam em paralelo com a S4.8; a Task 6 espera o merge da S4.8. As linhas Mechanical vão para o subagente `executor`.
