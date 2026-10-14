import { test, expect } from '@playwright/test';
import { instrument, waitForScan, zoomIn } from './perf-helpers.js';

// S4.5: while the camera is dragged, planes fully outside the stage are display:none. A hidden plane
// must not intersect the stage, and releasing the drag must show every plane again.
// One synchronous pass: each hidden plane is un-hidden, measured and re-hidden before any frame runs.
const cullState = (page) =>
  page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    const sb = stage.getBoundingClientRect();
    const planes = [...stage.querySelectorAll('div')].filter(
      (el) => el.style.transform.startsWith('translateZ(') && /pointer|crosshair/.test(el.style.cursor),
    );
    let hidden = 0, hiddenOnStage = 0;
    for (const el of planes) {
      if (el.style.display !== 'none') continue;
      hidden++;
      el.style.display = '';
      const r = el.getBoundingClientRect();
      el.style.display = 'none';
      if (r.right > sb.left && r.left < sb.right && r.bottom > sb.top && r.top < sb.bottom) hiddenOnStage++;
    }
    // Plane sets willChange 'transform' only while dragging (index.html:912)
    return { hidden, hiddenOnStage, dragging: planes.some((el) => el.style.willChange === 'transform') };
  });

async function stageCentre(page) {
  return page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    const b = stage.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
}

const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

// Orbit to a pose clearly away from the static one; the first move crosses onMove's 3 px threshold.
async function dragTo(page, dx, dy) {
  const c = await stageCentre(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 8, c.y);
  await page.mouse.move(c.x + dx, c.y + dy, { steps: 5 });
  await frames(page);
}

test('Culling_DragZoomed_HiddenPlanesOffStage', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  await zoomIn(page, 12);
  expect((await cullState(page)).hidden, 'static frame culls nothing').toBe(0);
  await dragTo(page, 60, 40);
  const during = await cullState(page);
  expect(during.dragging, 'drag started').toBe(true);
  expect(during.hiddenOnStage, 'hidden planes that intersect the stage').toBe(0);
  expect(during.hidden, 'zoomed drag culls something').toBeGreaterThan(0);
  await page.mouse.up();
  await frames(page);
  expect((await cullState(page)).hidden, 'release restores every plane').toBe(0);
});

test('Culling_DefaultView_HiddenPlanesOffStage', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  await dragTo(page, 60, 40);
  const during = await cullState(page);
  expect(during.dragging, 'drag started').toBe(true);
  expect(during.hiddenOnStage, 'hidden planes that intersect the stage').toBe(0);
  await page.mouse.up();
  await frames(page);
  expect((await cullState(page)).hidden, 'release restores every plane').toBe(0);
});
