import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S2.22c: <html> theme reaches the host, snapshot roots are labelled, frozen canvases are flagged.
const URL = '/?layers=fixtures/snap-fidelity/';
const open = async (page) => {
  await page.goto(URL);
  await expect(page.getByText(/Projeto Snap fidelity/).first()).toBeVisible({ timeout: 15_000 });
  await readNodes(page);
};
const probe = (page) => page.evaluate(() => {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  const sh = host.shadowRoot, shell = sh.querySelector('.shell'), t = sh.querySelector('.t');
  return {
    theme: host.getAttribute('data-theme'),
    bg: getComputedStyle(shell).backgroundColor,
    textColor: getComputedStyle(t).color,
    underline: getComputedStyle(t).textDecorationLine,
    evil: getComputedStyle(host).getPropertyValue('--evil').trim(),
    l0: sh.querySelector('#app').dataset.name, l1: shell.dataset.name, l1src: shell.dataset.src || null, l0src: sh.querySelector('#app').dataset.src || null,
  };
});

test('SnapFidelity_LightHtml_AppliesThemeToHost', async ({ page }) => {
  await open(page);
  const p = await probe(page);
  expect(p.theme).toBe('light');
  expect(p.textColor).toBe('rgb(18, 52, 86)');
  expect(p.underline).toBe('underline');
  expect(p.bg).toBe('rgb(244, 242, 237)');
  expect(p.evil).toBe('');
});

test('SnapFidelity_RootNames_L0SnapshotAndShellInL1', async ({ page }) => {
  await open(page);
  const p = await probe(page);
  expect(p.l0).toBe('#app · snapshot');
  expect(p.l1).toBe('.shell');
  expect(p.l1src).toBe('src/app.ts|AppShell|1');
  expect(p.l0src).toBeNull();
});

test('SnapFidelity_FrozenCanvas_ShowsImgBadgeWithTitle', async ({ page }) => {
  await open(page);
  const img = page.locator('[data-node-id][title^="img"]').first();
  await expect(img).toContainText('IMG');
  await expect(img).toHaveAttribute('title', /Imagem congelada/);
  await expect(page.locator('[data-node-id][title^="#app · snapshot"]').first()).toHaveAttribute('title', /gallery\.html#\/light/);
});

test('SnapFidelity_SwitchToPlainState_ClearsHostAttrs', async ({ page }) => {
  await open(page);
  expect((await probe(page)).theme).toBe('light');
  await page.getByText('Interagir', { exact: false }).first().click();
  await page.getByText('plain', { exact: true }).click();
  await expect.poll(async () => (await probe(page)).theme).toBeNull();
  const p = await probe(page);
  expect(p.bg).toBe('rgb(16, 17, 20)');
});
