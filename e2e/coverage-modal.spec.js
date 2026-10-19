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

// window.__reads counts the reads that settled: the tests wait on it instead of on a fixed delay.
const slowReads = (page) => page.evaluate(() => {
  const l = window.__logic, orig = l.readBytes.bind(l);
  window.__reads = 0;
  l.readBytes = async (...a) => { try { await new Promise((r) => setTimeout(r, 700)); return await orig(...a); } finally { window.__reads++; } };
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

test('Coverage_TemplateData_IsSharedWhenClosedAndCachedPerResult', async ({ page }) => {
  await connect(page);
  const closed = await page.evaluate(() => { const l = window.__logic; return { same: l.covVals() === l.covVals(), frozen: Object.isFrozen(l.covVals()), open: l.covVals().covOpen }; });
  expect(closed).toEqual({ same: true, frozen: true, open: false });
  await openCoverage(page);
  await expect(page.getByText('Veredito', { exact: true })).toBeVisible();
  const done = await page.evaluate(() => { const l = window.__logic, a = l.covVals(), b = l.covVals(); return { same: a === b, rows: a.covRows.length }; });
  expect(done.same).toBe(true);
  expect(done.rows).toBeGreaterThan(0);
  // a new result (new coverage object) must not serve the cached values of the previous one
  await page.evaluate(() => { const l = window.__logic; window.__before = l.covVals(); l.setState({ coverage: { ...l.state.coverage } }); });
  await expect.poll(() => page.evaluate(() => window.__logic.covVals() !== window.__before)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByText('Veredito', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => { const l = window.__logic; return l.covVals() === l.covVals() && Object.isFrozen(l.covVals()); })).toBe(true);
});

test('Coverage_Close_EscBackdropAndFechar',async ({ page }) => {
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
  await page.waitForFunction(() => window.__reads >= 1); // the in-flight run reached its end after Escape
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); // let its continuation run
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

// Synthetic results (same technique as the 250-regions test): the verdict copy is a pure function of the state.
const synth = (page, { n = 3, mono, monoStates = mono, multi, verdict, suggestion = [], snippet = '{}' }) => page.evaluate(({ n, mono, monoStates, multi, verdict, suggestion, snippet }) => {
  const regions = Array.from({ length: n }, (_, i) => ({ key: 'p' + i + '.html', kind: 'tela', name: 'p' + i, el: 3, lowConf: false }));
  const m = (x, planes) => ({ mocks: [], visible: regions.slice(0, Math.round(x * n)).map((r) => r.key), cobReg: n ? x : null, cobEl: n ? x : null, planes: {}, maxPlanes: planes });
  const model = { regions, models: { mono: m(mono[0], mono[1]), monoStates: m(monoStates[0], monoStates[1]), multi: m(multi[0], multi[1]) }, sharedStates: [], unreadable: [], estimates: {}, confidence: 'ok' };
  window.__logic.setState({ coverage: { open: true, status: 'done', model, verdict, suggestion, snippet, capped: false } });
}, { n, mono, monoStates, multi, verdict, suggestion, snippet });

test('Coverage_Error_ShowsMessageWithoutBarsOrSnippet', async ({ page }) => {
  await connect(page);
  await page.evaluate(() => window.__logic.setState({ coverage: { open: true, status: 'error', error: 'Permissão de leitura da pasta negada.' } }));
  await expect(page.getByText('Não foi possível analisar.')).toBeVisible();
  await expect(page.getByText('Permissão de leitura da pasta negada.')).toBeVisible();
  await expect(page.getByText('Veredito', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Monovisual', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copiar' })).toHaveCount(0);
});

test('Coverage_Rule0_ShowsRegionCountOnlyAndNoSnippet', async ({ page }) => {
  await connect(page);
  await synth(page, { n: 0, mono: [0, 0], multi: [0, 0], verdict: { verdict: 'Indeterminado', rule: 0, split: false, gainPp: 0 } });
  await expect(page.getByText('0 regiões', { exact: true })).toBeVisible(); // board: no project name beside the count
  await expect(page.getByText('Demo · 0 regiões')).toHaveCount(0);
  await expect(page.getByText('Indeterminado', { exact: true })).toBeVisible();
  await expect(page.getByText('regra 0 · nenhuma região detectada')).toBeVisible();
  await expect(page.getByText('Tabela vazia: docs/', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar' })).toHaveCount(0);
});

test('Coverage_Rule2_ShowsMonovisualCopyAndNoSnippet', async ({ page }) => {
  await connect(page);
  await synth(page, { n: 20, mono: [0.8, 10], monoStates: [0.9, 640], multi: [0.95, 700], verdict: { verdict: 'Monovisual', rule: 2, split: false, gainPp: 5 } });
  await expect(page.getByText('Demo · 20 regiões')).toBeVisible();
  await expect(page.getByText('regra 2 · 90% ≥ 85% e 640 ≤ 1.500 planos')).toBeVisible();
  await expect(page.getByText('Sem trecho layouts nem Copiar', { exact: false })).toBeVisible();
  await expect(page.getByText('dividir', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copiar' })).toHaveCount(0);
});

test('Coverage_Rule4_ShowsSplitTagAndPlanesCopy', async ({ page }) => {
  await connect(page);
  await synth(page, { n: 20, mono: [0.9, 1600], multi: [1, 1600], verdict: { verdict: 'Múltiplos layouts', rule: 4, split: true, gainPp: 10 }, suggestion: [{ id: 'main', name: 'Main', mock: 'index.html' }], snippet: '{"layouts":[]}' });
  await expect(page.getByText('dividir', { exact: true })).toBeVisible();
  await expect(page.getByText('regra 4 · 1.600 planos (> 1.500)')).toBeVisible();
  await expect(page.getByText('Cobertura 90% ≥ 85%, mas um layout passa do limite do orbit.')).toBeVisible();
});

test('Coverage_MultiVerdictWithoutSuggestion_HidesSnippetAndCopy', async ({ page }) => {
  await connect(page);
  await synth(page, { n: 20, mono: [0.5, 10], multi: [0.9, 20], verdict: { verdict: 'Múltiplos layouts', rule: 3, split: false, gainPp: 40 }, suggestion: [] });
  await expect(page.getByText('Múltiplos layouts', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Trecho layouts', { exact: false })).toHaveCount(0);
  await expect(page.locator('pre')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copiar' })).toHaveCount(0);
});

test('Coverage_Rule3Copy_NeverContradictsTheStrictComparison', async ({ page }) => {
  await connect(page);
  // gain 14.6 p.p. is below the 15 p.p. minimum: the copy must not round it up to "+15 (< 15)"
  await synth(page, { n: 1000, mono: [0.6, 10], multi: [0.746, 20], verdict: { verdict: 'Monovisual (layouts não ajudam)', rule: 3, split: false, gainPp: 14.6 } });
  await expect(page.getByText('regra 3 · ganho +14 p.p. (< 15)')).toBeVisible();
  // best monovisual 84.6% is below 85%: the copy must not read "85% < 85%"
  await synth(page, { n: 1000, mono: [0.846, 10], multi: [1, 20], verdict: { verdict: 'Múltiplos layouts', rule: 3, split: false, gainPp: 15.4 }, suggestion: [{ id: 'x', name: 'X', mock: 'x.html' }] });
  await expect(page.getByText('regra 3 · ganho +15 p.p. (≥ 15)')).toBeVisible();
  await expect(page.getByText('Melhor monovisual 84% < 85%; layouts somam 15 p.p.')).toBeVisible();
});
