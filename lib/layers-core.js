// LAYERS core — logica pura, sem DOM, sem React.
//
// Existe por dois motivos: o gate de commit (Vitest) precisa alcancar o miolo do loader sem
// subir um navegador, e o index.html precisa continuar sendo interface. Script classico, sem
// export: define globalThis.LayersCore e e carregado por <script> antes do support.js.
//
// Depende de csstree (vendor/csstree.js) para tudo que le CSS. O parser substituiu quatro
// varreduras por expressao regular; o que elas nao viam esta anotado em cada funcao.
(function (root) {
  'use strict';

  // resolvido a cada uso, nao na carga: no navegador vem de vendor/csstree.js (global csstree)
  // e no Vitest o setup instala o mesmo global — nenhum dos dois depende da ordem de carga.
  function cst() {
    var c = root.csstree;
    if (!c) throw new Error('csstree ausente: carregue vendor/csstree.js antes de lib/layers-core.js');
    return c;
  }

  // ---------------------------------------------------------------- caminhos

  // Rejeita, nunca normaliza: '..' aqui e sempre tentativa de sair da pasta conectada, e o
  // vetor real e uma entrada de .zip. joinPath (index.html) continua colapsando '..' porque
  // ali o caminho e relativo ao manifesto e resolver e o comportamento certo.
  function safePath(p) {
    var s = String(p == null ? '' : p).replace(/\\/g, '/');
    if (!s) return null;
    if (s.charAt(0) === '/') return null;
    if (/^[a-zA-Z]:/.test(s)) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return null;
    var parts = s.split('/');
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i];
      if (seg === '' || seg === '.' || seg === '..') return null;
    }
    return parts.join('/');
  }

  // ---------------------------------------------------------------- leitura de CSS

  var PARSE_OPTS = { positions: true, parseValue: false, parseAtrulePrelude: false };

  function parse(text) {
    return cst().parse(text, PARSE_OPTS);
  }

  // Um registro por seletor declarado. offsStart/offsEnd delimitam a regra inteira no texto
  // original (usado por ruleText e pelo patch); bodyStart/bodyEnd delimitam o interior do
  // bloco. media/layer trazem o contexto; nested marca regra aninhada dentro de outra.
  function parseSheet(file, text, lineOffset) {
    var off = lineOffset || 0;
    var out = [];
    var ast;
    try { ast = parse(text); } catch (e) { return out; }

    function walk(node, ctx, depth) {
      var children = node.block ? node.block.children : node.children;
      if (!children) return;
      children.forEach(function (child) {
        if (child.type === 'Atrule') {
          var name = (child.name || '').toLowerCase();
          var prelude = child.prelude && child.prelude.loc
            ? text.slice(child.prelude.loc.start.offset, child.prelude.loc.end.offset).trim()
            : '';
          var next = {
            media: name === 'media' ? [ctx.media, prelude].filter(Boolean).join(' and ') : ctx.media,
            layer: name === 'layer' ? [ctx.layer, prelude].filter(Boolean).join('.') : ctx.layer
          };
          if (child.block) walk(child, next, depth);
          return;
        }
        if (child.type !== 'Rule') return;
        var prelude = child.prelude;
        if (!prelude || prelude.type !== 'SelectorList') return;
        var bodyStart = child.block.loc.start.offset + 1;
        var bodyEnd = child.block.loc.end.offset - 1;
        var decls = [], raws = [];
        child.block.children.forEach(function (d) {
          if (d.type === 'Declaration') { decls.push(String(d.property).toLowerCase()); return; }
          // csstree 3.x nao desce em regra aninhada: o bloco interno chega como Raw. Reparsear
          // o texto cru e o que mantem nesting visivel, com offset e linha ainda absolutos.
          if (d.type === 'Raw' && d.loc && d.value && d.value.indexOf('{') >= 0) raws.push(d);
        });
        prelude.children.forEach(function (sel) {
          // texto do autor, nao csstree.generate: generate normaliza espacos em volta de
          // combinadores ('a > b' vira 'a>b') e o seletor e usado como chave em toda a UI.
          var s = text.slice(sel.loc.start.offset, sel.loc.end.offset).trim();
          if (!s) return;
          out.push({
            file: file,
            selector: s,
            line: child.loc.start.line + off,
            offsStart: child.loc.start.offset,
            offsEnd: child.loc.end.offset,
            bodyStart: bodyStart,
            bodyEnd: bodyEnd,
            decls: decls,
            media: ctx.media || '',
            layer: ctx.layer || '',
            nested: depth > 0,
            simple: /^\.[\w-]+(:[\w-]+(\([^)]*\))?)*$/.test(s)
          });
        });
        raws.forEach(function (d) {
          parseSheet(file, d.value, 0).forEach(function (r) {
            r.line = r.line - 1 + d.loc.start.line + off;
            r.offsStart += d.loc.start.offset;
            r.offsEnd += d.loc.start.offset;
            r.bodyStart += d.loc.start.offset;
            r.bodyEnd += d.loc.start.offset;
            r.media = ctx.media || '';
            r.layer = ctx.layer || '';
            r.nested = true;
            out.push(r);
          });
        });
        walk(child, ctx, depth + 1);
      });
    }

    walk(ast, { media: '', layer: '' }, 0);
    return out;
  }

  // Indice classe -> primeira regra que a abre. Mantem a regra de desempate do indice antigo
  // (um seletor simples vence um composto) e passa a enxergar @media, @layer e nesting, que a
  // varredura por contagem de chaves descartava.
  function buildIndex(sheets) {
    var byClass = {}, byKey = {}, all = [];
    sheets.forEach(function (s) {
      var rules = s.rules || parseSheet(s.file, s.text, s.lineOffset);
      rules.forEach(function (r) {
        all.push(r);
        var key = r.file + '|' + r.selector;
        if (byKey[key] === undefined) byKey[key] = r;
        var m = /^\.([\w-]+)/.exec(r.selector);
        if (!m) return;
        var k = '.' + m[1];
        if (!byClass[k] || (r.simple && !byClass[k].simple)) byClass[k] = r;
      });
    });
    return { byClass: byClass, byKey: byKey, rules: all };
  }

  // Indice --custom-property -> { value, file, line, selector, root }. Prefere a declaracao em
  // :root/:host/html/body/.__layers-root sobre uma escopada, mesmo que a escopada venha depois.
  function varIndex(sheets) {
    var idx = {};
    sheets.forEach(function (s) {
      var off = s.lineOffset || 0;
      var ast; try { ast = parse(s.text); } catch (e) { return; }
      (function walk(node) {
        var children = node.block ? node.block.children : node.children;
        if (!children) return;
        children.forEach(function (child) {
          if (child.type === 'Atrule') { if (child.block) walk(child); return; }
          if (child.type !== 'Rule' || !child.block) return;
          var prelude = child.prelude;
          var selText = prelude && prelude.loc ? s.text.slice(prelude.loc.start.offset, prelude.loc.end.offset).trim() : '';
          var root = /^(:root|:host|html|body|\.__layers-root)\b/.test(selText);
          child.block.children.forEach(function (d) {
            if (d.type !== 'Declaration' || d.property.slice(0, 2) !== '--') return;
            var name = d.property;
            var value = d.value && typeof d.value.value === 'string' ? d.value.value.trim() : '';
            var line = d.loc.start.line + off;
            if (!idx[name] || (root && !idx[name].root)) idx[name] = { value: value, file: s.file, line: line, selector: selText, root: root };
          });
          walk(child);
        });
      })(ast);
    });
    return idx;
  }

  function findRule(text, selector, file) {
    var rules = parseSheet(file || '', text, 0);
    for (var i = 0; i < rules.length; i++) if (rules[i].selector === selector) return rules[i];
    return null;
  }

  // Trecho exato da regra, delimitado pelo AST. A versao por regex parava no primeiro '}',
  // entao qualquer regra contendo um bloco aninhado voltava cortada.
  function ruleText(text, selector, file) {
    var r = findRule(text, selector, file);
    return r ? text.slice(r.offsStart, r.offsEnd) : null;
  }

  // Propriedades declaradas na regra, para o chip "declarada" do painel de origem.
  function declaredIn(text, selector, file) {
    var r = findRule(text, selector, file);
    return r ? new Set(r.decls) : null;
  }

  // ---------------------------------------------------------------- escrita de CSS

  // Troca o valor de uma declaracao existente por recorte de bytes no intervalo da propria
  // declaracao, entao indentacao, comentarios e ordem ficam como o autor escreveu. Regra
  // ausente vira append no fim do arquivo; propriedade ausente entra no fim do bloco,
  // repetindo a indentacao da ultima declaracao.
  function patchCssAt(text, selector, prop, value, file) {
    var rules = parseSheet(file || '', text, 0);
    var target = null;
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].selector !== selector) continue;
      // sem contexto ganha de dentro de @media: o patch tem de cair na regra base
      if (!target || (!rules[i].media && target.media)) target = rules[i];
    }
    if (!target) {
      return text.replace(/\s*$/, '') + '\n\n' + selector + ' {\n  ' + prop + ': ' + value + ';\n}\n';
    }
    var ast = parse(text);
    var hit = null;
    cst().walk(ast, {
      visit: 'Declaration',
      enter: function (d) {
        if (!d.loc) return;
        if (d.loc.start.offset < target.bodyStart || d.loc.end.offset > target.bodyEnd) return;
        if (String(d.property).toLowerCase() !== String(prop).toLowerCase()) return;
        hit = d;
      }
    });
    if (hit) {
      var important = hit.important ? ' !important' : '';
      return text.slice(0, hit.loc.start.offset) + prop + ': ' + value + important + text.slice(hit.loc.end.offset);
    }
    var body = text.slice(target.bodyStart, target.bodyEnd);
    var trimmed = body.replace(/\s*$/, '');
    var indentMatch = /\n([ \t]+)[^\n]*$/.exec(trimmed);
    var indent = indentMatch ? indentMatch[1] : '  ';
    var tailWs = /\s*$/.exec(body)[0];
    var insertAt = target.bodyStart + body.length - tailWs.length;
    var needsSemi = /\S/.test(trimmed) && !/;$/.test(trimmed);
    return text.slice(0, insertAt) + (needsSemi ? ';' : '') + '\n' + indent + prop + ': ' + value + ';' + text.slice(insertAt);
  }

  // ---------------------------------------------------------------- escopo para shadow root

  // Reescreve seletores no AST, nao no texto. As quatro substituicoes por regex que isto
  // substitui acertavam ':root' dentro de string, 'html' dentro de seletor de atributo e
  // 'body' dentro de comentario. @font-face sai daqui: dentro de shadow root nao carrega
  // fonte, entao volta separado para o chamador reinjetar no documento.
  function scopeAst(text, rootClass) {
    var cls = rootClass || '__layers-root';
    var ast;
    try { ast = parse(text); } catch (e) { return { css: text, faces: [] }; }

    var faces = [];
    var edits = [];

    cst().walk(ast, {
      visit: 'Atrule',
      enter: function (node) {
        if (String(node.name).toLowerCase() !== 'font-face' || !node.loc) return;
        faces.push(text.slice(node.loc.start.offset, node.loc.end.offset));
        edits.push({ start: node.loc.start.offset, end: node.loc.end.offset, text: '', drop: true });
      }
    });

    var dropped = faces.length ? edits.slice() : [];
    var inDropped = function (off) {
      for (var i = 0; i < dropped.length; i++) if (off >= dropped[i].start && off < dropped[i].end) return true;
      return false;
    };

    cst().walk(ast, {
      visit: 'Selector',
      enter: function (sel) {
        if (!sel.loc || inDropped(sel.loc.start.offset)) return;
        var out = [], changed = false, first = true;
        sel.children.forEach(function (part) {
          if (part.type === 'PseudoClassSelector' && String(part.name).toLowerCase() === 'root' && !part.children) {
            out.push(':host'); changed = true; first = false; return;
          }
          if (part.type === 'TypeSelector' && (part.name === 'html' || part.name === 'body')) {
            out.push('.' + cls); changed = true; first = false; return;
          }
          // o combinador descendente tem name ' ': emitir ' ' + name + ' ' daria tres espacos
          if (part.type === 'Combinator') { out.push(/\S/.test(part.name) ? ' ' + part.name + ' ' : ' '); first = false; return; }
          if (!part.loc) { out.push(cst().generate(part)); first = false; return; }
          var raw = text.slice(part.loc.start.offset, part.loc.end.offset);
          if (first && raw === '*') { out.push('.' + cls + ', .' + cls + ' *'); changed = true; first = false; return; }
          out.push(raw); first = false;
        });
        if (changed) edits.push({ start: sel.loc.start.offset, end: sel.loc.end.offset, text: out.join('') });
      }
    });

    // aplica de tras para frente para os offsets seguirem validos; edicao contida numa ja
    // aplicada (seletor dentro de @font-face removido) nao existe, mas a guarda fica
    edits.sort(function (a, b) { return b.start - a.start; });
    var css = text, last = Infinity;
    edits.forEach(function (e) {
      if (e.end > last) return;
      css = css.slice(0, e.start) + e.text + css.slice(e.end);
      last = e.start;
    });
    return { css: css, faces: faces };
  }

  // ---------------------------------------------------------------- heuristicas

  // Folha de utilitarios (Tailwind e afins): editar a regra de uma classe utilitaria muda todo
  // o projeto, entao o loader marca e desabilita Aplicar com motivo, em vez de fingir que deu.
  function isUtilitySheet(text) {
    // @tailwind so aparece no fonte de uma folha gerada por framework, entao basta por si.
    // '@layer utilities' NAO basta: uma folha autoral pode declarar a camada com duas regras,
    // e marcar o projeto por causa disso desabilitaria Aplicar sem motivo.
    if (/@tailwind\b/.test(text)) return true;
    var rules = parseSheet('', text, 0);
    if (rules.length < 800) return false;
    var single = 0;
    for (var i = 0; i < rules.length; i++) if (/^\.[^\s,>+~]+$/.test(rules[i].selector)) single++;
    return single > 800;
  }

  // ---------------------------------------------------------------- manifesto derivado

  // Regex sobre HTML por necessidade, nao atalho: sem jsdom no projeto (Vitest roda ambiente
  // node, sem DOMParser), e um Document ja parseado violaria o "sem DOM" deste modulo. Porta a
  // heuristica de tools/layers-derive.js — nao o fallback cego de styles (ate 8 .css
  // arbitrarios): seguro num diagnostico CLI que so imprime, perigoso gravado como manifesto
  // autoritativo.
  var stripHtml = function (html) {
    return html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '');
  };

  function matchLinks(text) {
    var re = /<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi;
    var hrefRe = /href=["']([^"']+)["']/i;
    var out = [], m;
    while ((m = re.exec(text))) {
      var hm = hrefRe.exec(m[0]);
      if (hm) out.push(hm[1]);
    }
    return out;
  }

  function describeHtml(path, text) {
    var noComment = text.replace(/<!--[\s\S]*?-->/g, '');
    var bodyM = /<body[^>]*>([\s\S]*)<\/body>/i.exec(text);
    var body = stripHtml(bodyM ? bodyM[1] : text);
    var tags = body.match(/<([a-z][a-z0-9-]*)\b/gi) || [];
    var links = matchLinks(noComment);
    var inlineStyle = /<style[\s\S]*?<\/style>/i.test(noComment);
    var shell = tags.length <= 3 && /<div[^>]+id=["']?(app|root|main)["']?[^>]*>\s*<\/div>/i.test(body);
    return { path: path, elementos: tags.length, links: links, inlineStyle: inlineStyle, shell: shell };
  }

  function dirnamePosix(p) {
    var i = p.lastIndexOf('/');
    return i < 0 ? '' : p.slice(0, i);
  }

  // Resolve 'href' relativo a 'dir', ambos ja caminhos relativos a raiz do projeto. null se
  // '..' tentar sair da raiz — esse caminho nunca existira na lista de arquivos coletada.
  function resolvePosix(dir, rel) {
    // href absoluto ('/css/app.css') nao e relativo ao mock — path.resolve(dir, '/x') do node
    // (a fonte portada) ignora 'dir' e resolve a partir da raiz do disco, que nunca bate com um
    // caminho de projeto; aqui e mais simples e mais seguro so recusar
    if (rel.charAt(0) === '/') return null;
    var stack = dir ? dir.split('/') : [];
    var parts = rel.split('/');
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i];
      if (seg === '' || seg === '.') continue;
      if (seg === '..') { if (!stack.length) return null; stack.pop(); }
      else stack.push(seg);
    }
    return stack.join('/');
  }

  // files: [{ path, kind: 'html'|'css', text }], caminhos POSIX relativos a raiz da pasta.
  // Nao existe fs aqui: "o css existe" vira checagem contra a propria lista recebida.
  function deriveManifest(files) {
    var list = files || [];
    var htmlCands = [], cssSet = {};
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      var p = safePath(f.path);
      if (!p) continue;
      if (f.kind === 'html') htmlCands.push(describeHtml(p, f.text || ''));
      else if (f.kind === 'css') cssSet[p] = true;
    }

    var cands = [];
    for (i = 0; i < htmlCands.length; i++) if (htmlCands[i].elementos > 0 || htmlCands[i].shell) cands.push(htmlCands[i]);
    cands.sort(function (a, b) { return (b.elementos - a.elementos) || (a.path.length - b.path.length); });
    var best = cands[0] || null;
    if (!best) return { classification: 'nenhum HTML com corpo', base: '', mock: null, styles: [] };

    var dir = dirnamePosix(best.path);
    // 'base' existe pro caso Axai: a interface mora numa subpasta e os hrefs do HTML sao
    // relativos a ela. 'layers' e a raiz do projeto contam como "sem base" — mock guarda o
    // caminho completo dos dois jeitos.
    var base = (dir === '' || dir === 'layers') ? '' : dir;
    var mock = base ? best.path.slice(base.length + 1) : best.path;

    var styles = [], seen = {};
    for (i = 0; i < best.links.length; i++) {
      var href = best.links[i];
      if (/^(https?:)?\/\//i.test(href) || /^data:/i.test(href)) continue;
      href = href.split('?')[0];
      var resolved = resolvePosix(dir, href);
      if (!resolved || !cssSet[resolved]) continue;
      var rel = !base ? resolved : (resolved.indexOf(base + '/') === 0 ? resolved.slice(base.length + 1) : null);
      if (rel === null || seen[rel]) continue;
      seen[rel] = true;
      styles.push(rel);
    }

    var classification = best.shell ? 'shell de app (precisa de snapshot)'
      : (best.inlineStyle && !styles.length) ? 'HTML único com <style> inline'
      : 'HTML estático';

    return { classification: classification, base: base, mock: mock, styles: styles };
  }

  // Decisao pura de quando tentar auto-criar layers.json: so ausencia real (NotFoundError) numa
  // pasta local gravavel. Fixture HTTP/.zip/GitHub lancam Error generico (read-only, nunca
  // devem escrever); TypeMismatchError/NotAllowedError sao outras causas que nao "ausente".
  function shouldAutoCreate(err, hasDir) {
    return !!(hasDir && err && err.name === 'NotFoundError');
  }

  // Paths cujo mtime mudou ou sumiu desde o snapshot; path ausente de current = indeterminado.
  function staleFiles(seen, current) {
    return Object.keys(seen).filter(function (p) {
      const c = current[p];
      return c === 'missing' || (typeof c === 'number' && c !== seen[p]);
    });
  }

  // Ha edicao nao salva (changes pendentes ou buffer de codigo)?
  function hasUnsaved(changes, codeBuf) {
    return (changes || []).length > 0 || Object.keys(codeBuf || {}).length > 0;
  }

  // Recorta o mapa de mtimes so aos paths vigiados (ignora artefatos fora de `paths`).
  function pickWatched(mtimes, paths) {
    const out = {};
    (paths || []).forEach(function (p) {
      if (p && Object.prototype.hasOwnProperty.call(mtimes, p)) out[p] = mtimes[p];
    });
    return out;
  }

  // ---------------------------------------------------------------- .zip

  // Leitor de zip pelo diretorio central, ~80 linhas e nenhuma dependencia nova: o navegador
  // ja descomprime deflate. So le o que o loader precisa; nao escreve zip nenhum.
  //
  // Toda entrada passa por safePath ANTES de entrar no Map. Um .zip com '../../evil.css' e o
  // vetor real de travessia aqui — a pasta conectada pelo picker nao deixa sair, um arquivo
  // que o usuario baixou deixa.
  var ZIP = { EOCD: 0x06054b50, CEN: 0x02014b50, LOC: 0x04034b50 };

  function findEocd(view, len) {
    // o comentario final do zip tem no maximo 64 KB; procurar de tras para frente e o normal
    var max = Math.min(len, 0xffff + 22);
    for (var i = 22; i <= max; i++) {
      var at = len - i;
      if (view.getUint32(at, true) === ZIP.EOCD) return at;
    }
    return -1;
  }

  async function inflateRaw(bytes) {
    var ds = new DecompressionStream('deflate-raw');
    var stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function openZip(buffer) {
    var bytes = new Uint8Array(buffer);
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var eocd = findEocd(view, bytes.length);
    if (eocd < 0) throw new Error('nao parece um .zip (fim do diretorio central nao encontrado)');

    var count = view.getUint16(eocd + 10, true);
    var cenAt = view.getUint32(eocd + 16, true);
    if (cenAt === 0xffffffff || count === 0xffff) throw new Error('zip64 nao suportado — descompacte e conecte a pasta');

    var files = new Map();
    var skipped = [];
    var utf8 = new TextDecoder();
    var p = cenAt;

    for (var i = 0; i < count; i++) {
      if (view.getUint32(p, true) !== ZIP.CEN) throw new Error('diretorio central corrompido na entrada ' + i);
      var method = view.getUint16(p + 10, true);
      var compSize = view.getUint32(p + 20, true);
      var nameLen = view.getUint16(p + 28, true);
      var extraLen = view.getUint16(p + 30, true);
      var commentLen = view.getUint16(p + 32, true);
      var locAt = view.getUint32(p + 42, true);
      var rawName = utf8.decode(bytes.subarray(p + 46, p + 46 + nameLen));
      p += 46 + nameLen + extraLen + commentLen;

      if (rawName.charAt(rawName.length - 1) === '/') continue; // diretorio
      var name = safePath(rawName);
      if (!name) { skipped.push(rawName); continue; }

      if (view.getUint32(locAt, true) !== ZIP.LOC) { skipped.push(rawName); continue; }
      var locName = view.getUint16(locAt + 26, true);
      var locExtra = view.getUint16(locAt + 28, true);
      var dataAt = locAt + 30 + locName + locExtra;
      var raw = bytes.subarray(dataAt, dataAt + compSize);

      if (method === 0) files.set(name, raw.slice());
      else if (method === 8) files.set(name, await inflateRaw(raw));
      else skipped.push(rawName);
    }

    return { files: files, skipped: skipped };
  }

  // A raiz do projeto dentro do zip nem sempre e a raiz do arquivo: baixar um repositorio do
  // GitHub embrulha tudo em '<repo>-<ref>/'. Se houver exatamente uma pasta no topo e o
  // layers.json estiver dentro dela, essa pasta e a raiz.
  function zipRoot(files) {
    if (files.has('layers.json')) return '';
    var tops = new Set();
    files.forEach(function (_, k) {
      var i = k.indexOf('/');
      tops.add(i < 0 ? '' : k.slice(0, i));
    });
    if (tops.size !== 1) return '';
    var only = tops.values().next().value;
    return only && files.has(only + '/layers.json') ? only + '/' : '';
  }

  // ------------------------------------------------------- persistencia (layers/v1)

  // Quatro chaves com prefixo de versao no lugar das tres soltas da v2.24. Separadas por
  // ciclo de vida, nao por comodidade: 'ui' e preferencia de interface, 'projects' e o
  // historico, 'session' e o que a aba estava fazendo. Nenhuma delas guarda conteudo de
  // arquivo nem handle de pasta (F:68) — handle mora no IndexedDB.
  var LS = {
    meta: 'layers/v1/meta',
    ui: 'layers/v1/ui',
    projects: 'layers/v1/projects',
    session: 'layers/v1/session'
  };
  var LS_OLD = ['layers-cfg', 'layers-hist', 'layers-inter-size'];
  var CFG_KEYS = ['theme', 'selectColor', 'originColors', 'panelHeader', 'fontScale', 'logoGrad'];
  var SCHEMA = 1;

  function getJson(storage, key, fallback) {
    try {
      var raw = storage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      var v = JSON.parse(raw);
      return v === null || v === undefined ? fallback : v;
    } catch (e) { return fallback; }
  }

  function setJson(storage, key, value) {
    try { storage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  function emptySession() {
    return { lastProjectId: null, selId: '0', isoId: null, camera: null };
  }

  function readConfig(storage) {
    var session = getJson(storage, LS.session, null);
    var out = {
      ui: getJson(storage, LS.ui, {}),
      projects: getJson(storage, LS.projects, []),
      session: session && typeof session === 'object' ? session : emptySession()
    };
    if (!out.ui || typeof out.ui !== 'object' || out.ui instanceof Array) out.ui = {};
    if (!(out.projects instanceof Array)) out.projects = [];
    // null e valor legitimo de lastProjectId ('nenhum projeto'); ausente nao e.
    if (!('lastProjectId' in out.session)) out.session.lastProjectId = null;
    return out;
  }

  // Uma escrita por rajada: quem chama e o persistSoon do index.html, com trailing de 400 ms.
  function writeConfig(storage, cfg, migratedFrom) {
    var ok = setJson(storage, LS.ui, cfg.ui || {});
    ok = setJson(storage, LS.projects, cfg.projects || []) && ok;
    ok = setJson(storage, LS.session, cfg.session || emptySession()) && ok;
    var meta = { schema: SCHEMA, savedAt: new Date().toISOString() };
    // migratedFrom e registro historico: uma gravacao comum nao pode apaga-lo
    var prev = getJson(storage, LS.meta, null);
    var from = migratedFrom || (prev && prev.migratedFrom);
    if (from) meta.migratedFrom = from;
    return setJson(storage, LS.meta, meta) && ok;
  }

  // Segunda etapa da escada que a v2.24 comecou ('traval-layer-editor-*' -> 'layers-*'): as
  // tres chaves antigas viram as quatro de layers/v1 e **nao sao apagadas** — removidas na
  // v2.26, com uma linha no CHANGELOG. A presenca de layers/v1/meta e o que torna idempotente.
  function migrateConfig(storage) {
    var meta = getJson(storage, LS.meta, null);
    if (meta && meta.schema === SCHEMA) return readConfig(storage);

    var old = getJson(storage, 'layers-cfg', {});
    var ui = {};
    for (var i = 0; i < CFG_KEYS.length; i++) {
      var k = CFG_KEYS[i];
      if (old && old[k] !== undefined) ui[k] = old[k];
    }
    var inter = getJson(storage, 'layers-inter-size', null);
    if (inter && inter.w) ui.interSize = { w: inter.w, h: inter.h || 0, split: inter.split || 210 };

    var hist = getJson(storage, 'layers-hist', []);
    var cfg = {
      ui: ui,
      projects: hist instanceof Array ? hist : [],
      session: emptySession()
    };
    writeConfig(storage, cfg, LS_OLD);
    return cfg;
  }

  // Arquivo de export/import: so o que o import consome. Sessao fica fora (camera e ultimo
  // projeto sao da aba, nao do arquivo) e handle de pasta tambem — FileSystemHandle nao e
  // serializavel, e por isso o import avisa que pasta local precisa ser reconectada.
  function exportConfig(cfg) {
    return {
      schema: SCHEMA,
      exportedAt: new Date().toISOString(),
      ui: cfg.ui || {},
      projects: cfg.projects || []
    };
  }

  // 'ui' substitui; 'projects' faz merge por id preservando o pinned local (fixar e decisao
  // desta maquina, nao do arquivo); 'session' nunca entra — a aba que importa continua na
  // sua propria sessao.
  function importConfig(file, current) {
    if (!file || typeof file !== 'object') throw new Error('arquivo de configuracao ilegivel');
    if (file.schema !== SCHEMA) throw new Error('schema ' + file.schema + ' nao suportado (esperado ' + SCHEMA + ')');
    var ui = file.ui && typeof file.ui === 'object' ? file.ui : (current.ui || {});
    var projects = (current.projects || []).slice();
    if (file.projects instanceof Array) {
      file.projects.forEach(function (p) {
        if (!p || !p.id) return;
        var at = -1;
        for (var i = 0; i < projects.length; i++) if (projects[i].id === p.id) { at = i; break; }
        if (at < 0) projects.push(p);
        else projects[at] = assign({}, p, { pinned: projects[at].pinned, last: Math.max(p.last || 0, projects[at].last || 0) });
      });
    }
    return { ui: ui, projects: projects, session: current.session || emptySession() };
  }

  // ---------------------------------------------------------------- template dc (<x-dc>)

  // Codigos de recusa estaveis: a UI deriva texto e snippet deles, testes conferem o codigo.
  var DC_CODES = Object.freeze({
    VALUE_HAS_BINDING: 'VALUE_HAS_BINDING',
    MAP_MISALIGNED: 'MAP_MISALIGNED',
    SOURCE_CHANGED: 'SOURCE_CHANGED',
    SOURCE_NOT_CSS: 'SOURCE_NOT_CSS',
    UTILITY_SHEET: 'UTILITY_SHEET',
    HELMET_PLACEHOLDER: 'HELMET_PLACEHOLDER',
    SNAPSHOT_STYLE: 'SNAPSHOT_STYLE',
    READONLY_ORIGIN: 'READONLY_ORIGIN',
    TPL_FANOUT: 'TPL_FANOUT',
    NO_INLINE_STYLE: 'NO_INLINE_STYLE',
    PROP_NOT_INLINE: 'PROP_NOT_INLINE',
    VALUE_UNSAFE: 'VALUE_UNSAFE'
  });

  var DC_RAW_TEXT = { script: 1, style: 1, xmp: 1, iframe: 1, noembed: 1, noframes: 1, textarea: 1, title: 1 };
  // o parser de fragmento ignora estas tags de abertura, entao o runtime nao as carimba
  var DC_NOT_ELEMENTS = { html: 1, head: 1, body: 1 };
  // <constructor> ou <tostring> sao elementos validos (HTMLUnknownElement): a busca ignora Object.prototype
  function dcHas(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  // O runtime carimba data-dc-tpl="N" em cada elemento do template em ordem de documento
  // (support.js compileTemplate). Aqui o tokenizador conta start tags na mesma ordem, direto no
  // texto do arquivo, e guarda onde esta o valor de style="" de cada uma (offsets no arquivo
  // inteiro). O conteudo de <template> nao e carimbado, entao o tokenizador o pula.
  function mapDcTemplate(text) {
    var open = /<x-dc(?:\s[^>]*)?>/.exec(text);
    if (!open) return [];
    var end = text.lastIndexOf('</x-dc>');
    if (end === -1 || end < open.index) return [];
    var out = [];
    var linePos = 0;
    var lineNo = 1;
    var i = open.index + open[0].length;
    while (i < end) {
      var lt = text.indexOf('<', i);
      if (lt === -1 || lt >= end) break;
      if (text.substr(lt, 4) === '<!--') {
        var ce = text.indexOf('-->', lt + 4);
        i = ce === -1 ? end : ce + 3;
        continue;
      }
      var c = text.charAt(lt + 1);
      if (c === '/' || c === '!' || c === '?') {
        var gt = text.indexOf('>', lt + 2);
        i = gt === -1 ? end : gt + 1;
        continue;
      }
      if (!/[A-Za-z]/.test(c)) { i = lt + 1; continue; }
      var j = lt + 1;
      while (j < end && !/[\s\/>]/.test(text.charAt(j))) j++;
      var tag = text.slice(lt + 1, j).toLowerCase();
      var attrNames = [];
      var styleRange = null;
      for (;;) {
        while (j < end && /[\s\/]/.test(text.charAt(j))) j++;
        if (j >= end) break;
        if (text.charAt(j) === '>') { j++; break; }
        var ns = j;
        while (j < end && !/[\s=\/>]/.test(text.charAt(j))) j++;
        if (j === ns) { j++; continue; }
        var name = text.slice(ns, j).toLowerCase();
        attrNames.push(name);
        while (j < end && /\s/.test(text.charAt(j))) j++;
        if (text.charAt(j) !== '=') continue;
        j++;
        while (j < end && /\s/.test(text.charAt(j))) j++;
        var q = text.charAt(j);
        if (q === '"' || q === "'") {
          var qe = text.indexOf(q, j + 1);
          if (qe === -1 || qe >= end) { j = end; break; }
          if (name === 'style' && !styleRange) styleRange = [j + 1, qe];
          j = qe + 1;
        } else {
          while (j < end && !/[\s>]/.test(text.charAt(j))) j++;
        }
      }
      if (dcHas(DC_NOT_ELEMENTS, tag)) { i = j; continue; }
      for (var nl = text.indexOf('\n', linePos); nl !== -1 && nl < lt; nl = text.indexOf('\n', linePos)) { lineNo++; linePos = nl + 1; }
      out.push({ tplId: out.length, tag: tag, line: lineNo, attrNames: attrNames, styleRange: styleRange });
      i = j;
      if (dcHas(DC_RAW_TEXT, tag)) {
        var closeRe = new RegExp('</' + tag + '[\\s/>]', 'ig');
        closeRe.lastIndex = j;
        var cm = closeRe.exec(text);
        i = cm && cm.index < end ? cm.index : end;
      } else if (tag === 'template') {
        // o conteudo de <template> mora em .content e o runtime nao o carimba: pula ate o fechamento
        var tplRe = /<(\/?)template[\s\/>]/ig;
        tplRe.lastIndex = j;
        var depth = 1;
        i = end;
        for (var tm = tplRe.exec(text); tm && tm.index < end; tm = tplRe.exec(text)) {
          depth += tm[1] ? -1 : 1;
          if (!depth) { i = tm.index; break; }
        }
      }
    }
    return out;
  }

  // Declaracoes do style="": divide em ';' fora de parenteses, aspas e {{ }}.
  function dcDecls(text, range) {
    var decls = [];
    var depth = 0;
    var quote = '';
    var bind = false;
    var from = range[0];
    for (var k = range[0]; k <= range[1]; k++) {
      var ch = k < range[1] ? text.charAt(k) : ';';
      if (quote) { if (ch === quote) quote = ''; continue; }
      if (bind) { if (ch === '}' && text.charAt(k + 1) === '}') { bind = false; k++; } continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '{' && text.charAt(k + 1) === '{') { bind = true; k++; continue; }
      if (ch === '(') { depth++; continue; }
      if (ch === ')') { if (depth > 0) depth--; continue; }
      if (ch !== ';' || depth > 0) continue;
      var seg = text.slice(from, k);
      var colon = seg.indexOf(':');
      if (colon !== -1) {
        var vs = from + colon + 1;
        while (vs < k && /\s/.test(text.charAt(vs))) vs++;
        var ve = k;
        while (ve > vs && /\s/.test(text.charAt(ve - 1))) ve--;
        var raw = text.slice(vs, ve);
        var imp = /\s*!important\s*$/i.exec(raw);
        decls.push({
          prop: seg.slice(0, colon).trim().toLowerCase(),
          valStart: vs,
          valEnd: imp ? vs + imp.index : ve,
          value: (imp ? raw.slice(0, imp.index) : raw).trim(),
          binding: /\{\{|\}\}/.test(raw)
        });
      }
      from = k + 1;
    }
    return decls;
  }

  // Ultima declaracao da propriedade vence, como no CSS.
  function dcFindDecl(text, range, prop) {
    var want = String(prop).toLowerCase();
    var decls = dcDecls(text, range);
    for (var i = decls.length - 1; i >= 0; i--) if (decls[i].prop === want) return decls[i];
    return null;
  }

  // Todas as declaracoes do style="" (nome em minusculas, valor sem !important), para conferir o
  // fonte contra o render sem expor os offsets internos.
  function styleDecls(text, range) {
    if (!range) return [];
    return dcDecls(text, range).map(function (d) { return { prop: d.prop, value: d.value, binding: d.binding }; });
  }

  function styleDeclAt(text, range, prop) {
    if (!range) return null;
    var d = dcFindDecl(text, range, prop);
    return d ? { value: d.value, binding: d.binding } : null;
  }

  function dcNorm(v) { return String(v).trim().replace(/\s+/g, ' ').toLowerCase(); }

  function dcRefuse(code, detail) { return { ok: false, code: code, detail: detail || {} }; }

  // Troca so o valor da declaracao dentro do style="": ordem, separadores, espacos e !important
  // ficam como o autor escreveu. Recusa em vez de adivinhar quando o texto nao e o esperado.
  function patchAttrAt(text, range, prop, from, to) {
    if (!range) return dcRefuse(DC_CODES.NO_INLINE_STYLE);
    var d = dcFindDecl(text, range, prop);
    if (!d) return dcRefuse(DC_CODES.SOURCE_CHANGED, { prop: prop, reason: 'missing' });
    if (d.binding) return dcRefuse(DC_CODES.VALUE_HAS_BINDING, { prop: prop, value: d.value });
    if (dcNorm(d.value) !== dcNorm(from)) {
      return dcRefuse(DC_CODES.SOURCE_CHANGED, { prop: prop, expected: from, found: d.value });
    }
    var quote = text.charAt(range[0] - 1);
    if (typeof to !== 'string' || !to.trim() || to.indexOf(quote) !== -1 || /[;&\r\n]|\{\{|\}\}/.test(to)) {
      return dcRefuse(DC_CODES.VALUE_UNSAFE, { prop: prop, value: to });
    }
    return { ok: true, text: text.slice(0, d.valStart) + to + text.slice(d.valEnd) };
  }

  function dcSameTags(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i].tag !== b[i].tag) return false;
    return true;
  }

  // Aplica varias edicoes { tplId, prop, to } no texto atual do arquivo. Duas guardas: o template
  // tem de ter a mesma sequencia de tags de quando o projeto foi carregado (senao os tplId
  // apontam para outro elemento) e o valor no fonte tem de ser o que o load viu. Recusa por
  // item; o resto e aplicado. Offsets sao recalculados a cada patch porque o texto muda.
  function patchDc(loadText, freshText, list) {
    var loaded = mapDcTemplate(loadText);
    var text = freshText;
    var refused = [];
    var applied = 0;
    if (!dcSameTags(loaded, mapDcTemplate(freshText))) {
      return {
        text: freshText,
        applied: 0,
        refused: list.map(function (it) { return { item: it, code: DC_CODES.MAP_MISALIGNED, detail: { reason: 'template changed' } }; })
      };
    }
    list.forEach(function (it) {
      var le = loaded[it.tplId];
      if (!le) { refused.push({ item: it, code: DC_CODES.MAP_MISALIGNED, detail: { tplId: it.tplId } }); return; }
      if (!le.styleRange) { refused.push({ item: it, code: DC_CODES.NO_INLINE_STYLE, detail: {} }); return; }
      var seen = styleDeclAt(loadText, le.styleRange, it.prop);
      if (!seen) { refused.push({ item: it, code: DC_CODES.PROP_NOT_INLINE, detail: { prop: it.prop } }); return; }
      var r = patchAttrAt(text, mapDcTemplate(text)[it.tplId].styleRange, it.prop, seen.value, it.to);
      if (!r.ok) { refused.push({ item: it, code: r.code, detail: r.detail }); return; }
      text = r.text;
      applied++;
    });
    return { text: text, applied: applied, refused: refused };
  }

  // seen = [{ tplId, tag }] lido do mock. Qualquer tag que nao bata com o mapa invalida o mapa
  // inteiro: um deslocamento de indice grava no elemento errado, entao nao se grava nenhum.
  function checkDcMap(map, seen) {
    var bad = [];
    for (var i = 0; i < seen.length; i++) {
      var e = map[seen[i].tplId];
      var found = String(seen[i].tag).toLowerCase();
      if (!e || e.tag !== found) bad.push({ tplId: seen[i].tplId, expected: e ? e.tag : null, found: found });
    }
    return bad.length ? dcRefuse(DC_CODES.MAP_MISALIGNED, { bad: bad }) : { ok: true };
  }

  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }

  // ---------------------------------------------------------------- projeto por pasta (?project, aberto pelo Atlas)

  // Pasta absoluta (Windows C:\ ou C:/, POSIX /). Relativa nao: o middleware nao tem base para resolver.
  function isAbsDir(d) { return /^(?:[A-Za-z]:[\\/]|\/(?![\\/]))/.test(String(d || '')); }

  // ?project=<pasta absoluta> -> base same-origin servida pelo vite (/@project/<enc>/); a pasta vai num segmento so.
  function projectBase(search) {
    var d = new URLSearchParams(search || '').get('project');
    return d && isAbsDir(d) ? '/@project/' + encodeURIComponent(d) + '/' : null;
  }

  // '/@project/<enc dir>/<segmentos>' -> { dir, rel } ou null. Cada segmento e decodificado e rel passa por safePath
  // (recusa '..', '.', vazio, absoluto, esquema): o middleware so junta dir + rel depois disto.
  function projectRequest(url) {
    var m = /^\/@project\/([^/]+)\/(.+)$/.exec(String(url || '').split('?')[0]);
    if (!m) return null;
    var dir, rel;
    try { dir = decodeURIComponent(m[1]); rel = m[2].split('/').map(decodeURIComponent).join('/'); } catch (e) { return null; }
    if (!isAbsDir(dir)) return null;
    var ok = safePath(rel);
    return ok ? { dir: dir, rel: ok } : null;
  }

  var api = {
    safePath: safePath,
    projectBase: projectBase,
    projectRequest: projectRequest,
    openZip: openZip,
    zipRoot: zipRoot,
    parseSheet: parseSheet,
    buildIndex: buildIndex,
    varIndex: varIndex,
    findRule: findRule,
    ruleText: ruleText,
    declaredIn: declaredIn,
    patchCssAt: patchCssAt,
    DC_CODES: DC_CODES,
    mapDcTemplate: mapDcTemplate,
    styleDeclAt: styleDeclAt,
    styleDecls: styleDecls,
    patchAttrAt: patchAttrAt,
    checkDcMap: checkDcMap,
    patchDc: patchDc,
    scopeAst: scopeAst,
    isUtilitySheet: isUtilitySheet,
    deriveManifest: deriveManifest,
    shouldAutoCreate: shouldAutoCreate,
    staleFiles: staleFiles,
    hasUnsaved: hasUnsaved,
    pickWatched: pickWatched,
    CFG_KEYS: CFG_KEYS,
    readConfig: readConfig,
    writeConfig: writeConfig,
    migrateConfig: migrateConfig,
    exportConfig: exportConfig,
    importConfig: importConfig
  };

  root.LayersCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
