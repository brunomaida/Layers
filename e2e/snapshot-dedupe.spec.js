import { test, expect } from '@playwright/test';
import { connectFixture } from './folder-helpers.js';

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

test('SnapshotMock_TwoCopiesOfTheSameSheet_RealSheetEmittedOnceAtFirstCopy', async ({ page }) => {
  await open(page, 'snap-origin-dup', 'Snap origin dup');
  const css = await page.evaluate(() => {
    const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
    return host.shadowRoot.querySelector('style').textContent;
  });
  expect(css.split('/* css/theme.css */').length - 1).toBe(1);
  // the sheet sits where the first copy was, so the unlisted green block after it wins
  expect(await colorOf(page, 'b')).toBe('rgb(0, 128, 0)');
});

// stale classification: a listed sheet edited on disk after load, read from the banner buttons
const banner = (page) => page.locator('[role=status]', { hasText: 'mudaram no disco' });
async function editThemeAndFocus(page) {
  await page.evaluate(async () => {
    const h = await (await window.__proj.getDirectoryHandle('css')).getFileHandle('theme.css');
    const w = await h.createWritable(); await w.write((await (await h.getFile()).text()) + '/* edited outside */\n'); await w.close();
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(banner(page)).toBeVisible({ timeout: 5000 });
}

test('StaleBanner_LegacyUnlabeledBlobWithRules_OffersRestructure', async ({ page }) => {
  await connectFixture(page, 'snap-origin-legacy');
  await editThemeAndFocus(page);
  await expect(banner(page).getByRole('button', { name: 'Reanalisar do 0' })).toBeVisible();
  await expect(banner(page).getByRole('button', { name: 'Recarregar' })).toHaveCount(0);
});

test('StaleBanner_LabeledSnapshotWithCommentOnlyBlock_OffersPlainReload', async ({ page }) => {
  await connectFixture(page, 'snap-origin-comment');
  await editThemeAndFocus(page);
  await expect(banner(page).getByRole('button', { name: 'Recarregar' })).toBeVisible();
  await expect(banner(page).getByRole('button', { name: 'Reanalisar do 0' })).toHaveCount(0);
});
