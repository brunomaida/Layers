import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';
import { act } from './ctx-helpers.js';
import { connectFixture } from './folder-helpers.js';

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
