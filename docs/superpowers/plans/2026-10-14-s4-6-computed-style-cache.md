---
title: "S4.6 Computed-Style Cache Implementation Plan"
type: plan
solution: Layers
status: draft
created: 2026-10-14
---

# S4.6 Computed-Style Cache Implementation Plan

Measure how much of the default-view orbit frame is spent reading live computed style, and, only if the upper bound justifies it, add `LayersCore.styleCache` (`lib/layers-core.js`) so the properties panel reads the selected element's computed style once per drag instead of on every drag render (`renderVals()`, `index.html:2013`). Baseline and after-measure use `e2e/perf.spec.js` on the Traval fixture, median of 3 runs.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Context

Checklist D item "Cache de `getComputedStyle` por nó, invalidado em change" ([RELEASE-CHECKLIST.md](../../RELEASE-CHECKLIST.md) § D, line 44) and roadmap leaf S4.6 ([roadmap.md](../../roadmap.md) row S4.6). Budget (line 46): orbit > 50 fps. After S4.5 (develop @ `53b271c`, `bench/results/2026-10-14T18-27-18-871Z`, `…18-30-01-553Z`, `…18-31-39-461Z`): default-view orbit 23.5 ms/frame (42.5 fps, p95 49.9-50.1 ms, `loafCount` 0, `loafScriptShare` 0); zoomed orbit 16.7 ms/frame (60 fps, the vsync ceiling). Reaching 50 fps from the default view needs a frame-time cut of at least 15 % (23.5 → 20 ms). S4.6 is the head of the chain S4.6 → S4.7 (virtualized tree) → S3.3 → S7.4; S4.7 and later are out of scope.

**Merge order (decided):** S5.7 → S4.4b → S3.2 → S4.6. The S4.6 branch is created from `develop` **after** S4.4b and S3.2 are merged; if it already exists, it merges `develop` once before Task 2 Step 5. **No `develop` merge between Task 2 Step 5 and Task 6 Step 1**; any merge in that window means re-running the Task 2 baseline (Steps 5-6). S5.7 names the Playwright projects, so every Playwright command in this plan carries `--project=chromium`. Line numbers below cite develop @ `53b271c`; after S3.2 they may shift, and the anchors (with their `grep -c` checks) are authoritative. S3.2 edits `index.html:1554`, next to `scanSoon()` at `:1555` (Task 5 Step 3): an accepted trivial conflict, resolved by keeping both edits.

Verified `getComputedStyle` call sites (develop @ `53b271c`, `grep -n getComputedStyle index.html lib/layers-core.js support.js`; none in `lib/` or `support.js`):

| Site | Line | Runs | Hot during orbit? | S4.6 |
|---|---|---|---|---|
| `scan()` / `walk()`: `const cs = getComputedStyle(el)` | `index.html:1588` | once per scanned node per scan (`scanSoon`, debounce 90 ms; first scan ~8 ms for 416 nodes, 1,712 tags ~45 ms) | no: not triggered by the drag itself; any mid-drag scan (mock `ResizeObserver`, Ctrl+Z) goes through `scanSoon()`, which bumps the cache first | untouched; the node objects it builds (`bg`, `borders`, `font`, `opacity`, …) already are the per-node snapshot `scene()`/`Plane` paint from; `instrument()` counts these calls as the scan burst |
| `applyCodeText()`: `from: first.style[prop] \|\| getComputedStyle(first)[prop]` | `index.html:1661` | once per new change | no (click/keyboard) | untouched: cold, must be the exact pre-edit value |
| `applyEdit()`: `from: el.style[prop] \|\| getComputedStyle(el)[prop]` | `index.html:1726` | once per new change | no | untouched: same reason |
| `scene()` box-model hover: `const c = getComputedStyle(el)` | `index.html:1996` | every render while `bmHover` is set | no: `bmHover` needs the pointer on the panel's box-model diagram and `bmOut` clears it before the pointer can reach the stage | untouched |
| `renderVals()`: `const cs = el ? getComputedStyle(el) : null` | `index.html:2013` | **every render** (support.js calls `renderVals()` per render, `support.js:1085`), including every drag render | **yes** | **cached while dragging** |
| ↳ reads of that `cs` | `index.html:2030` (`cur = el.style[prop] \|\| cs[prop]` for each visible property row: 78 props in 9 `GROUPS`, all open by default, `grpClosed: {}`), `:2112` (`cs[prop]` again for every non-default row of the same groups), `:2192` (`cs.getPropertyValue(--token)` per token), `:2194-2196` (`bmF`: 12 margin/border/padding reads at `:2195` plus 4 padding reads at `:2196`), `:2200`/`:2201` (`cs.boxSizing`) | every render | yes: up to ~170 property reads per render | through the cache |
| interactions `vis` (via `isShown`, `actOn`, `INTER`) | `index.html:2177` (anchor: `const vis = e =>`) | **every render**, drag renders included: `INTER` is rebuilt per render and calls `isShown`/`vis` for each surface with a `show`/`toggle` target (Traval: 1 call per render, measured 0.30 calls/frame, equal to `renderVals`) | yes, minor: one `display` read per surface, no layout dependency | untouched: must read live `display`; not reachable by the `renderVals` cache |
| interactions `showEl` | `index.html:2178` | on an ⚡ Interagir click | no | untouched |

Findings that shape the design:

- `getComputedStyle(el)` returns a **live** `CSSStyleDeclaration`; the call itself is cheap. The cost is in each property read, which first brings style (and, for layout-dependent properties such as `width`/`padding`, layout) up to date. A cache of the call alone saves nothing; the cache must memoize the **values** read.
- `scene()` paints planes from scan-time node fields; no plane reads computed style per frame. The only per-render reads are the up to ~170 reads of `renderVals()` for the **selected** element (root `'0'` by default).
- The zoomed orbit runs the same `renderVals()` per render and holds 60 fps. That points at the cost of ~416 visible planes (each a compositor layer while dragging: `willChange: 'transform'`, `index.html:911`) rather than script, so the orbit headroom of this cache may be small. `loafCount` 0 says nothing here: the default-view p95 (49.9-50.1 ms) sits on the 50 ms long-animation-frame threshold. Task 2 measures the headroom with two upper bounds and a main-thread breakdown (CDP `Performance.getMetrics`) before any cache code exists; a flat result is a valid outcome ([!DECISION] `go-no-go`), and the breakdown routes the remaining gap (Task 2 Step 7).
- `renderVals()` also reads `el.clientWidth`/`el.clientHeight` per render (`index.html:2196`), a layout read that is not `getComputedStyle`. Task 2 measures it with a second upper bound (`orbit/traval-panel-ideal`); the drag-scoped memo covers it only if that bound wins (Task 5 Step 5).
- Known flake: `waitForScan()` (`e2e/perf-helpers.js:39-53`) only tests the **last** burst. Every app render after the scan calls `getComputedStyle` once (`index.html:2013`), and a render that lands more than 30 ms after the scan opens a new 1-call burst; the predicate `last.count >= minNodes` then never holds again and the wait times out (20 s). This explains 40-50 % failing full `perf.spec.js` runs. S4.6 needs 6 clean full runs (baseline and after), and the drag-scoped cache leaves non-drag renders reading live, so the flake does not go away on its own. Task 1 fixes it on its own leaf, S4.4b ([!DECISION] `flake-leaf`).

Reuses: `e2e/perf-helpers.js` (`instrument`, `waitForScan`, `orbitDrag`, `writeBench`), the S4.5 median `node -e` pattern, `bench-history-cli.py` ingest/render, the `LayersCore` `api` export pattern next to `movedSince` (`lib/layers-core.js:504`, export `:1215`), the undo-redo e2e field locator (`e2e/undo-redo.spec.js:23`).

Out of scope: virtualized tree (S4.7) and the tree-row reconciliation cost it owns; incremental re-scan (skipping style extraction for unchanged nodes on re-scan, [!DECISION] `cache-design` Option C); caching outside a drag (wheel zoom, hover, typing); the five untouched call sites above; `flushMove()` dead code and its stale `docs/ARCHITECTURE.md:56` row (mentioned in S4.5, still not fixed); the checklist counter at `docs/RELEASE-CHECKLIST.md:8`.

## Design: Architecture & Flows

### Per-render data flow during a drag (micro)

```
 mousedown ──▶ onDown ──▶ this.down = {…}; this.dragged = false; this.styles.bump()   [NEW: gen++]
 mousemove (≥ 3 px) ──▶ onMove ──▶ setState({ dragging:true, yaw|tilt|pan|focus })
                                              │
                                              ▼
 ┌──────────────────────────── renderVals() (support.js:1085) ─────────────────────────┐
 │ el = this.els[selId]                                                                │
 │ cs = s.dragging ? this.styles.of(el)        ← memo for (el, gen)        [NEW]       │
 │                 : getComputedStyle(el)      ← live, as on develop                   │
 │        │                                                                            │
 │        │  styles.of(el): WeakMap<Element, { gen, proxy }>                           │
 │        │    hit  (entry.gen === gen) ──▶ same proxy, no getComputedStyle call       │
 │        │    miss ──▶ getComputedStyle(el) once ──▶ new proxy, stored                │
 │        │  proxy[prop] / proxy.getPropertyValue(name): first read hits the live      │
 │        │  declaration, later reads in the same generation return the stored string  │
 │        ▼                                                                            │
 │ rows (2030, 2112) `el.style[prop] || cs[prop]` · tokens · box model (bmF, boxSizing) │
 │ scene() ─▶ planes from node fields (unchanged)                                      │
 └─────────────────────────────────────────────────────────────────────────────────────┘
 mouseup ──▶ onUp ──▶ dragging:false ──▶ next render reads live again
 any edit / undo / revert / interaction / mock resize ──▶ scanSoon() ──▶ this.styles.bump()  [NEW]
```

### Cache contract (`LayersCore.styleCache(read)`)

```
 styleCache(read) ─▶ { of(el), bump() }
   key ........ Element identity (WeakMap): never the positional node id ('0.2.1'), which
                shifts when an interaction inserts or removes a sibling
   value ...... { gen, proxy }; the proxy memoizes property reads and getPropertyValue(name)
   validity ... one generation; bump() is O(1) and drops every entry at once
   memory ..... WeakMap → entries die with their elements (project reload replaces the mock);
                at most one entry per element read during a generation (today: the selected
                element, so 1 entry of ≤ ~170 strings per drag)
   population . lazy: nothing is read until a consumer asks for an element
```

Invalidation is global by design: a single inline-style write can change other elements' computed values through inheritance (`color`, `font-*`), relative units (`em`, `%`), sibling and relational selectors (`:nth-child`, `+`, `~`, `:has()`) and layout (`width`, `height`). Per-element dirtying would have to model the cascade, so it is rejected.

### S4.7 constraint (virtualized tree)

The cache must not block S4.7. Stated as constraints on this leaf's API:

1. Keyed by mock `Element`, not by node id, tree row, row index or `Plane` instance, so S4.7 can mount/unmount tree rows and planes freely.
2. Lazy and O(1) per lookup: no eager pass over all nodes at scan or render time, so cost stays proportional to what is on screen.
3. No iteration API over entries and no per-node invalidation API: `bump()` is the only invalidation, O(1).
4. Holds no reference to app DOM (tree rows, planes), only weak references to mock elements.
5. Consumer-agnostic: `of(el)` takes any element, so S4.7 can read through it for visible rows only, if it ever needs computed style.

No mockup: nothing the user sees changes (visual frozen).

## Global Constraints

- Visual frozen: outside a drag every panel value is read live, as on develop; during a drag the panel shows the values read at the first drag render (the mock cannot change during a drag except through the paths that call `scanSoon()`, which bumps).
- Edit `index.html` with unique anchors; `grep -c` each anchor equals 1 before replacing. `support.js` never edited. No `<head>` change, no network.
- `scan()` keeps calling the global `getComputedStyle` once per node (the harness counts it); the cache never wraps or replaces `window.getComputedStyle`.
- Commits: Conventional Commits in EN with the suffix `(S4.6 Task N)` (Task 1: `(S4.4b Task 1)`); never a co-author trailer, never the session trailer (`Claude` + `-Session:`), never any AI attribution or session URL (`git log -1 --format=%B` must show none of them); no commit on `develop`/`master`; never `git stash` (the stash is shared across worktrees; restore with `git checkout -- <file>`).
- Test names `Metodo_Cenario_Esperado`; `npm test` passes before each commit.
- **E2E wrapper** (every Playwright command in this plan runs inside it; Bash tool `timeout: 600000`): wait for the lock (bounded), refuse a foreign server on 5180 (`reuseExistingServer: true` would silently test another worktree's code), release the lock on any exit:

```bash
n=0; until mkdir /tmp/layers-e2e.lock 2>/dev/null; do n=$((n+1)); [ "$n" -ge 60 ] && { echo "COULD NOT RUN: stale lock"; exit 1; }; sleep 5; done
trap 'rmdir /tmp/layers-e2e.lock' EXIT
code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5180/); [ "$code" = "000" ] || { echo "COULD NOT RUN: port 5180 busy ($code)"; exit 1; }
npx playwright test --project=chromium <specs>
```

- **Clean-tree perf procedure** (Task 2 Step 5, Task 6 Step 1): `writeBench` sets `git.dirty` from `git status --porcelain`, and a fresh `bench/results/*.bench.json` is untracked, so the second run would see the first run's file and record `dirty: true`. After each run, move the new file to the session scratch directory (`$SCRATCH`, the session scratchpad path); move all three back before the median command:

```bash
# one Bash call per run (each within the 600000 ms timeout); $SCRATCH = session scratchpad path
test -z "$(git status --porcelain)" || { echo "tree not clean before the run"; exit 1; }
# ... E2E wrapper with <specs> = e2e/perf.spec.js ...
mv "$(ls -t bench/results/*-layers-ui.bench.json | head -1)" "$SCRATCH/"
# after the third run:
mv "$SCRATCH"/*-layers-ui.bench.json bench/results/
```

  The median table command then prints `dirty false,false,false`; anything else invalidates the set.
- Perf runs: same machine, browser in focus, no other heavy process; compare only runs with the same `env` (bench-methodology § Decision rules).

## Review Focus

- `scan()` and its `getComputedStyle` count are unchanged: `load/traval/first-scan-ms` keeps `gcsCalls` 416 and `scan/1500-tags-ms` keeps ≤ tags + 20 (the `perf.spec.js:51` guard).
- The cache is consulted only when `s.dragging` is true; every other render path is byte-identical to develop.
- `bump()` sits in `onDown` (before any drag render) and in `scanSoon()` (first statement, so a Ctrl+Z pressed while the mouse is held invalidates before the next render; support.js mounts with `ReactDOM.createRoot`, `support.js:196`, so `setState` is batched and the bump in the same synchronous block always precedes the render).
- The proxy supports exactly what `renderVals()` uses: property reads (`cs[prop]`, `cs.boxSizing`) and `cs.getPropertyValue(name)` (`grep` in Task 5 Step 1 proves no other member is used). Other methods of the declaration would be returned unbound.
- `memoComputedStyle()` and `memoClientBox()` (Task 2 spikes) are test-only stubs that never invalidate; they run after `waitForScan()` and before the drag only.
- `waitForScan()` fix: the predicate picks the last burst with `count >= minNodes`, so later small bursts (renders, helpers) and smaller later scans cannot hide a finished scan.
- Correctness risks and their cover:

| Risk | Cover |
|---|---|
| Stale value after an edit (same element) | `cur = el.style[prop] \|\| cs[prop]`: the edited inline value wins; `scanSoon()` bumps |
| Stale inherited/relative value (edit on an ancestor or sibling) | global `bump()` in `scanSoon()`, called by every mutation path (`applyEdit`, `applyCodeText`, `decide`, `revert`, undo/redo, history, `cancelAll`, interactions, `interactWith`, mock `ResizeObserver`) |
| Change that bypasses `scanSoon()` between drags (theme vars inherited into the shadow root, project font load, mock CSS transition/animation ending) | `bump()` at every `onDown`; outside a drag reads are live; `e2e/style-cache.spec.js` mutates the mock behind the app's back between two drags |
| Mock transition/animation running during a drag | value frozen at the first drag render for the drag's duration; refreshed on release (accepted: same as the scan snapshot the planes paint from) |
| Pseudo-states (`:hover`, `:focus`, `:active`) | the mock host is `pointer-events:none` at `left:-20000px` (`index.html:800`), so the pointer never hovers mock elements; `:checked`/class changes come from interactions, which call `scanSoon()` |
| Folder change / project reload | new mock elements miss the WeakMap; old entries are collected with their elements |

> [!DECISION] flake-leaf
> Who fixes the `waitForScan()` trailing-burst flake. **Settled: Option A.**
> - **Option A (recommended)**: separate micro leaf **S4.4b** (level 3 under S4.4, which built the harness; precedent S4.4a, S7.8a): Task 1 below runs on its own branch `fix/261014-0-s4-4b-wait-for-scan` with fragment `changelog.d/fix-261014-0-s4-4b-wait-for-scan.md` and merges to `develop` before S3.2 and S4.6 (merge order in Context). Keeps the S4.6 diff about the cache and lets every perf leaf benefit at once.
> - **Option B**: Task 1 runs on the S4.6 branch as its first code commit and the S4.6 fragment gains a `### Fixed` bullet. One PR fewer; the harness fix hides inside a perf leaf.
> - **Option C**: a micro leaf after S4.6. Rejected: Task 2 and Task 6 need 6 clean full runs, and at 40-50 % failures that means about 12 attempts.

> [!DECISION] cache-design
> What is cached, and when it is consulted. **Settled: Option A.**
> - **Option A (recommended)**: render-path memo, drag-scoped. `renderVals()` reads through `this.styles.of(el)` only while `dragging`; bump on `onDown` and in `scanSoon()`. Covers the only computed-style reads on the orbit hot path, with the smallest stale-value surface (one element, one drag).
> - **Option B**: render-path memo on every render. Also saves the reads on hover, wheel-zoom and typing renders (not budgeted), but every change that bypasses `scanSoon()` needs its own bump: `applyTheme()`, `document.fonts` `loadingdone`, `transitionend`/`animationend` on the shadow root, project load/unload. Each missed hook shows a stale panel value until the next edit. Add one e2e per hook.
> - **Option C**: scan-time per-node extraction cache (re-scan skips style extraction for nodes not dirtied by a change). Matches the checklist wording, but scan is not on the orbit path (no orbit gain). It saves part of an ~8 ms re-scan that is already 7× under the 300 ms budget for 1,500 nodes. Dirty-subtree propagation still misses sibling and `:has()` selectors.

> [!DECISION] go-no-go
> What happens if the Task 2 upper bound is flat (gate fails).
> - **Option A (recommended)**: close S4.6 as measured-negative. Keep the Task 2 harness (main-thread breakdown, both ideal scenarios), because the routed leaf needs it. Skip Tasks 3-6. Task 2 Step 8 updates the budget test comment; Task 7 writes the measured-negative texts (Step 1, no-go column). Checklist line 44 never becomes `[x]` on this path: it stays `[ ]` until the human signs off the numbers, then becomes the `[~]` text of Task 7 Step 1.
> - **Option B**: implement the cache anyway (Tasks 3-6) for the hover/typing renders. Code without a measured budget gain.
> - **Option C**: merge S4.6 into S4.7 and re-scope both rows before any code.

## File Structure

| File | Responsibility |
|---|---|
| `docs/roadmap.md`, `docs/roadmap.config.json`, `docs/roadmap.data.json` | S4.4b row (Task 1 Step 0); S4.6 start (Task 0); routed plane-cost leaf if Task 2 Step 7 asks for it |
| `e2e/perf-helpers.js` | `waitForScan` fix (Task 1); `instrument` call counter, `orbitDrag` main-thread breakdown and `gcsPerFrame`, `memoComputedStyle` and `memoClientBox` stubs (Task 2) |
| `e2e/wait-for-scan.spec.js` | deterministic reproduction of the trailing-burst flake (Task 1) |
| `e2e/perf.spec.js` | `orbit/traval-gcs-ideal` and `orbit/traval-panel-ideal` upper bounds; `gcsPerFrame` and `main` in orbit records; budget test comment (Tasks 2, 6) |
| `lib/layers-core.js` | `styleCache` (pure), exported on `LayersCore` (Task 3) |
| `test/layers-core.test.js` | unit tests for `styleCache` (Task 3) |
| `e2e/style-cache.spec.js` | written red before the wiring: no live reads during a drag; external mutation between drags shows the live value (Task 4) |
| `index.html` | `styles` field, bump in `onDown` and `scanSoon()`, drag-scoped read in `renderVals()`; `bmCW`/`bmCH` only if `orbit/traval-panel-ideal` wins (Task 5) |
| `bench/results/*.bench.json`, `docs/reports/bench-history/` | baseline and after runs (Tasks 2, 6) |
| `docs/ARCHITECTURE.md`, `docs/RELEASE-CHECKLIST.md`, `changelog.d/feature-261014-0-s4-6-computed-style-cache.md` | closing docs (Task 7) |

---

### Task 0: Start S4.6 in the tracker

**Files:**
- Modify: `docs/roadmap.md:52` (row S4.6), `docs/roadmap.data.json` (rebuilt)

**Interfaces:**
- Consumes: `develop` with S4.4b and S3.2 merged.
- Produces: branch `feature/261014-0-s4-6-computed-style-cache` whose first commit marks S4.6 `in-progress` with the plan linked; the plan commits follow it.

- [ ] **Step 1: Branch and update the row**

```bash
git switch develop && git pull --ff-only
git switch -c feature/261014-0-s4-6-computed-style-cache
```

`docs/roadmap.md` — replace the S4.6 row (`| S4.6 | 2 | S4 | Cache de getComputedStyle por nó | checklist D | — | — | — | — | registered |`) with:

```md
| S4.6 | 2 | S4 | Cache de getComputedStyle por nó | checklist D | — | [](superpowers/plans/2026-10-14-s4-6-computed-style-cache.md) | — | — | in-progress |
```

Run: `python ~/.claude/design/_build_proto.py .` — Expected: exit 0; `docs/roadmap.data.json` shows S4.6 `in-progress`.

- [ ] **Step 2: Commit first, then bring the plan**

```bash
git add docs/roadmap.md docs/roadmap.data.json
git commit -m "docs: start S4.6 in the tracker (S4.6 Task 0)"
git cherry-pick <plan commits from the planning branch, oldest first>
```

Expected: `git log --oneline develop..HEAD` lists the tracker commit first, then the plan commits; `test -f docs/superpowers/plans/2026-10-14-s4-6-computed-style-cache.md` succeeds.

---

### Task 1: `waitForScan` picks the last scan-sized burst (leaf S4.4b)

Runs on branch `fix/261014-0-s4-4b-wait-for-scan`, created from `develop` after S5.7 is merged ([!DECISION] `flake-leaf` Option A).

**Files:**
- Modify: `docs/roadmap.md` (new row after S4.4a, line ~50), `docs/roadmap.config.json` (member after `"S4.4a"`, line ~61), `docs/roadmap.data.json` (rebuilt)
- Modify: `e2e/perf-helpers.js:36-53` (`waitForScan` and its comment)
- Create: `e2e/wait-for-scan.spec.js`, `changelog.d/fix-261014-0-s4-4b-wait-for-scan.md`

**Interfaces:**
- Consumes: `instrument` (unchanged).
- Produces: `waitForScan(page, minNodes, timeout)`, same signature and return value; resolves once the last burst with `count >= minNodes` has been idle for 400 ms, whatever smaller bursts follow it.

- [ ] **Step 0: Register S4.4b (first commit on the branch)**

In `docs/roadmap.md`, insert after the S4.4a row (`| S4.4a | 3 | S4.4 | Vitest ignora e2e/ | … | done |`), same column layout:

```md
| S4.4b | 3 | S4.4 | waitForScan ignora rajadas pequenas | Só a última rajada de getComputedStyle era conferida; 40-50 % das execuções completas de perf.spec.js estouravam o timeout | — | — | [](../changelog.d/fix-261014-0-s4-4b-wait-for-scan.md) | — | in-progress |
```

The plan column stays `—` (the S4.6 plan is not on `develop` yet). In `docs/roadmap.config.json`, add `"S4.4b",` after `"S4.4a",` in the Performance members. Run: `python ~/.claude/design/_build_proto.py .` — Expected: exit 0; S4.4b appears under S4.4 in `docs/roadmap.data.json`.

```bash
git add docs/roadmap.md docs/roadmap.config.json docs/roadmap.data.json
git commit -m "docs: register S4.4b in the tracker (S4.4b Task 1)"
```

- [ ] **Step 1: Write the failing reproduction**

Create `e2e/wait-for-scan.spec.js`:

```js
import { test, expect } from '@playwright/test';
import { instrument, waitForScan } from './perf-helpers.js';

// Every app render after the scan reads the selected node's computed style once (renderVals), which
// opens a new 1-call burst when it lands more than 30 ms after the scan. waitForScan must still
// resolve on the scan burst. Init scripts run in registration order, so __perf already exists here.
test('WaitForScan_TrailingSmallBursts_ResolvesOnScan', async ({ page }) => {
  await instrument(page);
  await page.addInitScript(() => {
    const poll = setInterval(() => {
      if (!window.__perf.bursts.some((x) => x.count >= 100)) return;
      clearInterval(poll);
      // one call every 100 ms: each is its own burst (gap > 30 ms), so the last burst stays at 1 call
      setInterval(() => getComputedStyle(document.documentElement), 100);
    }, 10);
  });
  await page.goto('/?layers=fixtures/traval/');
  const scan = await waitForScan(page, 5, 5_000);
  expect(scan.nodes).toBeGreaterThan(100);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run (E2E wrapper): `npx playwright test --project=chromium e2e/wait-for-scan.spec.js`
Expected: FAIL with `page.waitForFunction: Timeout 5000ms exceeded.`

- [ ] **Step 3: Fix the predicate**

In `e2e/perf-helpers.js`, replace the comment and the `waitForFunction` predicate of `waitForScan` (anchor `return !!last && last.count >= n && performance.now() - last.last > 400;` matches once) so the block reads:

```js
// Waits until the last burst of at least `minNodes` computed-style reads has been idle for 400 ms and
// returns the largest burst: `nodes` is its getComputedStyle call count (about the scanned node
// count), `ms` its span and `endMs` the time since navigation start at which it ended. Smaller bursts
// after it (one call per app render, the helpers' own reads) are ignored.
export async function waitForScan(page, minNodes = 5, timeout = 20_000) {
  await page.waitForFunction(
    (n) => {
      const b = window.__perf.bursts;
      let last = null;
      for (let i = b.length - 1; i >= 0 && !last; i--) if (b[i].count >= n) last = b[i];
      return !!last && performance.now() - last.last > 400;
    },
    minNodes,
    { timeout },
  );
```

The `page.evaluate` that returns the largest burst stays as is.

- [ ] **Step 4: Run the reproduction and the specs that use the helper**

Run (E2E wrapper): `npx playwright test --project=chromium e2e/wait-for-scan.spec.js e2e/viewport-culling.spec.js`
Expected: PASS (3 tests).
Run (E2E wrapper) three times: `npx playwright test --project=chromium e2e/perf.spec.js`
Expected: all three runs pass (`Orbit_Budget_Above50Fps` reported as expected-fail); no `Timeout … exceeded` in `waitForScan`. Delete the three result files (dirty tree).

- [ ] **Step 5: Changelog fragment**

Create `changelog.d/fix-261014-0-s4-4b-wait-for-scan.md`:

```md
---
adr: none
---

### Fixed
- `e2e/perf-helpers.js`: `waitForScan` espera a última rajada de `getComputedStyle` do tamanho de um scan, não a última rajada. Cada render do app depois do scan abre uma rajada de 1 chamada (`renderVals`), e 40-50 % das execuções completas de `e2e/perf.spec.js` estouravam o timeout de 20 s. Reprodução em `e2e/wait-for-scan.spec.js`.

### Perf
- N/A — muda só a espera do harness de testes de performance; nenhuma medida nem código do app muda.
```

- [ ] **Step 6: Commit**

```bash
npm test
git add e2e/perf-helpers.js e2e/wait-for-scan.spec.js changelog.d/fix-261014-0-s4-4b-wait-for-scan.md
git commit -m "fix(e2e): wait for the last scan-sized getComputedStyle burst (S4.4b Task 1)"
```

The S4.4b closing (row `done`, `phase-close-gate`) and its pre-merge review follow the usual branch lifecycle (Model Routing).

---

### Task 2: Baseline, main-thread breakdown and upper bounds (go/no-go)

**Files:**
- Modify: `e2e/perf-helpers.js` (`instrument` at :8-34, `orbitDrag` at :57-109, new `memoComputedStyle` and `memoClientBox` after `zoomIn`)
- Modify: `e2e/perf.spec.js` (import at :2, `EXPECTED` at :4-12, the three orbit `rec` calls, two new tests after `Orbit_Drag_RecordsFrameInterval`; `:113-116` on the no-go path)
- Create: `bench/results/<ts>-layers-ui.bench.json` ×3 (written by the runs)

**Interfaces:**
- Consumes: Task 0 (branch with S4.4b and S3.2 merged).
- Produces: `orbitDrag()` result gains `gcsCalls`, `gcsPerFrame`, `main: { taskMs, scriptMs, styleMs, layoutMs }` (per frame, from CDP `Performance.getMetrics` deltas); `memoComputedStyle(page)`, `memoClientBox(page)`; bench ids `orbit/traval-gcs-ideal/mean-frame-ms` and `orbit/traval-panel-ideal/mean-frame-ms`; baseline medians for Task 6 and Task 7; the routing of the remaining gap.

- [ ] **Step 1: Count calls in `instrument`**

In `e2e/perf-helpers.js`, `instrument`: change `w.__perf = { bursts: [], loaf: [], obs: null };` to `w.__perf = { bursts: [], loaf: [], obs: null, calls: 0 };` and, in the wrapper, after `cur.count++;` add `w.__perf.calls++;`.

- [ ] **Step 2: Main-thread breakdown and call rate in `orbitDrag`**

Replace `orbitDrag` (from `// Orbit drag with real input events` to its closing `}`) with:

```js
// Orbit drag with real input events (CDP mouse: hit-testing, mouseenter/leave on the planes under
// the cursor) for `durationMs`, while an in-page rAF loop records the frame intervals. CDP
// Performance metrics split the main-thread time per frame (task, script, style recalc, layout);
// gcsPerFrame counts getComputedStyle calls between mousedown and mouseup.
export async function orbitDrag(page, durationMs = 1500) {
  const r = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    if (!stage) throw new Error('stage element not found');
    const b = stage.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metrics = async () =>
    Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await page.evaluate(() => {
    const rec = (window.__orbit = { times: [], stop: false });
    let last = performance.now();
    const step = (t) => {
      rec.times.push(t - last);
      last = t;
      if (!rec.stop) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    window.__perf.loaf.length = 0;
  });
  const m0 = await metrics();
  await page.mouse.move(r.x, r.y);
  await page.mouse.down();
  // after mousedown: hover renders before the press read live style and are not part of the drag
  await page.evaluate(() => (window.__perf.calls0 = window.__perf.calls));
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < durationMs) {
    await page.mouse.move(r.x + (i % 60) * 2, r.y + Math.sin(i / 8) * 40);
    i++;
  }
  const gcsCalls = await page.evaluate(() => window.__perf.calls - window.__perf.calls0);
  await page.mouse.up();
  const m1 = await metrics();
  await cdp.detach();
  const res = await page.evaluate(() => {
    window.__orbit.stop = true;
    const p = window.__perf;
    if (p.obs) {
      for (const e of p.obs.takeRecords()) {
        p.loaf.push({ d: e.duration, s: (e.scripts || []).reduce((a, s) => a + s.duration, 0) });
      }
    }
    const times = window.__orbit.times.slice(1);
    if (times.length < 10) throw new Error(`only ${times.length} animation frames during the drag`);
    const sorted = [...times].sort((a, b) => a - b);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const loafTotal = p.loaf.reduce((a, x) => a + x.d, 0);
    const loafScript = p.loaf.reduce((a, x) => a + x.s, 0);
    return {
      frames: times.length,
      meanFrameMs: mean,
      fps: 1000 / mean,
      p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
      loafCount: p.loaf.length,
      loafScriptShare: loafTotal ? loafScript / loafTotal : 0,
    };
  });
  const per = (k) => ((m1[k] - m0[k]) * 1000) / res.frames;
  return {
    ...res,
    gcsCalls,
    gcsPerFrame: gcsCalls / res.frames,
    main: { taskMs: per('TaskDuration'), scriptMs: per('ScriptDuration'), styleMs: per('RecalcStyleDuration'), layoutMs: per('LayoutDuration') },
  };
}
```

`Performance.getMetrics` durations are cumulative seconds for the page's main thread; dividing the delta by the rAF frame count gives ms per frame. It has **no paint, commit, raster or GPU metric**: whatever the main thread spends outside script, style and layout lands in `otherMs = taskMs − scriptMs − styleMs − layoutMs` (paint recording, layerize/commit, GC, input dispatch), and compositor/GPU time is not in `taskMs` at all. The CDP session also runs in the baseline, so it does not bias the before/after comparison.

- [ ] **Step 3: Add the two upper-bound stubs**

Append after `zoomIn` (before `export function writeBench`):

```js
// S4.6 upper bound: from now on getComputedStyle(el) returns, per element, a memo that reads each
// property once and never refreshes. Valid only while nothing mutates the mock (an orbit drag); call
// after waitForScan so the scan itself stays live and counted.
export async function memoComputedStyle(page) {
  await page.evaluate(() => {
    const live = window.getComputedStyle;
    const memo = new WeakMap();
    window.getComputedStyle = function (el, pseudo) {
      if (pseudo) return live(el, pseudo);
      let p = memo.get(el);
      if (!p) {
        const cs = live(el);
        const vals = Object.create(null);
        const vars = Object.create(null);
        const gpv = (n) => (n in vars ? vars[n] : (vars[n] = cs.getPropertyValue(n)));
        p = new Proxy(cs, {
          get: (t, k) => (k === 'getPropertyValue' ? gpv : typeof k !== 'string' ? t[k] : k in vals ? vals[k] : (vals[k] = t[k])),
        });
        memo.set(el, p);
      }
      return p;
    };
  });
}

// S4.6 second upper bound, on top of memoComputedStyle: clientWidth/clientHeight of mock elements
// (renderVals box model, index.html:2196) are memoized per element through WeakMap-backed getters
// and never refresh. App elements (outside the mock's shadow root) keep the live getters.
export async function memoClientBox(page) {
  await page.evaluate(() => {
    for (const k of ['clientWidth', 'clientHeight']) {
      const d = Object.getOwnPropertyDescriptor(Element.prototype, k);
      const memo = new WeakMap();
      Object.defineProperty(Element.prototype, k, {
        configurable: true,
        get() {
          if (!(this.getRootNode() instanceof ShadowRoot)) return d.get.call(this);
          if (!memo.has(this)) memo.set(this, d.get.call(this));
          return memo.get(this);
        },
      });
    }
  });
}
```

- [ ] **Step 4: Record the breakdown and the upper bounds**

In `e2e/perf.spec.js`:
- import: `import { instrument, waitForScan, orbitDrag, writeBench, planeCensus, zoomIn, memoComputedStyle, memoClientBox } from './perf-helpers.js';`
- `EXPECTED`: add `'orbit/traval-gcs-ideal/mean-frame-ms',` and `'orbit/traval-panel-ideal/mean-frame-ms',` after `'orbit/traval/mean-frame-ms',`.
- In each of the three existing orbit `rec(...)` extras (`orbit/traval`, `orbit/traval-zoom`, `orbit/traval-zoom-ideal`), add `gcsPerFrame: <var>.gcsPerFrame, main: <var>.main,` after `loafScriptShare`, where `<var>` is `orbit` or `z` as in that test.
- Insert after `Orbit_Drag_RecordsFrameInterval`:

```js
// Upper bounds for the S4.6 go/no-go: after the scan every computed-style read (and, for the panel
// bound, every mock clientWidth/clientHeight read) is memoized per element and never refreshed.
for (const [name, id, box] of [
  ['Orbit_GcsIdeal_RecordsFrameInterval', 'orbit/traval-gcs-ideal/mean-frame-ms', false],
  ['Orbit_PanelIdeal_RecordsFrameInterval', 'orbit/traval-panel-ideal/mean-frame-ms', true],
]) {
  test(name, async ({ page }) => {
    await instrument(page);
    await page.goto('/?layers=fixtures/traval/');
    await waitForScan(page);
    await memoComputedStyle(page);
    if (box) await memoClientBox(page);
    const o = await orbitDrag(page, 1500);
    rec(id, o.meanFrameMs, {
      fps: o.fps,
      p95FrameMs: o.p95FrameMs,
      frames: o.frames,
      loafCount: o.loafCount,
      loafScriptShare: o.loafScriptShare,
      gcsPerFrame: o.gcsPerFrame,
      main: o.main,
    });
    expect(o.frames).toBeGreaterThanOrEqual(30);
    expect(o.gcsPerFrame, 'the memo stub must remove live reads during the drag').toBeLessThanOrEqual(0.05);
  });
}
```

- [ ] **Step 5: Verify the spec runs, commit, measure on a clean tree**

Run (E2E wrapper): `npx playwright test --project=chromium e2e/perf.spec.js`
Expected: all tests pass except `Orbit_Budget_Above50Fps` (expected-fail); one new result file with both ideal ids and `gcsPerFrame`/`main` in every orbit `extra`. Delete that file (dirty tree).

```bash
npm test
git add e2e/perf-helpers.js e2e/perf.spec.js
git commit -m "test(perf): add main-thread breakdown and computed-style upper bounds (S4.6 Task 2)"
```

Run the three measured runs with the **clean-tree perf procedure** (Global Constraints). Expected: three result files back in `bench/results/`.

- [ ] **Step 6: Record the baseline (median table)**

This **median table command** is reused in Task 6:

```bash
node -e "const fs=require('fs');const f=fs.readdirSync('bench/results').filter(x=>x.endsWith('-layers-ui.bench.json')).sort().slice(-3);const J=f.map(x=>JSON.parse(fs.readFileSync('bench/results/'+x)));console.log(f.join(' '),'dirty',J.map(j=>j.git.dirty).join(','));const med=a=>a.slice().sort((x,y)=>x-y)[1];const ids=['load/traval/first-scan-ms','scan/1500-tags-ms','orbit/traval/mean-frame-ms','orbit/traval-gcs-ideal/mean-frame-ms','orbit/traval-panel-ideal/mean-frame-ms','orbit/traval-zoom/mean-frame-ms','explode/traval/toggle-ms'];for(const id of ids){const r=J.map(j=>j.benchmarks.find(b=>b.benchId===id));const x=k=>r[0].extra[k]===undefined?'-':med(r.map(b=>b.extra[k])).toFixed(2);const m=k=>r[0].extra.main?med(r.map(b=>b.extra.main[k])).toFixed(2):'-';const o=r[0].extra.main?med(r.map(b=>b.extra.main.taskMs-b.extra.main.scriptMs-b.extra.main.styleMs-b.extra.main.layoutMs)).toFixed(2):'-';console.log(id,'ms',med(r.map(b=>b.value)).toFixed(1),'fps',x('fps'),'p95',x('p95FrameMs'),'gcs/f',x('gcsPerFrame'),'task',m('taskMs'),'script',m('scriptMs'),'style',m('styleMs'),'layout',m('layoutMs'),'other',o)}"
```

Expected: `dirty false,false,false` and seven rows. Keep the table (it feeds Steps 7-8, Task 6 and Task 7). Then `python ~/.claude/hooks/bench-history-cli.py ingest --repo .` and `python ~/.claude/hooks/bench-history-cli.py render --repo .`.

Expected (informative, not a gate): `orbit/traval` `gcs/f` around 1 or more (one live declaration per drag render; React may coalesce moves); both ideal rows `gcs/f` ≤ 0.05 (asserted by the spec). Task 6 G1 compares against the recorded baseline value.

- [ ] **Step 7: Go/no-go and routing of the gap**

**Go** only if the `orbit/traval-gcs-ideal` median mean-frame is at least 10 % below the `orbit/traval` median (ideal ≤ 0.90 × baseline). The 50 fps budget alone would need at least 15 %. If `orbit/traval-panel-ideal` is a further ≥ 5 % below `orbit/traval-gcs-ideal`, Task 5 Step 5 (memoize `bmCW`/`bmCH`) is in scope; otherwise it is skipped and the docs say only "o cache".

Whatever the verdict, route the remaining gap from the `orbit/traval` breakdown (`taskMs`, `scriptMs`, `styleMs`, `layoutMs`, `otherMs`) against its mean frame time, and write the routing into the report:
- `scriptMs` is the largest share of `taskMs` → the gap belongs to **S4.7** (React reconciliation of tree rows and planes per drag render).
- `taskMs` well below the frame time (under half of it), or `styleMs`/`layoutMs`/`otherMs` dominate → the gap is plane cost (~414 compositor layers via `willChange: 'transform'` while dragging, `index.html:911`; paint/commit/raster). Register a new plane-cost leaf (next free S4.x id) in the same PR before closing S4.6, scoped as "agrupamento de folhas" (`docs/ARCHITECTURE.md:125`) or a layer budget. Do not route it to S4.7 by default.

No later task starts before this gate passes or the human picks [!DECISION] `go-no-go` Option B. On no-go, stop after Step 8 and report the table and the routing.

- [ ] **Step 8: Commit the baseline**

On the no-go path, first update `e2e/perf.spec.js:113-116` (`Orbit_Budget_Above50Fps`): the comment's first line becomes `// Known gap (checklist D, <routed leaf>): about 42.5 fps on the Traval mock; S4.6 measured getComputedStyle off the critical path.` and the `test.fail` message becomes `'orbit budget not met yet: <routed leaf> is open'`, with `<routed leaf>` from Step 7 (e.g. `S4.7`). On the go path, leave the test for Task 6.

```bash
npm test
git add bench/results docs/reports/bench-history e2e/perf.spec.js
git commit -m "test(perf): record S4.6 orbit baseline and computed-style upper bounds (S4.6 Task 2)"
```

---

### Task 3: Pure memo `styleCache`

**Files:**
- Modify: `lib/layers-core.js` (function after the closing `}` of `movedSince`, line ~510; export after `movedSince: movedSince,` at line ~1215)
- Test: `test/layers-core.test.js` (new `describe` after the `ViewCuller` block, before `describe('MovedSince'` at line ~1271)

**Interfaces:**
- Consumes: nothing.
- Produces: `LayersCore.styleCache(read) → { of(el), bump() }`. `read(el)` returns a live object (a declaration in the app); `of(el)` returns a proxy over it that memoizes property reads and `getPropertyValue(name)` for the current generation; `bump()` starts a new generation.

- [ ] **Step 1: Write the failing test**

```js
describe('StyleCache', () => {
  // Fake live declaration: camelCase getters and getPropertyValue count every read, like the
  // CSSStyleDeclaration getComputedStyle returns.
  const decl = (vals, vars = {}) => {
    const reads = {};
    const hit = (k) => (reads[k] = (reads[k] || 0) + 1);
    const d = { getPropertyValue: (n) => (hit(n), vars[n] || '') };
    for (const k of Object.keys(vals)) Object.defineProperty(d, k, { get: () => (hit(k), vals[k]) });
    return { d, reads, vals, vars };
  };
  const setup = () => {
    const live = new Map();
    let calls = 0;
    const cache = core.styleCache((el) => (calls++, live.get(el).d));
    return { live, cache, calls: () => calls };
  };

  it('MesmaGeracao_LeDeclaracaoUmaVezPorElemento', () => {
    const { live, cache, calls } = setup();
    const el = {};
    live.set(el, decl({ color: 'rgb(1, 2, 3)' }));
    expect(cache.of(el)).toBe(cache.of(el));
    expect(calls()).toBe(1);
  });

  it('MesmaGeracao_LeCadaPropriedadeUmaVez', () => {
    const { live, cache } = setup();
    const el = {};
    const f = decl({ color: 'rgb(1, 2, 3)', paddingTop: '4px' });
    live.set(el, f);
    const p = cache.of(el);
    expect([p.color, p.color, p.paddingTop, cache.of(el).color]).toEqual(['rgb(1, 2, 3)', 'rgb(1, 2, 3)', '4px', 'rgb(1, 2, 3)']);
    expect(f.reads).toEqual({ color: 1, paddingTop: 1 });
  });

  it('SemBump_MantemValorLido', () => {
    const { live, cache } = setup();
    const el = {};
    const f = decl({ color: 'rgb(1, 2, 3)' });
    live.set(el, f);
    expect(cache.of(el).color).toBe('rgb(1, 2, 3)');
    f.vals.color = 'rgb(4, 5, 6)';
    expect(cache.of(el).color).toBe('rgb(1, 2, 3)');
  });

  it('Bump_LeValorAtual', () => {
    const { live, cache, calls } = setup();
    const el = {};
    const f = decl({ color: 'rgb(1, 2, 3)' });
    live.set(el, f);
    expect(cache.of(el).color).toBe('rgb(1, 2, 3)');
    f.vals.color = 'rgb(4, 5, 6)';
    cache.bump();
    expect(cache.of(el).color).toBe('rgb(4, 5, 6)');
    expect(calls()).toBe(2);
  });

  it('ElementosDistintos_MemosSeparados', () => {
    const { live, cache } = setup();
    const a = {}, b = {};
    live.set(a, decl({ color: 'rgb(1, 2, 3)' }));
    live.set(b, decl({ color: 'rgb(4, 5, 6)' }));
    expect([cache.of(a).color, cache.of(b).color]).toEqual(['rgb(1, 2, 3)', 'rgb(4, 5, 6)']);
  });

  it('PropriedadeCustomizada_GetPropertyValueMemoizado', () => {
    const { live, cache } = setup();
    const el = {};
    const f = decl({}, { '--acc': ' #ff0000' });
    live.set(el, f);
    const p = cache.of(el);
    expect([p.getPropertyValue('--acc'), p.getPropertyValue('--acc'), p.getPropertyValue('--none')]).toEqual([' #ff0000', ' #ff0000', '']);
    expect(f.reads).toEqual({ '--acc': 1, '--none': 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/layers-core.test.js -t StyleCache`
Expected: FAIL with `core.styleCache is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `lib/layers-core.js`, after the closing `}` of `movedSince` (anchor `function movedSince(written, current) {` matches once; insert after the end of that function):

```js

  // Per-element memo of computed-style reads, valid for one generation. read(el) returns the live
  // declaration (getComputedStyle in the app); of(el) returns a proxy that reads each property, and
  // each getPropertyValue(name), once per generation. bump() drops every memo at once: inheritance,
  // relative units and sibling selectors make any mutation non-local, so there is no per-element
  // invalidation. Keyed by Element (WeakMap) and lazy, so a virtualized consumer reads only what it shows.
  // Only property reads and getPropertyValue are memoized; other methods would come back unbound.
  function styleCache(read) {
    var memo = new WeakMap(), gen = 0;
    return {
      bump: function () { gen++; },
      of: function (el) {
        var e = memo.get(el);
        if (e && e.gen === gen) return e.p;
        var live = read(el), vals = Object.create(null), vars = Object.create(null);
        var gpv = function (n) { return n in vars ? vars[n] : (vars[n] = live.getPropertyValue(n)); };
        var p = new Proxy(live, {
          get: function (t, k) {
            if (k === 'getPropertyValue') return gpv;
            if (typeof k !== 'string') return t[k];
            return k in vals ? vals[k] : (vals[k] = t[k]);
          }
        });
        memo.set(el, { gen: gen, p: p });
        return p;
      }
    };
  }
```

In the `api` object, after `movedSince: movedSince,`:

```js
    styleCache: styleCache,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all suites, `StyleCache` 6 tests included).

- [ ] **Step 5: Commit**

```bash
git add lib/layers-core.js test/layers-core.test.js
git commit -m "feat(core): add styleCache per-element computed-style memo (S4.6 Task 3)"
```

---

### Task 4: Cache correctness e2e, red first

**Files:**
- Create: `e2e/style-cache.spec.js`

**Interfaces:**
- Consumes: `instrument`, `waitForScan`, `orbitDrag` (with `gcsCalls`, Task 2). Runs **before** Task 5 against the develop behaviour of `index.html`.
- Produces: the red test that Task 5 turns green; proof that a mutation outside the app between two drags shows up in the second drag.

- [ ] **Step 1: Write the spec**

```js
import { test, expect } from '@playwright/test';
import { instrument, waitForScan, orbitDrag } from './perf-helpers.js';

// S4.6: while the camera is dragged, renderVals reads the selected node's computed style through
// LayersCore.styleCache (one live declaration per drag); a bump at every drag start keeps a change
// made outside the app (theme, font load, transition) from leaking a stale value into the next drag.

// Text field of the "Fundo" (backgroundColor) row in the properties panel (locator as in undo-redo.spec.js).
const fundo = (page) =>
  page.locator('xpath=//*[normalize-space(text())="Fundo"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

// Mock root (selected by default, id '0') inside the off-screen shadow root.
const mockRoot = () => {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  return [...host.shadowRoot.children].find((e) => e.localName !== 'style');
};

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

// Holds an orbit drag (crossing onMove's 3 px threshold) and returns the panel value read mid-drag.
async function valueDuringDrag(page) {
  const c = await stageCentre(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 8, c.y);
  await page.mouse.move(c.x + 60, c.y + 40, { steps: 5 });
  await frames(page);
  const v = await fundo(page).inputValue();
  await page.mouse.up();
  await frames(page);
  return v;
}

test('StyleCache_Drag_NoLiveReadsAfterFirstRender', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  const o = await orbitDrag(page, 1500);
  expect(o.frames).toBeGreaterThanOrEqual(30);
  // the first drag render misses; one more is tolerated for a render between mousedown and the 3 px threshold
  expect(o.gcsCalls, 'live declarations per drag').toBeLessThanOrEqual(2);
});

test('StyleCache_MutationBetweenDrags_SecondDragShowsLive', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  await expect(page.locator('xpath=//*[normalize-space(text())="Fundo"]')).toHaveCount(1);
  const inline = await page.evaluate(`(${mockRoot})().style.backgroundColor`);
  expect(inline, 'the row must come from computed style, not inline').toBe('');
  const live0 = await page.evaluate(`getComputedStyle((${mockRoot})()).backgroundColor`);
  expect(await valueDuringDrag(page)).toBe(live0);
  // change the computed value without inline style and without any app path (no scanSoon)
  await page.evaluate(`(() => { const r = (${mockRoot})(); const st = document.createElement('style');
    st.textContent = '.s46-probe{background-color:rgb(1, 2, 3) !important}'; r.getRootNode().appendChild(st); r.classList.add('s46-probe'); })()`);
  expect(await valueDuringDrag(page), 'second drag must not reuse the first drag memo').toBe('rgb(1, 2, 3)');
});
```

`gcsCalls` counts from mousedown to just before mouseup (Task 2). The `instrument` wrapper does not change returned values, so the second test can use it for the deterministic `waitForScan`.

- [ ] **Step 2: Run it red against the develop behaviour**

Run (E2E wrapper): `npx playwright test --project=chromium e2e/style-cache.spec.js`
Expected: `StyleCache_Drag_NoLiveReadsAfterFirstRender` FAILS on `live declarations per drag` (develop reads live on every drag render, so `gcsCalls` is about the render count); `StyleCache_MutationBetweenDrags_SecondDragShowsLive` PASSES (live reads cannot be stale). If the `Fundo` row count is not 1 (group closed or label reused), fix the locator, never the assertion.

- [ ] **Step 3: Commit the red spec**

```bash
git add e2e/style-cache.spec.js
git commit -m "test(e2e): specify one live style read per drag and no memo leak across drags (S4.6 Task 4)"
```

`npm test` (Vitest) does not collect `e2e/`, so the commit gate still passes with the red e2e.

---

### Task 5: Read the panel's computed style through the cache while dragging

**Files:**
- Modify: `index.html:1456` (class fields), `index.html:1555` (`scanSoon`), `index.html:2013` (`renderVals`), `index.html:2284` (`onDown`); `index.html:2196` only under Step 5

**Interfaces:**
- Consumes: `LayersCore.styleCache` (Task 3); the red spec (Task 4).
- Produces: `this.styles` (one cache per app instance); during a drag `renderVals()` performs one `getComputedStyle` call and one live read per property for the selected element.

- [ ] **Step 1: Check the anchors and the members `renderVals()` uses**

```bash
grep -c "raf = 0; mv = null;" index.html
grep -c "scanSoon() { clearTimeout(this.scanT);" index.html
grep -c "const el = this.els\[s.selId\]; const cs = el ? getComputedStyle(el) : null;" index.html
grep -c "mode }; this.dragged = false; }," index.html
awk 'NR>=2010 && NR<=2292' index.html | grep -o "\bcs\.[a-zA-Z]*\|\bcs\[" | sort | uniq -c
```

Expected: `1`, `1`, `1`, `1`; then exactly `2 cs.boxSizing`, `1 cs.getPropertyValue`, `3 cs[` (`:2030`, `:2112`, `:2194`). Any other member means the proxy contract (Review Focus) must be revisited before editing: stop and report. After S3.2 the `awk` range may need to shift with `renderVals()`: locate it with `grep -n "renderVals() {" index.html`.

- [ ] **Step 2: Create the cache**

`index.html:1456` — replace `raf = 0; mv = null;` with:

```js
raf = 0; mv = null; styles = LayersCore.styleCache(el => getComputedStyle(el)); // computed-style memo, read only while dragging (S4.6)
```

`getComputedStyle` is resolved at call time, so the perf harness wrapper still sees every live call.

- [ ] **Step 3: Bump on every mutation and at every drag start**

`index.html:1555` — replace `scanSoon() { clearTimeout(this.scanT);` with:

```js
scanSoon() { this.styles.bump(); clearTimeout(this.scanT);
```

`index.html:2284` — replace `mode }; this.dragged = false; },` with:

```js
mode }; this.dragged = false; this.styles.bump(); },
```

- [ ] **Step 4: Read through the cache while dragging**

`index.html:2013` — replace `const el = this.els[s.selId]; const cs = el ? getComputedStyle(el) : null;` with:

```js
const el = this.els[s.selId]; const cs = el ? (s.dragging ? this.styles.of(el) : getComputedStyle(el)) : null; // S4.6: one live read per drag
```

- [ ] **Step 5: Box-model client size (only if Task 2 Step 7 put it in scope)**

`styleCache` proxies any object, so a second instance over the element itself memoizes `clientWidth`/`clientHeight` under the same drag invariant. Anchor check: `grep -c "const bmCW = el ? Math.round(el.clientWidth - bmF('paddingLeft') - bmF('paddingRight')) : 0, bmCH = el ? Math.round(el.clientHeight -" index.html` → `1`.
- Step 2 line: append ` boxes = LayersCore.styleCache(el => el);` after the `styles = …;` field (before the comment).
- Step 3 sites: `this.styles.bump();` becomes `this.styles.bump(); this.boxes.bump();` in both.
- `index.html:2196`: replace `el.clientWidth` with `(s.dragging ? this.boxes.of(el) : el).clientWidth` and `el.clientHeight` with `(s.dragging ? this.boxes.of(el) : el).clientHeight`.

Skipped otherwise; record the skip in the report.

- [ ] **Step 6: Verify green and no regression**

Run: `npm test` — Expected: PASS.
Run (E2E wrapper): `npx playwright test --project=chromium e2e/style-cache.spec.js` — Expected: PASS (2 tests).
Run (E2E wrapper): `npx playwright test --project=chromium e2e/undo-redo.spec.js e2e/scope-all-equal.spec.js e2e/apply-flow.spec.js e2e/manual-marker.spec.js e2e/viewport-culling.spec.js e2e/tree-snapshot.spec.js` — Expected: PASS (no drag in the edit specs, so every panel read stays live; culling unaffected).

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "perf(panel): read the selected node's computed style once per drag (S4.6 Task 5)"
```

- [ ] **Step 8: Regression proof (temporary edits on the committed state)**

1. Remove `this.styles.bump(); ` from `onDown` in `index.html`, run (E2E wrapper) `npx playwright test --project=chromium e2e/style-cache.spec.js`. Expected: FAIL on `second drag must not reuse the first drag memo` (received the `live0` value). Restore with `git checkout -- index.html`.
2. Replace `s.dragging ? this.styles.of(el) : getComputedStyle(el)` with `getComputedStyle(el)`, run the spec. Expected: FAIL on `live declarations per drag`. Restore with `git checkout -- index.html`.

Expected after both: `git status --porcelain index.html` prints nothing.

---

### Task 6: After-measure and perf acceptance gate

**Files:**
- Modify: `e2e/perf.spec.js` (`Orbit_Budget_Above50Fps`)
- Create: `bench/results/<ts>-layers-ui.bench.json` ×3

**Interfaces:**
- Consumes: Tasks 2-5 committed; the Task 2 baseline table and routing; no `develop` merge since Task 2 Step 5.
- Produces: after medians and the gate verdict for Task 7.

- [ ] **Step 1: Run on a clean tree** (Mechanical)

Run the three measured runs with the **clean-tree perf procedure** (Global Constraints), then the Task 2 **median table command**. Expected: `dirty false,false,false` and seven rows. Report the raw `exit_code` of each run and the table.

- [ ] **Step 2: Apply the acceptance gate (measured, medians of 3, same `env`)**

| Gate | Metric | Pass when |
|---|---|---|
| G1 mechanism | `orbit/traval` `gcs/f` | ≤ 0.05 (baseline: Task 2 table) |
| G2 benefit | `orbit/traval` mean-frame | ≤ 0.95 × baseline **and** ≤ 1.05 × the Task 2 ideal that matches the scope (`gcs-ideal`, or `panel-ideal` when Task 5 Step 5 ran) |
| G3 orbit tail | `orbit/traval` p95 | ≤ baseline + 1 ms (frame intervals are quantized to vsync) |
| G4 no regression | `orbit/traval-zoom`, `explode/traval/toggle-ms` | ≤ 1.10 × baseline |
| G5 scan untouched | `load/traval/first-scan-ms`, `scan/1500-tags-ms` | ≤ 1.25 × baseline (scan noise 20-35 %) and `gcsCalls` unchanged (416 and ≤ tags + 20) |

Any failing gate: stop and report the table. Never loosen a threshold in-task.

- [ ] **Step 3: Settle the budget test**

- If `Orbit_Budget_Above50Fps` is reported as "expected to fail, but passed" in all three runs: delete the `test.fail(true, ...)` line and the 3-line comment above it.
- Otherwise keep `test.fail`, and change only the comment's number line to `// Known gap (checklist D, <routed leaf>): about <after fps> fps on the Traval mock after S4.6.` and the `test.fail` message to `'orbit budget not met yet: <routed leaf> is open'`, with `<routed leaf>` from Task 2 Step 7.

- [ ] **Step 4: Ingest and commit**

```bash
python ~/.claude/hooks/bench-history-cli.py ingest --repo .
python ~/.claude/hooks/bench-history-cli.py render --repo .
git add e2e/perf.spec.js bench/results docs/reports/bench-history
git commit -m "test(perf): record S4.6 after-measure and update orbit budget gap (S4.6 Task 6)"
```

When the budget test changed, run (E2E wrapper) `npx playwright test --project=chromium e2e/perf.spec.js` once more to confirm the new expectation, and delete that run's result file.

---

### Task 7: Docs and changelog

**Files:**
- Modify: `docs/ARCHITECTURE.md:54` (new row after `scan()` / `walk()`, go path only), `docs/ARCHITECTURE.md:125`, `docs/RELEASE-CHECKLIST.md:44`, `docs/RELEASE-CHECKLIST.md:46` (counter at `docs/RELEASE-CHECKLIST.md:8` left to the integration recount)
- Create: `changelog.d/feature-261014-0-s4-6-computed-style-cache.md`

**Interfaces:**
- Consumes: Task 2 table and routing (`<b-*>` baseline, `<i-*>` gcs-ideal, `<p-*>` panel-ideal), Task 6 table (`<a-*>` after) and Step 3 outcome; on the no-go path only the Task 2 table.
- Produces: docs consistent with the outcome; the roadmap row closes later in `phase-close-gate`.

- [ ] **Step 1: Resolve the variable text** (7.1, Workhorse)

From the tables, the routing and the gate outcome, write out the texts below with no `<…>` left, and hand them to Steps 2-5 verbatim; Steps 2-5 make no judgment. Mention `clientWidth`/`clientHeight` only if Task 5 Step 5 ran; otherwise the texts say "o cache".

| Text | Go path (Tasks 3-6 done) | No-go path ([!DECISION] `go-no-go` Option A) |
|---|---|---|
| `RELEASE-CHECKLIST.md:44` | `- [x] Cache de \`getComputedStyle\` por nó, invalidado em change: o painel de propriedades lê o estilo computado do selecionado uma vez por arrasto (\`LayersCore.styleCache\`, S4.6; geração invalidada no início do arrasto e em \`scanSoon()\`; \`e2e/style-cache.spec.js\`). Os planos já pintam do snapshot por nó do \`scan()\`.` | unchanged (`[ ]`) until the human signs off the numbers; then `- [~] Cache de \`getComputedStyle\` por nó: medido na S4.6 fora do caminho crítico do orbit (limite superior com toda leitura memoizada: <i-ms> ms/frame contra <b-ms> ms/frame de base, mediana de 3); cache não implementado. Os planos já pintam do snapshot por nó do \`scan()\`.` |
| `RELEASE-CHECKLIST.md:46` | replace `orbit com input real ~42,5 fps no Traval após o culling da S4.5 (23,5 ms/frame, p95 50 ms; antes ~40 fps), abaixo dos 50 fps — orçamento ainda não cumprido (S4.6–S4.7)` with `orbit com input real ~<a-fps> fps no Traval após a S4.6 (<a-ms> ms/frame, p95 <a-p95> ms; antes ~<b-fps> fps)` + `, abaixo dos 50 fps — orçamento ainda não cumprido (<routed leaf>)` or `, dentro do orçamento` (partial becomes done only if scan and orbit both pass) | only the routing at the end: `(S4.6–S4.7)` → `(<routed leaf>)` |
| `ARCHITECTURE.md:125` | replace `Próximo passo: cache de \`getComputedStyle\` (S4.6), árvore virtualizada (S4.7) e agrupamento de folhas.` with `Leitura do estilo computado do painel memoizada durante o arrasto (S4.6). Próximo passo: <routed leaf and title>, árvore virtualizada (S4.7) e agrupamento de folhas.` (drop duplicates when the routed leaf is S4.7) | replace the same sentence with `Leitura do estilo computado medida fora do caminho crítico do orbit (S4.6, sem cache). Próximo passo: <routed leaf and title>, árvore virtualizada (S4.7) e agrupamento de folhas.` (drop duplicates) |
| `### Perf` bullets | before → after and ideal (Step 4 template) | baseline and ideal only: `- measured — orbit Traval, vista padrão: <b-fps> fps (<b-ms> ms/frame, p95 <b-p95> ms); limite superior com toda leitura de estilo memoizada: <i-ms> ms/frame (painel inteiro: <p-ms> ms/frame); mediana de 3 execuções, Chromium <ver>, i7-12700.` and `- measured — main thread por frame no orbit padrão: task <b-task> ms, script <b-script> ms, style <b-style> ms, layout <b-layout> ms, outros <b-other> ms; lacuna encaminhada para <routed leaf>.` |

- [ ] **Step 2: ARCHITECTURE** (7.2, Executor)

Go path only — after the `| \`scan()\` / \`walk()\` | …` row (`docs/ARCHITECTURE.md:54`) insert:

```md
| `this.styles` (`LayersCore.styleCache`) | Memo de estilo computado por elemento, válido por uma geração. O painel de propriedades lê o nó selecionado por ele só durante o arrasto da câmera (uma leitura viva por arrasto); `bump()` no início de cada arrasto e em `scanSoon()`. |
```

Both paths — `docs/ARCHITECTURE.md:125`: the Step 1 text.

- [ ] **Step 3: Checklist** (7.2, Executor)

`docs/RELEASE-CHECKLIST.md:44` and `:46`: the Step 1 texts. The `Hoje:` counter at `docs/RELEASE-CHECKLIST.md:8` is not touched: counter left to the integration recount.

- [ ] **Step 4: Changelog fragment** (7.2, Executor)

Create `changelog.d/feature-261014-0-s4-6-computed-style-cache.md` with the Step 1 `### Perf` bullets (no placeholder may remain). Go path:

```md
---
adr: none
---

### Added
- Cache de estilo computado por elemento (`LayersCore.styleCache`, puro e testado): durante o arrasto da câmera o painel de propriedades lê o estilo computado do nó selecionado uma vez por arrasto em vez de a cada render; geração invalidada no início de cada arrasto e em `scanSoon()`.
- `e2e/style-cache.spec.js`: nenhuma leitura viva depois do primeiro render do arrasto; mudança feita fora do app entre dois arrastos aparece no segundo.
- `e2e/perf.spec.js`: tempo de main thread por frame (task, script, style, layout via CDP), chamadas de `getComputedStyle` por frame e os limites superiores `orbit/traval-gcs-ideal/mean-frame-ms` e `orbit/traval-panel-ideal/mean-frame-ms`.

### Perf
- measured — orbit Traval, vista padrão: <b-fps> → <a-fps> fps (<b-ms> → <a-ms> ms/frame, p95 <b-p95> → <a-p95> ms); limite superior com toda leitura memoizada: <i-ms> ms/frame; mediana de 3 execuções, Chromium <ver>, i7-12700.
- measured — main thread por frame no orbit padrão: script <b-script> → <a-script> ms, style <b-style> → <a-style> ms, layout <b-layout> → <a-layout> ms, outros <b-other> → <a-other> ms; `getComputedStyle` por frame <b-gcs> → <a-gcs>.
```

No-go path: same front matter; `### Added` keeps only the `e2e/perf.spec.js` bullet; `### Perf` holds the two no-go bullets from Step 1.

- [ ] **Step 5: Verify and commit** (7.2, Executor)

Run: `npm test` — Expected: PASS. Run: `grep -n "<[a-z]" changelog.d/feature-261014-0-s4-6-computed-style-cache.md` — Expected: no output.

```bash
git add docs/ARCHITECTURE.md docs/RELEASE-CHECKLIST.md changelog.d/feature-261014-0-s4-6-computed-style-cache.md
git commit -m "docs: close S4.6 with changelog fragment, checklist and architecture note (S4.6 Task 7)"
```

On the no-go path, leave `docs/RELEASE-CHECKLIST.md:44` out of this commit until the human signs off; it then lands as its own `docs:` commit with the same suffix.

---

## Self-Review

| Requirement | Task |
|---|---|
| Every `getComputedStyle` site listed with line and verdict; full read inventory | Context table |
| Tracker first: S4.4b registered, S4.6 started before the plan commits | 1 Step 0, 0 |
| Baseline first, existing harness, median of 3, clean tree, same fixture | 2, Global Constraints |
| Upper bounds decide whether the cache can matter (go/no-go); breakdown routes the gap | 2 Steps 7-8 |
| Harness flake fixed before the 6 measured runs, on its own leaf | 1, [!DECISION] `flake-leaf` |
| Cache key, storage, invalidation, memory bound | Design, 3 |
| Stale values after edits, inherited properties, pseudo-states | Review Focus risk table, 4 (red spec), 5 (bumps, regression proof) |
| Cache API does not block S4.7 | Design § S4.7 constraint |
| Pure helper + Vitest TDD; e2e red before the wiring | 3, 4 → 5 |
| `index.html` via unique anchors with match counts; S3.2 conflict accepted | 5 Step 1, Context |
| Explicit measured acceptance gate | 6 Step 2 |
| Budget test flipped or comment updated, on both paths | 2 Step 8, 6 Step 3 |
| ARCHITECTURE, checklist D (counter untouched, no `[x]` on no-go), changelog `### Perf` measured | 7 |

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 0. Start S4.6 in the tracker, cherry-pick the plan | gen | Standard | Workhorse | branch lifecycle with tracker rebuild |
| 1. S4.4b: tracker row, `waitForScan` fix + reproduction | gen | Standard | Workhorse | test-harness fix with a red-first reproduction |
| S4.4b pre-merge review | review | Architectural | Architect | `adversarial-reviewer` |
| 2 Steps 1-4, Step 5 up to the commit. Breakdown, upper-bound stubs, spec | gen | Standard | Workhorse | test authoring; code given verbatim |
| 2 Step 5 three clean runs, Step 6 median table + ingest | gen | Mechanical | Executor | run-and-summarize with the clean-tree procedure; caller validates `exit_code`, `dirty false,false,false`, seven rows |
| 2 Steps 7-8. Go/no-go, routing, budget comment | gen | Standard | Workhorse | perf judgment; stops for the human when the gate fails |
| 3. `styleCache` + unit tests | gen | Standard | Workhorse | code and tests given verbatim |
| 4. Correctness e2e, red | gen | Standard | Workhorse | test authoring |
| 5. `index.html` wiring, green, regression proof | gen | Standard | Workhorse | hot-path edit with exact anchors |
| 3, 5. Design review (proxy contract, bump placement, drag scope, S4.7 constraint) | review | Architectural | Architect | hot path, rule 5; via `adversarial-reviewer`, after Task 5 and before Task 6 |
| 6 Step 1. Three perf runs + median table | gen | Mechanical | Executor | run-and-summarize; caller validates `exit_code`, `dirty false,false,false`, table |
| 6 Steps 2-4. Gate, budget test, ingest | gen | Standard | Workhorse | perf judgment |
| 7.1 (Step 1). Resolve checklist wording, routing and Perf numbers | gen | Standard | Workhorse | judgment on the outcome |
| 7.2 (Steps 2-5). Write docs and changelog verbatim, verify, commit | gen | Mechanical | Executor | text given verbatim by 7.1; caller validates no `<…>` left, numbers match the tables, `exit_code` |
| S4.6 pre-merge review | review | Architectural | Architect | verifier ≥ generator; `adversarial-reviewer` |

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** (settled). One leaf on an already tracked roadmap row (S4.6) and checklist D item, with a committed plan and a PR as the review surface; same handling as S4.5. S4.4b is a micro leaf with its own PR.

> [!DECISION] phase-intake
> Classification: **meso** `S4.6` under **S4 Performance**, target **Unreleased** (v1 gate: checklist D). **Settled: Option A.**
> Current tree (relevant slice): S4 Performance (in-progress) › S4.1-S4.5 done, S4.4a done › S4.4b `waitForScan` (new micro leaf, level 3 under S4.4) › S4.6 getComputedStyle cache (registered) › S4.7 virtual tree (registered); possibly a new plane-cost leaf from Task 2 Step 7.
> Fork of an existing row? **No** for S4.6; **yes** for S4.4b, registered in Task 1 Step 0 before any code.
> - **Option A**: keep S4.6 as is (recommended)
> - **Option B**: if the Task 2 go/no-go fails, apply [!DECISION] `go-no-go`

> [!DECISION] execution
> Method: **Subagent-driven** (settled), strictly sequential. Merge order S5.7 → S4.4b → S3.2 → S4.6. On the S4.6 branch: 0 → 2 (gate) → 3 → 4 (red) → 5 (green) → review → 6 → 7. Task 3 starts only after the Task 2 go/no-go passes. No `develop` merge between Task 2 Step 5 and Task 6 Step 1. Mechanical steps (2 Steps 5-6 runs, 6 Step 1, 7.2) go to the `executor` subagent. Thresholds kept: 10 % go, 5 % acceptance (50 fps alone needs ≥ 15 %).
