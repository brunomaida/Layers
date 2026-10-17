import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { core } from './setup.js';

// S7.4: docs/shortcuts.md mirrors LayersCore.SHORTCUTS; handler-to-panel coverage is S3.3's KeyMap test
const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const HEADER = '| Tecla ou gesto | Ação |';
const registry = () => {
  expect(Array.isArray(core.SHORTCUTS), 'LayersCore.SHORTCUTS missing: is S3.3 merged?').toBe(true);
  return core.SHORTCUTS;
};
const tables = (md) => {
  const sec = md.split(/^## /m).find((s) => s.startsWith('Atalhos\n')) || '';
  return sec.split(/^### /m).slice(1).map((s) => {
    const [title, ...lines] = s.split('\n');
    const t = lines.filter((l) => l.startsWith('|'));
    expect(t[0], `header of ${title}`).toBe(HEADER);
    return [title.trim(), t.slice(2).map((l) => l.slice(1, -1).split('|').map((c) => c.trim()))];
  });
};

describe('shortcuts doc', () => {
  it('Shortcuts_DocTables_MatchShortcutsConstant', () => {
    const reg = registry();
    expect(JSON.stringify(reg).includes('|'), 'a SHORTCUTS cell contains |').toBe(false);
    expect(fs.existsSync(path.join(root, 'docs/shortcuts.md')), 'docs/shortcuts.md missing').toBe(true);
    expect(tables(read('docs/shortcuts.md'))).toEqual(reg.map(([g, rows]) => [g, rows.map(([k, d]) => [k, d])]));
  });

  it('Shortcuts_ChecklistG_ClosedOnlyWithDoc', () => {
    const line = read('docs/RELEASE-CHECKLIST.md').split('\n').find((l) => l.includes('Atalhos e interações (exportar'));
    expect(line, 'checklist G item').toBeDefined();
    if (/^- \[[xX]\]/.test(line)) expect(line).toContain('(shortcuts.md)');
  });
});
