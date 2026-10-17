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
