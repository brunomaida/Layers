import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S2.13: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y over property edits. Driven through the real UI on the axai
// fixture, where `.sum-stat` is used by 6 nodes (same setup as scope-all-equal.spec.js).
const SHADOW = '0 0 0 3px rgb(1, 2, 3)';
const OTHER = '0 0 0 5px rgb(4, 5, 6)';

// Inline box-shadow of every shadow-root element, in scan order.
function shadows() {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  return [...host.shadowRoot.querySelectorAll('*')].filter((e) => e.localName !== 'style').map((e) => e.style.boxShadow);
}
const count = (list, needle) => list.filter((v) => v.includes(needle)).length;

async function open(page, scopeLabel) {
  await page.goto('/?layers=fixtures/axai/');
  await readNodes(page);
  await page.locator('[data-node-id][title^=".sum-stat"]').first().click();
  if (scopeLabel) await page.getByText(scopeLabel, { exact: false }).first().click();
}

const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

async function typeShadow(page, text) {
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(text);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
}

// The global handler ignores keys while a text field has focus, so leave it first.
async function press(page, combo) {
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press(combo);
  await page.waitForTimeout(200);
}

test('Undo_OneScopeEdit_RestoresInlineAndRedoReapplies', async ({ page }) => {
  await open(page, 'Só este');
  const base = await page.evaluate(shadows);
  await typeShadow(page, SHADOW);
  expect(count(await page.evaluate(shadows), 'rgb(1, 2, 3)')).toBe(1);
  await typeShadow(page, SHADOW); // same value again must not add a step
  await press(page, 'Control+z');
  expect(await page.evaluate(shadows)).toEqual(base);
  await press(page, 'Control+Shift+z');
  expect(count(await page.evaluate(shadows), 'rgb(1, 2, 3)')).toBe(1);
  await press(page, 'Control+z');
  await typeShadow(page, OTHER); // a new edit invalidates redo
  await press(page, 'Control+y');
  const after = await page.evaluate(shadows);
  expect(count(after, 'rgb(4, 5, 6)')).toBe(1);
  expect(count(after, 'rgb(1, 2, 3)')).toBe(0);
});

test('Undo_AllScopeEdit_RestoresEveryExtendedId', async ({ page }) => {
  await open(page, 'Todos iguais (');
  const base = await page.evaluate(shadows);
  await typeShadow(page, SHADOW);
  expect(count(await page.evaluate(shadows), 'rgb(1, 2, 3)')).toBeGreaterThan(1);
  await press(page, 'Control+z');
  expect(await page.evaluate(shadows)).toEqual(base);
});

test('Undo_PendingScopeQuestion_DoesNothing', async ({ page }) => {
  await open(page, null); // default scope asks
  await typeShadow(page, SHADOW);
  const before = await page.evaluate(shadows);
  await press(page, 'Control+z');
  expect(await page.evaluate(shadows)).toEqual(before);
  await expect(page.getByText('Desfeito')).toHaveCount(0);
});

test('Undo_FocusInTextField_LeavesAppliedEditAlone', async ({ page }) => {
  await open(page, 'Só este');
  await typeShadow(page, SHADOW);
  await field(page).click();
  await page.keyboard.press('Control+z'); // native text undo; the global handler must stay out
  expect(count(await page.evaluate(shadows), 'rgb(1, 2, 3)')).toBe(1);
  await expect(page.getByText('Desfeito')).toHaveCount(0);
});

// Final-review fixes: a modal/diff panel owns the edit list, and one slider gesture is one step.
const opacities = () => {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  return [...host.shadowRoot.querySelectorAll('*')].filter((e) => e.localName !== 'style').map((e) => e.style.opacity);
};

const range = (page) => page.locator('xpath=//*[normalize-space(text())="Opacidade"]/ancestor::*[.//input[@type="range"]][1]//input[@type="range"]').first();

test('Undo_DiffPanelOpen_DoesNothing', async ({ page }) => {
  await open(page, 'Só este');
  await typeShadow(page, SHADOW);
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Ver diff', { exact: false }).first().click();
  await page.waitForTimeout(300);
  await press(page, 'Control+z');
  expect(count(await page.evaluate(shadows), 'rgb(1, 2, 3)')).toBe(1);
  await expect(page.getByText('Desfeito')).toHaveCount(0);
});

test('Undo_RangeBurst_IsOneStep', async ({ page }) => {
  await open(page, 'Só este');
  const base = await page.evaluate(opacities);
  await range(page).focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft'); // four ticks of one gesture
  expect(await page.evaluate(opacities)).not.toEqual(base);
  await press(page, 'Control+z');
  expect(await page.evaluate(opacities)).toEqual(base);
});

test('Undo_FocusOnRange_StillUndoes', async ({ page }) => {
  await open(page, 'Só este');
  const base = await page.evaluate(opacities);
  await range(page).focus();
  await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(opacities)).not.toEqual(base);
  await page.keyboard.press('Control+z'); // focus stays on the slider
  await page.waitForTimeout(200);
  expect(await page.evaluate(opacities)).toEqual(base);
});
