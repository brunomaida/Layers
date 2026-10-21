import fs from 'node:fs';
import path from 'node:path';
import { readNodes, treeRow } from './tree-helpers.js';

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
  await connectEntries(page, fixtureFiles(name));
}

// Same folder harness for files built in the test: entries = [[relPath, text], ...].
export async function connectEntries(page, entries) {
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
  }, entries);
  // the menu opens on hover and pins on click, so a click can close what hover just opened
  const trigger = page.getByText('Nenhum projeto').first();
  const item = page.getByText(/Conectar pasta/i).first();
  await trigger.click();
  if (!(await item.isVisible())) await trigger.click();
  await item.click();
  await readNodes(page);
}

// Same entry point for a .zip source: entries = [[relPath, text], ...] are stored (method 0, as in the zips openZip reads
// without inflating) in an archive built in the page, and the app opens it through Projetos > Abrir arquivo .zip with a stubbed
// showOpenFilePicker, so openZip, zipRoot, `this.zip` and the zip branches of the loader and the coverage scan run unchanged.
// `root` wraps everything in one top-level folder ('repo-main/'), like a downloaded GitHub zip: zipRoot() finds it by the layers.json inside.
export async function connectZip(page, entries, root = '') {
  await page.addInitScript(() => {
    window.showOpenFilePicker = async () => [{ getFile: async () => window.__zipFile }];
  });
  await page.goto('/');
  await page.evaluate(async ({ files, root }) => {
    const enc = new TextEncoder();
    const parts = [], central = [];
    let at = 0;
    const u16 = (v) => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, v, true); return b; };
    const u32 = (v) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v, true); return b; };
    const push = (list, ...bs) => bs.forEach((b) => list.push(b));
    for (const [rel, text] of files) {
      const name = enc.encode(root + rel), data = enc.encode(text);
      // openZip never checks the crc, so it stays 0
      const loc = [u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(0), u32(data.length), u32(data.length), u16(name.length), u16(0), name];
      push(central, u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(0), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(at), name);
      push(parts, ...loc, data);
      at += loc.reduce((n, b) => n + b.length, 0) + data.length;
    }
    const cenSize = central.reduce((n, b) => n + b.length, 0);
    push(parts, ...central, u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cenSize), u32(at), u16(0));
    window.__zipFile = new File(parts, 'proj.zip', { type: 'application/zip' });
  }, { files: entries, root });
  const trigger = page.getByText('Nenhum projeto').first();
  const item = page.getByText(/Abrir arquivo \.zip/i).first();
  await trigger.click();
  if (!(await item.isVisible())) await trigger.click();
  await item.click();
  await readNodes(page);
}

// Window-safe: treeRow scrolls the tree until the row is mounted (S4.10 windows the tree).
export async function selectLayer(page, titlePrefix) {
  await (await treeRow(page, { title: titlePrefix })).click();
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
