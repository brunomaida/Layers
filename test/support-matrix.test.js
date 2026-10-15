import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// S7.3: docs/support-matrix.md must agree with the probes, the e2e titles, index.html and checklist E
const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const md = read('docs/support-matrix.md').replace(/\r\n/g, '\n');
const probes = JSON.parse(read('e2e/__snapshots__/compat-probes.json'));
const specs = fs.readdirSync(path.join(root, 'e2e')).filter((f) => f.endsWith('.spec.js')).map((f) => read(`e2e/${f}`)).join('\n');

const section = (title) => md.split(/^## /m).find((s) => s.startsWith(title + '\n')) || '';
const rows = (title) => section(title).split('\n').filter((l) => l.startsWith('|')).map((l) => l.slice(1, -1).split('|').map((c) => c.trim()));
const TITLE = /^[A-Z][A-Za-z0-9]*_[A-Za-z0-9<>]+_[A-Za-z0-9]+$/;
const CELL = /^(?:(?:sim|recusa) · E\d+|não verificado · [ML]\d+)$/;
// file-system rows as the matrix asserts them: refusal where the picker is absent, sim only where E6 proves it
const FS_ROWS = [
  ['Leitura: pasta local', /^sim · E6$/],
  ['Leitura: arquivo `.zip`', /^não verificado · [ML]\d+$/],
  ['Gravação: rascunho', /^sim · E6$/],
  ['Gravação: seletor nativo', /^não verificado · [ML]\d+$/],
  ['Exportar versões completas', /^não verificado · [ML]\d+$/],
];

describe('support matrix', () => {
  const [head = [], , ...body] = rows('Matriz');
  // Playwright project key per column, from the backticked name in the header; undefined for untested columns
  const cols = head.map((h) => (h.match(/`(\w+)`/) || [])[1]);

  it('SupportMatrix_ProbeSnapshot_EveryEngineHasOneColumn', () => {
    expect(cols.filter(Boolean).sort()).toEqual(Object.keys(probes).sort());
  });

  it('SupportMatrix_WriteRow_MatchesFolderPickerProbe', () => {
    const row = body.find((r) => r[0].startsWith('Gravação: rascunho'));
    expect(row, 'write-flow row').toBeDefined();
    cols.forEach((k, i) => {
      if (!k) return;
      const want = probes[k].showDirectoryPicker ? 'sim' : 'recusa';
      expect(row[i].startsWith(want), `${k}: "${row[i]}"`).toBe(true);
    });
  });

  it('SupportMatrix_WriteEvidence_MatchesFolderPickerProbe', () => {
    for (const r of body) cols.forEach((k, i) => {
      if (!k) return;
      const bad = probes[k].showDirectoryPicker ? /^recusa · E7$/ : /^sim · E[68]$/;
      expect(bad.test(r[i]), `${k} × ${r[0]}: "${r[i]}"`).toBe(false);
    });
  });

  it('SupportMatrix_FileSystemRows_RefuseWithoutPickerAndNeverClaimUntested', () => {
    for (const [name, withPicker] of FS_ROWS) {
      const row = body.find((r) => r[0].startsWith(name));
      expect(row, `row "${name}"`).toBeDefined();
      cols.forEach((k, i) => {
        if (!k) return;
        const want = probes[k].showDirectoryPicker ? withPicker : /^recusa · E7$/;
        expect(want.test(row[i]), `${k} × ${name}: "${row[i]}"`).toBe(true);
      });
    }
  });

  it('SupportMatrix_CellsAndIds_AreWellFormedAndDefined', () => {
    const ids = (title) => new Set(rows(title).map((r) => r[0]).filter((c) => /^[EML]\d+$/.test(c)));
    const defined = { E: ids('Evidências'), M: ids('Verificação pendente'), L: ids('Lacunas') };
    expect(defined.E.size).toBeGreaterThan(0);
    for (const r of body) r.slice(1).forEach((c, i) => {
      expect(CELL.test(c), `${r[0]} × col ${i + 1}: "${c}"`).toBe(true);
      const id = c.match(/[EML]\d+$/)[0];
      expect(defined[id[0]].has(id), `${r[0]} cites undefined ${id}`).toBe(true);
    });
  });

  it('SupportMatrix_CitedTests_QuotedInE2eSpecs', () => {
    // anything backticked that starts like a test title must parse as one: no silent skip
    const cited = [...new Set([...md.matchAll(/`([A-Z][A-Za-z0-9<>]*_[^`]*)`/g)].map((m) => m[1]))];
    expect(cited.length).toBeGreaterThanOrEqual(9);
    for (const t of cited) {
      expect(TITLE.test(t), `unparsed title: ${t}`).toBe(true);
      const src = t.replace('<fixture>', '${name}');
      expect(["'", '"', '`'].some((q) => specs.includes(q + src + q)), `not a test title in e2e/: ${t}`).toBe(true);
    }
  });

  it('SupportMatrix_RefusalMessages_ExistInIndexHtml', () => {
    const html = read('index.html');
    const msgs = rows('Mensagens').slice(2).map((r) => r[1].replace(/^`|`$/g, ''));
    expect(msgs.length).toBe(6);
    for (const m of msgs) expect(html.includes(m), m).toBe(true);
  });

  it('SupportMatrix_ChecklistE62Closed_NoM1M2Cells', () => {
    const closed = /^- \[[xX]\] Compatibilidade/m.test(read('docs/RELEASE-CHECKLIST.md'));
    expect(closed && /· M[12]\b/.test(md), 'checklist E closed but the matrix still waits on M1/M2').toBe(false);
  });
});
