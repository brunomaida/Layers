import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';
import { act, open } from './ctx-helpers.js';

// S9.1b Task 6: coverage analysis end to end (Projetos > Analisar cobertura) over fixtures/coverage-multi and friends.
// Real menu, real folder walk (OPFS handle behind a stubbed showDirectoryPicker); the model is read from state.coverage.
const ID = /^[A-Za-z0-9_-]{1,40}$/;

async function openCoverage(page) {
  const trig = page.locator('[data-menu="hist"]');
  const item = page.getByText(/Analisar cobertura/);
  await trig.click();
  if (!(await item.isVisible())) await trig.click();
  await item.click();
}

const done = async (page) => {
  await expect(page.getByText('Veredito', { exact: true })).toBeVisible();
  return page.evaluate(() => window.__logic.state.coverage);
};

// window.__reads counts the reads that settled: waiting on it replaces a fixed delay.
const slowReads = (page) => page.evaluate(() => {
  const l = window.__logic, orig = l.readBytes.bind(l);
  window.__reads = 0;
  l.readBytes = async (...a) => { try { await new Promise((r) => setTimeout(r, 700)); return await orig(...a); } finally { window.__reads++; } };
});

// Builds `entries` in OPFS and connects it through the same menu path as autocreate.spec.js.
async function connectFiles(page, entries) {
  await page.addInitScript(() => {
    window.showDirectoryPicker = async () => window.__proj;
  });
  await page.goto('/');
  await page.evaluate(async (files) => {
    const root = await navigator.storage.getDirectory();
    try { await root.removeEntry('proj', { recursive: true }); } catch (e) { /* first run */ }
    const dir = await root.getDirectoryHandle('proj', { create: true });
    for (const [rel, text] of files) {
      const parts = rel.split('/');
      let d = dir;
      for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
      const w = await (await d.getFileHandle(parts[parts.length - 1], { create: true })).createWritable();
      await w.write(text);
      await w.close();
    }
    window.__proj = dir;
  }, entries);
  const trigger = page.getByText('Nenhum projeto').first();
  const item = page.getByText(/Conectar pasta/i).first();
  await trigger.click();
  if (!(await item.isVisible())) await trigger.click();
  await item.click();
  await readNodes(page);
  await act(page);
}

const analyze = async (page) => {
  await act(page, 'analyzeCoverage');
  await page.waitForFunction(() => window.__logic.state.coverage && window.__logic.state.coverage.status !== 'running');
  return page.evaluate(() => window.__logic.state.coverage);
};

test('Coverage_Menu_ShowsThreeBarsAndMultiVerdict', async ({ page }) => {
  await open(page, 'coverage-multi');
  await act(page);
  await openCoverage(page);
  const c = await done(page);
  expect(c.verdict).toMatchObject({ verdict: 'Múltiplos layouts', rule: 3, split: false });
  await expect(page.getByText('Monovisual', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Monovisual + states', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Múltiplos layouts', { exact: true })).toHaveCount(2); // third bar + verdict
  await expect(page.getByText('regra 3 · ganho +29 p.p. (≥ 15)', { exact: true })).toBeVisible(); // deterministic fixture: gain 28.57
  const kinds = c.model.regions.map((r) => r.kind);
  for (const k of ['aba', 'diálogo', 'painel']) expect(kinds).toContain(k);
  await expect(page.getByText('Trecho layouts', { exact: false }).first()).toBeVisible();
});

test('Coverage_Suggestion_ListsMissingScreensAndSkipsDocs', async ({ page }) => {
  await open(page, 'coverage-multi');
  await act(page, 'analyzeCoverage');
  await page.waitForFunction(() => window.__logic.state.coverage && window.__logic.state.coverage.status === 'done');
  const c = await page.evaluate(() => window.__logic.state.coverage);
  expect(c.snippet).toContain('config');
  expect(c.snippet).toContain('replay');
  expect(c.snippet).not.toContain('page');
  expect(c.model.regions.map((r) => r.key)).not.toContain('docs/page.html');
  const parsed = JSON.parse(c.snippet);
  expect(parsed.layouts.map((l) => l.mock)).toEqual(['main.html', 'config.html', 'replay.html']);
  for (const l of parsed.layouts) expect(l.id).toMatch(ID);
});

test('Coverage_Copy_PutsSnippetOnClipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, 'coverage-multi');
  await act(page);
  await openCoverage(page);
  const c = await done(page);
  await page.getByRole('button', { name: 'Copiar' }).click();
  await expect(page.getByText('Trecho layouts copiado.')).toBeVisible();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip.replace(/\r\n/g, '\n')).toBe(c.snippet); // the Windows clipboard turns \n into \r\n
});

test('Coverage_SingleScreenFixture_VerdictMonovisual', async ({ page }) => {
  await open(page, 'plain-css');
  await act(page);
  await openCoverage(page);
  const c = await done(page);
  expect(c.model.regions).toHaveLength(1);
  expect(c.model.models.mono.cobReg).toBe(1);
  expect(c.suggestion.length).toBeGreaterThan(0); // a suggestion exists here, so the missing snippet below is the rule's doing
  expect(c.verdict).toMatchObject({ verdict: 'Monovisual', rule: 2 });
  await expect(page.getByText(/^regra 2 · 100% ≥ 85%/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar' })).toHaveCount(0);
});

test('Coverage_HttpFixture_ReportsPartial', async ({ page }) => {
  await page.goto('/?layers=fixtures/multi-layout/');
  await readNodes(page);
  await act(page);
  await openCoverage(page);
  const c = await done(page);
  expect(c.status).toBe('done');
  expect(c.model.confidence).toBe('parcial');
  await expect(page.getByText('cobertura parcial', { exact: true })).toBeVisible();
  await expect(page.getByText('Não foi possível analisar.')).toHaveCount(0);
  // spec decision 6: without a listing only the declared mocks are analyzed, so the model is never empty here
  expect(c.model.regions.length).toBeGreaterThan(0);
  expect(c.verdict.rule).not.toBe(0);
  expect(c.verdict.verdict).not.toBe('Indeterminado');
});

test('Coverage_HttpSingleScreenFixture_VerdictMonovisual', async ({ page }) => {
  await page.goto('/?layers=fixtures/traval/');
  await readNodes(page);
  await act(page);
  await openCoverage(page);
  const c = await done(page);
  expect(c.model.confidence).toBe('parcial');
  expect(c.model.regions.length).toBeGreaterThan(0);
  expect(c.verdict.verdict).toBe('Monovisual');
});

test('Coverage_DeclaredLayouts_SnippetKeepsThemAndAddsTheMissingScreen', async ({ page }) => {
  const other = '<!doctype html><html><body><section id="cfg"><ul class="opts"><li>x</li><li>y</li></ul><form class="f"><label>z</label></form></section></body></html>';
  const third = '<!doctype html><html><body><nav id="nv"><a class="lk">q</a><footer class="ft"><i>r</i></footer></nav></body></html>';
  const layouts = '{"name":"x","layouts":[{"id":"main","mock":"index.html"},{"id":"cfg","mock":"cfg.html"}]}';
  await connectFiles(page, [['layers.json', layouts], ['index.html', PAGE], ['cfg.html', other], ['third.html', third]]);
  const c = await analyze(page);
  expect(c.status).toBe('done');
  // pasting replaces the layouts array, so the snippet carries the declared layouts too
  expect(JSON.parse(c.snippet).layouts.map((l) => l.id)).toEqual(['main', 'cfg', 'third']);
  expect(c.added).toBe(1);
});

test('Coverage_Load_DoesNotScan', async ({ page }) => {
  await open(page, 'coverage-multi');
  await act(page);
  expect(await page.evaluate(() => window.__logic.state.coverage)).toBeNull();
  await expect(page.getByText('Veredito', { exact: true })).toHaveCount(0);
});

test('Coverage_ProjectSwitchDuringScan_DropsResult', async ({ page }) => {
  await open(page, 'coverage-multi');
  await act(page);
  await slowReads(page);
  await openCoverage(page);
  await expect(page.getByText('Analisando o projeto…')).toBeVisible();
  // another folder is connected while the first scan still waits on its mock
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('proj2', { create: true });
    const put = async (name, text) => { const w = await (await dir.getFileHandle(name, { create: true })).createWritable(); await w.write(text); await w.close(); };
    await put('layers.json', '{"name":"Other","mock":"index.html"}');
    await put('index.html', '<!doctype html><html><body><div class="z"><p>z</p></div></body></html>');
    window.showDirectoryPicker = async () => dir;
  });
  await act(page, 'pickDir');
  // the switch landed while the first read was still pending: otherwise the result is dropped for the wrong reason
  expect(await page.evaluate(() => window.__reads)).toBe(0);
  expect(await page.evaluate(() => window.__logic.state.project.name)).toBe('Other');
  await page.waitForFunction(() => window.__reads >= 1); // the old run settled
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); // let its continuation run
  expect(await page.evaluate(() => window.__logic.state.coverage)).toBeNull();
  await expect(page.getByText('Veredito', { exact: true })).toHaveCount(0);
});

// The mounted tree has one more node than the regex estimate when <body> holds several roots: the loader adds a synthetic
// wrapper (index.html, "raiz = único filho do <body> ou um wrapper sintético"). Hence ±25 % or one node, whichever is larger.
const planesOf = async (page, mock) => {
  await openCoverage(page);
  await done(page);
  return page.evaluate((m) => ({ est: window.__logic.state.coverage.model.estimates[m], nodes: window.__logic.state.nodes.length }), mock);
};
const within = ({ est, nodes }) => Math.abs(est - nodes) <= Math.max(1, nodes * 0.25);

test('Coverage_PlanesEstimate_WithinTolerance', async ({ page }) => {
  await page.goto('/?layers=fixtures/multi-layout/');
  await readNodes(page);
  await act(page);
  const p = await planesOf(page, 'layers/main.html'); // two roots under <body>: 2 estimated, 3 mounted
  expect(p.est).toBeGreaterThan(0);
  expect(within(p)).toBe(true);
});

test('Coverage_PlanesEstimate_SingleRootMock_MatchesMountedNodes', async ({ page }) => {
  await open(page, 'coverage-multi');
  await act(page);
  const p = await planesOf(page, 'main.html'); // hidden tabpanel, dialog and #empty are not planes
  expect(p.est).toBe(p.nodes);
});

const PAGE = '<!doctype html><html><body><div class="a"><p>hi</p></div></body></html>';

test('Coverage_EmptyMockName_FallsBackToDefaultMock', async ({ page }) => {
  await connectFiles(page, [['layers.json', '{"name":"x","mock":""}'], ['layers/mock.html', PAGE]]);
  const c = await analyze(page);
  expect(c.status).toBe('done');
  expect(c.model.models.mono.mocks).toEqual(['layers/mock.html']);
});

test('Coverage_ScriptFiles_IgnoreDtsAndHiddenDirsButKeepWellKnown', async ({ page }) => {
  await connectFiles(page, [
    ['layers.json', '{"name":"x","mock":"index.html"}'],
    ['index.html', PAGE],
    ['api.d.ts', 'declare const x: "<dialog>";'],
    ['app.ts', 'const t = "<dialog>";'],
    ['.hidden/h.html', '<!doctype html><html><body><div id="hh"><p>h</p></div></body></html>'],
    ['.well-known/w.html', '<!doctype html><html><body><div id="ww"><p>w</p></div></body></html>'],
  ]);
  const c = await analyze(page);
  expect(c.status).toBe('done');
  expect(c.model.regions.map((r) => r.key).sort()).toEqual(['.well-known/w.html', 'app.ts:dialog', 'index.html']);
});

test('Coverage_MoreThan200ScriptFiles_StopsAtTheCapAndFlagsPartial', async ({ page }) => {
  // every script carries the same marker, so exactly the files past the cap are missing from the model (whichever the walk reaches last)
  const scripts = Array.from({ length: 201 }, (_, i) => ['s/f' + i + '.js', 'var a = "<dialog>"; // ' + i]);
  await connectFiles(page, [['layers.json', '{"name":"x","mock":"index.html"}'], ['index.html', PAGE], ...scripts]);
  const c = await analyze(page);
  expect(c.status).toBe('done');
  expect(c.capped).toBe(true);
  expect(c.model.regions.filter((r) => r.key.startsWith('s/f') && r.kind === 'diálogo')).toHaveLength(200);
  await expect(page.getByText('cobertura parcial', { exact: true })).toBeVisible();
  await expect(page.getByText('Varredura parcial: arquivos ou tamanho acima dos tetos', { exact: false })).toBeVisible();
});
