import { test, expect } from '@playwright/test';

// S2.22e: interactions › attr toggles data-*/aria-* on the mock; other names are refused.
const probe = (page) => page.evaluate(() => {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  const d = host && host.shadowRoot.querySelector('#dock');
  return d ? { dock: d.getAttribute('data-dock'), aria: d.getAttribute('aria-expanded'), onclick: d.getAttribute('onclick'), color: getComputedStyle(d).color } : null;
});

const open = async (page) => {
  await page.goto('/?layers=fixtures/attr-action/');
  await expect(page.getByText(/Projeto Attr action/).first()).toBeVisible({ timeout: 15_000 });
  await page.getByText('Interagir', { exact: false }).first().click();
  await page.getByText('Dock', { exact: true }).click();
  await expect(page.getByText('Esquerda', { exact: true })).toBeVisible();
};

test('AttrAction_ChipWithoutOff_TogglesAttributeAndRestyles', async ({ page }) => {
  await open(page);
  expect(await probe(page)).toMatchObject({ dock: null, color: 'rgb(10, 10, 10)' });
  await page.getByText('Esquerda', { exact: true }).click();
  await expect.poll(() => probe(page)).toMatchObject({ dock: 'left', color: 'rgb(255, 0, 0)' });
  await page.getByText('Esquerda', { exact: true }).click();
  await expect.poll(() => probe(page)).toMatchObject({ dock: null, color: 'rgb(10, 10, 10)' });
});

test('AttrAction_ChipWithOff_AlternatesBetweenTwoValues', async ({ page }) => {
  await open(page);
  await page.getByText('Aberto', { exact: true }).click();
  await expect.poll(() => probe(page)).toMatchObject({ aria: 'true' });
  await page.getByText('Aberto', { exact: true }).click();
  await expect.poll(() => probe(page)).toMatchObject({ aria: 'false' });
});

test('AttrAction_ForbiddenName_ChipIsInertAndMarked', async ({ page }) => {
  await open(page);
  await expect(page.locator('button[title="attr inválido"]')).toHaveCount(1);
  await page.getByText('Inválido', { exact: true }).click();
  expect(await probe(page)).toMatchObject({ onclick: null });
});

test('AttrAction_SelectorWithoutTarget_IsReportedAsDead', async ({ page }) => {
  await page.goto('/?layers=fixtures/attr-action/');
  await expect(page.getByText(/Projeto Attr action/).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/sem alvo no mock.*\.ghost/).first()).toBeVisible();
});
