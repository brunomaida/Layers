import fs from 'node:fs';
import os from 'node:os';
import { execSync } from 'node:child_process';

// Runs before any page script: wraps getComputedStyle (scan() calls it once per scanned node) and
// records long animation frames. A "burst" is a run of getComputedStyle calls with gaps < 30 ms; the
// scan's own debounce (90 ms) separates consecutive scans.
export async function instrument(page) {
  await page.addInitScript(() => {
    const w = window;
    w.__perf = { bursts: [], loaf: [], obs: null };
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

// Waits for a burst of at least `minNodes` computed-style reads that has been idle for 400 ms and
// returns the largest one: `nodes` is the getComputedStyle call count (about the scanned node
// count), `ms` its span and `endMs` the time since navigation start at which it ended.
export async function waitForScan(page, minNodes = 5, timeout = 20_000) {
  await page.waitForFunction(
    (n) => {
      const b = window.__perf.bursts;
      const last = b[b.length - 1];
      return !!last && last.count >= n && performance.now() - last.last > 400;
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
// the cursor) for `durationMs`, while an in-page rAF loop records the frame intervals.
export async function orbitDrag(page, durationMs = 1500) {
  const r = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    if (!stage) throw new Error('stage element not found');
    const b = stage.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.evaluate(() => {
    const rec = (window.__orbit = { times: [], stop: false });
    let last = performance.now();
    const step = (t) => {
      rec.times.push(t - last);
      last = t;
      if (!rec.stop) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    window.__perf.loaf.length = 0;
  });
  await page.mouse.move(r.x, r.y);
  await page.mouse.down();
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < durationMs) {
    await page.mouse.move(r.x + (i % 60) * 2, r.y + Math.sin(i / 8) * 40);
    i++;
  }
  await page.mouse.up();
  return page.evaluate(() => {
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
    };
  });
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
