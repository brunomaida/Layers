// LAYERS — manifesto derivado da pasta (spike da fatia 5, descartável)
//
// node tools/layers-derive.js C:\Development\Traval [...outras pastas]
//
// Varre a pasta, escolhe o candidato a `mock`, deriva `base` e `styles`, e classifica o
// projeto entre HTML estático e shell de app. Se a pasta já tiver um layers.json, compara
// campo por campo — é essa comparação que o portão da fatia 5 lê.
//
// Regex sobre HTML de propósito: o alvo é decidir se vale construir isto de verdade, não
// entregar um parser. Nenhuma dependência nova.
// ESM: o package.json do repositorio declara "type": "module"
import fs from 'node:fs';
import path from 'node:path';

const SKIP = new Set(['node_modules', '.git', '.vs', '.vscode', 'bin', 'obj', 'dist', 'build', 'coverage', 'packages', '.idea']);
const MAX_DEPTH = 6;

function walk(dir, depth, out) {
  if (depth > MAX_DEPTH) return out;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.well-known') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name.toLowerCase())) walk(p, depth + 1, out); }
    else if (/\.html?$/i.test(e.name)) out.html.push(p);
    else if (/\.css$/i.test(e.name)) out.css.push(p);
  }
  return out;
}

const strip = html => html
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '');

function describe(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const bodyM = /<body[^>]*>([\s\S]*)<\/body>/i.exec(raw);
  const body = strip(bodyM ? bodyM[1] : raw);
  const tags = body.match(/<([a-z][a-z0-9-]*)\b/gi) || [];
  const links = [...raw.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)]
    .map(m => (/href=["']([^"']+)["']/i.exec(m[0]) || [])[1])
    .filter(Boolean);
  const inlineStyle = /<style[\s\S]*?<\/style>/i.test(raw);
  // shell de app: corpo com pouquíssimos elementos, um deles um contêiner vazio de framework
  const shell = tags.length <= 3 && /<div[^>]+id=["']?(app|root|main)["']?[^>]*>\s*<\/div>/i.test(body);
  return { file, bytes: raw.length, elementos: tags.length, links, inlineStyle, shell };
}

function derive(projectDir) {
  const found = walk(projectDir, 0, { html: [], css: [] });
  const cands = found.html.map(describe)
    .filter(c => c.elementos > 0 || c.shell)
    .sort((a, b) => (b.elementos - a.elementos) || (a.file.length - b.file.length));

  const best = cands[0] || null;
  const rel = p => path.relative(projectDir, p).split(path.sep).join('/');
  let base = '', mock = null, styles = [];
  if (best) {
    const dir = path.dirname(best.file);
    // 'base' existe para o caso Axai: a interface mora numa subpasta e os hrefs do HTML são
    // relativos a ela. A raiz do projeto continua sendo onde o layers.json fica.
    base = rel(dir);
    if (base === 'layers' || base === '.') base = '';
    mock = base ? rel(best.file).slice(base.length + 1) : rel(best.file);
    if (!base && path.dirname(rel(best.file)) !== '.') mock = rel(best.file);
    const dirOf = base ? path.join(projectDir, base) : projectDir;
    styles = best.links
      .filter(h => !/^(https?:)?\/\//.test(h) && !h.startsWith('data:'))
      .map(h => h.replace(/^\.?\//, '').split('?')[0])
      .filter(h => fs.existsSync(path.join(dirOf, h)));
    if (!styles.length) styles = found.css.map(rel).filter(p => !p.startsWith('layers/')).slice(0, 8);
  }

  let authored = null;
  const manPath = path.join(projectDir, 'layers.json');
  if (fs.existsSync(manPath)) { try { authored = JSON.parse(fs.readFileSync(manPath, 'utf8')); } catch (e) {} }

  return {
    projeto: path.basename(projectDir),
    htmlEncontrados: found.html.length,
    cssEncontrados: found.css.length,
    classificacao: best ? (best.shell ? 'shell de app (precisa de snapshot)' : best.inlineStyle && !styles.length ? 'HTML único com <style> inline' : 'HTML estático') : 'nenhum HTML com corpo',
    derivado: { base, mock, styles },
    autoral: authored ? { base: authored.base || '', mock: authored.mock, styles: (authored.styles || []).map(String) } : null,
    acerto: authored ? {
      base: (authored.base || '') === base,
      mock: authored.mock === mock,
      styles: JSON.stringify((authored.styles || []).slice().sort()) === JSON.stringify(styles.slice().sort())
    } : null,
    candidatos: cands.slice(0, 5).map(c => rel(c.file) + ' · ' + c.elementos + ' el' + (c.shell ? ' · shell' : ''))
  };
}

const dirs = process.argv.slice(2);
if (!dirs.length) { console.error('uso: node tools/layers-derive.js <pasta> [pasta...]'); process.exit(1); }
const out = dirs.map(derive);
console.log(JSON.stringify(out, null, 2));
