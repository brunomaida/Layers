import { test, expect } from '@playwright/test';
import { instrument, waitForScan } from './perf-helpers.js';
import { inflateTraval } from './tree-perf-helpers.js';
import { treeRow, lastTreeRow, treeWindowState } from './tree-helpers.js';

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

// Hover the row, then its `{ }` button (display:none until the row is hovered or selected).
async function openCode(page, id) {
  const row = page.locator(`[data-node-id="${id}"]`);
  await row.hover();
  await row.locator('button[title^="Expandir o código do estilo"]').click();
  await frames2(page);
}

test('VirtualTree_1500Nos_MontaPoucasLinhas', async ({ page }) => {
  await open(page);
  const st = await treeWindowState(page);
  const n = await nodeCount(page);
  expect(n).toBeGreaterThan(1000);
  expect(st.mounted, 'mounted rows').toBeLessThanOrEqual(Math.ceil(st.clientHeight / 22) + 2 * OVERSCAN + 2);
  expect(st.scrollHeight, 'spacers keep the full height').toBe(8 + n * 22);
  expect(st.contiguous).toBe(true);
  expect(st.covers).toBe(true);
});

test('VirtualTree_RolagemEmPassos_FaixaCobreAVista', async ({ page }) => {
  await open(page);
  const bad = [];
  const max = await box(page).evaluate((el) => el.scrollHeight - el.clientHeight);
  for (let y = 0; y <= max + 97; y += 97) {
    await scrollTo(page, Math.min(y, max));
    const st = await treeWindowState(page);
    if (!st.covers || !st.contiguous) bad.push({ y, covers: st.covers, contiguous: st.contiguous, padTop: st.padTop, padBot: st.padBot });
  }
  expect(bad, 'steps where the mounted slice leaves the view empty').toEqual([]);
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
  expect((await info()).id, 'focus stays on the same node after scrolling').toBe(at.id);
  await page.keyboard.press('Enter');
  await scrollTo(page, 0);
  await expect(page.locator(`[data-node-id="${at.id}"] button`).first()).toHaveText('▸');
  expect(await rowsAbove(at.id), 'rows above the toggled one are unchanged').toEqual(above);
});

test('TreeHelpers_TreeRowELastTreeRow_AchamLinhasForaDaFaixa', async ({ page }) => {
  await open(page);
  const last = await lastTreeRow(page);
  const title = await last.getAttribute('title');
  const again = await treeRow(page, { title: title.split(' · ')[0] });
  await expect(again).toBeVisible();
  await expect(treeRow(page, { title: 'no-such-layer-xyz' })).rejects.toThrow(/tree row not found/);
});
