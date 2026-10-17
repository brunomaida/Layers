import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';
import { connectFixture } from './folder-helpers.js';

// S3.5 part 1: flat view with a single exploded branch. The context menu is Task 5, so the branch is
// driven through the component actions (`act`) or through the persisted session (`reloadWith`).
// Every test runs on a connected folder: fixture mode (?layers=) restores no session and never persists a branch.
// Fixture axai: .section-head (0.0.2.0, L3) -> .select-all 0.0.2.0.0 (L4) -> 0.0.2.0.0.0 (L5)
// and .section-controls 0.0.2.0.4 (L4) -> 0.0.2.0.4.0 (L5) -> 0.0.2.0.4.0.0 (L6).
const ROOT = '0.0.2.0';
const L4 = '0.0.2.0.0';
const L5 = '0.0.2.0.0.0';
const L5B = '0.0.2.0.4.0';
const L6 = '0.0.2.0.4.0.0';
const SESSION = 'layers/v1/session';

// Task 5 replaces this with the real menu. The component instance is the `logic` of the StreamableComponent
// fiber behind the stage (support.js runtime): the only place in this spec that reaches into it.
// Calls `method(...args)` when given, and returns the branch keys of the state (read once the render settles).
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
  await act(page, 'explodeHere', ROOT);
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
