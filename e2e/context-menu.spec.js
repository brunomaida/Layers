import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';
import { act, open, reloadWith, toggle, goFlat, panel, sub, item, layerRow, stateOf, planePoint, rightClick } from './ctx-helpers.js';

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
const LAST = '0.0.2.0.4.0.1'; // last child of C5: removing it frees its id (removing C6 would renumber its sibling into C6)
const SHALLOW = '0.1';
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
    await expect(layerRow(page, 1).locator('[data-ctx-n]')).toHaveText(String(info.total1));
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
    // inside an exploded branch the item is replaced by Recolher (assert the menu is really open before the absence)
    await rightClick(page, C5);
    await expect(panel(page)).toBeVisible();
    await expect(item(page, /Recolher/)).toBeVisible();
    await expect(item(page, /Explodir daqui/)).toHaveCount(0);
    // the branch mark sits only on the row of the exploded root (L3), not on its descendants' rows or other ancestors
    await expect(layerRow(page, 3)).toContainText('▧');
    for (const d of [0, 1, 2, 4, 5]) await expect(layerRow(page, d)).not.toContainText('▧');
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

  // The 3px cut compares the contextmenu position with the right mousedown; it relies on Windows Chromium firing contextmenu on
  // mouseup (macOS fires it on mousedown, where no drag can be told apart yet).
  test('ContextMenu_RightDrag_DoesNotOpen', async ({ page }) => {
    test.skip(process.platform !== 'win32', 'contextmenu fires on mousedown outside Windows');
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
    // right edge: the submenu flips to the left of the panel (panel.x + 8 >= its right edge); bottom edge: it stays on the right and the pair moves up
    // synthetic contextmenu on the plane: the only way to put the cursor at an exact edge coordinate over a tiny plane
    for (const [cx, cy, flipped] of [[890, 150, true], [300, 410, false]]) {
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
      await expect.poll(async () => {
        const p = await panel(page).boundingBox(), q = await sub(page).boundingBox();
        return flipped ? q.x + q.width <= p.x + 8 : q.x >= p.x + p.width - 8;
      }, { message: flipped ? 'submenu flipped to the left' : 'submenu on the right' }).toBe(true);
    }
  });

  test('ContextMenu_GlobalKey_ClosesMenu', async ({ page }) => {
    await open(page);
    await goFlat(page);
    await rightClick(page, C4);
    await expect(panel(page)).toBeVisible();
    await page.keyboard.press('ArrowRight'); // a global camera key: the menu must not stay open over a moving scene
    await expect(panel(page)).toHaveCount(0);
  });

  test('ContextMenu_TargetGone_ScanClosesIt', async ({ page }) => {
    await open(page);
    await goFlat(page);
    await rightClick(page, LAST);
    await expect(panel(page)).toBeVisible();
    await act(page, 'scan');
    await expect(panel(page)).toBeVisible(); // control: a scan that keeps the id leaves the menu open
    // drop the target element from the mounted mock (shadow root): the next scan no longer finds LAST (the last child, so no sibling takes its id)
    await page.evaluate((path) => {
      const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
      let el = [...host.shadowRoot.children].find((e) => e.localName !== 'style');
      for (const i of path.split('.').slice(1)) el = el.children[+i];
      el.remove();
    }, LAST);
    await act(page, 'scan');
    await expect(panel(page)).toHaveCount(0);
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
