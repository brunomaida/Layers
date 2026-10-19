import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';
import { act } from './ctx-helpers.js';

// S9.1b Task 5: Projetos ▾ › Analisar cobertura opens the coverage overlay (board S91CoberturaModal).
// The folder is built in OPFS and handed to the app through a stubbed showDirectoryPicker (same harness as autocreate.spec.js).
const MAIN = '<!doctype html><html><body><div id="shell"><header class="top"><p>a</p><p>b</p></header><main class="m"><article><p>c</p></article></main></div></body></html>';
const OTHER = '<!doctype html><html><body><section id="cfg"><ul class="opts"><li>x</li><li>y</li></ul><form class="f"><label>z</label></form></section></body></html>';
const FILES = [['layers.json', '{"name":"Demo","mock":"index.html"}'], ['index.html', MAIN], ['other.html', OTHER]];

async function connect(page, files = FILES) {
  await page.addInitScript(() => {
    window.showDirectoryPicker = async () => window.__proj;
  });
  await page.goto('/');
  await page.evaluate(async (entries) => {
    const root = await navigator.storage.getDirectory();
    try { await root.removeEntry('proj', { recursive: true }); } catch (e) { /* first run */ }
    const dir = await root.getDirectoryHandle('proj', { create: true });
    for (const [rel, text] of entries) {
      const parts = rel.split('/');
      let d = dir;
      for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
      const w = await (await d.getFileHandle(parts[parts.length - 1], { create: true })).createWritable();
      await w.write(text);
      await w.close();
    }
    window.__proj = dir;
  }, files);
  const trigger = page.getByText('Nenhum projeto').first();
  const item = page.getByText(/Conectar pasta/i).first();
  await trigger.click();
  if (!(await item.isVisible())) await trigger.click();
  await item.click();
  await readNodes(page);
  await act(page);
}

async function openCoverage(page) {
  const trig = page.locator('[data-menu="hist"]');
  const item = page.getByText(/Analisar cobertura/);
  await trig.click();
  if (!(await item.isVisible())) await trig.click();
  await item.click();
}

const slowReads = (page) => page.evaluate(() => {
  const l = window.__logic, orig = l.readBytes.bind(l);
  l.readBytes = async (...a) => { await new Promise((r) => setTimeout(r, 700)); return orig(...a); };
});

test('Coverage_MenuItem_NoProject_IsHidden', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByText('Nenhum projeto').first();
  const probe = page.getByText(/Conectar pasta/i).first();
  await trigger.click();
  if (!(await probe.isVisible())) await trigger.click();
  await expect(probe).toBeVisible();
  await expect(page.getByText(/Analisar cobertura/)).toHaveCount(0);
});

test('Coverage_OpenFromMenu_ShowsRunningThenVerdictAndSnippet', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await connect(page);
  await slowReads(page);
  await openCoverage(page);
  await expect(page.getByText('Analisando o projeto…')).toBeVisible();
  await expect(page.getByText('Múltiplos layouts', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Analisando o projeto…')).toHaveCount(0);
  await expect(page.getByText('Trecho layouts', { exact: false }).first()).toBeVisible();
  const pre = page.locator('pre').filter({ hasText: '"layouts"' });
  await expect(pre).toBeVisible();
  const snippet = await page.evaluate(() => window.__logic.state.coverage.snippet);
  await page.getByRole('button', { name: 'Copiar' }).click();
  await expect(page.getByText('Trecho layouts copiado.')).toBeVisible();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip.replace(/\s+/g, '')).toBe(snippet.replace(/\s+/g, '')); // the Windows clipboard pads line ends
});

test('Coverage_Close_EscBackdropAndFechar', async ({ page }) => {
  await connect(page);
  const open = async () => { await openCoverage(page); await expect(page.getByText('Veredito', { exact: true })).toBeVisible(); };
  await open();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Veredito', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.__logic.state.coverage)).toBeNull();
  await open();
  await page.mouse.click(5, 5);
  await expect(page.getByText('Veredito', { exact: true })).toHaveCount(0);
  await open();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByText('Veredito', { exact: true })).toHaveCount(0);
});

test('Coverage_CloseWhileRunning_DiscardsTheResult', async ({ page }) => {
  await connect(page);
  await slowReads(page);
  await openCoverage(page);
  await expect(page.getByText('Analisando o projeto…')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1800);
  expect(await page.evaluate(() => window.__logic.state.coverage)).toBeNull();
  await expect(page.getByText('Veredito', { exact: true })).toHaveCount(0);
});

test('Coverage_OpenOverlay_BlocksReloadShortcut', async ({ page }) => {
  await connect(page);
  await openCoverage(page);
  await expect(page.getByText('Veredito', { exact: true })).toBeVisible();
  const seq = await page.evaluate(() => window.__logic.loadSeq);
  await page.keyboard.press('r');
  await expect(page.getByText('feche o painel aberto antes de recarregar')).toBeVisible();
  expect(await page.evaluate(() => window.__logic.loadSeq)).toBe(seq);
});

test('Coverage_ProjectReloadOrUnload_ResetsStaleResult', async ({ page }) => {
  await connect(page);
  await openCoverage(page);
  await expect(page.getByText('Veredito', { exact: true })).toBeVisible();
  await page.evaluate(() => window.__logic.loadProject());
  await expect(page.getByText('Veredito', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.__logic.state.coverage)).toBeNull();
  await readNodes(page);
  await openCoverage(page);
  await expect(page.getByText('Veredito', { exact: true })).toBeVisible();
  await page.evaluate(() => window.__logic.unloadProject());
  await expect(page.getByText('Veredito', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.__logic.state.coverage)).toBeNull();
});

test('Coverage_MoreThan200Regions_CapsTableAndShowsPlusN', async ({ page }) => {
  await connect(page);
  await page.evaluate(() => {
    const regions = Array.from({ length: 250 }, (_, i) => ({ key: 'p' + i + '.html', kind: 'tela', name: 'p' + i, el: 3, lowConf: i === 0 }));
    const m = (n) => ({ mocks: [], visible: regions.slice(0, n).map((r) => r.key), cobReg: n / 250, cobEl: n / 250, planes: {}, maxPlanes: 10 });
    const model = { regions, models: { mono: m(50), monoStates: m(60), multi: m(240) }, sharedStates: [['p0.html', 'p1.html']], unreadable: ['states/x.html'], estimates: {}, confidence: 'parcial' };
    window.__logic.setState({ coverage: { open: true, status: 'done', model, verdict: { verdict: 'Múltiplos layouts', rule: 3, split: false, gainPp: 72 }, suggestion: [], snippet: '{}', capped: true } });
  });
  await expect(page.getByText('+50 regiões')).toBeVisible();
  await expect(page.getByText('250 detectadas · até 200 linhas')).toBeVisible();
  await expect(page.getByText('p199.html', { exact: true })).toBeVisible();
  await expect(page.getByText('p200.html', { exact: true })).toHaveCount(0);
  await expect(page.getByText('cobertura parcial', { exact: true })).toBeVisible();
  await expect(page.getByText('confiança baixa', { exact: true })).toBeVisible();
  await expect(page.getByText('Varredura parou no teto', { exact: false })).toBeVisible();
  await expect(page.getByText('Mock ilegível, ignorado:', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar' })).toHaveCount(0);
});
