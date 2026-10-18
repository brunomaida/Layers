import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';
import { connectFixture } from './folder-helpers.js';

// S3.5 part 1: flat view with a single exploded branch, driven through the component actions (`act`) or through the
// persisted session (`reloadWith`). Part 2 (end of file) drives the real context menu with real right-clicks.
// Every test runs on a connected folder: fixture mode (?layers=) restores no session and never persists a branch.
// Fixture axai: .section-head (0.0.2.0, L3) -> .select-all 0.0.2.0.0 (L4) -> 0.0.2.0.0.0 (L5)
// and .section-controls 0.0.2.0.4 (L4) -> 0.0.2.0.4.0 (L5) -> 0.0.2.0.4.0.0 (L6).
const ROOT = '0.0.2.0';
const L4 = '0.0.2.0.0';
const L5 = '0.0.2.0.0.0';
const L5B = '0.0.2.0.4.0';
const L6 = '0.0.2.0.4.0.0';
const SESSION = 'layers/v1/session';

// The component instance is the `logic` of the StreamableComponent fiber behind the stage (support.js runtime): the only
// place in this spec that reaches into it. Used for state reads (`window.__logic.state`) and `loadProject`, not as a menu
// substitute. Calls `method(...args)` when given, and returns the branch keys of the state (read once the render settles).
async function act(page, method, ...args) {
  await page.evaluate(({ method, args }) => {
    const el = document.querySelector('[data-plane]');
    let f = el[Object.keys(el).find((k) => k.startsWith('__reactFiber'))];
    while (f && !(f.stateNode && f.stateNode.logic && f.stateNode.logic.explodeHere)) f = f.return;
    window.__logic = f.stateNode.logic;
    if (method) window.__logic[method](...args);
  }, { method, args });
  await page.waitForTimeout(150);
  return page.evaluate(() => ({ explodeFrom: window.__logic.state.explodeFrom, collapseAt: window.__logic.state.collapseAt }));
}

// On the next load, patches layers/v1/session (camera merged). A plain localStorage write would be
// overwritten by the pagehide drain of the page being left; sessionStorage survives the reload.
async function open(page) {
  await page.addInitScript(() => {
    try {
      const raw = sessionStorage.getItem('__seedSession');
      if (!raw) return;
      sessionStorage.removeItem('__seedSession');
      const cur = JSON.parse(localStorage.getItem('layers/v1/session') || '{}'); const p = JSON.parse(raw);
      localStorage.setItem('layers/v1/session', JSON.stringify({ ...cur, ...p, camera: { ...cur.camera, ...p.camera } }));
    } catch (e) { /* no storage */ }
  });
  // Chromium crashes the page when an OPFS directory handle is read back from IndexedDB, which restoreSession does
  // for a connected folder. Stand-in: IndexedDB keeps a placeholder and the 'h' store reads the proj folder from OPFS.
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put; const get = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.put = function (v, k) { return this.name === 'h' ? put.call(this, { stub: 1 }, k) : put.apply(this, arguments); };
    IDBObjectStore.prototype.get = function () {
      if (this.name !== 'h') return get.apply(this, arguments);
      const req = { result: undefined, error: null };
      Object.defineProperty(req, 'onsuccess', { set(f) { navigator.storage.getDirectory().then((r) => r.getDirectoryHandle('proj')).then((h) => { h.queryPermission = async () => 'granted'; window.__proj = h; req.result = h; f(); }); } });
      return req;
    };
  });
  await connectFixture(page, 'axai');
}

async function reloadWith(page, patch) {
  if (patch) await page.evaluate((p) => sessionStorage.setItem('__seedSession', JSON.stringify(p)), patch);
  await page.reload();
  await readNodes(page);
}

const toggle = (page) => page.getByRole('button', { name: /Explodido/ });
async function goFlat(page) {
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('title', /Vista plana/);
}

const session = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), SESSION);
const spacing = async (page) => +(await page.locator('input[type=range][min="30"][max="200"]').inputValue());

// translateZ in px of every plane, by id
const zs = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-plane]')].map((e) => {
  const m = /translateZ\((-?[\d.]+)px\)/.exec(e.style.transform);
  return [e.dataset.plane, m ? +m[1] : null];
})));
const opacities = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-plane]')].map((e) => [e.dataset.plane, +e.style.opacity])));

const inBranch = (id) => id === ROOT || id.startsWith(ROOT + '.');
const allFlat = async (page) => { const z = await zs(page); for (const id of Object.keys(z)) expect(z[id], id).toBe(0); };

test('Explode_FlatBranch_OnlyBranchGetsDepth', async ({ page }) => {
  await open(page);
  await goFlat(page);
  await act(page, 'explodeHere', ROOT); // not the menu: right-clicking selects ROOT, which adds the 0.5 off-path offset this test excludes
  const sp = await spacing(page);
  await expect.poll(async () => (await zs(page))[L4]).toBe(sp);
  const z = await zs(page);
  expect(z[ROOT]).toBe(0);
  expect(z[L5]).toBe(2 * sp);
  expect(z[L6]).toBe(3 * sp);
  const outside = Object.keys(z).filter((id) => !inBranch(id));
  expect(outside.length).toBeGreaterThan(30);
  for (const id of outside) expect(z[id], id).toBe(0);
  // markers: tree row of the root and the Camadas chip of its depth
  const row = page.locator(`[data-node-id="${ROOT}"]`);
  await expect(row).toContainText('▧');
  await expect(row).toHaveAttribute('title', /Explodido a partir daqui \(vista plana\)\. Botão direito › Recolher até aqui desfaz\./);
  await expect(page.locator('button[title^="Camada L3 "]')).toContainText('▧');
  await expect(page.locator('button[title^="Camada L4 "]')).not.toContainText('▧');
  await expect(page.getByText('▤ Plana · ▧ ramo')).toBeVisible();
});

test('Collapse_AtL5_DeeperBackToL5Plane', async ({ page }) => {
  await open(page);
  await goFlat(page);
  await act(page, 'explodeHere', ROOT);
  expect(await act(page, 'collapseHere', L5)).toEqual({ explodeFrom: ROOT, collapseAt: 5 });
  const sp = await spacing(page);
  await expect.poll(async () => (await zs(page))[L6]).toBe(2 * sp);
  const z = await zs(page);
  expect(z[L4]).toBe(sp);
  expect(z[L5]).toBe(2 * sp);
  expect(z[L5B]).toBe(2 * sp);
});

test('Collapse_OnBranchRoot_ClearsBoth', async ({ page }) => {
  await open(page);
  await goFlat(page);
  await act(page, 'explodeHere', ROOT);
  await act(page, 'collapseHere', L5);
  expect(await act(page, 'collapseHere', ROOT)).toEqual({ explodeFrom: null, collapseAt: null });
  await expect.poll(async () => (await zs(page))[L4]).toBe(0);
  await allFlat(page);
  await expect(page.getByText('▤ Plana · ▧ ramo')).toHaveCount(0);
});

test('Collapse_OutsideBranch_NoOp', async ({ page }) => {
  await open(page);
  await goFlat(page);
  await act(page, 'explodeHere', ROOT);
  // a sibling subtree and an ancestor of the root are not in the branch
  expect(await act(page, 'collapseHere', '0.1')).toEqual({ explodeFrom: ROOT, collapseAt: null });
  expect(await act(page, 'collapseHere', '0.0.2')).toEqual({ explodeFrom: ROOT, collapseAt: null });
});

test('Explode_NotFlat_NoOp', async ({ page }) => {
  await open(page);
  expect(await act(page, 'explodeHere', ROOT)).toEqual({ explodeFrom: null, collapseAt: null });
  expect(await act(page, 'explodeHere', 'no.such.id')).toEqual({ explodeFrom: null, collapseAt: null });
});

test('Explode_ExplodidoMode_KeepsDepthTimesSpacing', async ({ page }) => {
  await open(page);
  await goFlat(page);
  await act(page, 'explodeHere', ROOT);
  await toggle(page).click(); // back to the exploded view with the branch still stored
  await expect(toggle(page)).toHaveAttribute('title', /Vista explodida/);
  expect((await act(page)).explodeFrom).toBe(ROOT);
  const sp = await spacing(page);
  await expect.poll(async () => (await zs(page))[L6]).toBe(6 * sp);
  const z = await zs(page);
  for (const id of Object.keys(z)) expect(z[id], id).toBe((id.split('.').length - 1) * sp);
  await expect(page.getByText('▤ Plana · ▧ ramo')).toHaveCount(0);
});

test('Explode_SelectionInBranch_DimsBranchSiblingsOnly', async ({ page }) => {
  await open(page);
  await goFlat(page);
  await act(page, 'explodeHere', ROOT);
  const sp = await spacing(page);
  await expect.poll(async () => (await zs(page))[L4]).toBe(sp);
  const before = await opacities(page);
  await page.locator('[data-node-id="0.0.2.0.4"]').click(); // .section-controls (L4), inside the branch
  // the existing rule: planes off the selection path are dimmed x0.35 when their effective spacing is > 0
  await expect.poll(async () => (await opacities(page))[L4]).toBeCloseTo(before[L4] * 0.35, 5);
  const after = await opacities(page);
  const z = await zs(page);
  expect(after['0.0.2.0.4']).toBe(before['0.0.2.0.4']); // selected
  expect(after[ROOT]).toBe(before[ROOT]); // on the path
  expect(after[L5B]).toBe(before[L5B]); // under the selection
  expect(after[L5]).toBeCloseTo(before[L5] * 0.35, 5); // sibling subtree, deeper
  expect(after['0.1']).toBe(before['0.1']); // outside the branch: flat behaviour, spacing 0
  // z keeps following branchZ and is not faded by the z > activeZ rule
  expect(z[L4]).toBe(sp);
  expect(z[L5]).toBe(2 * sp);
  expect(z[L6]).toBe(3 * sp);
  expect(z['0.1']).toBe(0.5); // existing flat rule for off-path planes (0.5 per level under the path), untouched
});

test('Explode_Reload_RestoresFromSession', async ({ page }) => {
  await open(page);
  await goFlat(page);
  await act(page, 'explodeHere', ROOT);
  await act(page, 'collapseHere', L5);
  await expect.poll(async () => (await session(page)).explodeFrom).toBe(ROOT);
  expect((await session(page)).collapseAt).toBe(5);
  await reloadWith(page); // folder mode restores flat as well: no Explodido click
  const sp = await spacing(page);
  await expect.poll(async () => (await zs(page))[L4]).toBe(sp);
  const z = await zs(page);
  expect(z[L6]).toBe(2 * sp);
  expect(z['0.1']).toBe(0);
  await expect(page.getByText('▤ Plana · ▧ ramo')).toBeVisible();
});

test('Explode_MissingRoot_IgnoredAndCleared', async ({ page }) => {
  await open(page);
  await goFlat(page);
  // control: the same seeding path with a root that exists is restored, so the second phase can only differ by the id
  await reloadWith(page, { explodeFrom: ROOT, collapseAt: null, camera: { flat: true } });
  const sp = await spacing(page);
  await expect.poll(async () => (await zs(page))[L4]).toBe(sp);
  await reloadWith(page, { explodeFrom: '0.9.9.9', collapseAt: 4, camera: { flat: true } });
  await expect(toggle(page)).toHaveAttribute('title', /Vista plana/);
  await expect.poll(async () => (await act(page)).explodeFrom).toBeNull();
  expect((await act(page)).collapseAt).toBeNull();
  await expect.poll(async () => (await session(page)).explodeFrom).toBeNull();
  expect((await session(page)).collapseAt).toBeNull();
  await allFlat(page);
  await expect(page.getByText('▤ Plana · ▧ ramo')).toHaveCount(0);
});

test('Explode_InvalidCollapseAt_Ignored', async ({ page }) => {
  await open(page);
  await goFlat(page);
  // L2 is shallower than the root (L3): the cut is ignored and the branch goes down to the leaf
  await reloadWith(page, { explodeFrom: ROOT, collapseAt: 2, camera: { flat: true } });
  const sp = await spacing(page);
  await expect.poll(async () => (await zs(page))[L6]).toBe(3 * sp);
  expect((await zs(page))[ROOT]).toBe(0);
});

test('Explode_Reanalisar_Clears', async ({ page }) => {
  await open(page);
  await goFlat(page);
  await act(page, 'explodeHere', ROOT);
  const sp = await spacing(page);
  await expect.poll(async () => (await zs(page))[L4]).toBe(sp);
  await expect.poll(async () => (await session(page)).explodeFrom).toBe(ROOT);

  const trigger = page.getByRole('button', { name: /Axaí/ }).first();
  const item = page.getByText(/Reanalisar do 0/).first();
  await trigger.click();
  if (!(await item.waitFor({ state: 'visible', timeout: 2000 }).then(() => true, () => false))) await trigger.click();
  await item.click();
  await page.getByRole('button', { name: 'Reler mesmo assim' }).click();
  await readNodes(page);
  await expect.poll(async () => (await session(page)).explodeFrom).toBeNull();
  expect((await session(page)).collapseAt).toBeNull();
  await allFlat(page);
});

test('Explode_FailedLoad_DoesNotLeaveBranchInSession', async ({ page }) => {
  await open(page);
  await goFlat(page);
  await act(page, 'explodeHere', ROOT);
  await expect.poll(async () => (await session(page)).explodeFrom).toBe(ROOT);
  const id = (await session(page)).lastProjectId;
  expect(id).toBe('folder:proj');
  // the folder now holds an unreadable layers.json: the load fails and unloads the project
  await page.evaluate(async () => {
    const w = await (await window.__proj.getFileHandle('layers.json')).createWritable();
    await w.write('{ not json');
    await w.close();
  });
  await act(page, 'loadProject');
  await expect(page.getByText('layers.json inválido.')).toBeVisible();
  await expect.poll(async () => (await session(page)).explodeFrom).toBeNull();
  expect((await session(page)).collapseAt).toBeNull();
  expect((await session(page)).lastProjectId).toBe(id);
  await page.reload(); // the folder still fails to load: nothing is restored
  await expect(page.getByText('layers.json inválido.')).toBeVisible();
  await page.waitForTimeout(600);
  expect((await session(page)).explodeFrom).toBeNull();
  expect((await session(page)).lastProjectId).toBe(id);
});

// The mark span sits in every rail chip: unmarked it must take no room (frozen visual), marked it gets its gap.
const markBox = (page) => page.evaluate(() => [...document.querySelectorAll('button[title^="Camada L"]')].map((b) => {
  const s = b.lastElementChild; const r = s.getBoundingClientRect();
  return { d: b.title.slice(7, 9).trim(), text: s.textContent, ml: getComputedStyle(s).marginLeft, w: Math.round(r.width) };
}));

test('Explode_RailChips_UnmarkedTakeNoRoom', async ({ page }) => {
  await open(page);
  const none = await markBox(page);
  expect(none.length).toBeGreaterThan(3);
  for (const c of none) expect(c, c.d).toMatchObject({ text: '', ml: '0px', w: 0 });
  await goFlat(page);
  await act(page, 'explodeHere', ROOT);
  await expect.poll(async () => (await markBox(page)).find((c) => c.d === 'L3').text).toBe('▧');
  const marked = await markBox(page);
  expect(marked.find((c) => c.d === 'L3').ml).toBe('3px');
  for (const c of marked.filter((c) => c.d !== 'L3')) expect(c, c.d).toMatchObject({ text: '', ml: '0px', w: 0 });
});

// ---------------------------------------------------------------------------------------------------------------
// S3.5 part 2: the context menu. Fixture axai nodes with a hittable plane: ROOT (L3) > C4 .section-controls > C5 > C6 (leaf); 0.1 (L1) has a shallow subtree.
const C4 = '0.0.2.0.4';
const C5 = '0.0.2.0.4.0';
const C6 = '0.0.2.0.4.0.0';
const SHALLOW = '0.1';
// Every trigger is a REAL right-click (page.mouse at a point that hits the plane, or
// locator.click({button:'right'}) on a tree row): 3D transforms make the plane's centre unreliable, so `planePoint`
// scans the plane's box for a point whose topmost element is that very plane. The fiber helper `act` is only used here
// to read state (`stateOf`).
const panel = (page) => page.getByRole('menu', { name: /Camadas/ });
const sub = (page) => page.getByRole('menu', { name: /Ações/ });
const item = (page, name) => sub(page).getByRole('menuitem', { name });
const layerRow = (page, d) => panel(page).locator(`[data-ctx-d="${d}"]`);
const stateOf = async (page, key) => { await act(page); return page.evaluate((k) => window.__logic.state[k], key); };

// Polls until the point is the same on two reads 120ms apart: right after goFlat or an explode the planes are still easing
// (transform .35s), so an early point can end up on a neighbour plane by the time the click lands.
async function planePoint(page, id) {
  let p = null;
  await expect.poll(async () => {
    const prev = p;
    p = await page.evaluate((id) => {
      const el = document.querySelector(`[data-plane="${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const fr = [0.5, 0.25, 0.75, 0.1, 0.9, 0.4, 0.6];
      for (const fy of fr) for (const fx of fr) {
        const x = r.left + r.width * fx, y = r.top + r.height * fy;
        const t = document.elementFromPoint(x, y), q = t && t.closest('[data-plane]');
        if (q && q.dataset.plane === id) return { x, y };
      }
      return null;
    }, id);
    await page.waitForTimeout(120);
    return p !== null && prev !== null && Math.abs(p.x - prev.x) < 0.5 && Math.abs(p.y - prev.y) < 0.5;
  }, { message: `visible point on plane ${id}`, timeout: 8000 }).toBe(true);
  return p;
}
async function rightClick(page, id) {
  const { x, y } = await planePoint(page, id);
  await page.mouse.click(x, y, { button: 'right' });
}
async function explodeViaMenu(page, id) {
  await rightClick(page, id);
  await item(page, /Explodir daqui/).click();
  await expect(panel(page)).toHaveCount(0);
}

test.describe('ContextMenu_Ui', () => {
  test('ContextMenu_RightClickPlane_SelectsAndOpens', async ({ page }) => {
    await open(page);
    await goFlat(page);
    expect(await stateOf(page, 'selId')).not.toBe(C4);
    await rightClick(page, C4);
    await expect(panel(page)).toBeVisible();
    expect(await stateOf(page, 'selId')).toBe(C4);
    await expect(panel(page)).toContainText('.section-controls');
    await expect(panel(page)).toContainText(/L4 · .*\.css › L\d+/);
    await expect(panel(page)).toContainText('Camadas');
    await expect(sub(page)).toBeVisible();
    // the menu sits at the cursor and stays inside the viewport
    const box = await panel(page).boundingBox();
    const vp = page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
    expect(Math.round(box.width)).toBe(222);
    expect(Math.round((await sub(page).boundingBox()).width)).toBe(164);
  });

  test('ContextMenu_LayersListHighlightsSelected', async ({ page }) => {
    await open(page);
    await goFlat(page);
    await rightClick(page, SHALLOW);
    await act(page);
    const info = await page.evaluate((id) => {
      const s = window.__logic.state, under = (n) => n.id !== id && n.id.startsWith(id + '.');
      const cnt = (d, f) => s.nodes.filter((n) => n.depth === d && f(n)).length;
      return { max: s.maxDepth, selName: s.byId[id].name, rootName: s.byId['0'].name, d2: cnt(2, under), d3: cnt(3, under), d4: cnt(4, under), total1: cnt(1, () => true) };
    }, SHALLOW);
    expect(info.d2).toBeGreaterThan(0);
    expect(info.d4).toBe(0); // the shallow subtree ends above L4
    await expect(panel(page).locator('[data-ctx-d]')).toHaveCount(info.max + 1);
    await expect(layerRow(page, 1)).toHaveAttribute('aria-current', 'true');
    await expect(layerRow(page, 1)).toContainText(info.selName);
    await expect(layerRow(page, 1)).toContainText(String(info.total1));
    for (const d of [0, 2, 3, 4]) await expect(layerRow(page, d)).not.toHaveAttribute('aria-current', 'true');
    await expect(layerRow(page, 0)).toContainText(info.rootName); // ancestor named
    await expect(layerRow(page, 2)).toContainText(info.d2 + ' no ramo'); // descendant level
    await expect(layerRow(page, 4)).toContainText('fora do ramo');
    await expect(layerRow(page, 4)).toBeDisabled();
    await expect(layerRow(page, 2)).toBeDisabled();
    await expect(layerRow(page, 0)).toBeEnabled();
  });

  test('ContextMenu_ExplodirDaqui_Flat', async ({ page }) => {
    await open(page);
    await goFlat(page);
    await rightClick(page, ROOT);
    await expect(item(page, /Explodir daqui/)).toBeVisible();
    await expect(item(page, /Recolher/)).toHaveCount(0);
    await item(page, /Explodir daqui/).click();
    await expect(panel(page)).toHaveCount(0);
    expect((await act(page)).explodeFrom).toBe(ROOT);
    const sp = await spacing(page);
    await expect.poll(async () => (await zs(page))[C4]).toBe(sp);
    const z = await zs(page);
    expect(z[C6]).toBe(3 * sp);
    expect(z['0.1']).toBeLessThanOrEqual(0.5); // outside the branch: the flat off-path rule only (0 or 0.5), no branch depth
    // inside an exploded branch the item is replaced by Recolher
    await rightClick(page, C5);
    await expect(item(page, /Explodir daqui/)).toHaveCount(0);
  });

  test('ContextMenu_RecolherAteAqui_InBranch', async ({ page }) => {
    await open(page);
    await goFlat(page);
    await explodeViaMenu(page, ROOT);
    await rightClick(page, C5);
    await expect(item(page, /Recolher até aqui/)).toBeVisible();
    await expect(item(page, /Recolher até aqui/)).toContainText('L6+ → L5');
    await item(page, /Recolher até aqui/).click();
    await expect(panel(page)).toHaveCount(0);
    expect(await act(page)).toEqual({ explodeFrom: ROOT, collapseAt: 5 });
    const sp = await spacing(page);
    await expect.poll(async () => (await zs(page))[C6]).toBe(2 * sp);
    // on the branch root, Recolher undoes the whole explosion
    await rightClick(page, ROOT);
    await item(page, /Recolher até aqui/).click();
    expect(await act(page)).toEqual({ explodeFrom: null, collapseAt: null });
    await expect.poll(async () => (await zs(page))[C4]).toBe(0);
  });

  test('ContextMenu_ClickLayerRow_SelectsAncestor', async ({ page }) => {
    await open(page);
    await goFlat(page);
    await rightClick(page, C5);
    await layerRow(page, 3).click();
    expect(await stateOf(page, 'selId')).toBe(ROOT);
    await expect(panel(page)).toBeVisible(); // stays open on the new selection
    await expect(layerRow(page, 3)).toHaveAttribute('aria-current', 'true');
    await expect(panel(page)).toContainText('.section-head');
    await expect(layerRow(page, 5)).toContainText('no ramo');
    await expect(sub(page)).toBeVisible();
    // still inside the viewport after the layout changed
    const box = await panel(page).boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height);
  });

  test('ContextMenu_Esc_Closes', async ({ page }) => {
    await open(page);
    await goFlat(page);
    await rightClick(page, C4);
    await expect(panel(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);
    expect(await stateOf(page, 'selId')).toBe(C4); // Esc closed only the menu; the selection stays
  });

  test('ContextMenu_OutsideClick_Closes', async ({ page }) => {
    await open(page);
    await goFlat(page);
    await rightClick(page, C4);
    await expect(panel(page)).toBeVisible();
    await panel(page).click({ position: { x: 20, y: 12 } }); // inside the header: stays open
    await expect(panel(page)).toBeVisible();
    await page.mouse.click(3, 3);
    await expect(panel(page)).toHaveCount(0);
  });

  test('ContextMenu_TreeRow_Opens', async ({ page }) => {
    await open(page);
    await goFlat(page);
    await page.locator(`[data-node-id="${C4}"]`).click({ button: 'right' });
    await expect(panel(page)).toBeVisible();
    expect(await stateOf(page, 'selId')).toBe(C4);
    await expect(panel(page)).toContainText('.section-controls');
    await expect(layerRow(page, 4)).toHaveAttribute('aria-current', 'true');
  });

  test('ContextMenu_RightDrag_DoesNotOpen', async ({ page }) => {
    await open(page);
    await goFlat(page);
    const { x, y } = await planePoint(page, C4);
    await page.mouse.move(x, y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(x + 30, y + 12, { steps: 4 });
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(150);
    await expect(panel(page)).toHaveCount(0);
    // control: the same gesture without moving does open it, so the drag really suppressed it
    await page.mouse.move(x, y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });
    await expect(panel(page)).toBeVisible();
  });

  test('ContextMenu_NearViewportEdge_PanelAndSubmenuStayInside', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 420 });
    await open(page);
    await goFlat(page);
    // cursor near the right edge: the pair (panel + submenu) must flip and fit; then near the bottom edge
    // synthetic contextmenu on the plane: the only way to put the cursor at an exact edge coordinate over a tiny plane
    for (const [cx, cy] of [[890, 150], [300, 410]]) {
      await page.evaluate(([x, y, id]) => document.querySelector(`[data-plane="${id}"]`).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: x, clientY: y })), [cx, cy, C6]);
      const vp = page.viewportSize();
      for (const loc of [panel(page), sub(page)]) {
        await expect(loc).toBeVisible();
        const b = await loc.boundingBox();
        expect(b.x, 'left').toBeGreaterThanOrEqual(0);
        expect(b.y, 'top').toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, 'right').toBeLessThanOrEqual(vp.width);
        expect(b.y + b.height, 'bottom').toBeLessThanOrEqual(vp.height);
      }
    }
  });

  test('ContextMenu_Explodido_NoExplodeItem', async ({ page }) => {
    await open(page); // default view = dock Explodido (not flat)
    await expect(toggle(page)).toHaveAttribute('title', /Vista explodida/);
    await page.locator(`[data-node-id="${ROOT}"]`).click({ button: 'right' });
    await expect(panel(page)).toBeVisible();
    await expect(item(page, /Requisição/)).toBeVisible();
    await expect(item(page, /Explodir daqui/)).toHaveCount(0);
    await expect(item(page, /Recolher/)).toHaveCount(0);
    await expect(sub(page).getByRole('menuitem')).toHaveCount(1);
  });

  test('ContextMenu_RequestItem_PresentAndCloses', async ({ page }) => {
    await open(page);
    await goFlat(page);
    await rightClick(page, C4);
    await expect(item(page, /Requisição/)).toBeVisible();
    await expect(item(page, /Requisição/)).toContainText('→ Ajustes');
    await item(page, /Requisição/).click();
    await expect(panel(page)).toHaveCount(0);
  });

  test('ContextMenu_Background_NoMenu', async ({ page }) => {
    await open(page);
    await goFlat(page);
    await page.evaluate(() => document.addEventListener('contextmenu', (e) => { window.__ctxPrevented = e.defaultPrevented; }));
    const stage = await page.locator('[data-plane]').first().evaluate((el) => {
      let s = el; while (s && !(s.tabIndex === 0 && s.style.overflow === 'hidden')) s = s.parentElement;
      const r = s.getBoundingClientRect(); return { x: r.left + 4, y: r.top + 4 };
    });
    const hit = await page.evaluate(({ x, y }) => { const t = document.elementFromPoint(x, y); return !!(t && t.closest('[data-plane]')); }, stage);
    expect(hit, 'stage corner must be empty').toBe(false);
    await page.mouse.click(stage.x, stage.y, { button: 'right' });
    await page.waitForTimeout(150);
    await expect(panel(page)).toHaveCount(0);
    expect(await page.evaluate(() => window.__ctxPrevented)).toBe(true); // the native menu stays suppressed
  });
});
