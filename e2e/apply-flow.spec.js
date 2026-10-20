import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { connectFixture, selectLayer, readDisk, listDisk, mtimeDisk } from './folder-helpers.js';
import { act, open } from './ctx-helpers.js';

// S5.6: checklist E end to end on a real connected folder (OPFS copy of plain-css): connect, select,
// edit, view the diff, draft, approve, and read the file back. `.card` has one use and no
// box-shadow, so the patch appends one declaration to that rule. Assertions read the folder, never
// the modal log (its wording and the write-log format are not a contract).
const fixture = (rel) => fs.readFileSync(path.resolve('fixtures/plain-css', rel), 'utf8');
const ORIGINAL = fixture('style.css');
const VALUE = '0 0 0 3px rgb(1, 2, 3)';
const DECL = /box-shadow:\s*0 0 0 3px rgb\(1, 2, 3\)/;

const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

async function editCard(page) {
  await connectFixture(page, 'plain-css');
  await selectLayer(page, '.card');
  // single use: no scope chips ("Só este" etc.), the change is auto-decided
  await expect(page.getByText('elemento único — sem irmãos na regra').first()).toBeVisible();
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(VALUE);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
}

async function approveAll(page) {
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Aplicar nos arquivos', { exact: false }).first().click();
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'style.design-draft.css')).toMatch(DECL);
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
  // approve swallows write errors and still reports done: prove the write landed
  await expect.poll(() => readDisk(page, 'style.css')).toMatch(DECL);
}

// Split around the top-level `.card { … }` block (the @media one comes later in the file).
function aroundCard(css) {
  const start = css.indexOf('.card {');
  const end = css.indexOf('}', start) + 1;
  return { before: css.slice(0, start), block: css.slice(start, end), after: css.slice(end) };
}

test('Apply_CardShadowOnConnectedFolder_RewritesOnlyTheRuleWithBakAndHistory', async ({ page }) => {
  await editCard(page);
  expect(await readDisk(page, 'style.css'), 'edits stay in memory until approval').toBe(ORIGINAL);

  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Ver diff', { exact: false }).first().click();
  await expect(page.getByText('1 arquivo(s) · 1 ajuste(s)')).toBeVisible();
  // innermost div holding both the summary and the patched line = the diff modal, not the editor
  const diffModal = page.locator('div')
    .filter({ has: page.getByText('1 arquivo(s) · 1 ajuste(s)') })
    .filter({ hasText: DECL })
    .last();
  await expect(diffModal.getByText(DECL).first()).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).first().click();

  await approveAll(page);

  const now = aroundCard(await readDisk(page, 'style.css'));
  const was = aroundCard(ORIGINAL);
  expect(now.block).toMatch(DECL);
  expect(now.before, 'text before .card untouched').toBe(was.before);
  expect(now.after, 'text after .card untouched (incl. @media .card)').toBe(was.after);

  expect(await readDisk(page, 'style.css.bak'), '.bak keeps the original').toBe(ORIGINAL);
  const hist = await listDisk(page, '.design-history');
  expect(hist).toHaveLength(1);
  expect(hist[0]).toMatch(/^style\.css\./);
  expect(await readDisk(page, '.design-history/' + hist[0])).toBe(ORIGINAL);

  expect(await listDisk(page), 'only .bak and history added; no draft, no .tmp').toEqual(
    ['.design-history', 'index.html', 'layers.json', 'style.css', 'style.css.bak']);
  expect(await readDisk(page, 'index.html'), 'mock untouched').toBe(fixture('index.html'));
  expect(await readDisk(page, 'layers.json'), 'manifest untouched').toBe(fixture('layers.json'));
});

test('Apply_AprovarWhileDrafting_IsNotAvailable', async ({ page }) => {
  await editCard(page);
  await act(page); // exposes window.__logic
  await page.evaluate(() => {
    const l = window.__logic, orig = l.writeText.bind(l);
    window.__writes = 0; window.__origWrite = orig;
    l.writeText = async (...a) => { try { await new Promise((r) => setTimeout(r, 1200)); return await orig(...a); } finally { window.__writes++; } };
  });
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Aplicar nos arquivos', { exact: false }).first().click();
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  // the draft write is still in flight: neither button renders, and the handlers refuse too
  await expect.poll(() => page.evaluate(() => window.__logic.state.modal && window.__logic.state.modal.stage)).toBe('draft');
  expect(await page.evaluate(() => window.__writes), 'the draft write is still pending').toBe(0);
  await expect(page.getByRole('button', { name: /Aprovar, substituir e commitar/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Descartar rascunho/ })).toHaveCount(0);
  await page.evaluate(() => window.__logic.approve());
  expect(await page.evaluate(() => window.__logic.state.history.length), 'approve refused while drafting').toBe(0);
  expect(await readDisk(page, 'style.css'), 'the original stays untouched').toBe(ORIGINAL);
  // once the draft is ready the buttons come back and approving works
  await expect.poll(() => readDisk(page, 'style.design-draft.css')).toMatch(DECL);
  await expect(page.getByRole('button', { name: /Aprovar, substituir e commitar/ })).toBeVisible();
  await page.evaluate(() => { window.__logic.writeText = window.__origWrite; }); // approving needs no slowdown
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
  await expect.poll(() => readDisk(page, 'style.css')).toMatch(DECL);
});

// S9.1e Task 3 (Part A): two files in the plan, the second write is slow: Aprovar waits for BOTH drafts.
test('Apply_TwoFilePlanSlowSecondWrite_AprovarAppearsOnlyAfterBothDrafts', async ({ page }) => {
  await pendingInTwoLayouts(page, SHADOW_A, SHADOW_A);
  await page.evaluate(() => {
    const l = window.__logic, orig = l.writeText.bind(l);
    window.__slowDone = false;
    l.writeText = async (p, ...a) => { if (!/config\.design-draft/.test(p)) return orig(p, ...a); await new Promise((r) => setTimeout(r, 1500)); try { return await orig(p, ...a); } finally { window.__slowDone = true; } };
  });
  await openPlan(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'layers/shared.design-draft.css')).toMatch(/box-shadow/); // the first file is drafted
  expect(await page.evaluate(() => window.__slowDone), 'the second write is still pending').toBe(false);
  await expect(page.getByRole('button', { name: /Aprovar, substituir e commitar/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Aprovar, substituir e commitar/ })).toBeVisible({ timeout: 10_000 });
  expect(await page.evaluate(() => window.__slowDone), 'Aprovar only after the last draft').toBe(true);
  expect(await readDisk(page, 'layers/config.design-draft.css')).toMatch(/box-shadow/);
});

// A draft run whose modal was closed (and reopened) mid-write must not leave a draft file behind, nor run beside the next one.
test('Apply_CloseAndReopenMidDraft_LeavesNoOrphanAndApprovePromotesTheRightContent', async ({ page }) => {
  await editCard(page);
  await act(page);
  await page.evaluate(() => {
    const l = window.__logic, orig = l.writeText.bind(l);
    window.__origWrite = orig; window.__writes = 0;
    l.writeText = async (...a) => { window.__inWrite = true; await new Promise((r) => setTimeout(r, 1500)); try { return await orig(...a); } finally { window.__writes++; } };
  });
  await openPlan(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => page.evaluate(() => !!window.__inWrite)).toBe(true); // the slow write has started
  await page.getByRole('button', { name: 'Fechar' }).first().click(); // closed while the write is in flight
  await openPlan(page);
  const run = await page.evaluate(() => window.__logic.draftRun);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click(); // refused: the previous run is still writing
  expect(await page.evaluate(() => window.__logic.draftRun), 'no second run beside the first').toBe(run);
  expect(await page.evaluate(() => window.__logic.state.modal.stage)).toBe('plan');
  await expect.poll(() => page.evaluate(() => window.__writes)).toBe(1); // the superseded write landed
  await expect.poll(() => page.evaluate(() => !window.__logic.draftBusy)).toBe(true);
  await expect.poll(() => listDisk(page), 'the superseded run removed what it wrote').not.toContain('style.design-draft.css');
  await page.evaluate(() => { window.__logic.writeText = window.__origWrite; });
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'style.design-draft.css')).toMatch(DECL);
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
  await expect.poll(() => readDisk(page, 'style.css')).toMatch(DECL);
  await page.waitForTimeout(300);
  expect(await listDisk(page), 'no draft left after approve').toEqual(['.design-history', 'index.html', 'layers.json', 'style.css', 'style.css.bak']);
});

test('Apply_DraftLoopThrows_StillClearsDrafting', async ({ page }) => {
  await editCard(page);
  await act(page);
  await openPlan(page);
  await page.evaluate(() => { const l = window.__logic, orig = l.log.bind(l); l.log = (line) => { if (/^Rascunho paralelo pronto/.test(line)) throw new Error('boom'); return orig(line); }; });
  await page.evaluate(() => window.__logic.makeDraft().catch(() => {})); // the throw escapes the loop's own try/catch
  expect(await page.evaluate(() => window.__logic.state.modal.drafting), 'finally cleared the flag').toBe(false);
  expect(await page.evaluate(() => window.__logic.draftBusy), 'and the in-flight marker').toBeFalsy();
});

// S9.1e Task 3 fix wave: the draft file and its mtime guard.
const BOOM_DRAFT = () => { const l = window.__logic, orig = l.writeText.bind(l); l.writeText = async (p, ...a) => { if (/design-draft/.test(p)) { window.__inWrite = true; await new Promise((r) => setTimeout(r, 800)); await l.fileHandle(p, true); window.__thrown = true; throw new Error('boom'); } return orig(p, ...a); }; }; // creates the empty draft like writeText does, then fails

test('Apply_DiscardThenDraftAgain_WritesTheNewDraft', async ({ page }) => {
  await editCard(page);
  await openPlan(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'style.design-draft.css')).toMatch(DECL);
  await page.getByRole('button', { name: /Descartar rascunho/ }).click();
  await expect.poll(() => listDisk(page)).not.toContain('style.design-draft.css');
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'style.design-draft.css'), 'the second draft carries the patch, not an empty file').toMatch(DECL);
});

test('Apply_ApplyTwiceOnTheSameFileWithoutReload_SecondValueLands', async ({ page }) => {
  await editCard(page);
  await approveAll(page);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type('0 0 0 5px rgb(9, 8, 7)');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  await openPlan(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'style.design-draft.css')).toMatch(/box-shadow:\s*0 0 0 5px rgb\(9, 8, 7\)/);
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
  await expect.poll(() => readDisk(page, 'style.css')).toMatch(/box-shadow:\s*0 0 0 5px rgb\(9, 8, 7\)/);
  expect(await readDisk(page, 'style.css')).not.toBe('');
});

test('Apply_EmptyDraft_IsRefusedAndNothingIsWritten', async ({ page }) => {
  await editCard(page);
  await openPlan(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'style.design-draft.css')).toMatch(DECL);
  await page.evaluate(async () => { const w = await (await window.__proj.getFileHandle('style.design-draft.css')).createWritable(); await w.write(''); await w.close(); }); // a draft emptied outside
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
  await expect(page.getByText(/style\.css: rascunho vazio/)).toBeVisible();
  expect(await readDisk(page, 'style.css'), 'the original CSS is never overwritten with nothing').toBe(ORIGINAL);
});

test('Apply_FailedDraftWrite_LeavesNoEmptyDraft', async ({ page }) => {
  await editCard(page);
  await act(page);
  await openPlan(page);
  await page.evaluate(BOOM_DRAFT);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect(page.getByText(/✗ style\.css: boom/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => !window.__logic.draftBusy)).toBe(true);
  expect(await listDisk(page), 'no 0-byte draft left behind').not.toContain('style.design-draft.css');
});

const HAND = '/* hand edit */\n.keep-me { color: teal }\n';
async function handEditedDraft(page) {
  await editCard(page);
  await act(page);
  await openPlan(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'style.design-draft.css')).toMatch(DECL);
  await page.evaluate(async (text) => { const w = await (await window.__proj.getFileHandle('style.design-draft.css')).createWritable(); await w.write(text); await w.close(); }, HAND);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await openPlan(page);
}

test('Apply_HandEditedDraft_SurvivesReopenAndGerar', async ({ page }) => {
  await handEditedDraft(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click(); // the guard refuses to overwrite the edit
  await expect(page.getByText(/style\.css: .*mudou fora do LAYERS/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => !window.__logic.draftBusy)).toBe(true);
  expect(await readDisk(page, 'style.design-draft.css'), 'the hand edit is not deleted').toBe(HAND);
});

test('Apply_SupersededRunWithPreExistingDraft_KeepsIt', async ({ page }) => {
  await handEditedDraft(page);
  await page.evaluate(() => { const l = window.__logic, orig = l.writeText.bind(l); l.writeText = async (...a) => { window.__inWrite = true; await new Promise((r) => setTimeout(r, 800)); return orig(...a); }; });
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => page.evaluate(() => !!window.__inWrite)).toBe(true);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await openPlan(page);
  await expect.poll(() => page.evaluate(() => !window.__logic.draftBusy)).toBe(true);
  expect(await readDisk(page, 'style.design-draft.css'), 'a draft the dead run never wrote stays').toBe(HAND);
});

test('Apply_SupersededRunFailing_LogsNothingIntoTheNewModalAndLeavesNoDraft', async ({ page }) => {
  await editCard(page);
  await act(page);
  await openPlan(page);
  await page.evaluate(BOOM_DRAFT);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => page.evaluate(() => !!window.__inWrite)).toBe(true);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  expect(await page.evaluate(() => !!window.__thrown), 'the write had not failed yet: the run is superseded when it throws').toBe(false);
  await openPlan(page);
  await expect.poll(() => page.evaluate(() => !window.__logic.draftBusy)).toBe(true);
  expect(await page.evaluate(() => !!window.__thrown)).toBe(true);
  expect(await page.evaluate(() => window.__logic.state.modal.log.join('\n')), 'the dead run says nothing in the new modal').not.toMatch(/boom|rascunho gravado/);
  expect(await listDisk(page)).not.toContain('style.design-draft.css');
});

test('Rollback_AfterApply_RestoresOriginalFile', async ({ page }) => {
  await editCard(page);
  await approveAll(page);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await page.getByRole('button', { name: 'Rollback' }).click();
  await expect.poll(() => readDisk(page, 'style.css')).toBe(ORIGINAL);
});

test('Rollback_FileChangedOutside_RefusesAndKeepsFile', async ({ page }) => {
  await editCard(page);
  await approveAll(page);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  const before = await mtimeDisk(page, 'style.css');
  const outside = (await readDisk(page, 'style.css')) + '\n/* changed outside LAYERS */\n';
  await page.evaluate(async (text) => {
    const w = await (await window.__proj.getFileHandle('style.css')).createWritable();
    await w.write(text);
    await w.close();
  }, outside);
  // the guard compares mtimes: wait until the external write is visibly later than approve's
  await expect.poll(() => mtimeDisk(page, 'style.css')).not.toBe(before);
  await page.getByRole('button', { name: 'Rollback' }).click();
  await expect(page.getByText(/Reverter recusado/)).toBeVisible();
  expect(await readDisk(page, 'style.css')).toBe(outside);
});

// S9.1d Task 4: Salvar merges the pending changes of EVERY layout (multi-layout fixture, connected folder).
// main and config both style `.title` (layers/shared.css); config also styles `.panel` (layers/config.css).
const SHADOW_A = '0 0 0 3px rgb(1, 2, 3)';
const SHADOW_B = '0 0 0 5px rgb(9, 8, 7)';
const settled = (page, id) => expect.poll(async () => { await act(page); return page.evaluate((id) => { const l = window.__logic; return !!l.state.project && l.state.project.layoutId === id && l.loadedSeq === l.loadSeq; }, id); }).toBe(true);
const storedPending = (page) => page.evaluate(() => { const raw = localStorage.getItem('layers/v1/pending'); return raw ? (JSON.parse(raw).byProject || {}) : {}; });
const count = (text, re) => (text.match(re) || []).length;

async function editNode(page, id, value) {
  await act(page, 'select', id);
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(value);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
}

// config gets `.title` (shadow `cfgTitle`) and `.panel`; back on main `.title` gets `mainTitle`. Ends on main with 1 change and config pending in storage.
async function pendingInTwoLayouts(page, mainTitle, cfgTitle) {
  await open(page, 'multi-layout');
  await act(page);
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await editNode(page, '0.0', cfgTitle);
  await editNode(page, '0.1', SHADOW_B);
  expect(await page.evaluate(() => window.__logic.state.changes.length)).toBe(2);
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  await editNode(page, '0.0', mainTitle);
  expect(await page.evaluate(() => window.__logic.state.changes.length)).toBe(1);
}

async function openPlan(page) {
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Aplicar nos arquivos', { exact: false }).first().click();
}

async function draftAndApprove(page, draft = 'layers/shared.design-draft.css') {
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, draft)).toMatch(/box-shadow/); // real content: writeText creates an empty file before the .tmp move
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
}

test('Apply_PendingInTwoLayouts_WritesOnceAndClearsBoth', async ({ page }) => {
  await pendingInTwoLayouts(page, SHADOW_A, SHADOW_A); // same file|selector|prop in both layouts, same value
  await openPlan(page);
  await expect(page.getByText('layers/config.css').first()).toBeVisible();
  await expect(page.getByText(/\[Config, Main\]/)).toBeVisible(); // shared.css carries both origins
  await expect(page.getByText(/\[Config\]/)).toBeVisible();
  await draftAndApprove(page);
  const shared = await readDisk(page, 'layers/shared.css');
  expect(count(shared, /box-shadow/g), 'one declaration for the shared rule').toBe(1);
  expect(shared).toMatch(/\.title\{[^}]*box-shadow:\s*0 0 0 3px rgb\(1, 2, 3\)/);
  expect(await readDisk(page, 'layers/config.css')).toMatch(/\.panel\{[^}]*box-shadow:\s*0 0 0 5px rgb\(9, 8, 7\)/);
  expect(await page.evaluate(() => window.__logic.writeLog.filter((w) => w.path === 'layers/shared.css').length), 'shared.css written once').toBe(1);
  await expect.poll(() => storedPending(page)).toEqual({}); // both layouts' entries are gone
  expect(await page.evaluate(() => Object.keys(window.__logic.state.layoutBadges))).toEqual([]);
  expect(await page.evaluate(() => Object.keys(window.__logic.state.layoutPend))).toEqual([]);
  await expect(page.getByRole('button', { name: /^Salvar$/ })).toBeVisible(); // nothing left to count
  expect(await page.evaluate(() => window.__logic.undoS.length + window.__logic.redoS.length)).toBe(0);
  // history keeps the merged set, and the other layout's undo hash is not read as drift on return
  expect(await page.evaluate(() => window.__logic.state.history[0].changes.map((c) => c.layoutId).sort())).toEqual(['config', 'main']);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect(await page.evaluate(() => window.__logic.state.changes.length)).toBe(0);
  // a step made in the included layout after the apply survives a round trip (its undo hash was reset, not left stale)
  await editNode(page, '0.1', SHADOW_A);
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect(await page.evaluate(() => window.__logic.undoS.map((x) => x.layoutId))).toEqual(['config']);
});

// S9.1e Task 3: the badge, Ver diff and Exportar speak for EVERY layout with stored adjustments, not only the mounted one.
const exportDir = (page) => page.evaluate(async () => { window.__exp = await (await navigator.storage.getDirectory()).getDirectoryHandle('export', { create: true }); window.showDirectoryPicker = async () => window.__exp; });
const readExport = (page, rel) => page.evaluate(async (rel) => {
  try { let d = window.__exp; const parts = rel.split('/'); for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p); return await (await (await d.getFileHandle(parts[parts.length - 1])).getFile()).text(); } catch (e) { return null; }
}, rel);
const openDiffUi = async (page) => { await page.getByText('Ações', { exact: false }).first().click(); await page.getByText('Ver diff', { exact: false }).first().click(); };

test('Salvar_OtherLayoutPending_BadgeDiffAndExportCountEveryLayout', async ({ page }) => {
  await pendingInTwoLayouts(page, SHADOW_A, SHADOW_A); // main: 1 change; config: 2 stored (.title merges with main's, .panel is config only)
  const sharedBefore = await readDisk(page, 'layers/shared.css'), configBefore = await readDisk(page, 'layers/config.css');
  await expect(page.getByRole('button', { name: 'Salvar (3)' })).toBeVisible(); // 1 active + 2 stored elsewhere
  await openDiffUi(page);
  await expect(page.getByText('2 arquivo(s) · 2 ajuste(s)')).toBeVisible(); // the merged set: shared .title (both layouts) + config .panel
  expect(await page.evaluate(() => window.__logic.state.diff.map((d) => d.path).sort())).toEqual(['layers/config.css', 'layers/shared.css']);
  expect(await page.evaluate(() => JSON.stringify(window.__logic.state.diff.find((d) => d.path === 'layers/config.css').lines))).toMatch(/box-shadow:\s*0 0 0 5px rgb\(9, 8, 7\)/);
  await act(page, 'setState', { diff: null });
  await exportDir(page);
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Exportar versões completas…').click();
  await expect(page.getByText('✓ layers-changes.json (manifesto)')).toBeVisible();
  expect(await readExport(page, 'layers/shared.css')).toMatch(/\.title\{[^}]*box-shadow:\s*0 0 0 3px rgb\(1, 2, 3\)/);
  expect(await readExport(page, 'layers/config.css')).toMatch(/\.panel\{[^}]*box-shadow:\s*0 0 0 5px rgb\(9, 8, 7\)/);
  expect(JSON.parse(await readExport(page, 'layers-changes.json'))).toHaveLength(2);
  expect(await readDisk(page, 'layers/shared.css'), 'the project folder is only read').toBe(sharedBefore);
  expect(await readDisk(page, 'layers/config.css')).toBe(configBefore);
  expect((await storedPending(page))['folder:proj|config'].changes, 'diff and export keep the stored adjustments').toHaveLength(2);
});

test('Salvar_OnlyOtherLayoutHasPending_DiffAndExportStillWork', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await editNode(page, '0.1', SHADOW_B);
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  expect(await page.evaluate(() => window.__logic.state.changes.length)).toBe(0);
  await expect(page.getByRole('button', { name: 'Salvar (1)' })).toBeVisible();
  await openDiffUi(page);
  await expect(page.getByText('1 arquivo(s) · 1 ajuste(s)')).toBeVisible();
  expect(await page.evaluate(() => window.__logic.state.diff.map((d) => d.path))).toEqual(['layers/config.css']);
  await act(page, 'setState', { diff: null });
  await exportDir(page);
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Exportar versões completas…').click();
  await expect(page.getByText('✓ layers-changes.json (manifesto)')).toBeVisible();
  expect(await readExport(page, 'layers/config.css')).toMatch(/\.panel\{[^}]*box-shadow:\s*0 0 0 5px rgb\(9, 8, 7\)/);
});

test('Salvar_OtherLayoutStaleHash_DiffSkipsItAndWarnsLikeSalvar', async ({ page }) => {
  await pendingInTwoLayouts(page, SHADOW_A, SHADOW_A);
  await page.evaluate(() => window.__logic.ensureProbe());
  await page.waitForTimeout(60);
  const moved = (await readDisk(page, 'layers/config.css')) + '\n.field{color:teal}\n';
  await page.evaluate(async (text) => { const d = await window.__proj.getDirectoryHandle('layers'); const w = await (await d.getFileHandle('config.css')).createWritable(); await w.write(text); await w.close(); }, moved);
  await expect(page.getByRole('button', { name: 'Salvar (3)' })).toBeVisible(); // the badge is a hint of what is stored, the skipped layout still counts
  await openDiffUi(page);
  await expect(page.getByText('2 pendências de Config não aplicadas (fonte mudou); serão descartadas ao abrir o layout')).toBeVisible();
  expect(await page.evaluate(() => window.__logic.state.diff.map((d) => d.path))).toEqual(['layers/shared.css']);
});

test('Salvar_OnlyOtherLayoutAndItIsStale_DiffAndExportToastAndWriteNothing', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await editNode(page, '0.1', SHADOW_B);
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  await page.evaluate(() => window.__logic.ensureProbe());
  await page.waitForTimeout(60);
  const moved = (await readDisk(page, 'layers/config.css')) + '\n.field{color:teal}\n';
  await page.evaluate(async (text) => { const d = await window.__proj.getDirectoryHandle('layers'); const w = await (await d.getFileHandle('config.css')).createWritable(); await w.write(text); await w.close(); }, moved);
  const warn = '1 pendência de Config não aplicada (fonte mudou); serão descartadas ao abrir o layout';
  await openDiffUi(page);
  await expect(page.getByText(warn)).toBeVisible();
  expect(await page.evaluate(() => window.__logic.state.diff), 'no empty diff modal').toBeNull();
  await act(page, 'setState', { toast: null });
  await exportDir(page);
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Exportar versões completas…').click();
  await expect(page.getByText(warn)).toBeVisible();
  expect(await page.evaluate(() => window.__logic.state.modal), 'no export modal').toBeNull();
  expect(await readExport(page, 'layers-changes.json'), 'nothing was exported').toBeNull();
});

test('Salvar_SingleLayoutProject_BadgeDiffAndExportTakeTheOldPath', async ({ page }) => {
  await editCard(page);
  await act(page);
  expect(await page.evaluate(() => Object.keys(window.__logic.state.layoutPend || {}))).toEqual([]);
  await page.evaluate(() => { const l = window.__logic, o = l.buildSaveSet.bind(l); window.__bss = 0; l.buildSaveSet = (...a) => { window.__bss++; return o(...a); }; });
  await expect(page.getByRole('button', { name: 'Salvar (1)' })).toBeVisible();
  await openDiffUi(page);
  await expect(page.getByText('1 arquivo(s) · 1 ajuste(s)')).toBeVisible();
  await act(page, 'setState', { diff: null });
  await exportDir(page);
  await page.getByText('Ações', { exact: false }).first().click();
  await page.getByText('Exportar versões completas…').click();
  await expect(page.getByText('✓ layers-changes.json (manifesto)')).toBeVisible();
  expect(await page.evaluate(() => window.__bss), 'no merged set for one layout').toBe(0);
});

test('Apply_OtherLayoutStaleHash_IsSkippedWithWarning', async ({ page }) => {
  await pendingInTwoLayouts(page, SHADOW_A, SHADOW_A);
  await page.evaluate(() => window.__logic.ensureProbe()); // the probe cache exists BEFORE the disk change
  expect(await page.evaluate(() => window.__logic.layoutProbe.has('config'))).toBe(true);
  await page.waitForTimeout(60);
  const moved = (await readDisk(page, 'layers/config.css')) + '\n.field{color:teal}\n';
  await page.evaluate(async (text) => { const d = await window.__proj.getDirectoryHandle('layers'); const w = await (await d.getFileHandle('config.css')).createWritable(); await w.write(text); await w.close(); }, moved);
  await openPlan(page);
  await expect(page.getByText('2 pendências de Config não aplicadas (fonte mudou); serão descartadas ao abrir o layout')).toBeVisible();
  await expect(page.getByText('layers/shared.css').first()).toBeVisible();
  await expect(page.getByText('layers/config.css')).toHaveCount(0); // not in the plan
  await draftAndApprove(page);
  expect(await readDisk(page, 'layers/config.css'), 'the skipped layout wrote nothing').toBe(moved);
  expect(count(await readDisk(page, 'layers/shared.css'), /box-shadow/g)).toBe(1);
  await expect.poll(async () => Object.keys(await storedPending(page)), 'the applied entry goes and the skipped layout keeps its pending').toEqual(['folder:proj|config']);
  expect((await storedPending(page))['folder:proj|config'].changes).toHaveLength(2);
  expect(await page.evaluate(() => window.__logic.state.layoutBadges)).toEqual({ config: 2 });
  expect(await page.evaluate(() => ({ ...window.__logic.state.layoutPend }))).toEqual({ config: 2 }); // the skipped layout keeps counting
  // the wording says "serão descartadas": here they are (shared.css and config.css both moved)
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect(await page.evaluate(() => window.__logic.state.changes.length)).toBe(0);
  await expect(page.getByText(/2 ajuste\(s\) salvo\(s\) descartado\(s\): arquivo mudou/)).toBeVisible();
});

test('Apply_ConflictingValue_ActiveWinsAndWarns', async ({ page }) => {
  await pendingInTwoLayouts(page, SHADOW_A, SHADOW_B); // same rule and property, different values
  await openPlan(page);
  await expect(page.getByText(/conflito.*\.title.*Main.*Config/)).toBeVisible();
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'layers/shared.design-draft.css')).toMatch(/box-shadow/); // real content: writeText creates an empty file before the .tmp move
  const draft = await readDisk(page, 'layers/shared.design-draft.css');
  expect(draft).toContain('rgb(1, 2, 3)');
  expect(draft).not.toContain('rgb(9, 8, 7)');
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
  const shared = await readDisk(page, 'layers/shared.css');
  expect(count(shared, /box-shadow/g)).toBe(1);
  expect(shared).toContain('rgb(1, 2, 3)');
  await expect.poll(() => storedPending(page)).toEqual({});
});

test('Apply_OnlyOtherLayoutHasPending_SalvarStillOpens', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  const sharedBefore = await readDisk(page, 'layers/shared.css');
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await editNode(page, '0.1', SHADOW_B); // config.css `.panel`
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  expect(await page.evaluate(() => window.__logic.state.changes.length)).toBe(0); // nothing pending here
  await openPlan(page);
  await expect(page.getByText(/layers\/config\.css/).first()).toBeVisible();
  await expect(page.getByText(/\[Config\]/)).toBeVisible();
  await draftAndApprove(page, 'layers/config.design-draft.css');
  expect(await readDisk(page, 'layers/config.css')).toMatch(/\.panel\{[^}]*box-shadow:\s*0 0 0 5px rgb\(9, 8, 7\)/);
  expect(await readDisk(page, 'layers/shared.css')).toBe(sharedBefore);
  await expect.poll(() => storedPending(page)).toEqual({});
});

test('Rollback_MergedApply_RestoresEveryLayoutFileAndLeavesTheMountedDomAlone', async ({ page }) => {
  await pendingInTwoLayouts(page, SHADOW_A, SHADOW_A);
  const sharedBefore = await readDisk(page, 'layers/shared.css'), configBefore = await readDisk(page, 'layers/config.css');
  await openPlan(page);
  await draftAndApprove(page);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  // main's own `.title` keeps its inline shadow; config's `.panel` (same id 0.1 as main's `.box`) must NOT be touched on main's DOM
  await act(page, 'select', '0.1');
  await page.evaluate(() => { const h = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount); window.__boxEl = h.shadowRoot.querySelector('#main-a'); window.__boxEl.style.boxShadow = '1px 1px 0 red'; });
  await page.getByRole('button', { name: 'Rollback' }).click();
  await expect.poll(() => readDisk(page, 'layers/shared.css')).toBe(sharedBefore);
  expect(await readDisk(page, 'layers/config.css')).toBe(configBefore);
  expect(await page.evaluate(() => window.__boxEl.style.boxShadow)).toContain('red');
});

test('Apply_FileNotWritten_KeepsThatLayoutsPending', async ({ page }) => {
  await pendingInTwoLayouts(page, SHADOW_A, SHADOW_A);
  await openPlan(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'layers/config.design-draft.css')).toMatch(/box-shadow/); // real content: writeText creates an empty file before the .tmp move
  await page.evaluate(async () => { await (await window.__proj.getDirectoryHandle('layers')).removeEntry('config.design-draft.css'); }); // config.css cannot be promoted
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
  await expect(page.getByText('pendências de Config não aplicadas (arquivo não gravado); podem ser descartadas ao abrir o layout se a fonte compartilhada mudou')).toBeVisible();
  await expect.poll(async () => Object.keys(await storedPending(page))).toEqual(['folder:proj|config']);
  expect((await storedPending(page))['folder:proj|config'].changes).toHaveLength(2);
  expect(count(await readDisk(page, 'layers/shared.css'), /box-shadow/g)).toBe(1);
  expect(await page.evaluate(() => window.__logic.undoS.map((x) => x.layoutId).sort()), 'only the layout whose changes went loses its steps').toEqual(['config', 'config']);
  // the kept entry does not survive opening the layout: shared.css was rewritten, so its hash no longer matches
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  expect(await page.evaluate(() => window.__logic.state.changes.length)).toBe(0);
  await expect(page.getByText(/2 ajuste\(s\) salvo\(s\) descartado\(s\): arquivo mudou/)).toBeVisible();
});

test('Apply_ActiveFileNotWritten_KeepsTheActiveChange', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await editNode(page, '0.0', SHADOW_A); // main `.title` -> layers/shared.css
  await openPlan(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'layers/shared.design-draft.css')).toMatch(/box-shadow/); // real content: writeText creates an empty file before the .tmp move
  await page.evaluate(async () => { await (await window.__proj.getDirectoryHandle('layers')).removeEntry('shared.design-draft.css'); });
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
  expect(count(await readDisk(page, 'layers/shared.css'), /box-shadow/g)).toBe(0);
  expect(await page.evaluate(() => window.__logic.state.changes.length), 'the change whose file was not written stays').toBe(1);
});

test('Apply_ActiveFileNotWritten_KeepsItsUndoSteps', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await editNode(page, '0.0', SHADOW_A);
  expect(await page.evaluate(() => window.__logic.undoS.length)).toBe(1);
  await openPlan(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'layers/shared.design-draft.css')).toMatch(/box-shadow/); // real content: writeText creates an empty file before the .tmp move
  await page.evaluate(async () => { await (await window.__proj.getDirectoryHandle('layers')).removeEntry('shared.design-draft.css'); });
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
  expect(await page.evaluate(() => window.__logic.state.changes.length)).toBe(1);
  expect(await page.evaluate(() => window.__logic.undoS.length), 'nothing was written: the step still undoes the kept change').toBe(1);
});

test('Apply_WrittenButDraftNotRemoved_ClearsTheChange', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await editNode(page, '0.0', SHADOW_A);
  await openPlan(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'layers/shared.design-draft.css')).toMatch(/box-shadow/); // real content: writeText creates an empty file before the .tmp move
  // the file is replaced, only the cleanup of the draft fails: the change is applied all the same
  await page.evaluate(() => { const l = window.__logic, orig = l.dirOf.bind(l); l.dirOf = async (p) => { const d = await orig(p); return new Proxy(d, { get: (t, k) => k === 'removeEntry' ? async () => { throw new Error('draft locked'); } : typeof t[k] === 'function' ? t[k].bind(t) : t[k] }); }; });
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
  expect(count(await readDisk(page, 'layers/shared.css'), /box-shadow/g)).toBe(1);
  expect(await page.evaluate(() => window.__logic.state.changes.length), 'shared.css was written: the change is applied').toBe(0);
});

test('Rollback_WrittenButDraftNotRemoved_RestoresTheFileAndTheInlineStyle', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  const before = await readDisk(page, 'layers/shared.css');
  await editNode(page, '0.0', SHADOW_A);
  await openPlan(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'layers/shared.design-draft.css')).toMatch(/box-shadow/); // real content: writeText creates an empty file before the .tmp move
  await page.evaluate(() => { const l = window.__logic, orig = l.dirOf.bind(l); l.dirOf = async (p) => { const d = await orig(p); return new Proxy(d, { get: (t, k) => k === 'removeEntry' ? async () => { throw new Error('draft locked'); } : typeof t[k] === 'function' ? t[k].bind(t) : t[k] }); }; });
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
  await expect(page.getByText(/rascunho não removido/)).toBeVisible(); // a warning, not a failure of the replaced file
  expect(await page.evaluate(() => window.__logic.state.history[0].files.map((f) => f.path))).toEqual(['layers/shared.css']);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await page.getByRole('button', { name: 'Rollback' }).click();
  await expect.poll(() => readDisk(page, 'layers/shared.css')).toBe(before);
  expect(await page.evaluate(() => { const h = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount); return h.shadowRoot.getElementById('main-title').style.boxShadow; })).toBe('');
});

test('Apply_OneOfTwoCssFilesNotWritten_KeepsOnlyThatChangeAndRestoresItAfterSwitch', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await editNode(page, '0.0', SHADOW_A); // main `.title` -> layers/shared.css
  await editNode(page, '0.1', SHADOW_B); // main `.box` -> layers/main.css
  expect(await page.evaluate(() => window.__logic.state.changes.length)).toBe(2);
  await openPlan(page);
  await page.getByRole('button', { name: /Gerar rascunho paralelo/ }).click();
  await expect.poll(() => readDisk(page, 'layers/main.design-draft.css')).toMatch(/box-shadow/); // real content: writeText creates an empty file before the .tmp move
  await page.evaluate(async () => { await (await window.__proj.getDirectoryHandle('layers')).removeEntry('main.design-draft.css'); });
  await page.getByRole('button', { name: /Aprovar, substituir e commitar/ }).click();
  await expect(page.getByText('3 · aprovado e substituído')).toBeVisible();
  expect(count(await readDisk(page, 'layers/shared.css'), /box-shadow/g)).toBe(1);
  expect(count(await readDisk(page, 'layers/main.css'), /box-shadow/g)).toBe(0);
  expect(await page.evaluate(() => window.__logic.state.changes.map((c) => c.prop))).toEqual(['boxShadow']);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  // the kept change is stored under the hash that already counts the shared.css write: leaving and coming back restores it
  await expect.poll(async () => Object.values(await storedPending(page)).reduce((n, e) => n + e.changes.length, 0)).toBe(1);
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  expect(await page.evaluate(() => window.__logic.state.changes.length)).toBe(1);
  await expect(page.getByText(/ajuste\(s\) salvo\(s\) descartado\(s\)/)).toHaveCount(0);
});

test('Apply_ActiveContributedNothing_KeepsItsRedoStack', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await editNode(page, '0.1', SHADOW_B);
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  await editNode(page, '0.0', SHADOW_A);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('Control+z');
  await expect.poll(() => page.evaluate(() => window.__logic.state.changes.length)).toBe(0);
  expect(await page.evaluate(() => ({ u: window.__logic.undoS.map((x) => x.layoutId), r: window.__logic.redoS.map((x) => x.layoutId) }))).toEqual({ u: ['config'], r: ['main'] });
  await openPlan(page);
  await draftAndApprove(page, 'layers/config.design-draft.css');
  expect(await page.evaluate(() => ({ u: window.__logic.undoS.map((x) => x.layoutId), r: window.__logic.redoS.map((x) => x.layoutId) }))).toEqual({ u: [], r: ['main'] }); // main contributed nothing: its redo step stays
});

test('Rollback_TwoActiveChangesSameRule_RestoresBothInlineStyles', async ({ page }) => {
  // `.title` on a leaf and on a container: two changes (different use groups) that collide on file|selector|prop in the merged plan
  const html = '<!doctype html>\n<html><head><meta charset="utf-8"><link rel="stylesheet" href="main.css"></head>\n<body><div class="title" id="main-title">Main</div><div class="title" id="main-title2"><span>in</span></div><div class="box" id="main-a">empty</div></body></html>\n';
  await open(page, 'multi-layout');
  await act(page);
  await page.evaluate(async (html) => { const d = await window.__proj.getDirectoryHandle('layers'); const w = await (await d.getFileHandle('main.html', { create: true })).createWritable(); await w.write(html); await w.close(); }, html);
  await act(page, 'doReload');
  await settled(page, 'main');
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await editNode(page, '0.0', SHADOW_A); // config `.title`: another layout is included
  await act(page, 'switchLayout', 'main');
  await settled(page, 'main');
  await editNode(page, '0.0', SHADOW_A);
  await editNode(page, '0.1', SHADOW_B);
  expect(await page.evaluate(() => window.__logic.state.changes.length)).toBe(2);
  await openPlan(page);
  await draftAndApprove(page);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await page.getByRole('button', { name: 'Rollback' }).click();
  await expect.poll(() => page.evaluate(() => {
    const h = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
    return ['main-title', 'main-title2'].map((id) => h.shadowRoot.getElementById(id).style.boxShadow);
  })).toEqual(['', '']);
});

test('Apply_PlanWhileLoading_HasNoDraftButtonYet', async ({ page }) => {
  await pendingInTwoLayouts(page, SHADOW_A, SHADOW_A);
  await page.evaluate(() => { const l = window.__logic, orig = l.readText.bind(l); l.readText = async (p, q) => { if (q) await new Promise((r) => setTimeout(r, 700)); return orig(p, q); }; });
  await page.evaluate(() => window.__logic.layoutProbe.clear());
  await openPlan(page);
  await expect(page.getByText('contando outros layouts…')).toBeVisible();
  await expect(page.getByRole('button', { name: /Gerar rascunho paralelo/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Gerar rascunho paralelo/ })).toBeVisible({ timeout: 10_000 });
});

test('Rollback_LegacyChangeWithoutLayoutId_LeavesTheOtherLayoutAlone', async ({ page }) => {
  await open(page, 'multi-layout');
  await act(page);
  const sharedBefore = await readDisk(page, 'layers/shared.css');
  await editNode(page, '0.0', SHADOW_A);
  await page.evaluate(() => { window.__logic.state.changes.forEach((c) => { delete c.layoutId; }); }); // the shape of a pending change stored before S9.1d
  await openPlan(page);
  await draftAndApprove(page);
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await act(page, 'switchLayout', 'config');
  await settled(page, 'config');
  await page.evaluate(() => { const h = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount); h.shadowRoot.getElementById('cfg-title').style.boxShadow = '1px 1px 0 red'; }); // config's node 0.0 is main's edited id
  await page.getByRole('button', { name: 'Rollback' }).click();
  await expect.poll(() => readDisk(page, 'layers/shared.css')).toBe(sharedBefore);
  expect(await page.evaluate(() => { const h = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount); return h.shadowRoot.getElementById('cfg-title').style.boxShadow; })).toContain('red');
});
