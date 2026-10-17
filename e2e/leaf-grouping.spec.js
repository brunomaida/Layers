import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { instrument, waitForScan } from './perf-helpers.js';

// S4.9: while the camera is dragged, planes that share a translateZ live in one div[data-plane-group]
// (one composited layer per z instead of one per plane). Outside a drag the DOM is one plane per layer.
// Every plane carries a stable data-plane marker in both modes.

const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

const stageCentre = (page) =>
  page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    const b = stage.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, left: b.left, top: b.top, width: b.width, height: b.height };
  });

// Orbit away from the static pose and keep the button pressed; the first move crosses onMove's 3 px threshold.
async function startDrag(page) {
  const c = await stageCentre(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 8, c.y);
  await page.mouse.move(c.x + 60, c.y + 40, { steps: 5 });
  await frames(page);
  return { x: c.x + 60, y: c.y + 40, stage: c };
}

async function load(page) {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
}

const groupState = (page) =>
  page.evaluate(() => {
    const planes = [...document.querySelectorAll('[data-plane]')];
    const groups = [...document.querySelectorAll('[data-plane-group]')];
    const zOf = (g) => parseFloat(g.style.transform.slice('translateZ('.length));
    return {
      planes: planes.length,
      groups: groups.length,
      distinctZ: new Set(groups.map(zOf)).size,
      ownTransform: planes.filter((el) => el.style.transform !== '').length,
      ownWillChange: planes.filter((el) => el.style.willChange === 'transform').length,
      orphans: planes.filter((el) => !el.parentElement.hasAttribute('data-plane-group')).length,
      wrapperNoPointer: groups.every((g) => g.style.pointerEvents === 'none' && g.style.willChange === 'transform'),
      contained: planes.filter((el) => el.style.contain === 'layout paint').length,
    };
  });

test('Grouping_DuranteArrasto_PlanosCompartilhamCamadaPorZ', async ({ page }) => {
  await load(page);
  const still = await groupState(page);
  expect(still.planes, 'planes carry data-plane while static').toBeGreaterThan(100);
  expect(still.groups, 'no groups while static').toBe(0);
  await startDrag(page);
  const g = await groupState(page);
  expect(g.planes, 'same plane count while dragging').toBe(still.planes);
  expect(g.groups, 'at least one group').toBeGreaterThan(0);
  expect(g.groups, 'one group per distinct z').toBe(g.distinctZ);
  expect(g.groups, 'fewer groups than planes').toBeLessThan(g.planes / 4);
  expect(g.ownTransform, 'planes with their own translateZ').toBe(0);
  expect(g.ownWillChange, 'planes with their own will-change').toBe(0);
  expect(g.orphans, 'planes outside a group').toBe(0);
  expect(g.wrapperNoPointer, 'wrapper: pointer-events none + will-change transform').toBe(true);
  expect(g.contained, 'planes keep contain: layout paint').toBe(g.planes);
  await page.mouse.up();
});

test('Grouping_AposSoltar_VoltaUmaCamadaPorPlano', async ({ page }) => {
  await load(page);
  const still = await groupState(page);
  await startDrag(page);
  expect((await groupState(page)).groups, 'grouped while dragging').toBeGreaterThan(0);
  await page.mouse.up();
  await frames(page);
  await page.waitForTimeout(400);
  const after = await groupState(page);
  expect(after.groups, 'groups gone after release').toBe(0);
  expect(after.planes, 'plane count back').toBe(still.planes);
  expect(after.ownTransform, 'every plane has its own translateZ again').toBe(after.planes);
  const own = await page.evaluate(() => [...document.querySelectorAll('[data-plane]')].every((el) => el.style.transform.startsWith('translateZ(') && /pointer|crosshair/.test(el.style.cursor)));
  expect(own, 'static plane style').toBe(true);
});

// Pointer stays down; candidates around the drag point until the topmost element under the pointer is a plane
// whose group is NOT the nearest to the camera. A page-sized wrapper in front would swallow that hit.
test('Grouping_HoverEClique_FuncionamDentroDoGrupo', async ({ page }) => {
  await load(page);
  const at = await startDrag(page);
  const probe = () =>
    page.evaluate(
      ([x, y]) => {
        const zOf = (g) => parseFloat(g.style.transform.slice('translateZ('.length));
        const maxZ = Math.max(...[...document.querySelectorAll('[data-plane-group]')].map(zOf));
        const t = document.elementFromPoint(x, y);
        const p = t && t.closest('[data-plane]');
        const g = p && p.parentElement;
        if (!g || !g.hasAttribute('data-plane-group')) return null;
        return { behind: zOf(g) < maxZ, z: zOf(g), maxZ, hover: p.style.outline.includes('selHover') };
      },
      [px, py],
    );
  let px = at.x, py = at.y, found = null;
  const offsets = [];
  for (let r = 0; r <= 240; r += 24) for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) offsets.push([dx * r, dy * r]);
  for (const [dx, dy] of offsets) {
    px = at.x + dx;
    py = at.y + dy;
    await page.mouse.move(px, py);
    await frames(page);
    await page.waitForTimeout(80);
    const s = await probe();
    if (s && s.behind) {
      found = s;
      break;
    }
  }
  expect(found, 'a plane behind a nearer group under the pointer').not.toBeNull();
  await expect.poll(async () => (await probe()).hover, { message: 'hoverId reaches a plane inside a farther group', timeout: 3000 }).toBe(true);
  await page.mouse.up();
  await page.waitForTimeout(500);
  // pose is static again: the plane under the pointer is selected by a click
  const idx = await page.evaluate(([x, y]) => {
    const t = document.elementFromPoint(x, y);
    const p = t && t.closest('[data-plane]');
    return p ? [...document.querySelectorAll('[data-plane]')].indexOf(p) : -1;
  }, [px, py]);
  expect(idx, 'a plane under the pointer after release').toBeGreaterThanOrEqual(0);
  await page.mouse.click(px, py);
  await expect
    .poll(() => page.evaluate((i) => document.querySelectorAll('[data-plane]')[i].style.outline.startsWith('2px'), idx), { message: 'click selects the plane', timeout: 3000 })
    .toBe(true);
});

// ---- manual pixel gate: baselines come from the base commit (before the grouping), stored OUTSIDE e2e/ ----
// LAYERS_VISUAL=1 LAYERS_BASELINE_DIR=<dir> [LAYERS_BASELINE_WRITE=1 on the base commit]. Never committed.
const VISUAL = !!process.env.LAYERS_VISUAL;
const BASE_DIR = process.env.LAYERS_BASELINE_DIR;
const WRITE = !!process.env.LAYERS_BASELINE_WRITE;

// Pixels whose largest channel delta exceeds `tol` in a decoded pair of PNGs, as a share of all pixels.
const diffShare = (page, a, b, tol) =>
  page.evaluate(
    async ([a, b, tol]) => {
      const dec = async (b64) => {
        const bmp = await createImageBitmap(new Blob([Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))], { type: 'image/png' })); // no fetch: CSP connect-src
        const c = new OffscreenCanvas(bmp.width, bmp.height);
        const ctx = c.getContext('2d');
        ctx.drawImage(bmp, 0, 0);
        return ctx.getImageData(0, 0, bmp.width, bmp.height);
      };
      const A = await dec(a), B = await dec(b);
      if (A.width !== B.width || A.height !== B.height) return { size: false, share: 1 };
      let n = 0;
      for (let i = 0; i < A.data.length; i += 4) {
        const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
        if (d > tol) n++;
      }
      return { size: true, share: n / (A.width * A.height) };
    },
    [a, b, tol],
  );

async function shot(page, name, tol, maxShare) {
  const c = await stageCentre(page);
  const buf = await page.screenshot({ clip: { x: c.left, y: c.top, width: c.width, height: c.height }, animations: 'disabled', caret: 'hide' });
  const file = path.join(BASE_DIR, name + '.png');
  if (WRITE) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
    fs.writeFileSync(file, buf);
    return;
  }
  expect(fs.existsSync(file), 'baseline ' + file + ' (generate it on the base commit with LAYERS_BASELINE_WRITE=1)').toBe(true);
  const d = await diffShare(page, buf.toString('base64'), fs.readFileSync(file).toString('base64'), tol);
  expect(d.size, name + ' size').toBe(true);
  expect(d.share, name + ' differing pixels share').toBeLessThanOrEqual(maxShare);
}

test.describe('visual', () => {
  test.skip(!VISUAL, 'manual pixel gate: set LAYERS_VISUAL=1 and LAYERS_BASELINE_DIR');
  test.skip(({ browserName }) => browserName !== 'chromium', 'baselines are Chromium-only');

  test('Grouping_PoseDeArrasto_VisualIgualABase', async ({ page }) => {
    expect(BASE_DIR, 'LAYERS_BASELINE_DIR').toBeTruthy();
    await load(page);
    await startDrag(page);
    for (let i = 1; i <= 3; i++) {
      await frames(page);
      await shot(page, 'drag-pose-' + i, 24, 0.001);
    }
    await page.mouse.up();
  });

  test('Grouping_QuadroEstatico_VisualIgualABase', async ({ page }) => {
    expect(BASE_DIR, 'LAYERS_BASELINE_DIR').toBeTruthy();
    await load(page);
    await page.mouse.move(2, 2);
    await frames(page);
    await shot(page, 'static-initial', 0, 0);
    await startDrag(page);
    await page.mouse.up();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(700);
    await frames(page);
    await shot(page, 'static-after-drag', 0, 0);
  });
});
