import { test, expect } from '@playwright/test';
import { readNodes, lastTreeRow } from './tree-helpers.js';
import { act, open, reloadWith } from './ctx-helpers.js';
import { listDisk, readDisk } from './folder-helpers.js';

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

// S9.1a Task 3: the LAYOUTS strip (bottom bar). Chips are native buttons; the badge is read once per load.
const chip = (page, id) => page.locator('[data-layout-chip="' + id + '"]');

test('Layouts_Strip_HiddenForSingleLayout', async ({ page }) => {
  await loaded(page, '/?layers=fixtures/multi-state/');
  await expect(page.getByText('Camadas', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Layouts', { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-layout-chip]')).toHaveCount(0);
  await loaded(page, '/?layers=fixtures/traval/');
  await expect(page.locator('[data-layout-chip]')).toHaveCount(0);
});

test('Layouts_Strip_ClickSwitchesLayout', async ({ page }) => {
  await loaded(page);
  await expect(page.locator('[data-layout-chip]')).toHaveCount(4);
  await expect(chip(page, 'main')).toHaveAttribute('aria-pressed', 'true');
  await expect(chip(page, 'config')).toHaveAttribute('aria-pressed', 'false');
  await expect(chip(page, 'config')).toHaveAttribute('title', 'Config');
  await chip(page, 'config').click();
  await expect.poll(() => layoutId(page)).toBe('config');
  await expect.poll(async () => (await mounted(page)).ids).toEqual(['cfg-field', 'cfg-panel', 'cfg-title']);
  await expect(chip(page, 'config')).toHaveAttribute('aria-pressed', 'true');
  await expect(chip(page, 'main')).toHaveAttribute('aria-pressed', 'false');
  await expect(chip(page, 'config')).toContainText('●');
  await chip(page, 'main').click();
  await expect.poll(() => layoutId(page)).toBe('main');
  await expect.poll(async () => (await mounted(page)).ids).toEqual(['main-a', 'main-title']);
  await expect(chip(page, 'main')).toHaveAttribute('aria-pressed', 'true');
});

test('Layouts_Strip_BadgeShowsPendingOfOtherLayout', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await expect(page.locator('[data-layout-badge]')).toHaveCount(0);
  await chip(page, 'config').click();
  await expect.poll(() => layoutId(page)).toBe('config');
  await typeShadow(page);
  await chip(page, 'main').click();
  await expect.poll(() => layoutId(page)).toBe('main');
  await expect(page.locator('[data-layout-badge="config"]')).toHaveText('1');
  await expect(chip(page, 'config')).toHaveAttribute('title', /Config — 1 pendente/);
  await expect(page.locator('[data-layout-badge="main"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__logic.state.layoutBadges)).toEqual({ config: 1 });
  expect(await page.evaluate(() => window.__logic.reqFloor)).toBe(0);
  // the active layout never carries a badge: back on config its own count disappears
  await chip(page, 'config').click();
  await expect.poll(() => layoutId(page)).toBe('config');
  await expect(page.locator('[data-layout-badge]')).toHaveCount(0);
});

// Fix round 1: the strip is its own pill above the Camadas bar, so neither row stretches the other (no empty band).
// Widths captured from the unchanged bar (before the strip existed) on the 1280x760 viewport.
const bar = (page) => page.getByTitle('Mostrar todas as camadas').locator('xpath=..');
const right = async (loc) => { const b = await loc.boundingBox(); return b.x + b.width; };

test('Layouts_Strip_RowsHugTheirContent', async ({ page }) => {
  await loaded(page);
  const chips = page.locator('[data-layout-chip]');
  const strip = page.locator('[data-layout-strip]');
  expect((await right(strip)) - (await right(chips.last()))).toBeLessThanOrEqual(12);
  const rail = bar(page).locator('button').last();
  expect((await right(bar(page))) - (await right(rail))).toBeLessThanOrEqual(12);
  // the pill sits above the bar (column), it does not widen it
  const sb = await strip.boundingBox(); const bb = await bar(page).boundingBox();
  expect(sb.y + sb.height).toBeLessThanOrEqual(bb.y);
});

test('Layouts_Strip_SingleLayoutBarKeepsItsWidth', async ({ page }) => {
  await loaded(page, '/?layers=fixtures/traval/');
  await expect(page.locator('[data-layout-strip]')).toHaveCount(0);
  const tb = await bar(page).boundingBox();
  expect(Math.abs(tb.width - 675.28)).toBeLessThan(1.5);
  expect(tb.height).toBe(30);
  await loaded(page, '/?layers=fixtures/multi-state/');
  const mb = await bar(page).boundingBox();
  expect(Math.abs(mb.width - 168.94)).toBeLessThan(1.5);
  expect(mb.height).toBe(30);
});

test('Layouts_Strip_ReqFloorReadsRequestsOfOtherLayouts', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await page.evaluate(() => {
    const k = 'layers/v1/pending'; const cur = JSON.parse(localStorage.getItem(k) || '{"schema":1,"byProject":{}}');
    cur.byProject['folder:proj|config'] = { savedAt: Date.now(), hash: 'x', changes: [{ bad: 1 }], requests: [{ id: 'R7', layoutId: 'config', nodeKey: 'n', path: 'p', text: 't', createdAt: 1 }] };
    localStorage.setItem(k, JSON.stringify(cur));
    window.__logic.loadProject();
  });
  await expect(page.locator('[data-layout-badge="config"]')).toHaveText('1');
  expect(await page.evaluate(() => window.__logic.reqFloor)).toBe(7);
});

// S9.1a Task 4: per-layout view state (memory only), pending across switches, session stamp, TTL renewal of sibling entries.
const DAY = 24 * 60 * 60 * 1000;
const viewOf = (page) => page.evaluate(() => { const s = window.__logic.state; return { selId: s.selId, isoId: s.isoId, yaw: s.yaw, tilt: s.tilt, zoom: s.zoom, panX: s.panX, panY: s.panY, flat: s.flat, explodeFrom: s.explodeFrom, collapseAt: s.collapseAt }; });
const settled = (page, id) => expect.poll(async () => { await act(page); return page.evaluate((id) => { const l = window.__logic; return !!l.state.project && l.state.project.layoutId === id && l.loadedSeq === l.loadSeq; }, id); }).toBe(true);
const storedPending = (page) => page.evaluate(() => { const raw = localStorage.getItem('layers/v1/pending'); return raw ? (JSON.parse(raw).byProject || {}) : {}; });
const seedPending = (page, ages) => page.evaluate((ages) => {
  const k = 'layers/v1/pending'; const cur = JSON.parse(localStorage.getItem(k) || '{"schema":1,"byProject":{}}');
  Object.keys(ages).forEach((key) => { cur.byProject[key] = { savedAt: Date.now() - ages[key], hash: 'x', changes: [], requests: [{ id: 'R7', layoutId: 'x', nodeKey: 'n', path: 'p', text: 't', createdAt: 1 }] }; });
  localStorage.setItem(k, JSON.stringify(cur));
}, ages);
const shiftClock = (page, ms) => page.evaluate((ms) => { const o = Date.now; Date.now = () => o.call(Date) + ms; }, ms);

test('Layouts_ViewState_PerLayoutSelectionAndExplode', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  // main (state empty) has 0.0 and 0.1; config has 0.0, 0.1 and 0.2
  await act(page, 'setState', { flat: true, yaw: 0.5, tilt: 0.25, zoom: 1.5, panX: 10, panY: 5 });
  await act(page, 'select', '0.1');
  await act(page, 'explodeHere', '0.1');
  const mainView = await viewOf(page);
  expect(mainView).toMatchObject({ selId: '0.1', explodeFrom: '0.1', yaw: 0.5, zoom: 1.5, panX: 10, flat: true });
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  // config has no view of its own: nothing of main's selection or explode leaks in, the camera is the default one
  expect(await viewOf(page)).toMatchObject({ selId: '0', explodeFrom: null, collapseAt: null, yaw: 0, tilt: 0, zoom: 1, panX: 0, panY: 0 });
  await act(page, 'setState', { yaw: -0.7, zoom: 2 });
  await act(page, 'select', '0.2');
  await act(page, 'explodeHere', '0.2');
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  expect(await viewOf(page)).toEqual(mainView);
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect(await viewOf(page)).toMatchObject({ selId: '0.2', explodeFrom: '0.2', yaw: -0.7, zoom: 2 });
  // a cached id the layout no longer has falls back to the root / no explode instead of leaking
  await page.evaluate(() => { const l = window.__logic; l.viewCache['folder:proj'] = { ...l.viewCache['folder:proj'], selId: '0.9', isoId: '0.9', explodeFrom: '0.9' }; });
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  expect(await viewOf(page)).toMatchObject({ selId: '0', isoId: null, explodeFrom: null, yaw: 0.5 });
});

test('Layouts_PendingChange_SurvivesSwitchAndReturn', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await typeShadow(page);
  const change = await page.evaluate(() => window.__logic.state.changes[0]);
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  expect(await page.evaluate(() => window.__logic.state.changes.length)).toBe(0);
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await expect.poll(() => page.evaluate(() => window.__logic.state.changes.length)).toBe(1);
  expect(await page.evaluate(() => window.__logic.state.changes[0])).toEqual(change);
  expect(await page.evaluate(() => window.__logic.state.modal)).toBeNull();
  expect(Object.keys(await storedPending(page))).toEqual(['folder:proj|config']);
});

test('Layouts_CodeBuf_AsksBeforeSwitch', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await typeShadow(page);
  await act(page, 'setState', { codeBuf: { 'layers/shared.css': '.title{color:red}' } });
  await act(page, 'switchLayout', 'config');
  await expect(page.getByText('Há código não salvo; trocar de layout descarta o código editado.')).toBeVisible();
  expect(await layoutId(page)).toBe('main');
  await page.getByRole('button', { name: 'Trocar', exact: true }).click();
  await settled(page, 'config');
  expect(await page.evaluate(() => Object.keys(window.__logic.state.codeBuf))).toEqual([]);
  expect((await storedPending(page))['folder:proj'].changes).toHaveLength(1);
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  await expect.poll(() => page.evaluate(() => window.__logic.state.changes.length)).toBe(1);
});

test('Layouts_Reload_RestoresActiveLayout', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await act(page, 'switchLayout', 'replay');
  await settled(page, 'replay');
  await act(page, 'select', '0.3');
  await act(page, 'setState', { yaw: 0.4, zoom: 1.8 });
  await expect.poll(() => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('layers/v1/session') || '{}'); return [s.viewLayout, s.selId, s.camera && s.camera.yaw]; })).toEqual(['replay', '0.3', 0.4]);
  await reloadWith(page);
  await settled(page, 'replay');
  expect(await viewOf(page)).toMatchObject({ selId: '0.3', yaw: 0.4, zoom: 1.8 });
});

test('Layouts_Reload_IgnoresViewStampedWithAnotherLayout', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  // tab closed mid-switch: `layouts` already names replay, the camera/selection still belong to main
  await reloadWith(page, { viewLayout: 'main', layouts: { 'folder:proj': 'replay' }, selId: '0.1', camera: { yaw: 0.9, zoom: 2 } });
  await settled(page, 'replay');
  expect(await viewOf(page)).toMatchObject({ selId: '0', yaw: 0, zoom: 1 });
});

test('Layouts_SingleLayoutSession_HasNoLayoutKeys', async ({ page }) => {
  await open(page, 'multi-state');
  await act(page);
  const snap = await page.evaluate(() => window.__logic.sessionSnapshot());
  expect('viewLayout' in snap).toBe(false);
  expect('layouts' in snap).toBe(false);
  expect(Object.keys(snap)).toEqual(['lastProjectId', 'states', 'selId', 'isoId', 'camera', 'explodeFrom', 'collapseAt']);
});

test('Layouts_ProjectSwitch_ClearsViewCache', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await act(page, 'select', '0.1');
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect(await page.evaluate(() => Object.keys(window.__logic.viewCache))).toEqual(['folder:proj']);
  // a view stamped with another project never applies, even for the same layout id
  await page.evaluate(() => { const l = window.__logic; l.pendingView = { projectId: 'folder:other', layoutId: 'config', view: { selId: '0.2', isoId: null, yaw: 0.7, tilt: 0, zoom: 3, panX: 0, panY: 0, flat: false, explodeFrom: null, collapseAt: null } }; l.loadProject(); });
  await settled(page, 'config');
  expect(await viewOf(page)).toMatchObject({ selId: '0', yaw: 0, zoom: 1 });
  expect(await page.evaluate(() => window.__logic.pendingView)).toBeNull();
  // unloading (reset / failed load) empties the cache
  await act(page, 'unloadProject');
  expect(await page.evaluate(() => window.__logic.viewCache)).toEqual({});
});

// The active layout's own write renews the entries of layouts nobody opened; a second write 29 simulated days later
// would find them expired (58 days old) had the first one not renewed them.
const rewrite = (page) => page.evaluate(() => { window.__logic.pendingDirty = true; window.__logic.writePending(); });

test('Layouts_UnopenedLayoutRequests_SurviveTtl', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await seedPending(page, { 'folder:proj|config': 29 * DAY, 'folder:proj|replay': 29 * DAY });
  await typeShadow(page); // main is active: writes folder:proj
  await expect.poll(async () => { const s = await storedPending(page); const now = await page.evaluate(() => Date.now()); return ['folder:proj|config', 'folder:proj|replay'].map((k) => s[k] ? now - s[k].savedAt < DAY : null); }).toEqual([true, true]);
  await shiftClock(page, 29 * DAY);
  await rewrite(page);
  const stored = await storedPending(page);
  expect(Object.keys(stored).sort()).toEqual(['folder:proj', 'folder:proj|config', 'folder:proj|replay']);
  expect((await page.evaluate(() => Date.now())) - stored['folder:proj|config'].savedAt).toBeLessThan(DAY);
});

test('Layouts_UnopenedLayoutRequests_MainEntrySurvivesWhileWorkingElsewhere', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await seedPending(page, { 'folder:proj': 29 * DAY });
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await typeShadow(page); // config is active: writes folder:proj|config; `main` is declared, so the base entry is renewed too
  await expect.poll(async () => { const s = await storedPending(page); return s['folder:proj'] ? (await page.evaluate(() => Date.now())) - s['folder:proj'].savedAt < DAY : null; }).toBe(true);
  await shiftClock(page, 29 * DAY);
  await rewrite(page);
  expect(Object.keys(await storedPending(page)).sort()).toEqual(['folder:proj', 'folder:proj|config']);
});

// S9.1a Task 5: manual requests carry their layout, R<n> stays unique across layouts and the export merges every layout.
const footer = (page) => page.locator('[data-req-footer]');
const mdOf = (page) => page.evaluate(() => window.__logic.requestsMd());
const reqsOf = (page) => page.evaluate(() => window.__logic.state.requests.map((r) => ({ id: r.id, layoutId: r.layoutId })));

test.describe('Layouts_Requests', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('Request_MultiLayout_IdsUniqueAndExportGrouped', async ({ page }) => {
    await open(page, 'multi-layout');
    await act(page);
    await act(page, 'addRequest', '0.1');
    await expect.poll(() => reqsOf(page)).toEqual([{ id: 'R1', layoutId: 'main' }]);
    await act(page, 'switchLayout', 'config');
    await settled(page, 'config');
    await act(page, 'addRequest', '0.1');
    await expect.poll(() => reqsOf(page)).toEqual([{ id: 'R2', layoutId: 'config' }]);
    await expect.poll(async () => (await mdOf(page)).includes('layout: config')).toBe(true);
    const md = await mdOf(page);
    expect(md).toContain('· 4 layouts');
    expect(md).toContain('### R1');
    expect(md).toContain('### R2');
    expect(md).toContain('layout: main');
    expect(md.indexOf('### R1')).toBeLessThan(md.indexOf('### R2'));
    // the Ajustes block lists only the active layout; the other one is a count line
    await expect(page.locator('[data-req="R2"]')).toBeVisible();
    await expect(page.locator('[data-req="R1"], [data-req-row="R1"]')).toHaveCount(0);
    await expect(page.locator('[data-req-other]')).toHaveText('outros layouts: Main (1)');
    await expect(footer(page)).toContainText('2');
  });

  test('Request_Export_WorksWhenActiveLayoutHasNone', async ({ page }) => {
    await open(page, 'multi-layout');
    await act(page);
    await act(page, 'addRequest', '0.1');
    await expect.poll(async () => { const s = await storedPending(page); return s['folder:proj'] ? s['folder:proj'].requests.length : 0; }).toBe(1);
    await act(page, 'switchLayout', 'replay');
    await settled(page, 'replay');
    expect(await reqsOf(page)).toEqual([]);
    await expect(footer(page)).toBeVisible();
    await footer(page).getByRole('button', { name: /Requisições Manuais/ }).click();
    await expect(footer(page).getByRole('button', { name: 'Copiar', exact: true })).toBeEnabled();
    await expect(footer(page).getByRole('button', { name: /Exportar/ })).toBeEnabled();
    await footer(page).getByRole('button', { name: 'Copiar', exact: true }).click();
    await expect(page.getByText('1 requisição copiada como Markdown.')).toBeVisible();
    await footer(page).getByRole('button', { name: /Exportar/ }).click();
    await expect(page.getByText('1 requisição gravada em layers-requests.md.')).toBeVisible();
    expect(await mdOf(page)).toContain('layout: main');
  });

  test('Request_SingleLayoutProject_KeepsMainAndPlainHeader', async ({ page }) => {
    await open(page, 'axai');
    await act(page);
    await act(page, 'addRequest', '0.0');
    await expect.poll(() => reqsOf(page)).toEqual([{ id: 'R1', layoutId: 'main' }]);
    const md = await mdOf(page);
    expect(md).toMatch(/^## Requisições Manuais · [^\n]* · 1\n/);
    expect(md).not.toContain('layouts');
    expect(md).not.toContain('layout:');
    await expect(page.locator('[data-req-other]')).toHaveCount(0);
  });
});

test('Layouts_Interactions_FilteredByLayout', async ({ page }) => {
  await loaded(page);
  const inter = () => page.evaluate(() => window.__logic.state.project.inter.map((x) => [x.index, x.item.key]));
  const labels = async () => {
    await page.getByText('Interagir', { exact: false }).first().click();
    await expect(page.getByText('Modo interativo').first()).toBeVisible();
    const out = { all: await page.getByText('All layouts', { exact: true }).count(), cfg: await page.getByText('Config only', { exact: true }).count(), rpl: await page.getByText('Replay only', { exact: true }).count() };
    await page.keyboard.press('Escape');
    return out;
  };
  expect(await inter()).toEqual([[0, 'hint']]);
  expect(await labels()).toEqual({ all: 1, cfg: 0, rpl: 0 });
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect(await inter()).toEqual([[0, 'hint'], [1, 'cfg']]);
  expect(await labels()).toEqual({ all: 1, cfg: 1, rpl: 0 });
  await act(page, 'switchLayout', 'replay');
  await settled(page, 'replay');
  expect(await inter()).toEqual([[0, 'hint'], [2, 'rpl']]);
  expect(await labels()).toEqual({ all: 1, cfg: 0, rpl: 1 });
});

// S9.1a Task 6: Reanalisar backs up every declared layout's mock, keeps the mounted layout; Zerar interface closes the layout keys.
// Test-local project: the shared fixture's config/replay mocks move to two folders under the SAME basename (index.html).
async function sameBasenameProject(page) {
  await open(page, 'multi-layout');
  await page.evaluate(async () => {
    const put = async (dir, name, text) => { const w = await (await dir.getFileHandle(name, { create: true })).createWritable(); await w.write(text); await w.close(); };
    const layers = await window.__proj.getDirectoryHandle('layers');
    const man = JSON.parse(await (await (await window.__proj.getFileHandle('layers.json')).getFile()).text());
    man.layouts.find((l) => l.id === 'config').mock = 'layers/cfg/index.html';
    man.layouts.find((l) => l.id === 'replay').mock = 'layers/rpl/index.html';
    await put(await layers.getDirectoryHandle('cfg', { create: true }), 'index.html', '<!doctype html><html><body><div id="cfg-title">Config</div></body></html>');
    await put(await layers.getDirectoryHandle('rpl', { create: true }), 'index.html', '<!doctype html><html><body><div id="rpl-bar">Replay</div></body></html>');
    await put(window.__proj, 'layers.json', JSON.stringify(man));
  });
  await reloadWith(page);
  await act(page);
  await settled(page, 'main');
}

test('Layouts_Reanalisar_BacksUpAllLayoutMocks', async ({ page }) => {
  await sameBasenameProject(page);
  await act(page, 'doRestructure');
  await expect.poll(async () => (await listDisk(page, '.design-history')).length).toBe(1);
  const stamp = '.design-history/' + (await listDisk(page, '.design-history'))[0];
  await expect.poll(() => listDisk(page, stamp + '/layouts/replay')).toEqual(['index.html']);
  expect(await listDisk(page, stamp)).toEqual(['layers.json', 'layouts', 'main.html']);
  expect(await listDisk(page, stamp + '/layouts')).toEqual(['config', 'replay']);
  expect(await readDisk(page, stamp + '/layouts/config/index.html')).toContain('cfg-title');
  expect(await readDisk(page, stamp + '/layouts/replay/index.html')).toContain('rpl-bar');
  // the unreadable `broken` mock is a warning in the toast, not a failure
  await expect(page.getByText(/layouts\/config\/index\.html, layouts\/replay\/index\.html\)/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/mock não lido, fora do backup: Broken/)).toBeVisible();
});

test('Layouts_Reanalisar_KeepsActiveLayout', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await act(page, 'switchLayout', 'replay');
  await settled(page, 'replay');
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  const keys = () => page.evaluate(() => Object.keys(window.__logic.viewCache).sort());
  expect(await keys()).toEqual(['folder:proj', 'folder:proj|config', 'folder:proj|replay']);
  await act(page, 'doRestructure');
  await expect(page.getByText(/layout anterior salvo em \.design-history\/layout-/)).toBeVisible({ timeout: 10000 });
  await settled(page, 'config');
  expect(await layoutId(page)).toBe('config');
  expect((await mounted(page)).ids).toEqual(['cfg-field', 'cfg-panel', 'cfg-title']);
  expect(await page.evaluate(() => window.__logic.layoutMap['folder:proj'])).toBe('config');
  // only the active layout's remembered view goes; the others keep theirs
  expect(await keys()).toEqual(['folder:proj', 'folder:proj|replay']);
});

test('Layouts_ResetUi_ClearsLayoutKeys', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await seedPending(page, { 'folder:proj|replay': 0, 'folder:proj|broken': 0, 'folder:proj': 0 });
  await act(page, 'addRequest', '0.1');
  await expect.poll(async () => Object.keys(await storedPending(page)).sort()).toEqual(['folder:proj', 'folder:proj|broken', 'folder:proj|config', 'folder:proj|replay']);
  await act(page, 'resetUI');
  await expect.poll(() => page.evaluate(() => window.__logic.state.project)).toBeNull();
  expect(await page.evaluate(() => ({ map: window.__logic.layoutMap['folder:proj'], cache: window.__logic.viewCache, other: window.__logic.otherRequests, floor: window.__logic.reqFloor, badges: window.__logic.state.layoutBadges }))).toEqual({ map: undefined, cache: {}, other: {}, floor: 0, badges: {} });
  // the whole project goes: `<base>|*` and, because `main` is declared but not the active layout, the exact `<base>` entry too
  expect(Object.keys(await storedPending(page))).toEqual([]);
});

// baseKey only moves once layers.json parses: after a failed load of ANOTHER source it still names the previous project, whose entries Zerar must not touch.
test('Layouts_ResetUi_AfterFailedLoadOfAnotherSource_KeepsPreviousProjectEntries', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await seedPending(page, { 'folder:proj|x': 0 });
  await page.evaluate(async () => {
    const w = await (await window.__proj.getFileHandle('layers.json')).createWritable(); await w.write('{ not json'); await w.close();
    window.__logic.projectId = 'folder:other'; // what connecting another source does before its load
    window.__logic.loadProject();
  });
  await expect(page.getByText('layers.json inválido.')).toBeVisible({ timeout: 10000 });
  expect(await page.evaluate(() => window.__logic.baseKey)).toBe('folder:proj');
  await page.evaluate(() => window.__logic.resetUI()); // no plane is mounted after the failed load, so `act` cannot find the instance
  expect(Object.keys(await storedPending(page))).toContain('folder:proj|x');
});
