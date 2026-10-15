import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// S7.3: docs/support-matrix.md must agree with the probes, the e2e titles, index.html and checklist E
const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const md = read('docs/support-matrix.md');
const probes = JSON.parse(read('e2e/__snapshots__/compat-probes.json'));
const specs = fs.readdirSync(path.join(root, 'e2e')).filter((f) => f.endsWith('.spec.js')).map((f) => read(`e2e/${f}`)).join('\n');

const section = (title) => md.split(/^## /m).find((s) => s.startsWith(title + '\n')) || '';
const rows = (title) => section(title).split('\n').filter((l) => l.startsWith('|')).map((l) => l.slice(1, -1).split('|').map((c) => c.trim()));
const TITLE = /^[A-Z][A-Za-z0-9]*_[A-Za-z0-9<>]+_[A-Za-z0-9]+$/;

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
    expect(msgs.length).toBeGreaterThanOrEqual(5);
    for (const m of msgs) expect(html.includes(m), m).toBe(true);
  });

  it('SupportMatrix_ChecklistE62Closed_NoM1M2Cells', () => {
    const closed = /^- \[x\] Compatibilidade/m.test(read('docs/RELEASE-CHECKLIST.md'));
    expect(closed && /· M[12]\b/.test(md), 'checklist E closed but the matrix still waits on M1/M2').toBe(false);
  });
});
