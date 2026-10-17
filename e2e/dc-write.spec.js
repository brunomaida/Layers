import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { test, expect } from '@playwright/test';
import { connectFixture, selectLayer, readDisk, listDisk } from './folder-helpers.js';

// S2.18: the dc template write path (`dcSource` -> patchDc -> patchAttrAt) end to end on an OPFS copy
// of fixtures/dc-template, the same createWritable/getFileHandle path as a real folder. The proof is
// always the content of index.html on disk, never a toast: a refusal must leave the bytes untouched.
const ORIGINAL = fs.readFileSync(path.resolve('fixtures/dc-template/index.html'), 'utf8');
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const DRAFT = 'index.design-draft.html';

// Number input of a property row on the selected element (the row title varies with where the value is declared).
const field = (page, label) => page.locator(`xpath=//*[normalize-space(text())="${label}"]/ancestor::*[.//input[@type="number"]][1]//input[@type="number"]`).first();

async function setProp(page, label, value) {
  const input = field(page, label);
  await input.click({ clickCount: 3 });
  await page.keyboard.type(value);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
}

async function openApply(page) {
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Aplicar nos arquivos', { exact: false }).first().click();
}

// Overwrites a root file in the connected folder from outside the app.
function writeDisk(page, rel, text) {
  return page.evaluate(async ([rel, text]) => {
    const w = await (await window.__proj.getFileHandle(rel)).createWritable();
    await w.write(text);
    await w.close();
  }, [rel, text]);
}

test('DcWrite_EditarEstiloInline_GravaSoOAtributo', async ({ page }) => {
  await connectFixture(page, 'dc-template');
  await selectLayer(page, 'h1');
  await expect(page.locator('[title="Declarada na regra tpl:3 (index.html)"]').first()).toBeVisible();
  await setProp(page, 'Tamanho', '22');
  expect(await readDisk(page, 'index.html'), 'edits stay in memory until approval').toBe(ORIGINAL);

  await openApply(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, DRAFT)).not.toBeNull();
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();

  const expected = ORIGINAL.replace('style="font-size:20px;margin:0"', 'style="font-size:22px;margin:0"');
  expect(expected, 'fixture still has the target attribute').not.toBe(ORIGINAL);
  await expect.poll(() => readDisk(page, 'index.html')).toBe(expected);

  const hist = await listDisk(page, '.design-history');
  expect(hist).toHaveLength(1);
  expect(hist[0]).toMatch(/^index\.html\./);
  expect(await readDisk(page, '.design-history/' + hist[0])).toBe(ORIGINAL);

  expect(await readDisk(page, 'index.html.bak'), '.bak keeps the original').toBe(ORIGINAL);
  expect(await listDisk(page), 'only .bak and history added; draft promoted').toEqual(['.design-history', 'index.html', 'index.html.bak', 'layers', 'layers.json']);
  expect(await readDisk(page, 'layers/mock.html'), 'mock untouched').toBe(fs.readFileSync(path.resolve('fixtures/dc-template/layers/mock.html'), 'utf8'));
});

test('DcWrite_ValorComBinding_RecusaSemTocarOArquivo', async ({ page }) => {
  await connectFixture(page, 'dc-template');
  await selectLayer(page, 'button');
  // the button is `padding:{{ pad }}px` in the source: the mock shows 6px, the file has a binding
  await setProp(page, 'Padding', '9');

  await openApply(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect(page.getByText(/VALUE_HAS_BINDING/).first()).toBeVisible();
  expect(await readDisk(page, DRAFT), 'no draft for a refused edit').toBeNull();
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();

  expect(sha(await readDisk(page, 'index.html'))).toBe(sha(ORIGINAL));
  expect(await listDisk(page), 'nothing written: no history, no draft').toEqual(['index.html', 'layers', 'layers.json']);
});

test('DcWrite_ArquivoMudouNoDisco_RecusaSourceChanged', async ({ page }) => {
  await connectFixture(page, 'dc-template');
  await selectLayer(page, 'h1');
  await setProp(page, 'Tamanho', '22');
  // outside edit lands before "Gerar rascunho" so the refusal is SOURCE_CHANGED, not the later "file changed after the draft" guard
  // someone else edits the same declaration after the project was loaded
  const outside = ORIGINAL.replace('font-size:20px;margin:0', 'font-size:30px;margin:0');
  expect(outside).not.toBe(ORIGINAL);
  await writeDisk(page, 'index.html', outside);

  await openApply(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect(page.getByText(/SOURCE_CHANGED/).first()).toBeVisible();
  expect(await readDisk(page, DRAFT), 'no draft for a refused edit').toBeNull();
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();

  expect(await readDisk(page, 'index.html'), 'the outside edit survives untouched').toBe(outside);
  expect(await listDisk(page), 'nothing written: no history, no draft').toEqual(['index.html', 'layers', 'layers.json']);
});

test('DcWrite_SemStyleInline_RecusaSemTocarOArquivo', async ({ page }) => {
  await connectFixture(page, 'dc-template');
  await selectLayer(page, 'span');
  // `<span>no inline style</span>` has no style="" in the source: the value comes from the browser default
  await setProp(page, 'Tamanho', '22');

  await openApply(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect(page.getByText(/NO_INLINE_STYLE/).first()).toBeVisible();
  expect(await readDisk(page, DRAFT), 'no draft for a refused edit').toBeNull();
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();

  expect(sha(await readDisk(page, 'index.html'))).toBe(sha(ORIGINAL));
  expect(await listDisk(page), 'nothing written: no .bak, no history, no draft').toEqual(['index.html', 'layers', 'layers.json']);
});
