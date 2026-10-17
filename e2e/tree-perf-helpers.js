import { expect } from '@playwright/test';

const frames2 = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

// Same inflation as Scan_1500Tags_UnderBudget (perf.spec.js): the Traval mock body repeats until it
// has about `tags` tags. Call before page.goto.
export async function inflateTraval(page, tags) {
  await page.route('**/fixtures/traval/layers/mock.html', async (route) => {
    const html = await (await route.fetch()).text();
    const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (!m) throw new Error('traval mock has no <body>');
    const perCopy = (m[1].match(/<[a-z][^>]*>/gi) || []).length;
    await route.fulfill({ body: html.replace(m[1], m[1].repeat(Math.max(1, Math.ceil(tags / perCopy)))), contentType: 'text/html' });
  });
}

// S4.7 go/no-go states: 'open' (default), 'closed' (tree panel collapsed: rows still built by
// render(), none mounted), 'root' (L0 row collapsed: one row built and mounted).
export async function treeMode(page, mode) {
  if (mode === 'closed') await page.locator('div[title="Recolher / expandir"]').filter({ hasText: 'Árvore de camadas' }).first().click();
  if (mode === 'root') await page.locator('[data-node-id="0"] > button').first().click();
  await frames2(page);
  const n = await page.locator('[data-node-id]').count();
  if (mode === 'closed') expect(n, 'tree panel collapsed').toBe(0);
  if (mode === 'root') expect(n, 'only the L0 row').toBe(1);
}

// S4.8 V1 simulated without S4.8 code: marks the planes (planeCensus predicate, perf-helpers.js) and
// disables their hit-test, so the drag no longer swaps hoverId.
export async function noPlaneHits(page) {
  const n = await page.evaluate(() => {
    const ps = [...document.querySelectorAll('*')].filter((el) => el.style && el.style.transform.startsWith('translateZ(') && /pointer|crosshair/.test(el.style.cursor));
    ps.forEach((el) => el.setAttribute('data-s47-v1', ''));
    return ps.length;
  });
  expect(n, 'planes marked for V1').toBeGreaterThan(0);
  await page.addStyleTag({ content: '[data-s47-v1]{pointer-events:none!important}' });
}

// Counts plane-to-plane pointer transitions (each is a hoverId change, index.html H.enter) until the
// returned function is called.
export async function countHoverSwaps(page) {
  await page.evaluate(() => {
    const st = (window.__hov = { n: 0, last: null });
    const plane = (el) => {
      for (; el; el = el.parentElement) if (el.style && el.style.transform.startsWith('translateZ(') && /pointer|crosshair/.test(el.style.cursor)) return el;
      return null;
    };
    st.fn = (e) => {
      const p = plane(e.target);
      if (p && p !== st.last) { st.n++; st.last = p; }
    };
    document.addEventListener('mouseover', st.fn, true);
  });
  return () => page.evaluate(() => { document.removeEventListener('mouseover', window.__hov.fn, true); return window.__hov.n; });
}

// Median cost of n hovers or clicks on top Hierarquia rows (always mounted, with or without a
// window): from the input event (capture listener, before React) to the second frame after it.
export async function rowInputCost(page, kind, n = 5) {
  const type = kind === 'hover' ? 'mouseover' : 'click';
  const samples = [];
  for (let i = 0; i < n; i++) {
    const b = await page.locator('[data-node-id]').nth((kind === 'hover' ? 2 : 2 + n) + i).boundingBox();
    await page.mouse.move(2, 2);
    await page.evaluate((type) => {
      window.__cost = null;
      const fn = (e) => {
        if (!e.target.closest('[data-node-id]')) return;
        document.removeEventListener(type, fn, true);
        const t0 = performance.now();
        requestAnimationFrame(() => requestAnimationFrame(() => (window.__cost = performance.now() - t0)));
      };
      document.addEventListener(type, fn, true);
    }, type);
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    if (kind === 'hover') await page.mouse.move(x, y);
    else await page.mouse.click(x, y);
    samples.push(await (await page.waitForFunction(() => window.__cost)).jsonValue());
  }
  const sorted = [...samples].sort((a, b) => a - b);
  return { medianMs: sorted[n >> 1], samples };
}

// Frame interval while the tree container scrolls `px` per frame for `frames` frames (with the S4.7
// window every 110 px of scroll is a full render()). The container is the scrollable ancestor of
// the first tree row, so this works with and without the window.
export async function scrollFrames(page, px = 40, frames = 90) {
  return page.evaluate(([px, frames]) => new Promise((resolve, reject) => {
    let box = document.querySelector('[data-node-id]');
    while (box && getComputedStyle(box).overflowY !== 'auto') box = box.parentElement;
    if (!box) return reject(new Error('tree container not found'));
    box.scrollTop = 0;
    const t = [];
    const step = (now) => {
      t.push(now);
      if (t.length > frames) {
        const d = t.slice(1).map((x, i) => x - t[i]);
        const s = [...d].sort((a, b) => a - b);
        return resolve({ meanFrameMs: d.reduce((a, b) => a + b, 0) / d.length, p95FrameMs: s[Math.floor(s.length * 0.95)], frames: d.length, scrolled: box.scrollTop });
      }
      box.scrollTop += px;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), [px, frames]);
}
