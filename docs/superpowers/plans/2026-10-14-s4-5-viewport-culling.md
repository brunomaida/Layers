---
title: "S4.5 Viewport Culling Implementation Plan"
type: plan
solution: Layers
status: draft
created: 2026-10-14
---

# S4.5 Viewport Culling Implementation Plan

Add `LayersCore.viewCuller` (`lib/layers-core.js`) and use it in `scene()`/`Plane` (`index.html`) so that, while the camera is dragged, planes whose projection falls fully outside the stage get `display:none`; measure orbit fps before and after with `e2e/perf.spec.js` on the Traval fixture.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Context

Checklist D item "Culling: pular planos fora do viewport e com opacidade < 0,05" ([RELEASE-CHECKLIST.md](../../RELEASE-CHECKLIST.md) § D) and roadmap leaf S4.5. Budget: orbit > 50 fps; measured 2026-10-13 at ~42 fps on Traval (24 ms/frame, p95 36 ms, 416 scanned nodes, `loafCount` 0), see `bench/results/2026-10-13T22-44-08-589Z-layers-ui.bench.json` and [bench-methodology.md](../../bench-methodology.md). [ARCHITECTURE.md](../../ARCHITECTURE.md) § Limites conhecidos names "culling por viewport/opacidade" as the next step.

Verified code surface (develop @ `8f74cb4`):

| Site | Lines | Role |
|---|---|---|
| v2.7-b comment | `index.html:905-908` | says opacity culling was dropped: dimmed planes floor at 0.30/0.35, solo at 0.08 (unreachable) |
| `Plane` (`React.memo`) | `index.html:910-926` | one absolutely positioned div per node, `translateZ(z)` |
| `visibleMax()` / `cam()` | `index.html:1608-1621` | memoized camera: `fit`, `S`, `yawT`, `shiftX` |
| `flushMove()` | `index.html:1463-1468` | orbit/pan/focus drag, sets `dragging: true` per rAF |
| `scene()` | `index.html:1947-2004` | per-node loop `1957-1970` builds `planes[]`, `zOf`, `nextPrev`; world transform `2001-2002` |
| `onUp` | `index.html:2285` | `dragging: false` on release |

Findings that shape the design:

- `cam()` computes `fit` so the whole page footprint fits the stage. At default zoom almost no plane is off-screen, so viewport culling is expected to move `orbit/traval` (default view) little; gains concentrate on zoom/pan/focus. Task 1 measures this before any code changes, and adds a zoomed orbit scenario so the after-measure can show the effect.
- `cam()` and `scene()` run on every drag frame; the cull test adds 4 corner projections per node per frame (~1.7k for Traval), with no allocation per node.
- During a drag `scene()` already sets every plane's transition to `none`; when the drag is released, all planes re-render anyway because the `dragging` prop flips. Culling only while dragging therefore cannot cause a plane to pop in or out mid-transition, and no click, hover or tree selection can reach a plane during a drag.
- The v2.7-b comment holds for opacity: no plane population sits under 0.05 by construction, so an opacity threshold either culls nothing or changes the visual. Task 3 rewrites the comment to describe viewport culling and keep the opacity verdict.

Sequencing: S4.6 (getComputedStyle cache) also touches `scene()` (bmHover, `index.html:1992`) and sequences **after** S4.5, so each leaf's before/after perf delta can be attributed to it. This plan does not touch any `getComputedStyle` site.

Reuses: `cam()` (`S`, `yawT`, `shiftX`) and `scene()`'s `fx/fy/fz`; the `React.memo` contract of `Plane` with stable `this.H`; `e2e/perf-helpers.js` (`instrument`, `waitForScan`, `orbitDrag`, `writeBench`); the `LayersCore` `api` export pattern next to `staleBannerBox` (`lib/layers-core.js:512`, export `:1158`); `bench-history-cli.py` ingest.
Out of scope: getComputedStyle cache (S4.6); virtual tree (S4.7); grouping leaf planes (ARCHITECTURE "agrupamento de folhas"); a `vitest bench` microbenchmark for the culler (tier General: bench only when asked); culling outside a drag (wheel zoom, `frame()`, static view); `DC_CODES`/`dcWhy`/`hoistFaces` (S2.19), `writeText`/`exportFull` (S6.2), README (S7.1), new functional e2e specs of S5.6.

## Design: Architecture & Flows

Single component (`scene()` inside `index.html`) plus one pure helper in `lib/layers-core.js`. The diagram shows one drag frame.

### Per-frame data flow (micro)

```
 mousemove ──▶ flushMove() (rAF) ──▶ setState({ dragging:true, yaw|tilt|pan|focus })
                                              │
                                              ▼
 ┌────────────────────────────── scene() ──────────────────────────────┐
 │ cam() ─▶ { S, yawT, shiftX }          (memoized, unchanged)          │
 │ fx, fy, fz, panX, panY, tilt, persp, stageW/H, pageW/H               │
 │        │                                                             │
 │        ▼  once per frame, only when dragging              [NEW]      │
 │ cull = LayersCore.viewCuller({ ...camera, margin })                  │
 │        │                                                             │
 │ nodes.forEach(n) ────────────────────────────────────────────────┐   │
 │   iso filter ─▶ z, dim, op  (unchanged)                          │   │
 │   zOf[n.id] = z ; nextPrev[n.id] = { z, op }   (all nodes)       │   │
 │   culled = cull && !sel && !hov && cull(n.x, n.y, n.w, n.h, z)   │NEW│
 │        │  project 4 corners: translate3d(-f) ▶ rotateY ▶ rotateX │   │
 │        │  ▶ scale(S) ▶ translate(tx,ty) ▶ perspective divide     │   │
 │        ▼                                                         │   │
 │   React.createElement(Plane, { ..., culled })                    │   │
 └──────────────────────────────────────────────────────────────────┘   │
 │ overlays: layer frame, measure, bmHover, label  (never culled)       │
 └──────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
 Plane (memo): re-renders only when `culled` flips ─▶ style.display = 'none'
                                              │
 mouseup ──▶ onUp: dragging:false ──▶ cull = null ──▶ every plane visible again
```

### Cull predicate (screen space, conservative)

```
 stage (stageW × stageH), origin at centre, grown by `margin` on each side
 ┌──────────────────────────────────────────────┐
 │  margin                                      │
 │   ┌──────────────────────────────────────┐   │
 │   │            visible stage             │   │   ▢ A  all 4 corners right of the
 │   │                                      │   │        grown stage  → culled
 │   │     ▢ C  any corner inside → kept    │   │
 │   └──────────────────────────────────────┘   │
 │                                              │
 └──────────────────────────────────────────────┘
   ▢ B  corners on different outside sides (plane spans the stage) → kept
   any corner at or behind the eye (persp − z' ≤ 0)                   → kept
```

No mockup: nothing the user sees changes (visual frozen).

## Global Constraints

- Visual frozen: a plane that intersects the stage is never culled; a static frame (no drag) renders exactly as on develop.
- Edit `index.html` with unique anchors; `grep -c` each anchor equals 1 before replacing. `support.js` never edited.
- No `getComputedStyle` site touched (S4.6). No `<head>` change, no network.
- Conventional Commits in EN with `(S4.5)` suffix; never `Co-Authored-By` or any AI attribution; no commit on `develop`.
- Test names `Metodo_Cenario_Esperado`; `npm test` passes before each commit.
- Perf runs: same machine, browser in focus, no other heavy process; compare only runs with the same `env` (bench-methodology § Decision rules).

## Review Focus

- Projection sign conventions: CSS `rotateY(a)` maps `x' = x·cos a + z·sin a`, `z' = −x·sin a + z·cos a`; `rotateX(b)` maps `y' = y·cos b − z·sin b`, `z' = y·sin b + z·cos b`; `scale(S)` is 2D (z unscaled).
- Transform order: the list `translate() scale() rotateX() rotateY() translate3d()` applies right to left to a point.
- World origin = stage centre = `perspective-origin`; page offset `(-pageW/2, -pageH/2)`.
- `zOf`/`nextPrev` still written for culled planes (measure, bmHover, label read `zOf`).
- `sel` and `hov` are never culled; isolation (`isoId`) filtering is unchanged and runs before culling.
- `culled` on `Plane` is applied after the `n.text`/`n.isCheck` branches that set `display`.

> [!DECISION] culling-criterion
> What decides that a plane is skipped.
> - **Option A (recommended)**: viewport projection only. The opacity criterion is dropped and the checklist item is reworded: v2.7-b measured no plane population under 0.05 (dimmed 0.30/0.35, solo 0.08 unreachable), so a 0.05 threshold culls nothing or changes the visual. Task 1 census reports `op < 0.05` and `op == 0` counts as evidence.
> - **Option B**: viewport plus `op === 0` exactly. Same visual, one more comparison; worth it only if the census finds a real zero-opacity population (≥ 5 % of planes).
> - **Option C**: viewport plus `op < 0.05`, as the checklist reads. Planes with opacity in (0, 0.05) vanish during drag and reappear on release: a visual change, rejected by the frozen-visual rule.

> [!DECISION] culled-selectable
> How a culled plane stays selectable/hoverable and how it is hidden.
> - **Option A (recommended)**: cull only while `dragging`, and only by `display:'none'` on the mounted `Plane` (new `culled` prop). No mount/unmount churn; `sel`/`hov` exempt; release restores every plane in the same render that ends the drag, before any click can land (`this.dragged` already swallows the post-drag click). Tree selection, isolation, explode toggle, measure and bmHover never see a culled plane.
> - **Option B**: cull always (also static and wheel zoom) by not creating the element. Saves memo compares in static frames, but planes culled for the target camera disappear during the 0.35 s world transition (visible pop) and mid-drag re-entry mounts new DOM nodes.
> - **Option C**: `visibility:hidden` while dragging. Same safety as A, but the element keeps its layer in the 3D context, so the compositor saving is smaller.

## File Structure

| File | Responsibility |
|---|---|
| `e2e/perf-helpers.js` | `planeCensus`, `zoomIn` helpers |
| `e2e/perf.spec.js` | census in orbit records; zoomed orbit scenario; budget test kept or flipped |
| `lib/layers-core.js` | `viewCuller` (pure), exported on `LayersCore` |
| `test/layers-core.test.js` | unit tests for `viewCuller` |
| `index.html` | `CULL_MARGIN`, `culled` prop on `Plane`, culler in `scene()`, comment 905-908 rewritten |
| `e2e/viewport-culling.spec.js` | invariant: on-screen planes never culled; none culled after release |
| `bench/results/*.bench.json`, `docs/reports/bench-history/` | baseline and after runs |
| `docs/ARCHITECTURE.md`, `docs/RELEASE-CHECKLIST.md`, `changelog.d/feature-261014-0-s4-5-viewport-culling.md` | closing docs |

---

### Task 1: Baseline and cullable-plane census

**Files:**
- Modify: `e2e/perf-helpers.js` (append after `orbitDrag`, before `writeBench`, line ~110)
- Modify: `e2e/perf.spec.js` (`EXPECTED` at :4-10, `Orbit_Drag_RecordsFrameInterval` at :53-66, new test after it)
- Create: `bench/results/<ts>-layers-ui.bench.json` ×3 (written by the runs)

**Interfaces:**
- Consumes: nothing new.
- Produces: `planeCensus(page) → { total, offscreen, partial, opBelow005, opZero }`; `zoomIn(page, steps)`; bench id `orbit/traval-zoom/mean-frame-ms` with `extra.census`.

- [ ] **Step 1: Add the helpers**

Append to `e2e/perf-helpers.js` after `orbitDrag` (before `export function writeBench`):

```js
// Plane census from the DOM (inline styles only per plane): planes are the stage divs with an
// inline translateZ transform and a pointer/crosshair cursor (overlays have no cursor).
export async function planeCensus(page) {
  return page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    if (!stage) throw new Error('stage element not found');
    const sb = stage.getBoundingClientRect();
    const planes = [...stage.querySelectorAll('div')].filter(
      (el) => el.style.transform.startsWith('translateZ(') && /pointer|crosshair/.test(el.style.cursor),
    );
    const c = { total: planes.length, offscreen: 0, partial: 0, opBelow005: 0, opZero: 0 };
    for (const el of planes) {
      const r = el.getBoundingClientRect();
      const out = r.right < sb.left || r.left > sb.right || r.bottom < sb.top || r.top > sb.bottom;
      const inside = r.left >= sb.left && r.right <= sb.right && r.top >= sb.top && r.bottom <= sb.bottom;
      if (out) c.offscreen++;
      else if (!inside) c.partial++;
      const op = el.style.opacity === '' ? 1 : +el.style.opacity;
      if (op < 0.05) c.opBelow005++;
      if (op === 0) c.opZero++;
    }
    return c;
  });
}

// Wheel zoom at the stage centre (zoomBy 1.1 per event), then wait out the 0.35 s world transition.
export async function zoomIn(page, steps) {
  const r = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    const b = stage.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.mouse.move(r.x, r.y);
  for (let i = 0; i < steps; i++) await page.mouse.wheel(0, -100);
  await page.waitForTimeout(600);
}
```

The census reads only inline styles and rects per plane (no per-plane `getComputedStyle`), and runs after `waitForScan`, so it cannot distort the scan burst.

- [ ] **Step 2: Record the census and the zoomed scenario**

In `e2e/perf.spec.js`:
- import: `import { instrument, waitForScan, orbitDrag, writeBench, planeCensus, zoomIn } from './perf-helpers.js';`
- `EXPECTED`: add `'orbit/traval-zoom/mean-frame-ms',` after `'orbit/traval/mean-frame-ms',`.
- In `Orbit_Drag_RecordsFrameInterval`, before `orbit = await orbitDrag(page, 1500);` add `const census = await planeCensus(page);` and add `census,` to the `extra` object.
- Insert after that test:

```js
test('Orbit_Zoomed_RecordsFrameInterval', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  await zoomIn(page, 12);
  const census = await planeCensus(page);
  const z = await orbitDrag(page, 1500);
  rec('orbit/traval-zoom/mean-frame-ms', z.meanFrameMs, {
    fps: z.fps,
    p95FrameMs: z.p95FrameMs,
    frames: z.frames,
    loafCount: z.loafCount,
    loafScriptShare: z.loafScriptShare,
    zoomSteps: 12,
    census,
  });
  expect(z.frames).toBeGreaterThanOrEqual(30);
});
```

- [ ] **Step 3: Verify the spec runs**

Run: `npx playwright test e2e/perf.spec.js`
Expected: all tests pass except `Orbit_Budget_Above50Fps` reported as expected-fail; one new `bench/results/*-layers-ui.bench.json` with both orbit ids and `census` in their `extra`. Delete that file (written from a dirty tree).

- [ ] **Step 4: Commit the spec, then measure on a clean tree**

```bash
git add e2e/perf-helpers.js e2e/perf.spec.js
git commit -m "test(perf): add plane census and zoomed orbit scenario (S4.5)"
```

Run `npx playwright test e2e/perf.spec.js` three times (tab in focus, nothing else running). Expected: three result files with `git.dirty: false`.

- [ ] **Step 5: Record the baseline**

Compute the medians of the three runs with this command (prints a table; keep it for Task 5 and the changelog):

```bash
node -e "const fs=require('fs');const f=fs.readdirSync('bench/results').filter(x=>x.endsWith('-layers-ui.bench.json')).sort().slice(-3);const med=a=>a.sort((x,y)=>x-y)[1];for(const id of ['orbit/traval/mean-frame-ms','orbit/traval-zoom/mean-frame-ms']){const r=f.map(x=>JSON.parse(fs.readFileSync('bench/results/'+x)).benchmarks.find(b=>b.benchId===id));console.log(id,'ms',med(r.map(b=>b.value)).toFixed(1),'fps',med(r.map(b=>b.extra.fps)).toFixed(1),'p95',med(r.map(b=>b.extra.p95FrameMs)).toFixed(1),'census',JSON.stringify(r[0].extra.census))}"
```

Then: `python ~/.claude/hooks/bench-history-cli.py ingest --repo .` and `python ~/.claude/hooks/bench-history-cli.py render --repo .`.

**Go/no-go:** if the zoomed census has `offscreen` < 10 % of `total`, stop after this task and report the numbers: viewport culling cannot reach the budget on this fixture and the leaf needs re-scoping.

- [ ] **Step 6: Commit the baseline**

```bash
git add bench/results docs/reports/bench-history
git commit -m "test(perf): record S4.5 orbit baseline and plane census (S4.5)"
```

---

### Task 2: Pure predicate `viewCuller`

**Files:**
- Modify: `lib/layers-core.js` (function after `staleBannerBox`, line ~517; export after `staleBannerBox: staleBannerBox,` at line ~1158)
- Test: `test/layers-core.test.js` (new `describe` after the `StaleBannerBox` block, before `describe('MovedSince'` at line ~1200)

**Interfaces:**
- Consumes: nothing.
- Produces: `LayersCore.viewCuller(v) → (x, y, w, h, z) => boolean` where `v = { pageW, pageH, stageW, stageH, persp, S, yaw, tilt, tx, ty, fx, fy, fz, margin }` (degrees for `yaw`/`tilt`, px elsewhere); `true` = the plane is fully outside the stage grown by `margin`.

- [ ] **Step 1: Write the failing test**

```js
describe('ViewCuller', () => {
  const base = { pageW: 1000, pageH: 600, stageW: 800, stageH: 600, persp: 1600, S: 1, yaw: 0, tilt: 0, tx: 0, ty: 0, fx: 0, fy: 0, fz: 0, margin: 0 };
  const cull = (o) => core.viewCuller({ ...base, ...o });

  it('PlanoNoCentro_NaoCorta', () => {
    expect(cull({})(450, 250, 100, 100, 0)).toBe(false);
  });

  it('PlanoInteiroADireita_Corta', () => {
    expect(cull({})(950, 250, 50, 50, 0)).toBe(true);
  });

  it('MargemCobreBorda_NaoCorta', () => {
    expect(cull({ margin: 120 })(950, 250, 50, 50, 0)).toBe(false);
  });

  it('PlanoAtravessaOPalco_NaoCorta', () => {
    expect(cull({})(-1000, 250, 3000, 50, 0)).toBe(false);
  });

  it('ZoomEmpurraParaFora_Corta', () => {
    expect(cull({})(700, 250, 50, 50, 0)).toBe(false);
    expect(cull({ S: 4 })(700, 250, 50, 50, 0)).toBe(true);
  });

  it('PanParaEsquerda_Corta', () => {
    expect(cull({ tx: -500 })(450, 250, 100, 100, 0)).toBe(true);
  });

  it('PerspectivaAmpliaPlanoProximo_Corta', () => {
    expect(cull({})(800, 250, 50, 50, 0)).toBe(false);
    expect(cull({})(800, 250, 50, 50, 800)).toBe(true);
  });

  it('CantoAtrasDoOlho_NaoCorta', () => {
    expect(cull({})(950, 250, 50, 50, 2000)).toBe(false);
  });

  it('Yaw90_ProfundidadeViraX', () => {
    // rotateY(90deg): x' = z, so a plane at the page centre pushed to z = 1000 lands right of the stage
    expect(cull({ yaw: 90 })(450, 250, 100, 100, 0)).toBe(false);
    expect(cull({ yaw: 90, persp: 100000 })(450, 250, 100, 100, 1000)).toBe(true);
  });

  it('Tilt90_ProfundidadeViraY', () => {
    // rotateX(90deg): y' = -z, so z = 1000 lands above the stage
    expect(cull({ tilt: 90, persp: 100000 })(450, 250, 100, 100, 1000)).toBe(true);
  });

  it('FocoDesloca_Corta', () => {
    expect(cull({ fx: 900 })(450, 250, 100, 100, 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/layers-core.test.js -t ViewCuller`
Expected: FAIL with `core.viewCuller is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `lib/layers-core.js`, after the closing `}` of `staleBannerBox`:

```js

  // Culling de planos no palco 3D: replica a transformacao do mundo de scene() (translate3d(-f),
  // rotateY, rotateX, scale 2D, translate, perspectiva) e devolve um teste por plano. true = os 4
  // cantos caem do mesmo lado fora do palco ampliado por `margin`; canto atras do olho nunca corta.
  function viewCuller(v) {
    var a = v.yaw * Math.PI / 180, b = v.tilt * Math.PI / 180;
    var ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    var hw = v.stageW / 2 + v.margin, hh = v.stageH / 2 + v.margin;
    var ox = -v.pageW / 2 - v.fx, oy = -v.pageH / 2 - v.fy;
    return function (x, y, w, h, z) {
      var z1 = z - v.fz, l = 0, r = 0, t = 0, d = 0;
      for (var i = 0; i < 4; i++) {
        var x1 = ox + x + (i & 1 ? w : 0), y1 = oy + y + (i & 2 ? h : 0);
        var x2 = x1 * ca + z1 * sa, z2 = -x1 * sa + z1 * ca;
        var y3 = y1 * cb - z2 * sb, z3 = y1 * sb + z2 * cb;
        var q = v.persp - z3;
        if (q <= 0) return false;
        var k = v.persp / q, sx = (v.S * x2 + v.tx) * k, sy = (v.S * y3 + v.ty) * k;
        if (sx < -hw) l++; else if (sx > hw) r++;
        if (sy < -hh) t++; else if (sy > hh) d++;
      }
      return l === 4 || r === 4 || t === 4 || d === 4;
    };
  }
```

In the `api` object, after `staleBannerBox: staleBannerBox,`:

```js
    viewCuller: viewCuller,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all suites, `ViewCuller` included). If a rotation case fails, fix the sign in the implementation against the Review Focus matrices, never the test expectation, unless the expectation contradicts those matrices.

- [ ] **Step 5: Commit**

```bash
git add lib/layers-core.js test/layers-core.test.js
git commit -m "feat(core): add viewCuller screen-space predicate for scene planes (S4.5)"
```

---

### Task 3: Cull planes in `scene()` while dragging

**Files:**
- Modify: `index.html:905-908` (comment), `index.html:910-926` (`Plane`), `index.html:1952` (after `fx, fy, fz`), `index.html:1963` (per-node flags), `index.html:1968` (Plane props)

**Interfaces:**
- Consumes: `LayersCore.viewCuller` (Task 2).
- Produces: `Plane` prop `culled: boolean`; a culled plane renders with `display: none`.

- [ ] **Step 1: Rewrite the v2.7-b comment and add the margin constant**

Replace `index.html:905-908` (the four `// v2.7-b ...` lines; anchor `// v2.7-b: culling por opacidade` matches once) with:

```js
// S4.5: durante o arrasto, plano cuja projeção cai inteira fora do palco (+ CULL_MARGIN) fica display:none (LayersCore.viewCuller).
// Opacidade não corta (v2.7-b): esmaecidos ficam em 0.30/0.35 e o solo em 0.08, todos visíveis.
const CULL_MARGIN = 0.15; // fraction of the larger stage side kept around the viewport (outline, shadow)
```

- [ ] **Step 2: Honour `culled` in `Plane`**

`index.html:911` — add `culled` to the destructuring:

```js
  const { n, z, dim, op, sel, hov, onLayer, showWire, soloOff, tr, interact, fs, wa, spacing, H, dragging, culled } = p;
```

After the `if (n.isCheck) { ... }` line (`index.html:919`) insert:

```js
      if (culled) st.display = 'none';
```

- [ ] **Step 3: Build the culler once per frame**

After `index.html:1952` (the line starting `const fx = focus ? focus.x - s.pageW / 2 : 0`) insert:

```js
    const cull = dragging ? LayersCore.viewCuller({ pageW: s.pageW, pageH: s.pageH, stageW: s.stageW, stageH: s.stageH, persp: P, S: fit * zoom, yaw: yawT, tilt: tilt, tx: shiftX + panX, ty: panY, fx: fx, fy: fy, fz: fz, margin: CULL_MARGIN * Math.max(s.stageW, s.stageH) }) : null;
```

- [ ] **Step 4: Flag and pass `culled` per node**

`index.html:1963` — after `const sel = n.id === selId, hov = n.id === hoverId, soloOff = solo && n.depth !== active;` add on the next line:

```js
      const culled = !!cull && !sel && !hov && cull(n.x, n.y, n.w, n.h, z);
```

`index.html:1968` — in the `React.createElement(Plane, { ... })` props, after `dragging: dragging,` add `culled: culled,`. `zOf[n.id] = z` and `nextPrev[n.id]` stay unconditional.

- [ ] **Step 5: Verify**

Run: `npm test` — Expected: PASS.
Run: `npx playwright test e2e/tree-snapshot.spec.js e2e/origin-sample.spec.js e2e/manual-marker.spec.js` — Expected: PASS (static frames unchanged).
Manual: `npm run dev`, `http://localhost:5180/?layers=fixtures/traval/`, zoom in with the wheel, orbit: no plane that should be on screen blinks; release restores all planes; select via tree, isolate (double click), toggle Explodido, `M` measure and box-model hover all behave as on develop.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "perf(scene): hide off-screen planes while dragging the camera (S4.5)"
```

---

### Task 4: Culling invariant e2e

**Files:**
- Create: `e2e/viewport-culling.spec.js`

**Interfaces:**
- Consumes: Task 3 (`display:none` on culled planes), `waitForScan`/`instrument`/`zoomIn` from `e2e/perf-helpers.js`.
- Produces: proof that no on-screen plane is culled and that release restores all planes.

- [ ] **Step 1: Write the spec**

```js
import { test, expect } from '@playwright/test';
import { instrument, waitForScan, zoomIn } from './perf-helpers.js';

// S4.5: while the camera is dragged, planes fully outside the stage are display:none. A plane that
// intersects the stage must never be hidden, and releasing the drag must show every plane again.
const planes = (page) =>
  page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    const sb = stage.getBoundingClientRect();
    const inset = 20;
    return [...stage.querySelectorAll('div')]
      .filter((el) => el.style.transform.startsWith('translateZ(') && /pointer|crosshair/.test(el.style.cursor))
      .map((el) => {
        const r = el.getBoundingClientRect();
        const onStage = el.style.display !== 'none' &&
          r.right > sb.left + inset && r.left < sb.right - inset && r.bottom > sb.top + inset && r.top < sb.bottom - inset;
        return { onStage, hidden: el.style.display === 'none' };
      });
  });

async function stageCentre(page) {
  return page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    const b = stage.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
}

const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

test('Culling_DragZoomed_OnScreenPlanesNeverHidden', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  await zoomIn(page, 12);
  const before = await planes(page);
  expect(before.some((p) => p.hidden), 'static frame culls nothing').toBe(false);
  const c = await stageCentre(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 1, c.y);
  await frames(page);
  const during = await planes(page);
  // indices match: same DOM order, plane set unchanged by the drag
  const lost = before.filter((p, i) => p.onStage && during[i].hidden).length;
  expect(lost, 'on-screen planes hidden during drag').toBe(0);
  expect(during.filter((p) => p.hidden).length, 'zoomed drag culls something').toBeGreaterThan(0);
  await page.mouse.up();
  await frames(page);
  const after = await planes(page);
  expect(after.some((p) => p.hidden), 'release restores every plane').toBe(false);
});

test('Culling_DefaultView_DragHidesNoOnScreenPlane', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  const before = await planes(page);
  const c = await stageCentre(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 1, c.y);
  await frames(page);
  const during = await planes(page);
  expect(before.filter((p, i) => p.onStage && during[i].hidden).length).toBe(0);
  await page.mouse.up();
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/viewport-culling.spec.js`
Expected: PASS. If `zoomed drag culls something` fails, the zoom did not push planes off-stage (check the Task 1 zoomed census) — raise `zoomIn` steps, never loosen `lost === 0`.

- [ ] **Step 3: Regression proof against develop**

Temporarily set `CULL_MARGIN = -0.4` in `index.html` (culls planes that are still on stage), run `npx playwright test e2e/viewport-culling.spec.js`. Expected: FAIL on `on-screen planes hidden during drag`. Restore with `git checkout -- index.html` (never `git stash`: the stash is shared across worktrees).

- [ ] **Step 4: Commit**

```bash
git add e2e/viewport-culling.spec.js
git commit -m "test(e2e): prove culling never hides on-screen planes (S4.5)"
```

---

### Task 5: After-measure and budget test

**Files:**
- Modify: `e2e/perf.spec.js:68-75` (`Orbit_Budget_Above50Fps`)
- Create: `bench/results/<ts>-layers-ui.bench.json` ×3

**Interfaces:**
- Consumes: Tasks 1-4 committed; baseline medians from Task 1 Step 5.
- Produces: after medians for the changelog `### Perf` block.

- [ ] **Step 1: Run on a clean tree** (Mechanical)

Run `npx playwright test e2e/perf.spec.js` three times under the Task 1 conditions; then the Task 1 Step 5 `node -e` command. Expected: three files with `git.dirty: false`; a printed table for both orbit ids. Report raw `exit_code` and the table.

- [ ] **Step 2: Interpret and settle the budget test**

Compare medians against the baseline with bench-methodology rules (same `env`).
- If `Orbit_Budget_Above50Fps` is reported as "expected to fail, but passed" in all three runs: delete the `test.fail(true, ...)` line and the 3-line comment above it, so the budget is enforced.
- Otherwise: keep `test.fail`, and change only the comment's number line to `// Known gap (checklist D, S4.6-S4.7): about <after fps> fps on the Traval mock after S4.5 culling.` and the `test.fail` message to `'orbit budget not met yet: getComputedStyle cache and virtual tree are open'`.
- Regression guard: default-view `orbit/traval` median must not be slower than baseline by more than 10 % (cull cost on a fully visible scene); if it is, stop and report.

- [ ] **Step 3: Ingest and commit**

```bash
python ~/.claude/hooks/bench-history-cli.py ingest --repo .
python ~/.claude/hooks/bench-history-cli.py render --repo .
npx playwright test e2e/perf.spec.js   # only when the budget test changed: confirms the new expectation
git add e2e/perf.spec.js bench/results docs/reports/bench-history
git commit -m "test(perf): record S4.5 after-measure and update orbit budget gap (S4.5)"
```

Delete the result file written by the confirmation run if the tree was dirty.

---

### Task 6: Docs and changelog

**Files:**
- Modify: `docs/ARCHITECTURE.md:55`, `docs/ARCHITECTURE.md:123`, `docs/RELEASE-CHECKLIST.md:8`, `docs/RELEASE-CHECKLIST.md:43`, `docs/RELEASE-CHECKLIST.md:46`
- Create: `changelog.d/feature-261014-0-s4-5-viewport-culling.md`

**Interfaces:**
- Consumes: Task 1 and Task 5 medians (`<b-*>` baseline, `<a-*>` after) and census.
- Produces: docs consistent with the feature; roadmap row closes later in `phase-close-gate`.

- [ ] **Step 1: ARCHITECTURE**

`docs/ARCHITECTURE.md:55` — replace the row with:

```md
| `cam()`, `scene()`, `Plane` | Câmera, projeção e renderização dos planos. Handlers estáveis em `this.H` mantêm o `memo`. Durante o arrasto, `LayersCore.viewCuller` esconde (`display:none`) os planos cuja projeção cai inteira fora do palco. |
```

`docs/ARCHITECTURE.md:123` — replace the line with:

```md
- DOM 3D: acima de ~1.500 planos o orbit degrada. Mitigações: `contain`, `will-change` só durante drag, transições desligadas no drag (v2.22) e culling por viewport durante o arrasto (S4.5; selecionado e hover nunca cortam; opacidade não é critério, ver comentário v2.7-b no `Plane`). Próximo passo: cache de `getComputedStyle` (S4.6), árvore virtualizada (S4.7) e agrupamento de folhas.
```

- [ ] **Step 2: Checklist**

`docs/RELEASE-CHECKLIST.md:43` — replace with:

```md
- [x] Culling: durante o arrasto da câmera, planos com projeção inteira fora do palco ficam `display:none` (`LayersCore.viewCuller`, S4.5; `e2e/viewport-culling.spec.js`). Opacidade < 0,05 descartada como critério: os planos esmaecidos ficam em 0,30/0,35 (v2.7-b), então um limiar útil mudaria o visual.
```

`docs/RELEASE-CHECKLIST.md:8` — `31 concluídos, 3 parciais, 13 abertos` → `32 concluídos, 3 parciais, 12 abertos`.

`docs/RELEASE-CHECKLIST.md:46` — replace `orbit com input real ~42 fps no Traval (24 ms/frame, p95 36 ms), abaixo dos 50 fps — orçamento ainda não cumprido (S4.5–S4.7)` with `orbit com input real ~<a-fps> fps no Traval após o culling da S4.5 (<a-ms> ms/frame, p95 <a-p95> ms; antes ~<b-fps> fps)` followed by `, abaixo dos 50 fps — orçamento ainda não cumprido (S4.6–S4.7)` when the budget test kept `test.fail`, or `, dentro do orçamento` and `[~]` → `[x]` only if scan and orbit both pass.

- [ ] **Step 3: Changelog fragment**

Create `changelog.d/feature-261014-0-s4-5-viewport-culling.md` (fill every `<…>` from the Task 1/5 tables; no placeholder may remain):

```md
---
adr: none
---

### Added
- Culling de planos por viewport durante o arrasto da câmera (orbit, pan, foco): plano cuja projeção cai inteira fora do palco ampliado em 15 % fica `display:none`; selecionado e hover nunca cortam, e soltar o arrasto mostra todos. `LayersCore.viewCuller` (puro, testado) replica a transformação do mundo de `scene()`.
- `e2e/viewport-culling.spec.js`: nenhum plano visível some durante o arrasto; nenhum fica oculto depois de soltar.
- `e2e/perf.spec.js`: censo de planos e cenário de orbit com zoom (`orbit/traval-zoom/mean-frame-ms`).

### Perf
- measured — orbit Traval, vista padrão: <b-fps> → <a-fps> fps (<b-ms> → <a-ms> ms/frame, p95 <b-p95> → <a-p95> ms); mediana de 3 execuções, Chromium <ver>, i7-12700.
- measured — orbit Traval com zoom 1,1^12: <bz-fps> → <az-fps> fps (<bz-ms> → <az-ms> ms/frame, p95 <bz-p95> → <az-p95> ms); censo com zoom: <offscreen>/<total> planos fora do palco.
```

- [ ] **Step 4: Verify and commit**

Run: `npm test` — Expected: PASS. Run: `grep -n "<[a-z]" changelog.d/feature-261014-0-s4-5-viewport-culling.md` — Expected: no placeholder lines.

```bash
git add docs/ARCHITECTURE.md docs/RELEASE-CHECKLIST.md changelog.d/feature-261014-0-s4-5-viewport-culling.md
git commit -m "docs: close S4.5 with changelog fragment, checklist and architecture note (S4.5)"
```

---

## Self-Review

| Requirement | Task |
|---|---|
| Baseline first, existing perf spec, same fixture | 1 |
| Census decides whether culling can matter (go/no-go) | 1 |
| Pure helper in `lib/layers-core.js` + Vitest | 2 |
| `scene()`/`Plane` wiring, v2.7-b comment rewritten | 3 |
| Visual frozen: on-screen planes never culled, release restores all | 3 (exemptions), 4 (e2e) |
| Selection/hover/isolation/tree/explode/measure/bmHover unaffected | 3 (drag-only, `sel`/`hov` exempt, `zOf` intact), 3 Step 5 manual |
| Before/after on the same fixture in `### Perf` (measured) | 5, 6 |
| Budget test flipped or comment updated | 5 |
| ARCHITECTURE § Limites conhecidos, checklist D, changelog | 6 |
| No getComputedStyle site touched (S4.6 after S4.5) | Global Constraints |

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 1. Baseline, census, zoomed scenario | gen | Standard | Workhorse | test authoring and measurement judgment (go/no-go) |
| 2. `viewCuller` + unit tests | gen | Standard | Workhorse | projection math, test authoring |
| 3. `scene()`/`Plane` wiring | gen | Standard | Workhorse | hot-path edit with exact anchors |
| 2, 3. Design review of culling (projection, exemptions, per-frame cost) | review | Architectural | Architect | hot path, rule 5; via `adversarial-reviewer` |
| 4. Invariant e2e | gen | Standard | Workhorse | test authoring |
| 5 Step 1. Three perf runs + median table | gen | Mechanical | Executor | run-and-summarize; caller validates `exit_code`, `git.dirty: false`, table |
| 5 Step 2-3. Interpret, budget test, ingest | gen | Standard | Workhorse | perf judgment |
| 6. Docs and changelog with numbers | gen | Mechanical | Executor | text given verbatim; caller validates no `<…>` placeholder left and numbers match Task 1/5 tables |
| Pre-merge review | review | Architectural | Architect | verifier ≥ generator |

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — one leaf on an already tracked roadmap row (S4.5) and checklist D item, with a committed plan and a PR as the review surface; same handling as S2.13-S2.15. S4.3/S4.4 shared issue #23 because they came from one spec; S4.5 has none.

> [!DECISION] phase-intake
> Classification: **meso** `S4.5` under **S4 Performance**, target **Unreleased** (v1 gate: checklist D).
> Current tree (relevant slice): S4 Performance (in-progress) › S4.1-S4.4 done › S4.5 Culling (in-progress) › S4.6 getComputedStyle cache, S4.7 virtual tree (registered).
> Fork of an existing row? **No** (row S4.5 already tracked; no new leaf).
> - **Option A**: keep S4.5 as is (recommended)
> - **Option B**: if the Task 1 go/no-go fails, re-scope S4.5 (e.g. leaf grouping) before any code task

> [!DECISION] execution
> Method: **Subagent-driven** (recommended): Tasks 1, 2 and 4 have disjoint files; Task 3 depends on 2, Task 5 on 1-4, Task 6 on 5. Mechanical steps (5 Step 1, 6) go to the `executor` subagent.
