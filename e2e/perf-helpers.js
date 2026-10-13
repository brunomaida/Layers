import fs from 'node:fs';
import os from 'node:os';
import { execSync } from 'node:child_process';

// Runs before any page script: wraps getComputedStyle (scan() calls it once per node) and records
// longtasks. A "burst" is a run of getComputedStyle calls with gaps < 100 ms.
export async function instrument(page) {
  await page.addInitScript(() => {
    const w = window;
    w.__perf = { bursts: [], longtasks: [] };
    const orig = w.getComputedStyle.bind(w);
    let cur = null;
    w.getComputedStyle = function (...a) {
      const t = performance.now();
      if (!cur || t - cur.last > 100) {
        cur = { start: t, last: t, count: 0 };
        w.__perf.bursts.push(cur);
      }
      cur.last = t;
      cur.count++;
      return orig(...a);
    };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.__perf.longtasks.push(e.duration);
    }).observe({ type: 'longtask', buffered: true });
  });
}

// Waits for a burst of at least `minNodes` computed-style reads that has been idle for 400 ms and
// returns the largest burst: its size is the scanned node count, its span the scan duration.
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
    return { nodes: b.count, ms: b.last - b.start };
  });
}

// Drives a real orbit drag from inside the page, one mousemove per animation frame.
export async function orbitFps(page, frames = 90) {
  return page.evaluate(async (n) => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    if (!stage) throw new Error('stage element not found');
    const r = stage.getBoundingClientRect();
    const x0 = r.left + r.width / 2;
    const y0 = r.top + r.height / 2;
    const fire = (type, x, y) =>
      stage.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 }));
    const times = [];
    window.__perf.longtasks.length = 0;
    fire('mousedown', x0, y0);
    await new Promise((resolve) => {
      let i = 0;
      let last = performance.now();
      const step = (t) => {
        times.push(t - last);
        last = t;
        fire('mousemove', x0 + (i % 60) * 2, y0 + Math.sin(i / 8) * 40);
        if (++i < n) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    fire('mouseup', x0, y0);
    times.shift();
    if (times.length < n - 2) throw new Error('rAF did not run (hidden tab?)');
    const sorted = [...times].sort((a, b) => a - b);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    // longtasks (> 50 ms main-thread blocks) separate JS cost from raster/compositor cost
    const lt = window.__perf.longtasks;
    return {
      fps: 1000 / mean,
      p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
      frames: times.length,
      longtaskCount: lt.length,
      longtaskMaxMs: lt.length ? Math.max(...lt) : 0,
    };
  }, frames);
}

export function writeBench(benchmarks) {
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
      runtime: 'chromium (playwright)',
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
