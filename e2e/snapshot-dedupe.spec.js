import { test, expect } from '@playwright/test';

// S2.22a: a snapshot <style> copy of a listed sheet must not mask the real sheet; copies
// without data-layers-origin (old snapshots) keep the legacy behavior.
const colorOf = (page, id) => page.evaluate((i) => {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  return getComputedStyle(host.shadowRoot.querySelector('#' + i)).color;
}, id);
const open = async (page, fixture, name) => {
  await page.goto('/?layers=fixtures/' + fixture + '/');
  const toast = page.getByText(new RegExp('Projeto ' + name)).first();
  await expect(toast).toBeVisible({ timeout: 15_000 });
  return toast;
};

test('SnapshotMock_CopyOfListedSheet_RealSheetWins', async ({ page }) => {
  await open(page, 'snap-origin', 'Snap origin');
  expect(await colorOf(page, 'b')).toBe('rgb(0, 0, 255)');
});

test('SnapshotMock_CopyWithoutOrigin_KeepsLegacyBehavior', async ({ page }) => {
  const toast = await open(page, 'snap-origin-legacy', 'Snap origin legacy');
  await expect(toast).toContainText('1 folha(s)');
  expect(await colorOf(page, 'b')).toBe('rgb(255, 0, 0)');
});

test('SnapshotMock_ListedSheetUnreadable_CopyKeepsApplying', async ({ page }) => {
  await open(page, 'snap-origin-missing', 'Snap origin missing');
  expect(await colorOf(page, 'b')).toBe('rgb(255, 0, 0)');
});

test('SnapshotMock_ProjectWithBase_CopyOfListedSheetStillDeduped', async ({ page }) => {
  await open(page, 'snap-origin-base', 'Snap origin base');
  expect(await colorOf(page, 'b')).toBe('rgb(0, 0, 255)');
});

test('SnapshotMock_UnlistedSheetBeforeListedCopy_KeepsMockCascadeOrder', async ({ page }) => {
  await open(page, 'snap-origin-order', 'Snap origin order');
  expect(await colorOf(page, 'b')).toBe('rgb(0, 0, 255)');
  expect(await colorOf(page, 'k')).toBe('rgb(0, 128, 0)');
});
