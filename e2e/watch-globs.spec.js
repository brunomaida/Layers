import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S2.22d: layers.json › watch globs feed the S2.21 layout-drift probe, so a snapshot mock with no
// data-src still warns when the matching source code is newer than the mock.
const MOCK = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div class="shell" style="width:400px;height:300px;background:#123"><div class="bar" style="height:40px;background:#345">bar</div></div>
</body></html>
`;
const TS = 'export const x = 1;\n';
const manifest = (extra) => JSON.stringify({ name: 'Watch', viewport: { width: 400, height: 300 }, mock: 'layers/mock.html', ...extra });
// the mock is written last so every source starts older than it; `newer` rewrites the ones that must win
const BASE_FILES = (extra) => [
  ['src/ui/other.ts', TS],
  ['docs/note.ts', TS],
  ['node_modules/x/dep.ts', TS],
  ['layers.json', manifest(extra)],
  ['layers/mock.html', MOCK],
];

// `newer` = files rewritten after the mock so their mtime is strictly greater
async function connect(page, files, newer, { badDir = false } = {}) {
  await page.addInitScript(() => { window.showDirectoryPicker = async () => window.__proj; });
  // a directory named `bad` cannot be listed (NotReadableError), as if it vanished or lost permission mid-walk
  if (badDir) await page.addInitScript(() => {
    const orig = FileSystemDirectoryHandle.prototype.entries;
    FileSystemDirectoryHandle.prototype.entries = function () {
      if (this.name === 'bad') return (async function* () { throw new DOMException('unreadable', 'NotReadableError'); })();
      return orig.call(this);
    };
  });
  await page.goto('/');
  await page.evaluate(async ({ files, newer }) => {
    const root = await navigator.storage.getDirectory();
    try { await root.removeEntry('proj', { recursive: true }); } catch (e) { /* first run */ }
    const dir = await root.getDirectoryHandle('proj', { create: true });
    const put = async (rel, text) => {
      const parts = rel.split('/'); let d = dir;
      for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
      const w = await (await d.getFileHandle(parts[parts.length - 1], { create: true })).createWritable();
      await w.write(text); await w.close();
    };
    const mtime = async (rel) => {
      let d = dir; const parts = rel.split('/');
      for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p);
      return (await (await d.getFileHandle(parts[parts.length - 1])).getFile()).lastModified;
    };
    for (const [rel, text] of files) await put(rel, text);
    window.__proj = dir;
    const textOf = (rel) => files.find(([r]) => r === rel)[1];
    for (const rel of newer) {
      for (let i = 0; i < 20 && (await mtime(rel)) <= (await mtime('layers/mock.html')); i++) {
        await new Promise((r) => setTimeout(r, 25));
        await put(rel, textOf(rel));
      }
    }
  }, { files, newer });
  const trigger = page.getByText('Nenhum projeto').first();
  const item = page.getByText(/Conectar pasta/i).first();
  await trigger.click();
  if (!(await item.waitFor({ state: 'visible', timeout: 2000 }).then(() => true, () => false))) await trigger.click();
  await item.click();
  await readNodes(page);
}

const banner = (page) => page.locator('[role=status]', { hasText: /Mock mais antigo|mudaram no disco/ });

test('WatchGlobs_MatchingSourceNewerThanMock_ShowsRestructureBanner', async ({ page }) => {
  await connect(page, BASE_FILES({ watch: ['src/**/*.ts'] }), ['src/ui/other.ts']);
  await expect(banner(page)).toContainText('Mock mais antigo que a fonte: src/ui/other.ts', { timeout: 5000 });
});

test('WatchGlobs_SkippedDirNeverScanned_OnlyTheOtherMatchWarns', async ({ page }) => {
  await connect(page, BASE_FILES({ watch: ['**/*.ts'] }), ['docs/note.ts', 'node_modules/x/dep.ts']);
  await expect(banner(page)).toContainText('Mock mais antigo que a fonte: docs/note.ts', { timeout: 5000 });
  await expect(banner(page)).not.toContainText('node_modules');
});

test('WatchGlobs_GlobDoesNotReachTheNewerFile_ShowsNoBanner', async ({ page }) => {
  await connect(page, BASE_FILES({ watch: ['src/**/*.ts'] }), ['docs/note.ts', 'node_modules/x/dep.ts']);
  await page.waitForTimeout(1500);
  await expect(banner(page)).toHaveCount(0);
});

test('WatchGlobs_NoWatchField_ShowsNoBanner', async ({ page }) => {
  await connect(page, BASE_FILES({}), ['src/ui/other.ts']);
  await page.waitForTimeout(1500);
  await expect(banner(page)).toHaveCount(0);
});

test('WatchGlobs_MoreThanCapMatches_ToastsTheOverflow', async ({ page }) => {
  const gen = Array.from({ length: 55 }, (_, i) => ['src/gen/f' + i + '.ts', TS]);
  await connect(page, [...gen, ...BASE_FILES({ watch: ['src/gen/*.ts'] })], []);
  await expect(page.getByText('watch: 5 arquivos além do teto de 50 ignorados')).toBeVisible({ timeout: 5000 });
});

test('WatchGlobs_UnreadableSubdirectory_KeepsTheOtherMatches', async ({ page }) => {
  await connect(page, [['src/bad/x.ts', TS], ...BASE_FILES({ watch: ['src/**/*.ts'] })], ['src/ui/other.ts'], { badDir: true });
  await expect(banner(page)).toContainText('Mock mais antigo que a fonte: src/ui/other.ts', { timeout: 5000 });
});

test('WatchGlobs_NoWatchFieldAndManyCitedSources_NeverToastsWatchOverflow', async ({ page }) => {
  const cited = Array.from({ length: 51 }, (_, i) => `<div class="c${i}" data-src="src/gen/f${i}.ts|.c${i}|1" style="height:2px"></div>`).join('');
  const mock = MOCK.replace('<div class="bar"', cited + '<div class="bar"');
  const files = BASE_FILES({}).map(([rel, text]) => (rel === 'layers/mock.html' ? [rel, mock] : [rel, text]));
  // a toast can be replaced within milliseconds, so record any text that ever mentions it
  await page.addInitScript(() => {
    window.__watchToast = false;
    new MutationObserver(() => { if (document.body && /watch: \d+ arquivos/.test(document.body.innerText)) window.__watchToast = true; }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await connect(page, files, []);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__watchToast)).toBe(false);
});
