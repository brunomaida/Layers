import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S2.14: pending changes survive a reload. Same axai setup as undo-redo.spec.js.
const SHADOW = '0 0 0 3px rgb(1, 2, 3)';
const KEY = 'fx:fixtures/axai';

function shadows() {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  return [...host.shadowRoot.querySelectorAll('*')].filter((e) => e.localName !== 'style').map((e) => e.style.boxShadow);
}
const count = (list, needle) => list.filter((v) => v.includes(needle)).length;

async function open(page) {
  await page.goto('/?layers=fixtures/axai/');
  await readNodes(page);
  await page.locator('[data-node-id][title^=".sum-stat"]').first().click();
  await page.getByText('Só este', { exact: false }).first().click();
}

const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

async function typeShadow(page, text) {
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(text);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
}

async function press(page, combo) {
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press(combo);
  await page.waitForTimeout(200);
}

async function reload(page) {
  await page.reload();
  await readNodes(page);
}

const entry = (page) => page.evaluate((k) => {
  const raw = localStorage.getItem('layers/v1/pending');
  return raw ? (JSON.parse(raw).byProject || {})[k] || null : null;
}, KEY);

test('Reload_PendingEdit_RestoresInlineAndToasts', async ({ page }) => {
  await open(page);
  await typeShadow(page, SHADOW); // 300 ms wait: the reload below lands inside the 400 ms trailing write
  await reload(page);
  expect(count(await page.evaluate(shadows), 'rgb(1, 2, 3)')).toBe(1);
  await expect(page.getByText('1 ajuste(s) restaurado(s)')).toBeVisible();
  expect((await entry(page)).changes).toHaveLength(1);
});

test('Reload_UndoneToEmpty_RestoresNothing', async ({ page }) => {
  await open(page);
  await typeShadow(page, SHADOW);
  await press(page, 'Control+z');
  await page.waitForTimeout(600); // let the trailing write remove the entry
  await reload(page);
  expect(count(await page.evaluate(shadows), 'rgb(1, 2, 3)')).toBe(0);
  await expect(page.getByText('restaurado(s)')).toHaveCount(0);
  expect(await entry(page)).toBeNull();
});

test('Reload_SourceChanged_DiscardsAndWarns', async ({ page }) => {
  await open(page);
  await typeShadow(page, SHADOW);
  await page.waitForTimeout(600);
  await page.route('**/fixtures/axai/wwwroot/index.html', async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, body: (await res.text()) + '\n<!-- changed -->' });
  });
  await reload(page);
  expect(count(await page.evaluate(shadows), 'rgb(1, 2, 3)')).toBe(0);
  await expect(page.getByText('1 ajuste(s) salvo(s) descartado(s)')).toBeVisible();
  await page.waitForTimeout(600);
  expect(await entry(page)).toBeNull();
  await reload(page); // the entry is gone: no second warning
  await expect(page.getByText('descartado(s)')).toHaveCount(0);
});
