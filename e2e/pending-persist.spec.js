import { test, expect } from '@playwright/test';
import { readNodes, treeRow } from './tree-helpers.js';
import { item } from './ctx-helpers.js';

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
  await (await treeRow(page, { title: '.sum-stat' })).click();
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

// The editor's 400 ms trailing write is parked for ten minutes, so only the pagehide drain can persist.
const parkTrailingWrite = (page) => page.addInitScript(() => {
  const st = window.setTimeout.bind(window);
  window.setTimeout = (fn, ms, ...rest) => st(fn, ms === 400 ? 600000 : ms, ...rest);
});

test('Reload_PendingEdit_RestoresInlineAndToasts', async ({ page }) => {
  await parkTrailingWrite(page);
  await open(page);
  await typeShadow(page, SHADOW);
  expect(await entry(page)).toBeNull(); // nothing written yet: the reload must go through pagehide
  await reload(page);
  expect(count(await page.evaluate(shadows), 'rgb(1, 2, 3)')).toBe(1);
  await expect(page.getByText('1 ajuste(s) restaurado(s)')).toBeVisible();
  expect((await entry(page)).changes).toHaveLength(1);
});

test('Reload_UndoneToEmpty_RestoresNothing', async ({ page }) => {
  await open(page);
  await typeShadow(page, SHADOW);
  await page.waitForTimeout(600);
  expect(await entry(page)).not.toBeNull(); // the edit was persisted before the undo
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

test('Reload_LayersJsonChanged_DiscardsAndWarns', async ({ page }) => {
  await open(page);
  await typeShadow(page, SHADOW);
  await page.waitForTimeout(600);
  await page.route('**/fixtures/axai/layers.json', async (route) => {
    const res = await route.fetch();
    const man = JSON.parse(await res.text());
    man.viewport.width += 1; // mock and styles untouched: only the manifest differs
    await route.fulfill({ response: res, body: JSON.stringify(man) });
  });
  await reload(page);
  expect(count(await page.evaluate(shadows), 'rgb(1, 2, 3)')).toBe(0);
  await expect(page.getByText('1 ajuste(s) salvo(s) descartado(s)')).toBeVisible();
});

// S3.5 Task 6: manual requests share the entry of the pending changes.
async function requestOnSelected(page, text) {
  await (await treeRow(page, { title: '.sum-stat' })).click({ button: 'right' });
  await item(page, /Requisição/).click();
  await page.locator('[data-req="R1"] textarea').fill(text);
}

test('Reload_ChangeAndRequest_BothRestored', async ({ page }) => {
  await parkTrailingWrite(page);
  await open(page);
  await typeShadow(page, SHADOW);
  await requestOnSelected(page, 'Pedido ao lado do ajuste.');
  const rec = await page.evaluate(() => { const el = document.querySelector('[data-plane]'); let f = el[Object.keys(el).find((k) => k.startsWith('__reactFiber'))]; while (f && !(f.stateNode && f.stateNode.logic && f.stateNode.logic.explodeHere)) f = f.return; return f.stateNode.logic.state.requests[0]; });
  expect(rec.pendente).toMatch(/^box-shadow .* → .*rgb\(1, 2, 3\)/); // the node's pending De → Para travels with the request
  await reload(page);
  expect(count(await page.evaluate(shadows), 'rgb(1, 2, 3)')).toBe(1);
  await expect(page.getByText('1 ajuste(s) restaurado(s) · 1 requisição(ões) restaurada(s)')).toBeVisible();
  await page.locator('[data-req-row="R1"]').click();
  await expect(page.locator('[data-req="R1"] textarea')).toHaveValue('Pedido ao lado do ajuste.');
  const e = await entry(page);
  expect(e.changes).toHaveLength(1);
  expect(e.requests).toHaveLength(1);
});

test('Reload_SourceChanged_DropsChangesKeepsRequest', async ({ page }) => {
  await open(page);
  await typeShadow(page, SHADOW);
  await requestOnSelected(page, 'Sobrevive a fonte mudada.');
  await page.waitForTimeout(600);
  await page.route('**/fixtures/axai/wwwroot/index.html', async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, body: (await res.text()) + '\n<!-- changed -->' });
  });
  await reload(page);
  expect(count(await page.evaluate(shadows), 'rgb(1, 2, 3)')).toBe(0);
  await expect(page.getByText('1 ajuste(s) salvo(s) descartado(s): arquivo mudou · 1 requisição(ões) restaurada(s) · alvo a confirmar')).toBeVisible();
  await page.locator('[data-req-row="R1"]').click();
  await expect(page.locator('[data-req="R1"]')).toContainText('alvo a confirmar');
  await expect(page.locator('[data-req="R1"] textarea')).toHaveValue('Sobrevive a fonte mudada.');
  await page.waitForTimeout(600);
  const e = await entry(page); // the dropped changes are rewritten away, the request stays
  expect(e.changes).toEqual([]);
  expect(e.requests).toHaveLength(1);
});
