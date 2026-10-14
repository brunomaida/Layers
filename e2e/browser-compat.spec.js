import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { readNodes, readTree } from './tree-helpers.js';
import { selectLayer } from './folder-helpers.js';

// S5.7 checklist E: branch on in-page feature detection (as the app does), never on the UA
const SNAP = new URL('./__snapshots__/compat-probes.json', import.meta.url);
const TREE = JSON.parse(fs.readFileSync(new URL('./__snapshots__/tree.json', import.meta.url), 'utf8'));
const update = process.env.UPDATE_SNAPSHOT === '1';
const stored = fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP, 'utf8')) : {};
const fresh = {};

const READ_PATH = ['secureContext', 'fetch', 'domParser', 'shadowDom', 'customElements', 'resizeObserver',
  'indexedDB', 'fontsApi', 'blobUrl', 'cssSupports', 'preserve3d'];
const WRITE_TIER = ['showDirectoryPicker', 'showOpenFilePicker', 'showSaveFilePicker', 'handlePermissions', 'createWritable'];
// installed Chrome/Edge auto-update: compare only the probes the app depends on, not the cosmetic ones
const UNPINNED = new Set(['chrome', 'msedge']);
const pick = (p) => Object.fromEntries([...READ_PATH, ...WRITE_TIER].map((k) => [k, p[k]]));

const VALUE = '0 0 0 3px rgb(1, 2, 3)';
const DECL = /box-shadow:\s*0 0 0 3px rgb\(1, 2, 3\)/;
const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

function probe() {
  const proto = (name, key) => typeof window[name] === 'function' && key in window[name].prototype;
  let deflateRaw = false;
  try { new DecompressionStream('deflate-raw'); deflateRaw = true; } catch (e) { /* unsupported */ }
  return {
    secureContext: window.isSecureContext,
    fetch: typeof fetch === 'function',
    domParser: typeof DOMParser === 'function',
    shadowDom: proto('Element', 'attachShadow'),
    customElements: 'customElements' in window,
    resizeObserver: typeof ResizeObserver === 'function',
    indexedDB: 'indexedDB' in window,
    fontsApi: 'fonts' in document,
    blobUrl: typeof URL.createObjectURL === 'function',
    cssSupports: !!(window.CSS && CSS.supports),
    preserve3d: CSS.supports('transform-style', 'preserve-3d'),
    showDirectoryPicker: 'showDirectoryPicker' in window,
    showOpenFilePicker: 'showOpenFilePicker' in window,
    showSaveFilePicker: 'showSaveFilePicker' in window,
    handlePermissions: proto('FileSystemHandle', 'queryPermission'),
    createWritable: proto('FileSystemFileHandle', 'createWritable'),
    handleMove: proto('FileSystemFileHandle', 'move'),
    opfs: !!(navigator.storage && navigator.storage.getDirectory),
    cryptoDigest: !!(window.crypto && crypto.subtle && crypto.subtle.digest),
    deflateRaw,
    accentColor: CSS.supports('accent-color', 'red'),
    textWrapPretty: CSS.supports('text-wrap', 'pretty'),
  };
}

// aborts any request leaving localhost:5180 and records every URL; later routes (GitHub mock) win
async function guardEgress(page) {
  const seen = [];
  page.on('request', (r) => seen.push(r.url()));
  await page.route(/^https?:\/\/(?!localhost:5180\/)/, (r) => r.abort());
  return seen;
}

// the menu opens on hover and pins on click, so a click can close what hover just opened
async function openProjects(page, itemText) {
  const trigger = page.getByText('Nenhum projeto').first();
  const item = page.getByText(itemText).first();
  await trigger.click();
  if (!(await item.isVisible())) await trigger.click();
  await item.click();
}

// plain-css `.card` has one use (no scope chips) and no box-shadow: the edit is auto-decided.
async function editCard(page, url = '/?layers=fixtures/plain-css/') {
  if (url) await page.goto(url);
  await readNodes(page);
  await selectLayer(page, '.card');
  await expect(page.getByText('elemento único — sem irmãos na regra').first()).toBeVisible();
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(VALUE);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
}

test('Compat_Probes_ReadPathEverywhereWriteTierAllOrNothing', async ({ page, browser }, info) => {
  await page.goto('/');
  const p = await page.evaluate(probe);
  console.log(`[compat] ${info.project.name} ${browser.browserType().name()} ${browser.version()}`);
  for (const k of READ_PATH) expect(p[k], `${info.project.name}: read path needs ${k}`).toBe(true);
  // the app never half-enables writing: with the folder picker present, the whole tier must be there
  if (p.showDirectoryPicker) for (const k of WRITE_TIER) expect(p[k], `${info.project.name}: write tier needs ${k}`).toBe(true);
  fresh[info.project.name] = p;
  const want = stored[info.project.name];
  if (!update && want) {
    if (UNPINNED.has(info.project.name)) expect(pick(p)).toEqual(pick(want));
    else expect(p).toEqual(want);
  }
});

// same DOM as the Chromium snapshot; rootBox is layout (fonts, text metrics), so it is left out
for (const name of Object.keys(TREE)) {
  test(`Compat_${name}_TreeMatchesChromiumSnapshot`, async ({ page, browserName }) => {
    test.skip(browserName === 'chromium', 'Chromium engine (chromium, chrome, msedge): covered by tree-snapshot.spec.js');
    await page.goto(`/?layers=fixtures/${name}/`);
    const { rootBox, ...tree } = await readTree(page);
    const { rootBox: _, ...want } = TREE[name];
    expect(tree, `${name}: same mounted tree as Chromium`).toEqual(want);
  });
}

test('Compat_TravalLoad_NoPageErrorNoEgress', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && /Content.Security.Policy/i.test(m.text())) errors.push(m.text()); });
  // Firefox/WebKit do not always log CSP blocks to the console: catch the DOM event instead
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => (window.__csp = window.__csp || []).push(e.violatedDirective + ' ' + e.blockedURI)));
  const seen = await guardEgress(page);
  await page.goto('/?layers=fixtures/traval/');
  await readNodes(page);
  expect(errors, 'no uncaught error and no CSP violation in the console').toEqual([]);
  expect(await page.evaluate(() => window.__csp || []), 'no securitypolicyviolation event').toEqual([]);
  const foreign = seen.filter((u) => !/^(http:\/\/localhost:5180\/|blob:|data:)/.test(u));
  expect(foreign, 'no request outside localhost:5180 at load').toEqual([]);
});

test('Compat_FixtureEdit_DiffShowsSimulatedPatch', async ({ page }) => {
  await editCard(page);
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Ver diff', { exact: false }).first().click();
  await expect(page.getByText('1 arquivo(s) · 1 ajuste(s)')).toBeVisible();
  await expect(page.getByText('(simulado', { exact: false }).first()).toBeVisible();
  await expect(page.getByText(DECL).first()).toBeVisible();
});

test.afterAll(() => {
  const keys = Object.keys(fresh).filter((k) => update || !stored[k]);
  if (!keys.length) return;
  // one worker per project: merge with what other projects already wrote this run
  const cur = fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP, 'utf8')) : {};
  for (const k of keys) cur[k] = fresh[k];
  const sorted = Object.fromEntries(Object.keys(cur).sort().map((k) => [k, cur[k]]));
  fs.writeFileSync(SNAP, JSON.stringify(sorted, null, 2) + '\n');
});

const HINT_NO_FS = 'Este navegador não grava em disco — use Chrome ou Edge.';
const HINT_FS = 'Conecte a pasta local para gravar.';
const hasFs = (page) => page.evaluate(() => 'showDirectoryPicker' in window);

async function draftAndExport(page) {
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Aplicar nos arquivos', { exact: false }).first().click();
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
}

test('Compat_NoFsAccess_WriteEntryPointsNameTheBrowser', async ({ page }) => {
  await page.goto('/');
  test.skip(await hasFs(page), 'File System Access present: write path covered by apply-flow.spec.js');
  await expect(page.getByText('Este navegador não tem a File System Access API', { exact: false })).toBeVisible();
  await openProjects(page, /Conectar pasta local/);
  await expect(page.getByText('File System Access API indisponível — use Chrome ou Edge', { exact: false })).toBeVisible();
  await openProjects(page, /Abrir arquivo \.zip/);
  await expect(page.getByText('Abrir .zip usa a File System Access API', { exact: false })).toBeVisible();

  await editCard(page);
  await draftAndExport(page);
  await expect(page.getByText(HINT_NO_FS, { exact: false })).toBeVisible();
  await expect(page.getByText(HINT_FS, { exact: false })).toHaveCount(0);
  // the toast lives 4.2 s: close it so the export assertion cannot pass on the draft's toast
  await page.getByTitle('Fechar').click();
  await expect(page.getByText(HINT_NO_FS, { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Exportar versões completas', { exact: false }).first().click();
  await expect(page.getByText(HINT_NO_FS, { exact: false })).toBeVisible();
});

test('Compat_FsAccess_FixtureDraftAsksToConnectFolder', async ({ page }) => {
  await page.goto('/');
  test.skip(!(await hasFs(page)), 'no File System Access: covered by the NoFsAccess test');
  await editCard(page);
  await draftAndExport(page);
  await expect(page.getByText(HINT_FS, { exact: false })).toBeVisible();
});

// serves github.com/acme/demo from a fixture: API for default_branch, raw for the files
async function mockRepo(page, fixture) {
  const root = path.resolve('fixtures', fixture);
  const cors = { 'access-control-allow-origin': '*' };
  await page.route('https://api.github.com/repos/acme/demo', (r) => r.fulfill({ json: { default_branch: 'main' }, headers: cors }));
  await page.route('https://raw.githubusercontent.com/acme/demo/main/**', (r) => {
    const rel = decodeURIComponent(new URL(r.request().url()).pathname.replace('/acme/demo/main/', ''));
    const abs = path.join(root, rel);
    const ok = abs.startsWith(root + path.sep) && fs.existsSync(abs);
    return r.fulfill({ status: ok ? 200 : 404, body: ok ? fs.readFileSync(abs) : '', headers: cors });
  });
}

test('Compat_GithubRepoMocked_LoadsReadOnlyAndRefusesWrite', async ({ page }) => {
  const seen = await guardEgress(page);
  await mockRepo(page, 'plain-css');
  await page.goto('/');
  await openProjects(page, /Registrar repositório GitHub/);
  await page.getByPlaceholder('github.com/usuario/repo').fill('github.com/acme/demo');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Repositório acme/demo registrado.')).toBeVisible();
  // the Projetos menu is still open after addRepo; exact text skips the toast that also says acme/demo
  await page.getByText('acme/demo', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Carregar' }).click();
  await editCard(page, null);
  await draftAndExport(page);
  await expect(page.getByText('Projeto carregado de um repositório remoto, que é somente leitura.', { exact: false })).toBeVisible();
  const hosts = new Set(seen.filter((u) => /^https?:/.test(u)).map((u) => new URL(u).host));
  hosts.delete('localhost:5180');
  expect([...hosts].sort(), 'only the two mocked GitHub hosts').toEqual(['api.github.com', 'raw.githubusercontent.com']);
});

// not an assertion: images for the manual visual review (3D depth, fonts, layout) per engine
test('Compat_TravalOrbit_ScreenshotsForManualReview', async ({ page }, info) => {
  await page.goto('/?layers=fixtures/traval/');
  await readNodes(page);
  await page.screenshot({ path: info.outputPath(`${info.project.name}-traval-default.png`) });
  const c = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) => getComputedStyle(el).backgroundImage.includes('radial-gradient'));
    const b = stage.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 160, c.y - 60, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  await page.screenshot({ path: info.outputPath(`${info.project.name}-traval-orbit.png`) });
});
