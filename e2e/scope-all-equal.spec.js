import { test, expect } from '@playwright/test';
import { readNodes, treeRow } from './tree-helpers.js';
import { act, open } from './ctx-helpers.js';

// S5.4: with scope "Todos iguais", one property edit reaches every use of the rule (same `src`,
// same tag, same leaf-ness: the app's `sharedIds` grouping) and no other element. "Só este" is the
// contrast: exactly the selected element. Driven through the real UI on the axai fixture, where
// `.sum-stat` is used by 6 nodes.
const SHADOW = 'rgb(1, 2, 3) 0px 0px 0px 3px';

// Shadow-root elements whose inline box-shadow now carries SHADOW, as indexes into the scan order.
function touched() {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  const els = [...host.shadowRoot.querySelectorAll('*')].filter((e) => e.localName !== 'style');
  return els.flatMap((e, i) => (e.style.boxShadow.includes('rgb(1, 2, 3)') ? [i] : []));
}

function group() {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  const els = [...host.shadowRoot.querySelectorAll('*')].filter((e) => e.localName !== 'style');
  const key = (e) => `${e.dataset.src}#${e.localName}#${e.children.length > 0}`;
  const first = els.find((e) => e.classList.contains('sum-stat'));
  return els.flatMap((e, i) => (key(e) === key(first) ? [i] : []));
}

async function edit(page, scopeLabel) {
  await page.goto('/?layers=fixtures/axai/');
  await readNodes(page);
  await (await treeRow(page, { title: '.sum-stat' })).click();
  await page.getByText(scopeLabel, { exact: false }).first().click();
  // Text field of the "Sombra" row; typed like a user (select all, type, leave the field to commit).
  const field = page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();
  await field.click({ clickCount: 3 });
  await page.keyboard.type('0 0 0 3px rgb(1, 2, 3)');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
}

test('Scope_AllEqual_EditReachesEveryUseAndNothingElse', async ({ page }) => {
  await edit(page, 'Todos iguais (');
  const expected = await page.evaluate(group);
  expect(expected.length, 'uses of .sum-stat').toBeGreaterThan(1);
  const got = await page.evaluate(touched);
  expect(got).toEqual(expected);
});

test('Scope_One_EditReachesOnlyTheSelected', async ({ page }) => {
  await edit(page, 'Só este');
  const got = await page.evaluate(touched);
  expect(got).toHaveLength(1);
});

// S9.1d Task 4: with scope "Todos iguais" the panel says how many uses of the same rule the OTHER layouts have
// (counted by the probe, never by mounting them). Multi-layout fixture, shared `.title` rule (layers/shared.css),
// reshaped on disk so main has two `.title` (scope chips appear) and config has three.
const title = (id, n) => `<div class="title" id="${id}">${n}</div>`;
const MAIN = `<!doctype html>\n<html><head><meta charset="utf-8"><link rel="stylesheet" href="main.css"></head>\n<body>${title('main-title', 'Main')}${title('main-title2', 'Main 2')}<div class="box" id="main-a">empty</div></body></html>\n`;
const CONFIG = `<!doctype html>\n<html><head><meta charset="utf-8"><link rel="stylesheet" href="config.css"></head>\n<body>${title('cfg-title', 'Config')}${title('cfg-title2', 'C2')}${title('cfg-title3', 'C3')}<div class="panel" id="cfg-panel">panel</div></body></html>\n`;

const putDisk = (page, rel, text) => page.evaluate(async ({ rel, text }) => {
  const parts = rel.split('/'); let d = window.__proj;
  for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
  const w = await (await d.getFileHandle(parts[parts.length - 1], { create: true })).createWritable();
  await w.write(text); await w.close();
}, { rel, text });
const rmDisk = (page, rel) => page.evaluate(async (rel) => { const [dir, name] = rel.split('/'); await (await window.__proj.getDirectoryHandle(dir)).removeEntry(name); }, rel);
const settledMain = (page) => expect.poll(async () => { await act(page); return page.evaluate(() => { const l = window.__logic; return !!l.state.project && l.state.project.layoutId === 'main' && l.loadedSeq === l.loadSeq && l.state.nodes.length > 3; }); }).toBe(true);

async function reshaped(page, extra) {
  await open(page, 'multi-layout');
  await act(page);
  await putDisk(page, 'layers/main.html', MAIN);
  await putDisk(page, 'layers/config.html', CONFIG);
  if (extra) await extra(page);
  await act(page, 'doReload');
  await settledMain(page);
  await act(page, 'select', '0.0');
}

const allChip = (page) => page.getByText('Todos iguais (', { exact: false }).first();

test('Scope_AllEdit_ShowsAlsoAffectsOtherLayoutsCount', async ({ page }) => {
  await reshaped(page);
  await expect(page.getByText('também afeta')).toHaveCount(0); // scope is still "ask"
  await allChip(page).click();
  await expect(page.getByText('também afeta Config (3 usos) · Replay (1 uso)').first()).toBeVisible(); // Broken is unavailable: no count
  expect(await page.evaluate(() => [...window.__logic.layoutProbe.keys()].sort())).toEqual(['broken', 'config', 'replay']);
  await page.getByText('Só este', { exact: false }).first().click();
  await expect(page.getByText('também afeta')).toHaveCount(0);
});

test('Scope_OtherLayoutUnavailable_ShowsNoCountWithoutBlocking', async ({ page }) => {
  await reshaped(page, async (p) => { await rmDisk(p, 'layers/config.html'); await rmDisk(p, 'layers/replay.html'); }); // every other layout is unreadable
  await page.evaluate(() => { const l = window.__logic, orig = l.readText.bind(l); l.readText = async (p, q) => { if (q) await new Promise((r) => setTimeout(r, 500)); return orig(p, q); }; }); // only the quiet (probe) reads are slow
  await allChip(page).click();
  await expect(page.getByText('contando outros layouts…').first()).toBeVisible();
  await page.getByText('Só este', { exact: false }).first().click(); // choosing a scope is not blocked while counting
  expect(await page.evaluate(() => window.__logic.state.scope)).toBe('one');
  await allChip(page).click();
  expect(await page.evaluate(() => window.__logic.state.scope)).toBe('all');
  await expect.poll(() => page.evaluate(() => window.__logic.layoutProbe.size)).toBe(3);
  await expect(page.getByText('contando outros layouts…')).toHaveCount(0);
  await expect(page.getByText('também afeta')).toHaveCount(0); // nothing countable, nothing said
  expect(await page.evaluate(() => [...window.__logic.layoutProbe.values()].every((e) => e.unavailable))).toBe(true);
});

test('Scope_AskPrompt_ShowsAlsoAffectsOtherLayoutsCount', async ({ page }) => {
  await reshaped(page);
  const field = page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();
  await field.click({ clickCount: 3 });
  await page.keyboard.type('0 0 0 3px rgb(1, 2, 3)');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Todos os 2 iguais')).toBeVisible(); // the ask prompt
  await expect(page.getByText('Também afeta Config (3 usos) · Replay (1 uso).')).toBeVisible();
});

test('Scope_AllRestoredOnReload_DoesNotProbeAtLoad', async ({ page }) => {
  await reshaped(page);
  await allChip(page).click();
  await expect.poll(() => page.evaluate(() => window.__logic.layoutProbe.size)).toBe(3);
  await page.waitForTimeout(700); // the session (selection + scope "all") is persisted
  await page.reload();
  await readNodes(page);
  await act(page);
  expect(await page.evaluate(() => window.__logic.state.scope)).toBe('all');
  expect(await page.evaluate(() => window.__logic.state.selId), 'the selection was restored').not.toBe('0');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => ({ size: window.__logic.layoutProbe.size, run: !!window.__logic.probeRun }))).toEqual({ size: 0, run: false });
});

// R16: the line is complete or absent, never partial (a layout missing from the probe cache must not be left out silently).
const alsoLines = (page) => page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /^(também afeta|contando)/.test(e.textContent.trim())).map((e) => e.textContent.trim()));
const settledOn = (page, id) => expect.poll(async () => { await act(page); return page.evaluate((id) => { const l = window.__logic; return !!l.state.project && l.state.project.layoutId === id && l.loadedSeq === l.loadSeq; }, id); }).toBe(true);

test('Scope_AllAfterSwitchOrClear_NeverShowsAPartialLine', async ({ page }) => {
  await reshaped(page);
  await allChip(page).click();
  await expect(page.getByText('também afeta Config (3 usos) · Replay (1 uso)').first()).toBeVisible();
  await act(page, 'switchLayout', 'config');
  await settledOn(page, 'config');
  await act(page, 'setState', { selId: '0.0' }); // a selection that comes back without a gesture
  await page.waitForTimeout(800);
  expect((await alsoLines(page)).join(' | '), 'the probe cache lacks Main: nothing is better than a partial line').toBe('');
  await act(page, 'switchLayout', 'main');
  await settledOn(page, 'main');
  await act(page, 'setState', { selId: '0.0' });
  await page.evaluate(() => window.__logic.ensureProbe()); // refill the cache, then lose ONE entry, what a Reverter-driven clear leaves half-done
  await act(page, 'setState', {});
  await expect(page.getByText('também afeta Config (3 usos) · Replay (1 uso)').first()).toBeVisible();
  await page.evaluate(() => { window.__logic.layoutProbe.delete('config'); window.__logic.setState({}); });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__logic.probeRun)).toBeNull();
  expect((await alsoLines(page)).join(' | ')).toBe('');
});

test('Scope_AllEdit_StartsTheProbeSoTheSharedWriteIsNotSilent', async ({ page }) => {
  await reshaped(page);
  await act(page, 'setState', { scope: 'all', selId: '0.0' }); // no chip click, no select(): only the edit is the gesture
  expect(await page.evaluate(() => window.__logic.layoutProbe.size)).toBe(0);
  const field = page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();
  await field.click({ clickCount: 3 });
  await page.keyboard.type('0 0 0 3px rgb(1, 2, 3)');
  await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() => window.__logic.layoutProbe.size)).toBe(3);
  await expect(page.getByText('também afeta Config (3 usos) · Replay (1 uso)').first()).toBeVisible();
});

// S9.1e Task 3 (Part A): the floating "Aplicar a todos?" prompt has no backdrop, so it must not swallow the camera keys.
test('Scope_PromptVisible_CameraKeysStillWork', async ({ page }) => {
  await page.goto('/?layers=fixtures/axai/');
  await readNodes(page);
  await (await treeRow(page, { title: '.sum-stat' })).click(); // scope stays "ask": the edit raises the prompt
  const field = page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();
  await field.click({ clickCount: 3 });
  await page.keyboard.type('0 0 0 3px rgb(1, 2, 3)');
  await page.keyboard.press('Tab');
  await expect(page.getByText(/Aplicar a todos os \d+ elementos de/)).toBeVisible();
  await act(page);
  const cam = () => page.evaluate(() => { const s = window.__logic.state; return { panX: s.panX, zoom: s.zoom }; });
  const before = await cam();
  await page.keyboard.press('+');
  await expect.poll(async () => (await cam()).zoom).toBeGreaterThan(before.zoom);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await cam()).panX).not.toBe(before.panX);
  await expect(page.getByText(/Aplicar a todos os \d+ elementos de/), 'the prompt is still up').toBeVisible();
});
