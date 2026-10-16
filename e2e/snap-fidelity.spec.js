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
  // the capture comment carries a 1200-char URL: the tooltip keeps all of it, up to the viewport
  await expect(page.locator('[data-node-id][title^="#app · snapshot"]').first()).toHaveAttribute('title', /gallery\.html\?pad=x{1200}#\/light .*viewport 600×300/);
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

test('SnapFidelity_RootNameMatchingL0_StaysOnL0', async ({ page }) => {
  await open(page);
  await page.getByText('Interagir', { exact: false }).first().click();
  await page.getByText('self', { exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
    const l0 = host.shadowRoot.querySelector('#app');
    return l0.dataset.name;
  })).toBe('.shell · snapshot');
  const p = await page.evaluate(() => {
    const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
    const l0 = host.shadowRoot.querySelector('#app'), inner = l0.querySelector('.shell');
    return { l0src: l0.dataset.src || null, innerSrc: inner.dataset.src || null };
  });
  expect(p.l0src).toBe('src/app.ts|AppShell|1');
  expect(p.innerSrc).not.toBe('src/app.ts|AppShell|1');
});

test('SnapFidelity_MultiChildBodyWithRules_L0RenamedThenSuffixed', async ({ page }) => {
  await page.goto('/?layers=fixtures/snap-multi/');
  await expect(page.getByText(/Projeto Snap multi/).first()).toBeVisible({ timeout: 15_000 });
  await readNodes(page);
  const name = await page.evaluate(() => {
    const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
    return host.shadowRoot.querySelector('.__layers-root').dataset.name;
  });
  expect(name).toBe('.page · snapshot');
});
