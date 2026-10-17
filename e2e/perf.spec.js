import { test, expect } from '@playwright/test';
import { instrument, waitForScan, orbitDrag, writeBench, planeCensus, zoomIn, memoComputedStyle, memoClientBox, markScene, hidePlanes, setWireAlpha, countPlaneHovers } from './perf-helpers.js';

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
  'orbit/traval-zoom/mean-frame-ms',
  'orbit/traval-zoom-ideal/mean-frame-ms',
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
for (const [name, id, v] of [
  ['Orbit_NoHitTest_RecordsFrameInterval', 'orbit/traval-v1-no-hit/mean-frame-ms', { css: '[data-s48-plane]{pointer-events:none!important}' }],
  ['Orbit_PlanesNoWillChange_RecordsFrameInterval', 'orbit/traval-v2a-planes-no-will-change/mean-frame-ms', { css: '[data-s48-plane]{will-change:auto!important}' }],
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
    const hidden = v.hide ? await hidePlanes(page, v.hide) : 0;
    if (v.css) await page.addStyleTag({ content: v.css });
    const swaps = await countPlaneHovers(page);
    const o = await orbitDrag(page, 1500);
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
      hidden,
    });
    expect(o.frames).toBeGreaterThanOrEqual(30);
    if (v.hide) expect(hidden, 'planes hidden by the stub').toBeGreaterThan(0);
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

test('Orbit_Budget_Above50Fps', async () => {
  test.skip(!orbit, 'orbit measurement missing');
  // Known gap (checklist D, S4.7 and S4.9): about 42 fps on the Traval mock; S4.8 measured plane attributes off the critical path.
  // Flips to a hard failure once it passes, which is the signal to drop this line and keep the
  // budget enforced.
  test.fail(true, 'orbit budget not met yet: S4.7 (virtual tree) and S4.9 (leaf grouping) are open');
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
