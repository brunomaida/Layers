import { test, expect } from '@playwright/test';
import { instrument, waitForScan } from './perf-helpers.js';
import { inflateTraval } from './tree-perf-helpers.js';

// S4.10 visual freeze of the layer tree: the row window must not change a single pixel of the tree
// container. Baselines come from the unmodified index.html and are local, never committed (like
// menu-visual.spec.js), so the spec runs only with LAYERS_VISUAL=1 and never in the regression run.
test.skip(!process.env.LAYERS_VISUAL, 'manual pixel gate: set LAYERS_VISUAL=1');
test.skip(({ browserName }) => browserName !== 'chromium', 'baselines are Chromium-only');
test.setTimeout(150_000);

const SHOT = { animations: 'disabled', caret: 'hide', maxDiffPixels: 0 };
const frames2 = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

// Traval inflated to ~1500 tags; the scrollable ancestor of the first row is marked to become a Locator.
async function open(page) {
  await instrument(page);
  await inflateTraval(page, 1500);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page, 1000, 40_000);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(2, 2);
  await page.evaluate(() => {
    let b = document.querySelector('[data-node-id]');
    while (b && getComputedStyle(b).overflowY !== 'auto') b = b.parentElement;
    b.setAttribute('data-tree-box', '');
  });
  return page.locator('[data-tree-box]');
}

const scrollTo = async (page, box, to) => {
  await box.evaluate((el, to) => { el.scrollTop = to; }, to);
  await frames2(page);
};

test('TreeVisual_Topo_Igual', async ({ page }) => {
  const box = await open(page);
  await scrollTo(page, box, 0);
  await expect(box).toHaveScreenshot('tree-top.png', SHOT);
});

test('TreeVisual_RoladoNoMeio_Igual', async ({ page }) => {
  const box = await open(page);
  await box.evaluate((el) => { el.scrollTop = Math.floor((el.scrollHeight - el.clientHeight) / 2); });
  await frames2(page);
  await expect(box).toHaveScreenshot('tree-mid.png', SHOT);
});

test('TreeVisual_CodigoAberto_Igual', async ({ page }) => {
  const box = await open(page);
  const row = page.locator('[data-node-id]').nth(3);
  await row.click();
  await row.locator('button[title^="Expandir o código do estilo"]').click();
  await page.mouse.move(2, 2);
  await scrollTo(page, box, 0);
  await expect(box).toHaveScreenshot('tree-code.png', SHOT);
});
