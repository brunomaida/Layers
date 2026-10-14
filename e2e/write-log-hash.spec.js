import crypto from 'node:crypto';
import { test, expect } from '@playwright/test';
import { connectFixture, selectLayer } from './folder-helpers.js';

// S6.2: layers-export.log carries a SHA-256 before -> after per write, and the "after" hash
// matches the file on disk. Only token presence is asserted; the line layout belongs to the unit tests.
const SHADOW = '0 0 0 3px rgb(1, 2, 3)';
const SHADOW_2 = '0 0 0 4px rgb(4, 5, 6)';
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

const connect = (page) => connectFixture(page, 'plain-css');

const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

const readOpfs = (page, dirName, file) => page.evaluate(async ([d, f]) => {
  const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(d);
  return (await (await dir.getFileHandle(f)).getFile()).text();
}, [dirName, file]);

// On-disk bytes, not re-encoded text: this is what sha256sum would hash.
const readOpfsBytes = async (page, dirName, file) => Buffer.from(await page.evaluate(async ([d, f]) => {
  const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(d);
  return Array.from(new Uint8Array(await (await (await dir.getFileHandle(f)).getFile()).arrayBuffer()));
}, [dirName, file]));

test('ExportLog_AfterDraft_HasSha256MatchingDisk', async ({ page }) => {
  await connect(page);
  await selectLayer(page, '.card');
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
  const draft = await readOpfsBytes(page, 'proj', 'style.design-draft.css');
  expect(log).toMatch(/sha256 [0-9a-f]{64} -> [0-9a-f]{64}/);
  expect(log).toContain('-> ' + sha(draft));
});

// Overwrite path: a second draft overwrites the first one, so "before" is non-empty and a .bak is made.
// Approve is not used: it clears the pending changes and exportFull then returns early.
test('ExportLog_AfterRedraft_BeforeHashMatchesBak', async ({ page }) => {
  await connect(page);
  await selectLayer(page, '.card');
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
  const bak = await readOpfsBytes(page, 'proj', 'style.design-draft.css.bak');
  const draft = await readOpfsBytes(page, 'proj', 'style.design-draft.css');
  expect(log).toContain('sha256 ' + sha(bak) + ' -> ' + sha(draft) + '  .bak guardado');
});

// Digest unavailable: the write must still happen; only the hashes print '-', byte counts stay.
test('ExportLog_DigestRejects_WriteSucceedsHashesDashed', async ({ page }) => {
  await page.addInitScript(() => {
    crypto.subtle.digest = () => Promise.reject(new Error('digest unavailable'));
  });
  await connect(page);
  await selectLayer(page, '.card');
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

  const draft = await readOpfsBytes(page, 'proj', 'style.design-draft.css');
  expect(draft.toString('utf8')).toContain(SHADOW);
  const log = await readOpfs(page, 'export', 'layers-export.log');
  expect(log).toContain('  style.design-draft.css  0 -> ' + draft.length + ' bytes  sha256 - -> -');
});
