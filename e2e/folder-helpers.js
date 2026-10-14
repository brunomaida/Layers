import fs from 'node:fs';
import path from 'node:path';
import { readNodes } from './tree-helpers.js';

// A fixture copied into the origin-private file system and handed to the app through a stubbed
// showDirectoryPicker, so the real connected-folder paths (read, mtime guard, write) run unchanged.
// Text fixtures only: every file is read as UTF-8.
function fixtureFiles(name) {
  const root = path.resolve('fixtures', name);
  return fs
    .readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => {
      const abs = path.join(e.parentPath, e.name);
      return [path.relative(root, abs).split(path.sep).join('/'), fs.readFileSync(abs, 'utf8')];
    });
}

export async function connectFixture(page, name) {
  await page.addInitScript(() => {
    window.showDirectoryPicker = async () => window.__proj;
  });
  await page.goto('/');
  await page.evaluate(async (files) => {
    const root = await navigator.storage.getDirectory();
    try { await root.removeEntry('proj', { recursive: true }); } catch (e) { /* first run */ }
    const dir = await root.getDirectoryHandle('proj', { create: true });
    for (const [rel, text] of files) {
      const parts = rel.split('/');
      let d = dir;
      for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
      const w = await (await d.getFileHandle(parts[parts.length - 1], { create: true })).createWritable();
      await w.write(text);
      await w.close();
    }
    window.__proj = dir;
  }, fixtureFiles(name));
  // the menu opens on hover and pins on click, so a click can close what hover just opened
  const trigger = page.getByText('Nenhum projeto').first();
  const item = page.getByText(/Conectar pasta/i).first();
  await trigger.click();
  if (!(await item.isVisible())) await trigger.click();
  await item.click();
  await readNodes(page);
}

// The only raw tree-row query of the functional specs: S4.7 virtualizes the tree, fix it here.
export async function selectLayer(page, titlePrefix) {
  await page.locator(`[data-node-id][title^="${titlePrefix}"]`).first().click();
}

// Text of a file in the connected folder, or null when it does not exist.
export function readDisk(page, rel) {
  return page.evaluate(async (rel) => {
    const parts = rel.split('/');
    try {
      let d = window.__proj;
      for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p);
      return await (await (await d.getFileHandle(parts[parts.length - 1])).getFile()).text();
    } catch (e) {
      return null;
    }
  }, rel);
}

// lastModified (ms) of a root-level file in the connected folder, or null when it does not exist.
export function mtimeDisk(page, rel) {
  return page.evaluate(async (rel) => {
    try {
      return (await (await window.__proj.getFileHandle(rel)).getFile()).lastModified;
    } catch (e) {
      return null;
    }
  }, rel);
}

// Sorted entry names of a folder in the connected folder ('' = root); [] when it does not exist.
export function listDisk(page, dirRel = '') {
  return page.evaluate(async (rel) => {
    try {
      let d = window.__proj;
      for (const p of rel.split('/').filter(Boolean)) d = await d.getDirectoryHandle(p);
      const out = [];
      for await (const name of d.keys()) out.push(name);
      return out.sort();
    } catch (e) {
      return [];
    }
  }, dirRel);
}
