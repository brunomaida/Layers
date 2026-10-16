import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S2.21: a TS/JS source cited in data-src that is newer than the mock means the shown layout is stale.
// The project lives in the origin-private file system and reaches the app through a stubbed
// showDirectoryPicker, so the real connected-folder path (mtime probe, backup write) runs.
const SHELL_TS = 'export const shell = () => document.createElement("div");\n';
const MOCK = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div class="shell" data-src="src/ui/shell.ts|.shell|3" style="width:400px;height:300px;background:#123">
  <div class="bar" data-src="src/ui/shell.ts|.bar|9" style="height:40px;background:#345">bar</div>
  <div class="body" style="height:200px;background:#456">body</div>
</div></body></html>
`;
const FILES = [
  ['layers.json', JSON.stringify({ name: 'Drift', viewport: { width: 400, height: 300 }, mock: 'layers/mock.html' })],
  ['layers/mock.html', MOCK],
  ['src/ui/shell.ts', SHELL_TS],
];

async function connect(page, { newest = 'src/ui/shell.ts' } = {}) {
  await page.addInitScript(() => {
    window.showDirectoryPicker = async () => window.__proj;
  });
  await page.goto('/');
  await page.evaluate(async ({ files, newest }) => {
    const root = await navigator.storage.getDirectory();
    try { await root.removeEntry('proj', { recursive: true }); } catch (e) { /* first run */ }
    const dir = await root.getDirectoryHandle('proj', { create: true });
    const put = async (rel, text) => {
      const parts = rel.split('/'); let d = dir;
      for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
      const w = await (await d.getFileHandle(parts[parts.length - 1], { create: true })).createWritable();
      await w.write(text); await w.close();
    };
    for (const [rel, text] of files) await put(rel, text);
    window.__proj = dir;
    if (!newest) return;
    // two writes can land in the same millisecond: rewrite `newest` until its mtime is strictly the newer one
    const mtime = async (rel) => {
      let d = dir; const parts = rel.split('/');
      for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p);
      return (await (await d.getFileHandle(parts[parts.length - 1])).getFile()).lastModified;
    };
    const other = newest === 'layers/mock.html' ? 'src/ui/shell.ts' : 'layers/mock.html';
    const text = files.find(([rel]) => rel === newest)[1];
    for (let i = 0; i < 20 && (await mtime(newest)) <= (await mtime(other)); i++) {
      await new Promise((r) => setTimeout(r, 25));
      await put(newest, text);
    }
  }, { files: FILES, newest });
  // the menu opens on hover and pins on click, so a click can close what hover just opened
  const trigger = page.getByText('Nenhum projeto').first();
  const item = page.getByText(/Conectar pasta/i).first();
  await trigger.click();
  // cold start: the first click can land before the app wires the menu, so wait for the item and retry once
  if (!(await item.waitFor({ state: 'visible', timeout: 2000 }).then(() => true, () => false))) await trigger.click();
  await item.click();
  await readNodes(page);
}

const banner = (page) => page.locator('[role=status]', { hasText: /Mock mais antigo|mudaram no disco/ });

test('LayoutDrift_SourceNewerThanMock_ShowsRestructureBanner', async ({ page }) => {
  await connect(page);
  await expect(banner(page)).toContainText('Mock mais antigo que a fonte: src/ui/shell.ts', { timeout: 5000 });
  await expect(banner(page).getByRole('button', { name: 'Reanalisar do 0' })).toBeVisible();
  await expect(banner(page).getByRole('button', { name: 'Recarregar' })).toHaveCount(0);
});

test('LayoutDrift_MockNewerThanSource_ShowsNoBanner', async ({ page }) => {
  await connect(page, { newest: 'layers/mock.html' });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(800);
  await expect(banner(page)).toHaveCount(0);
});

test('StaleBanner_CitedSourceEditedAfterLoad_OffersRestructure', async ({ page }) => {
  await connect(page, { newest: 'layers/mock.html' });
  await page.evaluate(async () => {
    const d = await (await window.__proj.getDirectoryHandle('src')).getDirectoryHandle('ui');
    const h = await d.getFileHandle('shell.ts');
    const w = await h.createWritable(); await w.write((await (await h.getFile()).text()) + '// edited\n'); await w.close();
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(banner(page)).toContainText('mudaram no disco', { timeout: 5000 });
  await expect(banner(page).getByRole('button', { name: 'Reanalisar do 0' })).toBeVisible();
});

// rewrites the mock on disk with one more element, as a regenerated snapshot would
const NEW_MOCK = MOCK.replace('</div></body>', '  <div class="extra" style="height:20px;background:#789">extra</div>\n</div></body>');
async function replaceMockOnDisk(page, text) {
  await page.evaluate(async (next) => {
    const h = await (await window.__proj.getDirectoryHandle('layers')).getFileHandle('mock.html');
    const w = await h.createWritable(); await w.write(next); await w.close();
  }, text);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(banner(page)).toContainText('mudaram no disco', { timeout: 5000 });
}
const nodeCount = async (page) => (await readNodes(page)).els.length;

test('Restructure_Confirmed_BacksUpLayoutAndReloadsFromZero', async ({ page }) => {
  await connect(page);
  const before = await nodeCount(page);
  await replaceMockOnDisk(page, NEW_MOCK);
  await banner(page).getByRole('button', { name: 'Reanalisar do 0' }).click();
  await page.getByRole('button', { name: 'Reanalisar', exact: true }).click();
  const readSaved = () => page.evaluate(async () => {
    const out = {};
    try {
      const hist = await window.__proj.getDirectoryHandle('.design-history');
      for await (const [name, h] of hist.entries()) {
        if (!/^layout-/.test(name) || h.kind !== 'directory') continue;
        for await (const [f, fh] of h.entries()) if (!/\.(bak|tmp)$/.test(f)) out[name + '/' + f] = await (await fh.getFile()).text();
      }
    } catch (e) { /* not written yet */ }
    return out;
  });
  await expect.poll(async () => Object.keys(await readSaved()).length, { timeout: 10000 }).toBe(2);
  const saved = await readSaved();
  const names = Object.keys(saved);
  expect(names.some((n) => n.endsWith('/layers.json'))).toBe(true);
  expect(names.some((n) => n.endsWith('/mock.html'))).toBe(true);
  expect(Object.values(saved).some((t) => t.includes('data-src="src/ui/shell.ts|.shell|3"'))).toBe(true);
  expect(Object.values(saved).some((t) => t.includes('"name":"Drift"'))).toBe(true);
  expect(Object.values(saved).every((t) => !t.includes('class="extra"')), 'the backup is the layout that was loaded, not the new disk file').toBe(true);
  await expect.poll(() => nodeCount(page), { timeout: 10000 }).toBe(before + 1);
});

test('Restructure_BackupFails_DoesNotReload', async ({ page }) => {
  await connect(page);
  const before = await nodeCount(page);
  await replaceMockOnDisk(page, NEW_MOCK);
  await page.evaluate(() => {
    const d = window.__proj;
    d.queryPermission = async ({ mode }) => (mode === 'read' ? 'granted' : 'denied');
    d.requestPermission = async () => 'denied';
  });
  await banner(page).getByRole('button', { name: 'Reanalisar do 0' }).click();
  await page.getByRole('button', { name: 'Reanalisar', exact: true }).click();
  await expect(page.getByText(/Reanálise cancelada/)).toBeVisible({ timeout: 5000 });
  const hasHistory = await page.evaluate(async () => {
    try { await window.__proj.getDirectoryHandle('.design-history'); return true; } catch (e) { return false; }
  });
  expect(hasHistory, 'no backup directory is left behind').toBe(false);
  expect(await nodeCount(page), 'the loaded project was not reloaded').toBe(before);
});

test('LayoutDrift_At1024_BannerKeepsBox', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 700 });
  await connect(page);
  const b = banner(page);
  await expect(b).toBeVisible({ timeout: 5000 });
  const box = await b.boundingBox();
  const right = await page.locator('div[style*="max-width: 425px"]').first().boundingBox();
  expect(box.x, 'banner starts after the left column').toBeGreaterThanOrEqual(384);
  expect(box.x + box.width, 'banner ends before the right panel').toBeLessThanOrEqual(right.x);
});

const savedBackups = (page) => page.evaluate(async () => {
  const out = [];
  try {
    const hist = await window.__proj.getDirectoryHandle('.design-history');
    for await (const [name, h] of hist.entries()) if (/^layout-/.test(name) && h.kind === 'directory') out.push(name);
  } catch (e) { /* none yet */ }
  return out;
});

test('Restructure_MockUnchanged_ExplainsAndBacksUpOnlyWhenForced', async ({ page }) => {
  await connect(page);
  await banner(page).getByRole('button', { name: 'Reanalisar do 0' }).click();
  await expect(page.getByText('O mock não mudou')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/tools\/layers-snapshot\.js/).first()).toBeVisible();
  expect(await savedBackups(page), 'nothing is saved before the user insists').toEqual([]);
  await page.getByRole('button', { name: 'Reler mesmo assim' }).click();
  await expect.poll(async () => (await savedBackups(page)).length, { timeout: 10000 }).toBe(1);
  await expect(page.getByText(/layout anterior salvo em \.design-history\/layout-/)).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(800);
  await expect(banner(page), 'the acknowledged drift does not loop back').toHaveCount(0);
});

test('LayoutDrift_Dismissed_DoesNotReturnOnReloadUntilSourceChanges', async ({ page }) => {
  await connect(page);
  await expect(banner(page)).toBeVisible({ timeout: 5000 });
  await banner(page).getByTitle('Ignorar').click();
  await expect(banner(page)).toHaveCount(0);
  await page.keyboard.press('r');
  await page.waitForTimeout(1500);
  await expect(banner(page)).toHaveCount(0);
  // a new edit of the source is a new fact: the warning comes back after the next reload
  await page.evaluate(async () => {
    const d = await (await window.__proj.getDirectoryHandle('src')).getDirectoryHandle('ui');
    const h = await d.getFileHandle('shell.ts');
    const w = await h.createWritable(); await w.write((await (await h.getFile()).text()) + '// edited again\n'); await w.close();
  });
  await page.keyboard.press('r');
  await expect(banner(page)).toContainText('Mock mais antigo que a fonte', { timeout: 5000 });
});

test('LayoutDrift_RestructureButton_HasAccentedBorder', async ({ page }) => {
  await connect(page);
  const btn = banner(page).getByRole('button', { name: 'Reanalisar do 0' });
  await expect(btn).toBeVisible({ timeout: 5000 });
  expect(await btn.getAttribute('style')).toContain('border: 1px solid var(--warn)');
});
