import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S2.15: an origin that points at TS/JS is marked "manual" in the origin chip and in the Ajustes
// list. Traval maps its root (`.shell`) to `src/ui/shell.ts|.shell|3`, a file the fixture does not vendor.
const SHADOW = '0 0 0 3px rgb(1, 2, 3)';

const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

async function typeShadow(page, text) {
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(text);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
}

test('Marker_TsOrigin_ChipAndAjustesSayManual', async ({ page }) => {
  await page.goto('/?layers=fixtures/traval/');
  await readNodes(page);
  await page.locator('[data-node-id][title^=".shell"]').first().click();
  await expect(page.locator('span[title^="origem: src/ui/shell.ts"]')).toContainText('manual');
  await typeShadow(page, SHADOW);
  await expect(page.locator('[data-manual-mark]').filter({ hasText: 'patch manual' }).first()).toBeVisible();
});

test('Marker_CssOrigin_KeepsMockOrCssReal', async ({ page }) => {
  await page.goto('/?layers=fixtures/axai/');
  await readNodes(page);
  await page.locator('[data-node-id][title^=".sum-stat"]').first().click();
  await expect(page.locator('span[title^="origem:"]').filter({ hasText: 'manual' })).toHaveCount(0);
});
