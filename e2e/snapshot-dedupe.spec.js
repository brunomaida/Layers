import { test, expect } from '@playwright/test';

// S2.22a: a snapshot <style> copy of a listed sheet must not mask the real sheet; copies
// without data-layers-origin (old snapshots) keep the legacy behavior.
const colorOfB = (page) => page.evaluate(() => {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  return getComputedStyle(host.shadowRoot.querySelector('#b')).color;
});

test('SnapshotMock_CopyOfListedSheet_RealSheetWins', async ({ page }) => {
  await page.goto('/?layers=fixtures/snap-origin/');
  await expect(page.getByText(/Projeto Snap origin/).first()).toBeVisible({ timeout: 15_000 });
  expect(await colorOfB(page)).toBe('rgb(0, 0, 255)');
});

test('SnapshotMock_CopyWithoutOrigin_KeepsLegacyBehavior', async ({ page }) => {
  await page.goto('/?layers=fixtures/snap-origin-legacy/');
  await expect(page.getByText(/Projeto Snap origin legacy/).first()).toBeVisible({ timeout: 15_000 });
  expect(await colorOfB(page)).toBe('rgb(255, 0, 0)');
});
