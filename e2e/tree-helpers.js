// In-page reader for the mounted project tree. The loader mounts the sanitized mock into an open
// shadow root on an off-screen host; every node there carries `data-src` ("file|selector|line").
function collect() {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  if (!host) return null;
  const sh = host.shadowRoot;
  const els = [...sh.querySelectorAll('*')].filter((e) => e.localName !== 'style');
  const depthOf = (e) => {
    let d = 0;
    for (let n = e; n && n !== sh; n = n.parentNode) d++;
    return d;
  };
  const root = els[0];
  const r = root ? root.getBoundingClientRect() : { width: 0, height: 0 };
  return {
    els: els.map((e) => ({
      tag: e.localName,
      depth: depthOf(e),
      src: e.dataset.src || null,
      cls: [...e.classList],
      id: e.id || null,
    })),
    rootBox: { w: Math.round(r.width), h: Math.round(r.height) },
  };
}

// Polls until the node count has been stable for `quietMs`, then returns the raw nodes.
export async function readNodes(page, { quietMs = 600, timeout = 20_000 } = {}) {
  const t0 = Date.now();
  let last = -1;
  let since = Date.now();
  for (;;) {
    const snap = await page.evaluate(collect);
    const n = snap ? snap.els.length : 0;
    if (n !== last) {
      last = n;
      since = Date.now();
    } else if (n > 0 && Date.now() - since >= quietMs) return snap;
    if (Date.now() - t0 > timeout) throw new Error(`tree did not settle (last count ${n})`);
    await page.waitForTimeout(150);
  }
}

// Compact, diff-friendly summary used by the committed snapshot.
export async function readTree(page) {
  const { els, rootBox } = await readNodes(page);
  const withSrc = els.filter((e) => e.src);
  const files = new Set(withSrc.map((e) => e.src.split('|')[0]));
  return {
    nodes: els.length,
    maxDepth: els.reduce((m, e) => Math.max(m, e.depth), 0),
    withSrc: withSrc.length,
    srcFiles: [...files].sort(),
    rootBox,
  };
}

// S4.10 window-safe tree access. The tree container is the `overflow-y: auto` ancestor of the first
// `[data-node-id]` row (as scrollFrames in tree-perf-helpers.js), so these work with and without the
// row window. A row outside the mounted slice does not exist in the DOM: scroll first, then query.
const frames2 = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

// Sets the container scrollTop (clamped by the browser) and reports its geometry after the render.
async function scrollTree(page, to) {
  const g = await page.evaluate((to) => {
    let b = document.querySelector('[data-node-id]');
    while (b && getComputedStyle(b).overflowY !== 'auto') b = b.parentElement;
    if (!b) return null;
    b.scrollTop = to === 'end' ? b.scrollHeight : to;
    return true;
  }, to);
  if (!g) throw new Error('tree container not found');
  await frames2(page);
  return page.evaluate(() => {
    let b = document.querySelector('[data-node-id]');
    while (b && getComputedStyle(b).overflowY !== 'auto') b = b.parentElement;
    return { top: b.scrollTop, ch: b.clientHeight, sh: b.scrollHeight };
  });
}

// First mounted row (from the top of the list) that matches title prefix and/or text. Scrolls the
// container from the top, one clientHeight at a time, until it mounts.
export async function treeRow(page, { title, text } = {}) {
  let loc = page.locator(title != null ? `[data-node-id][title^="${title}"]` : '[data-node-id]');
  if (text != null) loc = loc.filter({ hasText: text });
  let g = await scrollTree(page, 0);
  for (;;) {
    if (await loc.count()) return loc.first();
    if (g.top + g.ch >= g.sh) break;
    g = await scrollTree(page, g.top + g.ch);
  }
  throw new Error(`tree row not found: ${JSON.stringify({ title, text })}`);
}

// Last row of the list: scrolls to the end, then takes the last mounted `[data-node-id]`.
export async function lastTreeRow(page) {
  await scrollTree(page, 'end');
  return page.locator('[data-node-id]').last();
}

// Geometry of the mounted slice. mounted = `[data-node-id]` rows; padTop/padBot = height of the
// leading/trailing container children that are neither a row nor a code block (the spacers; 0
// without the window); contiguous = children touch and add up to scrollHeight - container padding;
// covers = the mounted slice spans the visible rectangle (no spacer edge, and no spacer anywhere, shows).
export function treeWindowState(page) {
  return page.evaluate(() => {
    let box = document.querySelector('[data-node-id]');
    while (box && getComputedStyle(box).overflowY !== 'auto') box = box.parentElement;
    if (!box) throw new Error('tree container not found');
    const flat = (p) => [...p.children].flatMap((c) => (getComputedStyle(c).display === 'contents' ? flat(c) : getComputedStyle(c).display === 'none' ? [] : [c]));
    const cs = getComputedStyle(box);
    const padT = parseFloat(cs.paddingTop), padB = parseFloat(cs.paddingBottom);
    const bt = box.getBoundingClientRect().top + box.clientTop;
    const kids = flat(box).map((el) => {
      const r = el.getBoundingClientRect();
      return { y: r.top - bt + box.scrollTop, h: r.height, real: el.hasAttribute('data-node-id') || !!el.querySelector('textarea') };
    });
    const first = kids.findIndex((k) => k.real);
    const last = kids.length - 1 - [...kids].reverse().findIndex((k) => k.real);
    const sum = (a) => a.reduce((s, k) => s + k.h, 0);
    const padTop = first < 0 ? 0 : sum(kids.slice(0, first));
    const padBot = first < 0 ? 0 : sum(kids.slice(last + 1));
    let contiguous = kids.length > 0 && Math.abs(kids[0].y - padT) <= 1 && Math.abs(sum(kids) - (box.scrollHeight - padT - padB)) <= 1;
    for (let i = 1; i < kids.length; i++) if (Math.abs(kids[i].y - (kids[i - 1].y + kids[i - 1].h)) > 1) contiguous = false;
    const visTop = box.scrollTop, visBot = box.scrollTop + box.clientHeight;
    const covers = first >= 0 && (padTop === 0 || kids[first].y <= visTop + 0.5) && (padBot === 0 || kids[last].y + kids[last].h >= visBot - 0.5)
      && kids.every((k) => k.real || k.h <= 0.5 || k.y + k.h <= visTop + 0.5 || k.y >= visBot - 0.5); // S4.11: a spacer between two mounted ranges must stay out of the view
    return {
      mounted: box.querySelectorAll('[data-node-id]').length,
      scrollHeight: box.scrollHeight,
      clientHeight: box.clientHeight,
      padTop,
      padBot,
      contiguous,
      covers,
    };
  });
}
