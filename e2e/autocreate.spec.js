import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';
import { connectEntries, readDisk } from './folder-helpers.js';
import { act } from './ctx-helpers.js';

// Characterization of autoCreateLayersJson (S9.1b Task 4): the folder-walk refactor must not change what it writes.
// The folder is built inside the test in OPFS (no layers.json) and handed to the app through a stubbed showDirectoryPicker.

// settle:false keeps the old harness behavior: the callers wait for the tree themselves (a skipped-only folder has none)
const connect = (page, files) => connectEntries(page, files, { settle: false });

test('autoCreate_FolderWithHtmlAndCss_WritesMinimalManifest', async ({ page }) => {
  await connect(page, [
    ['index.html', '<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><div class="a"><p>hi</p></div></body></html>'],
    ['style.css', '.a { color: red; }'],
  ]);
  await readNodes(page);
  const raw = await readDisk(page, 'layers.json');
  expect(raw).not.toBeNull();
  expect(JSON.parse(raw)).toEqual({ name: 'proj', viewport: { width: 1280, height: 760 }, mock: 'index.html', styles: ['style.css'] });
});

test('autoCreate_OnlyHtmlUnderSkippedFolder_ReportsNoReadableHtml', async ({ page }) => {
  await connect(page, [['node_modules/x.html', '<!doctype html><html><body><p>x</p></body></html>']]);
  await expect(page.getByText(/nenhum HTML legível/)).toBeVisible();
  expect(await readDisk(page, 'layers.json')).toBeNull();
});

// S9.1b Task 4 fix round: analyzeCoverage honors the loader defaults (mock, base) and the load guard.
const PAGE = '<!doctype html><html><body><div class="a"><p>hi</p></div></body></html>';
const coverageOf = async (page) => {
  await act(page, 'analyzeCoverage');
  await page.waitForFunction(() => window.__logic.state.coverage && window.__logic.state.coverage.status !== 'running');
  return page.evaluate(() => {
    const c = window.__logic.state.coverage;
    return { status: c.status, error: c.error, mono: c.model && c.model.models.mono.mocks, keys: c.model && c.model.regions.map((r) => r.key), suggestion: c.suggestion };
  });
};

test('analyzeCoverage_ManifestWithoutMock_UsesLoaderDefaultMock', async ({ page }) => {
  await connect(page, [['layers.json', '{"name":"x"}'], ['layers/mock.html', PAGE]]);
  await readNodes(page);
  const c = await coverageOf(page);
  expect(c.status).toBe('done');
  expect(c.mono).toEqual(['layers/mock.html']);
  expect(c.suggestion[0].mock).toBe('layers/mock.html');
});

test('analyzeCoverage_ManifestWithBase_IgnoresFilesOutsideBase', async ({ page }) => {
  await connect(page, [['layers.json', '{"name":"x","base":"app","mock":"index.html"}'], ['app/index.html', PAGE], ['other.html', PAGE]]);
  await readNodes(page);
  const c = await coverageOf(page);
  expect(c.status).toBe('done');
  expect(c.keys).toEqual(['app/index.html']);
});

test('analyzeCoverage_BaseWithDotSlash_NormalizesLikeTheLoader', async ({ page }) => {
  await connect(page, [['layers.json', '{"name":"x","base":"./app","mock":"index.html"}'], ['app/index.html', PAGE], ['other.html', PAGE]]);
  await readNodes(page);
  const c = await coverageOf(page);
  expect(c.status).toBe('done');
  expect(c.keys).toEqual(['app/index.html']);
});

test('analyzeCoverage_BaseWithBackslash_NormalizesLikeASlash', async ({ page }) => {
  // The project is loaded straight from a manifest spelling the base with '\': every read goes through safePath, which converts it to '/'.
  await connect(page, [['layers.json', '{"name":"x","base":"app\\\\sub","mock":"index.html"}'], ['app/sub/index.html', PAGE], ['app/other.html', PAGE], ['other.html', PAGE]]);
  await readNodes(page);
  await act(page);
  const c = await coverageOf(page);
  expect(c.error).toBeUndefined();
  expect(c.status).toBe('done');
  expect(c.keys).toEqual(['app/sub/index.html']);
  expect(c.mono).toEqual(['index.html']);
});

test('analyzeCoverage_LoadInFlight_ReportsStillLoading', async ({ page }) => {
  await connect(page, [['layers.json', '{"name":"x","mock":"index.html"}'], ['index.html', PAGE]]);
  await readNodes(page);
  await act(page);
  await page.evaluate(() => { window.__logic.loadSeq++; });
  const c = await coverageOf(page);
  expect(c.status).toBe('error');
  expect(c.error).toBe('projeto ainda carregando');
});
