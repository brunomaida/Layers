import { test, expect } from '@playwright/test';
import { instrument, waitForScan, orbitDrag, writeBench, planeCensus, zoomIn, memoComputedStyle, memoClientBox, markScene, hidePlanes, setWireAlpha, countPlaneHovers, groupPlanesByZ, ungroupPlanesByZ, countCompositedLayers, reapplyMarks } from './perf-helpers.js';
import { inflateTraval, treeMode, noPlaneHits, countHoverSwaps, rowInputCost, scrollFrames } from './tree-perf-helpers.js';

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
  'tree/traval/hover-ms',
  'tree/traval/select-ms',
  'tree/1500-tags/hover-ms',
  'tree/1500-tags/select-ms',
  'tree/1500-tags/scroll-frame-ms',
  'explode/traval/toggle-ms',
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
  // Known gap (checklist D, S4.9): about 42 fps on the Traval mock; S4.8 measured plane attributes off the critical path.
  // Flips to a hard failure once it passes, which is the signal to drop this line and keep the
  // budget enforced.
  test.fail(true, 'orbit budget not met yet: S4.9 (composited layers) is open; S4.10 (tree window at scale) does not move the Traval budget');
  expect(orbit.fps, `mean frame ${orbit.meanFrameMs.toFixed(1)} ms, p95 ${orbit.p95FrameMs.toFixed(1)} ms`).toBeGreaterThan(50);
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

test.afterAll(() => {
  const have = new Set(results.map((r) => r.benchId));
  const missing = EXPECTED.filter((id) => !have.has(id));
  if (results.length) console.log(`wrote ${writeBench(results, runtime)}`);
  // a partial result file must not look like a clean run
  if (missing.length) throw new Error(`perf results missing: ${missing.join(', ')}`);
});
