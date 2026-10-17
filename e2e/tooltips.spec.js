import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S3.3: native `title` of the action buttons comes from LayersCore.tooltip(id) ("Action (K)").
const NAV_IDS = ['orbitLeft', 'panUp', 'orbitRight', 'panLeft', 'frame', 'panRight', 'tiltUp', 'panDown', 'tiltDown', 'zoomOut', 'center', 'zoomIn', 'layerDown', 'resetView', 'layerUp'];

// The console listener goes up before goto: keyRun is built in componentDidMount, during the load.
async function load(page, errors) {
  if (errors) page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?layers=fixtures/plain-css/');
  await readNodes(page);
}

test('Tooltip_NavBtns_NomeiaAcaoEAtalho', async ({ page }) => {
  await load(page);
  const tips = await page.evaluate((ids) => ids.map((id) => LayersCore.tooltip(id)), NAV_IDS);
  expect(new Set(tips).size).toBe(NAV_IDS.length);
  for (const tip of tips) {
    expect(tip).toMatch(/^.+ \(.+\)/);
    await expect(page.locator('button[title="' + tip + '"]:visible').first(), tip).toBeVisible();
  }
});

test('KeyRun_Montagem_SemAcaoSemHandler', async ({ page }) => {
  const errors = [];
  await load(page, errors);
  expect(errors.filter((e) => e.includes('keyRun:'))).toEqual([]);
});

test('Tooltip_TeclaM_AlternaTituloDaMedida', async ({ page }) => {
  await load(page);
  const btn = page.locator('button[title*="(M) — "]');
  await expect(btn).toHaveCount(1);
  const t0 = await btn.getAttribute('title');
  await page.keyboard.press('m');
  await expect.poll(() => btn.getAttribute('title')).not.toBe(t0);
  const t1 = await btn.getAttribute('title');
  expect([t0, t1].map((t) => t.split(' — ')[0]).sort()).toEqual(['Medidas desligadas (M)', 'Medidas ligadas (M)']);
  await page.keyboard.press('m');
  await expect.poll(() => btn.getAttribute('title')).toBe(t0);
});

// Glyph-only (or empty) visible buttons whose effective title is empty. Inside a tree row only the button's own
// title counts (the row title would cover a chevron without one); elsewhere the nearest ancestor title counts
// (header chevrons keep the title of their parent div). Dropdown values ("Todas ▾") are not actions.
function untitledGlyphButtons() {
  const bad = [];
  for (const b of document.querySelectorAll('button')) {
    if (b.offsetParent === null) continue;
    const txt = b.textContent.trim();
    if (!/^[^\p{L}\p{N}]*$/u.test(txt)) continue;
    if (txt.length > 1 && txt.endsWith('▾')) continue;
    const eff = b.closest('[data-node-id]') ? b.title : (b.closest('[title]') || {}).title;
    if (!eff) bad.push(b.outerHTML.slice(0, 80));
  }
  return bad;
}

const sombra = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();
// the × next to Registrar (a toast × with title Fechar can be on screen too)
const repoCancel = (page) => page.getByRole('button', { name: 'Registrar', exact: true }).locator('xpath=following-sibling::button');
const closeBtn = (page) => page.getByRole('button', { name: 'Fechar', exact: true });

test('Tooltip_ControleDeAcao_TemTitleNaoVazio', async ({ page }) => {
  await page.goto('/?layers=fixtures/axai/');
  await readNodes(page);

  // 1. selection with the panel open
  await page.locator('[data-node-id][title^=".sum-stat"]').first().click();
  await page.getByText('Só este', { exact: false }).first().click();
  expect(await page.evaluate(untitledGlyphButtons)).toEqual([]);

  // 2. the ? panel: Close names Esc and Escape closes it
  await page.keyboard.press('?');
  await expect(closeBtn(page)).toHaveAttribute('title', 'Fechar (Esc)');
  expect(await page.evaluate(untitledGlyphButtons)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByText('teclado · mouse · painéis', { exact: false })).toBeHidden();

  // 3. Projetos: register-repository field
  await page.locator('[data-menu="hist"]').click();
  await page.getByText(/Registrar repositório GitHub…/).click();
  await expect(page.getByRole('button', { name: 'Registrar', exact: true })).toHaveAttribute('title', 'Registrar (Enter)');
  await expect(repoCancel(page)).toHaveAttribute('title', 'Cancelar (Esc)');
  expect(await page.evaluate(untitledGlyphButtons)).toEqual([]);
  await repoCancel(page).click();
  await expect(page.getByRole('button', { name: 'Registrar', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');

  // 4. an edit, then the diff and the apply modal
  await sombra(page).click({ clickCount: 3 });
  await page.keyboard.type('0 0 0 3px rgb(1, 2, 3)');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  await page.locator('[data-menu="acoes"]').click();
  await page.getByText(/^Ver diff/).first().click();
  await expect(closeBtn(page)).toHaveAttribute('title', 'Fechar (Esc)');
  expect(await page.evaluate(untitledGlyphButtons)).toEqual([]);
  await closeBtn(page).click();
  await page.locator('[data-menu="acoes"]').click();
  await page.getByText('Aplicar nos arquivos', { exact: false }).first().click();
  await expect(closeBtn(page)).toHaveAttribute('title', 'Fechar (Esc)');
  expect(await page.evaluate(untitledGlyphButtons)).toEqual([]);
  await closeBtn(page).click();
});

test('Tooltip_GatilhoAcoes_TemTituloProprio', async ({ page }) => {
  await load(page);
  const eff = await page.evaluate(() => document.querySelector('button[data-menu="acoes"]').closest('[title]').title);
  expect(eff).toBe('Ver diff · aplicar nos arquivos · exportar — passe o mouse para abrir · clique para fixar');
});
