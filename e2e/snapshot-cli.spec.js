import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { test, expect } from '@playwright/test';

// S2.21c: tools/layers-snapshot-cli.mjs regenerates layers/mock.html from a running app, headless.
const CLI = path.resolve('tools/layers-snapshot-cli.mjs');
const APP = `<!doctype html><html><head><meta charset="utf-8"><title>Fake app</title><link rel="stylesheet" href="/app.css"><style data-vite-dev-id="C:/p/src/styles/x.css">.v{color:red}</style><style>.card{padding:8px;background:#234}</style></head>
<body><div id="root"></div><script>
  const root = document.getElementById('root');
  root.innerHTML = '<div class="card" id="rendered-by-js"><span>montado por JavaScript</span></div>';
</script></body></html>`;

// async on purpose: the fake app is served from this very process, a blocking spawn would starve it
const run = (args) => new Promise((resolve) => execFile(process.execPath, [CLI, ...args], { encoding: 'utf8', timeout: 60000 }, (err, stdout, stderr) => resolve({ status: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout, stderr })));

test('Snapshot_LoopbackApp_WritesRenderedMock', async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/app.css') { res.setHeader('content-type', 'text/css'); res.end('.link{margin:1px}'); return; }
    res.setHeader('content-type', 'text/html'); res.end(APP);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layers-snap-'));
  try {
    const out = path.join(dir, 'mock.html');
    const r = await run([`http://127.0.0.1:${server.address().port}/`, out, '--wait', '200', '--viewport', '900x600']);
    expect(r.status, r.stderr).toBe(0);
    const html = fs.readFileSync(out, 'utf8');
    expect(html).toContain('snapshot LAYERS');
    expect(html).toContain('id="rendered-by-js"');
    expect(html).toContain('montado por JavaScript');
    expect(html).not.toContain('<script');
    expect(html).toContain('.card { padding: 8px');
    // S2.22a: one <style> per sheet, tagged with its origin (link href or Vite dev id)
    expect(html).toMatch(/data-layers-origin="http:\/\/127\.0\.0\.1:\d+\/app\.css"/);
    expect(html).toContain('data-layers-origin="C:/p/src/styles/x.css"');
    // the Vite id is tied to its own sheet, not just present somewhere
    expect(html).toMatch(/<style data-layers-origin="C:\/p\/src\/styles\/x\.css">[\s\S]*?\.v[\s\S]*?<\/style>/);
    expect(html.split('</style>').length - 1).toBeGreaterThanOrEqual(3);
    expect(r.stdout).toContain('Reanalisar do 0');
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const listen = async (handler) => { const server = http.createServer(handler); await new Promise((r) => server.listen(0, '127.0.0.1', r)); return server; };

test('Snapshot_OriginEscapingAndCrossOriginSheet_EscapedAttrAndUnlabeledNote', async () => {
  const other = await listen((req, res) => { res.setHeader('content-type', 'text/css'); res.end('.x{margin:2px}'); }); // no CORS headers
  const app = await listen((req, res) => {
    res.setHeader('content-type', 'text/html');
    res.end(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="http://127.0.0.1:${other.address().port}/x.css"><style data-vite-dev-id="C:/p/a&amp;b&quot;c&lt;d.css">.e{color:blue}</style></head><body><div id="r">ok</div></body></html>`);
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layers-snap-'));
  try {
    const out = path.join(dir, 'mock.html');
    const r = await run([`http://127.0.0.1:${app.address().port}/`, out, '--wait', '300']);
    expect(r.status, r.stderr).toBe(0);
    const html = fs.readFileSync(out, 'utf8');
    expect(html).toContain('data-layers-origin="C:/p/a&amp;b&quot;c&lt;d.css"');
    const note = /<style>\s*\/\* NÃO LIDO[\s\S]*?<\/style>/.exec(html);
    expect(note, 'unreadable cross-origin sheet becomes a comment-only <style> with no attribute').not.toBeNull();
    expect(note[0]).not.toContain('data-layers-origin');
    expect(note[0]).not.toContain('.x{');
  } finally {
    app.close(); other.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Snapshot_PageWithoutStylesheets_NoStyleElementAndHeadStillClosed', async () => {
  const app = await listen((req, res) => { res.setHeader('content-type', 'text/html'); res.end('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="r">ok</div></body></html>'); });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layers-snap-'));
  try {
    const out = path.join(dir, 'mock.html');
    const r = await run([`http://127.0.0.1:${app.address().port}/`, out, '--wait', '200']);
    expect(r.status, r.stderr).toBe(0);
    const html = fs.readFileSync(out, 'utf8');
    expect(html).not.toContain('<style');
    expect(html).toContain('</head>');
  } finally {
    app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Snapshot_AppRedirectsToTheEditor_RefusedWithoutWriting', async () => {
  const server = http.createServer((req, res) => { res.statusCode = 302; res.setHeader('location', 'http://localhost:5180/'); res.end(); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layers-snap-'));
  try {
    const out = path.join(dir, 'mock.html');
    const r = await run([`http://127.0.0.1:${server.address().port}/`, out, '--wait', '200']);
    expect(r.status, r.stderr).toBe(2);
    expect(r.stderr).toMatch(/5180/);
    expect(fs.existsSync(out)).toBe(false);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Snapshot_EditorPortOrExternalHost_RefusedWithoutWriting', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layers-snap-'));
  try {
    const out = path.join(dir, 'mock.html');
    for (const url of ['http://localhost:5180/', 'http://example.com/', 'https://localhost:5173/']) {
      const r = await run([url, out]);
      expect(r.status, url).toBe(2);
      expect(fs.existsSync(out), url).toBe(false);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// S2.22b: --state opens <app>/gallery.html#/<state>; --url is the flag form of the app URL.
test('Snapshot_StateFlag_CapturesTheGalleryState', async () => {
  const seen = [];
  const app = await listen((req, res) => {
    seen.push(req.url);
    res.setHeader('content-type', 'text/html');
    res.end(req.url.startsWith('/gallery.html')
      ? '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="g">gallery</div><script>document.body.insertAdjacentHTML("beforeend", "<p id=\\"st\\">" + location.hash + "</p>")</script></body></html>'
      : '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="home">home</div></body></html>');
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layers-snap-'));
  try {
    const out = path.join(dir, 'mock.csv.html');
    const r = await run(['--url', `http://127.0.0.1:${app.address().port}/`, out, '--state', 'csv-loaded', '--wait', '200']);
    expect(r.status, r.stderr).toBe(0);
    const html = fs.readFileSync(out, 'utf8');
    expect(html).toContain('id="g"');
    expect(html).toContain('#/csv-loaded');
    expect(html).not.toContain('id="home"');
    expect(seen.some((u) => u.startsWith('/gallery.html'))).toBe(true);
  } finally {
    app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Snapshot_InvalidState_RefusedWithoutWriting', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layers-snap-'));
  try {
    const out = path.join(dir, 'mock.html');
    const r = await run(['http://127.0.0.1:5173/', out, '--state', '../x']);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/--state/);
    expect(fs.existsSync(out)).toBe(false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Snapshot_StateGalleryMissing_RefusedWithoutWriting', async () => {
  const app = await listen((req, res) => { res.statusCode = req.url.startsWith('/gallery.html') ? 404 : 200; res.setHeader('content-type', 'text/html'); res.end('<!doctype html><html><body><div id="x">page</div></body></html>'); });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layers-snap-'));
  try {
    const out = path.join(dir, 'mock.html');
    const r = await run([`http://127.0.0.1:${app.address().port}/`, out, '--state', 'nope', '--wait', '200']);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/404/);
    expect(fs.existsSync(out)).toBe(false);
  } finally {
    app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// S2.22c: <html> attributes and canvases travel with the snapshot (theme, frozen chart image).
test('Snapshot_HtmlAttrsAndCanvas_AreCarriedIntoTheMock', async () => {
  const app = await listen((req, res) => {
    res.setHeader('content-type', 'text/html');
    res.end('<!doctype html><html lang="en" data-theme="light" onclick="x()" style="--bg-base:#f4f2ed"><head><meta charset="utf-8"></head><body>'
      + '<canvas id="c" class="chart" width="40" height="20" style="width:40px"></canvas><canvas id="big" width="2100" height="2100"></canvas>'
      + '<script>const g = document.getElementById("c").getContext("2d"); g.fillStyle = "#f00"; g.fillRect(0, 0, 20, 10);</script></body></html>');
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layers-snap-'));
  try {
    const out = path.join(dir, 'mock.html');
    const r = await run([`http://127.0.0.1:${app.address().port}/`, out, '--wait', '200']);
    expect(r.status, r.stderr).toBe(0);
    const html = fs.readFileSync(out, 'utf8');
    expect(html).toMatch(/<html [^>]*data-theme="light"/);
    expect(html).toMatch(/<html [^>]*style="--bg-base:#f4f2ed"/);
    expect(html).toMatch(/<html [^>]*lang="en"/);
    expect(/<html [^>]*onclick/.test(html), 'on* attributes of <html> are not copied').toBe(false);
    const img = /<img [^>]*id="c"[^>]*>/.exec(html);
    expect(img, 'canvas #c becomes an <img>').not.toBeNull();
    expect(img[0]).toContain('class="chart"');
    expect(img[0]).toContain('width="40"');
    expect(img[0]).toContain('data-layers-frozen="canvas"');
    expect(img[0]).toContain('src="data:image/png;base64,');
    expect(html).not.toContain('<canvas id="c"');
    expect(html, 'canvas above 4 Mpx stays as an empty <canvas>').toContain('<canvas id="big"');
  } finally {
    app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Snapshot_CanvasesAboveTheAggregateCap_LastOnesStayEmpty', async () => {
  // five 400x400 noise canvases: ~850 000 chars of data URL each, so the fifth passes 4 000 000 in total
  const app = await listen((req, res) => {
    res.setHeader('content-type', 'text/html');
    res.end('<!doctype html><html><head><meta charset="utf-8"></head><body>'
      + [0, 1, 2, 3, 4].map((i) => `<canvas id="n${i}" width="400" height="400"></canvas>`).join('')
      + '<script>for (const c of document.querySelectorAll("canvas")) { const g = c.getContext("2d"); const d = g.createImageData(400, 400); for (let i = 0; i < d.data.length; i++) d.data[i] = Math.floor(Math.random() * 256); g.putImageData(d, 0, 0); }</script></body></html>');
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layers-snap-'));
  try {
    const out = path.join(dir, 'mock.html');
    const r = await run([`http://127.0.0.1:${app.address().port}/`, out, '--wait', '300']);
    expect(r.status, r.stderr).toBe(0);
    const html = fs.readFileSync(out, 'utf8');
    expect(html.match(/<img [^>]*data-layers-frozen="canvas"/g) || []).toHaveLength(4);
    expect(html.match(/<canvas /g) || []).toHaveLength(1);
    expect(html).toContain('<canvas id="n4"');
  } finally {
    app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
