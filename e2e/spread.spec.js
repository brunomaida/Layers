import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';
import { act } from './ctx-helpers.js';
import { connectFixture, readDisk } from './folder-helpers.js';
import { planeCensus } from './perf-helpers.js';

// S9.1c Task 2: scanRoot / buildMockDom are the pure halves of scan() / loadProject(); the spread (LOD) reader reuses them.
// Reached through the component instance (`act`), like layouts.spec.js reaches switchLayout.
async function loaded(page, url) {
  await page.goto(url);
  await readNodes(page);
  await act(page);
}

test('ScanRoot_MaxDepth1_IdsAreSubsetOfFullScan', async ({ page }) => {
  await loaded(page, '/?layers=fixtures/traval/');
  const r = await page.evaluate(() => {
    const L = window.__logic; const host = L.pageRef.current, root = L.mockRoot;
    const full = L.scanRoot(host, root), shallow = L.scanRoot(host, root, { maxDepth: 1 });
    const fullIds = new Set(full.nodes.map((n) => n.id));
    return {
      fullCount: full.nodes.length, shallowCount: shallow.nodes.length, fullMax: full.maxDepth, shallowMax: shallow.maxDepth,
      missing: shallow.nodes.filter((n) => !fullIds.has(n.id)).map((n) => n.id), maxShallowDepth: Math.max(...shallow.nodes.map((n) => n.depth)),
      byIdKeys: Object.keys(shallow.byId).length, sameAsState: full.nodes.length === L.state.nodes.length,
    };
  });
  expect(r.shallowCount).toBeGreaterThan(0);
  expect(r.shallowCount).toBeLessThan(r.fullCount);
  expect(r.missing).toEqual([]);
  expect(r.maxShallowDepth).toBeLessThanOrEqual(1);
  expect(r.shallowMax).toBe(1);
  expect(r.fullMax).toBeGreaterThan(1);
  expect(r.byIdKeys).toBe(r.shallowCount);
  expect(r.sameAsState).toBe(true);
});

test('ScanRoot_ReturnsOnly_DoesNotWriteState', async ({ page }) => {
  await loaded(page, '/?layers=fixtures/traval/');
  const res = await page.evaluate(() => {
    const L = window.__logic; const nodes = L.state.nodes, els = L.els; let calls = 0; const orig = L.setState; L.setState = function (...a) { calls++; return orig.apply(this, a); };
    try { L.scanRoot(L.pageRef.current, L.mockRoot, { maxDepth: 1 }); } finally { L.setState = orig; }
    const same = L.state.nodes === nodes && L.els === els;
    const control = (() => { let n = 0; const o = L.setState; L.setState = function (...a) { n++; return o.apply(this, a); }; try { L.scan(); } finally { L.setState = o; } return n; })(); // positive control: the same spy sees scan()
    return { calls, same, control };
  });
  expect(res.calls).toBe(0);
  expect(res.same).toBe(true);
  expect(res.control).toBeGreaterThan(0);
});

test('BuildMockDom_InactiveHost_LeavesLoaderSingletonsUntouched', async ({ page }) => {
  await loaded(page, '/?layers=fixtures/multi-layout/');
  const r = await page.evaluate(async () => {
    const L = window.__logic; const man = L.state.project.man;
    const other = LayersCore.projectLayouts(man).find((l) => l.id === 'config');
    const snap = () => JSON.stringify({ mt: L.mtimes, w: L.watch, ha: L.hostApplied, st: L.structural, ld: L.loaded && L.loaded.mockPath, pk: L.pendingKey });
    const before = snap(), root0 = L.mockRoot, nodes0 = L.state.nodes, planes0 = document.querySelectorAll('[data-plane]').length;
    const tmp = document.createElement('div'); tmp.style.cssText = 'position:fixed;left:-99999px;top:0;width:1280px'; document.body.appendChild(tmp);
    const mb = await L.buildMockDom(man, other, { active: false });
    const tmpBefore = tmp.shadowRoot;
    const m = L.mountMockDom(tmp, mb);
    const scanned = L.scanRoot(tmp, mb.rootEl);
    const ids = [...tmp.shadowRoot.querySelectorAll('[id]')].map((e) => e.id).sort();
    tmp.remove();
    return {
      same: snap() === before && L.mockRoot === root0 && L.state.nodes === nodes0 && document.querySelectorAll('[data-plane]').length === planes0,
      ids, scannedCount: scanned.nodes.length, hostAttrs: tmp.getAttributeNames().filter((n) => n !== 'style').sort(), mounted: !m.refused && tmpBefore === null && m.rootEl === mb.rootEl, mainIds: [...document.querySelectorAll('*')].filter((e) => e.shadowRoot && e.shadowRoot !== tmp.shadowRoot && e.shadowRoot.childElementCount).map((e) => [...e.shadowRoot.querySelectorAll('[id]')].map((x) => x.id).sort()),
    };
  });
  expect(r.same).toBe(true);
  expect(r.mounted).toBe(true);
  expect(r.hostAttrs).toEqual([]);
  expect(r.ids).toEqual(['cfg-field', 'cfg-panel', 'cfg-title']);
  expect(r.scannedCount).toBeGreaterThan(0);
  expect(r.mainIds).toEqual([['main-a', 'main-title']]);
});

test('MountMockDom_NonActiveOnStageHost_RefusesAndKeepsStage', async ({ page }) => {
  await loaded(page, '/?layers=fixtures/multi-layout/');
  const r = await page.evaluate(async () => {
    const L = window.__logic; const man = L.state.project.man; const host = L.pageRef.current;
    const other = LayersCore.projectLayouts(man).find((l) => l.id === 'config');
    const mb = await L.buildMockDom(man, other, { active: false });
    const ids = () => [...host.shadowRoot.querySelectorAll('[id]')].map((e) => e.id).sort();
    const before = ids(), root0 = L.mockRoot;
    const res = L.mountMockDom(host, mb);
    return { res, before, after: ids(), sameRoot: L.mockRoot === root0 && host.shadowRoot.contains(root0), detached: mb.rootEl.ownerDocument !== document };
  });
  expect(r.res).toEqual({ refused: 'stage-host' });
  expect(r.after).toEqual(r.before);
  expect(r.sameRoot).toBe(true);
  expect(r.detached).toBe(true);
});

test('ReadText_QuietInFolderMode_KeepsMtimeWhileDefaultRecordsIt', async ({ page }) => {
  await connectFixture(page, 'multi-layout');
  await act(page);
  const r = await page.evaluate(async () => {
    const L = window.__logic; const path = 'layers/shared.css'; const dir = await window.__proj.getDirectoryHandle('layers');
    const first = await L.readText(path); const recorded = L.mtimes[path];
    await new Promise((res) => setTimeout(res, 30));
    const w = await (await dir.getFileHandle('shared.css')).createWritable(); await w.write(first + ' /* touched */'); await w.close();
    const disk = (await (await dir.getFileHandle('shared.css')).getFile()).lastModified;
    await L.readText(path, true); const afterQuiet = L.mtimes[path];
    await L.readText(path); const afterDefault = L.mtimes[path];
    return { recorded, disk, afterQuiet, afterDefault };
  });
  expect(r.disk).toBeGreaterThan(r.recorded);
  expect(r.afterQuiet).toBe(r.recorded);
  expect(r.afterDefault).toBe(r.disk);
});

// S9.1c Task 3: frozen LOD snapshots of the other layouts (Espalhar). No rendering yet: the contract is `spreadFrozen`, `state.spread`, `spreadRev`.
const FX = '/?layers=fixtures/multi-layout/';
const frozen = (page) => page.evaluate(() => {
  const L = window.__logic; const out = {};
  L.spreadFrozen.forEach((v, k) => { out[k] = v.unavailable ? { unavailable: true } : { full: v.full, count: v.count, len: v.nodes.length, maxDepth: Math.max(...v.nodes.map((n) => n.depth)), pageW: v.pageW, pageH: v.pageH }; });
  return out;
});
const settled = (page, n) => expect.poll(async () => Object.keys(await frozen(page)).length).toBe(n);
const activeId = async (page) => { await act(page); return page.evaluate(() => window.__logic.state.project.layoutId); };
const depth1 = (page) => page.evaluate(() => window.__logic.state.nodes.filter((n) => n.depth <= 1).length);
async function switchTo(page, id) {
  await act(page, 'switchLayout', id);
  await expect.poll(() => activeId(page)).toBe(id);
  await page.waitForFunction(() => window.__logic.loadedSeq === window.__logic.loadSeq);
}
// With Espalhar off: the depth<=1 node count of each layout, read from the real active scan (independent of scanRoot). Ends on main.
async function truth(page) {
  const t = {};
  for (const id of ['config', 'replay', 'main']) { await switchTo(page, id); t[id] = await depth1(page); }
  return t;
}
const tempHosts = (page) => page.evaluate(() => document.querySelectorAll('[data-lod-host]').length);

test('Spread_Off_ChangesNothing', async ({ page }) => {
  await loaded(page, FX);
  const r = await page.evaluate(() => { const L = window.__logic; return { spread: L.state.spread, rev: L.state.spreadRev, size: L.spreadFrozen.size }; });
  expect(r).toEqual({ spread: { on: false, mode: 'all', picked: [], dist: 30 }, rev: 0, size: 0 });
  await switchTo(page, 'config');
  expect(await page.evaluate(() => ({ size: window.__logic.spreadFrozen.size, rev: window.__logic.state.spreadRev }))).toEqual({ size: 0, rev: 0 });
});

test('Spread_On_FreezesOtherLayoutsInLod', async ({ page }) => {
  await loaded(page, FX);
  const t = await truth(page);
  await act(page, 'spreadOn', true);
  await settled(page, 3);
  const f = await frozen(page);
  expect(Object.keys(f).sort()).toEqual(['broken', 'config', 'replay']);
  expect(f.config).toMatchObject({ full: false, count: t.config, len: t.config });
  expect(f.replay).toMatchObject({ full: false, count: t.replay, len: t.replay });
  expect(f.config.maxDepth).toBeLessThanOrEqual(1);
  expect(f.broken).toEqual({ unavailable: true });
  const s = await page.evaluate(() => ({ on: window.__logic.state.spread.on, rev: window.__logic.state.spreadRev, w: window.__logic.state.pageW }));
  expect(s.on).toBe(true);
  expect(s.rev).toBeGreaterThan(0);
  expect(f.config.pageW).toBe(s.w);
  expect(await tempHosts(page)).toBe(0);
  expect(await page.evaluate(() => document.querySelectorAll('[data-plane]').length === window.__logic.state.nodes.length)).toBe(true);
});

test('Spread_OnAfterSwitch_FreezesMainFromItsState', async ({ page }) => {
  await loaded(page, FX);
  const t = await truth(page); // ends on main
  await act(page, 'switchState', 'filled'); // main now shows its second state: the frozen snapshot must follow it, not the default
  await page.waitForFunction(() => window.__logic.loadedSeq === window.__logic.loadSeq && window.__logic.state.project.stateName === 'filled');
  const filled = await depth1(page);
  expect(filled).toBeGreaterThan(t.main);
  await switchTo(page, 'config');
  await act(page, 'spreadOn', true);
  await settled(page, 3);
  const f = await frozen(page);
  expect(f.main).toMatchObject({ full: false, count: filled, len: filled });
  expect(f.replay).toMatchObject({ full: false, count: t.replay });
  expect(f.config).toBeUndefined();
});

test('Spread_SwitchLayout_FreezesLeavingFullAndDowngradesOlder', async ({ page }) => {
  await loaded(page, FX);
  const t = await truth(page); // on main
  const mainFull = await page.evaluate(() => window.__logic.state.nodes.length);
  await act(page, 'spreadOn', true);
  await settled(page, 3);
  await switchTo(page, 'config');
  let f = await frozen(page);
  expect(f.main).toMatchObject({ full: true, count: mainFull, len: mainFull });
  expect(f.config).toBeUndefined();
  expect(f.replay).toMatchObject({ full: false, count: t.replay });
  const cfgFull = await page.evaluate(() => window.__logic.state.nodes.length);
  await switchTo(page, 'replay');
  f = await frozen(page);
  expect(f.config).toMatchObject({ full: true, count: cfgFull, len: cfgFull });
  expect(f.main).toMatchObject({ full: false, count: t.main, len: t.main });
  expect(f.replay).toBeUndefined();
  expect(Object.values(f).filter((e) => e.full).length).toBe(1);
  expect(await tempHosts(page)).toBe(0);
  const roots = await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.shadowRoot && e.shadowRoot.childElementCount).length);
  expect(roots).toBe(1);
  // LRU: a later loadSpread (new pick) never overwrites the full entry with an LOD one
  await act(page, 'setSpreadPick', 'all', []);
  await page.waitForTimeout(300);
  expect((await frozen(page)).config.full).toBe(true);
});

test('Spread_SingleLayoutProject_TurningOnIsNoop', async ({ page }) => {
  await loaded(page, '/?layers=fixtures/traval/');
  await act(page, 'spreadOn', true);
  expect(await page.evaluate(() => ({ on: window.__logic.state.spread.on, size: window.__logic.spreadFrozen.size, rev: window.__logic.state.spreadRev }))).toEqual({ on: false, size: 0, rev: 0 });
});

test('Spread_Pick_OnlyChosenLayoutsAreFrozen', async ({ page }) => {
  await loaded(page, FX);
  await act(page, 'spreadOn', true);
  await settled(page, 3);
  await act(page, 'setSpreadPick', 'pick', ['replay']);
  await expect.poll(async () => Object.keys(await frozen(page))).toEqual(['replay']);
  await act(page, 'setSpreadPick', 'pick', ['replay', 'config']);
  await expect.poll(async () => Object.keys(await frozen(page)).sort()).toEqual(['config', 'replay']);
  await act(page, 'setSpreadDist', 55);
  expect(await page.evaluate(() => window.__logic.state.spread.dist)).toBe(55);
  await act(page, 'spreadOn', false);
  expect(await page.evaluate(() => ({ on: window.__logic.state.spread.on, size: window.__logic.spreadFrozen.size }))).toEqual({ on: false, size: 0 });
});

// Adds one more depth-1 element to layers/config.html in the connected OPFS folder (the frozen `config` count grows by 1).
async function growConfig(page, id) {
  const html = await readDisk(page, 'layers/config.html');
  await page.evaluate(async ({ html, id }) => {
    const d = await window.__proj.getDirectoryHandle('layers'), w = await (await d.getFileHandle('config.html')).createWritable();
    await w.write(html.replace('</body>', '<div class="extra" id="' + id + '">x</div></body>')); await w.close();
  }, { html, id });
}

test('Spread_ReloadAndRestructure_ReReadEveryLayout', async ({ page }) => {
  await connectFixture(page, 'multi-layout');
  await act(page);
  await act(page, 'spreadOn', true);
  await settled(page, 3);
  const renewed = () => page.evaluate(() => { const L = window.__logic, o = window.__ids; return L.spreadFrozen.size === o.size && [...o].every(([k, v]) => L.spreadFrozen.has(k) && L.spreadFrozen.get(k) !== v); });
  for (const [i, method] of ['doReload', 'doRestructure'].entries()) {
    const before = (await frozen(page)).config.count;
    await page.evaluate(() => { window.__ids = new Map(window.__logic.spreadFrozen); });
    await growConfig(page, 'cfg-extra' + i);
    await act(page, method);
    await expect.poll(renewed).toBe(true); // every entry is a new object: the map was cleared, not reused
    expect((await frozen(page)).config.count).toBe(before + 1); // and the files were read again
  }
  await act(page, 'unloadProject');
  expect(await page.evaluate(() => window.__logic.spreadFrozen.size)).toBe(0);
});

test('Spread_ReconnectSameFolder_ReadsFreshSnapshots', async ({ page }) => {
  await connectFixture(page, 'multi-layout');
  await act(page);
  await act(page, 'spreadOn', true);
  await settled(page, 3);
  const before = (await frozen(page)).config.count;
  await growConfig(page, 'cfg-extra');
  await page.evaluate(() => window.__logic.useDir(window.__proj, true)); // same folder name, new content: a re-connect, not a Recarregar
  await expect.poll(async () => (await frozen(page)).config?.count).toBe(before + 1);
});

test('Spread_Pick_LeavingUnpickedLayoutStillDowngradesOlderFull', async ({ page }) => {
  await loaded(page, FX);
  const t = await truth(page); // on main
  await act(page, 'spreadOn', true);
  await settled(page, 3);
  await act(page, 'setSpreadPick', 'pick', ['main', 'replay']);
  await expect.poll(async () => Object.keys(await frozen(page))).toEqual(['replay']);
  await switchTo(page, 'config'); // main is picked: frozen full
  await expect.poll(async () => (await frozen(page)).main?.full).toBe(true);
  await switchTo(page, 'replay'); // config is not picked: nothing frozen for it, but the older full entry must still drop to LOD
  const f = await frozen(page);
  expect(f.main).toMatchObject({ full: false, count: t.main, len: t.main });
  expect(f.config).toBeUndefined();
  expect(Object.values(f).filter((e) => e.full).length).toBe(0);
});

test('Spread_ZerarAndOtherProject_ResetSpread', async ({ page }) => {
  const DEFAULT = { on: false, mode: 'all', picked: [], dist: 30 };
  const set = async () => {
    await act(page, 'spreadOn', true); await settled(page, 3);
    await act(page, 'setSpreadPick', 'pick', ['replay']); await act(page, 'setSpreadDist', 55);
    expect(await page.evaluate(() => window.__logic.state.spread)).toEqual({ on: true, mode: 'pick', picked: ['replay'], dist: 55 });
  };
  const now = () => page.evaluate(() => ({ spread: window.__logic.state.spread, size: window.__logic.spreadFrozen.size }));
  await connectFixture(page, 'multi-layout');
  await act(page);
  await set();
  await act(page, 'resetUI');
  expect(await now()).toEqual({ spread: DEFAULT, size: 0 });
  await page.evaluate(() => window.__logic.useDir(window.__proj, true));
  await page.waitForFunction(() => window.__logic.state.project && window.__logic.loadedSeq === window.__logic.loadSeq);
  await set();
  // another multi-layout project opened over a live Espalhar: it does not inherit on/picked
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('proj2', { create: true });
    const put = async (name, text) => { const w = await (await dir.getFileHandle(name, { create: true })).createWritable(); await w.write(text); await w.close(); };
    await put('layers.json', '{"name":"Other","layouts":[{"id":"a","name":"A","mock":"a.html"},{"id":"b","name":"B","mock":"b.html"}]}');
    const body = '<!doctype html><html><body><div id="r"><p>x</p></div></body></html>';
    await put('a.html', body); await put('b.html', body);
    window.showDirectoryPicker = async () => dir;
  });
  await act(page, 'pickDir');
  await expect.poll(() => page.evaluate(() => window.__logic.state.project && window.__logic.state.project.name)).toBe('Other');
  await page.waitForFunction(() => window.__logic.loadedSeq === window.__logic.loadSeq);
  await flush(page);
  expect(await now()).toEqual({ spread: DEFAULT, size: 0 });
});

// A read of a non-active layout (readText(path, true)) is held in flight until __release(): the active load is never delayed.
const holdLodReads = (page) => page.evaluate(() => {
  const l = window.__logic, orig = l.readText.bind(l);
  window.__hold = true; window.__held = 0; window.__settled = 0; window.__gate = new Promise((r) => { window.__release = r; });
  l.readText = async (p, quiet) => {
    if (quiet === true && window.__hold) { window.__held++; try { await window.__gate; } finally { window.__settled++; } }
    return orig(p, quiet);
  };
});
const flush = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50)))));
async function folderSpread(page) {
  await connectFixture(page, 'multi-layout');
  await act(page);
  await holdLodReads(page);
  await act(page, 'spreadOn', true);
  await page.waitForFunction(() => window.__held >= 1);
}

test('Spread_ProjectSwitchDuringLoad_DropsResult', async ({ page }) => {
  await folderSpread(page);
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('proj2', { create: true });
    const put = async (name, text) => { const w = await (await dir.getFileHandle(name, { create: true })).createWritable(); await w.write(text); await w.close(); };
    await put('layers.json', '{"name":"Other","mock":"index.html"}');
    await put('index.html', '<!doctype html><html><body><div class="z"><p>z</p></div></body></html>');
    window.showDirectoryPicker = async () => dir;
  });
  await act(page, 'pickDir');
  expect(await page.evaluate(() => window.__logic.state.project.name)).toBe('Other');
  expect(await page.evaluate(() => window.__settled)).toBe(0); // the old read is still pending
  await page.evaluate(() => { window.__hold = false; window.__release(); });
  await page.waitForFunction(() => window.__settled >= 1);
  await flush(page);
  expect(await page.evaluate(() => ({ size: window.__logic.spreadFrozen.size, name: window.__logic.state.project.name }))).toEqual({ size: 0, name: 'Other' });
  expect(await tempHosts(page)).toBe(0);
});

test('Spread_ReloadDuringLoad_DropsResult', async ({ page }) => {
  await folderSpread(page);
  const staleHeld = await page.evaluate(() => window.__held);
  await page.evaluate(() => { window.__hold = false; }); // the read in flight stays held; reads started from now on (the reload's own run) pass through
  await act(page, 'reloadProject');
  await settled(page, 3); // the winning reload refilled the map
  expect(await page.evaluate(() => window.__settled)).toBe(0); // the old read is still pending
  await page.evaluate(() => { const L = window.__logic; window.__snap = { rev: L.state.spreadRev, entries: [...L.spreadFrozen.entries()] }; window.__release(); });
  await page.waitForFunction((n) => window.__settled >= n, staleHeld);
  await flush(page);
  const same = await page.evaluate(() => { const L = window.__logic, s = window.__snap; return L.state.spreadRev === s.rev && L.spreadFrozen.size === s.entries.length && s.entries.every(([k, v]) => L.spreadFrozen.get(k) === v); });
  expect(same).toBe(true);
  expect(await tempHosts(page)).toBe(0);
});

test('Spread_LayoutSwitchDuringLoad_DropsResult', async ({ page }) => {
  await loaded(page, FX);
  await holdLodReads(page);
  await act(page, 'spreadOn', true);
  await page.waitForFunction(() => window.__held >= 1);
  await page.evaluate(() => { window.__hold = false; }); // the read in flight stays held; the switch's own run passes through
  await switchTo(page, 'config');
  await settled(page, 3);
  expect(await page.evaluate(() => window.__settled)).toBe(0); // the old read is still pending
  const before = await frozen(page);
  expect(before.main.full).toBe(true);
  await page.evaluate(() => { const L = window.__logic; window.__snap = { rev: L.state.spreadRev, entries: [...L.spreadFrozen.entries()] }; window.__release(); });
  await page.waitForFunction(() => window.__settled >= 1);
  await flush(page);
  const same = await page.evaluate(() => { const L = window.__logic, s = window.__snap; return L.state.spreadRev === s.rev && L.spreadFrozen.size === s.entries.length && s.entries.every(([k, v]) => L.spreadFrozen.get(k) === v); });
  expect(same).toBe(true);
  expect(Object.keys(await frozen(page)).sort()).toEqual(['broken', 'main', 'replay']);
  expect(await tempHosts(page)).toBe(0);
});

test('Spread_OffDuringLoad_DropsResult', async ({ page }) => {
  await loaded(page, FX);
  await holdLodReads(page);
  await act(page, 'spreadOn', true);
  await page.waitForFunction(() => window.__held >= 1);
  await act(page, 'spreadOn', false);
  await page.evaluate(() => { window.__release(); });
  await page.waitForFunction(() => window.__settled >= 1);
  await flush(page);
  expect(await page.evaluate(() => ({ size: window.__logic.spreadFrozen.size, rev: window.__logic.state.spreadRev, on: window.__logic.state.spread.on }))).toEqual({ size: 0, rev: 0, on: false });
  expect(await tempHosts(page)).toBe(0);
});

test('Spread_LayoutSwitchWithActiveLoadPending_OldRunWritesNothing', async ({ page }) => {
  await loaded(page, FX);
  await holdLodReads(page);
  await act(page, 'spreadOn', true);
  await page.waitForFunction(() => window.__held >= 1); // the old run (config is its first layout) is in flight
  await page.evaluate(() => {
    const l = window.__logic, orig = l.readText.bind(l);
    window.__holdActive = true; window.__activeHeld = 0; window.__gate2 = new Promise((r) => { window.__release2 = r; });
    l.readText = async (p, quiet) => { if (quiet === false && window.__holdActive && p.endsWith('config.html')) { window.__activeHeld++; await window.__gate2; } return orig(p, quiet); };
    window.__hold = false; // LOD reads started from now on pass through; the old one stays held
  });
  await act(page, 'switchLayout', 'config');
  await page.waitForFunction(() => window.__activeHeld >= 1); // the new active load is pending: it has not restarted loadSpread, so only the loadSeq half of live() can drop the old run
  expect(await page.evaluate(() => window.__logic.loadedSeq !== window.__logic.loadSeq)).toBe(true);
  const keys = await page.evaluate(() => { const L = window.__logic; window.__snap = { rev: L.state.spreadRev, entries: [...L.spreadFrozen.entries()] }; return [...L.spreadFrozen.keys()]; });
  expect(keys).toEqual(['main']); // the leaving layout, frozen full by the switch
  await page.evaluate(() => window.__release()); // the old LOD read resumes while the new active load is still held
  await page.waitForFunction(() => window.__settled >= 1);
  await flush(page);
  const same = await page.evaluate(() => { const L = window.__logic, s = window.__snap; return L.state.spreadRev === s.rev && L.spreadFrozen.size === s.entries.length && s.entries.every(([k, v]) => L.spreadFrozen.get(k) === v); });
  expect(same).toBe(true);
  expect(await tempHosts(page)).toBe(0);
  await page.evaluate(() => { window.__holdActive = false; window.__release2(); }); // let the switch finish: its own run fills the rest
  await settled(page, 3);
  expect(Object.keys(await frozen(page)).sort()).toEqual(['broken', 'main', 'replay']);
});

// S9.1c Task 4: the 3D rendering of Espalhar (N pages in one world, LodPlane, overview camera). Driven through __logic; no UI yet.
const STAGE_JS = `[...document.querySelectorAll('div[tabindex="0"]')].find((el) => getComputedStyle(el).backgroundImage.includes('radial-gradient'))`;
const worldOf = (page) => page.evaluate((src) => {
  const stage = eval(src); const w = stage.querySelector('[data-plane]').parentElement.parentElement;
  return { html: w.outerHTML, count: w.querySelectorAll('*').length, attrs: [...new Set([...w.querySelectorAll('*')].flatMap((e) => e.getAttributeNames()).filter((a) => a.startsWith('data-')))].sort() };
}, STAGE_JS);
const pagesInfo = (page) => page.evaluate(() => [...document.querySelectorAll('[data-spread-page]')].map((p) => ({
  id: p.dataset.spreadPage, x: parseFloat(/translateX\(([-\d.e]+)px\)/.exec(p.style.transform)[1]),
  planes: p.querySelectorAll('[data-plane]').length, lod: p.querySelectorAll('[data-lod-plane]').length, lodLayouts: [...new Set([...p.querySelectorAll('[data-lod-plane]')].map((e) => e.dataset.layout))],
  label: (p.querySelector('[data-spread-label]') || {}).textContent, pe: p.style.pointerEvents,
})));
async function spreadReady(page) {
  await loaded(page, FX);
  await act(page, 'spreadOn', true);
  await settled(page, 3);
  await flush(page);
}
const offsets = (page) => page.evaluate(() => { const s = window.__logic.state; return LayersCore.spreadOffsets(3, s.pageW, s.spread.dist); });

test('Spread_On_RendersOnePagePerAvailableLayoutInManifestOrder', async ({ page }) => {
  await spreadReady(page);
  const pages = await pagesInfo(page), offs = await offsets(page);
  expect(pages.map((p) => p.id)).toEqual(['main', 'config', 'replay']); // broken is unavailable: no slot
  expect(pages.map((p) => p.x)).toEqual(offs);
  expect(offs[1]).toBeGreaterThan(0);
  expect(await page.evaluate(() => [...document.querySelectorAll('[data-spread-frame]')].map((e) => e.parentElement.dataset.spreadPage))).toEqual(['main']); // L0 frame of the active page only
});

test('Spread_LodPages_HaveLodPlanesWithoutDataPlane', async ({ page }) => {
  await spreadReady(page);
  const f = await frozen(page), pages = await pagesInfo(page);
  for (const id of ['config', 'replay']) {
    const p = pages.find((x) => x.id === id);
    expect(p.planes).toBe(0);
    expect(p.lod).toBe(f[id].count);
    expect(p.lodLayouts).toEqual([id]);
    expect(p.pe).toBe('none');
  }
  expect(await page.evaluate(() => document.querySelectorAll('[data-lod-plane][data-plane]').length)).toBe(0);
  expect(await page.evaluate(() => document.querySelectorAll('[data-lod-plane]:not([data-layout])').length)).toBe(0);
  const look = await page.evaluate(() => { const e = document.querySelector('[data-lod-plane]'); const cs = getComputedStyle(e); return { op: cs.opacity, style: cs.borderTopStyle, color: cs.borderTopColor, pe: cs.pointerEvents, cursor: e.style.cursor }; });
  expect(look).toEqual({ op: '0.5', style: 'dashed', color: 'rgba(173, 181, 190, 0.45)', pe: 'none', cursor: '' });
});

test('Spread_FullFrozenPage_IsDrawnAsTheBoardDimMode', async ({ page }) => {
  await spreadReady(page);
  await switchTo(page, 'config'); await settled(page, 3); await flush(page);
  const look = await page.evaluate(() => {
    const of = (id) => [...document.querySelectorAll('[data-spread-page="' + id + '"] [data-lod-plane]')].map((e) => { const cs = getComputedStyle(e); return { op: cs.opacity, style: cs.borderTopStyle, color: cs.borderTopColor, bg: cs.backgroundColor }; });
    return { full: of('main'), lod: of('replay') };
  });
  expect(look.full.length).toBeGreaterThan(0);
  look.full.forEach((p) => { expect(p.style).toBe('solid'); expect(p.color).toBe('rgba(173, 181, 190, 0.35)'); expect(Number(p.op)).toBeLessThanOrEqual(0.5); });
  look.lod.forEach((p) => { expect(p.style).toBe('dashed'); expect(p.color).toBe('rgba(173, 181, 190, 0.45)'); });
  // board backgrounds: depth 0 rgba(14,17,22,.9), deeper planes bg1 at .3 (same for dim and lod)
  expect(look.lod[0].bg).toBe('rgba(14, 17, 22, 0.9)');
  expect(new Set(look.lod.slice(1).map((p) => p.bg)).size).toBe(1);
  expect(look.lod[1].bg).toMatch(/^rgba\(\d+, \d+, \d+, 0\.3\)$/);
});

test('Spread_Off_ReleasesTheLodElementCache', async ({ page }) => {
  await spreadReady(page);
  expect(await page.evaluate(() => window.__logic._lodEls && window.__logic._lodEls.size)).toBeGreaterThan(0);
  await act(page, 'spreadOn', false); await flush(page);
  expect(await page.evaluate(() => window.__logic._lodEls || null)).toBeNull();
});

test('Spread_LodLabels_CarryLodSuffix', async ({ page }) => {
  await spreadReady(page);
  const pages = await pagesInfo(page);
  expect(pages.map((p) => p.label)).toEqual(['Main', 'Config · LOD', 'Replay · LOD']);
});

test('Spread_UnavailableLayout_RendersNothing', async ({ page }) => {
  await spreadReady(page);
  expect((await frozen(page)).broken).toEqual({ unavailable: true });
  expect(await page.evaluate(() => document.querySelectorAll('[data-spread-page="broken"],[data-layout="broken"]').length)).toBe(0);
  expect(await page.evaluate(() => [...document.querySelectorAll('[data-spread-label]')].some((e) => /Broken/.test(e.textContent)))).toBe(false);
});

test('Spread_ActivePage_KeepsFullPlanesAndCensus', async ({ page }) => {
  await loaded(page, FX);
  const before = await page.evaluate(() => ({ n: window.__logic.state.nodes.length, planes: document.querySelectorAll('[data-plane]').length, ids: [...document.querySelectorAll('[data-plane]')].map((e) => e.dataset.plane).sort() }));
  await act(page, 'spreadOn', true); await settled(page, 3); await flush(page);
  const after = await page.evaluate(() => ({ planes: document.querySelectorAll('[data-plane]').length, ids: [...document.querySelectorAll('[data-plane]')].map((e) => e.dataset.plane).sort(), inActive: document.querySelectorAll('[data-spread-page="main"] [data-plane]').length }));
  expect(after.planes).toBe(before.planes);
  expect(after.ids).toEqual(before.ids);
  expect(after.inActive).toBe(before.n);
  const census = await planeCensus(page);
  expect(census.total).toBe(before.n); // LOD planes have neither data-plane nor a pointer/crosshair cursor
});

test('Spread_ActivePage_SitsAtItsOwnOffsetAndLeavingLayoutFreezesFull', async ({ page }) => {
  await spreadReady(page);
  const mainNodes = await page.evaluate(() => window.__logic.state.nodes.length);
  await switchTo(page, 'config');
  await settled(page, 3); await flush(page);
  const pages = await pagesInfo(page), offs = await offsets(page), f = await frozen(page);
  const cfg = pages.find((p) => p.id === 'config'), main = pages.find((p) => p.id === 'main');
  expect(pages.map((p) => p.id)).toEqual(['main', 'config', 'replay']);
  expect(cfg.x).toBe(offs[1]);
  expect(cfg.planes).toBeGreaterThan(0);
  expect(cfg.lod).toBe(0);
  expect(main.planes).toBe(0);
  expect(f.main.full).toBe(true);
  expect(main.lod).toBe(mainNodes); // the leaving layout is drawn at full depth
  expect(main.label).toBe('Main'); // full snapshot: dimmed, no LOD suffix
  expect(pages.find((p) => p.id === 'replay').label).toBe('Replay · LOD');
});

test('Spread_Off_DomIsIdenticalToBaselineAndLeavesNoSpreadMarks', async ({ page }) => {
  await loaded(page, FX);
  const base = await worldOf(page);
  expect(base.attrs.filter((a) => /spread|lod/.test(a))).toEqual([]);
  await act(page, 'spreadOn', true); await settled(page, 3); await flush(page);
  const on = await worldOf(page);
  expect(on.count).toBeGreaterThan(base.count);
  await act(page, 'spreadOn', false); await flush(page);
  const off = await worldOf(page);
  expect(off.count).toBe(base.count);
  expect(off.attrs).toEqual(base.attrs);
  expect(off.html).toBe(base.html);
  expect(await page.evaluate(() => document.querySelectorAll('[data-spread-page],[data-lod-plane],[data-spread-label],[data-spread-frame]').length)).toBe(0);
});

test('Spread_SingleLayoutProject_RendersNoPages', async ({ page }) => {
  await loaded(page, '/?layers=fixtures/traval/');
  // spreadOn() refuses a single-layout project, so force the state to reach the `layouts.length < 2` guard of spreadView/scene
  await page.evaluate(() => window.__logic.setState({ spread: { on: true, mode: 'all', picked: [], dist: 30 } }));
  await flush(page);
  expect(await page.evaluate(() => window.__logic.spreadView())).toBeNull();
  expect(await page.evaluate(() => document.querySelectorAll('[data-spread-page],[data-lod-plane],[data-spread-label],[data-spread-frame]').length)).toBe(0);
});

test('Spread_Overview_FitsAllPagesInTheStage', async ({ page }) => {
  await spreadReady(page);
  await page.waitForTimeout(600); // the world transform eases for .35 s
  const r = await page.evaluate((src) => {
    const stage = eval(src), s = stage.getBoundingClientRect(); let l = 1e9, rr = -1e9, t = 1e9, b = -1e9;
    document.querySelectorAll('[data-spread-page]').forEach((p) => { const q = p.getBoundingClientRect(); l = Math.min(l, q.left); rr = Math.max(rr, q.right); t = Math.min(t, q.top); b = Math.max(b, q.bottom); });
    return { l: l - s.left, r: s.right - rr, t: t - s.top, b: s.bottom - b, w: s.width };
  }, STAGE_JS);
  for (const k of ['l', 'r', 't', 'b']) expect(r[k], `margin ${k}`).toBeGreaterThanOrEqual(0);
  expect(Math.abs(r.l - r.r)).toBeLessThan(r.w * 0.15); // roughly centered
});

test('Spread_Overview_CameraFollowsFootprintAndReturnsWhenOff', async ({ page }) => {
  await loaded(page, FX);
  const fit0 = await page.evaluate(() => window.__logic.cam().fit);
  await act(page, 'spreadOn', true); await settled(page, 3);
  const fitOn = await page.evaluate(() => window.__logic.cam().fit);
  expect(fitOn).toBeLessThan(fit0);
  expect(fitOn).toBeGreaterThan(fit0 / 10); // 3 small pages: shrinks, never collapses
  await act(page, 'setSpreadDist', 100);
  const fitWide = await page.evaluate(() => window.__logic.cam().fit);
  expect(fitWide).toBeLessThan(fitOn);
  expect(fitWide).toBeGreaterThan(fitOn / 10);
  await page.evaluate(() => window.__logic.setState({ persp: 800 }));
  expect(await page.evaluate(() => window.__logic.cam().fit)).not.toBe(fitWide); // the overview fit reads the perspective: it is part of the memo key
  await act(page, 'spreadOn', false);
  expect(await page.evaluate(() => window.__logic.cam().fit)).toBe(fit0);
});

// Real page size: the same manifest at the app default viewport (1280x760) with a 4th available layout (broken -> a copy of replay).
// The world is scaled in 3D under perspective: a 2D scale left the nearest corner crossing the camera plane and the fit collapsed.
async function bigSpread(page, dist) {
  await page.route('**/fixtures/multi-layout/layers.json', async (route) => {
    const m = await (await route.fetch()).json();
    m.viewport = { width: 1280, height: 760 };
    m.layouts.find((l) => l.id === 'broken').mock = 'layers/replay.html';
    await route.fulfill({ json: m });
  });
  await loaded(page, FX);
  await act(page, 'spreadOn', true);
  await settled(page, 3);
  await act(page, 'setSpreadDist', dist);
  await flush(page);
  await page.waitForTimeout(600); // the world transform eases for .35 s
}
const stageRects = (page) => page.evaluate((src) => {
  const st = eval(src).getBoundingClientRect(), r = (q) => ({ l: q.left - st.left, r: q.right - st.left, t: q.top - st.top, b: q.bottom - st.top, w: q.width });
  return { stage: { w: st.width, h: st.height }, fit: window.__logic.cam().fit, pages: [...document.querySelectorAll('[data-spread-page]')].map((p) => ({ id: p.dataset.spreadPage, ...r(p.getBoundingClientRect()) })) };
}, STAGE_JS);
const insideStage = (m) => { const l = Math.min(...m.pages.map((p) => p.l)), r = Math.max(...m.pages.map((p) => p.r)), t = Math.min(...m.pages.map((p) => p.t)), b = Math.max(...m.pages.map((p) => p.b)); return { l, r: m.stage.w - r, t, b: m.stage.h - b }; };

for (const dist of [30, 100]) {
  test(`Spread_Overview_RealViewportFourPages_FitsAndStaysReadable_Dist${dist}`, async ({ page }) => {
    await bigSpread(page, dist);
    const m = await stageRects(page);
    expect(m.pages.map((p) => p.id)).toEqual(['main', 'config', 'replay', 'broken']);
    expect(m.fit).toBeGreaterThan(0.05);
    m.pages.forEach((p) => expect(p.w, p.id).toBeGreaterThanOrEqual(dist === 30 ? 120 : 80)); // default yaw; dist 100: 4 pages + 3 gaps of one page width in a ~940 px stage, foreshortened by the yaw
    const gap = insideStage(m);
    for (const k of ['l', 'r', 't', 'b']) expect(gap[k], `margin ${k}`).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < m.pages.length; i++) expect(m.pages[i].l, 'left-to-right order').toBeGreaterThan(m.pages[i - 1].l);
  });

  test(`Spread_Overview_RealViewportFourPages_EdgeOnPagesStayWide_Dist${dist}`, async ({ page }) => {
    await bigSpread(page, dist);
    await page.evaluate(() => window.__logic.setState({ yaw: 32 })); // base yaw -32: yawT = 0, the spread is edge-on to the eye
    await flush(page); await page.waitForTimeout(600);
    const m = await stageRects(page), gap = insideStage(m);
    m.pages.forEach((p) => expect(p.w, p.id).toBeGreaterThanOrEqual(dist === 30 ? 120 : 100)); // dist 100 caps at ~103 px: 4 pages + 3 gaps in a ~940 px stage
    for (const k of ['l', 'r', 't', 'b']) expect(gap[k], `margin ${k}`).toBeGreaterThanOrEqual(0);
  });

  test(`Spread_Overview_RealViewportFourPages_OrbitKeepsFitAndOrder_Dist${dist}`, async ({ page }) => {
    await bigSpread(page, dist);
    for (const yaw of [-15, 15]) {
      await page.evaluate((y) => window.__logic.setState({ yaw: y }), yaw);
      await flush(page); await page.waitForTimeout(600);
      const m = await stageRects(page), gap = insideStage(m);
      expect(m.fit, `yaw ${yaw}`).toBeGreaterThan(0.05);
      m.pages.forEach((p) => expect(p.w, `yaw ${yaw} ${p.id}`).toBeGreaterThanOrEqual(60));
      for (const k of ['l', 'r', 't', 'b']) expect(gap[k], `yaw ${yaw} margin ${k}`).toBeGreaterThanOrEqual(0);
      for (let i = 1; i < m.pages.length; i++) expect(m.pages[i].l, `yaw ${yaw} order`).toBeGreaterThan(m.pages[i - 1].l);
    }
  });
}

test('Spread_Overview_RealViewportFlat_PagesKeepEqualSize', async ({ page }) => {
  await bigSpread(page, 30);
  await page.evaluate(() => window.__logic.setState({ flat: true, yaw: 0 })); // yawT = 0: the footprint is edge-on to the eye, z = 0, k = 1
  await flush(page); await page.waitForTimeout(600);
  const m = await stageRects(page), gap = insideStage(m), ws = m.pages.map((p) => p.w);
  expect(Math.max(...ws) - Math.min(...ws)).toBeLessThan(1);
  expect(ws[0]).toBeGreaterThanOrEqual(120);
  for (const k of ['l', 'r', 't', 'b']) expect(gap[k], `margin ${k}`).toBeGreaterThanOrEqual(0);
});

// Every page box of the spread: finite and below 3 stage widths (a page behind the eye plane projects to a huge or flipped box).
const pagesSane = async (page, tag) => {
  const m = await stageRects(page);
  expect(m.pages.length, tag).toBe(4);
  m.pages.forEach((p) => { expect(Number.isFinite(p.w) && Number.isFinite(p.l) && Number.isFinite(p.t), `${tag} ${p.id} finite`).toBe(true); expect(p.w, `${tag} ${p.id} width`).toBeLessThan(m.stage.w * 3); });
  return m;
};

test('Spread_Overview_RealViewport_EnquadrarReachesANormalZoom', async ({ page }) => {
  await bigSpread(page, 30);
  await act(page, 'frame', '0'); await page.waitForTimeout(600);
  const r = await page.evaluate((src) => {
    const L = window.__logic, st = eval(src).getBoundingClientRect(), p = document.querySelector('[data-spread-page="main"] [data-plane="0"]').getBoundingClientRect();
    return { zoom: L.state.zoom, fit: L.cam().fit, w: p.width, sw: st.width, cx: p.left + p.width / 2 - (st.left + st.width / 2) };
  }, STAGE_JS);
  expect(r.zoom).toBeGreaterThan(1);
  expect(r.zoom).toBeLessThan(12); // the clamp is not what decides the framing
  expect(r.fit * r.zoom).toBeGreaterThan(0.3);
  expect(r.w).toBeGreaterThan(r.sw * 0.5);
  expect(r.w).toBeLessThan(r.sw);
  expect(Math.abs(r.cx)).toBeLessThan(r.sw * 0.25);
  await pagesSane(page, 'main enquadrar');
});

// zoom is a 2D magnification: it never moves a far page towards the eye, whichever page is active and however the zoom was reached
for (const id of ['config', 'replay', 'broken']) {
  test(`Spread_Overview_RealViewport_EnquadrarOnActive_${id}_NoPageCrossesTheEye`, async ({ page }) => {
    await bigSpread(page, 30);
    await switchTo(page, id); await settled(page, 3); await flush(page);
    await act(page, 'frame', '0'); await page.waitForTimeout(600);
    expect(await page.evaluate(() => window.__logic.state.zoom)).toBeGreaterThan(1);
    await pagesSane(page, `${id} enquadrar`);
  });
}

for (const z of [4, 10]) {
  test(`Spread_Overview_RealViewport_WheelZoom${z}_NoPageCrossesTheEye`, async ({ page }) => {
    await bigSpread(page, 30);
    await page.evaluate((zz) => window.__logic.setState({ zoom: zz, panX: 0, panY: 0, focus: null }), z);
    await flush(page); await page.waitForTimeout(600);
    await pagesSane(page, `zoom ${z} focus null`);
    for (let i = 0; i < 3; i++) await act(page, 'zoomBy', 1.1, 120, -60); // the wheel path (clamped at 12)
    await page.waitForTimeout(600);
    await pagesSane(page, `zoom ${z} after wheel`);
  });
}

test('Spread_Overview_RealViewport_DragPannedFocusFarOutside_NoPageCrossesTheEye', async ({ page }) => {
  await bigSpread(page, 100);
  await switchTo(page, 'broken'); await settled(page, 3); await flush(page);
  await act(page, 'frame', '0'); await page.waitForTimeout(600);
  await page.evaluate(() => window.__logic.setState({ focus: { x: -9000, y: 5000, zd: 0 } })); // an in-plane drag can carry the focus anywhere
  await flush(page); await page.waitForTimeout(600);
  await pagesSane(page, 'focus far outside');
});

test('Spread_Overview_PortraitPagesWithTilt_StayCenteredVertically', async ({ page }) => {
  await page.route('**/fixtures/multi-layout/layers.json', async (route) => { const m = await (await route.fetch()).json(); m.viewport = { width: 390, height: 844 }; await route.fulfill({ json: m }); });
  await loaded(page, FX);
  await act(page, 'spreadOn', true); await settled(page, 3);
  await page.evaluate(() => window.__logic.setState({ tilt: 45 }));
  await flush(page); await page.waitForTimeout(600);
  const r = await page.evaluate((src) => {
    const st = eval(src).getBoundingClientRect(); let t = Infinity, b = -Infinity;
    document.querySelectorAll('[data-spread-page], [data-spread-page] [data-lod-plane], [data-spread-page] [data-plane]').forEach((e) => { const q = e.getBoundingClientRect(); if (q.width && q.height) { t = Math.min(t, q.top - st.top); b = Math.max(b, q.bottom - st.top); } });
    return { top: t, bottom: st.height - b };
  }, STAGE_JS);
  expect(r.top).toBeGreaterThanOrEqual(0);
  expect(r.bottom).toBeGreaterThanOrEqual(0);
  expect(Math.abs(r.top - r.bottom)).toBeLessThan(3); // without the solved vertical shift the projected range sat ~60 px off center
});

test('Spread_Overview_PlanePanOnePixel_DoesNotMoveTheFrame', async ({ page }) => {
  await bigSpread(page, 30);
  const frameLeft = () => page.evaluate(() => document.querySelector('[data-spread-frame]').getBoundingClientRect().left);
  const before = await frameLeft();
  expect(await page.evaluate(() => window.__logic.state.focus)).toBeNull();
  await act(page, 'pan', 1, 0, 'plane'); await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__logic.state.focus)).not.toBeNull();
  expect(Math.abs((await frameLeft()) - before)).toBeLessThan(3);
});

test('Spread_Frame_AimsInsideTheActivePage', async ({ page }) => {
  await spreadReady(page);
  await switchTo(page, 'config');
  await settled(page, 3);
  await act(page, 'frame', '0'); await page.waitForTimeout(600);
  const r = await page.evaluate((src) => {
    const s = window.__logic.state, st = eval(src).getBoundingClientRect(), p = document.querySelector('[data-spread-page="config"] [data-plane="0"]').getBoundingClientRect();
    const w = document.querySelector('[data-spread-page="config"]').parentElement.style.transform;
    return { cx: p.left + p.width / 2 - (st.left + st.width / 2), tx: +/translate3d\(([-\d.e]+)px/.exec(w)[1], off: LayersCore.spreadOffsets(3, s.pageW, s.spread.dist)[1], fx: s.focus.x, pw: s.pageW, sw: st.width };
  }, STAGE_JS);
  expect(r.tx).toBeCloseTo(-(r.off + r.fx - r.pw / 2), 3);
  expect(Math.abs(r.cx)).toBeLessThan(r.sw * 0.25);
});

test('Spread_DefaultFocus_IsTheCenterOfTheWholeSpread', async ({ page }) => {
  await spreadReady(page);
  const r = await page.evaluate(() => { const L = window.__logic, s = L.state, offs = LayersCore.spreadOffsets(3, s.pageW, s.spread.dist), f = L.defFocus(); return { fx: f.x, expect: s.pageW / 2 + offs[2] / 2 }; });
  expect(r.fx).toBeCloseTo(r.expect, 6); // active = main (offset 0): the spread center is page-relative offs[2]/2
  await switchTo(page, 'config'); await settled(page, 3);
  const c = await page.evaluate(() => { const L = window.__logic, s = L.state, offs = LayersCore.spreadOffsets(3, s.pageW, s.spread.dist), f = L.defFocus(); return { fx: f.x, expect: s.pageW / 2 + offs[2] / 2 - offs[1] }; });
  expect(c.fx).toBeCloseTo(c.expect, 6); // active = config (offset offs[1]): the same center, in config-page coordinates
});
