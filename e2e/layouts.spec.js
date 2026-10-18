import { test, expect } from '@playwright/test';
import { readNodes, lastTreeRow } from './tree-helpers.js';
import { act, open, reloadWith } from './ctx-helpers.js';

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
