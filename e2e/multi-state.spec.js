import { test, expect } from '@playwright/test';

// S2.22b: layers.json › states picks the mock; the Interagir menu switches it and reloads the layers.
const probe = (page) => page.evaluate(() => {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  const b = host && host.shadowRoot.querySelector('#b');
  return b ? { color: getComputedStyle(b).color, extra: !!host.shadowRoot.querySelector('#extra') } : null;
});

test('MultiState_OpensFirstStateAndSwitchesFromTheMenu', async ({ page }) => {
  await page.goto('/?layers=fixtures/multi-state/');
  await expect(page.getByText(/Projeto Multi state/).first()).toBeVisible({ timeout: 15_000 });
  expect(await probe(page)).toEqual({ color: 'rgb(255, 0, 0)', extra: false });
  await page.getByText('Interagir', { exact: false }).first().click();
  await expect(page.getByText('Estado do mock')).toBeVisible();
  await page.getByText('csv-loaded', { exact: true }).click();
  await expect.poll(() => probe(page)).toEqual({ color: 'rgb(0, 0, 255)', extra: true });
});

test('MultiState_ProjectWithoutStates_ShowsNoStateGroup', async ({ page }) => {
  await page.goto('/?layers=fixtures/snap-origin/');
  await expect(page.getByText(/Projeto Snap origin/).first()).toBeVisible({ timeout: 15_000 });
  await page.getByText('Interagir', { exact: false }).first().click();
  await expect(page.getByText('Modo interativo').first()).toBeVisible();
  await expect(page.getByText('Estado do mock')).toHaveCount(0);
});
