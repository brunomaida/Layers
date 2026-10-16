import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { test, expect } from '@playwright/test';

// S2.21c: tools/layers-snapshot-cli.mjs regenerates layers/mock.html from a running app, headless.
const CLI = path.resolve('tools/layers-snapshot-cli.mjs');
const APP = `<!doctype html><html><head><meta charset="utf-8"><title>Fake app</title><style>.card{padding:8px;background:#234}</style></head>
<body><div id="root"></div><script>
  const root = document.getElementById('root');
  root.innerHTML = '<div class="card" id="rendered-by-js"><span>montado por JavaScript</span></div>';
</script></body></html>`;

// async on purpose: the fake app is served from this very process, a blocking spawn would starve it
const run = (args) => new Promise((resolve) => execFile(process.execPath, [CLI, ...args], { encoding: 'utf8', timeout: 60000 }, (err, stdout, stderr) => resolve({ status: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout, stderr })));

test('Snapshot_LoopbackApp_WritesRenderedMock', async () => {
  const server = http.createServer((req, res) => { res.setHeader('content-type', 'text/html'); res.end(APP); });
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
    expect(r.stdout).toContain('Reanalisar do 0');
  } finally {
    server.close();
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
