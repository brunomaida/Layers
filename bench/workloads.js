import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../fixtures/', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');

function findFile(dir, name) {
  for (const e of fs.readdirSync(new URL(dir + '/', root), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      const hit = findFile(rel, name);
      if (hit) return hit;
    } else if (e.name === name) return rel;
  }
  return null;
}

function must(rel, what) {
  if (!rel) throw new Error(`bench workload missing: ${what}`);
  return rel;
}

// Synthetic coverage inputs (S9.1b): deterministic, no fixture file changes. Every tag carries a class, so the token sets are non-trivial.
export function coverageHtml(cls, tags) {
  const hidden = `<div class="${cls}-panel" hidden><p class="${cls}-hp">h</p></div>`; // 2 tags
  const dialog = `<dialog class="${cls}-dlg"><p class="${cls}-dp">d</p></dialog>`; // 2 tags
  const tab = `<div role="tabpanel" class="${cls}-tab"><p class="${cls}-tp">t</p></div>`; // 2 tags
  const row = (i) => `<div class="${cls}-row${i}"><span class="${cls}-a">x</span><p class="${cls}-b">y</p></div>`; // 3 tags
  const rows = Math.max(0, Math.floor((tags - 9) / 3)); // html, body, main and the three 2-tag regions take 9 tags
  let body = '';
  for (let i = 0; i < rows; i++) body += row(i % 40);
  return `<!doctype html><html><body><main class="${cls}-main">${hidden}${dialog}${tab}${body}</main></body></html>`;
}

export function loadWorkloads() {
  const css = [
    { id: 'plain-admin/materialdesignicons', rel: must(findFile('plain-admin', 'materialdesignicons.min.css'), 'materialdesignicons.min.css') },
    { id: 'ecommerce-jsx/app', rel: must(findFile('ecommerce-jsx', 'app.css'), 'ecommerce-jsx app.css') },
    { id: 'traval/components', rel: 'traval/src/styles/components.css' },
    { id: 'axai/painel', rel: 'axai/wwwroot/painel.css' },
  ].map((w) => ({ id: w.id, rel: w.rel, file: path.basename(w.rel), text: read(w.rel) }));

  const marketview = read('marketview/index.html');
  const inline = [...marketview.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  if (!inline) throw new Error('bench workload missing: marketview inline <style>');
  css.push({ id: 'marketview/inline', rel: 'marketview/index.html', file: 'index.html', text: inline });

  const traval = JSON.parse(read('traval/layers.json'));
  const travalSheets = traval.styles.map((p) => ({ file: path.basename(p), text: read('traval/' + p), lineOffset: 0 }));

  const dcText = read('dc-template/index.html');

  const manifestFiles = [
    { path: 'index.html', kind: 'html', text: read('plain-admin/index.html') },
    { path: 'assets/css/materialdesignicons.min.css', kind: 'css', text: css[0].text },
  ];

  const zipBytes = fs.readFileSync(new URL('zip/evil.zip', root));
  const zip = zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength);

  const covOne = coverageHtml('big', 1500);
  const covMany = Array.from({ length: 200 }, (_, i) => ({ path: `screens/s${i}.html`, kind: 'html', text: coverageHtml('s' + i, 30) }));
  const coverage = {
    oneHtml: { man: { mock: 'index.html' }, files: [{ path: 'index.html', kind: 'html', text: covOne }], mocks: { 'index.html': covOne } },
    manyHtml: { man: { mock: 'screens/s0.html' }, files: covMany, mocks: { 'screens/s0.html': covMany[0].text } },
  };

  // S9.1c: Espalhar inputs. overviewFit runs per render in the overview camera (8 pages at dist 30); lodNodes slices a 1,500-node scan at depth 1.
  const spread = {
    fit: { foot: 8 * 1280 + 7 * 384, pageH: 760, zm: 360, yaw: -32, tilt: 0, persp: 1600, stageW: 1280, stageH: 760 },
    nodes: Array.from({ length: 1500 }, (_, i) => ({ id: String(i), depth: i % 6 })),
  };
  // S9.1d: spreadDrawPlan over 1,500 frozen entries (every third one full, total over the cap so the demotion branch runs) and mergeLayoutChanges
  // over 3 layouts x 60 changes (20 shared keys: file|selector|prop collide across layouts, 10 of them with different values).
  spread.plan = { active: 700, entries: Array.from({ length: 1500 }, (_, i) => ({ id: 'l' + i, full: i % 3 === 0, count: 5 })) };
  const mergeChange = (l, i) => {
    const shared = i < 20, k = shared ? i : 100 * l + i;
    return { src: 'layers/shared.css|' + (k % 4), sel: '.c' + k, prop: k % 2 ? 'color' : 'margin', to: shared && i < 10 ? 'v' + l : 'v0', layoutId: ['main', 'config', 'replay'][l] };
  };
  spread.merge = {
    byLayout: Object.fromEntries(['main', 'config', 'replay'].map((id, l) => [id, Array.from({ length: 60 }, (_, i) => mergeChange(l, i))])),
    order: ['main', 'config', 'replay'],
    sel: (c) => c.sel,
  };

  return { css, travalSheets, dcText, manifestFiles, zip, coverage, spread };
}
