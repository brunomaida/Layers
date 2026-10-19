import { test, expect } from '@playwright/test';
import { instrument, waitForScan, orbitDrag, writeBench, planeCensus, zoomIn, memoComputedStyle, memoClientBox, markScene, hidePlanes, setWireAlpha, countPlaneHovers, groupPlanesByZ, ungroupPlanesByZ, countCompositedLayers, reapplyMarks } from './perf-helpers.js';
import { inflateTraval, treeMode, noPlaneHits, countHoverSwaps, rowInputCost, scrollFrames } from './tree-perf-helpers.js';
import { act, goFlat } from './ctx-helpers.js';
import { connectEntries } from './folder-helpers.js';
import { coverageHtml } from '../bench/workloads.js';

const EXPECTED = [
  'load/traval/first-scan-ms',
  'load/traval/first-scan-end-ms',
  'scan/1500-tags-ms',
  'orbit/traval/mean-frame-ms',
  'orbit/traval-gcs-ideal/mean-frame-ms',
  'orbit/traval-panel-ideal/mean-frame-ms',
  'orbit/traval-v1-no-hit/mean-frame-ms',
  'orbit/traval-v2a-planes-no-will-change/mean-frame-ms',
  'orbit/traval-v2b-world-no-will-change/mean-frame-ms',
  'orbit/traval-wire-off/mean-frame-ms',
  'orbit/traval-v3-empty-hidden/mean-frame-ms',
  'orbit/traval-v4-half-hidden/mean-frame-ms',
  'orbit/traval-aa/mean-frame-ms',
  'orbit/traval-s49-g1-group-z/mean-frame-ms',
  'orbit/traval-s49-g2-group-z-no-contain/mean-frame-ms',
  'orbit/traval-s49-aa/mean-frame-ms',
  'orbit/traval-zoom/mean-frame-ms',
  'orbit/traval-zoom-ideal/mean-frame-ms',
  'orbit/traval-tree-closed/mean-frame-ms',
  'orbit/traval-tree-ideal/mean-frame-ms',
  'orbit/traval-v1/mean-frame-ms',
  'orbit/traval-v1-tree-ideal/mean-frame-ms',
  'orbit/1500-tags/mean-frame-ms',
  'orbit/1500-tags-tree-closed/mean-frame-ms',
  'orbit/1500-tags-tree-ideal/mean-frame-ms',
  'orbit/1500-tags-v1/mean-frame-ms',
  'orbit/1500-tags-v1-tree-ideal/mean-frame-ms',
  'orbit/1500-tags-flat/mean-frame-ms',
  'orbit/1500-tags-branch-exploded/mean-frame-ms',
  'tree/traval/hover-ms',
  'tree/traval/select-ms',
  'tree/1500-tags/hover-ms',
  'tree/1500-tags/select-ms',
  'tree/1500-tags/scroll-frame-ms',
  'explode/traval/toggle-ms',
  'layout-switch/multi-layout-1500/switch-ms',
  'layout-switch/multi-layout-1500/reload-ms',
  'coverage/analyze-200-html-1500-tags/analyze-ms',
];
const results = [];
let runtime = 'chromium';
let orbit = null;
const rec = (benchId, value, extra = {}) => results.push({ benchId, unit: 'ms', value, stddev: 0, extra });

test.beforeAll(async ({ browser }) => {
  runtime = `chromium ${browser.version()} (playwright)`;
});

test('Load_TravalFixture_ReportsFirstScan', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  const scan = await waitForScan(page);
  rec('load/traval/first-scan-ms', scan.ms, { gcsCalls: scan.nodes });
  rec('load/traval/first-scan-end-ms', scan.endMs);
  expect(scan.nodes).toBeGreaterThan(100);
});

test('Scan_1500Tags_UnderBudget', async ({ page }) => {
  await instrument(page);
  // Replicate the real Traval mock body until it has ~1,500 tags; nothing new is committed.
  // The metric is the scan's getComputedStyle burst (one call per scanned node, plus a few others).
  let totalTags = 0;
  await page.route('**/fixtures/traval/layers/mock.html', async (route) => {
    const res = await route.fetch();
    const html = await res.text();
    const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (!m) throw new Error('traval mock has no <body>');
    const perCopy = (m[1].match(/<[a-z][^>]*>/gi) || []).length;
    const copies = Math.max(1, Math.ceil(1500 / perCopy));
    totalTags = perCopy * copies;
    await route.fulfill({ body: html.replace(m[1], m[1].repeat(copies)), contentType: 'text/html' });
  });
  await page.goto('/?layers=fixtures/traval/');
  const scan = await waitForScan(page, 1000, 40_000);
  rec('scan/1500-tags-ms', scan.ms, { gcsCalls: scan.nodes, tags: totalTags });
  expect(scan.nodes).toBeGreaterThanOrEqual(1000);
  // a merged double scan would show up as roughly twice the tag count
  expect(scan.nodes, 'getComputedStyle calls vs tags').toBeLessThanOrEqual(totalTags + 20);
  expect(scan.ms, `scan burst of ${scan.nodes} getComputedStyle calls`).toBeLessThan(300);
});

test('Orbit_Drag_RecordsFrameInterval', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  const census = await planeCensus(page);
  orbit = await orbitDrag(page, 1500);
  rec('orbit/traval/mean-frame-ms', orbit.meanFrameMs, {
    fps: orbit.fps,
    p95FrameMs: orbit.p95FrameMs,
    frames: orbit.frames,
    loafCount: orbit.loafCount,
    loafScriptShare: orbit.loafScriptShare,
    gcsPerFrame: orbit.gcsPerFrame,
    main: orbit.main,
    census,
  });
  expect(orbit.frames).toBeGreaterThanOrEqual(30);
});

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

// S4.8 diagnosis, no app change: each variant overrides the scene before the drag. wire-off is the control
// for V3 (V3 compares against it, not against orbit/traval); V4 only checks that plane cost is linear.
// aa is a plain orbit run last: its delta against orbit/traval is the order bias of this fixed sequence.
// S4.9: an app with data-plane groups the planes at the first drag move (remount), which drops per-node marks:
// the css targets [data-plane] / the groups as well, and the hide variants re-apply their marks by plane id
// in the first-move hook (reapplyMarks) and count `hidden` after it, so they work on the base sha and later.
for (const [name, id, v] of [
  ['Orbit_NoHitTest_RecordsFrameInterval', 'orbit/traval-v1-no-hit/mean-frame-ms', { css: '[data-s48-plane],[data-plane]{pointer-events:none!important}', noHit: true }],
  ['Orbit_PlanesNoWillChange_RecordsFrameInterval', 'orbit/traval-v2a-planes-no-will-change/mean-frame-ms', { css: '[data-s48-plane],[data-plane-group]{will-change:auto!important}' }],
  ['Orbit_WorldNoWillChange_RecordsFrameInterval', 'orbit/traval-v2b-world-no-will-change/mean-frame-ms', { css: '[data-s48-world]{will-change:auto!important}' }],
  ['Orbit_WireOff_RecordsFrameInterval', 'orbit/traval-wire-off/mean-frame-ms', { wireOff: true }],
  ['Orbit_WireOffEmptyHidden_RecordsFrameInterval', 'orbit/traval-v3-empty-hidden/mean-frame-ms', { wireOff: true, hide: 'empty' }],
  ['Orbit_HalfHidden_RecordsFrameInterval', 'orbit/traval-v4-half-hidden/mean-frame-ms', { hide: 'odd' }],
  ['Orbit_AA_RecordsFrameInterval', 'orbit/traval-aa/mean-frame-ms', {}],
]) {
  test(name, async ({ page }) => {
    await instrument(page);
    await page.goto('/?layers=fixtures/traval/');
    await waitForScan(page);
    if (v.wireOff) await setWireAlpha(page, 0);
    await markScene(page);
    const census = await planeCensus(page);
    let hidden = v.hide ? await hidePlanes(page, v.hide) : 0;
    if (v.css) await page.addStyleTag({ content: v.css });
    const swaps = await countPlaneHovers(page);
    const o = await orbitDrag(page, 1500, v.hide ? { afterFirstMove: async () => (hidden = await reapplyMarks(page)) } : {});
    const hoverSwapsPerFrame = (await swaps()) / o.frames;
    rec(id, o.meanFrameMs, {
      fps: o.fps,
      p95FrameMs: o.p95FrameMs,
      frames: o.frames,
      loafCount: o.loafCount,
      loafScriptShare: o.loafScriptShare,
      gcsPerFrame: o.gcsPerFrame,
      main: o.main,
      hoverSwapsPerFrame,
      census,
      hidden,
    });
    expect(o.frames).toBeGreaterThanOrEqual(30);
    if (v.noHit) expect(hoverSwapsPerFrame, 'no plane hit-test: hoverId must not swap during the drag').toBeLessThanOrEqual(0.005);
    if (v.hide) expect(hidden, 'planes hidden by the stub').toBeGreaterThan(0);
  });
}

// S4.9 spike (informative, no guard): one throwaway page counts the composited layers around the regroup
// (CDP LayerTree adds work per layer change, so it never shares a page with a timed drag); then the timed
// drag regroups the planes by translateZ right after its first move. aa runs the same flow without the
// regroup. Each variant is paired with orbit/traval of the same execution (run Orbit_Drag together with
// Orbit_S49) and records dragStartMs, the largest of the 8 frames from the first move. dragStartMs of this
// manual regroup (one DOM move of ~400 nodes) does NOT predict the unmount/remount hitch of the real
// implementation, where React mounts and unmounts the planes: that one is measured in Task E5. The grouping is
// undone before mouseup so React's post-drag render only sees its own nodes; page errors fail the variant.
async function layerPass(context, v) {
  const p = await context.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && !/favicon\.ico$/.test(m.location().url) && errors.push(m.text()));
  try {
    await instrument(p);
    await p.goto('/?layers=fixtures/traval/');
    await waitForScan(p);
    const c = await p.evaluate(() => {
      const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) => getComputedStyle(el).backgroundImage.includes('radial-gradient'));
      const b = stage.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    });
    const moves = async (n) => {
      for (let k = 0; k < n; k++) await p.mouse.move(c.x + (k % 20) * 2, c.y + Math.sin(k / 4) * 20);
      await p.waitForTimeout(300);
    };
    await p.mouse.move(c.x, c.y);
    await p.mouse.down();
    await moves(6);
    const before = await countCompositedLayers(p);
    const group = v.group ? await groupPlanesByZ(p, { dropContain: v.dropContain, probe: true }) : null;
    await moves(6);
    // planes still overridden (computed transform none, will-change auto) after the drag renders
    const stillStripped = group
      ? await p.evaluate(() => [...document.querySelectorAll('[data-s49-plane]')].filter((e) => { const c = getComputedStyle(e); return c.transform === 'none' && c.willChange === 'auto'; }).length)
      : null;
    const after = await countCompositedLayers(p);
    await ungroupPlanesByZ(p);
    await p.mouse.up();
    await p.waitForTimeout(500);
    return { before, after, group, stillStripped, errors };
  } finally {
    await p.close();
  }
}

for (const [name, id, v] of [
  ['Orbit_S49G1GroupByZ_RecordsFrameInterval', 'orbit/traval-s49-g1-group-z/mean-frame-ms', { group: true, dropContain: false }],
  ['Orbit_S49G2GroupByZNoContain_RecordsFrameInterval', 'orbit/traval-s49-g2-group-z-no-contain/mean-frame-ms', { group: true, dropContain: true }],
  ['Orbit_S49AA_RecordsFrameInterval', 'orbit/traval-s49-aa/mean-frame-ms', { group: false }],
]) {
  test(name, async ({ page }) => {
    const layers = await layerPass(page.context(), v);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && !/favicon\.ico$/.test(m.location().url) && errors.push(m.text()));
    await instrument(page);
    await page.goto('/?layers=fixtures/traval/');
    await waitForScan(page);
    const census = await planeCensus(page);
    const swaps = await countPlaneHovers(page);
    let grouped = null;
    const o = await orbitDrag(page, 1500, {
      afterFirstMove: async () => {
        if (v.group) grouped = await groupPlanesByZ(page, { dropContain: v.dropContain });
        else await page.evaluate(() => 0); // same round trip as the regroup call
      },
      beforeUp: () => ungroupPlanesByZ(page), // A/A: only waits, same pause as the undo
    });
    await page.waitForTimeout(500); // post-drag render with the planes back under the page
    rec(id, o.meanFrameMs, {
      fps: o.fps,
      p95FrameMs: o.p95FrameMs,
      frames: o.frames,
      loafCount: o.loafCount,
      loafScriptShare: o.loafScriptShare,
      gcsPerFrame: o.gcsPerFrame,
      main: o.main,
      hoverSwapsPerFrame: (await swaps()) / o.frames,
      census,
      // true: the app groups the planes itself (S4.9 Task E4), so G1/G2 no longer simulate grouping and equal A/A
      native: await page.evaluate(() => !!document.querySelector('[data-plane]')),
      dragStartMs: o.dragStartMs,
      dragEndMs: o.dragEndMs,
      pairedWith: 'orbit/traval/mean-frame-ms',
      deltaVsOrbitMs: orbit ? o.meanFrameMs - orbit.meanFrameMs : null,
      layersBefore: layers.before.total,
      layersAfter: layers.after.total,
      layersDrawingBefore: layers.before.drawing,
      layersDrawingAfter: layers.after.drawing,
      layerEvents: [layers.before.events, layers.after.events],
      hitProbe: layers.group && layers.group.probe,
      stillStripped: layers.stillStripped,
      groups: grouped ? grouped.groups : layers.group && layers.group.groups,
      groupedPlanes: grouped ? grouped.planes : null,
      groupMs: grouped ? grouped.ms : null,
      pageErrors: errors.length + layers.errors.length,
    });
    expect(errors, 'page errors in the timed drag').toEqual([]);
    expect(layers.errors, 'page errors in the layer pass').toEqual([]);
    expect(o.frames).toBeGreaterThanOrEqual(30);
    if (v.group && !grouped.native) expect(grouped.groups, 'z groups created by the stub').toBeGreaterThan(0); // native: the app groups itself (Task E4)
  });
}

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
    gcsPerFrame: z.gcsPerFrame,
    main: z.main,
    zoomSteps: 12,
    census,
  });
  expect(z.frames).toBeGreaterThanOrEqual(30);
});

// Upper bound for the go/no-go: the planes off the grown stage before the drag are hidden by hand.
test('Orbit_ZoomedIdeal_RecordsFrameInterval', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  await zoomIn(page, 12);
  const census = await planeCensus(page, true);
  const z = await orbitDrag(page, 1500);
  rec('orbit/traval-zoom-ideal/mean-frame-ms', z.meanFrameMs, {
    fps: z.fps,
    p95FrameMs: z.p95FrameMs,
    frames: z.frames,
    loafCount: z.loafCount,
    loafScriptShare: z.loafScriptShare,
    gcsPerFrame: z.gcsPerFrame,
    main: z.main,
    zoomSteps: 12,
    census,
  });
  expect(z.frames).toBeGreaterThanOrEqual(30);
});

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
    const hoverSwapsPerFrame = (await swaps()) / o.frames;
    rec(id, o.meanFrameMs, {
      fps: o.fps,
      p95FrameMs: o.p95FrameMs,
      frames: o.frames,
      loafCount: o.loafCount,
      main: o.main,
      hoverSwapsPerFrame,
      treeRowsMounted: await page.locator('[data-node-id]').count(),
    });
    expect(o.frames).toBeGreaterThanOrEqual(30);
    if (v1) expect(hoverSwapsPerFrame, 'V1 simulates no plane hit-test: hoverId must not swap during the drag').toBeLessThanOrEqual(0.005);
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

test('Orbit_Budget_Above50Fps', async () => {
  test.skip(!orbit, 'orbit measurement missing');
  expect(orbit.fps, `mean frame ${orbit.meanFrameMs.toFixed(1)} ms, p95 ${orbit.p95FrameMs.toFixed(1)} ms`).toBeGreaterThan(50);
});

// S3.5: flat view at ~1,500 tags with the largest branch exploded (explodeFrom, set through the same `act` helper the
// context-menu spec uses): only that branch gets depth, and the orbit must cost no more than the flat view without it.
// The A/B is inside this test: the flat view without a branch is the control (`orbit/1500-tags-flat`), measured first with the
// same fixture and drag; `orbit/1500-tags` (default 3D exploded view) is only context, it never calls goFlat.
test('Orbit_BranchExploded_CostsNoMoreThanFlat', async ({ page }) => {
  await instrument(page);
  await inflateTraval(page, 1500);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page, 1000, 40_000);
  await goFlat(page);
  await act(page);
  await page.waitForTimeout(600); // let the flat transition (.35s) settle before the control drag
  const c = await orbitDrag(page, 1500);
  rec('orbit/1500-tags-flat/mean-frame-ms', c.meanFrameMs, {
    fps: c.fps,
    p95FrameMs: c.p95FrameMs,
    frames: c.frames,
    loafCount: c.loafCount,
    loafScriptShare: c.loafScriptShare,
    gcsPerFrame: c.gcsPerFrame,
    main: c.main,
  });
  expect(c.frames).toBeGreaterThanOrEqual(30);
  // the control drag moved the camera: same starting view for the branch run
  await page.evaluate(() => window.__logic.setState({ yaw: 0, tilt: 0 }));
  // root = the non-root node with the largest subtree (ids are dotted paths, a descendant starts with `root.`)
  const { root, size } = await page.evaluate(() => {
    const ids = window.__logic.state.nodes.map((n) => n.id);
    let best = { root: null, size: 0 };
    for (const id of ids) {
      if (id === '0') continue;
      const size = ids.filter((x) => x === id || x.startsWith(id + '.')).length;
      if (size > best.size) best = { root: id, size };
    }
    return best;
  });
  expect(size, `branch ${root} must be big enough to matter`).toBeGreaterThan(100);
  const st = await act(page, 'explodeHere', root);
  expect(st.explodeFrom).toBe(root);
  await page.waitForTimeout(600); // let the plane transforms (.35s) settle before the timed drag
  const o = await orbitDrag(page, 1500);
  rec('orbit/1500-tags-branch-exploded/mean-frame-ms', o.meanFrameMs, {
    fps: o.fps,
    p95FrameMs: o.p95FrameMs,
    frames: o.frames,
    loafCount: o.loafCount,
    loafScriptShare: o.loafScriptShare,
    gcsPerFrame: o.gcsPerFrame,
    main: o.main,
    branchRoot: root,
    branchSize: size,
  });
  expect(o.frames).toBeGreaterThanOrEqual(30);
  // relative guard: the absolute 50 fps budget has no margin at 1,500 tags in the flat view (the control itself runs near 45 fps)
  expect(o.meanFrameMs, `branch ${o.meanFrameMs.toFixed(1)} ms vs flat control ${c.meanFrameMs.toFixed(1)} ms, p95 ${o.p95FrameMs.toFixed(1)} ms, branch ${root} (${size} nodes)`).toBeLessThanOrEqual(c.meanFrameMs * 1.1);
});

test('Explode_Toggle_ReportsFrameCost', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  const ms = await page.evaluate(async () => {
    const btn = [...document.querySelectorAll('button')].find((b) => /explodid/i.test(b.textContent || ''));
    if (!btn) throw new Error('Explodido button not found');
    const t0 = performance.now();
    btn.click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return performance.now() - t0;
  });
  rec('explode/traval/toggle-ms', ms);
});

// S9.1a Task 7a: layout switch vs a reload of the active layout, in the same page, on ~1,500-node mocks. The multi-layout mocks are
// tiny, so the main and config mocks are replaced through page.route (like inflateTraval; no fixture file changes) with two big,
// different bodies. The control is doReload (loadProject of the layout already mounted); switchLayout does the same work plus the
// view snapshot, so it must not cost meaningfully more. Both are timed from the call until loadProject has finished and the scan
// it triggers has run. Completion is seen through a counter on the instance's scan(), so a reload of the same layout cannot
// "finish" on the nodes of the previous load.
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const bigBody = (cls, tags) => {
  const copy = `<div class="${cls}-row"><div class="${cls}-cell"><span class="${cls}-a">x</span><span class="${cls}-b">y</span><p class="${cls}-c">z</p></div></div>`; // 5 tags
  return `<body>${copy.repeat(Math.ceil(tags / 5))}</body>`;
};

test('LayoutSwitch_CostsNoMoreThanColdLoad', async ({ page }) => {
  await instrument(page);
  for (const [file, cls] of [['main', 'mm'], ['config', 'cc']]) {
    await page.route(`**/fixtures/multi-layout/layers/${file}.html`, async (route) => {
      const html = await (await route.fetch()).text();
      await route.fulfill({ body: html.replace(/<body[\s\S]*<\/body>/i, bigBody(cls, 1500)), contentType: 'text/html' });
    });
  }
  await page.goto('/?layers=fixtures/multi-layout/');
  await waitForScan(page, 1000, 40_000);
  await act(page);
  await page.evaluate(() => {
    const lg = window.__logic;
    window.__scanN = 0;
    const scan = lg.scan.bind(lg);
    lg.scan = () => { const r = scan(); window.__scanN++; return r; };
  });
  // wait for the app to settle (debounced rescans from ResizeObserver and fonts.ready) before every timed call
  const settle = () => page.evaluate(async () => {
    let quiet = 0, last = window.__scanN;
    while (quiet < 12) { await new Promise((r) => setTimeout(r, 50)); if (window.__scanN === last) quiet++; else { quiet = 0; last = window.__scanN; } }
  });
  // method: 'doReload' (control) or 'switchLayout'; returns ms until loadedSeq === loadSeq and a scan has run since the call
  const timed = (method, arg) => page.evaluate(async ([method, arg]) => {
    const lg = window.__logic, n0 = window.__scanN, seq0 = lg.loadSeq;
    const t0 = performance.now();
    lg[method](arg);
    for (;;) {
      if (lg.loadSeq > seq0 && lg.loadedSeq === lg.loadSeq && window.__scanN > n0 && lg.state.nodes.length > 1) break;
      if (performance.now() - t0 > 30_000) throw new Error(`${method} never finished`);
      await new Promise((r) => setTimeout(r, 0));
    }
    const ms = performance.now() - t0;
    return { ms, nodes: lg.state.nodes.length, layoutId: lg.state.project.layoutId };
  }, [method, arg]);
  const other = (id) => (id === 'main' ? 'config' : 'main');
  let cur = await page.evaluate(() => window.__logic.state.project.layoutId);
  expect(cur).toBe('main');
  // warm-up round trip: fetches, JIT and style caches of both mocks, not timed
  await settle(); await timed('switchLayout', other(cur)); cur = other(cur);
  await settle(); await timed('switchLayout', other(cur)); cur = other(cur);
  const reload = [], sw = [];
  let nodes = 0;
  for (let i = 0; i < 3; i++) {
    await settle();
    const r = await timed('doReload');
    expect(r.layoutId).toBe(cur);
    reload.push(r.ms); nodes = r.nodes;
    await settle();
    const s = await timed('switchLayout', other(cur));
    cur = other(cur);
    expect(s.layoutId).toBe(cur);
    sw.push(s.ms);
    expect(s.nodes, 'switched layout must be big too').toBeGreaterThanOrEqual(1000);
  }
  const reloadMs = median(reload), switchMs = median(sw);
  rec('layout-switch/multi-layout-1500/reload-ms', reloadMs, { runs: reload, nodes });
  rec('layout-switch/multi-layout-1500/switch-ms', switchMs, { runs: sw, nodes });
  expect(nodes, 'reload control must be big').toBeGreaterThanOrEqual(1000);
  // Relative guard only (no absolute ms): the switch is a reload plus the view snapshot, so 1.5x is the noise margin of a single machine;
  // tag `latency` is not gated across runs (docs/bench-methodology.md), this is the only gate.
  expect(switchMs, `switch ${switchMs.toFixed(1)} ms (${sw.map((x) => x.toFixed(0))}) vs reload control ${reloadMs.toFixed(1)} ms (${reload.map((x) => x.toFixed(0))})`).toBeLessThanOrEqual(reloadMs * 1.5);
});

// S9.1a Task 7a: A->B->A->B keeps ONE shadow root, the plane count of each layout, and does not grow the <style> nodes hoistFaces
// appends to document.head. The shared sheet is given an @font-face (data: URL, no network) so hoistFaces has something to hoist.
test('LayoutSwitch_NoLeak_AcrossRoundTrips', async ({ page }) => {
  await page.route('**/fixtures/multi-layout/layers/shared.css', async (route) => {
    const css = await (await route.fetch()).text();
    await route.fulfill({ body: css + '\n@font-face{font-family:"LeakProbe";src:url(data:font/woff2;base64,AAAA)}\n', contentType: 'text/css' });
  });
  await page.goto('/?layers=fixtures/multi-layout/');
  await expect.poll(() => page.locator('[data-plane]').count(), { timeout: 15_000 }).toBeGreaterThan(0);
  await act(page);
  const snap = () => page.evaluate(() => {
    const lg = window.__logic;
    const hosts = [...document.querySelectorAll('*')].filter((e) => e.shadowRoot && e.shadowRoot.childElementCount);
    return {
      layoutId: lg.state.project ? lg.state.project.layoutId : null,
      settled: lg.loadedSeq === lg.loadSeq,
      roots: hosts.length,
      planes: document.querySelectorAll('[data-plane]').length,
      nodes: lg.state.nodes.length,
      headStyles: document.head.querySelectorAll('style').length,
      faceStyles: document.head.querySelectorAll('style[data-layers-face]').length,
    };
  });
  const arrive = async (id) => {
    await expect.poll(async () => { const s = await snap(); return s.layoutId === id && s.settled && s.planes > 0 && s.planes === s.nodes; }, { timeout: 15_000 }).toBe(true);
    return snap();
  };
  const first = { main: await arrive('main') };
  expect(first.main.faceStyles, 'the probe @font-face must be hoisted').toBe(1);
  const headBefore = first.main.headStyles;
  for (const id of ['config', 'main', 'replay', 'config', 'main']) {
    await act(page, 'switchLayout', id);
    const s = await arrive(id);
    const census = await planeCensus(page);
    expect(s.roots, `shadow roots after switching to ${id}`).toBe(1);
    expect(census.total, `planeCensus after switching to ${id}`).toBe(s.planes);
    if (first[id]) expect(s.planes, `planes of ${id} vs its first visit`).toBe(first[id].planes);
    else first[id] = s;
    expect(s.faceStyles, `hoisted face <style> after switching to ${id}`).toBe(1);
    expect(s.headStyles, `document.head <style> count after switching to ${id}`).toBe(headBefore);
  }
});

// S9.1b Task 7: Projetos > Analisar cobertura end to end (folder walk, mock reads, model, verdict) on a connected folder with one
// 1,500-tag HTML (the mock) and 199 screens of ~30 tags. Timed from the analyzeCoverage() call until it resolves; median of 3 after a
// warm-up run. The budget is 2x the rounded median measured on the reference machine (same rule as S9.1a).
const COVERAGE_BUDGET_MS = 616; // 2x the rounded median (308 ms) measured 2026-10-19

test('Coverage_Analyze_CostsUnderBudget', async ({ page }) => {
  const screens = Array.from({ length: 199 }, (_, i) => [`screens/s${i}.html`, coverageHtml('s' + i, 30)]);
  await connectEntries(page, [['layers.json', '{"name":"Perf","mock":"index.html"}'], ['index.html', coverageHtml('big', 1500)], ...screens]);
  await act(page);
  const timed = () => page.evaluate(async () => {
    const lg = window.__logic;
    lg.closeCoverage();
    const t0 = performance.now();
    await lg.analyzeCoverage();
    const ms = performance.now() - t0;
    const c = lg.state.coverage;
    return { ms, status: c && c.status, regions: c && c.model ? c.model.regions.length : 0, error: c && c.error };
  });
  const warm = await timed();
  expect(warm.status, `warm-up analysis: ${warm.error}`).toBe('done');
  const runs = [];
  let regions = 0;
  for (let i = 0; i < 3; i++) {
    const r = await timed();
    expect(r.status, `run ${i}: ${r.error}`).toBe('done');
    runs.push(r.ms); regions = r.regions;
  }
  const ms = median(runs);
  rec('coverage/analyze-200-html-1500-tags/analyze-ms', ms, { runs, regions });
  expect(regions, 'one tela per distinct screen plus their sub-regions').toBeGreaterThanOrEqual(200);
  expect(ms, `analyzeCoverage median ${ms.toFixed(0)} ms (${runs.map((x) => x.toFixed(0))}) vs budget ${COVERAGE_BUDGET_MS} ms`).toBeLessThanOrEqual(COVERAGE_BUDGET_MS);
});

test.afterAll(() => {
  const have = new Set(results.map((r) => r.benchId));
  const missing = EXPECTED.filter((id) => !have.has(id));
  if (results.length) console.log(`wrote ${writeBench(results, runtime)}`);
  // a partial result file must not look like a clean run
  if (missing.length) throw new Error(`perf results missing: ${missing.join(', ')}`);
});
