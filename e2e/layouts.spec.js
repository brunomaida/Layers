import { test, expect } from '@playwright/test';
import { readNodes, lastTreeRow } from './tree-helpers.js';
import { act, open } from './ctx-helpers.js';

// S9.1a Task 2: layers.json › layouts mounts ONE layout at a time (one shadow root). No strip yet: switchLayout is
// reached through the component instance (`act`); the keys it writes are part of the contract (docs: Chaves).
const FX = '/?layers=fixtures/multi-layout/';
const SHADOW = '0 0 0 3px rgb(1, 2, 3)';

const mounted = (page) => page.evaluate(() => {
  const hosts = [...document.querySelectorAll('*')].filter((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  const sh = hosts[0] && hosts[0].shadowRoot;
  return { roots: hosts.length, ids: sh ? [...sh.querySelectorAll('[id]')].map((e) => e.id).sort() : [], planes: document.querySelectorAll('[data-plane]').length, nodes: window.__logic ? window.__logic.state.nodes.length : -1 };
});
const layoutId = async (page) => { await act(page); return page.evaluate(() => (window.__logic.state.project || {}).layoutId || null); };
const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

async function loaded(page, url = FX) {
  await page.goto(url);
  await readNodes(page);
  await act(page);
}

test('Layouts_Load_MountsOnlyActiveLayout', async ({ page }) => {
  await loaded(page);
  const m = await mounted(page);
  expect(m.roots).toBe(1);
  expect(m.ids).toEqual(['main-a', 'main-title']);
  expect(m.planes).toBeGreaterThan(0);
  expect(m.planes).toBe(m.nodes);
  expect(await page.evaluate(() => window.__logic.state.project.layouts.map((l) => l.id))).toEqual(['main', 'config', 'replay', 'broken']);
});

test('Layouts_SwitchLayout_ReloadsOtherMock', async ({ page }) => {
  await loaded(page);
  await act(page, 'switchLayout', 'config');
  await expect.poll(() => layoutId(page)).toBe('config');
  await expect.poll(async () => (await mounted(page)).ids).toEqual(['cfg-field', 'cfg-panel', 'cfg-title']);
  const m = await mounted(page);
  expect(m.roots).toBe(1);
  expect(m.planes).toBe(m.nodes);
  // the shared sheet reaches the new layout, the per-layout sheet too
  expect(await page.evaluate(() => {
    const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
    const sh = host.shadowRoot;
    return [getComputedStyle(sh.querySelector('#cfg-title')).color, getComputedStyle(sh.querySelector('#cfg-panel')).color];
  })).toEqual(['rgb(0, 128, 0)', 'rgb(0, 0, 255)']);
  await act(page, 'switchLayout', 'main');
  await expect.poll(() => layoutId(page)).toBe('main');
  await expect.poll(async () => (await mounted(page)).ids).toEqual(['main-a', 'main-title']);
});

test('Layouts_SwitchLayout_KeepsEachLayoutsStateSelection', async ({ page }) => {
  await loaded(page);
  await act(page, 'switchState', 'filled');
  await expect.poll(async () => (await mounted(page)).ids).toEqual(['main-a', 'main-b', 'main-title']);
  await act(page, 'switchLayout', 'replay');
  await expect.poll(() => layoutId(page)).toBe('replay');
  await act(page, 'switchLayout', 'main');
  await expect.poll(() => layoutId(page)).toBe('main');
  await expect.poll(async () => (await mounted(page)).ids).toEqual(['main-a', 'main-b', 'main-title']);
});

test('Layouts_MissingMock_ReloadFallsBackToFirstLayout', async ({ page }) => {
  await loaded(page);
  await act(page, 'switchLayout', 'broken');
  await expect(page.getByText('Mock não encontrado.')).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Projeto Multi layout/).first()).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => layoutId(page)).toBe('main');
  expect((await mounted(page)).ids).toEqual(['main-a', 'main-title']);
});

test('Layouts_ReloadKeepsTheChosenLayout', async ({ page }) => {
  await loaded(page);
  await act(page, 'switchLayout', 'replay');
  await expect.poll(() => layoutId(page)).toBe('replay');
  await page.reload();
  await expect(page.getByText(/Projeto Multi layout/).first()).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => layoutId(page)).toBe('replay');
  await expect.poll(async () => (await mounted(page)).ids).toEqual(['rpl-bar', 'rpl-frame', 'rpl-frame2', 'rpl-title']);
});

test('Layouts_SingleLayoutProject_KeysUnchanged', async ({ page }) => {
  // multi-state has no `layouts`: implicit `main`, keys exactly as before and no `layouts` in the session
  await open(page, 'multi-state');
  await act(page);
  const plain = await page.evaluate(() => ({ base: window.__logic.baseKey, pending: window.__logic.pendingKey, layoutId: window.__logic.state.project.layoutId }));
  expect(plain).toEqual({ base: 'folder:proj', pending: 'folder:proj', layoutId: 'main' });
  await act(page, 'switchState', 'csv-loaded');
  await expect.poll(async () => { await act(page); return page.evaluate(() => window.__logic.state.project.stateName); }).toBe('csv-loaded');
  const snap = await page.evaluate(() => window.__logic.sessionSnapshot());
  expect(snap.states).toEqual({ 'folder:proj': 'csv-loaded' });
  expect('layouts' in snap).toBe(false);
});

test('Layouts_MainLayoutDeclared_KeysUnchangedAndOthersGetSuffix', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  const main = await page.evaluate(() => ({ base: window.__logic.baseKey, pending: window.__logic.pendingKey }));
  expect(main).toEqual({ base: 'folder:proj', pending: 'folder:proj' });
  await act(page, 'switchState', 'filled');
  await expect.poll(async () => { await act(page); return page.evaluate(() => window.__logic.state.project.stateName); }).toBe('filled');
  expect(await page.evaluate(() => window.__logic.sessionSnapshot().states)).toEqual({ 'folder:proj': 'filled' });
  expect('layouts' in (await page.evaluate(() => window.__logic.sessionSnapshot()))).toBe(false);
  await act(page, 'switchLayout', 'config');
  await expect.poll(() => layoutId(page)).toBe('config');
  const cfg = await page.evaluate(() => ({ pending: window.__logic.pendingKey, snap: window.__logic.sessionSnapshot() }));
  expect(cfg.pending).toBe('folder:proj|config');
  expect(cfg.snap.layouts).toEqual({ 'folder:proj': 'config' });
  expect(cfg.snap.states).toEqual({ 'folder:proj': 'filled' });
});

test('Layouts_SwitchWithUnsavedCode_ModalNeverDropsPendingChanges', async ({ page }) => {
  await loaded(page);
  await (await lastTreeRow(page)).click();
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(SHADOW);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__logic.state.changes.length)).toBe(1);
  await act(page, 'setState', { codeBuf: { 'layers/shared.css': '.title{color:red}' } });
  await act(page, 'switchLayout', 'config');
  await expect(page.getByText('Há código não salvo; trocar de layout descarta o código editado.')).toBeVisible();
  expect(await layoutId(page)).toBe('main');
  await page.getByRole('button', { name: 'Trocar', exact: true }).click();
  await expect.poll(() => layoutId(page)).toBe('config');
  expect(await page.evaluate(() => Object.keys(window.__logic.state.codeBuf))).toEqual([]);
  // the adjustment stays stored under the old layout's key (ruling a)
  const stored = await page.evaluate(() => { const raw = localStorage.getItem('layers/v1/pending'); return raw ? (JSON.parse(raw).byProject || {}) : {}; });
  expect(stored['fx:fixtures/multi-layout'].changes).toHaveLength(1);
  expect(Object.keys(stored)).toEqual(['fx:fixtures/multi-layout']);
  await act(page, 'switchLayout', 'main');
  await expect.poll(() => layoutId(page)).toBe('main');
  await expect.poll(() => page.evaluate(() => window.__logic.state.changes.length)).toBe(1);
});
