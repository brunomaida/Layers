import { expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';
import { connectFixture } from './folder-helpers.js';

// Shared by context-menu.spec.js and request.spec.js: the connected-folder harness (axai in OPFS, session restored on
// reload), the `act` fiber reader and the real right-click helpers. Moved verbatim out of context-menu.spec.js (S3.5 Task 6).

// The component instance is the `logic` of the StreamableComponent fiber behind the stage (support.js runtime): the only
// place in this spec that reaches into it. Used for state reads (`window.__logic.state`) and `loadProject`, not as a menu
// substitute. Calls `method(...args)` when given, and returns the branch keys of the state (read once the render settles).
export async function act(page, method, ...args) {
  await page.evaluate(({ method, args }) => {
    const el = document.querySelector('[data-plane]');
    let f = el[Object.keys(el).find((k) => k.startsWith('__reactFiber'))];
    while (f && !(f.stateNode && f.stateNode.logic && f.stateNode.logic.explodeHere)) f = f.return;
    window.__logic = f.stateNode.logic;
    if (method) window.__logic[method](...args);
  }, { method, args });
  await page.waitForTimeout(150);
  return page.evaluate(() => ({ explodeFrom: window.__logic.state.explodeFrom, collapseAt: window.__logic.state.collapseAt }));
}

// On the next load, patches layers/v1/session (camera merged). A plain localStorage write would be
// overwritten by the pagehide drain of the page being left; sessionStorage survives the reload.
export async function open(page) {
  await page.addInitScript(() => {
    try {
      const raw = sessionStorage.getItem('__seedSession');
      if (!raw) return;
      sessionStorage.removeItem('__seedSession');
      const cur = JSON.parse(localStorage.getItem('layers/v1/session') || '{}'); const p = JSON.parse(raw);
      localStorage.setItem('layers/v1/session', JSON.stringify({ ...cur, ...p, camera: { ...cur.camera, ...p.camera } }));
    } catch (e) { /* no storage */ }
  });
  // Chromium crashes the page when an OPFS directory handle is read back from IndexedDB, which restoreSession does
  // for a connected folder. Stand-in: IndexedDB keeps a placeholder and the 'h' store reads the proj folder from OPFS.
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put; const get = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.put = function (v, k) { return this.name === 'h' ? put.call(this, { stub: 1 }, k) : put.apply(this, arguments); };
    IDBObjectStore.prototype.get = function () {
      if (this.name !== 'h') return get.apply(this, arguments);
      const req = { result: undefined, error: null };
      Object.defineProperty(req, 'onsuccess', { set(f) { navigator.storage.getDirectory().then((r) => r.getDirectoryHandle('proj')).then((h) => { h.queryPermission = async () => 'granted'; window.__proj = h; req.result = h; f(); }); } });
      return req;
    };
  });
  await connectFixture(page, 'axai');
}

export async function reloadWith(page, patch) {
  if (patch) await page.evaluate((p) => sessionStorage.setItem('__seedSession', JSON.stringify(p)), patch);
  await page.reload();
  await readNodes(page);
}

export const toggle = (page) => page.getByRole('button', { name: /Explodido/ });
export async function goFlat(page) {
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('title', /Vista plana/);
}

// Every trigger is a REAL right-click (page.mouse at a point that hits the plane, or
// locator.click({button:'right'}) on a tree row): 3D transforms make the plane's centre unreliable, so `planePoint`
// scans the plane's box for a point whose topmost element is that very plane. The fiber helper `act` is only used here
// to read state (`stateOf`).
export const panel = (page) => page.getByRole('menu', { name: /Camadas/ });
export const sub = (page) => page.getByRole('menu', { name: /Ações/ });
export const item = (page, name) => sub(page).getByRole('menuitem', { name });
export const layerRow = (page, d) => panel(page).locator(`[data-ctx-d="${d}"]`);
export const stateOf = async (page, key) => { await act(page); return page.evaluate((k) => window.__logic.state[k], key); };

// Polls until the point is the same on two reads 120ms apart: right after goFlat or an explode the planes are still easing
// (transform .35s), so an early point can end up on a neighbour plane by the time the click lands.
export async function planePoint(page, id) {
  let p = null;
  await expect.poll(async () => {
    const prev = p;
    p = await page.evaluate((id) => {
      const el = document.querySelector(`[data-plane="${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const fr = [0.5, 0.25, 0.75, 0.1, 0.9, 0.4, 0.6];
      for (const fy of fr) for (const fx of fr) {
        const x = r.left + r.width * fx, y = r.top + r.height * fy;
        const t = document.elementFromPoint(x, y), q = t && t.closest('[data-plane]');
        if (q && q.dataset.plane === id) return { x, y };
      }
      return null;
    }, id);
    await page.waitForTimeout(120);
    return p !== null && prev !== null && Math.abs(p.x - prev.x) < 0.5 && Math.abs(p.y - prev.y) < 0.5;
  }, { message: `visible point on plane ${id}`, timeout: 8000 }).toBe(true);
  return p;
}
export async function rightClick(page, id) {
  const { x, y } = await planePoint(page, id);
  await page.mouse.click(x, y, { button: 'right' });
}
