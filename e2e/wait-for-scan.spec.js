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
