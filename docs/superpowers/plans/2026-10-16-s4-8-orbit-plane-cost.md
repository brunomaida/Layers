---
title: "S4.8 — Custo dos planos no orbit"
type: plan
solution: Layers
status: draft
created: 2026-10-16
---

# S4.8 — Custo dos planos no orbit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** descobrir qual parte do custo por plano visível domina o orbit padrão no Traval (23,8 ms/frame, ~42 fps; "outros" 12,3 ms = 61 % do `taskMs`) e, só se uma correção barata mostrar ganho medido, aplicá-la em `Plane`/`scene()` sem mudar o visual; senão, devolver ao usuário a decisão D4 do [plano geral da Onda 3](2026-10-16-layers-plano-geral-da-onda-3.md).

**Architecture:** a Task 1 é diagnóstico puro, sem tocar `index.html`: o harness marca planos e mundo com atributos `data-s48-*` e injeta uma folha com `!important` (o React escreve `willChange`/`pointerEvents` inline, e `!important` de autor vence o inline normal) para medir quatro variantes contra a base da mesma execução. A correção (Tasks 2-4) é a menor mudança que a medição sustenta: `pointerEvents` no arrasto (V1), sem `willChange` (V2) ou planos sem pintura ocultos no arrasto por um predicado puro `LayersCore.planeVisible` (V3).

**Tech Stack:** JS puro, Vitest, Playwright (Chromium completo com GPU, projeto `chromium`), CDP `Performance.getMetrics`, trace do Chromium (opcional).

**Leaf:** `S4.8` em [roadmap.md](../../roadmap.md) (linha S4.8); item D do [checklist](../../RELEASE-CHECKLIST.md) (`:52`, orçamento orbit > 50 fps).

## Context

Medido na S4.6 (`bench/results/2026-10-15T01-05-03-132Z`, `…01-05-32-139Z`, `…01-06-00-993Z`, `dirty: false`; ver [changelog da S4.6](../../../changelog.d/feature-261014-0-s4-6-computed-style-cache.md)):

| Cenário | Frame (mediana) | task | script | outros | Planos no DOM / visíveis |
|---|---|---|---|---|---|
| `orbit/traval` (vista padrão) | 23,8 ms | 20,3 ms | 7,7 ms | 12,3 ms | 414 / 414 (`offscreen` 0) |
| `orbit/traval-zoom` | 18,2 ms | 13,4 ms | 8,0 ms | 5,1 ms | 414 / 160 (254 cortados pela S4.5) |
| `orbit/traval-zoom-ideal` | 18,0 ms | — | — | — | igual ao zoom: plano fora do palco já custa ~0 |
| `orbit/traval-gcs-ideal` | 24,1 ms | — | — | — | teto do cache de `getComputedStyle`: +1,1 % (S4.6 medido-negativo) |

Leitura: "outros" (`taskMs − scriptMs − styleMs − layoutMs`: paint, layerize/commit, hit-test, GC, despacho de input) cai junto com os planos visíveis, ~0,03 ms por plano (12,3/414 ≈ 0,030; 5,1/160 ≈ 0,032; inclinação entre os dois pontos 0,028). É linear em **só 2 pontos**, e o CDP não tem métrica de paint: a causa é inferida. Cerca de 3,5 ms do frame ficam fora do `taskMs` (compositor/GPU). Para 50 fps o frame tem de cair para ≤ 20 ms (−3,8 ms).

Superfície de código verificada (`develop@0da02d6`, igual nesta branch):

| Site | Linhas | Papel |
|---|---|---|
| `Plane` (`React.memo`) | `index.html:907-924` | `willChange: dragging ? 'transform' : 'auto'` `:909`; `outline` (sel/hov/onLayer/wire) `:913`; `pointerEvents: soloOff ? 'none' : 'auto'` `:912`; `culled` → `display:none` `:917`; `H.enter`/`H.leave` `:921` |
| `this.H` | `index.html:1559-1564` | `click` ignora clique pós-arrasto via `this.dragged` `:1560`; `enter`/`leave` fazem `setState({ hoverId })` `:1562-1563` |
| `scene()` | `index.html:2104-2163` | `:2106` lê `s.wire`/`wireAlpha` (colisão S3.4: **não tocar**); predicado de culling `:2122`; `showWire`/`onLayer` `:2124`; props do `Plane` `:2127`; `page`/`world` `preserve-3d` `:2159-2161`, `willChange` do mundo `:2160` |
| `onDown`/`onMove`/`onUp` | `index.html:2442-2447` | um `setState` por mousemove depois de 3 px (`:2443-2446`) |
| Palco | `index.html:201` | recebe `onMouseMove`/`onMouseDown`/`onMouseUp`; `cursor:{{ stageCursor }}` = `'grabbing'` no arrasto (`:2414`) |
| Defaults | `index.html:1093` | `wire: true`, `wireAlpha: 35`; o único controle é o slider "Intensidade dos frames" (`:117-125`, `input[type=range]` `:123`); `toggleWire`/`wireMark` (`:2399`) não têm binding no template |
| `viewCuller` | `lib/layers-core.js:751-771`, export `:1486` | culling por viewport da S4.5 (modelo para o helper novo) |
| Harness | `e2e/perf-helpers.js` `orbitDrag` `:62-131`, `planeCensus` `:137-164`; `e2e/perf.spec.js` `EXPECTED` `:4-14`, `Orbit_Budget_Above50Fps` `:146-153` (`test.fail` `:151`) | base de medição |
| Sondas de arrasto | `e2e/viewport-culling.spec.js:25-26` (comentário cita `:912`, real `:909`), `e2e/menu-open.spec.js:219-224` | detectam arrasto por `style.willChange === 'transform'`: **quebram com V2** |

Achados que moldam o desenho:

- **V3 quase não alcança o cenário do orçamento.** Com o default (`wire: true`, `wireAlpha: 35`) e `selId '0'` nada fica esmaecido, então todo plano sem fundo, borda, texto ou svg ganha o contorno do wire (`showWire`, `:2124`) e pinta. Um predicado "sem pintura" corta ~0 planos em `Orbit_Budget_Above50Fps`; ele só ajuda com `wireAlpha 0`, modo plano ou planos esmaecidos. Por isso o cenário V3 tem controle próprio (wire desligado sem ocultar nada) e o censo separa `bare` (só o contorno pinta) de `empty` (não pinta nada).
- **V1 também tira o churn de hover.** Durante o arrasto o CDP move o mouse sobre os planos: cada troca dispara `H.enter`/`H.leave` → `setState` → render. `pointer-events:none` elimina o hit-test **e** esses renders; parte do ganho pode aparecer em `scriptMs`, não em "outros".
- **V2 pode não mudar nada.** Plano com `translateZ` dentro de `preserve-3d` já é camada composta por transformação 3D; `will-change` só fixa a escala de raster. Sem ele, o Chromium pode re-rasterizar texto durante o arrasto (custo ou nitidez diferente). Só a medição decide.
- **Séries entre sessões derivam** (changelog da S4.6: p95 50 → 35,8 ms entre S4.5 e S4.6). Toda variante é comparada com `orbit/traval` **da mesma execução** (delta pareado), mediana dos 3 deltas.

Reusa: `instrument`, `waitForScan`, `orbitDrag`, `planeCensus`, `zoomIn`, `writeBench` (`e2e/perf-helpers.js`); `cullState`/`dragTo`/`frames` (`e2e/viewport-culling.spec.js`); o padrão de export `LayersCore` junto de `viewCuller`; o wrapper E2E e o procedimento de árvore limpa da [S4.6](2026-10-14-s4-6-computed-style-cache.md) (Global Constraints); `bench-history-cli.py` ingest/render.

Fora de escopo: árvore e linhas da árvore (S4.7); `index.html:2106` (S3.4); agrupamento de folhas (mudança estrutural do DOM; vira leaf nova se D4 pedir); culling fora do arrasto; `flushMove()` morto e a linha `docs/ARCHITECTURE.md:56` (já citados na S4.5); o contador `docs/RELEASE-CHECKLIST.md:8` e as linhas `:50-51` do checklist.

## Global Constraints

- Visual congelado: quadro estático idêntico à `develop`. Durante o arrasto, nenhum plano que pinta (fundo, imagem, borda, texto, svg, checkbox, contorno de seleção/hover/camada/wire, sombra no modo plano) some. V1 muda o hover durante o arrasto e só entra com D4 respondida.
- Task 1 não altera `index.html`. Nenhuma task toca `index.html:2106`, a árvore, `support.js` ou o `<head>`; sem rede.
- `index.html`: âncoras únicas; `grep -c` de cada âncora = 1 antes de substituir.
- Commits: Conventional Commits em EN, sufixo `(S4.8 Task N)`, trailer de sessão; nunca `Co-Authored-By` nem atribuição a IA; nada em `develop`/`master`; nunca `git stash` (restaurar com `git checkout -- <arquivo>`). Nomes de teste `Metodo_Cenario_Esperado`; `npm test` verde antes de cada commit.
- **Wrapper E2E** (todo comando Playwright deste plano roda dentro dele; Bash com `timeout: 600000`). Recusa servidor alheio na 5180: a S3.4 roda em paralelo noutra worktree, e `reuseExistingServer: true` testaria o código dela.

```bash
n=0; until mkdir /tmp/layers-e2e.lock 2>/dev/null; do n=$((n+1)); [ "$n" -ge 60 ] && { echo "COULD NOT RUN: stale lock"; exit 1; }; sleep 5; done
trap 'rmdir /tmp/layers-e2e.lock' EXIT
code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5180/); [ "$code" = "000" ] || { echo "COULD NOT RUN: port 5180 busy ($code)"; exit 1; }
npx playwright test --project=chromium <specs>
```

- **Procedimento de árvore limpa** (Task 1 Step 6, Task 5 Step 1). `writeBench` grava `git.dirty` de `git status --porcelain`, e cada resultado novo fica untracked; por isso cada arquivo vai para o scratchpad (`$SCRATCH`) logo após a execução e os três voltam antes da tabela. Arquivos untracked que já estavam em `bench/results/` antes (havia 4 em `docs/261016-0-wave-3-plan`) também vão para `$SCRATCH/preexisting/`: mover, nunca apagar; ao fim, devolvê-los e perguntar ao usuário o destino.

```bash
# one Bash call per run; $SCRATCH = session scratchpad path
test -z "$(git status --porcelain)" || { echo "tree not clean before the run"; exit 1; }
# ... E2E wrapper with <specs> = e2e/perf.spec.js ...
mv "$(ls -t bench/results/*-layers-ui.bench.json | head -1)" "$SCRATCH/"
# after the third run:
mv "$SCRATCH"/*-layers-ui.bench.json bench/results/
```

- Execuções de perf: mesma máquina, aba em foco, nada pesado rodando; só comparar dentro do mesmo `env` ([bench-methodology](../../bench-methodology.md) § Decision rules). fps de Playwright vale como comparação relativa, nunca como número absoluto de produto.

## Review Focus

- **V3 e o orçamento:** com o wire ligado (default) o predicado corta ~0 planos na vista padrão; a Task 1 mede V3 contra o controle `orbit/traval-wire-off`, não contra `orbit/traval`. Um "go" de V3 não move `Orbit_Budget_Above50Fps`.
- **Visual congelado (V3):** `planeVisible` cobre `hasBg`, `bgImg`, `hasBorder`, `text`, `svg`, `isCheck` (borda própria, `:916`), `sel`, `hov`, `onLayer`, `showWire` (`:913`) e a sombra do modo plano (`:911`, mesma isenção do predicado `:2122`). Um campo esquecido apaga um plano que pinta: o E2E compara pixels com os planos ocultos e reexibidos.
- **TDZ em `scene()` (V3):** `culled` (`:2122`) é declarado antes de `showWire`/`onLayer` (`:2124`); a linha nova vem **depois** de `:2124` e não reordena o resto.
- **Hover no arrasto:** V3 oculta planos vazios, então o ponteiro passa a acertar o plano de trás (outro contorno de hover durante o arrasto, só sobre área vazia). V1 tira todo hover no arrasto e muda o alvo do clique de mouseup (`this.dragged`, `:1560`): o clique cai no palco, não no plano; soltar não seleciona.
- **V2:** sem `willChange` nos planos e no mundo, as sondas de arrasto de `viewport-culling.spec.js:25-26` e `menu-open.spec.js:219-224` passam a ler `stage.style.cursor === 'grabbing'` no mesmo commit; nitidez de texto no arrasto pode mudar (conferir o screenshot do Step de verificação).
- **Medição:** só árvore limpa conta; delta pareado com a base da mesma execução; "outros" é só main thread (~3,5 ms do frame ficam no compositor/GPU), por isso o frame é o critério primário.
- `zOf`/`nextPrev` continuam gravados para planos ocultos (medidas, `bmHover` e rótulo leem `zOf`).

## Design: Architecture & Flows

Um frame de arrasto e onde cada variante atua:

```
 mousemove (CDP) ──▶ hit-test sobre 414 planes ──▶ mouseenter/leave ──▶ H.enter/leave ──▶ setState(hoverId)
      │                   ▲ V1: pointer-events:none nos planes (some o hit-test e o churn de hover)
      ▼
 stage onMove (≥ 3 px) ──▶ setState({ dragging, yaw, tilt }) ──▶ render ──▶ scene()
                                                                             │ por nó: z, op, sel, hov
                                                                             │ culled  = viewport (S4.5, :2122)
                                                                             │ hidden  = culled || !planeVisible  ◀── V3 (só no arrasto)
                                                                             ▼
                                              Plane ×414 (memo) ──▶ display / willChange / pointerEvents
                                                                             │       ▲ V2: willChange 'auto' (planes + world)
                                                                             ▼
 main thread "outros" ≈ 12,3 ms: PrePaint · Paint · Layerize · UpdateLayerTree · HitTest · Commit
      │                                    ▲ V4 (só diagnóstico): oculta 1 plano a cada 2 → testa a linearidade
      ▼
 compositor / GPU (fora do taskMs: ~3,5 ms do frame)
```

Harness da Task 1 (nenhuma mudança no app):

```
 waitForScan ─▶ [setWireAlpha 0] ─▶ markScene ─────────────▶ planeCensus ─────────────▶ [hidePlanes] ─▶ [addStyleTag] ─▶ orbitDrag
                 V3 e controle       data-s48-plane / -world    total, bare, empty           data-s48-hide        V1 / V2 CSS
                                                                (marca data-s48-empty)       display:none !important
```

Predicado V3 (puro, `lib/layers-core.js`):

```
 planeVisible(n, f) = n.hasBg ∨ n.bgImg≠'none' ∨ n.hasBorder ∨ n.text ∨ n.svg ∨ n.isCheck
                    ∨ f.sel ∨ f.hov ∨ f.onLayer ∨ f.showWire ∨ (f.flat ∧ n.shadow≠'none')
 scene():  hidden = culled ∨ (dragging ∧ ¬planeVisible(n, { sel, hov, onLayer, showWire, flat: spacing === 0 }))
```

## Implementation Outline

- **Task 0** — branch e leaf `in-progress` no tracker.
- **Task 1** — diagnóstico V1-V4, 3 execuções limpas, go/no-go (gate humano no no-go).
- **Task 2** — `LayersCore.planeVisible` + Vitest (só V3).
- **Task 3** — E2E vermelho da variante escolhida.
- **Task 4** — correção em `index.html` (e sondas de arrasto, se V2).
- **Task 5** — medição final e `Orbit_Budget_Above50Fps`.
- **Task 6** — docs, changelog e roadmap.

## Critical Files

`e2e/perf-helpers.js` (`planeCensus` `:137-164`, helpers novos depois de `memoClientBox` `:208-223`), `e2e/perf.spec.js` (`EXPECTED` `:4-14`, cenários depois de `Orbit_PanelIdeal` `:101`, `:146-153`), `e2e/orbit-trace.spec.js` (novo), `e2e/viewport-culling.spec.js`, `e2e/menu-open.spec.js:219-224`, `lib/layers-core.js` (`viewCuller` `:751-771`, export `:1486`), `test/layers-core.test.js` (`describe('ViewCuller'` `:1256`, `describe('MovedSince'` `:1326`), `index.html` (`:909`, `:912`, `:2122-2127`, `:2160`), `docs/RELEASE-CHECKLIST.md:52`, `docs/ARCHITECTURE.md:55`, `:126`, `docs/roadmap.md:66`.

---

### Task 0: Branch e leaf em andamento

**Files:**
- Modify: `docs/roadmap.md:66` (linha S4.8), `docs/roadmap.data.json` (rebuild)

A linha S4.8 (`roadmap.md:66`) e o membro `"S4.8"` (`roadmap.config.json:77`) já existem: **não** criar linha nem membro novos.

- [ ] **Step 1: Worktree própria**

A S3.4 roda em paralelo (plano geral, Task B): nunca `git switch` no checkout compartilhado.

```bash
git fetch origin develop
git worktree add .claude/worktrees/s4-8 -b feature/261016-0-s4-8-orbit-plane-cost origin/develop
cd .claude/worktrees/s4-8 && npm ci
```

Expected: `git -C .claude/worktrees/s4-8 branch --show-current` = `feature/261016-0-s4-8-orbit-plane-cost`; `npm test` verde na worktree. Todos os passos seguintes rodam nela.

- [ ] **Step 2: Linha `in-progress` com o plano**

Em `docs/roadmap.md:66`, na linha `| S4.8 | 2 | S4 | Custo dos planos no orbit | … | — | — | — | — | registered |`, trocar só a coluna `plan` (7ª) por `[](superpowers/plans/2026-10-16-s4-8-orbit-plane-cost.md)` e o status `registered` por `in-progress`; a coluna `reason` fica como está.

Run: `python ~/.claude/design/_build_proto.py .`
Expected: exit 0; `docs/roadmap.data.json` com S4.8 `in-progress`.

- [ ] **Step 3: Commit primeiro, depois trazer o plano**

```bash
git add docs/roadmap.md docs/roadmap.data.json
git commit -m "docs: start S4.8 in the tracker (S4.8 Task 0)"
git cherry-pick <plan commit(s) from docs/261016-0-wave-3-plan, oldest first>
```

Expected: `git log --oneline develop..HEAD` mostra o commit do tracker primeiro; `test -f docs/superpowers/plans/2026-10-16-s4-8-orbit-plane-cost.md` passa.

---

### Task 1: Diagnóstico (go/no-go, sem mudar `index.html`)

**Files:**
- Modify: `e2e/perf-helpers.js` (`planeCensus`; `markScene`, `hidePlanes`, `setWireAlpha` depois de `memoClientBox`)
- Modify: `e2e/perf.spec.js` (import `:2`, `EXPECTED` `:4-14`, cenários depois do laço `:78-101`)
- Create: `e2e/orbit-trace.spec.js`, `bench/results/<ts>-layers-ui.bench.json` ×3

**Interfaces:**
- Produces: `planeCensus()` ganha `bare` (só o contorno pinta) e `empty` (não pinta nada; marca `data-s48-empty`); `markScene(page) → number`; `hidePlanes(page, 'empty' | 'odd') → number`; `setWireAlpha(page, v)`; bench ids `orbit/traval-v1-no-hit`, `orbit/traval-v2-no-will-change`, `orbit/traval-wire-off`, `orbit/traval-v3-empty-hidden`, `orbit/traval-v4-half-hidden` (todos `/mean-frame-ms`); tabela de medianas e veredito.

- [ ] **Step 1: Censo com planos sem pintura**

Em `planeCensus` (`e2e/perf-helpers.js:137-164`): o comentário ganha a linha `// bare = paints only its outline; empty = paints nothing (marked data-s48-empty for hidePlanes).`; o objeto inicial vira `{ total: planes.length, offscreen: 0, partial: 0, opBelow005: 0, opZero: 0, bare: 0, empty: 0 }`; dentro do `for`, depois de `if (op === 0) c.opZero++;`:

```js
      // computed style per plane: runs after waitForScan and before the drag, so neither burst nor gcsPerFrame moves
      const cs = getComputedStyle(el);
      const noBorder = ['Top', 'Right', 'Bottom', 'Left'].every((k) => cs['border' + k + 'Style'] === 'none' || parseFloat(cs['border' + k + 'Width']) === 0);
      const bare = cs.backgroundColor === 'rgba(0, 0, 0, 0)' && cs.backgroundImage === 'none' && noBorder && cs.boxShadow === 'none' && el.childNodes.length === 0;
      if (bare) c.bare++;
      if (bare && cs.outlineStyle === 'none') {
        c.empty++;
        el.setAttribute('data-s48-empty', '');
      }
```

- [ ] **Step 2: Helpers de override**

Depois de `memoClientBox` (antes de `export function writeBench`):

```js
// S4.8: marks the planes (planeCensus filter) and the world div so a stylesheet can override their inline
// styles with !important. React never touches attributes it did not set: the marks survive drag renders.
export async function markScene(page) {
  return page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    if (!stage) throw new Error('stage element not found');
    const planes = [...stage.querySelectorAll('div')].filter(
      (el) => el.style.transform.startsWith('translateZ(') && /pointer|crosshair/.test(el.style.cursor),
    );
    if (!planes.length) throw new Error('no planes found');
    planes.forEach((el) => el.setAttribute('data-s48-plane', ''));
    // Plane -> page -> world (index.html:2159-2160)
    planes[0].parentElement.parentElement.setAttribute('data-s48-world', '');
    return planes.length;
  });
}

// S4.8 upper bounds: hides planes by mark with display:none !important. 'empty' = planes planeCensus marked
// as painting nothing (call planeCensus first); 'odd' = every other plane (linearity check, not a fix).
export async function hidePlanes(page, which) {
  const n = await page.evaluate((which) => {
    const planes = [...document.querySelectorAll('[data-s48-plane]')];
    let n = 0;
    planes.forEach((el, i) => {
      const hide = which === 'odd' ? i % 2 === 1 : el.hasAttribute('data-s48-empty');
      if (hide) {
        el.setAttribute('data-s48-hide', '');
        n++;
      }
    });
    return n;
  }, which);
  await page.addStyleTag({ content: '[data-s48-hide]{display:none!important}' });
  return n;
}

// Sets the "Intensidade dos frames" slider (wireAlpha, index.html:123) through React's onChange; 0 turns
// every wire outline off. Waits two frames for the render.
export async function setWireAlpha(page, v) {
  await page.evaluate((v) => {
    const input = document.querySelector('label[title="Intensidade dos frames"] input[type="range"]');
    if (!input) throw new Error('wire slider not found');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(v));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}
```

- [ ] **Step 3: Cenários V1-V4**

Em `e2e/perf.spec.js`:
- import: acrescentar `markScene, hidePlanes, setWireAlpha` à lista de `./perf-helpers.js`.
- `EXPECTED`: depois de `'orbit/traval-panel-ideal/mean-frame-ms',` acrescentar `'orbit/traval-v1-no-hit/mean-frame-ms',`, `'orbit/traval-v2-no-will-change/mean-frame-ms',`, `'orbit/traval-wire-off/mean-frame-ms',`, `'orbit/traval-v3-empty-hidden/mean-frame-ms',`, `'orbit/traval-v4-half-hidden/mean-frame-ms',` (sem isso o `afterAll` falha).
- Depois do laço `Orbit_GcsIdeal`/`Orbit_PanelIdeal` (fecha em `:101`):

```js
// S4.8 diagnosis, no app change: each variant overrides the scene before the drag. wire-off is the control
// for V3 (V3 compares against it, not against orbit/traval); V4 only checks that plane cost is linear.
for (const [name, id, v] of [
  ['Orbit_NoHitTest_RecordsFrameInterval', 'orbit/traval-v1-no-hit/mean-frame-ms', { css: '[data-s48-plane]{pointer-events:none!important}' }],
  ['Orbit_NoWillChange_RecordsFrameInterval', 'orbit/traval-v2-no-will-change/mean-frame-ms', { css: '[data-s48-plane],[data-s48-world]{will-change:auto!important}' }],
  ['Orbit_WireOff_RecordsFrameInterval', 'orbit/traval-wire-off/mean-frame-ms', { wireOff: true }],
  ['Orbit_WireOffEmptyHidden_RecordsFrameInterval', 'orbit/traval-v3-empty-hidden/mean-frame-ms', { wireOff: true, hide: 'empty' }],
  ['Orbit_HalfHidden_RecordsFrameInterval', 'orbit/traval-v4-half-hidden/mean-frame-ms', { hide: 'odd' }],
]) {
  test(name, async ({ page }) => {
    await instrument(page);
    await page.goto('/?layers=fixtures/traval/');
    await waitForScan(page);
    if (v.wireOff) await setWireAlpha(page, 0);
    await markScene(page);
    const census = await planeCensus(page);
    const hidden = v.hide ? await hidePlanes(page, v.hide) : 0;
    if (v.css) await page.addStyleTag({ content: v.css });
    const o = await orbitDrag(page, 1500);
    rec(id, o.meanFrameMs, {
      fps: o.fps,
      p95FrameMs: o.p95FrameMs,
      frames: o.frames,
      loafCount: o.loafCount,
      loafScriptShare: o.loafScriptShare,
      gcsPerFrame: o.gcsPerFrame,
      main: o.main,
      census,
      hidden,
    });
    expect(o.frames).toBeGreaterThanOrEqual(30);
    if (v.hide) expect(hidden, 'planes hidden by the stub').toBeGreaterThan(0);
  });
}
```

Se `Orbit_WireOffEmptyHidden` falhar em `planes hidden by the stub` na execução do Step 5, comparar `census.empty` dos cenários com e sem `wireOff`: igual nos dois = o slider não aplicou (tentar também `dispatchEvent(new Event('change', { bubbles: true }))` e repetir); `empty` 0 com `bare` 0 = o Traval não tem plano vazio. Nesse caso, **antes do commit do Step 5**, apagar as entradas `Orbit_WireOff_RecordsFrameInterval` e `Orbit_WireOffEmptyHidden_RecordsFrameInterval` do laço e os ids `orbit/traval-wire-off/mean-frame-ms` e `orbit/traval-v3-empty-hidden/mean-frame-ms` de `EXPECTED`; no comando da tabela (Step 7), tirar `'-wire-off'` e `'-v3-empty-hidden'` de `ids`; V3 sai do plano (Tasks 2 e o Step V3 da 3-4 não rodam) e o relatório registra o motivo.

- [ ] **Step 4: Trace opcional**

Criar `e2e/orbit-trace.spec.js` (arquivo próprio para não acionar o `afterAll` de `perf.spec.js`):

```js
import { test } from '@playwright/test';
import { instrument, waitForScan, orbitDrag } from './perf-helpers.js';

// S4.8 opt-in (LAYERS_TRACE=1): Chromium trace of one default-view orbit drag; sums the paint-pipeline
// events per frame. Tracing slows the frame, so this never feeds the measured runs; it prints and records
// nothing. Event names vary across Chromium versions: the missing ones are printed, never assumed zero.
test('Orbit_Trace_PrintsPaintPhases', async ({ page, browser }) => {
  test.skip(!process.env.LAYERS_TRACE, 'set LAYERS_TRACE=1 to trace');
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
  const o = await orbitDrag(page, 1500);
  const trace = JSON.parse((await browser.stopTracing()).toString());
  const want = ['PrePaint', 'Paint', 'Layerize', 'UpdateLayerTree', 'HitTest', 'Commit'];
  const sum = {};
  for (const e of trace.traceEvents) if (e.ph === 'X' && want.includes(e.name)) sum[e.name] = (sum[e.name] || 0) + e.dur / 1000;
  console.log(
    `frames ${o.frames}:`,
    Object.entries(sum).map(([k, v]) => `${k} ${(v / o.frames).toFixed(2)} ms/frame`).join(' · '),
    '| missing:', want.filter((k) => !(k in sum)).join(', ') || '-',
  );
});
```

- [ ] **Step 5: Rodar, conferir e commitar**

Run (wrapper E2E): `npx playwright test --project=chromium e2e/perf.spec.js`
Expected: tudo passa, exceto `Orbit_Budget_Above50Fps` (expected-fail); um resultado novo com os 5 ids e `census.bare`/`census.empty`/`hidden` no `extra`. Apagar esse arquivo (gerado agora, árvore suja).

Run (wrapper E2E): `LAYERS_TRACE=1 npx playwright test --project=chromium e2e/orbit-trace.spec.js`
Expected: PASS e uma linha `frames N: … ms/frame`; guardar a linha para o relatório.

```bash
npm test
git add e2e/perf-helpers.js e2e/perf.spec.js e2e/orbit-trace.spec.js
git commit -m "test(perf): add plane-cost variants, empty-plane census and opt-in trace (S4.8 Task 1)"
```

- [ ] **Step 6: Três execuções limpas**

Três execuções de `e2e/perf.spec.js` com o **procedimento de árvore limpa** (Global Constraints).
Expected: três arquivos de volta em `bench/results/`.

- [ ] **Step 7: Tabela de medianas (deltas pareados)**

Este **comando da tabela** é reusado na Task 5:

```bash
node -e "const fs=require('fs');const f=fs.readdirSync('bench/results').filter(x=>x.endsWith('-layers-ui.bench.json')).sort().slice(-3);const J=f.map(x=>JSON.parse(fs.readFileSync('bench/results/'+x)));console.log(f.join(' '),'dirty',J.map(j=>j.git.dirty).join(','));const med=a=>a.slice().sort((x,y)=>x-y)[1];const g=(j,id)=>j.benchmarks.find(b=>b.benchId===id);const oth=b=>b.extra.main.taskMs-b.extra.main.scriptMs-b.extra.main.styleMs-b.extra.main.layoutMs;const P='orbit/traval';const ids=['','-v1-no-hit','-v2-no-will-change','-wire-off','-v3-empty-hidden','-v4-half-hidden','-zoom'];for(const s of ids){const id=P+s+'/mean-frame-ms';const bid=P+(s==='-v3-empty-hidden'?'-wire-off':'')+'/mean-frame-ms';const r=J.map(j=>g(j,id)),b=J.map(j=>g(j,bid));const d=r.map((x,i)=>x.value-b[i].value),dO=r.map((x,i)=>oth(x)-oth(b[i])),dS=r.map((x,i)=>x.extra.main.scriptMs-b[i].extra.main.scriptMs);console.log(id,'ms',med(r.map(x=>x.value)).toFixed(1),'fps',med(r.map(x=>x.extra.fps)).toFixed(1),'p95',med(r.map(x=>x.extra.p95FrameMs)).toFixed(1),'script',med(r.map(x=>x.extra.main.scriptMs)).toFixed(2),'other',med(r.map(oth)).toFixed(2),'| vs',bid.split('/')[1],'dFrame',med(d).toFixed(2),'dOther',med(dO).toFixed(2),'dScript',med(dS).toFixed(2),'| census',JSON.stringify(r[0].extra.census||{}),'hidden',r[0].extra.hidden===undefined?'-':r[0].extra.hidden)}"
```

Expected: `dirty false,false,false` e 7 linhas. Depois: `python ~/.claude/hooks/bench-history-cli.py ingest --repo .` e `python ~/.claude/hooks/bench-history-cli.py render --repo .`.

- [ ] **Step 8: Go/no-go e escolha da variante**

Uma variante candidata (V1, V2 contra `orbit/traval`; V3 contra `orbit/traval-wire-off`) passa quando a mediana pareada `dFrame ≤ −2 ms`, **ou** `dOther ≤ −10 %` do `other` da sua base com `dFrame ≤ 0`. O frame é o critério primário: "outros" é só main thread.

| Resultado | Ação |
|---|---|
| V1 e/ou V2 passam | aplicar as que passam (Tasks 3-4); V1 só com D4 respondida ("hover some no arrasto" aceito), senão parar e perguntar |
| Só V3 passa | parar e perguntar: V3 não move o orçamento (wire ligado por default); entregar V3 só se o usuário quiser o ganho com `wireAlpha 0`/modo plano |
| Nenhuma passa | **no-go**: parar, relatar a tabela, a linha do trace e a leitura de V4, e pedir D4 (aceitar ~42 fps com `test.fail`, ou abrir a leaf "agrupamento de folhas") |

Passar não é cumprir o orçamento: 50 fps exige frame ≤ 20 ms (−3,8 ms sobre 23,8 ms). Leitura de V4 (para o relatório): `dOther` ≈ metade do `other` da base (±25 %) confirma custo linear por plano visível e aponta para reduzir planos (agrupamento), não para atributos de plano.

Nenhuma task seguinte começa antes desse gate.

- [ ] **Step 9: Commit da base**

No caminho no-go, depois da resposta de D4, atualizar `e2e/perf.spec.js:148` e `:151` com o texto da Task 5 Step 2 (linha "no-go") antes do commit.

```bash
npm test
git add bench/results docs/reports/bench-history e2e/perf.spec.js
git commit -m "test(perf): record S4.8 plane-cost diagnosis and variant medians (S4.8 Task 1)"
```

No no-go, pular para a Task 6 (coluna no-go).

---

### Task 2: Predicado puro `planeVisible` (só se V3 foi escolhida)

**Files:**
- Modify: `lib/layers-core.js` (função depois do `}` de `viewCuller`, `:771`; export depois de `viewCuller: viewCuller,` `:1486`)
- Test: `test/layers-core.test.js` (`describe` novo depois do bloco `ViewCuller`, antes de `describe('MovedSince'` `:1326`)

**Interfaces:**
- Produces: `LayersCore.planeVisible(n, f) → boolean`; `n` = nó do `scan()` (`hasBg`, `bgImg`, `hasBorder`, `text`, `svg`, `isCheck`, `shadow`), `f = { sel, hov, onLayer, showWire, flat }`; `true` = o plano pinta algo.

- [ ] **Step 1: Testes que falham**

```js
describe('PlaneVisible', () => {
  const bare = { hasBg: false, bgImg: 'none', hasBorder: false, text: '', svg: '', isCheck: false, shadow: 'none' };
  const off = { sel: false, hov: false, onLayer: false, showWire: false, flat: false };
  const vis = (n, f) => core.planeVisible({ ...bare, ...n }, { ...off, ...f });

  it('PlaneVisible_SemPintura_CortaNoDrag', () => {
    expect(vis({}, {})).toBe(false);
    expect(vis({ shadow: '0 1px 2px #000' }, {})).toBe(false); // 3D mode paints no shadow (index.html:911)
  });

  it('PlaneVisible_ComPintura_NaoCorta', () => {
    for (const n of [{ hasBg: true }, { bgImg: 'linear-gradient(red, blue)' }, { hasBorder: true }, { text: 'Ok' }, { svg: '<svg></svg>' }, { isCheck: true }]) {
      expect(vis(n, {}), JSON.stringify(n)).toBe(true);
    }
  });

  it('PlaneVisible_ComWireLigado_NaoCorta', () => {
    expect(vis({}, { showWire: true })).toBe(true);
  });

  it('PlaneVisible_SelecionadoOuHover_NaoCorta', () => {
    expect(vis({}, { sel: true })).toBe(true);
    expect(vis({}, { hov: true })).toBe(true);
    expect(vis({}, { onLayer: true })).toBe(true);
  });

  it('PlaneVisible_SombraNoModoPlano_NaoCorta', () => {
    expect(vis({ shadow: '0 1px 2px #000' }, { flat: true })).toBe(true);
    expect(vis({}, { flat: true })).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run test/layers-core.test.js -t PlaneVisible`
Expected: FAIL com `core.planeVisible is not a function`.

- [ ] **Step 3: Implementar**

Depois do `}` de `viewCuller`:

```js

  // S4.8: true when a scene plane paints anything: fill, image, border, text/svg/check content, an outline
  // (selection, hover, layer focus, wire) or, in flat mode only, its shadow (Plane, index.html:909-917).
  // A plane that paints nothing can be display:none while dragging without changing a pixel.
  function planeVisible(n, f) {
    return !!(n.hasBg || (n.bgImg && n.bgImg !== 'none') || n.hasBorder || n.text || n.svg || n.isCheck ||
      f.sel || f.hov || f.onLayer || f.showWire || (f.flat && n.shadow && n.shadow !== 'none'));
  }
```

No objeto `api`, depois de `viewCuller: viewCuller,`: `    planeVisible: planeVisible,`

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS (5 testes `PlaneVisible` incluídos).

- [ ] **Step 5: Commit**

```bash
git add lib/layers-core.js test/layers-core.test.js
git commit -m "feat(core): add planeVisible paint predicate for scene planes (S4.8 Task 2)"
```

---

### Task 3: E2E vermelho da variante escolhida

**Files:**
- Modify: `e2e/viewport-culling.spec.js` (V3 e V1: testes novos no fim; V2: sonda `:25-26`)
- Modify: `e2e/menu-open.spec.js:219-224` (só V2)

**Interfaces:**
- Consumes: `cullState`, `dragTo`, `frames`, `stageCentre` (mesmo arquivo); `setWireAlpha` (Task 1).
- Produces: o vermelho que a Task 4 torna verde.

- [ ] **Step 1 (V3): Planos vazios ocultos só sem pintura**

Import de `viewport-culling.spec.js`: acrescentar `setWireAlpha`. No fim do arquivo:

```js
// S4.8: with the wire outline off, planes that paint nothing are display:none while dragging. Un-hiding
// them by hand at the same pose must not change one stage pixel; release shows every plane again.
// The wire-on case is Culling_DefaultView_HiddenPlanesOffStage: an outlined plane hidden on stage fails it.
test('Culling_DragEmptyPlanes_HiddenOnlyWhenNoPaint', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  await setWireAlpha(page, 0);
  await dragTo(page, 60, 40);
  const during = await cullState(page);
  expect(during.dragging, 'drag started').toBe(true);
  expect(during.hidden, 'empty planes hidden during the drag').toBeGreaterThan(0);
  const clip = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    const b = stage.getBoundingClientRect();
    return { x: b.left, y: b.top, width: b.width, height: b.height };
  });
  const hiddenShot = await page.screenshot({ clip });
  // no mouse move in between: React does not re-render, so the hand-set display stays until re-hidden
  await page.evaluate(() => document.querySelectorAll('div[style*="translateZ("]').forEach((el) => {
    if (el.style.display === 'none') { el.dataset.s48Unhid = ''; el.style.display = ''; }
  }));
  const shownShot = await page.screenshot({ clip });
  await page.evaluate(() => document.querySelectorAll('[data-s48-unhid]').forEach((el) => {
    el.style.display = 'none'; delete el.dataset.s48Unhid;
  }));
  expect(shownShot.equals(hiddenShot), 'un-hiding the hidden planes changes no stage pixel').toBe(true);
  await page.mouse.up();
  await frames(page);
  expect((await cullState(page)).hidden, 'release restores every plane').toBe(0);
});
```

Clear `display` de um plano de texto troca `flex` por `block`; plano de texto nunca é vazio, então não entra no conjunto oculto.

- [ ] **Step 1 (V1): Sem hit-test no arrasto**

```js
// S4.8 V1: planes take no pointer events while dragging; release restores them and selects nothing.
test('Plane_Drag_PointerEventsNoneUntilRelease', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  const ptr = () => page.evaluate(() => [...document.querySelectorAll('div[style*="translateZ("]')]
    .filter((el) => /pointer|crosshair/.test(el.style.cursor)).map((el) => el.style.pointerEvents));
  await dragTo(page, 60, 40);
  expect((await cullState(page)).dragging, 'drag started').toBe(true);
  const during = await ptr();
  expect(during.length, 'planes found').toBeGreaterThan(100);
  expect(during.every((v) => v === 'none'), 'no plane hit-testable while dragging').toBe(true);
  await page.mouse.up();
  await frames(page);
  expect((await ptr()).filter((v) => v === 'none').length, 'only solo-off planes stay inert').toBe(0);
});
```

- [ ] **Step 1 (V2): Sondas de arrasto sem `willChange`**

`e2e/viewport-culling.spec.js:25-26` passa a:

```js
    // the stage cursor is 'grabbing' only while dragging (stageCursor, index.html:2414)
    return { hidden, hiddenOnStage, dragging: stage.style.cursor === 'grabbing' };
```

`e2e/menu-open.spec.js:219-224` passa a:

```js
  // the stage cursor is 'grabbing' only while dragging (same probe as viewport-culling.spec.js)
  const dragging = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    return stage.style.cursor === 'grabbing';
  });
```

E no fim de `viewport-culling.spec.js`, o teste que fica vermelho até a Task 4:

```js
// S4.8 V2: no plane and no world div asks for will-change while dragging.
test('Plane_Drag_NoWillChange', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  await dragTo(page, 60, 40);
  expect((await cullState(page)).dragging, 'drag started').toBe(true);
  const wc = await page.evaluate(() => [...document.querySelectorAll('div')].filter((el) => el.style.willChange === 'transform').length);
  await page.mouse.up();
  expect(wc, 'elements with will-change: transform during the drag').toBe(0);
});
```

- [ ] **Step 2: Rodar vermelho**

Run (wrapper E2E): `npx playwright test --project=chromium e2e/viewport-culling.spec.js e2e/menu-open.spec.js`
Expected: só os testes novos da variante falham (V3: `empty planes hidden during the drag`; V1: `no plane hit-testable while dragging`; V2: `elements with will-change`); os existentes passam (na V2 com a sonda nova).

- [ ] **Step 3: Commit**

```bash
git add e2e/viewport-culling.spec.js e2e/menu-open.spec.js
git commit -m "test(e2e): specify the S4.8 drag-time plane behaviour, red (S4.8 Task 3)"
```

---

### Task 4: Correção em `index.html`

**Files:**
- Modify: `index.html` (V1/V2 `:909`, `:912`, `:2160`; V3 `:2124-2127`)

**Interfaces:**
- Consumes: `LayersCore.planeVisible` (Task 2, só V3); o vermelho da Task 3.

- [ ] **Step 1: Conferir âncoras**

```bash
grep -c "pointerEvents: soloOff ? 'none' : 'auto'," index.html
grep -c "contain: 'layout paint', willChange: dragging ? 'transform' : 'auto'," index.html
grep -c "transformStyle: 'preserve-3d', willChange: dragging ? 'transform' : 'auto', transition: dragging ? 'none' : 'transform .35s ease'," index.html
grep -c "const onLayer = hL != null && layerSet.has(n.id); const showWire = " index.html
grep -c "dragging: dragging, culled: culled, interact: interact," index.html
```

Expected: `1` em cada um. Senão, parar e relatar.

- [ ] **Step 2 (V1)**

Substituir `pointerEvents: soloOff ? 'none' : 'auto',` por `pointerEvents: soloOff || dragging ? 'none' : 'auto',`.

- [ ] **Step 2 (V2)**

Substituir `contain: 'layout paint', willChange: dragging ? 'transform' : 'auto',` por `contain: 'layout paint',` e, na âncora do mundo, `transformStyle: 'preserve-3d', willChange: dragging ? 'transform' : 'auto', transition:` por `transformStyle: 'preserve-3d', transition:`.

- [ ] **Step 2 (V3)**

Logo depois da linha que começa com `const onLayer = hL != null && layerSet.has(n.id); const showWire = ` (`:2124`; `culled` em `:2122` não muda) inserir:

```js
      const hidden = culled || (dragging && !LayersCore.planeVisible(n, { sel: sel, hov: hov, onLayer: onLayer, showWire: showWire, flat: spacing === 0 })); // S4.8: no paint, no layer while dragging
```

e trocar `dragging: dragging, culled: culled, interact: interact,` por `dragging: dragging, culled: hidden, interact: interact,`. O comentário de `CULL_MARGIN` (`:903`) ganha a linha `// S4.8: while dragging, planes that paint nothing (LayersCore.planeVisible) are display:none too.`

- [ ] **Step 3: Verde e sem regressão**

Run: `npm test` — Expected: PASS.
Run (wrapper E2E): `npx playwright test --project=chromium e2e/viewport-culling.spec.js e2e/menu-open.spec.js e2e/tree-snapshot.spec.js e2e/origin-sample.spec.js e2e/manual-marker.spec.js` — Expected: PASS (as três correções só agem com `dragging`; quadro estático igual à `develop`). `menu-visual.spec.js` não entra: não carrega projeto, então não vê plano.

- [ ] **Step 4: Prova de regressão (edições temporárias)**

Só V3: (1) em `lib/layers-core.js`, remover `n.hasBorder || ` de `planeVisible`, rodar `npx playwright test --project=chromium e2e/viewport-culling.spec.js` (wrapper) — Expected: FAIL em `un-hiding the hidden planes changes no stage pixel`; (2) remover `f.showWire || ` — Expected: FAIL em `hidden planes that intersect the stage` (`Culling_DefaultView_HiddenPlanesOffStage`). Restaurar com `git checkout -- lib/layers-core.js` depois de cada uma. Se (1) passar, o Traval não tem plano só com borda no conjunto: registrar no relatório e manter o Vitest como guarda.

Expected ao fim: `git status --porcelain` vazio.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "perf(scene): <variant summary> while dragging the camera (S4.8 Task 4)"
```

Resumo da variante: V1 `drop plane hit-testing`; V2 `drop will-change on planes and world`; V3 `hide planes that paint nothing`; combinadas, unir com `and`.

---

### Task 5: Medição final e orçamento

**Files:**
- Modify: `e2e/perf.spec.js:146-153` (`Orbit_Budget_Above50Fps`)
- Create: `bench/results/<ts>-layers-ui.bench.json` ×3

**Interfaces:**
- Consumes: Tasks 1-4; tabela da Task 1.
- Produces: tabela "depois" para a Task 6.

- [ ] **Step 1: Três execuções limpas** (Mechanical)

Procedimento de árvore limpa; depois o **comando da tabela** (Task 1 Step 7). Expected: `dirty false,false,false` e 7 linhas. Relatar o `exit_code` de cada execução e a tabela. Depois da correção, a variante aplicada vira a própria base (V1/V2: `dFrame` ≈ 0; V3: idem contra `wire-off`); o número que conta é `orbit/traval`.

- [ ] **Step 2: Orçamento**

Guardas (medianas, mesmo `env`): `orbit/traval` "depois" ≤ base da Task 1 (frame e p95 + 1 ms); `orbit/traval-zoom` ≤ 1,10 × base. Qualquer guarda falhando: parar e relatar.

| Caso | `:148` (comentário) | `:151` (`test.fail`) |
|---|---|---|
| `Orbit_Budget_Above50Fps` "expected to fail, but passed" nas 3 execuções | apagar `:148-150` | apagar a linha |
| fix entregue, ainda < 50 fps | `// Known gap (checklist D, S4.7): about <a-fps> fps on the Traval mock after S4.8 (<variant>).` | `test.fail(true, 'orbit budget not met yet: S4.7 (virtual tree) is open');` |
| no-go, D4 = aceitar ~42 fps | `// Known gap (checklist D, S4.7): about 42 fps on the Traval mock; S4.8 measured hit-test, will-change and empty planes off the critical path.` | `test.fail(true, 'orbit budget not met yet: S4.7 (virtual tree) is open');` |
| no-go, D4 = leaf nova (`S4.9`) | `// Known gap (checklist D, S4.7 and S4.9): about 42 fps on the Traval mock; S4.8 measured plane attributes off the critical path.` | `test.fail(true, 'orbit budget not met yet: S4.7 (virtual tree) and S4.9 (leaf grouping) are open');` |

- [ ] **Step 3: Ingest e commit**

```bash
python ~/.claude/hooks/bench-history-cli.py ingest --repo .
python ~/.claude/hooks/bench-history-cli.py render --repo .
npm test
git add e2e/perf.spec.js bench/results docs/reports/bench-history
git commit -m "test(perf): record S4.8 after-measure and update the orbit budget test (S4.8 Task 5)"
```

Se o teste de orçamento mudou, rodar `e2e/perf.spec.js` mais uma vez (wrapper) para confirmar e apagar o resultado dessa execução.

---

### Task 6: Docs, changelog e roadmap

**Files:**
- Modify: `docs/RELEASE-CHECKLIST.md:52`, `docs/ARCHITECTURE.md:55` (só com fix), `docs/ARCHITECTURE.md:126`, `docs/roadmap.md:66`
- Create: `changelog.d/feature-261016-0-s4-8-orbit-plane-cost.md`

Não tocar `RELEASE-CHECKLIST.md:8` (contador, recontado na integração da Onda 3), `:50` nem `:51` (S4.7), e não criar item novo em D.

- [ ] **Step 1: Resolver os textos variáveis** (6.1, Workhorse)

Com as tabelas das Tasks 1 e 5 (`<b-*>` base, `<a-*>` depois) e o caso escolhido, escrever sem nenhum `<…>`:

| Texto | Com fix | No-go |
|---|---|---|
| `RELEASE-CHECKLIST.md:52` | trocar `orçamento ainda não cumprido (S4.7 e S4.8; …)` por `orçamento ainda não cumprido (S4.7); S4.8: <variant> no arrasto, orbit <b-ms> → <a-ms> ms/frame (~<a-fps> fps, mediana de 3)` ou, no caso dentro do orçamento, `dentro do orçamento após a S4.8 (<a-ms> ms/frame)` com `[~]` → `[x]` só se scan e orbit cumprirem | trocar `(S4.7 e S4.8; …)` por `(S4.7<, S4.9>); S4.8 mediu hit-test, will-change e planos vazios fora do caminho crítico (<maior dFrame> ms no melhor caso; custo linear por plano visível)` |
| `ARCHITECTURE.md:55` | acrescentar à célula: ` Durante o arrasto, <variant em PT-BR> (S4.8).` | inalterado |
| `ARCHITECTURE.md:126` | trocar `Próximo passo: custo dos planos no orbit (S4.8), árvore virtualizada (S4.7) e agrupamento de folhas.` por `<variant em PT-BR> no arrasto (S4.8). Próximo passo: árvore virtualizada (S4.7) e agrupamento de folhas.` | trocar a mesma frase por `Atributos de plano (hit-test, will-change, planos vazios) medidos fora do caminho crítico do orbit (S4.8). Próximo passo: árvore virtualizada (S4.7) e agrupamento de folhas<( S4.9)>.` |
| `### Perf` | `- measured — orbit Traval, vista padrão: <b-fps> → <a-fps> fps (<b-ms> → <a-ms> ms/frame, p95 <b-p95> → <a-p95> ms; outros <b-other> → <a-other> ms); mediana de 3 execuções, Chromium <ver>, i7-12700.` + `- measured — variantes da Task 1 (delta pareado): V1 <d1> ms, V2 <d2> ms, V3 <d3> ms contra wire desligado, V4 (metade dos planos) <d4> ms.` | só o segundo bullet, mais `- measured — base: <b-fps> fps (<b-ms> ms/frame, outros <b-other> ms); lacuna encaminhada para <S4.7 / S4.9>.` |

- [ ] **Step 2: Escrever** (6.2, Executor)

Aplicar os textos do Step 1. Criar `changelog.d/feature-261016-0-s4-8-orbit-plane-cost.md`:

```md
---
adr: none
---

### Added
- `e2e/perf.spec.js`: variantes de custo dos planos no orbit (sem hit-test, sem `will-change`, wire desligado com e sem os planos vazios, metade dos planos ocultos), censo de planos vazios e `e2e/orbit-trace.spec.js` opcional (`LAYERS_TRACE=1`) com as fases de paint do trace.

### Changed
- <só com fix: o comportamento da variante no arrasto, em uma linha; no no-go, apagar esta seção>

### Perf
<bullets do Step 1>
```

- [ ] **Step 3: Roadmap**

`docs/roadmap.md:66`: coluna `report` com `[](../changelog.d/feature-261016-0-s4-8-orbit-plane-cost.md)` e status `done`; no no-go com D4 = leaf nova, registrar `S4.9` (linha nova depois de S4.8 e membro `"S4.9"` depois de `"S4.8"` em `docs/roadmap.config.json`, status `registered`). Run: `python ~/.claude/design/_build_proto.py .` — Expected: exit 0.

- [ ] **Step 4: Verificar e commitar**

Run: `npm test` — Expected: PASS. Run: `grep -n "<[a-z]" changelog.d/feature-261016-0-s4-8-orbit-plane-cost.md` — Expected: sem saída. Run: `python -X utf8 ~/.claude/scripts/docs-linkcheck.py .` — Expected: sem link quebrado.

```bash
git add docs changelog.d
git commit -m "docs: close S4.8 with changelog fragment, checklist and architecture note (S4.8 Task 6)"
```

O `phase-close-gate` e a revisão pré-merge seguem o ciclo da branch (Model Routing).

---

## Self-Review

| Requisito | Task |
|---|---|
| Leaf antes do código; linha e membro já existentes não duplicados | 0 |
| Diagnóstico sem tocar `index.html`, 3 execuções limpas, delta pareado, go/no-go | 1 |
| V3 medido contra controle com wire desligado; limite do default declarado | 1, Review Focus |
| Predicado puro + Vitest com os nomes pedidos | 2 |
| E2E vermelho antes da correção; pixel igual com os planos reexibidos | 3 → 4 |
| V2 troca as duas sondas de arrasto no mesmo commit | 3 |
| `:2106` e árvore intocados; âncoras únicas contadas | Global Constraints, 4 |
| `test.fail` removido só acima de 50 fps; texto exato por caso | 5 |
| Checklist `:52`, ARCHITECTURE `:55`/`:126`, roadmap, fragmento `### Perf` measured; contador intocado | 6 |

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 0. Branch, linha `in-progress`, cherry-pick do plano | gen | Standard | Workhorse | ciclo de branch com rebuild do tracker |
| 1 Steps 1-5. Helpers, cenários, trace, commit | gen | Standard | Workhorse | autoria de teste; código dado no plano |
| 1 Step 6-7. Três execuções limpas + tabela + ingest | gen | Mechanical | Executor | rodar e resumir; caller valida `exit_code`, `dirty false,false,false`, 7 linhas |
| 1 Steps 8-9. Go/no-go, escolha da variante, commit | gen | Standard | Workhorse | julgamento de perf; para no gate humano |
| 2. `planeVisible` + Vitest | gen | Standard | Workhorse | código e testes dados no plano |
| 3. E2E vermelho | gen | Standard | Workhorse | autoria de teste |
| 4. Correção em `index.html`, verde, prova de regressão | gen | Standard | Workhorse | caminho quente com âncoras exatas |
| 2-4. Revisão do caminho quente (`Plane`/`scene()`, predicado, visual congelado) | review | Architectural | Architect | regra 5; `adversarial-reviewer`, depois da Task 4 e antes da Task 5 |
| 5 Step 1. Três execuções limpas + tabela | gen | Mechanical | Executor | rodar e resumir; caller valida `exit_code`, `dirty`, tabela |
| 5 Steps 2-3. Orçamento, `test.fail`, ingest | gen | Standard | Workhorse | julgamento de perf |
| 6.1. Textos variáveis | gen | Standard | Workhorse | julgamento sobre o resultado |
| 6.2-6.4. Docs, changelog, roadmap, verificação | gen | Mechanical | Executor | texto dado pelo 6.1; caller valida sem `<…>`, números batendo com as tabelas, `exit_code` |
| Revisão pré-merge | review | Architectural | Architect | verificador ≥ gerador |

> [!DECISION] D4 — comportamento durante o arrasto e saída do no-go (herdada do plano geral)
> - V1 (`pointer-events:none` no arrasto) tira hit-test e churn de hover, mas o contorno de hover some durante o arrasto e o clique de mouseup cai no palco. Aceitável?
> - Se nenhuma variante passar o gate da Task 1: **(a)** aceitar ~42 fps com `test.fail` e deixar a lacuna para a S4.7; **(b)** abrir a leaf `S4.9` "agrupamento de folhas" (mudança estrutural do DOM e do hit-test). Recomendação: decidir com a leitura de V4; custo linear por plano aponta para (b).

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — uma leaf já rastreada (S4.8) e um item do checklist D, com plano commitado e PR como superfície de revisão; mesmo tratamento de S4.5 e S4.6.

> [!DECISION] phase-intake
> Classification: **meso** `S4.8` sob **S4 Performance**, alvo **Unreleased** (gate v1: checklist D).
> Fork of an existing row? **No** (linha S4.8 já existe; só `S4.9` nova se D4 = (b)).

> [!DECISION] execution
> Method: **Subagent-driven**, estritamente sequencial: 0 → 1 (gate) → 2 (só V3) → 3 (vermelho) → 4 (verde) → revisão → 5 → 6. Branch `feature/261016-0-s4-8-orbit-plane-cost` (o tipo `perf/` não existe em `fact-git-conventions`; `feature/` casa com o nome do fragmento). Medição final sobre `develop` antes da S4.7 (ordem S4.8 → S4.7 do plano geral).
