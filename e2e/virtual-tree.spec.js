import { test, expect } from '@playwright/test';
import { instrument, waitForScan } from './perf-helpers.js';
import { inflateTraval } from './tree-perf-helpers.js';
import { treeRow, lastTreeRow, treeWindowState, readNodes } from './tree-helpers.js';

// S4.10: the layer tree mounts only the visible row window (plus overscan) between two invisible
// spacers. These invariants hold with or without the window: before it, every row is mounted and the
// spacers are 0; with it, the mounted slice must always cover the visible rectangle.
test.setTimeout(150_000);

const OVERSCAN = 10;
const frames2 = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const box = (page) => page.locator('[data-tree-box]');

// Traval inflated to ~1500 tags; the container is marked so the tests can drive it as a Locator.
async function open(page) {
  await instrument(page);
  await inflateTraval(page, 1500);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page, 1000, 40_000);
  await page.mouse.move(2, 2);
  await page.evaluate(() => {
    let b = document.querySelector('[data-node-id]');
    while (b && getComputedStyle(b).overflowY !== 'auto') b = b.parentElement;
    b.setAttribute('data-tree-box', '');
  });
}

// After a jump of more than one screen the rebuild is a React task that lands a few frames later: give it up to 10.
async function expectCovered(page, what) {
  let st = await treeWindowState(page);
  for (let i = 0; i < 10 && !(st.covers && st.contiguous); i++) { await frames2(page); st = await treeWindowState(page); }
  expect(st.covers && st.contiguous, `${what}: mounted slice covers the view (padTop ${st.padTop}, padBot ${st.padBot})`).toBe(true);
}

async function scrollTo(page, to) {
  await box(page).evaluate((el, to) => { el.scrollTop = to === 'end' ? el.scrollHeight : to; }, to);
  await frames2(page);
}

// N of the "Hierarquia N" tab label: with everything expanded and no filter, one row per node.
async function nodeCount(page) {
  const t = await page.locator('button', { hasText: /^Hierarquia/ }).first().innerText();
  return +t.match(/\d+/)[0];
}

// Every row of the list as { id, title }, merged while the container scrolls in half-view steps.
async function collectRows(page) {
  const seen = new Map();
  await scrollTo(page, 0);
  for (let guard = 0; guard < 400; guard++) {
    for (const r of await page.locator('[data-node-id]').evaluateAll((els) => els.map((e) => ({ id: e.dataset.nodeId, title: e.title })))) seen.set(r.id, r);
    const g = await box(page).evaluate((el) => ({ top: el.scrollTop, ch: el.clientHeight, sh: el.scrollHeight }));
    if (g.top + g.ch >= g.sh) break;
    await scrollTo(page, g.top + g.ch / 2);
  }
  return [...seen.values()];
}

const codeKeys = (page) => page.locator('[data-code-key]').evaluateAll((els) => els.map((e) => e.dataset.codeKey));

// Height of the first mounted code block (the container child that holds a textarea).
const codeH = (page) => box(page).evaluate((el) => [...el.children].find((c) => c.querySelector('textarea')).getBoundingClientRect().height);

// id of the first row whose top is at or below the container's visible top
const topRowId = (page) => box(page).evaluate((el) => {
  const bt = el.getBoundingClientRect().top;
  return [...el.querySelectorAll('[data-node-id]')].find((r) => r.getBoundingClientRect().top >= bt - 1).dataset.nodeId;
});

// Hover the row, then its `{ }` button (display:none until the row is hovered or selected). The mouse
// leaves the tree first: after a jump the node under a parked cursor is the same slot (index keys), so
// no mouseenter would fire.
async function openCode(page, id) {
  const row = page.locator(`[data-node-id="${id}"]`);
  await page.mouse.move(2, 2);
  await row.hover();
  await row.locator('button[title^="Expandir o código do estilo"]').click();
  await frames2(page);
}

test('VirtualTree_1500Nos_MontaPoucasLinhas', async ({ page }) => {
  await open(page);
  const st = await treeWindowState(page);
  const n = await nodeCount(page);
  expect(n).toBeGreaterThan(1000);
  // the slice is sized by max(container, window) height, so a small container never starts with a blank band
  const winH = page.viewportSize().height;
  expect(st.mounted, 'mounted rows').toBeLessThanOrEqual(Math.ceil(Math.max(st.clientHeight, winH) / 22) + 2 * OVERSCAN + 2);
  expect(st.mounted, 'mounted rows cover the window height').toBeGreaterThanOrEqual(Math.ceil(winH / 22));
  expect(st.scrollHeight, 'spacers keep the full height').toBe(8 + n * 22);
  expect(st.contiguous).toBe(true);
  expect(st.covers).toBe(true);
});

test('VirtualTree_RolagemEmPassos_FaixaCobreAVista', async ({ page }) => {
  test.setTimeout(300_000); // ~370 steps, each one a full render() at 1500 tags
  await open(page);
  const bad = [];
  const max = await box(page).evaluate((el) => el.scrollHeight - el.clientHeight);
  const top = () => box(page).evaluate((el) => el.scrollTop);
  // 97 px: neither a multiple of 22 nor of 110, and below the 110 px rebuild step + overscan margin
  for (let y = 0; y <= max + 97; y += 97) {
    const want = Math.min(y, max);
    await scrollTo(page, want);
    const st = await treeWindowState(page); // first read, 2 frames after the scroll: covers must already hold
    const t1 = await top();
    await frames2(page);
    const t2 = await top();
    if (!st.covers || !st.contiguous || t1 !== want || t2 !== want) bad.push({ y: want, t1, t2, covers: st.covers, contiguous: st.contiguous, padTop: st.padTop, padBot: st.padBot });
  }
  expect(bad, 'steps where the slice leaves the view empty or scrollTop drifts').toEqual([]);
});

test('VirtualTree_RodaDoMouse_ScrollTopSemFuga', async ({ page }) => {
  await open(page);
  const bb = await box(page).boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  const top = () => box(page).evaluate((el) => el.scrollTop);
  for (let k = 1; k <= 10; k++) {
    await page.mouse.wheel(0, 100);
    let prev = -1, cur = await top();
    for (let i = 0; i < 40 && cur !== prev; i++) { prev = cur; await frames2(page); cur = await top(); } // smooth scroll settles
    expect(cur, `after wheel step ${k}`).toBe(100 * k);
    await frames2(page);
    await frames2(page);
    expect(await top(), `stable 2 frames after step ${k}`).toBe(100 * k);
  }
});

test('VirtualTree_SelecionarPlano_RolaAteALinha', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) => getComputedStyle(el).backgroundImage.includes('radial-gradient'));
    const planes = [...stage.querySelectorAll('div')].filter((el) => el.style.transform.startsWith('translateZ(') && /pointer|crosshair/.test(el.style.cursor));
    planes[planes.length - 1].click();
  });
  await frames2(page);
  const sel = page.locator('[data-node-id]').filter({ hasText: '●' });
  await expect(sel).toHaveCount(1);
  const rb = await sel.boundingBox();
  const bb = await box(page).boundingBox();
  expect(rb.y, 'row above the container top').toBeGreaterThanOrEqual(bb.y - 1);
  expect(rb.y + rb.height, 'row below the container bottom').toBeLessThanOrEqual(bb.y + bb.height + 1);
  expect(await box(page).evaluate((el) => el.scrollTop), 'the selected plane is deep in the list').toBeGreaterThan(0);
});

test('VirtualTree_RolagemAteOFim_MostraUltimoNo', async ({ page }) => {
  await open(page);
  await scrollTo(page, 'end');
  const st = await treeWindowState(page);
  expect(st.padBot).toBe(0);
  const gap = await box(page).evaluate((el) => {
    const kids = [...el.children];
    const last = kids[kids.length - 1].getBoundingClientRect();
    return Math.abs(last.bottom - (el.getBoundingClientRect().top + el.clientTop - el.scrollTop + el.scrollHeight - 4));
  });
  expect(gap, 'last mounted row sits at the end of the content').toBeLessThanOrEqual(1);
  expect(st.contiguous).toBe(true);
  expect(st.covers).toBe(true);
  await expect(await lastTreeRow(page)).toBeVisible();
});

test('VirtualTree_BuscaFiltrar_MantemIndices', async ({ page }) => {
  await open(page);
  const n = await nodeCount(page);
  const full = await box(page).evaluate((el) => el.scrollHeight);
  await scrollTo(page, Math.floor(full / 2));
  const q = page.locator('input[placeholder="Buscar camada…"]');
  await q.fill('icon-btn');
  await page.locator('button[title^="Mostrar só as camadas"]').click();
  await frames2(page);
  const st = await treeWindowState(page);
  expect(st.contiguous).toBe(true);
  expect(st.covers).toBe(true);
  const k = (st.scrollHeight - 8) / 22;
  expect(Number.isInteger(k) && k > 0 && k < n, `filtered list of ${k} rows from ${n}`).toBe(true);
  const rows = await collectRows(page);
  expect(rows.length).toBe(k);
  const hits = rows.filter((r) => r.title.toLowerCase().includes('icon-btn')).map((r) => r.id);
  expect(hits.length).toBeGreaterThan(1);
  for (const r of rows) expect(hits.some((h) => h === r.id || h.startsWith(r.id + '.')), `row ${r.id} neither matches nor is an ancestor`).toBe(true);
  await q.press('Escape');
  await frames2(page);
  expect((await treeWindowState(page)).scrollHeight).toBe(8 + n * 22);
});

test('VirtualTree_CodigoAberto_AlturaVariavel', async ({ page }) => {
  await open(page);
  const n = await nodeCount(page);
  await page.locator('[data-node-id]').nth(3).click();
  await page.locator('[data-node-id]').nth(3).locator('button[title^="Expandir o código do estilo"]').click();
  await scrollTo(page, 0);
  const h = await codeH(page);
  expect(Math.abs((await treeWindowState(page)).scrollHeight - (8 + n * 22 + h)), 'one open code row').toBeLessThanOrEqual(1);
  await box(page).locator('textarea').first().evaluate((ta) => { ta.style.height = ta.offsetHeight + 60 + 'px'; });
  await frames2(page);
  expect(Math.abs((await treeWindowState(page)).scrollHeight - (8 + n * 22 + h + 60)), 'grown by the resize handle').toBeLessThanOrEqual(1);
  await scrollTo(page, 'end');
  await scrollTo(page, 0);
  const st = await treeWindowState(page);
  expect(st.contiguous).toBe(true);
  expect(st.covers).toBe(true);
});

test('VirtualTree_DigitandoNoCodigo_RolagemNaoTrocaARegra', async ({ page }) => {
  await open(page);
  const T = 4 + 22 * 180; // row 180 sits at the container top: start is far from 0
  await scrollTo(page, T);
  const a = await topRowId(page);
  await scrollTo(page, T + 41 * 22);
  const b = await topRowId(page);
  expect(b, 'the 41st row below').not.toBe(a);
  await scrollTo(page, T);
  await openCode(page, a);
  const k1 = (await codeKeys(page))[0];
  const h1 = await codeH(page);
  await scrollTo(page, T + h1 + 41 * 22);
  await openCode(page, b);
  const k2 = (await codeKeys(page)).find((k) => k !== k1);
  expect(k1, 'data-code-key on the open code row').toBeTruthy();
  expect(k2, 'a second, different code key').toBeTruthy();
  await scrollTo(page, T);
  await box(page).locator(`[data-code-key="${k1}"] textarea`).click();
  await scrollTo(page, T + h1 + 41 * 22);
  await expectCovered(page, 'textarea focused, scrolled one screen down'); // the frozen start must not leave the view blank
  await page.keyboard.type('/*y*/');
  const active = await page.evaluate(() => {
    const t = document.activeElement, c = t.closest('[data-code-key]');
    return { tag: t.localName, key: c && c.dataset.codeKey };
  });
  expect(active).toEqual({ tag: 'textarea', key: k1 });
  await page.keyboard.press('Escape');
  await scrollTo(page, T);
  await expect(box(page).locator(`[data-code-key="${k1}"] textarea`)).toHaveValue(/\/\*y\*\//);
  await scrollTo(page, T + h1 + 41 * 22);
  await expect(box(page).locator(`[data-code-key="${k2}"] textarea`)).not.toHaveValue(/\/\*y\*\//);
});

test('VirtualTree_BotaoComFoco_RolagemNaoTrocaONo', async ({ page }) => {
  await open(page);
  await page.locator('input[placeholder="Buscar camada…"]').focus();
  const info = () => page.evaluate(() => {
    const t = document.activeElement, row = t.closest('[data-node-id]');
    return { tag: t.localName, id: row && row.dataset.nodeId, chev: row && t === row.querySelector('button') ? t.textContent : null };
  });
  const rowsAbove = (id) => page.locator('[data-node-id]').evaluateAll((els, id) => {
    const i = els.findIndex((e) => e.dataset.nodeId === id);
    return els.slice(0, i).map((e) => e.innerText);
  }, id);
  let at = null;
  for (let i = 0; i < 40 && !at; i++) {
    await page.keyboard.press('Tab');
    const f = await info();
    if (f.tag === 'button' && f.id && f.id !== '0' && f.chev === '▾') at = f;
  }
  expect(at, 'keyboard focus reached an expanded row chevron (not the root)').not.toBeNull();
  const above = await rowsAbove(at.id);
  await box(page).evaluate((el) => { el.scrollTop += 2000; });
  await frames2(page);
  await expectCovered(page, 'button focused by Tab, scrolled 2000 px down'); // the frozen start must not leave the view blank
  expect((await info()).id, 'focus stays on the same node after scrolling').toBe(at.id);
  await page.keyboard.press('Enter');
  await scrollTo(page, 0);
  await expect(page.locator(`[data-node-id="${at.id}"] button`).first()).toHaveText('▸');
  expect(await rowsAbove(at.id), 'rows above the toggled one are unchanged').toEqual(above);
});

test('VirtualTree_CliqueChevronTeclaFERolagem_JanelaAcompanha', async ({ page }) => {
  await open(page);
  await page.locator('[data-node-id]').nth(5).locator('button').first().click(); // mouse focus on a row button
  await page.keyboard.press('f'); // a key press makes :focus-visible match for the mouse-focused button
  const before = await page.locator('[data-node-id]').first().getAttribute('data-node-id');
  await scrollTo(page, 2000);
  let st = await treeWindowState(page);
  for (let i = 0; i < 6 && !(st.covers && st.padTop > 1500); i++) { await frames2(page); st = await treeWindowState(page); }
  expect(st.covers, 'slice covers the view after the scroll').toBe(true);
  expect(st.padTop, 'the window followed the scroll').toBeGreaterThan(1500);
  expect(await page.locator('[data-node-id]').first().getAttribute('data-node-id')).not.toBe(before);
  expect(await page.evaluate(() => !document.querySelector('[data-tree-box]').contains(document.activeElement)), 'mouse-focused button was blurred').toBe(true);
});

test('VirtualTree_TabPelasLinhas_FocoNaoEscapaNemTravaAJanela', async ({ page }) => {
  await open(page);
  const mountedAtStart = (await treeWindowState(page)).mounted;
  await page.locator('input[placeholder="Buscar camada…"]').focus();
  const where = () => page.evaluate(() => {
    const t = document.activeElement, b = document.querySelector('[data-tree-box]'), r = t.closest('[data-node-id]');
    return { inBox: b.contains(t), id: r && r.dataset.nodeId };
  });
  const seen = new Set();
  let entered = false;
  for (let i = 0; i < mountedAtStart + 40; i++) {
    await page.keyboard.press('Tab');
    const w = await where();
    if (w.inBox) entered = true;
    if (entered) {
      expect(w.inBox, `Tab ${i}: focus stayed in the tree`).toBe(true);
      seen.add(w.id);
      const st = await treeWindowState(page);
      expect(st.covers && st.contiguous, `Tab ${i}: mounted slice covers the view`).toBe(true);
    }
  }
  expect(seen.size, 'Tab went past the rows mounted at the start').toBeGreaterThan(mountedAtStart);
  await page.locator('input[placeholder="Buscar camada…"]').focus(); // focus leaves the tree: the frozen window catches up
  await frames2(page);
  await frames2(page);
  const st = await treeWindowState(page);
  expect(st.covers).toBe(true);
  expect(st.padTop, 'window follows the scroll position after blur').toBeGreaterThan(500);
});

test('VirtualTree_SelecionarRaiz_NaoMoveScrollTop', async ({ page }) => {
  await open(page);
  await scrollTo(page, 0);
  await page.locator('[data-node-id="0"]').click();
  await frames2(page);
  await frames2(page);
  expect(await box(page).evaluate((el) => el.scrollTop), 'row 0 is already visible: the 4 px top padding stays').toBe(0);
});

test('VirtualTree_ListaCurta_SemJanela', async ({ page }) => {
  await page.goto('/?layers=fixtures/axai/');
  await readNodes(page);
  await page.evaluate(() => {
    let b = document.querySelector('[data-node-id]');
    while (b && getComputedStyle(b).overflowY !== 'auto') b = b.parentElement;
    b.setAttribute('data-tree-box', '');
  });
  const st = await treeWindowState(page);
  expect(st.padTop + st.padBot, 'no spacers for a list under 3 screens').toBe(0);
  expect(st.mounted, 'every row mounted').toBe(await nodeCount(page));
});

test('VirtualTree_FonteMuda_AlturaDoCodigoDesmontadoEhRecalculada', async ({ page }) => {
  await open(page);
  await page.locator('[data-node-id]').nth(3).click();
  await page.locator('[data-node-id]').nth(3).locator('button[title^="Expandir o código do estilo"]').click();
  await scrollTo(page, 0);
  await frames2(page);
  await scrollTo(page, 3000); // the code row unmounts: its height now comes from the cache
  const away = () => box(page).evaluate((el) => el.scrollHeight);
  const h0 = await away();
  await page.locator('button[title^="Aparência · Fonte"]').click();
  await page.locator('label[title^="Tamanho proporcional"] input[type=range]').evaluate((el) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '1.5');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await frames2(page);
  await frames2(page);
  const h1 = await away();
  expect(h1, 'unmounted code row height follows the font scale, not the stale measure').not.toBe(h0);
});

test('TreeHelpers_TreeRowELastTreeRow_AchamLinhasForaDaFaixa', async ({ page }) => {
  await open(page);
  const last = await lastTreeRow(page);
  const title = await last.getAttribute('title');
  const again = await treeRow(page, { title: title.split(' · ')[0] });
  await expect(again).toBeVisible();
  await expect(treeRow(page, { title: 'no-such-layer-xyz' })).rejects.toThrow(/tree row not found/);
});
