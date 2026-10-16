import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

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

test('MultiState_ReloadKeepsTheChosenState', async ({ page }) => {
  await page.goto('/?layers=fixtures/multi-state/');
  await expect(page.getByText(/Projeto Multi state/).first()).toBeVisible({ timeout: 15_000 });
  await page.getByText('Interagir', { exact: false }).first().click();
  await page.getByText('csv-loaded', { exact: true }).click();
  await expect.poll(() => probe(page)).toEqual({ color: 'rgb(0, 0, 255)', extra: true });
  await page.reload();
  await expect(page.getByText(/Projeto Multi state/).first()).toBeVisible({ timeout: 15_000 });
  expect(await probe(page)).toEqual({ color: 'rgb(0, 0, 255)', extra: true });
});

test('MultiState_MissingStateMock_ErrorNamesStatesAndReloadRecovers', async ({ page }) => {
  await page.goto('/?layers=fixtures/multi-state/');
  await expect(page.getByText(/Projeto Multi state/).first()).toBeVisible({ timeout: 15_000 });
  await page.getByText('Interagir', { exact: false }).first().click();
  await page.getByText('broken', { exact: true }).click();
  await expect(page.getByText('Mock não encontrado.')).toBeVisible();
  await expect(page.getByText(/estado "broken" em "states"/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Projeto Multi state/).first()).toBeVisible({ timeout: 15_000 });
  expect(await probe(page)).toEqual({ color: 'rgb(255, 0, 0)', extra: false });
});

test('MultiState_SwitchWithUnsavedEdit_AsksBeforeDiscarding', async ({ page }) => {
  await page.goto('/?layers=fixtures/multi-state/');
  await expect(page.getByText(/Projeto Multi state/).first()).toBeVisible({ timeout: 15_000 });
  await readNodes(page);
  await page.locator('[data-node-id]').last().click();
  const field = page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();
  await field.click({ clickCount: 3 });
  await page.keyboard.type('0 0 0 3px rgb(1, 2, 3)');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  await page.getByText('Interagir', { exact: false }).first().click();
  await page.getByText('csv-loaded', { exact: true }).click();
  await expect(page.getByText('Há edições não salvas; trocar de estado descarta todas.')).toBeVisible();
  expect(await probe(page)).toMatchObject({ color: 'rgb(255, 0, 0)', extra: false });
  await page.getByRole('button', { name: 'Trocar' }).click();
  await expect.poll(() => probe(page)).toEqual({ color: 'rgb(0, 0, 255)', extra: true });
});
