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

  return { css, travalSheets, dcText, manifestFiles, zip };
}
