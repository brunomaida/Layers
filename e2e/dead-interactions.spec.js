import { test, expect } from '@playwright/test';

// S2.12: interactions whose selectors match nothing in the mock are reported at load. Traval's
// manifest was written against the real app (spike: 7 of 8 entries dead), so it is the live case;
// plain-css declares none and must stay quiet.
test('DeadInteractions_Traval_WarnsInTheLoadToastAndMarksTheSurface', async ({ page }) => {
  await page.goto('/?layers=fixtures/traval/');
  const toast = page.getByText(/Projeto Traval/).first();
  await expect(toast).toBeVisible({ timeout: 15_000 });
  const text = await toast.innerText();
  expect(text).toMatch(/aviso\(s\)/);
  // the load toast carries only warn[0]; the dead-interactions line is the one that matters here
  await page.getByText('Interagir', { exact: false }).first().click();
  await expect(page.getByText('sem alvo').first()).toBeVisible();
});

test('DeadInteractions_NoManifestInteractions_NoDeadMark', async ({ page }) => {
  await page.goto('/?layers=fixtures/plain-css/');
  await expect(page.getByText(/Projeto CSS puro/).first()).toBeVisible({ timeout: 15_000 });
  await page.getByText('Interagir', { exact: false }).first().click();
  await expect(page.getByText('sem alvo')).toHaveCount(0);
});
