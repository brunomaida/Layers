import { test, expect } from '@playwright/test';
import { readNodes, treeRow } from './tree-helpers.js';

// S2.15: an origin that points at TS/JS is marked "manual" in the properties header and in the
// Ajustes list. Traval maps its root (`.shell`) to `src/ui/shell.ts|.shell|3`, a file the fixture
// does not vendor, and `OriginMarker` to the longer `src/chart/originMarkerPrimitive.ts|OriginMarker|1`.
const SHADOW = '0 0 0 3px rgb(1, 2, 3)';

const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

async function typeShadow(page, text) {
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(text);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
}

// Playwright's toBeVisible/toContainText ignore `overflow:hidden` clipping, so measure it: the
// marker must end inside the visible content box of its parent.
const fits = (loc) => loc.evaluate((el) => {
  const p = el.parentElement;
  const r = el.getBoundingClientRect();
  const pr = p.getBoundingClientRect();
  return r.width > 0 && r.right <= pr.left + p.clientWidth + 0.5;
});

async function select(page, pick) {
  await page.goto('/?layers=fixtures/traval/');
  await readNodes(page);
  await (await pick(page)).click();
}

const NODES = [
  ['ShortOrigin', (page) => treeRow(page, { title: '.shell' })],
  ['LongOrigin', (page) => treeRow(page, { text: 'origin marker' })],
];

for (const [label, pick] of NODES) {
  test(`Marker_Ts${label}_HeaderAndAjustesShowManualUnclipped`, async ({ page }) => {
    await select(page, pick);
    const head = page.locator('[data-manual-mark="sel"]').filter({ hasText: 'manual' }).first();
    await expect(head).toBeVisible();
    expect(await fits(head), 'header marker clipped').toBe(true);
    await typeShadow(page, SHADOW);
    const row = page.locator('[data-manual-mark="aj"]').filter({ hasText: 'manual' }).first();
    await expect(row).toBeVisible();
    expect(await fits(row), 'Ajustes marker clipped').toBe(true);
  });
}

test('Marker_CssOrigin_NoManualMark', async ({ page }) => {
  await page.goto('/?layers=fixtures/axai/');
  await readNodes(page);
  await (await treeRow(page, { title: '.sum-stat' })).click();
  await expect(page.locator('[data-manual-mark]').filter({ hasText: 'manual' })).toHaveCount(0);
});
