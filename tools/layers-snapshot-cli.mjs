// LAYERS · snapshot do DOM renderizado, sem console do navegador (S2.21c)
//
// node tools/layers-snapshot-cli.mjs <url-do-app> <pasta-do-projeto>/layers/mock.html [--viewport 1280x760] [--wait 2500] [--state <nome>]
//
// --state <nome> captura o estado da gallery do app (<url-do-app>/gallery.html#/<nome>) em vez da pagina inicial (S2.22b);
// --url <url-do-app> e a forma com flag do primeiro argumento posicional.
//
// Abre o app (dev server que voce ja subiu, so loopback) num Chromium headless separado, roda o
// mesmo tools/layers-snapshot.js do console e grava o mock onde voce mandou. Nada do app roda na
// origem do editor (ADR de 2026-09-18). Depois, no Layers: "Reanalisar do 0".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const EDITOR_PORT = '5180';
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
const USAGE = 'uso: node tools/layers-snapshot-cli.mjs <url-do-app> <saida.html> [--viewport 1280x760] [--wait 2500] [--state <nome>]  (ou --url <url-do-app> <saida.html>)';
const STATE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// So http em loopback e nunca a porta do proprio editor: o alvo e um app que o usuario ja subiu.
export function checkSnapshotUrl(raw) {
  let u;
  try { u = new URL(String(raw || '')); } catch (e) { return { ok: false, reason: 'URL invalida: ' + raw }; }
  if (u.protocol !== 'http:') return { ok: false, reason: 'so http: e aceito (recebido ' + u.protocol + ')' };
  if (!LOOPBACK.has(u.hostname)) return { ok: false, reason: 'so loopback (localhost, 127.0.0.1, [::1]); recebido ' + u.hostname };
  if (u.port === EDITOR_PORT) return { ok: false, reason: 'a porta ' + EDITOR_PORT + ' e a do editor, nao a do app alvo' };
  return { ok: true, url: u.href };
}

// Pagina da gallery do app para um estado: relativa a URL do app, hash de rota '#/<estado>'. Sem estado, a propria URL.
export function snapshotTarget(url, state) {
  if (!state) return url;
  const base = new URL(url);
  if (!base.pathname.endsWith('/')) base.pathname += '/'; // /app -> /app/gallery.html, nao /gallery.html
  return new URL('gallery.html#/' + state, base).href;
}

export function parseSnapshotArgs(argv) {
  const pos = []; let width = 1280, height = 760, waitMs = 2500, state = null, urlFlag = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--viewport') {
      const m = /^(\d{3,5})x(\d{3,5})$/.exec(argv[++i] || '');
      if (!m) return { error: 'viewport deve ser LARGURAxALTURA (ex.: 1280x760)' };
      width = +m[1]; height = +m[2];
    } else if (a === '--wait') {
      const n = Number(argv[++i]);
      if (!Number.isFinite(n) || n < 0 || n > 60000) return { error: '--wait deve ser de 0 a 60000 ms' };
      waitMs = n;
    } else if (a === '--state') {
      state = argv[++i] || '';
      if (!STATE_RE.test(state) || state.includes('..')) return { error: '--state deve ser um nome simples (letras, digitos, . _ -): ' + state };
    } else if (a === '--url') {
      urlFlag = argv[++i];
      if (!urlFlag) return { error: '--url precisa de um valor' };
    } else pos.push(a);
  }
  if (pos.length !== (urlFlag === null ? 2 : 1)) return { error: USAGE };
  const url = urlFlag === null ? pos[0] : urlFlag, out = pos[pos.length - 1];
  if (!/\.html?$/i.test(out)) return { error: 'a saida deve terminar em .html: ' + out };
  return { url, out, width, height, waitMs, state };
}

async function main(argv) {
  const args = parseSnapshotArgs(argv);
  if (args.error) { console.error(args.error); return 2; }
  const chk = checkSnapshotUrl(args.url);
  if (!chk.ok) { console.error(chk.reason); return 2; }
  const outDir = path.dirname(path.resolve(args.out));
  if (!fs.existsSync(outDir)) { console.error('a pasta de saida nao existe: ' + outDir); return 2; }
  const script = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'layers-snapshot.js'), 'utf8');
  let chromium;
  try { ({ chromium } = await import('@playwright/test')); } catch (e) { console.error('Playwright ausente: rode npm install e npx playwright install chromium'); return 2; }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: args.width, height: args.height } });
    // 'load', nao 'networkidle': um dev server com SSE/HMR aberto nunca fica ocioso
    const resp = await page.goto(snapshotTarget(chk.url, args.state), { waitUntil: 'load', timeout: 30000 });
    // gallery inexistente nao pode virar mock: 404 (ou o fallback SPA com status de erro) aborta sem gravar
    if (args.state && resp && !resp.ok()) { console.error('a gallery respondeu ' + resp.status() + ': ' + page.url()); return 2; }
    await page.waitForTimeout(args.waitMs);
    // um redirecionamento do app para fora do loopback (ex.: login SSO) ou para o editor nao vira mock
    const landed = checkSnapshotUrl(page.url());
    if (!landed.ok) { console.error('a pagina terminou em ' + page.url() + ': ' + landed.reason); return 2; }
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(script)]);
    await dl.saveAs(path.resolve(args.out));
  } finally { await browser.close(); }
  const bytes = fs.statSync(path.resolve(args.out)).size;
  console.log('snapshot salvo: ' + path.resolve(args.out) + ' (' + bytes + ' B, viewport ' + args.width + 'x' + args.height + ')');
  console.log('proximo passo: no Layers, "Reanalisar do 0" (o layout atual vai para .design-history/ antes).');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e && e.message || e); process.exit(1); });
}
