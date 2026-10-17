import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// S3.5: docs/design/ui-mock (README, canvas.json, boards/) must not drift apart
const root = path.resolve(import.meta.dirname, '..');
const mock = path.join(root, 'docs/design/ui-mock');
const readme = fs.readFileSync(path.join(mock, 'README.md'), 'utf8').replace(/\r\n/g, '\n');
const canvas = JSON.parse(fs.readFileSync(path.join(mock, 'canvas.json'), 'utf8'));
const onDisk = fs.readdirSync(path.join(mock, 'boards')).filter((f) => f.endsWith('.dc.html')).sort();

const section = (title) => readme.split(/^## /m).find((s) => s.startsWith(title + '\n')) || '';
const rows = (title) => section(title).split('\n').filter((l) => l.startsWith('|')).slice(2).map((l) => l.slice(1, -1).split('|').map((c) => c.trim()));
const listed = rows('Boards').map((r) => r[0]).sort();
const matrix = rows('Matriz');
const boxes = Object.entries(canvas.boards || {});
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('ui-mock coverage', () => {
  it('Boards_ListadosNoReadme_ExistemEmDisco', () => {
    expect(listed.filter((f) => !onDisk.includes(f))).toEqual([]);
  });

  it('Boards_EmDisco_ListadosNoReadme', () => {
    expect(onDisk.filter((f) => !listed.includes(f))).toEqual([]);
  });

  it('CanvasJson_Caixas_BatemComBoardsEmDisco', () => {
    expect(boxes.map(([f]) => f).sort()).toEqual(onDisk);
    expect([...(canvas.order || [])].sort()).toEqual(onDisk);
  });

  it('CanvasJson_Caixas_NaoSeSobrepoem', () => {
    const pairs = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (overlap(boxes[i][1], boxes[j][1])) pairs.push(`${boxes[i][0]} x ${boxes[j][0]}`);
    expect(pairs).toEqual([]);
  });

  it('Matriz_Regioes_ApontamParaBoardExistenteOuExempt', () => {
    expect(matrix.length).toBeGreaterThan(0);
    expect(matrix.filter(([, board]) => board !== 'exempt' && !onDisk.includes(board))).toEqual([]);
  });

  it('Boards_Conteudo_SemScriptExterno', () => {
    // boards are design docs, not the app: Google Fonts <link> is allowed, remote code is not
    const bad = onDisk.filter((f) => /<script\b[^>]*\bsrc="https?:/i.test(fs.readFileSync(path.join(mock, 'boards', f), 'utf8')));
    expect(bad).toEqual([]);
  });
});
