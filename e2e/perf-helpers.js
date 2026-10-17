import fs from 'node:fs';
import os from 'node:os';
import { execSync } from 'node:child_process';

// Runs before any page script: wraps getComputedStyle (scan() calls it once per scanned node) and
// records long animation frames. A "burst" is a run of getComputedStyle calls with gaps < 30 ms; the
// scan's own debounce (90 ms) separates consecutive scans.
export async function instrument(page) {
  await page.addInitScript(() => {
    const w = window;
    w.__perf = { bursts: [], loaf: [], obs: null, calls: 0 };
    const orig = w.getComputedStyle.bind(w);
    let cur = null;
    w.getComputedStyle = function (...a) {
      const t = performance.now();
      if (!cur || t - cur.last > 30) {
        cur = { start: t, last: t, count: 0 };
        w.__perf.bursts.push(cur);
      }
      cur.last = t;
      cur.count++;
      w.__perf.calls++;
      return orig(...a);
    };
    try {
      const sum = (e) => (e.scripts || []).reduce((a, s) => a + s.duration, 0);
      w.__perf.obs = new PerformanceObserver((l) => {
        for (const e of l.getEntries()) w.__perf.loaf.push({ d: e.duration, s: sum(e) });
      });
      w.__perf.obs.observe({ type: 'long-animation-frame', buffered: true });
    } catch (e) {
      /* long-animation-frame unsupported: loaf stays empty */
    }
  });
}

// Waits until the last burst of at least `minNodes` computed-style reads has been idle for 400 ms and
// returns the largest burst: `nodes` is its getComputedStyle call count (about the scanned node
// count), `ms` its span and `endMs` the time since navigation start at which it ended. Smaller bursts
// after it (one call per app render, the helpers' own reads) are ignored.
export async function waitForScan(page, minNodes = 5, timeout = 20_000) {
  await page.waitForFunction(
    (n) => {
      const b = window.__perf.bursts;
      let last = null;
      for (let i = b.length - 1; i >= 0 && !last; i--) if (b[i].count >= n) last = b[i];
      return !!last && performance.now() - last.last > 400;
    },
    minNodes,
    { timeout },
  );
  return page.evaluate(() => {
    const b = window.__perf.bursts.reduce((m, x) => (x.count > m.count ? x : m));
    return { nodes: b.count, ms: b.last - b.start, endMs: b.last };
  });
}

// Orbit drag with real input events (CDP mouse: hit-testing, mouseenter/leave on the planes under
// the cursor) for `durationMs`, while an in-page rAF loop records the frame intervals. CDP
// Performance metrics split the main-thread time per frame (task, script, style recalc, layout);
// gcsPerFrame counts getComputedStyle calls between mousedown and mouseup.
// opts.afterFirstMove (S4.9): awaited right after the first drag mousemove; dragStartMs is then the largest
// of the 8 frame intervals that start at that move (the hitch a DOM regroup would cause).
// opts.afterFirstMove / opts.beforeUp also make the result carry dragEndMs.
// opts.beforeUp (S4.9): awaited after the timed loop and before mouseup; frames recorded while the hook sets
// window.__orbit.paused are dropped, so an undo done there stays out of the frame statistics.
export async function orbitDrag(page, durationMs = 1500, opts = {}) {
  const r = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    if (!stage) throw new Error('stage element not found');
    const b = stage.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metrics = async () =>
    Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await page.evaluate(() => {
    const rec = (window.__orbit = { times: [], stop: false });
    let last = performance.now();
    const step = (t) => {
      if (!rec.paused) rec.times.push(t - last);
      last = t;
      if (!rec.stop) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    window.__perf.loaf.length = 0;
  });
  const m0 = await metrics();
  await page.mouse.move(r.x, r.y);
  await page.mouse.down();
  // after mousedown: hover renders before the press read live style and are not part of the drag
  await page.evaluate(() => (window.__perf.calls0 = window.__perf.calls));
  const t0 = Date.now();
  let i = 0;
  let startIdx = null;
  let endIdx = null;
  while (Date.now() - t0 < durationMs) {
    if (i === 0 && opts.afterFirstMove) startIdx = await page.evaluate(() => window.__orbit.times.length);
    await page.mouse.move(r.x + (i % 60) * 2, r.y + Math.sin(i / 8) * 40);
    if (i === 0 && opts.afterFirstMove) await opts.afterFirstMove();
    i++;
  }
  const gcsCalls = await page.evaluate(() => window.__perf.calls - window.__perf.calls0);
  if (opts.beforeUp) await opts.beforeUp();
  if (opts.afterFirstMove || opts.beforeUp) endIdx = await page.evaluate(() => window.__orbit.times.length);
  await page.mouse.up();
  const m1 = await metrics();
  await cdp.detach();
  const res = await page.evaluate(([startIdx, endIdx]) => {
    window.__orbit.stop = true;
    const p = window.__perf;
    if (p.obs) {
      for (const e of p.obs.takeRecords()) {
        p.loaf.push({ d: e.duration, s: (e.scripts || []).reduce((a, s) => a + s.duration, 0) });
      }
    }
    const times = window.__orbit.times.slice(1);
    if (times.length < 10) throw new Error(`only ${times.length} animation frames during the drag`);
    const sorted = [...times].sort((a, b) => a - b);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const loafTotal = p.loaf.reduce((a, x) => a + x.d, 0);
    const loafScript = p.loaf.reduce((a, x) => a + x.s, 0);
    return {
      frames: times.length,
      meanFrameMs: mean,
      fps: 1000 / mean,
      p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
      loafCount: p.loaf.length,
      loafScriptShare: loafTotal ? loafScript / loafTotal : 0,
      ...(startIdx === null ? {} : { dragStartMs: Math.max(...window.__orbit.times.slice(startIdx, startIdx + 8)) }),
      // largest of the 8 frames from mouseup on: the release render (remount of the planes on an S4.9 app)
      ...(endIdx === null ? {} : { dragEndMs: Math.max(...window.__orbit.times.slice(endIdx, endIdx + 8)) }),
    };
  }, [startIdx, endIdx]);
  const per = (k) => ((m1[k] - m0[k]) * 1000) / res.frames;
  return {
    ...res,
    gcsCalls,
    gcsPerFrame: gcsCalls / res.frames,
    main: { taskMs: per('TaskDuration'), scriptMs: per('ScriptDuration'), styleMs: per('RecalcStyleDuration'), layoutMs: per('LayoutDuration') },
  };
}

// Plane census from the DOM (inline styles only per plane): planes are the stage divs with an
// inline translateZ transform and a pointer/crosshair cursor (overlays have no cursor). Off-screen is
// measured against the stage grown by 15 % of its larger side (the culler's CULL_MARGIN).
// hide = true sets display:none on the off-screen planes (Task 1 upper-bound spike).
// bare = paints only its outline; empty = paints nothing (marked data-s48-empty for hidePlanes).
export async function planeCensus(page, hide = false) {
  return page.evaluate((hide) => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    if (!stage) throw new Error('stage element not found');
    const s = stage.getBoundingClientRect();
    const m = 0.15 * Math.max(s.width, s.height);
    const sb = { left: s.left - m, right: s.right + m, top: s.top - m, bottom: s.bottom + m };
    const planes = [...stage.querySelectorAll('div')].filter(
      (el) => el.hasAttribute('data-plane') || (el.style.transform.startsWith('translateZ(') && /pointer|crosshair/.test(el.style.cursor)),
    );
    const c = { total: planes.length, offscreen: 0, partial: 0, opBelow005: 0, opZero: 0, bare: 0, empty: 0 };
    // ids of the empty planes survive the remount an S4.9 app does at the first drag move (reapplyMarks)
    const st = (window.__s48 = { empty: [], hide: [] });
    for (const el of planes) {
      const r = el.getBoundingClientRect();
      const out = r.right < sb.left || r.left > sb.right || r.bottom < sb.top || r.top > sb.bottom;
      const inside = r.left >= sb.left && r.right <= sb.right && r.top >= sb.top && r.bottom <= sb.bottom;
      if (out) {
        c.offscreen++;
        if (hide) el.style.display = 'none';
      } else if (!inside) c.partial++;
      const op = el.style.opacity === '' ? 1 : +el.style.opacity;
      if (op < 0.05) c.opBelow005++;
      if (op === 0) c.opZero++;
      // computed style per plane: runs after waitForScan and before the drag, so neither burst nor gcsPerFrame moves
      const cs = getComputedStyle(el);
      const noBorder = ['Top', 'Right', 'Bottom', 'Left'].every((k) => cs['border' + k + 'Style'] === 'none' || parseFloat(cs['border' + k + 'Width']) === 0);
      const bare = cs.backgroundColor === 'rgba(0, 0, 0, 0)' && cs.backgroundImage === 'none' && noBorder && cs.boxShadow === 'none' && el.childNodes.length === 0;
      if (bare) c.bare++;
      if (bare && cs.outlineStyle === 'none') {
        c.empty++;
        el.setAttribute('data-s48-empty', '');
        st.empty.push(el.getAttribute('data-plane'));
      }
    }
    return c;
  }, hide);
}

// Wheel zoom at the stage centre (zoomBy 1.1 per event), then wait out the 0.35 s world transition.
export async function zoomIn(page, steps) {
  const r = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    const b = stage.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.mouse.move(r.x, r.y);
  for (let i = 0; i < steps; i++) await page.mouse.wheel(0, -100);
  await page.waitForTimeout(600);
}

// S4.6 upper bound: from now on getComputedStyle(el) returns, per element, a memo that reads each
// property once and never refreshes. Valid only while nothing mutates the mock (an orbit drag); call
// after waitForScan so the scan itself stays live and counted.
export async function memoComputedStyle(page) {
  await page.evaluate(() => {
    const live = window.getComputedStyle;
    const memo = new WeakMap();
    window.getComputedStyle = function (el, pseudo) {
      if (pseudo) return live(el, pseudo);
      let p = memo.get(el);
      if (!p) {
        const cs = live(el);
        const vals = Object.create(null);
        const vars = Object.create(null);
        const gpv = (n) => (n in vars ? vars[n] : (vars[n] = cs.getPropertyValue(n)));
        p = new Proxy(cs, {
          get: (t, k) => (k === 'getPropertyValue' ? gpv : typeof k !== 'string' ? t[k] : k in vals ? vals[k] : (vals[k] = t[k])),
        });
        memo.set(el, p);
      }
      return p;
    };
  });
}

// S4.6 second upper bound, on top of memoComputedStyle: clientWidth/clientHeight of mock elements
// (renderVals box model) are memoized per element through WeakMap-backed getters and never
// refresh. App elements (outside the mock's shadow root) keep the live getters.
export async function memoClientBox(page) {
  await page.evaluate(() => {
    for (const k of ['clientWidth', 'clientHeight']) {
      const d = Object.getOwnPropertyDescriptor(Element.prototype, k);
      const memo = new WeakMap();
      Object.defineProperty(Element.prototype, k, {
        configurable: true,
        get() {
          if (!(this.getRootNode() instanceof ShadowRoot)) return d.get.call(this);
          if (!memo.has(this)) memo.set(this, d.get.call(this));
          return memo.get(this);
        },
      });
    }
  });
}

// S4.8: marks the planes (planeCensus filter) and the world div so a stylesheet can override their inline
// styles with !important. React never touches attributes it did not set: the marks survive drag renders.
export async function markScene(page) {
  return page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    if (!stage) throw new Error('stage element not found');
    const planes = [...stage.querySelectorAll('div')].filter(
      (el) => el.hasAttribute('data-plane') || (el.style.transform.startsWith('translateZ(') && /pointer|crosshair/.test(el.style.cursor)),
    );
    if (!planes.length) throw new Error('no planes found');
    planes.forEach((el) => el.setAttribute('data-s48-plane', ''));
    // Plane -> page -> world (index.html:2159-2160)
    const pg = planes[0].parentElement;
    (pg.hasAttribute('data-plane-group') ? pg.parentElement : pg).parentElement.setAttribute('data-s48-world', '');
    return planes.length;
  });
}

// S4.8 upper bounds: hides planes by mark with display:none !important. 'empty' = planes planeCensus marked
// as painting nothing (call planeCensus first); 'odd' = every other plane (linearity check, not a fix).
export async function hidePlanes(page, which) {
  const n = await page.evaluate((which) => {
    const planes = [...document.querySelectorAll('[data-s48-plane]')];
    let n = 0;
    const st = (window.__s48 = window.__s48 || { empty: [], hide: [] });
    planes.forEach((el, i) => {
      const hide = which === 'odd' ? i % 2 === 1 : el.hasAttribute('data-s48-empty');
      if (hide) {
        el.setAttribute('data-s48-hide', '');
        st.hide.push(el.getAttribute('data-plane'));
        n++;
      }
    });
    return n;
  }, which);
  await page.addStyleTag({ content: '[data-s48-hide]{display:none!important}' });
  return n;
}

// S4.8 marks live on plane nodes; an app with data-plane (S4.9) remounts the planes under div[data-plane-group]
// at the first drag mousemove and the marks are gone. Call this from orbitDrag's afterFirstMove: it waits for
// the groups, re-applies data-s48-plane / -empty / -hide by plane id and returns how many planes are hidden
// now. On an app without data-plane the nodes persist and it only counts.
export async function reapplyMarks(page) {
  return page.evaluate(async () => {
    if (document.querySelector('[data-plane]')) {
      for (let i = 0; i < 60 && !document.querySelector('[data-plane-group]'); i++) await new Promise((r) => requestAnimationFrame(r));
      const st = window.__s48 || { empty: [], hide: [] };
      const empty = new Set(st.empty), hide = new Set(st.hide);
      for (const el of document.querySelectorAll('[data-plane]')) {
        const id = el.getAttribute('data-plane');
        el.setAttribute('data-s48-plane', '');
        if (empty.has(id)) el.setAttribute('data-s48-empty', '');
        if (hide.has(id)) el.setAttribute('data-s48-hide', '');
      }
    }
    return document.querySelectorAll('[data-s48-hide]').length;
  });
}

// Sets the "Intensidade dos frames" slider (wireAlpha, index.html:123) through React's onChange; 0 turns
// every wire outline off. Waits two frames for the render.
export async function setWireAlpha(page, v) {
  await page.evaluate((v) => {
    const input = document.querySelector('label[title="Intensidade dos frames"] input[type="range"]');
    if (!input) throw new Error('wire slider not found');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(v));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

// S4.8: counts plane-to-plane pointer transitions (each one is an H.enter hoverId change) until the
// returned function is called. Same probe as S4.7's countHoverSwaps (e2e/tree-perf-helpers.js), kept
// under another name so the two imports never collide in perf.spec.js.
export async function countPlaneHovers(page) {
  await page.evaluate(() => {
    const st = (window.__s48hov = { n: 0, last: null });
    const plane = (el) => {
      for (; el; el = el.parentElement) if (el.style && (el.hasAttribute('data-plane') || el.hasAttribute('data-s49-plane') || (el.style.transform.startsWith('translateZ(') && /pointer|crosshair/.test(el.style.cursor)))) return el;
      return null;
    };
    st.fn = (e) => {
      const p = plane(e.target);
      if (p && p !== st.last) { st.n++; st.last = p; }
    };
    document.addEventListener('mouseover', st.fn, true);
  });
  return () => page.evaluate(() => { document.removeEventListener('mouseover', window.__s48hov.fn, true); return window.__s48hov.n; });
}

// S4.9 spike: wraps the planes that share one translateZ in div[data-s49-group] (the app is unmodified; the
// real change would live in scene()). Each group is a page-sized absolute box with the translateZ and
// will-change: transform; the planes stay at z = 0 inside it, so a group is one flat layer. Call it right
// after the first drag mousemove, once the render that sets `dragging` has run. The planes' transform,
// transition, will-change (and contain with dropContain) are overridden by an injected !important
// stylesheet on [data-s49-plane], not stripped inline: React rewrites those props on a render, an
// override cannot be undone by it. pointer-events: none on the group keeps blank areas from hitting it;
// the planes keep their own inline pointer-events. countPlaneHovers follows data-s49-plane (the translateZ
// filter no longer matches once the override is on). probe = true compares elementFromPoint on a grid
// before and after (extra work: keep it out of timed drags). Returns { planes, groups, ms, probe }; ms is
// the in-page cost of the regroup itself. Pair it with ungroupPlanesByZ before mouseup.
export async function groupPlanesByZ(page, { dropContain = false, probe = false } = {}) {
  return page.evaluate(
    ({ dropContain, probe }) => {
      const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
        getComputedStyle(el).backgroundImage.includes('radial-gradient'),
      );
      if (!stage) throw new Error('stage element not found');
      const planes = [...stage.querySelectorAll('div')].filter(
        (el) => el.hasAttribute('data-plane') || (el.style.transform.startsWith('translateZ(') && /pointer|crosshair/.test(el.style.cursor)),
      );
      if (!planes.length) throw new Error('no planes found');
      // an app with data-plane groups natively while dragging (S4.9 Task E4): wrapping again would fight React
      if (planes[0].hasAttribute('data-plane')) return { planes: planes.length, groups: stage.querySelectorAll('[data-plane-group]').length, ms: 0, probe: null, native: true };
      const pageEl = planes[0].parentElement;
      const pts = [];
      let before = null;
      if (probe) {
        const s = stage.getBoundingClientRect();
        for (let ix = 1; ix <= 9; ix++) for (let iy = 1; iy <= 7; iy++) pts.push([s.left + (s.width * ix) / 10, s.top + (s.height * iy) / 8]);
        before = pts.map(([x, y]) => document.elementFromPoint(x, y));
      }
      const t0 = performance.now();
      const w = pageEl.offsetWidth;
      const h = pageEl.offsetHeight;
      const orig = [...pageEl.children];
      const byZ = new Map();
      for (const el of planes) {
        const z = parseFloat(el.style.transform.slice('translateZ('.length));
        if (!byZ.has(z)) byZ.set(z, []);
        byZ.get(z).push(el);
      }
      const groups = [];
      for (const [z, els] of byZ) {
        const g = document.createElement('div');
        g.setAttribute('data-s49-group', '');
        g.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform:translateZ(${z}px);will-change:transform;pointer-events:none`;
        pageEl.insertBefore(g, els[0]);
        for (const el of els) {
          g.appendChild(el);
          el.setAttribute('data-s49-plane', '');
        }
        groups.push(g);
      }
      const style = document.createElement('style');
      style.textContent = `[data-s49-plane]{transform:none!important;transition:none!important;will-change:auto!important${dropContain ? ';contain:none!important' : ''}}`;
      document.head.appendChild(style);
      window.__s49 = { pageEl, orig, groups, style };
      const ms = performance.now() - t0;
      let hit = null;
      if (probe) {
        const after = pts.map(([x, y]) => document.elementFromPoint(x, y));
        hit = { total: pts.length, same: after.filter((e, i) => e === before[i]).length, onGroup: after.filter((e) => e && e.hasAttribute('data-s49-group')).length };
      }
      return { planes: planes.length, groups: byZ.size, ms, probe: hit };
    },
    { dropContain, probe },
  );
}

// S4.9: undoes groupPlanesByZ (planes back under the page in their original order, groups, override
// stylesheet and marks removed) so React's post-drag render never sees moved nodes. Without a regroup it only
// waits (the A/A control). It pauses the orbitDrag frame recorder (window.__orbit.paused) around the undo
// and two frames, so the undo hitch is not part of the drag statistics. Call it from orbitDrag's beforeUp.
export async function ungroupPlanesByZ(page) {
  return page.evaluate(async () => {
    const o = window.__orbit;
    if (o) o.paused = true;
    const st = window.__s49;
    if (st) {
      st.pageEl.append(...st.orig);
      st.groups.forEach((g) => g.remove());
      st.style.remove();
      st.orig.forEach((el) => el.removeAttribute('data-s49-plane'));
      window.__s49 = null;
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (o) o.paused = false;
    return !!st;
  });
}

// S4.9: composited layer count from CDP LayerTree. The domain only emits layerTreeDidChange while the tree
// changes (an idle page sends nothing after enable), so a 1px will-change probe is added and removed to force
// two updates; the count is the layer total of the last event once `settleMs` pass without one (at most
// `maxMs` per wait). The domain serializes the whole tree on every change: keep it out of timed drags.
// `drawing` = layers with drawsContent. Returns { total, drawing, events }; total is null if no event came.
export async function countCompositedLayers(page, { settleMs = 300, maxMs = 3000 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  let last = null;
  let events = 0;
  let lastAt = Date.now();
  cdp.on('LayerTree.layerTreeDidChange', (e) => {
    last = e.layers || [];
    events++;
    lastAt = Date.now();
  });
  const waitFor = async (cond) => {
    const t0 = Date.now();
    while (Date.now() - t0 < maxMs && !cond()) await new Promise((r) => setTimeout(r, 25));
  };
  await cdp.send('LayerTree.enable');
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.id = '__s49-probe';
    d.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;will-change:transform';
    document.body.appendChild(d);
  });
  await waitFor(() => events > 0);
  const added = events;
  await page.evaluate(() => document.getElementById('__s49-probe').remove());
  await waitFor(() => events > added);
  await waitFor(() => Date.now() - lastAt >= settleMs);
  await cdp.send('LayerTree.disable').catch(() => {});
  await cdp.detach().catch(() => {});
  return { total: last ? last.length : null, drawing: last ? last.filter((l) => l.drawsContent).length : null, events };
}

export function writeBench(benchmarks, runtime) {
  const sha = execSync('git rev-parse HEAD').toString().trim();
  const dirty = execSync('git status --porcelain').toString().trim().length > 0;
  const ts = new Date().toISOString();
  const out = {
    schemaVersion: 1,
    suite: 'layers-ui',
    tag: 'latency',
    timestampUtc: ts,
    env: {
      cpu: os.cpus()[0].model,
      cores: os.cpus().length,
      os: `${os.platform()} ${os.release()}`,
      runtime,
      gc: 'V8',
      tool: 'playwright',
    },
    git: { sha, dirty },
    benchmarks,
  };
  fs.mkdirSync('bench/results', { recursive: true });
  const file = `bench/results/${ts.replace(/[:.]/g, '-')}-layers-ui.bench.json`;
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  return file;
}
