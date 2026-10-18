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
  await expect.poll(() => page.evaluate(() => window.__logic.state.changes.length)).toBe(1);
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

async function typeShadow(page) {
  await (await lastTreeRow(page)).click();
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(SHADOW);
  await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() => window.__logic.state.changes.length)).toBe(1);
}

test('Layouts_SwitchLayout_GuardsDoNotReload', async ({ page }) => {
  await loaded(page);
  const seq = () => page.evaluate(() => window.__logic.loadSeq);
  const s0 = await seq();
  await act(page, 'switchLayout', 'main'); // same id
  await act(page, 'switchLayout', 'nope'); // unknown id
  expect(await seq()).toBe(s0);
  await page.evaluate(() => window.__logic.setState({ modal: { stage: 'confirm', log: [], title: 'x', label: 'x', text: 'x', onYes: () => {} } }));
  await act(page, 'switchLayout', 'config'); // a panel is open
  expect(await seq()).toBe(s0);
  await act(page, 'setState', { modal: null });
  await page.evaluate(() => { window.__logic.loadedSeq = -1; });
  await act(page, 'switchLayout', 'config'); // a load is still in flight
  expect(await seq()).toBe(s0);
  await page.evaluate(() => { window.__logic.loadedSeq = window.__logic.loadSeq; });
  expect(await layoutId(page)).toBe('main');
  await act(page, 'switchLayout', 'config');
  await expect.poll(() => layoutId(page)).toBe('config');
});

test('Layouts_MissingMockInNonMainLayout_DropsSavedStateAndFallsBackToFirstLayout', async ({ page }) => {
  // layers.json is rewritten in flight to add a layout with two states, the second one pointing at a missing mock
  await page.route('**/multi-layout/layers.json*', async (route) => {
    const res = await route.fetch(); const man = await res.json();
    man.layouts.push({ id: 'multi', name: 'Multi', mock: 'layers/config.html', states: [{ name: 'ok', mock: 'layers/config.html' }, { name: 'bad', mock: 'layers/gone.html' }] });
    await route.fulfill({ response: res, json: man });
  });
  await loaded(page);
  await act(page, 'switchLayout', 'multi');
  await expect.poll(() => layoutId(page)).toBe('multi');
  await act(page, 'switchState', 'bad');
  await expect(page.getByText('Mock não encontrado.')).toBeVisible();
  await expect(page.getByText(/Layout "Multi": recarregar abre o primeiro layout\./)).toBeVisible();
  const keys = await page.evaluate(() => ({ states: Object.keys(window.__logic.stateMap), layouts: Object.keys(window.__logic.layoutMap) }));
  expect(keys).toEqual({ states: [], layouts: [] });
  await page.reload();
  await expect(page.getByText(/Projeto Multi layout/).first()).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => layoutId(page)).toBe('main');
});

test('Layouts_MissingMockWithoutLayouts_KeepsTheOriginalMessage', async ({ page }) => {
  await loaded(page, '/?layers=fixtures/multi-state/');
  await act(page, 'switchState', 'broken');
  await expect(page.getByText(/estado "broken" em "states"/)).toBeVisible();
  await expect(page.getByText(/recarregar abre o primeiro layout/)).toHaveCount(0);
});

test('Layouts_SwitchWithAdjustmentsThatCannotBeSaved_ConfirmsAndWarnsTheyAreLost', async ({ page }) => {
  await loaded(page);
  await typeShadow(page);
  // simulates an incomplete load / unsaved key: the drain could not persist the burst
  await page.evaluate(() => { window.__logic.pendingReady = false; });
  await act(page, 'switchLayout', 'config');
  await expect(page.getByText(/Há ajustes que não podem ser salvos neste projeto; trocar de layout os perde\./)).toBeVisible();
  expect(await layoutId(page)).toBe('main');
  await page.getByRole('button', { name: 'Trocar', exact: true }).click();
  await expect.poll(() => layoutId(page)).toBe('config');
});

test('Layouts_OverlappingLoads_OlderLoadResolvingLastDoesNotTouchKeys', async ({ page }) => {
  await loaded(page);
  let n = 0;
  await page.route('**/multi-layout/layers.json*', async (route) => {
    n += 1;
    if (n === 1) await new Promise((r) => setTimeout(r, 1500)); // load A: slow
    await route.continue();
  });
  await page.evaluate(() => {
    const l = window.__logic;
    l.loadProject(); // A (slow)
    l.layoutMap[l.baseKey] = 'replay';
    l.loadProject(); // B (fast, supersedes A)
  });
  await expect.poll(() => layoutId(page)).toBe('replay');
  expect(await page.evaluate(() => window.__logic.pendingKey)).toBe('fx:fixtures/multi-layout|replay');
  // A resolves now; had it passed the parse it would resolve main and overwrite the live keys
  await page.evaluate(() => { window.__logic.layoutMap['fx:fixtures/multi-layout'] = 'main'; });
  await expect.poll(() => n).toBe(2);
  await page.waitForTimeout(2000);
  expect(await page.evaluate(() => ({ key: window.__logic.pendingKey, id: window.__logic.state.project.layoutId }))).toEqual({ key: 'fx:fixtures/multi-layout|replay', id: 'replay' });
  expect((await mounted(page)).ids).toEqual(['rpl-bar', 'rpl-frame', 'rpl-frame2', 'rpl-title']);
});
