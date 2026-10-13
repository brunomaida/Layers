import { test, expect } from '@playwright/test';
import { instrument, waitForScan, orbitFps, writeBench } from './perf-helpers.js';

const results = [];
const rec = (benchId, value, unit = 'ms') => results.push({ benchId, unit, value, stddev: 0, extra: {} });

test.describe.configure({ mode: 'serial' });

test('Load_TravalFixture_ReportsFirstScan', async ({ page }) => {
  await instrument(page);
  const t0 = Date.now();
  await page.goto('/?layers=fixtures/traval/');
  const scan = await waitForScan(page);
  rec('load/traval/first-scan-ms', scan.ms);
  rec('load/traval/wall-ms', Date.now() - t0);
  rec('load/traval/gcs-calls', scan.nodes, 'count');
  expect(scan.nodes).toBeGreaterThan(100);
});

test('Scan_1500Nodes_UnderBudget', async ({ page }) => {
  await instrument(page);
  // Replicate the real Traval mock body until it has ~1,500 tags; nothing new is committed.
  // The metric is the scan's getComputedStyle burst (one call per scanned node, plus a few others).
  await page.route('**/fixtures/traval/layers/mock.html', async (route) => {
    const res = await route.fetch();
    const html = await res.text();
    const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (!m) throw new Error('traval mock has no <body>');
    const perCopy = (m[1].match(/<[a-z][^>]*>/gi) || []).length;
    const copies = Math.max(1, Math.ceil(1500 / perCopy));
    await route.fulfill({ body: html.replace(m[1], m[1].repeat(copies)), contentType: 'text/html' });
  });
  await page.goto('/?layers=fixtures/traval/');
  const scan = await waitForScan(page, 1000, 40_000);
  rec('scan/1500-tags-ms', scan.ms);
  rec('scan/1500-tags-gcs-calls', scan.nodes, 'count');
  expect(scan.nodes).toBeGreaterThanOrEqual(1000);
  expect(scan.ms, `scan burst of ${scan.nodes} getComputedStyle calls`).toBeLessThan(300);
});

test('Orbit_DragOnStage_Above50Fps', async ({ page }) => {
  // Known gap (checklist D, S4.5-S4.7): every mousemove re-renders all planes on the main thread
  // (about 11 fps on the 433-node Traval mock, JS-bound). Flips to a hard failure once it passes,
  // which is the signal to drop this line and keep the budget enforced.
  test.fail(true, 'orbit budget not met yet: culling, getComputedStyle cache and virtual tree are open');
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  const o = await orbitFps(page, 90);
  rec('orbit/traval/fps', o.fps, 'fps');
  rec('orbit/traval/p95-frame-ms', o.p95FrameMs);
  rec('orbit/traval/longtasks', o.longtaskCount, 'count');
  expect(o.fps, `p95 frame ${o.p95FrameMs.toFixed(1)} ms, ${o.longtaskCount} longtasks (max ${o.longtaskMaxMs.toFixed(0)} ms)`).toBeGreaterThan(50);
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
  if (results.length) console.log(`wrote ${writeBench(results)}`);
});
