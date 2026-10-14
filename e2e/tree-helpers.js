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
