import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S3.3: characterization of every global key of the window keydown handler (`onKey`). Written against the
// literal key map and kept green across the refactor that derives the handler from LayersCore.ACTIONS.
// Observables: the inline `transform` of the stage world div (never the computed one: the .35s transition
// would give mid-flight values), the active layer chip, the right panel, the `?` panel and the measure title.
// Escape and `r` are covered by menu-open.spec.js and layout-drift.spec.js.
const world = (page) => page.locator('div[style*="perspective-origin"] > div').first();

async function readT(page) {
  const style = (await world(page).getAttribute('style')) || '';
  const m = /transform:\s*([^;]+)/.exec(style);
  if (!m) throw new Error('no inline transform on the stage world: ' + style);
  const t = m[1];
  const nums = (re) => {
    const g = re.exec(t);
    if (!g) throw new Error('missing ' + re + ' in ' + t);
    return g[1].split(',').map((v) => parseFloat(v));
  };
  const [tx, ty] = nums(/translate\(([^)]*)\)/);
  const [k] = nums(/scale\(([^)]*)\)/);
  const [rx] = nums(/rotateX\(([^)]*)\)/);
  const [ry] = nums(/rotateY\(([^)]*)\)/);
  const [fx, fy, fz] = nums(/translate3d\(([^)]*)\)/);
  return { raw: t, tx, ty, k, rx, ry, fx, fy, fz };
}

const activeChip = (page) =>
  page.evaluate(() => [...document.querySelectorAll('[title^="Camada L"]')].findIndex((e) => e.style.color === 'var(--acc)'));

// Presses a key that must change the stage and returns the new transform.
async function pressChange(page, key, before) {
  await page.keyboard.press(key);
  await expect.poll(async () => (await readT(page)).raw, { message: key }).not.toBe(before.raw);
  return readT(page);
}

// `0` recenters; wait until two reads 150 ms apart agree.
async function reset(page) {
  await page.keyboard.press('0');
  let prev = '';
  await expect
    .poll(async () => {
      const cur = (await readT(page)).raw;
      const same = cur === prev;
      prev = cur;
      await page.waitForTimeout(150);
      return same;
    })
    .toBe(true);
  return readT(page);
}

const measureTitle = (page) => page.locator('button[title*="(M) — "]');
const rightPanel = (page) => page.locator('div[title^="Arrastar para ampliar o painel"]');

test('OnKey_TeclaGlobal_MesmoEfeitoDoMapa', async ({ page }) => {
  await page.goto('/?layers=fixtures/plain-css/');
  await readNodes(page);
  const base = await reset(page);

  // 1. layer keys: PageUp before PageDown (from layer 0, PageDown saturates and proves nothing)
  const c0 = await activeChip(page);
  expect(c0).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('PageUp');
  await expect.poll(() => activeChip(page), { message: 'PageUp' }).toBe(c0 + 1);
  await page.keyboard.press('PageDown');
  await expect.poll(() => activeChip(page), { message: 'PageDown' }).toBe(c0);

  // 2. arrows: screen pan by 40 px on the translate(x, y) of the world
  let t = await pressChange(page, 'ArrowLeft', base);
  expect(t.tx).toBeCloseTo(base.tx - 40, 3);
  expect(t.ty).toBeCloseTo(base.ty, 3);
  expect([t.k, t.rx, t.ry]).toEqual([base.k, base.rx, base.ry]);
  await reset(page);
  t = await pressChange(page, 'ArrowRight', base);
  expect(t.tx).toBeCloseTo(base.tx + 40, 3);
  expect(t.ty).toBeCloseTo(base.ty, 3);
  expect([t.k, t.rx, t.ry]).toEqual([base.k, base.rx, base.ry]);
  await reset(page);
  t = await pressChange(page, 'ArrowUp', base);
  expect(t.ty).toBeCloseTo(base.ty - 40, 3);
  expect(t.tx).toBeCloseTo(base.tx, 3);
  expect([t.k, t.rx, t.ry]).toEqual([base.k, base.rx, base.ry]);
  await reset(page);
  t = await pressChange(page, 'ArrowDown', base);
  expect(t.ty).toBeCloseTo(base.ty + 40, 3);
  expect(t.tx).toBeCloseTo(base.tx, 3);
  expect([t.k, t.rx, t.ry]).toEqual([base.k, base.rx, base.ry]);
  await reset(page);

  // 3. Shift+Arrow pans on the page plane (focus), which needs the event: translate3d moves, no screen pan on y
  // (translate x also changes: shiftX follows the focus, so only y is asserted)
  t = await pressChange(page, 'Shift+ArrowUp', base);
  expect(t.ty).toBeCloseTo(base.ty, 3);
  expect([t.fx, t.fy]).not.toEqual([base.fx, base.fy]);
  await reset(page);

  // 4. orbit and tilt, 10 degrees a press; Shift+Q resolves through the lower-case fallback
  t = await pressChange(page, 'q', base);
  expect(t.ry).toBeCloseTo(base.ry - 10, 3);
  expect(t.rx).toBeCloseTo(base.rx, 3);
  await reset(page);
  t = await pressChange(page, 'Shift+Q', base);
  expect(t.ry).toBeCloseTo(base.ry - 10, 3);
  await reset(page);
  t = await pressChange(page, 'e', base);
  expect(t.ry).toBeCloseTo(base.ry + 10, 3);
  await reset(page);
  t = await pressChange(page, 'w', base);
  expect(t.rx).toBeCloseTo(base.rx + 10, 3);
  expect(t.ry).toBeCloseTo(base.ry, 3);
  await reset(page);
  t = await pressChange(page, 's', base);
  expect(t.rx).toBeCloseTo(base.rx - 10, 3);
  await reset(page);

  // 5. zoom: x1.2 for + and =, /1.2 for -
  t = await pressChange(page, '+', base);
  expect(t.k).toBeCloseTo(base.k * 1.2, 3);
  await reset(page);
  t = await pressChange(page, '=', base);
  expect(t.k).toBeCloseTo(base.k * 1.2, 3);
  await reset(page);
  t = await pressChange(page, '-', base);
  expect(t.k).toBeCloseTo(base.k / 1.2, 3);
  await reset(page);

  // 6. frame and center act on the selection
  await page.locator('[data-node-id]').nth(1).click();
  await reset(page);
  t = await pressChange(page, 'f', base);
  expect(t.raw).not.toBe(base.raw);
  await reset(page);
  t = await pressChange(page, 'c', base);
  expect(t.k).toBeCloseTo(base.k, 3);
  expect([t.fx, t.fy]).not.toEqual([base.fx, base.fy]);

  // 7. 0 undoes an orbit
  await pressChange(page, 'q', await readT(page));
  t = await reset(page);
  expect([t.ry, t.rx, t.k, t.tx, t.ty]).toEqual([base.ry, base.rx, base.k, base.tx, base.ty]);

  // 8. toggles: measure, the ? panel, the right panel
  const m0 = await measureTitle(page).getAttribute('title');
  await expect(measureTitle(page)).toHaveCount(1);
  await page.keyboard.press('m');
  await expect.poll(() => measureTitle(page).getAttribute('title')).not.toBe(m0);
  await page.keyboard.press('m');
  await expect.poll(() => measureTitle(page).getAttribute('title')).toBe(m0);

  const help = page.getByText('teclado · mouse · painéis', { exact: false });
  await expect(help).toBeHidden();
  await page.keyboard.press('?');
  await expect(help).toBeVisible();
  await page.keyboard.press('?');
  await expect(help).toBeHidden();

  await expect(rightPanel(page)).toHaveCount(1);
  await page.keyboard.press('p');
  await expect(rightPanel(page)).toHaveCount(0);
  await page.keyboard.press('p');
  await expect(rightPanel(page)).toHaveCount(1);
});
