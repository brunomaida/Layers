import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';
import { act, open, reloadWith } from './ctx-helpers.js';
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
  expect(look).toEqual({ op: '0.5', style: 'dashed', color: 'rgba(173, 181, 190, 0.45)', pe: 'auto', cursor: '' }); // Task 6: LOD planes are clickable (the page div stays pointer-events:none and owns the cursor, which keeps them out of planeCensus)
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

// S9.1c Task 5: the `⊞ ESPALHAR ▾` button and its popover (UI over the Task 3 logic). Driven by real clicks; __logic only reads state.
const BTN = '[data-spread-btn]', POP = '[data-spread-pop]';
const seg = (page, k) => page.locator('[data-spread-seg="' + k + '"]');
const row = (page, id) => page.locator('[data-spread-row="' + id + '"]');
const ck = (page, id) => row(page, id).locator('[data-spread-ck]');
const cnt = (page, id) => row(page, id).locator('[data-spread-count]');
const sp = (page) => page.evaluate(() => { const s = window.__logic.state; return { on: s.spread.on, mode: s.spread.mode, picked: s.spread.picked, dist: s.spread.dist, menu: s.spreadMenu }; });
const sv = (page) => page.evaluate(() => { const v = window.__logic.spreadView(); return v && { ids: v.ids, offs: v.offs, ai: v.ai }; });
const pageIds = (page) => page.evaluate(() => [...document.querySelectorAll('[data-spread-page]')].map((p) => p.dataset.spreadPage));
const openPop = async (page) => { await page.locator(BTN).click(); await expect(page.locator(POP)).toBeVisible(); };
// the exact boundary: one frozen entry's count is rewritten so that active + frozen == total (counts only feed the popover total)
const forceTotal = (page, total) => page.evaluate((t) => {
  const L = window.__logic, F = L.spreadFrozen, ids = [...F.keys()].filter((k) => !F.get(k).unavailable), first = ids[0];
  const rest = ids.slice(1).reduce((a, k) => a + F.get(k).count, 0);
  F.set(first, { ...F.get(first), count: t - L.state.nodes.length - rest }); L.spreadBump();
}, total);

test('SpreadUi_Button_OnlyWithTwoOrMoreLayouts', async ({ page }) => {
  await loaded(page, FX);
  await expect(page.locator(BTN)).toHaveCount(1);
  await expect(page.locator(BTN)).toContainText('ESPALHAR');
  expect(await page.evaluate((b) => document.querySelector('[data-layout-strip]').lastElementChild === document.querySelector(b), BTN)).toBe(true); // last item of the row
  await expect(page.locator(POP)).toHaveCount(0); // never opened: no popover DOM
  await page.goto('/?layers=fixtures/traval/');
  await readNodes(page);
  await expect(page.locator('[data-layout-strip]')).toHaveCount(0);
  expect(await page.evaluate(() => document.querySelectorAll('[data-spread-btn],[data-spread-pop]').length)).toBe(0);
});

test('SpreadUi_Popover_OpensAndClosesByButtonEscAndOutsideClick', async ({ page }) => {
  await loaded(page, FX);
  await act(page, 'select', '0.1'); // non-root: the "did not fall into reset" assertion below can fail
  const selBefore = await page.evaluate(() => window.__logic.state.selId);
  expect(selBefore).toBe('0.1');
  await expect(page.locator(BTN)).toHaveAttribute('aria-expanded', 'false');
  await openPop(page);
  await expect(page.locator(BTN)).toHaveAttribute('aria-expanded', 'true');
  expect(await page.evaluate(() => !window.__logic.state.modal && !window.__logic.state.pending && !window.__logic.state.diff)).toBe(true); // not a modal overlay
  await page.locator(BTN).click(); // toggle closes
  await expect(page.locator(POP)).toHaveCount(0);
  await openPop(page);
  await page.keyboard.press('Escape'); // closes first; the Esc chain does not fall through to the selection reset
  await expect(page.locator(POP)).toHaveCount(0);
  expect(await page.evaluate(() => window.__logic.state.selId)).toBe(selBefore);
  await openPop(page);
  const out = await page.evaluate(() => { const r = document.querySelector('[data-spread-pop]').offsetParent.getBoundingClientRect(); return { x: Math.round(r.left + 60), y: Math.round(r.top + 120) }; }); // inside the stage, away from the top bar
  await page.mouse.click(out.x, out.y); // outside click
  await expect(page.locator(POP)).toHaveCount(0);
  await openPop(page);
  await page.locator(POP).click({ position: { x: 4, y: 4 } }); // inside click keeps it open
  await expect(page.locator(POP)).toBeVisible();
  await seg(page, 'all').click(); await settled(page, 3);
  await page.locator('[data-spread-dist]').focus();
  await page.keyboard.press('Escape'); // focus in the slider: the global key handler ignores inputs, the slider closes it itself
  await expect(page.locator(POP)).toHaveCount(0);
});

test('SpreadUi_Segments_FocoTodosPick_DriveTheStage', async ({ page }) => {
  await loaded(page, FX);
  await openPop(page);
  await expect(seg(page, 'off')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-spread-row]')).toHaveCount(0); // Foco: no rows, no slider
  await expect(page.locator('[data-spread-dist]')).toHaveCount(0);
  await seg(page, 'all').click();
  await settled(page, 3);
  expect(await sp(page)).toMatchObject({ on: true, mode: 'all' });
  expect((await sv(page)).ids).toEqual(['main', 'config', 'replay']);
  await expect(seg(page, 'all')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-spread-row]')).toHaveCount(4);
  await expect(page.locator('[data-spread-dist]')).toHaveCount(1);
  for (const id of ['main', 'config', 'replay', 'broken']) { await expect(ck(page, id)).toHaveAttribute('aria-checked', 'true'); await expect(ck(page, id)).toBeDisabled(); } // Todos: all checked, read-only
  await seg(page, 'pick').click();
  expect(await sp(page)).toMatchObject({ on: true, mode: 'pick' });
  await expect(seg(page, 'pick')).toHaveAttribute('aria-pressed', 'true');
  await expect(ck(page, 'config')).toHaveAttribute('aria-checked', 'true'); // Task 6 (m4): Todos -> 1-N seeds the pick with the drawn layouts
  await expect(ck(page, 'config')).toBeEnabled();
  await seg(page, 'off').click(); // Foco = Espalhar off
  expect(await sp(page)).toMatchObject({ on: false });
  expect(await sv(page)).toBeNull();
  expect(await pageIds(page)).toEqual([]);
  await expect(page.locator('[data-spread-row]')).toHaveCount(0);
  await expect(page.locator(POP)).toBeVisible(); // the popover stays open across segment changes
  await seg(page, 'pick').click(); // straight from Foco to 1-N: one state write, mode pick
  expect(await sp(page)).toMatchObject({ on: true, mode: 'pick' });
});

test('SpreadUi_Pick_ExcludesLayoutsAndKeepsTheActiveOne', async ({ page }) => {
  await loaded(page, FX);
  await openPop(page);
  await seg(page, 'pick').click();
  expect(await sv(page)).toBeNull(); // only the active layout: nothing to spread
  await expect(ck(page, 'main')).toHaveAttribute('aria-checked', 'true'); // the active one is always checked
  await expect(ck(page, 'main')).toBeDisabled();
  await ck(page, 'config').click();
  await settled(page, 1);
  expect((await sp(page)).picked).toEqual(['config']);
  expect((await sv(page)).ids).toEqual(['main', 'config']);
  expect(await pageIds(page)).toEqual(['main', 'config']); // replay stays out of the stage
  await expect(ck(page, 'config')).toHaveAttribute('aria-checked', 'true');
  await expect(ck(page, 'replay')).toHaveAttribute('aria-checked', 'false');
  await ck(page, 'replay').click();
  await settled(page, 2);
  expect((await sv(page)).ids).toEqual(['main', 'config', 'replay']);
  await ck(page, 'config').click(); // uncheck
  expect((await sv(page)).ids).toEqual(['main', 'replay']);
  await ck(page, 'config').click();
  await page.locator(BTN).click(); // close; the pick survives, then switch the active layout through the chip
  await page.locator('[data-layout-chip="config"]').click();
  await page.waitForFunction(() => window.__logic.state.project.layoutId === 'config' && window.__logic.loadedSeq === window.__logic.loadSeq);
  await openPop(page);
  await expect(ck(page, 'config')).toHaveAttribute('aria-checked', 'true'); // the new active layout: checked and disabled
  await expect(ck(page, 'config')).toBeDisabled();
  expect((await sv(page)).ids).toContain('config');
});

test('SpreadUi_Slider_ChangesThePageSpacing', async ({ page }) => {
  await loaded(page, FX);
  await openPop(page);
  await seg(page, 'all').click(); await settled(page, 3);
  const slider = page.locator('[data-spread-dist]');
  await expect(slider).toHaveAttribute('min', '0'); await expect(slider).toHaveAttribute('max', '100');
  await expect(slider).toHaveValue('30');
  const w = await page.evaluate(() => window.__logic.state.pageW);
  expect((await sv(page)).offs[1]).toBeCloseTo(w * 1.3, 3);
  await slider.fill('100');
  expect((await sp(page)).dist).toBe(100);
  expect((await sv(page)).offs[1]).toBeCloseTo(w * 2, 3);
  await slider.fill('0');
  expect((await sv(page)).offs[1]).toBeCloseTo(w, 3);
  await flush(page);
  const xs = await page.evaluate(() => [...document.querySelectorAll('[data-spread-page]')].map((p) => /translateX\(([-\d.e]+)px\)/.exec(p.style.transform)[1]));
  expect(xs.map(Number)).toEqual((await sv(page)).offs); // the stage follows
});

test('SpreadUi_Counts_ShowActiveFrozenUnavailableAndPending', async ({ page }) => {
  await loaded(page, FX);
  await openPop(page);
  await seg(page, 'all').click(); await settled(page, 3); await flush(page);
  const t = await page.evaluate(() => { const L = window.__logic; return { n: L.state.nodes.length, config: L.spreadFrozen.get('config').count, replay: L.spreadFrozen.get('replay').count }; });
  await expect(cnt(page, 'main')).toHaveText(String(t.n));
  await expect(cnt(page, 'config')).toHaveText(String(t.config));
  await expect(cnt(page, 'replay')).toHaveText(String(t.replay));
  await expect(cnt(page, 'broken')).toHaveText('indisponível');
  await expect(row(page, 'main')).toContainText('Main');
  await page.evaluate(() => { const L = window.__logic; L.spreadFrozen.delete('replay'); L.spreadBump(); }); // a drawn layout not yet frozen
  await expect(cnt(page, 'replay')).toHaveText('…');
  await expect(page.locator('[data-spread-total]')).toHaveText('Total: ' + (t.n + t.config) + ' planos'); // the pending layout counts 0 until frozen
  await seg(page, 'pick').click(); // Task 6 (m4): 1-N starts from the drawn layouts, so replay is still picked (and read again, being gone from the map)
  await ck(page, 'replay').click(); // a layout outside the selection is not being read: no pending marker, not in the total
  await expect(cnt(page, 'replay')).toHaveText('—');
  await expect(page.locator('[data-spread-total]')).toHaveText('Total: ' + (t.n + t.config) + ' planos');
});

test('SpreadUi_Warning_AbsentAt1500PresentAt1501AndNeverBlocks', async ({ page }) => {
  await loaded(page, FX);
  await openPop(page);
  await seg(page, 'all').click(); await settled(page, 3); await flush(page);
  expect(await page.evaluate(() => LayersCore.COVERAGE.PLANES_MAX)).toBe(1500);
  await forceTotal(page, 1500);
  await expect(page.locator('[data-spread-total]')).toContainText('1.500');
  await expect(page.locator('[data-spread-warn]')).toHaveCount(0);
  await expect(page.locator(BTN)).not.toContainText('⚠');
  await forceTotal(page, 1501);
  await expect(page.locator('[data-spread-warn]')).toHaveText('Acima de 1.500 planos (1.501): a órbita pode degradar. Selecione menos layouts.');
  await expect(page.locator(BTN)).toContainText('⚠');
  // never blocks: slider, segments, chips and the orbit keep working with the warning up
  await page.locator('[data-spread-dist]').fill('60');
  expect((await sp(page)).dist).toBe(60);
  await seg(page, 'pick').click();
  expect((await sp(page)).mode).toBe('pick');
  await seg(page, 'all').click();
  await page.locator('[data-layout-chip="config"]').click();
  await page.waitForFunction(() => window.__logic.state.project.layoutId === 'config' && window.__logic.loadedSeq === window.__logic.loadSeq);
  expect(await page.evaluate(() => window.__logic.state.modal)).toBeFalsy();
  await settled(page, 3); await flush(page);
  await forceTotal(page, 1500);
  await expect(page.locator('[data-spread-warn]')).toHaveCount(0);
  await openPop(page); // the chip click was an outside click: the popover closed
  await seg(page, 'off').click(); // Foco: nothing is spread, no warning, no badge
  await expect(page.locator('[data-spread-warn]')).toHaveCount(0);
  await expect(page.locator(BTN)).not.toContainText('⚠');
});

test('SpreadUi_Total_IsCachedAcrossRenders', async ({ page }) => {
  await loaded(page, FX);
  await openPop(page);
  await seg(page, 'all').click(); await settled(page, 3); await flush(page);
  const calls = await page.evaluate(async () => {
    const L = window.__logic; let n = 0; const o = LayersCore.spreadPlaneTotal; LayersCore.spreadPlaneTotal = (...a) => { n++; return o(...a); };
    try {
      for (let i = 1; i <= 6; i++) { L.setState({ yaw: i }); await new Promise((r) => setTimeout(r, 30)); } // orbit-like renders
      const during = n;
      L.spreadBump(); await new Promise((r) => setTimeout(r, 60)); // a frozen update recomputes once
      return { during, after: n };
    } finally { LayersCore.spreadPlaneTotal = o; }
  });
  expect(calls.during).toBe(0);
  expect(calls.after).toBe(1);
});

test('SpreadUi_ProjectUnload_ClosesThePopover', async ({ page }) => {
  await loaded(page, FX);
  await openPop(page);
  await act(page, 'unloadProject');
  expect((await sp(page)).menu).toBe(false);
  await expect(page.locator(POP)).toHaveCount(0);
});

for (const [key, name] of [['dark', 'Dark'], ['gray', 'Gray · 1 Grafite'], ['light', 'Bright · 1 Papel']]) {
  test('SpreadUi_Visual_' + key + '_MatchesTheBoard', async ({ page }) => {
    await loaded(page, FX);
    await act(page, 'setCfg', 'theme', name);
    await openPop(page);
    await seg(page, 'pick').click();
    await ck(page, 'config').click(); await settled(page, 1); await flush(page);
    const r = await page.evaluate((b) => {
      const pop = document.querySelector('[data-spread-pop]'), btn = document.querySelector(b), cs = getComputedStyle(pop), bs = getComputedStyle(btn);
      const probe = document.createElement('i'); const color = (v) => { probe.style.color = v; document.body.appendChild(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; };
      const rect = pop.getBoundingClientRect(), par = pop.offsetParent.getBoundingClientRect(), sep = btn.previousElementSibling;
      return {
        w: rect.width, right: par.right - rect.right, bottom: par.bottom - rect.bottom, pos: cs.position, bg: cs.backgroundColor, bgTok: color('var(--bg2)'), border: cs.borderTopColor, borderTok: color('var(--line1)'), radius: cs.borderTopLeftRadius, pad: cs.paddingTop + ' ' + cs.paddingLeft,
        btnBorder: bs.borderTopColor, selTok: color('var(--sel)'), btnColor: bs.color, btnFont: bs.fontFamily, btnWeight: bs.fontWeight, sepW: getComputedStyle(sep).width, sepBg: getComputedStyle(sep).backgroundColor, line1Tok: color('var(--line1)'),
        title: pop.firstElementChild.textContent,
      };
    }, BTN);
    expect(r.pos).toBe('absolute');
    expect(r.w).toBeCloseTo(176, 0);
    expect(r.right).toBeCloseTo(10, 0);
    expect(r.bottom).toBeCloseTo(52, 0);
    expect(r.bg).toBe(r.bgTok); expect(r.border).toBe(r.borderTok); expect(r.radius).toBe('6px'); expect(r.pad).toBe('7px 8px');
    expect(r.btnBorder).toBe(r.selTok); expect(r.btnColor).toBe(r.selTok); expect(r.btnFont).toMatch(/JetBrains Mono/); expect(r.btnWeight).toBe('700');
    expect(r.sepW).toBe('1px'); expect(r.sepBg).toBe(r.line1Tok); // 1px separator before the button
    expect(r.title).toBe('Espalhar layouts');
    await page.evaluate(() => { clearTimeout(window.__logic.toastT); window.__logic.setState({ toast: null }); }); // the load toast would cover the popover
    await flush(page);
    await page.screenshot({ path: 'test-results/spread-ui/popover-' + key + '.png' });
  });
}

// ---- S9.1c Task 6: activate from LOD, overview camera, session, popover polish ----
const cam = (page) => page.evaluate(() => { const s = window.__logic.state; return { yaw: s.yaw, tilt: s.tilt, zoom: s.zoom, panX: s.panX, panY: s.panY, focus: s.focus }; });
const sel = (page) => page.evaluate(() => window.__logic.state.selId);
const sess = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('layers/v1/session') || '{}'));
const loadedNow = (page) => page.waitForFunction(() => window.__logic.loadedSeq === window.__logic.loadSeq);
// A depth>=1 LOD plane of `lid` whose centre really hits itself (3D overlap-safe): the point a user would click
const lodPick = async (page, lid) => { await page.waitForTimeout(450); return lodPoint(page, lid); }; // the world eases over .35s after a camera change: measure once it has settled
const lodPoint = (page, lid) => page.evaluate((lid) => {
  const L = window.__logic, ent = L.spreadFrozen.get(lid), depth = {}; ent.nodes.forEach((n) => { depth[n.id] = n.depth; });
  for (const el of document.querySelectorAll('[data-lod-plane][data-layout="' + lid + '"]')) {
    const r = el.getBoundingClientRect(), x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    if (depth[el.dataset.lodPlane] >= 1 && r.width > 6 && r.height > 6 && document.elementFromPoint(x, y) === el) return { id: el.dataset.lodPlane, x, y };
  }
  return null;
}, lid);
const NORMAL = { yaw: 12, tilt: -8, zoom: 2.5, panX: 33, panY: -21 };

test('SpreadLod_Click_ActivatesTheLayoutAndSelectsTheSameNode', async ({ page }) => {
  await spreadReady(page);
  await act(page, 'setState', { yaw: 20, tilt: 10, zoom: 1.5, panX: 12, panY: -8 });
  const p = await lodPick(page, 'config'); expect(p).not.toBeNull();
  const before = await cam(page);
  await page.mouse.click(p.x, p.y);
  await expect.poll(() => activeId(page)).toBe('config');
  await loadedNow(page);
  expect(await sel(page)).toBe(p.id);
  expect(await page.evaluate((id) => !!window.__logic.state.byId[id], p.id)).toBe(true); // the shallow id exists in the full scan
  expect(await cam(page)).toEqual(before); // overview camera kept
  expect(await page.evaluate(() => window.__logic.state.spread.on)).toBe(true);
  await settled(page, 3); // main is frozen now; config is live
});

test('SpreadLod_Click_PreviousActiveBecomesFullFrozen', async ({ page }) => {
  await spreadReady(page);
  expect((await frozen(page)).main).toBeUndefined();
  const n = await page.evaluate(() => window.__logic.state.nodes.length);
  const p = await lodPick(page, 'replay');
  await page.mouse.click(p.x, p.y);
  await expect.poll(() => activeId(page)).toBe('replay');
  await loadedNow(page);
  const f = await frozen(page);
  expect(f.main).toMatchObject({ full: true, count: n });
  expect(f.config.full).toBe(false);
  expect(f.replay).toBeUndefined(); // the live layout has no frozen entry
});

test('SpreadLod_OrbitDragOverAPlane_DoesNotActivateAndStillOrbits', async ({ page }) => {
  await spreadReady(page);
  const p = await lodPick(page, 'config');
  const y0 = (await cam(page)).yaw;
  await page.evaluate(() => { window.__lodClicks = 0; document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-lod-plane]')) window.__lodClicks++; }, true); });
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 5, p.y, { steps: 2 });
  await page.mouse.move(p.x + 10, p.y, { steps: 2 });
  await page.mouse.up(); // released over the same plane: the browser does dispatch a click on it (past the 3 px threshold)
  await flush(page);
  expect(await page.evaluate(() => window.__lodClicks)).toBe(1);
  expect(await activeId(page)).toBe('main');
  expect(await sel(page)).toBe('0');
  expect((await cam(page)).yaw).not.toBe(y0); // the drag orbited
  expect(await page.evaluate(() => !window.__logic.state.modal && !window.__logic.pendingView)).toBe(true);
});

test('SpreadLod_Hover_HighlightsTheHoveredPlaneOnlyAndClears', async ({ page }) => {
  await spreadReady(page);
  const p = await lodPick(page, 'config');
  await page.mouse.move(p.x, p.y);
  await expect.poll(() => page.evaluate(() => window.__logic.state.lodHover)).toBe('config:' + p.id);
  const hot = await page.evaluate(() => [...document.querySelectorAll('[data-lod-plane][data-lod-hot]')].map((e) => e.dataset.layout + ':' + e.dataset.lodPlane));
  expect(hot).toEqual(['config:' + p.id]);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('[data-lod-plane][data-layout="config"]')).cursor)).toBe('pointer');
  await page.mouse.move(2, 400); // leaves the plane
  await expect.poll(() => page.evaluate(() => window.__logic.state.lodHover)).toBeNull();
  await flush(page);
  await page.mouse.move(p.x, p.y);
  await expect.poll(() => page.evaluate(() => window.__logic.state.lodHover)).toBe('config:' + p.id);
  await act(page, 'spreadOn', false); // unmount clears it
  expect(await page.evaluate(() => window.__logic.state.lodHover)).toBeNull();
});

test('SpreadLod_Hover_IsNotTrackedWhileDragging', async ({ page }) => {
  await spreadReady(page);
  const p = await lodPick(page, 'config');
  const from = await page.evaluate((src) => { // an empty stage point: inside the stage, on neither a plane nor a control
    const st = eval(src), r = st.getBoundingClientRect();
    for (let y = r.top + 40; y < r.bottom - 80; y += 20) for (let x = r.left + 40; x < r.right - 40; x += 20) { const e = document.elementFromPoint(x, y); if (e && st.contains(e) && !e.closest('[data-lod-plane],[data-plane],button,[data-spread-pop],[data-layout-strip]')) return { x, y }; }
    return null;
  }, STAGE_JS);
  expect(from).not.toBeNull();
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  expect(await page.evaluate(() => !!window.__logic.down)).toBe(true); // the press landed on the stage: a drag is in progress
  // a plane sliding under the cursor mid-orbit raises mouseover: replayed here on the plane itself (a real sweep would orbit the plane away first)
  const over = () => page.evaluate(({ lid, id }) => { document.querySelector('[data-lod-plane="' + id + '"][data-layout="' + lid + '"]').dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })); }, { lid: 'config', id: p.id });
  await over();
  expect(await page.evaluate(() => window.__logic.state.lodHover)).toBeNull();
  await page.mouse.up();
  await flush(page);
  await over(); // positive control: with no button down the same event does set it
  expect(await page.evaluate(() => window.__logic.state.lodHover)).toBe('config:' + p.id);
});

test('SpreadLod_Hover_ClearsWhenTheFrozenPagesAreDropped', async ({ page }) => {
  await spreadReady(page);
  await act(page, 'setState', { lodHover: 'config:0.0' }); // as left by a hover (set directly: no live mouse to re-enter or leave)
  await act(page, 'doReload'); // Recarregar empties the map: the pages unmount without a mouseleave
  expect(await page.evaluate(() => window.__logic.state.lodHover)).toBeNull();
});

test('SpreadLod_Click_InPickModeKeepsThePreviousActiveOnTheStage', async ({ page }) => {
  await loaded(page, FX);
  await act(page, 'spreadOn', true, 'pick');
  await act(page, 'setSpreadPick', 'pick', ['config']);
  await settled(page, 1); await flush(page);
  const n = await page.evaluate(() => window.__logic.state.nodes.length);
  const p = await lodPick(page, 'config');
  await page.mouse.click(p.x, p.y);
  await expect.poll(() => activeId(page)).toBe('config');
  await loadedNow(page); await flush(page);
  expect((await sv(page)).ids).toEqual(['main', 'config']); // the layout left behind stays on the stage instead of collapsing it to one page
  expect(await pageIds(page)).toEqual(['main', 'config']);
  expect((await sp(page)).picked).toEqual(['config', 'main']);
  await expect.poll(async () => (await frozen(page)).main).toMatchObject({ full: true, count: n });
  expect(await sel(page)).toBe(p.id);
});

test('SpreadLod_ActivateFromLod_ResolvesTheLayoutAtClickTime', async ({ page }) => {
  await spreadReady(page);
  const p = await lodPick(page, 'config');
  // config turns unavailable between render and click (no bump: the stale plane is still in the DOM)
  await page.evaluate(() => { const F = window.__logic.spreadFrozen; F.set('config', { ...F.get('config'), unavailable: true }); }); // nodes kept on purpose: only the flag may stop the click
  await page.mouse.click(p.x, p.y);
  await flush(page);
  expect(await activeId(page)).toBe('main');
  expect(await page.evaluate(() => window.__logic.pendingView)).toBeNull();
  // the entry point itself, with the render-time plane still "in hand": the flag alone must stop it (the hover re-render above already dropped the plane from the DOM)
  await page.evaluate((id) => window.__logic.activateFromLod('config', id), p.id);
  await flush(page);
  expect(await activeId(page)).toBe('main');
  expect(await page.evaluate(() => window.__logic.pendingView)).toBeNull();
  // a layout that is not drawn is not activated either, and neither is the live one
  await page.evaluate(() => { const L = window.__logic; L.activateFromLod('ghost', '0'); L.activateFromLod('main', '0'); L.activateFromLod('broken', '0'); });
  await flush(page);
  expect(await activeId(page)).toBe('main');
  // the drawn replay still works through the same entry point
  const q = await lodPick(page, 'replay');
  await act(page, 'activateFromLod', 'replay', q.id);
  await expect.poll(() => activeId(page)).toBe('replay');
  await loadedNow(page);
  expect(await sel(page)).toBe(q.id);
});

test('SpreadLod_Click_RespectsTheSwitchGuards', async ({ page }) => {
  await spreadReady(page);
  const p = await lodPick(page, 'config');
  await page.evaluate(() => { window.__logic.setState({ modal: { stage: 'confirm', log: [], title: 'x', label: 'x', text: 'x', onYes: () => {} } }); });
  await act(page, 'activateFromLod', 'config', p.id);
  expect(await activeId(page)).toBe('main');
  expect(await page.evaluate(() => window.__logic.pendingView)).toBeNull();
  await act(page, 'setState', { modal: null });
  await act(page, 'activateFromLod', 'config', p.id); // guards released: the same call now goes through
  await expect.poll(() => activeId(page)).toBe('config');
});

test('SpreadLod_ChipClick_KeepsTheOverviewCameraAndRestoresSelection', async ({ page }) => {
  await spreadReady(page);
  await act(page, 'select', '0.1');
  await act(page, 'setState', { yaw: -20, tilt: 9, zoom: 1.7, panX: 5, panY: -4 });
  const before = await cam(page);
  await page.locator('[data-layout-chip="config"]').click();
  await expect.poll(() => activeId(page)).toBe('config');
  await loadedNow(page);
  expect(await cam(page)).toEqual(before);
  expect(await sel(page)).toBe('0'); // nothing cached for config
  await page.locator('[data-layout-chip="main"]').click();
  await expect.poll(() => activeId(page)).toBe('main');
  await loadedNow(page);
  expect(await cam(page)).toEqual(before);
  expect(await sel(page)).toBe('0.1'); // main's selection comes back from the view cache
});

test('SpreadLod_Switch_KeepsTheOverviewFocusInPlaceOnTheWorld', async ({ page }) => {
  await spreadReady(page);
  const a = await page.evaluate(() => { const L = window.__logic, sv = L.spreadView(); L.setState({ focus: { x: 100, y: 50, zd: null } }); return sv.offs[sv.ai] + 100; });
  await act(page, 'switchLayout', 'replay');
  await expect.poll(() => activeId(page)).toBe('replay');
  await loadedNow(page);
  const b = await page.evaluate(() => { const L = window.__logic, sv = L.spreadView(); return sv.offs[sv.ai] + L.state.focus.x; });
  expect(b).toBeCloseTo(a, 3);
});

test('SpreadCamera_OnOff_RestoresTheExactNormalCameraAndNothingLeaks', async ({ page }) => {
  await loaded(page, FX);
  await act(page, 'setState', { ...NORMAL, focus: { x: 140, y: 60, zd: null } });
  const normal = await cam(page);
  await act(page, 'spreadOn', true); await settled(page, 3);
  expect(await cam(page)).toMatchObject({ yaw: NORMAL.yaw, tilt: NORMAL.tilt, zoom: 1, panX: 0, panY: 0, focus: null }); // overview starts from the defaults, orientation kept
  await act(page, 'setState', { yaw: -30, tilt: 22, zoom: 3.68, panX: 90, panY: 40, focus: { x: 900, y: 300, zd: null } });
  await act(page, 'spreadOn', false);
  expect(await cam(page)).toEqual(normal);
  // a second round starts from the defaults again, not from the previous overview
  await act(page, 'spreadOn', true);
  expect(await cam(page)).toMatchObject({ zoom: 1, panX: 0, panY: 0, focus: null });
  await act(page, 'spreadOn', false);
  expect(await cam(page)).toEqual(normal);
});

test('SpreadCamera_SwitchingLayoutInSpreadNeverLeaksTheOverviewIntoTheNormalView', async ({ page }) => {
  await loaded(page, FX);
  await act(page, 'setState', NORMAL);
  await act(page, 'spreadOn', true); await settled(page, 3);
  await act(page, 'setState', { zoom: 3.68, panX: 50 });
  await act(page, 'switchLayout', 'config');
  await expect.poll(() => activeId(page)).toBe('config');
  await loadedNow(page);
  await act(page, 'spreadOn', false);
  expect(await cam(page)).toMatchObject(NORMAL);
  await act(page, 'switchLayout', 'main'); // main was cached when it was left, with the normal camera
  await expect.poll(() => activeId(page)).toBe('main');
  await loadedNow(page);
  expect(await cam(page)).toMatchObject({ zoom: 2.5 });
});

test('SpreadSession_Key_OnlyWithSpreadOnAndTwoOrMoreLayouts', async ({ page }) => {
  await open(page, 'multi-state'); // 1 layout
  await act(page);
  await act(page, 'spreadOn', true); // no-op: nothing to spread
  const one = await page.evaluate(() => window.__logic.sessionSnapshot());
  expect('spread' in one).toBe(false);
  expect(Object.keys(one)).toEqual(['lastProjectId', 'states', 'selId', 'isoId', 'camera', 'explodeFrom', 'collapseAt']);
  await page.goto('/?layers=fixtures/multi-layout/'); await readNodes(page); await act(page);
  expect('spread' in (await page.evaluate(() => window.__logic.sessionSnapshot()))).toBe(false); // 2+ layouts, Espalhar off
  await act(page, 'spreadOn', true);
  const on = await page.evaluate(() => window.__logic.sessionSnapshot());
  expect(on.spread).toMatchObject({ on: true, mode: 'all', picked: [], dist: 30 });
  expect(Object.keys(on.spread.cam).sort()).toEqual(['focus', 'panX', 'panY', 'tilt', 'yaw', 'zoom']);
  await act(page, 'spreadOn', false);
  expect('spread' in (await page.evaluate(() => window.__logic.sessionSnapshot()))).toBe(false);
});

test('SpreadSession_Reload_RestoresModePickedDistanceAndOverviewCamera', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await act(page, 'setState', NORMAL);
  await act(page, 'spreadOn', true); await settled(page, 3);
  await act(page, 'setSpreadPick', 'pick', ['replay']); await act(page, 'setSpreadDist', 55);
  const ov = { yaw: -20, tilt: 9, zoom: 1.7, panX: 5, panY: -4 };
  await act(page, 'setState', ov);
  await expect.poll(async () => { const s = await sess(page); return s.spread && s.spread.cam && s.spread.cam.yaw; }).toBe(-20);
  const s = await sess(page);
  expect(s.spread).toMatchObject({ on: true, mode: 'pick', picked: ['replay'], dist: 55, cam: ov });
  expect(s.camera).toMatchObject(NORMAL); // the regular camera keys hold the NORMAL camera while Espalhar is on
  await reloadWith(page);
  await act(page);
  await expect.poll(() => page.evaluate(() => window.__logic.state.spread.on)).toBe(true);
  expect(await page.evaluate(() => window.__logic.state.spread)).toEqual({ on: true, mode: 'pick', picked: ['replay'], dist: 55 });
  expect(await cam(page)).toMatchObject(ov);
  await expect.poll(async () => Object.keys(await frozen(page)).sort()).toEqual(['replay']); // the frozen reads were kicked
  await act(page, 'spreadOn', false);
  expect(await cam(page)).toMatchObject(NORMAL);
  await expect.poll(async () => 'spread' in (await sess(page))).toBe(false);
});

test('SpreadSession_Reload_IgnoresGarbageValues', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await reloadWith(page, { spread: { on: true, mode: 'zzz', picked: ['ghost', 7, 'config', 'config'], dist: 'NaN', cam: { yaw: 'x', tilt: 999, zoom: 1e9, panX: null, panY: Infinity, focus: { x: 'a' } } } });
  await act(page);
  await expect.poll(() => page.evaluate(() => window.__logic.state.spread.on)).toBe(true);
  expect(await page.evaluate(() => window.__logic.state.spread)).toEqual({ on: true, mode: 'all', picked: ['config'], dist: 30 });
  expect(await cam(page)).toEqual({ yaw: 0, tilt: 70, zoom: 12, panX: 0, panY: 0, focus: null });
  for (const bad of [null, 5, 'on', [], { on: false, mode: 'all' }, { mode: 'pick' }]) {
    await reloadWith(page, { spread: bad });
    await act(page);
    await loadedNow(page);
    expect(await page.evaluate(() => window.__logic.state.spread.on)).toBe(false);
  }
});

test('SpreadSession_Reload_SingleLayoutProjectIgnoresTheKey', async ({ page }) => {
  await open(page, 'multi-state');
  await act(page);
  await reloadWith(page, { spread: { on: true, mode: 'all', picked: [], dist: 30, cam: { zoom: 3 } } });
  await act(page);
  await loadedNow(page);
  expect(await page.evaluate(() => window.__logic.state.spread.on)).toBe(false);
  expect(await cam(page)).toMatchObject({ zoom: 1 });
  await expect.poll(async () => 'spread' in (await sess(page))).toBe(false);
});

test('SpreadSession_Zerar_RemovesTheKeyAndResetsTheSpread', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await act(page, 'spreadOn', true); await settled(page, 3);
  await expect.poll(async () => 'spread' in (await sess(page))).toBe(true);
  await act(page, 'resetUI');
  expect(await page.evaluate(() => window.__logic.state.spread)).toEqual({ on: false, mode: 'all', picked: [], dist: 30 });
  await expect.poll(async () => 'spread' in (await sess(page))).toBe(false);
});

// ---- carryover from the Task 5 review ----
test('SpreadUi_Popover_DoubleClickDoesNotResetTheViewOrClearIsolation', async ({ page }) => {
  await loaded(page, FX);
  await openPop(page);
  await seg(page, 'pick').click(); await ck(page, 'config').click(); await settled(page, 1);
  await act(page, 'setState', { yaw: 7, zoom: 2.2, isoId: '0.1' });
  const before = await cam(page);
  await ck(page, 'replay').dblclick();
  await ck(page, 'replay').dblclick();
  await seg(page, 'all').dblclick();
  await flush(page);
  expect(await cam(page)).toEqual({ ...before });
  expect(await page.evaluate(() => window.__logic.state.isoId)).toBe('0.1');
});

test('SpreadUi_TodosToPick_SeedsPickedWithTheDrawnLayoutsAndKeepsTheFrozenSnapshots', async ({ page }) => {
  await loaded(page, FX);
  await openPop(page);
  await seg(page, 'all').click(); await settled(page, 3); await flush(page);
  await page.evaluate(() => {
    const L = window.__logic, o = L.readText.bind(L); window.__reads = 0; L.readText = (...a) => { window.__reads++; return o(...a); };
    window.__entries = { config: L.spreadFrozen.get('config'), replay: L.spreadFrozen.get('replay') };
  });
  await seg(page, 'pick').click(); await flush(page);
  expect((await sp(page)).picked).toEqual(['main', 'config', 'replay']); // the ids drawn (broken is unavailable)
  expect(await page.evaluate(() => window.__reads)).toBe(0); // no layout was read again
  expect(await page.evaluate(() => ['config', 'replay'].every((k) => window.__logic.spreadFrozen.get(k) === window.__entries[k]))).toBe(true); // same frozen entries
  await expect(ck(page, 'config')).toHaveAttribute('aria-checked', 'true');
  await ck(page, 'config').click(); // the user prunes from the full set
  expect((await sv(page)).ids).toEqual(['main', 'replay']);
});

test('SpreadUi_Escape_ClosesThePopoverBeforeTheSelectionReset', async ({ page }) => {
  await loaded(page, FX);
  await act(page, 'select', '0.1');
  await openPop(page);
  await page.keyboard.press('Escape');
  await expect(page.locator(POP)).toHaveCount(0);
  expect(await sel(page)).toBe('0.1'); // a non-root selection survived the Esc that closed the popover
  await page.keyboard.press('Escape'); // nothing open now: the reset runs
  expect(await sel(page)).toBe('0');
});

test('SpreadUi_Escape_OrderWithShortcutsAndContextMenuOpen', async ({ page }) => {
  await loaded(page, FX);
  await openPop(page);
  await act(page, 'setState', { shortcuts: true });
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.__logic.state.shortcuts)).toBe(false); // Atalhos closes first
  expect((await sp(page)).menu).toBe(true);
  await page.keyboard.press('Escape');
  expect((await sp(page)).menu).toBe(false);
  await openPop(page);
  await page.evaluate(() => { window.__logic.setState({ ctx: { x: 300, y: 300, id: '0.1' } }); });
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => !window.__logic.state.ctx)).toBe(true); // the context menu closes first
  expect((await sp(page)).menu).toBe(true);
  await page.keyboard.press('Escape');
  expect((await sp(page)).menu).toBe(false);
});

test('SpreadUi_Popover_ClosesOnProjectSwitch', async ({ page }) => {
  await connectFixture(page, 'multi-layout');
  await act(page);
  await openPop(page);
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('proj3', { create: true });
    const put = async (name, text) => { const w = await (await dir.getFileHandle(name, { create: true })).createWritable(); await w.write(text); await w.close(); };
    await put('layers.json', '{"name":"Third","layouts":[{"id":"a","name":"A","mock":"a.html"},{"id":"b","name":"B","mock":"b.html"}]}');
    const body = '<!doctype html><html><body><div id="r"><p>x</p></div></body></html>';
    await put('a.html', body); await put('b.html', body);
    window.showDirectoryPicker = async () => dir;
  });
  await act(page, 'pickDir');
  await expect.poll(() => page.evaluate(() => window.__logic.state.project && window.__logic.state.project.name)).toBe('Third');
  await loadedNow(page);
  expect((await sp(page)).menu).toBe(false);
  await expect(page.locator(POP)).toHaveCount(0);
});

test('SpreadUi_Popover_OutsideClickOnAStableStagePoint', async ({ page }) => {
  await loaded(page, FX);
  await openPop(page);
  const pt = await page.evaluate(() => { const r = document.querySelector('[data-spread-pop]').offsetParent.getBoundingClientRect(); return { x: Math.round(r.left + 60), y: Math.round(r.top + 120) }; });
  expect(await page.evaluate((p) => { const e = document.elementFromPoint(p.x, p.y); return !!e && !e.closest('[data-spread-pop],[data-spread-btn]'); }, pt)).toBe(true);
  await page.mouse.click(pt.x, pt.y);
  await expect(page.locator(POP)).toHaveCount(0);
});

test('SpreadUi_Checkbox_GlyphFitsItsBoxAtLargeFontScale', async ({ page }) => {
  await loaded(page, FX);
  await act(page, 'setCfg', 'fontScale', 1.6);
  await openPop(page);
  await seg(page, 'all').click(); await settled(page, 3);
  const r = await page.evaluate(() => {
    const box = document.querySelector('[data-spread-ck] span'), b = box.getBoundingClientRect();
    const rg = document.createRange(); rg.selectNodeContents(box); const g = rg.getBoundingClientRect();
    return { w: b.width, h: b.height, gw: g.width, gh: g.height };
  });
  expect(r.gw).toBeLessThanOrEqual(r.w); expect(r.gh).toBeLessThanOrEqual(r.h + 0.5);
  expect(r.w).toBeCloseTo(13 * 1.6, 0); // the box scales with --fs
});

test('SpreadUi_Aria_ButtonOpensADialogAndDoesNotClaimToBePressed', async ({ page }) => {
  await loaded(page, FX);
  await expect(page.locator(BTN)).not.toHaveAttribute('aria-pressed', /.*/);
  await expect(page.locator(BTN)).toHaveAttribute('aria-haspopup', 'dialog');
  await openPop(page);
  const id = await page.locator(POP).getAttribute('id');
  expect(id).toBeTruthy();
  await expect(page.locator(BTN)).toHaveAttribute('aria-controls', id);
  await expect(page.locator(POP)).toHaveAttribute('role', 'dialog');
  await expect(page.locator(POP)).toHaveAttribute('aria-label', 'Espalhar layouts');
});
