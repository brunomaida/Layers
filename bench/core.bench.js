import { bench, describe } from 'vitest';
import { core } from '../test/setup.js';
import { loadWorkloads } from './workloads.js';

const w = loadWorkloads();
const opts = { warmupIterations: 5, warmupTime: 200, iterations: 20, time: 1000 };

describe('parseSheet', () => {
  for (const c of w.css) bench(c.id, () => { core.parseSheet(c.file, c.text, 0); }, opts);
});

describe('scopeAst', () => {
  for (const c of w.css) bench(c.id, () => { core.scopeAst(c.text); }, opts);
});

describe('isUtilitySheet', () => {
  for (const c of w.css) bench(c.id, () => { core.isUtilitySheet(c.text); }, opts);
});

describe('buildIndex', () => {
  bench('traval/4-sheets', () => { core.buildIndex(w.travalSheets); }, opts);
});

describe('varIndex', () => {
  bench('traval/4-sheets', () => { core.varIndex(w.travalSheets); }, opts);
});

describe('patchCssAt', () => {
  const c = w.css.find((x) => x.id === 'ecommerce-jsx/app');
  const rules = core.parseSheet(c.file, c.text, 0);
  const sel = rules.find((r) => r.simple && r.decls && r.decls.length)?.selector;
  if (!sel) throw new Error('bench workload missing: simple rule in ecommerce-jsx/app');
  bench('ecommerce-jsx/app/color', () => { core.patchCssAt(c.text, sel, 'color', 'red', c.file); }, opts);
});

describe('mapDcTemplate', () => {
  bench('dc-template/index', () => { core.mapDcTemplate(w.dcText); }, opts);
});

describe('patchDc', () => {
  const map = core.mapDcTemplate(w.dcText);
  const tplId = Object.keys(map).find((k) => map[k].styleRange);
  if (!tplId) throw new Error('bench workload missing: dc element with inline style');
  const item = { tplId, prop: 'padding', to: '12px' };
  bench('dc-template/one-item', () => { core.patchDc(w.dcText, w.dcText, [item]); }, opts);
});

describe('deriveManifest', () => {
  bench('plain-admin/html+css', () => { core.deriveManifest(w.manifestFiles); }, opts);
});

describe('openZip', () => {
  // cold path, ~1 KB archive: catches regressions in the EOCD scan and inflate setup
  bench('zip/evil', async () => {
    const r = await core.openZip(w.zip);
    if (!r.files.size) throw new Error('openZip returned no files');
  }, opts);
});
