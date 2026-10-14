import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { connectFixture, selectLayer, readDisk, listDisk } from './folder-helpers.js';

// S5.6: checklist E end to end on a real connected folder (OPFS copy of plain-css): connect, select,
// edit, view the diff, draft, approve, and read the file back. `.card` has one use and no
// box-shadow, so the patch appends one declaration to that rule. Assertions read the folder, never
// the modal log (its wording and the write-log format are not a contract).
const fixture = (rel) => fs.readFileSync(path.resolve('fixtures/plain-css', rel), 'utf8');
const ORIGINAL = fixture('style.css');
const VALUE = '0 0 0 3px rgb(1, 2, 3)';
const DECL = /box-shadow:\s*0 0 0 3px rgb\(1, 2, 3\)/;

const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

async function editCard(page) {
  await connectFixture(page, 'plain-css');
  await selectLayer(page, '.card');
  // single use: no scope chips ("Só este" etc.), the change is auto-decided
  await expect(page.getByText('elemento único — sem irmãos na regra').first()).toBeVisible();
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(VALUE);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
}

async function approveAll(page) {
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Aplicar nos arquivos', { exact: false }).first().click();
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'style.design-draft.css')).toMatch(DECL);
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
}

// Split around the top-level `.card { … }` block (the @media one comes later in the file).
function aroundCard(css) {
  const start = css.indexOf('.card {');
  const end = css.indexOf('}', start) + 1;
  return { before: css.slice(0, start), block: css.slice(start, end), after: css.slice(end) };
}

test('Apply_CardShadowOnConnectedFolder_RewritesOnlyTheRuleWithBakAndHistory', async ({ page }) => {
  await editCard(page);
  expect(await readDisk(page, 'style.css'), 'edits stay in memory until approval').toBe(ORIGINAL);

  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Ver diff', { exact: false }).first().click();
  await expect(page.getByText('1 arquivo(s) · 1 ajuste(s)')).toBeVisible();
  // innermost div holding both the summary and the patched line = the diff modal, not the editor
  const diffModal = page.locator('div')
    .filter({ has: page.getByText('1 arquivo(s) · 1 ajuste(s)') })
    .filter({ hasText: DECL })
    .last();
  await expect(diffModal.getByText(DECL).first()).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).first().click();

  await approveAll(page);

  const now = aroundCard(await readDisk(page, 'style.css'));
  const was = aroundCard(ORIGINAL);
  expect(now.block).toMatch(DECL);
  expect(now.before, 'text before .card untouched').toBe(was.before);
  expect(now.after, 'text after .card untouched (incl. @media .card)').toBe(was.after);

  expect(await readDisk(page, 'style.css.bak'), '.bak keeps the original').toBe(ORIGINAL);
  const hist = await listDisk(page, '.design-history');
  expect(hist).toHaveLength(1);
  expect(hist[0]).toMatch(/^style\.css\./);
  expect(await readDisk(page, '.design-history/' + hist[0])).toBe(ORIGINAL);

  expect(await listDisk(page), 'only .bak and history added; no draft, no .tmp').toEqual(
    ['.design-history', 'index.html', 'layers.json', 'style.css', 'style.css.bak']);
  expect(await readDisk(page, 'index.html'), 'mock untouched').toBe(fixture('index.html'));
  expect(await readDisk(page, 'layers.json'), 'manifest untouched').toBe(fixture('layers.json'));
});
