import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';
import { connectFixture } from './folder-helpers.js';

// S3.5 part 1: flat view with a single exploded branch. There is no UI trigger yet (the context menu
// is Task 5), so the state is driven through the persisted session (explodeFrom / collapseAt).
// Fixture axai: .section-head (0.0.2.0, L3) -> .select-all 0.0.2.0.0 (L4) -> 0.0.2.0.0.0 (L5)
// and .section-controls 0.0.2.0.4 (L4) -> 0.0.2.0.4.0 (L5) -> 0.0.2.0.4.0.0 (L6).
const ROOT = '0.0.2.0';
const L4 = '0.0.2.0.0';
const L5 = '0.0.2.0.0.0';
const L5B = '0.0.2.0.4.0';
const L6 = '0.0.2.0.4.0.0';
const SESSION = 'layers/v1/session';

// Seeds the session only when absent, so a reload keeps what the app itself wrote.
const seed = (page, extra) => page.addInitScript(({ key, extra }) => {
  if (localStorage.getItem(key)) return;
  localStorage.setItem('layers/v1/meta', JSON.stringify({ schema: 1 })); // without it the config migration resets the session
  localStorage.setItem(key, JSON.stringify({ lastProjectId: null, states: {}, selId: '0', isoId: null, camera: { yaw: 0, tilt: 0, zoom: 1, panX: 0, panY: 0, flat: false }, ...extra }));
}, { key: SESSION, extra });

const session = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), SESSION);
const spacing = async (page) => +(await page.locator('input[type=range][min="30"][max="200"]').inputValue());

async function openFlat(page) {
  await page.goto('/?layers=fixtures/axai/');
  await readNodes(page);
  await page.getByRole('button', { name: /Explodido/ }).click();
  await expect(page.getByRole('button', { name: /Explodido/ })).toHaveAttribute('title', /Vista plana/);
}

// translateZ in px of every plane, by id
const zs = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-plane]')].map((e) => {
  const m = /translateZ\((-?[\d.]+)px\)/.exec(e.style.transform);
  return [e.dataset.plane, m ? +m[1] : null];
})));

const inBranch = (id) => id === ROOT || id.startsWith(ROOT + '.');

test('Explode_FlatBranch_OnlyBranchGetsDepth', async ({ page }) => {
  await seed(page, { explodeFrom: ROOT, collapseAt: null });
  await openFlat(page);
  const sp = await spacing(page);
  const z = await zs(page);
  expect(z[ROOT]).toBe(0);
  expect(z[L4]).toBe(sp);
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
  await seed(page, { explodeFrom: ROOT, collapseAt: 5 });
  await openFlat(page);
  const sp = await spacing(page);
  const z = await zs(page);
  expect(z[L4]).toBe(sp);
  expect(z[L5]).toBe(2 * sp);
  expect(z[L5B]).toBe(2 * sp);
  expect(z[L6]).toBe(2 * sp);
});

test('Explode_NoBranch_FlatStaysFlat', async ({ page }) => {
  await seed(page, {});
  await openFlat(page);
  const z = await zs(page);
  for (const id of Object.keys(z)) expect(z[id], id).toBe(0);
  await expect(page.getByText('▤ Plana · ▧ ramo')).toHaveCount(0);
  await expect(page.locator(`[data-node-id="${ROOT}"]`)).not.toContainText('▧');
});

test('Explode_Reload_RestoresFromSession', async ({ page }) => {
  await seed(page, { explodeFrom: ROOT, collapseAt: 5 });
  await openFlat(page);
  // the app rewrites the session itself (flat is now true), so the reload does not read the seed
  await expect.poll(async () => (await session(page)).camera.flat).toBe(true);
  const s = await session(page);
  expect(s.explodeFrom).toBe(ROOT);
  expect(s.collapseAt).toBe(5);
  await page.reload();
  await readNodes(page);
  await page.getByRole('button', { name: /Explodido/ }).click();
  const sp = await spacing(page);
  const z = await zs(page);
  expect(z[L4]).toBe(sp);
  expect(z[L6]).toBe(2 * sp);
  expect(z['0.1']).toBe(0);
});

test('Explode_MissingRoot_IgnoredAndCleared', async ({ page }) => {
  await seed(page, { explodeFrom: '0.9.9.9', collapseAt: 4 });
  await openFlat(page);
  const z = await zs(page);
  for (const id of Object.keys(z)) expect(z[id], id).toBe(0);
  await expect(page.getByText('▤ Plana · ▧ ramo')).toHaveCount(0);
  await expect.poll(async () => (await session(page)).explodeFrom).toBeNull();
  expect((await session(page)).collapseAt).toBeNull();
});

test('Explode_Reanalisar_Clears', async ({ page }) => {
  await connectFixture(page, 'axai');
  await page.getByRole('button', { name: /Explodido/ }).click();
  // no menu yet: call the action on the component instance behind the stage
  await page.evaluate((id) => {
    const el = document.querySelector('[data-plane]');
    let f = el[Object.keys(el).find((k) => k.startsWith('__reactFiber'))];
    while (f && !(f.stateNode && f.stateNode.logic && f.stateNode.logic.explodeHere)) f = f.return;
    f.stateNode.logic.explodeHere(id);
  }, ROOT);
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
  const z = await zs(page);
  for (const id of Object.keys(z)) expect(z[id], id).toBe(0);
});
