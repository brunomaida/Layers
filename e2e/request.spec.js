import { test, expect } from '@playwright/test';
import { readNodes, lastTreeRow } from './tree-helpers.js';
import { readDisk } from './folder-helpers.js';
import { act, open, reloadWith, goFlat, panel, item, rightClick } from './ctx-helpers.js';

// S3.5 Task 6: manual requests in the Ajustes panel. Every entry is created through the REAL context menu (right-click on a
// plane, then Requisição); typing, copy and export go through the real controls. The connected axai folder lives in OPFS
// (harness in ctx-helpers.js), so the exported file is read back from that folder.
// Fixture axai: C6 is the label of the first .control-group (.control-label "Ordenar", L6, text leaf).
const C6 = '0.0.2.0.4.0.0';
const HEAD = '0.0.2.0'; // .section-head (L3): no text of its own, two button children carry it
const PENDING = 'layers/v1/pending';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

const entry = (page, id) => page.locator(`[data-req="${id}"]`);
const box = (page, id) => entry(page, id).locator('textarea');
const footer = (page) => page.locator('[data-req-footer]');
// the Windows clipboard hands text back with CRLF
const clip = async (page) => (await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n');
const requests = async (page) => { await act(page); return page.evaluate(() => window.__logic.state.requests); };

async function addVia(page, id) {
  await rightClick(page, id);
  await item(page, /Requisição/).click();
  await expect(panel(page)).toHaveCount(0);
}

// a reload restores the camera, so the view may already be flat
async function ensureFlat(page) {
  await act(page);
  if (!(await page.evaluate(() => window.__logic.state.flat))) await goFlat(page);
}

async function openFlat(page) {
  await open(page);
  await goFlat(page);
}

// the stored entry of the (single) connected project
const stored = (page) => page.evaluate((k) => {
  const raw = localStorage.getItem(k);
  const by = raw ? JSON.parse(raw).byProject || {} : {};
  const keys = Object.keys(by);
  return keys.length ? by[keys[0]] : null;
}, PENDING);

const acoes = (page) => page.getByRole('button', { name: /Ações/ });
async function acoesItem(page, name) {
  const it = page.getByRole('button', { name });
  await acoes(page).click();
  if (!(await it.isVisible())) await acoes(page).click(); // hover opens, click pins: one click can close what hover just opened
  return it;
}

test('Request_FromMenu_AddsEntryWithChipAndTextarea', async ({ page }) => {
  await openFlat(page);
  await expect(page.locator('[data-req]')).toHaveCount(0);
  await addVia(page, C6);
  const e = entry(page, 'R1');
  await expect(e).toBeVisible();
  await expect(e).toContainText('R1');
  await expect(e).toContainText('.control-label');
  await expect(e).toContainText('L6');
  await expect(e.getByRole('button', { name: 'Remover requisição' })).toBeVisible();
  await expect(e).toContainText(/painel\.css › \.control-label · L\d+/);
  await expect(e).toContainText('texto “Ordenar”');
  await expect(e.getByText(/o que mudar/i)).toBeVisible();
  // the textarea is focused and ready: 4 rows, no spellcheck, resizable
  await expect(box(page, 'R1')).toBeFocused();
  await expect(box(page, 'R1')).toHaveAttribute('rows', '4');
  await expect(box(page, 'R1')).toHaveAttribute('spellcheck', 'false');
  expect(await box(page, 'R1').evaluate((el) => getComputedStyle(el).resize)).toBe('vertical');
  await expect(e.getByRole('button', { name: /Mostrar no palco/ })).toBeEnabled();
  await expect(e).toContainText('salvo · 0 car.');
  // style chips: only the declared properties of the rule (key + value)
  expect(await e.locator('[data-req-chips] > span').count()).toBeGreaterThan(0);
  const rec = (await requests(page))[0];
  expect(rec).toMatchObject({ id: 'R1', layoutId: 'main', nodeId: C6, name: '.control-label', depth: 6, text: '' });
  expect(rec.nodeKey).toMatch(/^[^|]*painel\.css\|\.control-label\|\d+$/);
  expect(rec.path.split(' > ')).toHaveLength(7);
  expect(rec.path.endsWith(' > .control-label')).toBe(true);
  expect(rec.caixa).toMatch(/^\d+×\d+ px · texto “Ordenar”$/);
  expect(rec.uses).toBeGreaterThanOrEqual(1);
  expect(typeof rec.createdAt).toBe('number');
  // estilos: only properties the rule really declares (not computed ones)
  const css = await readDisk(page, 'wwwroot/painel.css');
  const startAt = css.split('\n').slice(0, Number(/L(\d+)$/.exec(rec.alvo)[1]) - 1).join('\n').length;
  const block = css.slice(startAt, css.indexOf('}', startAt));
  const declared = [...block.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
  const keys = rec.estilos.split('; ').map((p) => p.slice(0, p.indexOf(':')));
  expect(keys.length).toBeGreaterThan(0);
  expect(declared).toContain('font-size');
  for (const k of keys) expect(declared, `${k} is declared by the rule`).toContain(k);
  // header badge: 0 changes, 1 request
  await expect(page.locator('[title="0 ajustes · 1 requisição"]')).toHaveText('0 · 1');
  await expect(footer(page)).toContainText('Requisições Manuais');
  // a second one gets the next id and collapses the first into a row
  await addVia(page, HEAD);
  await expect(entry(page, 'R2')).toBeVisible();
  await expect(entry(page, 'R1')).toHaveCount(0);
  await expect(page.locator('[data-req-row="R1"]')).toContainText('.control-label');
  await expect(page.locator('[title="0 ajustes · 2 requisições"]')).toHaveText('0 · 2');
  const r2 = (await requests(page))[1];
  expect(r2).toMatchObject({ id: 'R2', nodeId: HEAD, name: '.section-head', depth: 3 });
  // a node without own text reads the text of its direct children
  expect(r2.caixa).toMatch(/^\d+×\d+ px · textos “＋ Nova entrada”, “Buscar todas ↗”$/);
});

test('Request_Typing_DoesNotTriggerGlobalShortcuts', async ({ page }) => {
  await openFlat(page);
  await addVia(page, C6);
  const snap = () => page.evaluate(() => {
    const s = window.__logic.state;
    return JSON.stringify([s.zoom, s.yaw, s.tilt, s.panX, s.panY, s.active, s.selId, s.shortcuts, s.measure, s.rightOpen, s.flat, s.isoId, s.focus, !!s.modal, s.dir ? 1 : 0]);
  });
  await act(page);
  const before = await snap();
  const typed = 'r f c ? 0 + - w a s d m i 1 z 2 Rfc';
  await box(page, 'R1').pressSequentially(typed);
  await act(page);
  expect(await snap()).toBe(before);
  await expect(box(page, 'R1')).toHaveValue(typed);
  await expect(entry(page, 'R1')).toContainText(`salvo · ${typed.length} car.`);
  expect((await requests(page))[0].text).toBe(typed);
  // Esc blurs the field and does not reset the selection
  await page.keyboard.press('Escape');
  await expect(box(page, 'R1')).not.toBeFocused();
  await act(page);
  expect(await snap()).toBe(before);
});

test('Request_Remove', async ({ page }) => {
  await openFlat(page);
  await addVia(page, C6);
  await box(page, 'R1').fill('pedido a remover');
  await expect.poll(async () => ((await stored(page)) || { requests: [] }).requests.length).toBe(1);
  await entry(page, 'R1').getByRole('button', { name: 'Remover requisição' }).click();
  await expect(page.locator('[data-req], [data-req-row]')).toHaveCount(0);
  await expect(footer(page)).toHaveCount(0);
  expect(await requests(page)).toEqual([]);
  await expect(page.locator('[title*="requisi"]')).toHaveCount(0); // badge back to the plain count
  await expect.poll(() => stored(page)).toBeNull(); // no changes and no requests: the entry goes away
});

test('Request_CopyMarkdown_Toast', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-17T14:32:00'));
  await openFlat(page);
  await addVia(page, C6);
  await box(page, 'R1').fill('Aumentar o contraste do rótulo.');
  await addVia(page, HEAD);
  await box(page, 'R2').fill('Linha 1\nLinha 2');
  // panel B: opening the footer shows the Markdown that Copiar puts on the clipboard
  await footer(page).getByRole('button', { name: /Requisições Manuais/ }).click();
  const md = await page.locator('pre[data-req-md]').textContent();
  expect(md).toMatch(/^## Requisições Manuais · Axaí · 2\n<!-- Layers .* · 17\/10\/2026 14:32 · mock wwwroot\/index\.html -->/);
  expect(md).toContain('### R1 · .control-label (L6)');
  expect(md).toContain('- pedido: Aumentar o contraste do rótulo.');
  expect(md).toContain('- pedido: Linha 1\n    Linha 2');
  await footer(page).getByRole('button', { name: 'Copiar', exact: true }).click();
  await expect(page.getByText('2 requisições copiadas como Markdown.')).toBeVisible();
  expect(await clip(page)).toBe(md);
  // the Ações menu has the same action
  await page.evaluate(() => navigator.clipboard.writeText('x'));
  await (await acoesItem(page, /Copiar requisições \(Markdown\)/)).click();
  expect(await clip(page)).toBe(md);
});

test('Request_ExportMd_WritesInsideFolder', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-17T14:32:00'));
  await openFlat(page);
  expect(await readDisk(page, 'layers-requests.md')).toBeNull();
  await addVia(page, C6);
  await box(page, 'R1').fill('Exportar isto.');
  await (await acoesItem(page, /Exportar requisições…/)).click();
  await expect(page.getByText('1 requisição gravada em layers-requests.md.')).toBeVisible();
  const disk = await readDisk(page, 'layers-requests.md');
  expect(disk).toMatch(/^## Requisições Manuais · Axaí · 1\n/);
  expect(disk).toContain('- pedido: Exportar isto.');
  // the footer shows the same text, and its button writes the same file
  await footer(page).getByRole('button', { name: /Requisições Manuais/ }).click();
  expect(await page.locator('pre[data-req-md]').textContent()).toBe(disk);
  await box(page, 'R1').fill('Exportar isto, de novo.');
  await footer(page).getByRole('button', { name: /Exportar \.md/ }).click();
  await expect.poll(() => readDisk(page, 'layers-requests.md')).toContain('- pedido: Exportar isto, de novo.');
});

test('Request_ExportMd_DisabledWithoutFolder', async ({ page }) => {
  await page.goto('/?layers=fixtures/axai/'); // fixture mode: no connected folder
  await readNodes(page);
  await goFlat(page);
  await addVia(page, HEAD);
  await expect(entry(page, 'R1')).toBeVisible();
  const ex = await acoesItem(page, /Exportar requisições…/);
  await expect(ex).toBeDisabled();
  await expect(ex).toHaveAttribute('title', /pasta conectada/);
});

test('Request_Reload_RestoresRequests', async ({ page }) => {
  await openFlat(page);
  await addVia(page, C6);
  await box(page, 'R1').fill('Texto que sobrevive ao reload.');
  await reloadWith(page);
  await expect(page.getByText(/1 requisição\(ões\) restaurada\(s\)/)).toBeVisible();
  await page.locator('[data-req-row="R1"]').click();
  await expect(box(page, 'R1')).toHaveValue('Texto que sobrevive ao reload.');
  await expect(entry(page, 'R1')).toContainText('.control-label');
  await expect(entry(page, 'R1')).not.toContainText('alvo a confirmar');
  await expect(entry(page, 'R1').getByRole('button', { name: /Mostrar no palco/ })).toBeEnabled();
  // the next id continues the sequence
  await ensureFlat(page);
  await addVia(page, HEAD);
  await expect(entry(page, 'R2')).toBeVisible();
});

test('Request_SourceChanged_KeepsWithAlvoAConfirmar', async ({ page }) => {
  await openFlat(page);
  await addVia(page, C6);
  await box(page, 'R1').fill('Pedido preso a um alvo que mudou.');
  await expect.poll(async () => ((await stored(page)) || { requests: [] }).requests[0]?.text).toBe('Pedido preso a um alvo que mudou.');
  // the source changes on disk between sessions: the hash differs on the next load
  await page.evaluate(async () => {
    const d = await window.__proj.getDirectoryHandle('wwwroot');
    const h = await d.getFileHandle('painel.css');
    const text = await (await h.getFile()).text();
    const w = await h.createWritable();
    await w.write(text + '\n/* changed */\n');
    await w.close();
  });
  await reloadWith(page);
  await expect(page.getByText(/1 requisição\(ões\) restaurada\(s\) · alvo a confirmar/)).toBeVisible();
  await page.locator('[data-req-row="R1"]').click();
  await expect(box(page, 'R1')).toHaveValue('Pedido preso a um alvo que mudou.');
  await expect(entry(page, 'R1')).toContainText('alvo a confirmar');
  await expect(entry(page, 'R1').getByRole('button', { name: /Mostrar no palco/ })).toBeDisabled();
  expect((await requests(page))[0]).toMatchObject({ confirm: true }); // the flag belongs to the request
  expect((await requests(page))[0].nodeId).toBeUndefined(); // the positional id no longer describes the new DOM
  // the Markdown carries the status
  await footer(page).getByRole('button', { name: /Requisições Manuais/ }).click();
  expect(await page.locator('pre[data-req-md]').textContent()).toContain('- status: alvo a confirmar');
  // editing the text and reloading again (same hash now) keeps the flag until the request is removed
  await box(page, 'R1').fill('Texto editado depois da deriva.');
  await expect.poll(async () => ((await stored(page)) || { requests: [] }).requests[0]?.text).toBe('Texto editado depois da deriva.');
  expect((await stored(page)).requests[0].confirm).toBe(true);
  await reloadWith(page);
  await expect(page.getByText(/1 requisição\(ões\) restaurada\(s\) · alvo a confirmar/)).toBeVisible();
  await expect(page.locator('[data-req-row="R1"]')).toContainText('alvo a confirmar');
  await page.locator('[data-req-row="R1"]').click();
  await expect(box(page, 'R1')).toHaveValue('Texto editado depois da deriva.');
  await expect(entry(page, 'R1')).toContainText('alvo a confirmar');
  // a request created now has no flag: only R1 carries the tag, the status line and the disabled button
  await ensureFlat(page);
  await addVia(page, HEAD);
  await expect(entry(page, 'R2')).toBeVisible();
  await expect(entry(page, 'R2')).not.toContainText('alvo a confirmar');
  await expect(entry(page, 'R2').getByRole('button', { name: /Mostrar no palco/ })).toBeEnabled();
  await expect(page.locator('[data-req-row="R1"]')).toContainText('alvo a confirmar');
  await footer(page).getByRole('button', { name: /Requisições Manuais/ }).click();
  const md = await page.locator('pre[data-req-md]').textContent();
  expect(md.match(/- status: alvo a confirmar/g)).toHaveLength(1);
  expect(md.indexOf('- status: alvo a confirmar')).toBeLessThan(md.indexOf('### R2'));
  const reqs = await requests(page);
  expect(reqs[0].confirm).toBe(true);
  expect(reqs[1].confirm).toBeUndefined();
});

test('Request_NotCountedInSalvar', async ({ page }) => {
  await openFlat(page);
  await addVia(page, C6);
  // requests only: Aplicar nos arquivos… has nothing to apply
  await (await acoesItem(page, /Aplicar nos arquivos/)).click();
  await act(page);
  expect(await page.evaluate(() => !!window.__logic.state.modal)).toBe(false);
  // one De → Para change: the badge shows both, the plan has only the change
  await page.getByText('Só este', { exact: false }).first().click();
  const field = page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();
  await field.click({ clickCount: 3 });
  await page.keyboard.type('0 0 0 3px rgb(1, 2, 3)');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  await act(page);
  expect(await page.evaluate(() => window.__logic.state.changes.length)).toBe(1);
  await expect(page.locator('[title="1 ajuste · 1 requisição"]')).toHaveText('1 · 1');
  await (await acoesItem(page, /Aplicar nos arquivos/)).click();
  await act(page);
  const plan = await page.evaluate(() => window.__logic.state.modal);
  expect(plan.msg).toMatch(/^design: 1 ajuste\(s\)/);
  expect(plan.log.join('\n')).not.toMatch(/requisi/i);
});

test('Request_OnlyRequests_PendingEntryNotErased', async ({ page }) => {
  await openFlat(page);
  await addVia(page, C6);
  await box(page, 'R1').fill('So requisicao, sem ajuste.');
  await expect.poll(async () => ((await stored(page)) || { requests: [] }).requests.length).toBe(1);
  const e1 = await stored(page);
  expect(e1.changes).toEqual([]);
  await reloadWith(page);
  await expect(page.locator('[data-req-row="R1"]')).toBeVisible();
  await expect.poll(async () => ((await stored(page)) || { requests: [] }).requests.length).toBe(1);
  const e2 = await stored(page);
  expect(e2.requests[0].text).toBe('So requisicao, sem ajuste.');
});

test('Request_BadStoredRequest_Ignored', async ({ page }) => {
  await openFlat(page);
  await addVia(page, C6);
  await box(page, 'R1').fill('Valido.');
  await expect.poll(async () => ((await stored(page)) || { requests: [] }).requests.length).toBe(1);
  await page.evaluate((k) => {
    const all = JSON.parse(localStorage.getItem(k));
    const key = Object.keys(all.byProject)[0];
    all.byProject[key].requests.push({ id: 5, text: 'bad id' }, 'nope', null, { id: 'R9', layoutId: 'main', nodeKey: 'a|b|1', path: 'x', text: 'no createdAt' });
    localStorage.setItem(k, JSON.stringify(all));
  }, PENDING);
  await reloadWith(page);
  await expect(page.getByText(/1 requisição\(ões\) restaurada\(s\)/)).toBeVisible();
  await expect(page.locator('[data-req-row="R1"]')).toBeVisible();
  expect(await requests(page)).toHaveLength(1);
  await expect(page.locator('[data-req-row]')).toHaveCount(1);
});

test('Request_TwoQuickActions_YieldR1AndR2', async ({ page }) => {
  await openFlat(page);
  await act(page);
  // two Requisição actions in the same tick (a double activation): ids come from the list as it is when each lands
  await page.evaluate(([a, b]) => { window.__logic.addRequest(a); window.__logic.addRequest(b); }, [C6, HEAD]);
  await expect(page.locator('[data-req-row], [data-req]')).toHaveCount(2);
  const ids = (await requests(page)).map((r) => r.id).sort();
  expect(ids).toEqual(['R1', 'R2']);
});

// ---- discard paths: what the stored entry holds afterwards --------------------------------------------------------
const reqsIn = async (page) => ((await stored(page)) || { requests: [] }).requests.length;

// one De → Para change on the selected node (the node is selected by the right-click that created the request)
async function makeChange(page) {
  const only = page.getByText('Só este', { exact: false }).first();
  if (await only.isVisible()) await only.click();
  const field = page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();
  await field.click({ clickCount: 3 });
  await page.keyboard.type('0 0 0 3px rgb(1, 2, 3)');
  await page.keyboard.press('Tab');
  await expect.poll(async () => ((await stored(page)) || { changes: [] }).changes.length).toBe(1);
}

// the project menu opens on hover and pins on click: one click can close what hover just opened
async function projectMenu(page, name) {
  const it = page.getByText(name).first();
  const trigger = page.getByRole('button', { name: /▾/ }).first();
  await trigger.click();
  if (!(await it.isVisible())) await trigger.click();
  await it.click();
}

test('Request_ConfirmedReload_KeepsRequestsDropsChanges', async ({ page }) => {
  await openFlat(page);
  await addVia(page, C6);
  await box(page, 'R1').fill('Fica depois do Recarregar.');
  await makeChange(page);
  await expect.poll(() => reqsIn(page)).toBe(1);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('r'); // reload with unsaved changes asks first
  await expect(page.getByText('Recarregar projeto?')).toBeVisible();
  await page.getByRole('button', { name: 'Recarregar', exact: true }).click();
  await expect.poll(async () => ((await stored(page)) || { changes: [1] }).changes.length).toBe(0);
  const e = await stored(page);
  expect(e.requests).toHaveLength(1);
  expect(e.requests[0].text).toBe('Fica depois do Recarregar.');
  expect(e.requests[0].confirm).toBeUndefined(); // same sources: nothing to confirm
  await expect(page.locator('[data-req-row="R1"]')).toBeVisible();
});

test('Request_ConfirmedStateSwitch_KeepsRequests', async ({ page }) => {
  await open(page, 'multi-state');
  await (await lastTreeRow(page)).click({ button: 'right' });
  await item(page, /Requisição/).click();
  await box(page, 'R1').fill('Fica depois de trocar de estado.');
  await makeChange(page);
  await expect.poll(() => reqsIn(page)).toBe(1);
  await page.getByText('Interagir', { exact: false }).first().click();
  await page.getByText('csv-loaded', { exact: true }).click();
  await expect(page.getByText('Trocar de estado?')).toBeVisible();
  await page.getByRole('button', { name: 'Trocar', exact: true }).click();
  await expect.poll(async () => ((await stored(page)) || { changes: [1] }).changes.length).toBe(0);
  const e = await stored(page);
  expect(e.requests).toHaveLength(1);
  expect(e.requests[0].text).toBe('Fica depois de trocar de estado.');
  await expect(page.locator('[data-req-row="R1"]')).toBeVisible();
});

test('Request_Reanalisar_KeepsRequests', async ({ page }) => {
  await openFlat(page);
  await addVia(page, C6);
  await box(page, 'R1').fill('Fica depois de Reanalisar.');
  await makeChange(page);
  await expect.poll(() => reqsIn(page)).toBe(1);
  await projectMenu(page, 'Reanalisar');
  await page.getByRole('button', { name: /Reler mesmo assim|^Reanalisar$/ }).click();
  await expect.poll(async () => ((await stored(page)) || { changes: [1] }).changes.length).toBe(0);
  const e = await stored(page);
  expect(e.requests).toHaveLength(1);
  expect(e.requests[0].text).toBe('Fica depois de Reanalisar.');
  await expect(page.locator('[data-req-row="R1"]')).toBeVisible();
});

test('Request_ResetUi_RemovesTheEntry', async ({ page }) => {
  await openFlat(page);
  await addVia(page, C6);
  await box(page, 'R1').fill('Some com Zerar interface.');
  await makeChange(page);
  await expect.poll(() => reqsIn(page)).toBe(1);
  await projectMenu(page, 'Zerar interface');
  await expect(page.getByText('Interface zerada')).toBeVisible();
  await expect.poll(() => stored(page)).toBeNull();
  await expect(page.locator('[data-req], [data-req-row]')).toHaveCount(0);
});
