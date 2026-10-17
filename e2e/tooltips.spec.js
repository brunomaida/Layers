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
