import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';
import { act } from './ctx-helpers.js';

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
  const same = await page.evaluate(() => {
    const L = window.__logic; const nodes = L.state.nodes, els = L.els;
    L.scanRoot(L.pageRef.current, L.mockRoot, { maxDepth: 1 });
    return L.state.nodes === nodes && L.els === els;
  });
  expect(same).toBe(true);
});

test('BuildMockDom_InactiveHost_LeavesLoaderSingletonsUntouched', async ({ page }) => {
  await loaded(page, '/?layers=fixtures/multi-layout/');
  const r = await page.evaluate(async () => {
    const L = window.__logic; const man = L.state.project.man;
    const other = LayersCore.projectLayouts(man).find((l) => l.id === 'config');
    const snap = () => JSON.stringify({ mt: L.mtimes, w: L.watch, ha: L.hostApplied, st: L.structural, ld: L.loaded && L.loaded.mockPath, pk: L.pendingKey });
    const before = snap(), root0 = L.mockRoot, nodes0 = L.state.nodes, planes0 = document.querySelectorAll('[data-plane]').length;
    const tmp = document.createElement('div'); tmp.style.cssText = 'position:fixed;left:-99999px;top:0;width:1280px'; document.body.appendChild(tmp);
    const mb = await L.buildMockDom(man, other, tmp, { active: false });
    const scanned = L.scanRoot(tmp, mb.rootEl);
    const ids = [...tmp.shadowRoot.querySelectorAll('[id]')].map((e) => e.id).sort();
    tmp.remove();
    return {
      same: snap() === before && L.mockRoot === root0 && L.state.nodes === nodes0 && document.querySelectorAll('[data-plane]').length === planes0,
      ids, scannedCount: scanned.nodes.length, hostAttrs: tmp.getAttributeNames().sort(), mainIds: [...document.querySelectorAll('*')].filter((e) => e.shadowRoot && e.shadowRoot !== tmp.shadowRoot && e.shadowRoot.childElementCount).map((e) => [...e.shadowRoot.querySelectorAll('[id]')].map((x) => x.id).sort()),
    };
  });
  expect(r.same).toBe(true);
  expect(r.ids).toEqual(['cfg-field', 'cfg-panel', 'cfg-title']);
  expect(r.scannedCount).toBeGreaterThan(0);
  expect(r.mainIds).toEqual([['main-a', 'main-title']]);
});
