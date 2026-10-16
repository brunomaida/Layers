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
