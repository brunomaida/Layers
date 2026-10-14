import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S5.3: for up to 30 nodes sampled per fixture (evenly spaced, DOM order, only nodes that carry a
// `data-src`), the `file|selector|line` origin must resolve to a real file in the fixture and the
// line must show the selector (or, for selector lists, a class the node carries). An authored
// `data-src` that went stale is corrected or dropped by the loader (S2.20), so none may remain.
const ROOT = path.resolve('fixtures');
const SAMPLE = Number(process.env.ORIGIN_SAMPLE) || 30;
const FIXTURES = [
  'traval', 'axai', 'marketview', 'plain-css', 'nested-oklch', 'dc-template', 'student-dashboard',
  'plain-admin', 'choices-js', 'todomvc-react', 'coffee-masters', 'vcard-portfolio', 'pico-css',
  'slick-carousel', 'mobile-select', 'ecommerce-jsx',
];

function sample(list, n) {
  if (list.length <= n) return list;
  return Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]);
}

// Where the origin points: { file, sel, line } or null when the format is not `file|x|line`.
function parseSrc(src) {
  const m = /^(.*)\|(.*)\|(\d+)$/.exec(src);
  return m ? { file: m[1], sel: m[2], line: Number(m[3]) } : null;
}

// Origins a human wrote down, as opposed to ones the loader derived from the loaded sheets:
// `data-src` attributes in the mock and the `root.src` / `rules` entries of layers.json.
function authoredOrigins(name) {
  const dir = path.join(ROOT, name);
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'layers.json'), 'utf8'));
  const explicit = new Set([man.root && man.root.src, ...Object.values(man.rules || {})].filter(Boolean).map(String));
  const attr = new Set();
  const mockPath = man.mock && path.join(dir, man.mock);
  if (mockPath && fs.existsSync(mockPath)) {
    for (const m of fs.readFileSync(mockPath, 'utf8').matchAll(/data-src="([^"]*)"/g)) attr.add(m[1]);
  }
  return { explicit, attr };
}

// The rule prelude: from the origin line up to the first `{`, so a selector list that starts on an
// earlier line (`.h2,\n.h3,\n.h4 {`) still shows the selector.
function prelude(lines, line) {
  let out = '';
  for (let i = line - 1; i < lines.length; i++) {
    out += lines[i] + '\n';
    if (lines[i].includes('{')) break;
  }
  return out;
}

function verify(name, e) {
  const o = parseSrc(e.src);
  if (!o) return 'unparsable';
  const abs = path.join(ROOT, name, o.file);
  if (!fs.existsSync(abs)) return 'file missing';
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  if (lines[o.line - 1] === undefined) return `line out of range (file has ${lines.length})`;
  if (o.sel.startsWith('tpl:')) return null;
  const text = prelude(lines, o.line);
  const classes = e.cls.map((c) => '.' + c);
  const shows = text.includes(o.sel) || classes.some((c) => text.includes(c)) || (e.id && text.includes('#' + e.id));
  return shows ? null : `line shows: ${lines[o.line - 1].trim().slice(0, 60)}`;
}

for (const name of FIXTURES) {
  test(`Origin_${name}_SampledNodesPointToSelector`, async ({ page }, info) => {
    await page.goto(`/?layers=fixtures/${name}/`);
    const { els } = await readNodes(page);
    const picked = sample(els.filter((e) => e.src), SAMPLE);
    expect(picked.length, `${name}: nodes with data-src`).toBeGreaterThan(0);
    const { explicit, attr } = authoredOrigins(name);
    const derivedBad = [];
    const authoredBad = [];
    let derived = 0;
    let authored = 0;
    let external = 0;
    let unverifiable = 0; // authored origin into a file the fixture does not vendor
    for (const e of picked) {
      const why = verify(name, e);
      if (explicit.has(e.src)) {
        external++; // layers.json mapping into the real app, which the fixture may not vendor
        continue;
      }
      if (attr.has(e.src)) {
        authored++;
        if (why === 'file missing') unverifiable++;
        else if (why) authoredBad.push(`${e.src}  (${why})`);
        continue;
      }
      derived++;
      if (why) derivedBad.push(`${e.src}  (${why})`);
    }
    info.annotations.push({ type: 'origin-sample', description: `${picked.length} sampled: ${derived} derived, ${authored} authored (${unverifiable} unverifiable), ${external} explicit` });
    expect(authoredBad, `${name}: authored data-src that no longer matches its sheet`).toEqual([]);
    expect(derivedBad, `${name}: derived origins that do not resolve (${derived} derived of ${picked.length})`).toEqual([]);
  });
}
