import { test, expect } from '@playwright/test';
import { readNodes, lastTreeRow, treeRow } from './tree-helpers.js';
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

test('Layouts_DeadInteractions_OnlyCheckTheActiveLayoutsItems', async ({ page }) => {
  await page.route('**/multi-layout/layers.json*', async (route) => {
    const res = await route.fetch(); const man = await res.json();
    man.interactions.push(
      { key: 'dm', label: 'Dead main', layout: 'main', groups: [{ label: 'g', items: [{ label: 'x', toggle: '.nope-main' }] }] },
      { key: 'dc', label: 'Dead config', layout: 'config', groups: [{ label: 'g', items: [{ label: 'y', toggle: '.nope-config' }] }] },
    );
    await route.fulfill({ response: res, json: man });
  });
  await loaded(page);
  const warn = () => page.evaluate(() => JSON.stringify(window.__logic.state.project.warn));
  const w = await warn();
  expect(w).toContain('.nope-main');
  expect(w).not.toContain('.nope-config');
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  const w2 = await warn();
  expect(w2).toContain('.nope-config');
  expect(w2).not.toContain('.nope-main');
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

test('Layouts_SwitchWithAdjustmentsOverTheCap_ConfirmsBeforeLosingThem', async ({ page }) => {
  await loaded(page);
  await typeShadow(page);
  // pendingReady stays true: only the cap makes the burst unstorable
  await page.evaluate(() => { window.LayersCore.PENDING_CAP = 0; });
  await act(page, 'switchLayout', 'config');
  await expect(page.getByText(/Há ajustes que não podem ser salvos neste projeto; trocar de layout os perde\./)).toBeVisible();
  expect(await layoutId(page)).toBe('main');
  await page.getByRole('button', { name: 'Trocar', exact: true }).click();
  await expect.poll(() => layoutId(page)).toBe('config');
});

test('Layouts_SwitchAfterQuotaWarning_ConfirmsBeforeLosingAdjustments', async ({ page }) => {
  await loaded(page);
  await typeShadow(page);
  // the last write failed (storage full): the stored entry is gone, the adjustments live only in memory
  await page.evaluate(() => { window.__logic.pendingQuotaWarned = true; });
  await act(page, 'switchLayout', 'config');
  await expect(page.getByText(/Há ajustes que não podem ser salvos neste projeto; trocar de layout os perde\./)).toBeVisible();
  expect(await layoutId(page)).toBe('main');
  await page.getByRole('button', { name: 'Trocar', exact: true }).click();
  await expect.poll(() => layoutId(page)).toBe('config');
});

test('Layouts_SiblingTouchFails_WarnsAndKeepsTheStoredEntries', async ({ page }) => {
  await loaded(page);
  await typeShadow(page);
  const KEY = 'fx:fixtures/multi-layout|config';
  await expect.poll(() => page.evaluate(() => localStorage.getItem('layers/v1/pending'))).not.toBeNull();
  await page.evaluate((k) => {
    const all = JSON.parse(localStorage.getItem('layers/v1/pending'));
    all.byProject[k] = { savedAt: Date.now() - 1000, hash: 'h', changes: [], requests: [{ id: 'R1', createdAt: 1, text: 'keep me' }] };
    localStorage.setItem('layers/v1/pending', JSON.stringify(all));
    // the next write to the pending key (the sibling touch) throws once; the setPending after it succeeds
    const orig = Storage.prototype.setItem; let armed = true;
    Storage.prototype.setItem = function (key, v) { if (armed && key === 'layers/v1/pending') { armed = false; throw new Error('quota'); } return orig.call(this, key, v); };
    window.__logic.pendingDirty = true; window.__logic.writePending();
    Storage.prototype.setItem = orig;
  }, KEY);
  await expect(page.getByText('Não foi possível salvar os ajustes e requisições pendentes: armazenamento cheio.')).toBeVisible();
  expect(await page.evaluate(() => window.__logic.pendingQuotaWarned)).toBe(true);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('layers/v1/pending')).byProject);
  expect(Object.keys(stored).sort()).toEqual(['fx:fixtures/multi-layout', KEY]);
  expect(stored[KEY].requests).toHaveLength(1);
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
    l.loadProject().then(() => { window.__aDone = true; }); // A (slow)
    l.layoutMap[l.baseKey] = 'replay';
    l.loadProject(); // B (fast, supersedes A)
  });
  await expect.poll(() => layoutId(page)).toBe('replay');
  expect(await page.evaluate(() => window.__logic.pendingKey)).toBe('fx:fixtures/multi-layout|replay');
  // A resolves now; had it passed the parse it would resolve main and overwrite the live keys
  await page.evaluate(() => { window.__logic.layoutMap['fx:fixtures/multi-layout'] = 'main'; });
  await expect.poll(() => page.evaluate(() => window.__aDone === true), { timeout: 10_000 }).toBe(true);
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

// Layout ids are user text: names that live on Object.prototype must behave like any other id in the per-layout maps.
test('Layouts_PrototypeNamedIds_BehaveLikeAnyOtherLayout', async ({ page }) => {
  await page.route('**/multi-layout/layers.json*', async (route) => {
    const res = await route.fetch(); const man = await res.json();
    man.layouts.push({ id: 'constructor', name: 'Ctor', mock: 'layers/config.html' }, { id: '__proto__', name: 'Proto', mock: 'layers/config.html' }, { id: 'toString', name: 'Str', mock: 'layers/config.html' });
    await route.fulfill({ response: res, json: man });
  });
  await loaded(page);
  // no pending anywhere: no badge and a plain title, not `Object.prototype` members leaking through the lookups
  await expect(page.locator('[data-layout-badge]')).toHaveCount(0);
  await expect(chip(page, 'constructor')).toHaveAttribute('title', 'Ctor');
  await expect(chip(page, 'toString')).toHaveAttribute('title', 'Str');
  expect(await page.evaluate(() => Object.keys(window.__logic.otherRequests))).toEqual([]);
  await seedPending(page, { 'fx:fixtures/multi-layout|constructor': 0, 'fx:fixtures/multi-layout|__proto__': 0 });
  await loaded(page);
  await expect(page.locator('[data-layout-badge="constructor"]')).toHaveText('1');
  await expect(page.locator('[data-layout-badge="__proto__"]')).toHaveText('1');
  await expect(page.locator('[data-layout-badge="toString"]')).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(window.__logic.otherRequests).sort())).toEqual(['__proto__', 'constructor']);
  await act(page, 'switchLayout', '__proto__');
  await settled(page, '__proto__');
  await act(page, 'select', '0.1');
  await act(page, 'switchLayout', 'constructor');
  await settled(page, 'constructor');
  await act(page, 'switchLayout', '__proto__');
  await settled(page, '__proto__');
  expect((await viewOf(page)).selId).toBe('0.1');
});

// Fix round 1: the strip is its own pill above the Camadas bar, so neither row stretches the other (no empty band).
// Widths captured from the unchanged bar (before the strip existed) on the 1280x760 viewport.
const bar = (page) => page.getByTitle('Mostrar todas as camadas').locator('xpath=..');
const right = async (loc) => { const b = await loc.boundingBox(); return b.x + b.width; };

test('Layouts_Strip_RowsHugTheirContent', async ({ page }) => {
  await loaded(page);
  const chips = page.locator('[data-layout-chip], [data-spread-btn]'); // S9.1c Task 5: the Espalhar button is now the last item of the row
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
  expect(await viewOf(page)).toMatchObject({ selId: '0', explodeFrom: null, collapseAt: null, yaw: 0, tilt: 0, zoom: 1, panX: 0, panY: 0, flat: true }); // the flat/3D mode is a display mode: a layout without a cached view keeps it
  await act(page, 'setState', { yaw: -0.7, zoom: 2 });
  await act(page, 'select', '0.2');
  await act(page, 'explodeHere', '0.2');
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  expect(await viewOf(page)).toEqual(mainView);
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect(await viewOf(page)).toMatchObject({ selId: '0.2', explodeFrom: '0.2', yaw: -0.7, zoom: 2, flat: true });
  // a cached id the layout no longer has falls back to the root / no explode instead of leaking
  await page.evaluate(() => { const l = window.__logic; l.viewCache['folder:proj'] = { ...l.viewCache['folder:proj'], selId: '0.9', isoId: '0.9', explodeFrom: '0.9' }; });
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  expect(await viewOf(page)).toMatchObject({ selId: '0', isoId: null, explodeFrom: null, yaw: 0.5 });
});

test('Layouts_ViewState_IsolationRoundTrips', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await act(page, 'isolate', '0.1');
  expect(await viewOf(page)).toMatchObject({ selId: '0.1', isoId: '0.1' });
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect(await viewOf(page)).toMatchObject({ selId: '0', isoId: null });
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  expect(await viewOf(page)).toMatchObject({ selId: '0.1', isoId: '0.1' });
});

// A real useDir swap to a project of another name: views are keyed by the project base, so nothing crosses over.
test('Layouts_ViewState_UseDirRoundTripKeepsViewsPerProject', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await page.evaluate(async () => {
    const copy = async (src, dst) => {
      for await (const [name, h] of src.entries()) {
        if (h.kind === 'directory') await copy(h, await dst.getDirectoryHandle(name, { create: true }));
        else { const w = await (await dst.getFileHandle(name, { create: true })).createWritable(); await w.write(await (await h.getFile()).text()); await w.close(); }
      }
    };
    const other = await (await navigator.storage.getDirectory()).getDirectoryHandle('other', { create: true });
    await copy(window.__proj, other);
    window.__other = other;
  });
  await act(page, 'select', '0.1');
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await page.evaluate(() => window.__logic.useDir(window.__other));
  await expect.poll(() => page.evaluate(() => window.__logic.projectId)).toBe('folder:other');
  await settled(page, 'main');
  expect(await viewOf(page)).toMatchObject({ selId: '0' });
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await act(page, 'select', '0.2');
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  await page.evaluate(() => window.__logic.useDir(window.__proj));
  await expect.poll(() => page.evaluate(() => window.__logic.projectId)).toBe('folder:proj');
  await settled(page, 'config');
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  expect((await viewOf(page)).selId).toBe('0.1');
  // both projects keep their own config view under their own key
  expect(await page.evaluate(() => ({ other: window.__logic.viewCache['folder:other|config'].selId, proj: window.__logic.viewCache['folder:proj|config'].selId }))).toEqual({ other: '0.2', proj: '0' });
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect((await viewOf(page)).selId).toBe('0');
});

test('Layouts_SingleLayoutProject_NeverTouchesSiblingEntries', async ({ page }) => {
  await loaded(page, '/?layers=fixtures/multi-state/');
  await page.evaluate(() => { const c = window.LayersCore; window.__touches = 0; const o = c.touchLayoutEntries; c.touchLayoutEntries = (...a) => { window.__touches += 1; return o(...a); }; });
  await typeShadow(page);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('layers/v1/pending'))).not.toBeNull();
  expect(await page.evaluate(() => window.__touches)).toBe(0);
});

test('Layouts_TouchSiblings_RunsForMultiLayoutProjects', async ({ page }) => {
  await loaded(page);
  await page.evaluate(() => { const c = window.LayersCore; window.__touches = 0; const o = c.touchLayoutEntries; c.touchLayoutEntries = (...a) => { window.__touches += 1; return o(...a); }; });
  await typeShadow(page);
  await expect.poll(() => page.evaluate(() => window.__touches)).toBeGreaterThan(0);
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

test('Layouts_Reload_StaleLayoutIdIsDroppedSoTheViewRestoresNextTime', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  // `layouts` names a layout that no longer exists: the load falls back to the first one and forgets the stale id
  await reloadWith(page, { layouts: { 'folder:proj': 'ghost' } });
  await settled(page, 'main');
  expect(await page.evaluate(() => Object.keys(window.__logic.layoutMap))).toEqual([]);
  await act(page, 'select', '0.1');
  await act(page, 'setState', { yaw: 0.6, zoom: 1.7 });
  await expect.poll(() => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('layers/v1/session') || '{}'); return [s.viewLayout, 'layouts' in s, s.selId, s.camera && s.camera.yaw]; })).toEqual(['main', false, '0.1', 0.6]);
  await reloadWith(page);
  await settled(page, 'main');
  expect(await viewOf(page)).toMatchObject({ selId: '0.1', yaw: 0.6, zoom: 1.7 });
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

// A write that fails (or a folder swapped mid-backup) cancels the whole Reanalisar and removes the half-written stamp.
test('Layouts_Reanalisar_FailedExtraMockWrite_CancelsAndRemovesTheStamp', async ({ page }) => {
  await sameBasenameProject(page);
  await page.evaluate(() => { const l = window.__logic, o = l.writeText.bind(l); l.writeText = (p, t) => (p.includes('/layouts/replay/') ? Promise.reject(new Error('disk full')) : o(p, t)); });
  await act(page, 'doRestructure');
  await expect(page.getByText(/Reanálise cancelada: o backup do layout falhou — disk full/)).toBeVisible({ timeout: 10000 });
  await expect.poll(() => listDisk(page, '.design-history')).toEqual([]);
  expect(await layoutId(page)).toBe('main');
});

test('Layouts_Reanalisar_FolderSwappedBetweenMockWrites_Cancels', async ({ page }) => {
  await sameBasenameProject(page);
  await page.evaluate(() => { const l = window.__logic, o = l.writeText.bind(l); l.writeText = async (p, t) => { await o(p, t); if (p.includes('/layouts/config/')) l.setState({ dir: { name: 'swapped' } }); }; });
  await act(page, 'doRestructure');
  await expect(page.getByText(/Reanálise cancelada: o backup do layout falhou — a pasta conectada mudou durante o backup/)).toBeVisible({ timeout: 10000 });
  await expect.poll(() => listDisk(page, '.design-history')).toEqual([]);
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

// An incomplete load (pendingReady false, key set) never wrote the saved entry: Zerar must leave the whole project's entries for the next complete load.
test('Layouts_ResetUi_AfterIncompleteLoad_KeepsSavedEntries', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await seedPending(page, { 'folder:proj|replay': 0, 'folder:proj': 0 });
  await act(page, 'addRequest', '0.1');
  await expect.poll(async () => Object.keys(await storedPending(page)).sort()).toEqual(['folder:proj', 'folder:proj|config', 'folder:proj|replay']);
  await page.evaluate(() => { window.__logic.pendingReady = false; });
  await act(page, 'resetUI');
  await expect.poll(() => page.evaluate(() => window.__logic.state.project)).toBeNull();
  expect(Object.keys(await storedPending(page)).sort()).toEqual(['folder:proj', 'folder:proj|config', 'folder:proj|replay']);
});

// baseKey only moves once layers.json parses: after a failed load of ANOTHER source it still names the previous project, whose entries Zerar must not touch.
test('Layouts_ResetUi_AfterFailedLoadOfAnotherSource_KeepsPreviousProjectEntries', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await seedPending(page, { 'folder:proj|x': 0 });
  await page.evaluate(() => { window.__logic.layoutMap['folder:proj'] = 'replay'; });
  await page.evaluate(async () => {
    const w = await (await window.__proj.getFileHandle('layers.json')).createWritable(); await w.write('{ not json'); await w.close();
    window.__logic.projectId = 'folder:other'; // what connecting another source does before its load
    window.__logic.loadProject();
  });
  await expect(page.getByText('layers.json inválido.')).toBeVisible({ timeout: 10000 });
  expect(await page.evaluate(() => window.__logic.baseKey)).toBe('folder:proj');
  await page.evaluate(() => window.__logic.resetUI()); // no plane is mounted after the failed load, so `act` cannot find the instance
  expect(Object.keys(await storedPending(page))).toContain('folder:proj|x');
  expect(await page.evaluate(() => window.__logic.layoutMap['folder:proj'])).toBe('replay');
});

// S9.1d Task 2: ONE undo stack for the whole project; each step names the layout it was made in.
async function pressKey(page, combo) {
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press(combo);
  await page.waitForTimeout(200);
}
const stackIds = async (page) => { await act(page); return page.evaluate(() => ({ undo: window.__logic.undoS.map((s) => s.layoutId), redo: window.__logic.redoS.map((s) => s.layoutId) })); };
const changeCount = (page) => page.evaluate(() => window.__logic.state.changes.length);
// Inline box-shadow carrying SHADOW, counted on the DOM actually mounted (never on logic.els, which can be stale).
const shadowCount = (page) => page.evaluate(() => {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  return [...host.shadowRoot.querySelectorAll('*')].filter((e) => e.localName !== 'style' && e.style.boxShadow.includes('rgb(1, 2, 3)')).length;
});

test('Undo_EditInOtherLayout_SwitchesBackAndRestores', async ({ page }) => {
  await loaded(page);
  await typeShadow(page); // step in main
  expect(await stackIds(page)).toEqual({ undo: ['main'], redo: [] });
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect((await stackIds(page)).undo).toEqual(['main']); // the layout switch no longer wipes the stack
  await pressKey(page, 'Control+z');
  await settled(page, 'main');
  await expect.poll(() => changeCount(page)).toBe(0);
  expect(await shadowCount(page)).toBe(0); // the INLINE style of the mounted main is back to empty
  expect(await stackIds(page)).toEqual({ undo: [], redo: ['main'] });
  await expect(page.getByText(/Desfeito em Main/)).toBeVisible();
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await pressKey(page, 'Control+Shift+z');
  await settled(page, 'main');
  await expect.poll(() => changeCount(page)).toBe(1);
  expect(await shadowCount(page)).toBe(1);
  expect(await page.evaluate(() => window.__logic.state.changes[0].to)).toBe(SHADOW);
  expect(await stackIds(page)).toEqual({ undo: ['main'], redo: [] });
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await pressKey(page, 'Control+z'); // and Ctrl+Z once more, now via the 'switch' path from the other side
  await settled(page, 'main');
  await expect.poll(() => changeCount(page)).toBe(0);
  expect(await shadowCount(page)).toBe(0);
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await pressKey(page, 'Control+y');
  await settled(page, 'main');
  await expect.poll(() => changeCount(page)).toBe(1);
  expect(await shadowCount(page)).toBe(1);
});

// config's `.panel` (node 0.1) lives in layers/config.css; a new box-shadow there is a real file patch.
async function shadowOnPanel(page) {
  await act(page, 'select', '0.1');
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(SHADOW);
  await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() => window.__logic.state.changes.length)).toBe(1);
}

test('Undo_AfterApply_DropsStepsOfIncludedLayouts', async ({ page }) => {
  await open(page, 'multi-layout'); // connected folder: the draft/approve flow needs a writable dir
  await act(page);
  await typeShadow(page); // step in main
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await shadowOnPanel(page); // step in config, on .panel: config.css is a patchable source, so Aplicar rewrites it
  expect((await stackIds(page)).undo).toEqual(['main', 'config']);
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Aplicar nos arquivos', { exact: false }).first().click();
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
  // Task 4: main's pending was part of the plan too (its hash matches the probe), so its steps go with config's
  expect(await stackIds(page)).toEqual({ undo: [], redo: [] });
  await expect.poll(() => storedPending(page)).toEqual({});
  // approve moved the source hash on purpose: a later round trip must not read that as drift
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await shadowOnPanel(page); // new step in config
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect((await stackIds(page)).undo).toContain('config');
  await expect.poll(() => changeCount(page)).toBe(1);
  await pressKey(page, 'Control+z');
  await expect.poll(() => changeCount(page)).toBe(0);
  expect((await stackIds(page)).redo).toEqual(['config']);
});

// R7: a layout loaded incomplete (missing stylesheet) has no trustworthy hash; the next complete load must drop whatever was stacked meanwhile.
test('Undo_IncompleteLoad_NextCompleteLoadDropsStepsMadeMeanwhile', async ({ page }) => {
  await loaded(page);
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  await page.route('**/multi-layout/layers/config.css*', (route) => route.fulfill({ status: 404, body: 'gone' }));
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect(await page.evaluate(() => window.__logic.pendingReady)).toBe(false); // incomplete
  await shadowOnPanel(page); // step in config while incomplete
  await act(page, 'decide', false); // without the sheet the scope is asked: answer "only this"
  await expect.poll(() => page.evaluate(() => window.__logic.state.pending)).toBeNull();
  expect((await stackIds(page)).undo).toEqual(['config']);
  await pressKey(page, 'Control+z'); // the step moves to redo and no change is left, so the switch away asks nothing
  await expect.poll(() => changeCount(page)).toBe(0);
  expect((await stackIds(page)).redo).toEqual(['config']);
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  await page.unroute('**/multi-layout/layers/config.css*');
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect(await stackIds(page)).toEqual({ undo: [], redo: [] }); // the complete load dropped what was stacked while the hash was untrusted
});

test('Undo_DriftDroppedPending_DropsOwnSteps', async ({ page }) => {
  await loaded(page);
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await typeShadow(page); // step in config
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  await typeShadow(page); // step in main
  expect((await stackIds(page)).undo).toEqual(['config', 'main']);
  // the source of config changes while away: its hash no longer matches the one its steps were made against
  await page.route('**/multi-layout/layers/config.html*', async (route) => {
    const res = await route.fetch(); const body = await res.text();
    await route.fulfill({ response: res, body: body.replace('>panel<', '>edited elsewhere<') });
  });
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect(await changeCount(page)).toBe(0);
  expect(await stackIds(page)).toEqual({ undo: ['main'], redo: [] });
});

test('Undo_PanelOpen_RefusesWithoutSwitching', async ({ page }) => {
  await loaded(page);
  await typeShadow(page); // step in main
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await page.evaluate(() => window.__logic.setState({ modal: { stage: 'confirm', log: [], title: 'Painel', label: 'Ok', text: 'aberto', onYes: () => {} } }));
  const seq0 = await page.evaluate(() => window.__logic.loadSeq);
  await pressKey(page, 'Control+z');
  await page.waitForTimeout(300);
  expect(await layoutId(page)).toBe('config');
  expect(await stackIds(page)).toEqual({ undo: ['main'], redo: [] });
  expect(await page.evaluate(() => ({ seq: window.__logic.loadSeq, busy: !!window.__logic.undoBusy }))).toEqual({ seq: seq0, busy: false });
  await expect(page.getByText(/Desfeito|feche o painel|troca de layout/)).toHaveCount(0);
});

// R6 (d): the undo needs a layout switch that asks first (unsaved code); Trocar lets the undo land, Fechar cancels it.
async function editMainThenAskOnUndo(page) {
  await loaded(page);
  await typeShadow(page); // step in main
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await act(page, 'setState', { codeBuf: { 'layers/shared.css': '.title{color:red}' } });
  await pressKey(page, 'Control+z');
  await expect(page.getByText('Há código não salvo; trocar de layout descarta o código editado.')).toBeVisible();
}

test('Undo_SwitchAsksFirst_ConfirmAppliesInTargetLayout', async ({ page }) => {
  await editMainThenAskOnUndo(page);
  expect(await layoutId(page)).toBe('config'); // nothing moved before the answer
  await shiftClock(page, 11000); // past the 10 s load cap
  await page.waitForTimeout(400); // several polls with the confirm still open: it must keep waiting
  expect(await page.evaluate(() => !!window.__logic.undoBusy)).toBe(true);
  await page.getByRole('button', { name: 'Trocar', exact: true }).click();
  await settled(page, 'main');
  await expect.poll(() => changeCount(page)).toBe(0);
  expect(await shadowCount(page)).toBe(0);
  expect(await stackIds(page)).toEqual({ undo: [], redo: ['main'] });
  await expect.poll(() => page.evaluate(() => !!window.__logic.undoBusy)).toBe(false);
});

test('Undo_SwitchAsksFirst_CancelChangesNothing', async ({ page }) => {
  await editMainThenAskOnUndo(page);
  await page.getByRole('button', { name: 'Fechar', exact: true }).first().click();
  await expect(page.getByText('troca de layout cancelada')).toBeVisible();
  expect(await layoutId(page)).toBe('config');
  expect(await stackIds(page)).toEqual({ undo: ['main'], redo: [] });
  expect(await page.evaluate(() => !!window.__logic.undoBusy)).toBe(false);
  await act(page, 'setState', { codeBuf: {} });
  await act(page, 'switchLayout', 'main'); // main still holds its edit
  await settled(page, 'main');
  await expect.poll(() => changeCount(page)).toBe(1);
  expect(await shadowCount(page)).toBe(1);
});

// R6 (c): a load in flight owns the DOM; Ctrl+Z pressed right after the switch click must not undo on the outgoing layout.
test('Undo_DuringLayoutLoad_IsIgnored', async ({ page }) => {
  await loaded(page);
  await typeShadow(page);
  await page.evaluate(() => { window.__logic.switchLayout('config'); window.__logic.undo(); });
  await settled(page, 'config');
  expect(await stackIds(page)).toEqual({ undo: ['main'], redo: [] });
  await expect(page.getByText(/Desfeito/)).toHaveCount(0);
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  await expect.poll(() => changeCount(page)).toBe(1);
  expect(await shadowCount(page)).toBe(1);
});

// R6 (b): main's undone edit leaves no pending entry, so only the per-layout source hash can tell the source moved while away.
test('Undo_SourceChangedWhileAway_DropsStepsEvenWithoutPending', async ({ page }) => {
  await loaded(page);
  await typeShadow(page);
  await pressKey(page, 'Control+z'); // main back to zero changes; the step now waits in redo
  expect(await stackIds(page)).toEqual({ undo: [], redo: ['main'] });
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await page.route('**/multi-layout/layers/main.html*', async (route) => {
    const res = await route.fetch(); const body = await res.text();
    await route.fulfill({ response: res, body: body.replace('empty', 'edited elsewhere') });
  });
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  expect(await stackIds(page)).toEqual({ undo: [], redo: [] });
  await pressKey(page, 'Control+y');
  expect(await shadowCount(page)).toBe(0);
  expect(await changeCount(page)).toBe(0);
});

// S9.1d Task 3: the probe reads the OTHER layouts quietly (no this.mtimes keys), counts their src uses, caches them and
// stays out of the way of a switch or a reload. Folder mode (OPFS), so mtimes are real.
const putDisk = (page, rel, text) => page.evaluate(async ({ rel, text }) => {
  const parts = rel.split('/'); let d = window.__proj;
  for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
  const w = await (await d.getFileHandle(parts[parts.length - 1], { create: true })).createWritable();
  await w.write(text); await w.close();
}, { rel, text });
const REPLAY_SRC = '<!doctype html>\n<html><head><meta charset="utf-8"><link rel="stylesheet" href="replay.css"></head>\n<body><div class="title" id="rpl-title">Replay</div><div class="bar" id="rpl-bar">bar</div><div class="frame" id="rpl-frame" data-src="src/r.ts|.frame|1">frame</div><div class="frame" id="rpl-frame2" data-src="src/r.ts|.frame|1">frame2</div></body></html>\n';

test('Probe_OtherLayout_ReadsQuietAndCaches', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await putDisk(page, 'layers/replay.html', REPLAY_SRC); // the file moved on disk before the probe: the probe reads what is there
  const r = await page.evaluate(async () => {
    const l = window.__logic, calls = [], orig = l.readText.bind(l);
    l.readText = (p, q) => { calls.push([p, !!q]); return orig(p, q); };
    const keys0 = Object.keys(l.mtimes);
    await l.ensureProbe();
    const afterFirst = calls.length; await l.ensureProbe();
    const out = (id) => { const e = l.layoutProbe.get(id); return e && !e.unavailable ? { uses: e.uses instanceof Map, useMap: [...e.uses], files: e.files, hash: e.hash } : e; };
    window.__cfgHash = l.layoutProbe.get('config').hash;
    const wl = l.watchLayouts, w = l.watch;
    return { keys0, keys1: Object.keys(l.mtimes), afterFirst, afterSecond: calls.length, loud: calls.filter((c) => !c[1]).map((c) => c[0]), ids: [...l.layoutProbe.keys()].sort(), cfg: out('config'), rpl: out('replay'), broken: out('broken'), host: !!document.querySelector('[data-lod-host]'), wlCss: wl['layers/config.css'], wlShared: 'layers/shared.css' in wl, wCss: typeof w['layers/config.css'] };
  });
  expect(r.ids).toEqual(['broken', 'config', 'replay']);
  expect(r.afterFirst).toBeGreaterThan(0);
  expect(r.afterSecond).toBe(r.afterFirst); // second call reads nothing new
  expect(r.loud).toEqual([]); // every probe read is quiet
  expect(r.keys1.sort()).toEqual(r.keys0.sort()); // none of the probed paths became a mtimes key
  expect(r.broken).toEqual({ unavailable: true });
  expect(r.cfg.uses).toBe(true);
  expect(r.cfg.files.map((f) => f.path).sort()).toEqual(['layers/config.css', 'layers/config.html', 'layers/shared.css']);
  expect(r.cfg.files.every((f) => typeof f.mtime === 'number')).toBe(true);
  expect(Object.fromEntries(r.rpl.useMap)['src/r.ts|.frame|1|div|1']).toBe(2); // the two frames share src, tag and leaf-ness
  expect(r.host).toBe(false);
  expect(r.wlCss).toEqual(['config']); // the probe files join the watch
  expect(r.wCss).toBe('number');
  expect(r.wlShared).toBe(false); // the active layout owns shared.css
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect(await page.evaluate(() => ({ same: window.__logic.pendingHash === window.__cfgHash, cached: window.__logic.layoutProbe.has('config') }))).toEqual({ same: true, cached: false }); // the probe hash is the load hash; the active layout leaves the cache
  expect(await page.evaluate(() => window.__logic.layoutProbe.has('main'))).toBe(false);
});

test('Probe_SwitchDuringScan_DiscardsStaleResult', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await page.evaluate(() => { const l = window.__logic, orig = l.readText.bind(l); l.readText = async (p, q) => { if (q) await new Promise((r) => setTimeout(r, 400)); return orig(p, q); }; }); // only the quiet (probe) reads are slow
  await page.evaluate(() => { window.__p = window.__logic.ensureProbe(); });
  await act(page, 'switchLayout', 'replay');
  await settled(page, 'replay');
  await page.evaluate(() => window.__p);
  expect(await page.evaluate(() => ({ size: window.__logic.layoutProbe.size, host: !!document.querySelector('[data-lod-host]') }))).toEqual({ size: 0, host: false });
  await page.evaluate(() => { window.__p = window.__logic.ensureProbe(); });
  await act(page, 'doReload');
  await settled(page, 'replay');
  await page.evaluate(() => window.__p);
  expect(await page.evaluate(() => ({ size: window.__logic.layoutProbe.size, host: !!document.querySelector('[data-lod-host]') }))).toEqual({ size: 0, host: false });
  // Reanalisar do 0 mid-scan: the probe dies, nothing of its files reaches the watch
  await page.evaluate(() => { window.__p = window.__logic.ensureProbe(); });
  await act(page, 'doRestructure');
  await settled(page, 'replay');
  await page.evaluate(() => window.__p);
  expect(await page.evaluate(() => ({ size: window.__logic.layoutProbe.size, host: !!document.querySelector('[data-lod-host]'), css: Object.keys(window.__logic.watchLayouts).filter((k) => /\.css$/.test(k)) }))).toEqual({ size: 0, host: false, css: [] });
  // Zerar interface mid-scan: the project unloads, the probe dies and the watch is empty
  await page.evaluate(() => { window.__p = window.__logic.ensureProbe(); });
  await page.evaluate(() => window.__logic.resetUI());
  await page.evaluate(() => window.__p);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => ({ size: window.__logic.layoutProbe.size, host: !!document.querySelector('[data-lod-host]'), wl: Object.keys(window.__logic.watchLayouts) }))).toEqual({ size: 0, host: false, wl: [] });
});

const appendDisk = (page, rel, text) => page.evaluate(async ({ rel, text }) => {
  await new Promise((r) => setTimeout(r, 60)); // a strictly newer mtime
  const parts = rel.split('/'); let d = window.__proj;
  for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p);
  const h = await d.getFileHandle(parts[parts.length - 1]); const t = await (await h.getFile()).text();
  const w = await h.createWritable(); await w.write(t + text); await w.close();
}, { rel, text });

test('Probe_ManifestChangedOnDisk_SwitchEmptiesCache', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await page.evaluate(() => window.__logic.ensureProbe());
  expect(await page.evaluate(() => window.__logic.layoutProbe.size)).toBe(3);
  await appendDisk(page, 'layers.json', '\n'); // the manifest text moved: every cached hash was made against the old one
  await act(page, 'switchLayout', 'replay');
  await settled(page, 'replay');
  expect(await page.evaluate(() => window.__logic.layoutProbe.size)).toBe(0);
});

test('Probe_SharedFileTouched_CheckStaleEvictsEntries', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  const hash0 = await page.evaluate(async () => { await window.__logic.ensureProbe(); return window.__logic.layoutProbe.get('config').hash; });
  await appendDisk(page, 'layers/shared.css', '\n/* touched */\n'); // shared with the active layout: not in watchLayouts
  await page.evaluate(() => window.__logic.checkStale());
  expect(await page.evaluate(() => [...window.__logic.layoutProbe.keys()])).toEqual(['broken']); // only the unavailable one (no file to compare) stays
  const hash1 = await page.evaluate(async () => { await window.__logic.ensureProbe(); return window.__logic.layoutProbe.get('config').hash; });
  expect(hash1).not.toBe(hash0);
  await appendDisk(page, 'layers.json', '\n'); // the manifest itself: all entries go
  await page.evaluate(() => window.__logic.checkStale());
  expect(await page.evaluate(() => window.__logic.layoutProbe.size)).toBe(0);
});

test('Probe_DismissStale_EvictsTheNamedLayoutsEntry', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  const r = await page.evaluate(async () => {
    const l = window.__logic; await l.ensureProbe();
    l.setState({ stale: ['layers/config.html'] }); l.dismissStale();
    return [...l.layoutProbe.keys()].sort();
  });
  expect(r).toEqual(['broken', 'replay']);
});

test('Probe_CachedMockChangedThenSwitched_RaisesBannerNamingTheLayout', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await page.evaluate(() => window.__logic.ensureProbe());
  await appendDisk(page, 'layers/replay.html', '\n<!-- changed -->\n');
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__logic.watchLayouts))).toContain('layers/replay.html');
  await page.evaluate(() => window.__logic.checkStale());
  expect(await page.evaluate(() => window.__logic.state.stale)).toEqual(['layers/replay.html']);
  await expect(page.locator('[role=status]', { hasText: 'mudaram no disco' })).toContainText('Replay');
  expect(await page.evaluate(() => window.__logic.layoutProbe.has('replay'))).toBe(false);
});

const BASE_FS = 3; // getFile calls of the axai load and its watch stat (measured 2026-10-20); a probe read at load would add to it
test('Probe_SingleLayoutProject_NeverRuns', async ({ page }) => {
  await page.addInitScript(() => { // installed before the load: counts every file the app opens on the connected folder
    window.__fs = 0;
    const gf = FileSystemFileHandle.prototype.getFile;
    FileSystemFileHandle.prototype.getFile = function () { window.__fs++; return gf.apply(this, arguments); };
  });
  await open(page, 'axai');
  await act(page);
  await expect.poll(async () => { const a = await page.evaluate(() => window.__fs); await page.waitForTimeout(400); return a === (await page.evaluate(() => window.__fs)); }).toBe(true); // the load and its watch probe are over
  const r = await page.evaluate(async () => {
    const l = window.__logic, before = window.__fs;
    await l.ensureProbe(); await l.probeOthers(['x']);
    return { n: window.__fs - before, size: l.layoutProbe.size, wl: Object.keys(l.watchLayouts).length };
  });
  expect(r).toEqual({ n: 0, size: 0, wl: 0 });
  // R10(1): the absolute count at load, against the 1-layout baseline (a stray probe read at load would move it)
  expect(await page.evaluate(() => window.__fs), 'getFile calls of a 1-layout load').toBe(BASE_FS);
  // the whole "todos iguais" + Salvar path of a single-layout project reads nothing, probes nothing and says nothing about other layouts
  await (await treeRow(page, { title: '.sum-stat' })).click();
  await expect.poll(async () => { const a = await page.evaluate(() => window.__fs); await page.waitForTimeout(400); return a === (await page.evaluate(() => window.__fs)); }).toBe(true);
  const before = await page.evaluate(() => window.__fs);
  await page.getByText('Todos iguais (', { exact: false }).first().click();
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(SHADOW);
  await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() => window.__logic.state.changes.length)).toBeGreaterThan(0);
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Aplicar nos arquivos', { exact: false }).first().click();
  await expect(page.getByRole('button', { name: /Gerar rascunho paralelo/ })).toBeVisible();
  await act(page);
  expect(await page.evaluate(() => ({ n: window.__fs, probe: window.__logic.layoutProbe.size, run: !!window.__logic.probeRun, loading: !!window.__logic.state.modal.loading }))).toEqual({ n: before, probe: 0, run: false, loading: false });
  await expect(page.getByText('também afeta')).toHaveCount(0);
  await expect(page.getByText('contando outros layouts')).toHaveCount(0);
});
