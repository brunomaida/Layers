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
// whose pointer falls inside the projected box of a NEARER group (elementsFromPoint ignores pointer-events:none,
// so the box is checked with getBoundingClientRect). A page-sized wrapper in front would swallow that hit.
// A selected plane (2px outline) is skipped so the click-select assertion cannot pass vacuously.
test('Grouping_HoverEClique_FuncionamDentroDoGrupo', async ({ page }) => {
  await load(page);
  const at = await startDrag(page);
  const probe = () =>
    page.evaluate(
      ([x, y]) => {
        const zOf = (g) => parseFloat(g.style.transform.slice('translateZ('.length));
        const t = document.elementFromPoint(x, y);
        const p = t && t.closest('[data-plane]');
        const g = p && p.parentElement;
        if (!g || !g.hasAttribute('data-plane-group')) return null;
        const nearer = [...document.querySelectorAll('[data-plane-group]')].some((n) => {
          const b = n.getBoundingClientRect();
          return zOf(n) > zOf(g) && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
        });
        return { behind: nearer && !p.style.outline.startsWith('2px'), z: zOf(g), hover: p.style.outline.includes('selHover') };
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

// Rail pill "Camada L<d>": isolates layer d (solo) and, with layer focus on, draws lframe/llbl around it.
const soloLayer = async (page, d) => {
  await page.locator('[title^="Camada L"]').nth(d).click();
  await frames(page);
};

// Solo: planes of the other layers get pointerEvents none inline; inside a group they must stay transparent to the
// pointer, so the hit goes through to the plane behind.
test('Grouping_SoloDuranteArrasto_PlanosSoloOffNaoCapturamHit', async ({ page }) => {
  await load(page);
  await soloLayer(page, 1);
  await startDrag(page);
  const r = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) => getComputedStyle(el).backgroundImage.includes('radial-gradient'));
    const s = stage.getBoundingClientRect();
    const off = [...document.querySelectorAll('[data-plane]')].filter((el) => el.style.pointerEvents === 'none' && el.style.display !== 'none');
    let probed = 0, captured = 0, through = 0;
    for (const el of off) {
      const b = el.getBoundingClientRect();
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      if (!b.width || !b.height || cx < s.left || cx > s.right || cy < s.top || cy > s.bottom) continue;
      probed++;
      const hit = (document.elementFromPoint(cx, cy) || { closest: () => null }).closest('[data-plane]');
      if (hit === el) captured++;
      else if (hit && hit.style.pointerEvents !== 'none') through++;
    }
    return { off: off.length, probed, captured, through, inGroup: off.every((el) => el.parentElement.hasAttribute('data-plane-group')) };
  });
  expect(r.off, 'soloOff planes mounted').toBeGreaterThan(0);
  expect(r.inGroup, 'soloOff planes sit inside groups').toBe(true);
  expect(r.probed, 'soloOff planes probed on stage').toBeGreaterThan(0);
  expect(r.captured, 'soloOff planes that capture the pointer').toBe(0);
  expect(r.through, 'points where the hit goes through to a live plane behind').toBeGreaterThan(0);
  await page.mouse.up();
});

// Layer focus (solo on a layer): lframe sits at fz - 1 and llbl at fz + 2, the selection label at z + 2; they are
// overlays outside the groups, after them in the page, and their z lines up with the group of that layer.
test('Grouping_FocoDeCamadaDuranteArrasto_MolduraERotuloForaDosGrupos', async ({ page }) => {
  await load(page);
  await soloLayer(page, 1);
  const c = await stageCentre(page);
  const pick = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) => getComputedStyle(el).backgroundImage.includes('radial-gradient'));
    const s = stage.getBoundingClientRect();
    for (const el of document.querySelectorAll('[data-plane]')) {
      const b = el.getBoundingClientRect();
      const x = b.left + b.width / 2, y = b.top + b.height / 2;
      if (el.style.pointerEvents === 'none' || b.width < 12 || b.height < 12 || x < s.left || x > s.right || y < s.top || y > s.bottom) continue;
      if ((document.elementFromPoint(x, y) || {}).closest && document.elementFromPoint(x, y).closest('[data-plane]') === el) return { x, y };
    }
    return null;
  });
  expect(pick, 'a live plane to select').not.toBeNull();
  await page.mouse.click(pick.x, pick.y);
  await frames(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 8, c.y);
  await page.mouse.move(c.x + 40, c.y + 20, { steps: 4 });
  await frames(page);
  const r = await page.evaluate(() => {
    const zOf = (e) => { const m = /translateZ\((-?[\d.]+)px\)/.exec(e.style.transform); return m ? parseFloat(m[1]) : null; };
    const kids = [...document.querySelector('[data-plane-group]').parentElement.children];
    const groups = kids.filter((k) => k.hasAttribute('data-plane-group'));
    const overlays = kids.filter((k) => !k.hasAttribute('data-plane-group'));
    const gz = new Set(groups.map(zOf));
    return {
      groupsFirst: kids.map((k) => k.hasAttribute('data-plane-group')).lastIndexOf(true) < kids.findIndex((k) => !k.hasAttribute('data-plane-group')),
      overlays: overlays.length,
      frameBehind: overlays.some((o) => gz.has(zOf(o) + 1)),
      labelsAbove: overlays.filter((o) => gz.has(zOf(o) - 2)).length,
    };
  });
  expect(r.groupsFirst, 'groups before the overlays').toBe(true);
  expect(r.overlays, 'lframe + llbl + selection label outside the groups').toBeGreaterThanOrEqual(3);
  expect(r.frameBehind, 'lframe at (layer z - 1)').toBe(true);
  expect(r.labelsAbove, 'llbl and selection label at (z + 2) of a group').toBeGreaterThanOrEqual(2);
  await page.mouse.up();
});

// After a drag the remounted planes must animate again: selecting a deeper plane moves the other layers in z
// (Plane gets 'transform .35s ease'); nothing animates while idle.
test('Grouping_AposSoltar_SelecionarPlanoAnimaTranslateZ', async ({ page }) => {
  await load(page);
  await startDrag(page);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const idle = await page.evaluate(() => [...document.querySelectorAll('[data-plane]')].filter((el) => /transform/.test(el.style.transition)).length);
  expect(idle, 'no transition while nothing changes').toBe(0);
  const pick = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) => getComputedStyle(el).backgroundImage.includes('radial-gradient'));
    const s = stage.getBoundingClientRect();
    for (const el of document.querySelectorAll('[data-plane]')) {
      const b = el.getBoundingClientRect();
      const x = b.left + b.width / 2, y = b.top + b.height / 2;
      if (el.getAttribute('data-plane') === '0' || el.style.pointerEvents === 'none' || b.width < 12 || b.height < 12 || x < s.left || x > s.right || y < s.top || y > s.bottom) continue;
      const hit = document.elementFromPoint(x, y);
      if (hit && hit.closest('[data-plane]') === el) return { x, y };
    }
    return null;
  });
  expect(pick, 'a non-root plane to select').not.toBeNull();
  // a later render resets the inline transition (z unchanged), so watch the style attribute instead of polling it;
  // the browser serializes '.35s' as '0.35s'
  await page.evaluate(() => {
    const seen = (window.__ztr = { n: 0 });
    new MutationObserver((ms) => ms.forEach((m) => { if (/transform 0\.35s/.test(m.target.style.transition)) seen.n++; })).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['style'] });
  });
  await page.mouse.click(pick.x, pick.y);
  await expect.poll(() => page.evaluate(() => window.__ztr.n), { message: 'planes animate translateZ after the selection', timeout: 3000 }).toBeGreaterThan(0);
});

// ---- manual pixel gate: baselines come from the base commit (before the grouping), stored OUTSIDE e2e/ ----
// LAYERS_VISUAL=1 LAYERS_BASELINE_DIR=<dir> [LAYERS_BASELINE_WRITE=1 on the base commit]. Never committed.
const VISUAL = !!process.env.LAYERS_VISUAL;
const BASE_DIR = process.env.LAYERS_BASELINE_DIR;
const WRITE = !!process.env.LAYERS_BASELINE_WRITE;

// Share of pixels that differ in a decoded pair of PNGs: Playwright/pixelmatch YIQ distance (opaque pixels)
// over 35215 * threshold^2. Playwright's own default threshold is 0.2; 0 means any change counts. With `level`
// set, a pixel differs when any channel is more than `level` apart (level 0 = exact).
const diffShare = (page, a, b, { threshold = 0, level = null }) =>
  page.evaluate(
    async ([a, b, threshold, level]) => {
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
      const max = 35215 * threshold * threshold;
      for (let i = 0; i < A.data.length; i += 4) {
        const r = A.data[i] - B.data[i], g = A.data[i + 1] - B.data[i + 1], b = A.data[i + 2] - B.data[i + 2];
        if (level !== null) {
          if (Math.max(Math.abs(r), Math.abs(g), Math.abs(b)) > level) n++;
          continue;
        }
        const y = r * 0.29889531 + g * 0.58662247 + b * 0.11448223;
        const iq = r * 0.59597799 - g * 0.2741761 - b * 0.32180189;
        const q = r * 0.21147017 - g * 0.52261711 + b * 0.31114694;
        if (0.5053 * y * y + 0.299 * iq * iq + 0.1957 * q * q > max) n++;
      }
      return { size: true, share: n / (A.width * A.height) };
    },
    [a, b, threshold, level],
  );

async function shot(page, name, opts, maxShare) {
  const c = await stageCentre(page);
  const buf = await page.screenshot({ clip: { x: c.left, y: c.top, width: c.width, height: c.height }, animations: 'disabled', caret: 'hide' });
  const file = path.join(BASE_DIR, name + '.png');
  if (WRITE) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
    fs.writeFileSync(file, buf);
    return;
  }
  expect(fs.existsSync(file), 'baseline ' + file + ' (generate it on the base commit with LAYERS_BASELINE_WRITE=1)').toBe(true);
  const d = await diffShare(page, buf.toString('base64'), fs.readFileSync(file).toString('base64'), opts);
  expect(d.size, name + ' size').toBe(true);
  expect(d.share, name + ' differing pixels share').toBeLessThanOrEqual(maxShare);
}

test.describe('visual', () => {
  test.skip(!VISUAL, 'manual pixel gate: set LAYERS_VISUAL=1 and LAYERS_BASELINE_DIR');
  test.skip(({ browserName }) => browserName !== 'chromium', 'baselines are Chromium-only');

  test('Grouping_PoseDeArrasto_VisualIgualABase', async ({ page }) => {
    expect(BASE_DIR, 'LAYERS_BASELINE_DIR').toBeTruthy();
    await load(page);
    const at = await startDrag(page);
    // structure the pixels cannot show: every group comes before every overlay (sel label, lframe, llbl, measures)
    const order = await page.evaluate(() => {
      const kids = [...document.querySelector('[data-plane-group]').parentElement.children];
      const last = kids.map((k) => k.hasAttribute('data-plane-group')).lastIndexOf(true);
      const firstOverlay = kids.findIndex((k) => !k.hasAttribute('data-plane-group'));
      return { groups: kids.filter((k) => k.hasAttribute('data-plane-group')).length, last, firstOverlay: firstOverlay === -1 ? kids.length : firstOverlay };
    });
    expect(order.groups, 'groups under the page').toBeGreaterThan(0);
    expect(order.last, 'groups first, overlays after').toBeLessThan(order.firstOverlay);
    // the hovered plane (if any under the pointer) shows the hover outline, as in the base
    const under = await page.evaluate(([x, y]) => !!(document.elementFromPoint(x, y) || { closest: () => null }).closest('[data-plane]'), [at.x, at.y]);
    if (under) {
      await expect
        .poll(() => page.evaluate(([x, y]) => document.elementFromPoint(x, y).closest('[data-plane]').style.outline.includes('selHover'), [at.x, at.y]), { message: 'selHover outline on the hovered plane', timeout: 3000 })
        .toBe(true);
    }
    // Pose pixels cannot be exact: the 3D raster of a flattened group differs from one layer per plane on edge
    // pixels (47k of 680k pixels, up to 43 levels, 0.037% over the 0.1 YIQ threshold, 0 over Playwright's default
    // 0.2). The plan's 0.1% applies at a threshold of 0.1, twice as strict as Playwright's default.
    for (let i = 1; i <= 3; i++) {
      await frames(page);
      await shot(page, 'drag-pose-' + i, { threshold: 0.1 }, 0.001);
    }
    await page.mouse.up();
  });

  test('Grouping_QuadroEstatico_VisualIgualABase', async ({ page }) => {
    expect(BASE_DIR, 'LAYERS_BASELINE_DIR').toBeTruthy();
    await load(page);
    await page.mouse.move(2, 2);
    await frames(page);
    await shot(page, 'static-initial', { level: 0 }, 0); // exact
    await startDrag(page);
    await page.mouse.up();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(700);
    await frames(page);
    // Not exact, by compositor history and not by DOM: the final DOM is identical to the base except the data-plane
    // attribute (outerHTML diff), and the base itself is deterministic (4 runs, 0 pixels), yet re-creating the base's
    // layers without touching the DOM (display none/block on the world) changes 6 pixels by 1 level, and the remounted planes
    // differ from the base by 4 to 6 pixels by 1 level (antialiased edges). The gate is the base's own noise:
    // no pixel more than 1 level off in any channel.
    await shot(page, 'static-after-drag', { level: 1 }, 0);
  });
});
