import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';
import { readDisk } from './folder-helpers.js';

// Characterization of autoCreateLayersJson (S9.1b Task 4): the folder-walk refactor must not change what it writes.
// The folder is built inside the test in OPFS (no layers.json) and handed to the app through a stubbed showDirectoryPicker.

async function connect(page, files) {
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
}

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
