import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S2.17 item 5: the "arquivos mudaram no disco" banner must not cover the left column nor the
// right panel at 1024px. The project is copied into the origin-private file system and handed to the
// app through a stubbed showDirectoryPicker, so the real connected-folder path (mtime watch) runs.
const FIXTURE = path.resolve('fixtures/plain-css');
const FILES = ['layers.json', 'index.html', 'style.css'].map((n) => [n, fs.readFileSync(path.join(FIXTURE, n), 'utf8')]);

async function connect(page) {
  await page.addInitScript(() => {
    window.showDirectoryPicker = async () => window.__proj;
  });
  await page.goto('/');
  await page.evaluate(async (files) => {
    const root = await navigator.storage.getDirectory();
    try { await root.removeEntry('proj', { recursive: true }); } catch (e) { /* first run */ }
    const dir = await root.getDirectoryHandle('proj', { create: true });
    for (const [name, text] of files) {
      const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
      await w.write(text);
      await w.close();
    }
    window.__proj = dir;
  }, FILES);
  // the menu opens on hover and pins on click, so a click can close what hover just opened
  const trigger = page.getByText('Nenhum projeto').first();
  const item = page.getByText(/Conectar pasta/i).first();
  await trigger.click();
  if (!(await item.isVisible())) await trigger.click();
  await item.click();
  await readNodes(page);
}

test('StaleBanner_At1024_DoesNotCoverColumnOrRightPanel', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 700 });
  await connect(page);
  await page.evaluate(async () => {
    const h = await window.__proj.getFileHandle('style.css');
    const text = await (await h.getFile()).text();
    const w = await h.createWritable();
    await w.write(text + '\n/* changed outside LAYERS */\n');
    await w.close();
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  const banner = page.locator('[role=status]', { hasText: 'mudaram no disco' });
  await expect(banner).toBeVisible({ timeout: 5000 });
  const box = await banner.boundingBox();
  const right = await page.locator('div[style*="max-width: 425px"]').first().boundingBox();
  const colRight = 384; // left column at its widest for a 1024px window
  expect(box.x, 'banner starts after the left column').toBeGreaterThanOrEqual(colRight);
  expect(box.x + box.width, 'banner ends before the right panel').toBeLessThanOrEqual(right.x);
});
