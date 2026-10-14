import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S6.2: layers-export.log carries a SHA-256 before -> after per write, and the "after" hash
// matches the file on disk. Only token presence is asserted; the line layout belongs to the unit tests.
const FIXTURE = path.resolve('fixtures/plain-css');
const FILES = ['layers.json', 'index.html', 'style.css'].map((n) => [n, fs.readFileSync(path.join(FIXTURE, n), 'utf8')]);
const SHADOW = '0 0 0 3px rgb(1, 2, 3)';
const SHADOW_2 = '0 0 0 4px rgb(4, 5, 6)';
const sha = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');

async function connect(page) {
  await page.addInitScript(() => {
    window.showDirectoryPicker = async () => window.__proj;
  });
  await page.goto('/');
  await page.evaluate(async (files) => {
    const root = await navigator.storage.getDirectory();
    for (const name of ['proj', 'export']) { try { await root.removeEntry(name, { recursive: true }); } catch (e) { /* first run */ } }
    const dir = await root.getDirectoryHandle('proj', { create: true });
    for (const [name, text] of files) {
      const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
      await w.write(text);
      await w.close();
    }
    window.__proj = dir;
  }, FILES);
  const trigger = page.getByText('Nenhum projeto').first();
  const item = page.getByText(/Conectar pasta/i).first();
  await trigger.click();
  if (!(await item.isVisible())) await trigger.click();
  await item.click();
  await readNodes(page);
}

const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

const readOpfs = (page, dirName, file) => page.evaluate(async ([d, f]) => {
  const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(d);
  return (await (await dir.getFileHandle(f)).getFile()).text();
}, [dirName, file]);

test('ExportLog_AfterDraft_HasSha256MatchingDisk', async ({ page }) => {
  await connect(page);
  await page.locator('[data-node-id][title^=".card"]').first().click();
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(SHADOW);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);

  await page.getByText('Ações ▾').click();
  await page.getByText('Aplicar nos arquivos…').click();
  await page.getByText('1 · Gerar rascunho paralelo').click();
  await expect(page.getByText('rascunho gravado: style.design-draft.css')).toBeVisible();
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('Escape');

  await page.evaluate(async () => {
    window.__proj = await (await navigator.storage.getDirectory()).getDirectoryHandle('export', { create: true });
  });
  await page.getByText('Ações ▾').click();
  await page.getByText('Exportar versões completas…').click();
  await expect(page.getByText(/layers-export\.log \(\d+ gravação/)).toBeVisible();

  const log = await readOpfs(page, 'export', 'layers-export.log');
  const draft = await readOpfs(page, 'proj', 'style.design-draft.css');
  expect(log).toMatch(/sha256 [0-9a-f]{64} -> [0-9a-f]{64}/);
  expect(log).toContain('-> ' + sha(draft));
});

// Overwrite path: a second draft overwrites the first one, so "before" is non-empty and a .bak is made.
// Approve is not used: it clears the pending changes and exportFull then returns early (index.html:1934).
test('ExportLog_AfterRedraft_BeforeHashMatchesBak', async ({ page }) => {
  await connect(page);
  await page.locator('[data-node-id][title^=".card"]').first().click();
  for (const value of [SHADOW, SHADOW_2]) {
    await field(page).click({ clickCount: 3 });
    await page.keyboard.type(value);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    await page.getByText('Ações ▾').click();
    await page.getByText('Aplicar nos arquivos…').click();
    await page.getByText('1 · Gerar rascunho paralelo').click();
    await expect(page.getByText('rascunho gravado: style.design-draft.css').last()).toBeVisible();
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('Escape');
  }

  await page.evaluate(async () => {
    window.__proj = await (await navigator.storage.getDirectory()).getDirectoryHandle('export', { create: true });
  });
  await page.getByText('Ações ▾').click();
  await page.getByText('Exportar versões completas…').click();
  await expect(page.getByText(/layers-export\.log \(\d+ gravação/)).toBeVisible();

  const log = await readOpfs(page, 'export', 'layers-export.log');
  const bak = await readOpfs(page, 'proj', 'style.design-draft.css.bak');
  const draft = await readOpfs(page, 'proj', 'style.design-draft.css');
  expect(log).toContain('sha256 ' + sha(bak) + ' -> ' + sha(draft) + '  .bak guardado');
});
