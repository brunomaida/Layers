import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S3.4: LayersCore.APPEARANCE_DEFAULTS is the only owner of the appearance defaults; layers/v1/ui overrides it.
// Guard of equivalence: it passes on the old data-props tree and on the new constant, and fails if a fallback breaks.
const seed = (page, ui) => page.addInitScript((u) => {
  if (!u) return;
  localStorage.setItem('layers/v1/meta', JSON.stringify({ schema: 1 }));
  localStorage.setItem('layers/v1/ui', JSON.stringify(u));
}, ui);

async function load(page, ui, url = '/') {
  await seed(page, ui);
  await page.goto(url);
  await page.getByText('Ações ▾').waitFor();
}

const cssVar = (page, name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

async function openApar(page) {
  await page.locator('button[title^="Aparência · Fonte"]').click();
  await expect(page.getByText('Cabeçalho do painel', { exact: true })).toBeVisible();
}

const comboOf = (page, label) => page.locator('xpath=//label[.//span[normalize-space(text())="' + label + '"]]').first().locator('button').first();

// background of every option of the open Tema combo (its dropdown is the button's next sibling), keyed by label
const optionBgs = (page) => comboOf(page, 'Tema').locator('xpath=following-sibling::div').first().evaluate((dd) =>
  Object.fromEntries([...dd.children].map((o) => [o.textContent, getComputedStyle(o).backgroundColor])));
const highlighted = (bgs) => Object.entries(bgs).filter(([, bg]) => bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent').map(([k]) => k);

test('AppearanceDefaults_NoStorage_ResolvesGrafiteCoralMono', async ({ page }) => {
  await load(page, null);
  expect(await cssVar(page, '--bg0')).toBe('#2a2e34');
  expect(await cssVar(page, '--acc')).toBe('#8b96a3');
  expect(await cssVar(page, '--sel')).toBe('#f08c6c');
  expect(await cssVar(page, '--oD')).toBe('#f08c6c');
  expect(await cssVar(page, '--sliderS')).toBe('0.85');
  expect(await cssVar(page, '--fs')).toBe('1');
});

test('AppearanceDefaults_StoredThemeOnly_KeepsDefaultSelectAndOrigin', async ({ page }) => {
  await load(page, { theme: 'Dark' });
  expect(await cssVar(page, '--bg0')).toBe('#0e1116');
  expect(await cssVar(page, '--sel')).toBe('#f08c6c');
  expect(await cssVar(page, '--oD')).toBe('#f08c6c');
  expect(await cssVar(page, '--acc')).toBe('#8b96a3');
});

test('AppearanceDefaults_EmptyUi_MenuLabelsShowDefaults', async ({ page }) => {
  await load(page, {});
  await openApar(page);
  await expect(comboOf(page, 'Tema')).toHaveText(/Gray · 1 Grafite/);
  await expect(comboOf(page, 'Cor de seleção')).toHaveText(/Coral/);
  await expect(comboOf(page, 'Cores de origem')).toHaveText(/Mono · cor de seleção/);
  await expect(comboOf(page, 'Cabeçalho do painel')).toHaveText(/B · Faixas rotuladas/);
  await comboOf(page, 'Tema').click();
  const bgs = await optionBgs(page);
  expect(Object.keys(bgs)).toHaveLength(7);
  expect(highlighted(bgs)).toEqual(['Gray · 1 Grafite']);
});

test('AppearanceDefaults_StoredThemeDark_HighlightsDarkOption', async ({ page }) => {
  await load(page, { theme: 'Dark' });
  await openApar(page);
  await expect(comboOf(page, 'Tema')).toHaveText(/Dark/);
  await comboOf(page, 'Tema').click();
  const bgs = await optionBgs(page);
  expect(Object.keys(bgs)).toHaveLength(7);
  expect(highlighted(bgs)).toEqual(['Dark']);
});

// right-panel header (phA/phB/phC): exclusive markers, only with a project loaded
const PLAIN = '/?layers=fixtures/plain-css/';
// the C badge is the 24px-wide chip; the tree chips and the depth readout of A/B are other L<n> spans
const badge = (page) => page.locator('span[style*="width: 24px"]').filter({ hasText: /^L\d+$/ });
const markers = async (page) => ({
  A: await page.getByText('Aplicar em', { exact: true }).count(),
  B: await page.getByText('Componente', { exact: true }).count(),
  C: await badge(page).count(),
});

test('AppearanceDefaults_NoStorageWithProject_RendersBandedHeader', async ({ page }) => {
  await load(page, null, PLAIN);
  await readNodes(page);
  await expect(page.getByText('Componente', { exact: true }).first()).toBeVisible();
  const m = await markers(page);
  expect(m.A).toBe(0);
  expect(m.C).toBe(0);
});

test('AppearanceDefaults_StoredPanelHeaderA_RendersCardHeader', async ({ page }) => {
  await load(page, { panelHeader: 'A · Cartão' }, PLAIN);
  await readNodes(page);
  await expect(page.getByText('Aplicar em', { exact: true }).first()).toBeVisible();
  expect((await markers(page)).B).toBe(0);
});

test('AppearanceDefaults_StoredPanelHeaderC_RendersCompactHeader', async ({ page }) => {
  await load(page, { panelHeader: 'C · Compacto' }, PLAIN);
  await readNodes(page);
  await expect(badge(page).first()).toBeVisible();
  const m = await markers(page);
  expect(m.A).toBe(0);
  expect(m.B).toBe(0);
});
