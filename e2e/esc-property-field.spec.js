import { test, expect } from '@playwright/test';
import { connectFixture, selectLayer } from './folder-helpers.js';

// S3.6 (#73): Esc in a property field discards the typed value and leaves the field; Enter and blur
// still apply it. `.card` has no box-shadow, so "Sombra" starts at its computed default and a
// committed edit shows up as one entry in the Ajustes counter.
const VALUE = '0 0 0 3px rgb(1, 2, 3)';
const OTHER = '0 0 0 5px rgb(4, 5, 6)';
// an applied value comes back as the computed style
const VALUE_COMPUTED = 'rgb(1, 2, 3) 0px 0px 0px 3px';
const OTHER_COMPUTED = 'rgb(4, 5, 6) 0px 0px 0px 5px';

const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();
const counter = (page) => page.locator('span', { hasText: /^Ajustes$/ }).first().locator('xpath=following-sibling::span[1]');

async function typeInto(page, value) {
  const f = field(page);
  await f.click({ clickCount: 3 });
  await page.keyboard.type(value);
}

test.beforeEach(async ({ page }) => {
  await connectFixture(page, 'plain-css');
  await selectLayer(page, '.card');
  await expect(page.getByText('elemento único — sem irmãos na regra').first()).toBeVisible();
  await expect(counter(page)).toHaveText('0');
});

test('EscPropertyField_ValorDigitado_Descartado', async ({ page }) => {
  const before = await field(page).inputValue();
  await typeInto(page, VALUE);
  await expect(field(page)).toHaveValue(VALUE);
  await page.keyboard.press('Escape');
  await expect(field(page)).not.toBeFocused();
  await expect(field(page)).toHaveValue(before);
  await page.waitForTimeout(300);
  await expect(counter(page)).toHaveText('0');
});

test('EnterPropertyField_ValorDigitado_Aplicado', async ({ page }) => {
  await typeInto(page, VALUE);
  await page.keyboard.press('Enter');
  await expect(field(page)).not.toBeFocused();
  await expect(counter(page)).toHaveText('1');
  await expect(field(page)).toHaveValue(VALUE_COMPUTED);
});

test('BlurPropertyField_ValorDigitado_Aplicado', async ({ page }) => {
  await typeInto(page, VALUE);
  await page.keyboard.press('Tab');
  await expect(counter(page)).toHaveText('1');
  await expect(field(page)).toHaveValue(VALUE_COMPUTED);
});

test('EscDepoisDeEnter_NaoReverte', async ({ page }) => {
  await typeInto(page, VALUE);
  await page.keyboard.press('Enter');
  await expect(counter(page)).toHaveText('1');
  await field(page).focus();
  await page.keyboard.press('Escape');
  await expect(field(page)).not.toBeFocused();
  await page.waitForTimeout(300);
  await expect(counter(page)).toHaveText('1');
  await expect(field(page)).toHaveValue(VALUE_COMPUTED);
});

test('EscSemAlteracao_DepoisEnterNoMesmoCampo_Aplica', async ({ page }) => {
  await field(page).focus();
  await page.keyboard.press('Escape');
  await expect(field(page)).not.toBeFocused();
  await typeInto(page, OTHER);
  await page.keyboard.press('Enter');
  await expect(counter(page)).toHaveText('1');
  await expect(field(page)).toHaveValue(OTHER_COMPUTED);
});
