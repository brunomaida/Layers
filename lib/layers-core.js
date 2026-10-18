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
        var parts = sel.children.toArray();
        // S2.22c: :root/html seguidos de atributo, classe ou pseudo no mesmo composto casam o host: :host([attr]) (":host[attr]" nunca casa)
        var hostTail = function (i) {
          var j = i + 1;
          while (j < parts.length && parts[j].loc && /^(AttributeSelector|ClassSelector|PseudoClassSelector)$/.test(parts[j].type)) j++;
          // :has() dentro de :host() olha os filhos do host (nao existem no shadow): o composto com :has fica como estava
          for (var h = i + 1; h < j; h++) if (parts[h].type === 'PseudoClassSelector' && String(parts[h].name).toLowerCase() === 'has') return i + 1;
          return j;
        };
        for (var pi = 0; pi < parts.length; pi++) { var part = parts[pi];
          var isRoot = part.type === 'PseudoClassSelector' && String(part.name).toLowerCase() === 'root' && !part.children;
          var isHtml = part.type === 'TypeSelector' && part.name === 'html';
          if (isRoot || isHtml) {
            var end = hostTail(pi);
            if (end > pi + 1) { out.push(':host(' + text.slice(parts[pi + 1].loc.start.offset, parts[end - 1].loc.end.offset) + ')'); changed = true; first = false; pi = end - 1; continue; }
          }
          if (isRoot) {
            out.push(':host'); changed = true; first = false; continue;
          }
          if (part.type === 'TypeSelector' && (part.name === 'html' || part.name === 'body')) {
            out.push('.' + cls); changed = true; first = false; continue;
          }
          // o combinador descendente tem name ' ': emitir ' ' + name + ' ' daria tres espacos
          if (part.type === 'Combinator') { out.push(/\S/.test(part.name) ? ' ' + part.name + ' ' : ' '); first = false; continue; }
          if (!part.loc) { out.push(cst().generate(part)); first = false; continue; }
          var raw = text.slice(part.loc.start.offset, part.loc.end.offset);
          if (first && raw === '*') { out.push('.' + cls + ', .' + cls + ' *'); changed = true; first = false; continue; }
          out.push(raw); first = false;
        }
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

  // Origem TS/JS: o trecho e so referencia; o ajuste fica registrado e o patch e manual.
  function isManualSource(file) {
    return typeof file === 'string' && /\.[cm]?[jt]sx?$/i.test(file);
  }

  // S2.20: um data-src escrito a mao ("arquivo|seletor|linha") so vale enquanto a folha carregada
  // ainda mostra o seletor naquela linha. 'external' = arquivo fora das folhas (patch manual, ex. .ts).
  function checkOrigin(src, files, classes, id) {
    var m = /^(.*)\|([^|]*)\|(\d+)$/.exec(src || '');
    if (!m) return 'ok';
    var text = files[m[1]];
    if (typeof text !== 'string') return 'external';
    if (/^tpl:/.test(m[2])) return 'ok';
    var lines = text.split(/\r?\n/), at = Number(m[3]) - 1, prelude = '', i;
    if (at < 0 || at >= lines.length) return 'stale';
    // prelude = da linha ate o primeiro '{': uma lista de seletores comeca antes do seletor do no
    for (i = at; i < lines.length; i++) { prelude += lines[i] + '\n'; if (lines[i].indexOf('{') >= 0) break; }
    var has = function (tok) {
      var k = -1, c;
      while ((k = prelude.indexOf(tok, k + 1)) >= 0) { c = prelude.charAt(k + tok.length); if (!c || !/[A-Za-z0-9_-]/.test(c)) return true; }
      return false;
    };
    if (has(m[2])) return 'ok';
    for (i = 0; i < (classes || []).length; i++) if (has('.' + classes[i])) return 'ok';
    return id && has('#' + id) ? 'ok' : 'stale';
  }

  // Paths cujo mtime mudou ou sumiu desde o snapshot; path ausente de current = indeterminado.
  function staleFiles(seen, current) {
    return Object.keys(seen).filter(function (p) {
      const c = current[p];
      // 'missing' ja visto (e ignorado) nao volta a acusar; reaparecer com outro valor acusa
      return (c === 'missing' && seen[p] !== 'missing') || (typeof c === 'number' && c !== seen[p]);
    });
  }

  // Depois de "Ignorar": aceita os mtimes atuais e mantem vigiados os arquivos ausentes (marcados
  // 'missing'), para que um salvamento atomico (apaga + renomeia) volte a ser notado.
  // `seen` = o watch como estava quando `current` foi lido: um path que uma gravacao propria moveu
  // desde entao (watch[p] !== seen[p]) nao volta ao valor antigo e acusaria um banner falso.
  function dismissWatch(watch, current, seen) {
    const out = Object.assign({}, watch);
    Object.keys(current || {}).forEach(function (p) {
      if (seen && watch[p] !== seen[p]) return;
      if (typeof current[p] === 'number' || current[p] === 'missing') out[p] = current[p];
    });
    return out;
  }

  // S2.22e: acao `attr` de `interactions`. Normaliza {selector, name, value, off}; so `data-*` e
  // `aria-*` (nunca `on*`, `style`, `class`, `href`). `value`/`off` aceitam string, numero ou boolean
  // (ate 200 caracteres); sem `off`, desligar remove o atributo. Entrada invalida devolve null.
  var ATTR_NAME_RE = /^(?:data|aria)-[a-z0-9_.:-]+$/;
  function attrText(v) {
    if ((typeof v === 'number' && isFinite(v)) || typeof v === 'boolean') v = String(v);
    return typeof v === 'string' && v.length <= 200 ? v : null;
  }
  function attrAction(a) {
    if (!a || typeof a !== 'object' || typeof a.selector !== 'string' || !a.selector) return null;
    var name = typeof a.name === 'string' ? a.name.toLowerCase() : '';
    var value = attrText(a.value);
    var off = a.off === undefined ? null : attrText(a.off);
    if (!ATTR_NAME_RE.test(name) || value === null || (a.off !== undefined && off === null)) return null;
    return { selector: a.selector, name: name, value: value, off: off };
  }
  function attrIsOn(el, at) { return el.getAttribute(at.name) === at.value; }
  function attrToggle(el, at) {
    if (attrIsOn(el, at)) { if (at.off === null) el.removeAttribute(at.name); else el.setAttribute(at.name, at.off); }
    else el.setAttribute(at.name, at.value);
  }

  // S2.12: seletores de `interactions` que nao casam nada no mock. `count(sel)` devolve quantos
  // elementos o seletor acha; um seletor invalido (lanca) conta como sem alvo. O rotulo e
  // "Item" para a superficie (`show`) ou "Item > Chip" para a acao de um chip.
  function deadInteractions(items, count) {
    var out = [];
    var dead = function (sel) { try { return !count(sel); } catch (e) { return true; } };
    (Array.isArray(items) ? items : []).forEach(function (it) {
      if (!it || typeof it !== 'object' || it.sep !== undefined) return;
      var label = it.label || it.key || '';
      if (it.show && dead(it.show)) out.push({ label: label, sel: it.show });
      (Array.isArray(it.groups) ? it.groups : []).forEach(function (g) {
        (Array.isArray(g && g.items) ? g.items : []).forEach(function (a) {
          if (!a) return;
          var name = label + ' › ' + (a.label || '');
          ['on', 'toggle', 'show', 'hide', 'click'].forEach(function (k) {
            if (typeof a[k] === 'string' && a[k] && dead(a[k])) out.push({ label: name, sel: a[k] });
          });
          var cls = typeof a.class === 'string' ? a.class : a.class && a.class.selector;
          if (cls && dead(cls)) out.push({ label: name, sel: cls });
          var at = attrAction(a.attr);
          if (at && dead(at.selector)) out.push({ label: name, sel: at.selector });
        });
      });
    });
    return out;
  }

  // Paths cujo mtime atual difere do que a aprovacao deixou (`written`): alguem mexeu no arquivo
  // fora do LAYERS depois dela. Path sem registro ou ausente de `current` nao conta.
  function movedSince(written, current) {
    return Object.keys(written || {}).filter(function (p) {
      return typeof current[p] === 'number' && current[p] !== written[p];
    });
  }

  // Caixa do banner de "arquivos mudaram": entre a coluna esquerda e o painel direito, centrada na
  // janela quando cabe, nunca menor que 240px. Devolve { left, width } em px.
  function staleBannerBox(vw, colPx, rightPx) {
    const lo = colPx + 12, hi = vw - rightPx - 12;
    const width = Math.max(240, Math.min(520, hi - lo, vw - 32));
    const center = Math.min(hi - width / 2, Math.max(vw / 2, lo + width / 2));
    return { left: Math.max(8, Math.round(center - width / 2)), width: width };
  }

  // S2.21: arquivos TS/JS citados em data-src ("arquivo|seletor|linha") ou em root.src. O arquivo
  // fica no espaco de caminhos das folhas (raiz da pasta, base ja aplicada): nao junte base de novo.
  // Fora `known` (mock, layers.json, folhas, dcFile) e entradas tpl:; unicos, no maximo `cap`.
  // S2.22d: `extra` = caminhos ja expandidos de layers.json › watch; entram depois dos citados, com as mesmas regras e o mesmo teto.
  function citedSources(srcs, known, cap, extra) {
    var max = cap || 50, skip = {}, seen = {}, out = [];
    (known || []).forEach(function (p) { skip[p] = true; });
    var add = function (file) {
      if (out.length >= max || !isManualSource(file) || skip[file] || seen[file]) return;
      seen[file] = true; out.push(file);
    };
    (Array.isArray(srcs) ? srcs : []).forEach(function (s) {
      if (typeof s !== 'string') return;
      var m = /^(.*)\|([^|]*)\|\d+$/.exec(s);
      if (!m || /^tpl:/.test(m[2])) return;
      add(m[1]);
    });
    (Array.isArray(extra) ? extra : []).forEach(add);
    return out;
  }

  // S2.22d: layers.json › watch = globs de fontes TS/JS (relativos a raiz da pasta, `*` nao cruza `/`, `**` cruza, `?` um caractere).
  // Entrada que nao e string, vazia, com `\`, `/` inicial ou segmento `..` sai; no maximo 20.
  function watchGlobs(man) {
    var list = man && Array.isArray(man.watch) ? man.watch : [], out = [];
    list.forEach(function (g) {
      if (out.length >= 20 || typeof g !== 'string' || !g || g.length > 200 || /\\/.test(g) || g.charAt(0) === '/' || g.split('/').indexOf('..') >= 0) return;
      // cada corrida de `*` ou `?` conta como um curinga: mais de 8 faz o backtracking do regex crescer rapido
      if ((g.replace(/\*+/g, '*').match(/[*?]/g) || []).length > 8) return;
      out.push(g);
    });
    return out;
  }

  function globToRe(g) {
    var re = '', i = 0;
    while (i < g.length) {
      var c = g.charAt(i);
      if (c === '*') {
        var j = i; while (g.charAt(j) === '*') j++;
        // `**` so e recursivo como segmento inteiro (src/**/x, src/**); em outro lugar e um `*` (nao cruza `/`, como globDirMayMatch assume)
        var whole = j - i === 2 && (i === 0 || g.charAt(i - 1) === '/') && (j === g.length || g.charAt(j) === '/');
        if (whole) { if (j === g.length) { re += '.*'; i = j; } else { re += '(?:.*/)?'; i = j + 1; } }
        else { re += '[^/]*'; i = j; }
      } else if (c === '?') { re += '[^/]'; i++; }
      else { re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&'); i++; }
    }
    return new RegExp('^' + re + '$');
  }

  // S2.22d: glob compilado uma vez (a varredura chama match/dirMayMatch por entrada). match(path): casa o arquivo;
  // dirMayMatch(dirPath): o glob pode casar algum arquivo dentro de dirPath (ou abaixo), usado para podar a varredura.
  function compileGlob(glob) {
    var g = String(glob), gs = g.split('/'), full = globToRe(g);
    var segRe = gs.map(function (seg) { return seg === '**' ? null : globToRe(seg); });
    return {
      match: function (path) { return typeof path === 'string' && full.test(path); },
      dirMayMatch: function (dirPath) {
        if (!dirPath) return true;
        var ds = String(dirPath).split('/');
        for (var i = 0; i < ds.length; i++) {
          if (gs[i] === '**') return true;
          if (i >= gs.length - 1 || !segRe[i].test(ds[i])) return false;
        }
        return true;
      }
    };
  }

  function globMatch(glob, path) {
    return typeof glob === 'string' && compileGlob(glob).match(path);
  }

  function globDirMayMatch(glob, dirPath) {
    return compileGlob(glob).dirMayMatch(dirPath);
  }

  // S2.21: fontes cujo mtime e maior que o do mock: a UI mostrada e mais velha que o codigo que a gera.
  // `ack` (S2.21b) = {path: mtime} ja reconhecido na sessao (x ou Reanalisar): so volta a acusar se a
  // fonte for editada de novo.
  function layoutDrift(mockMtime, srcMtimes, ack) {
    if (typeof mockMtime !== 'number') return [];
    return Object.keys(srcMtimes || {}).filter(function (p) {
      return typeof srcMtimes[p] === 'number' && srcMtimes[p] > mockMtime && !(ack && ack[p] === srcMtimes[p]);
    });
  }

  // S2.21: 'layout' quando algum arquivo mudado e estrutural (mock, layers.json, fonte citada);
  // 'style' quando so mudou folha CSS (o Recarregar comum basta).
  function staleKind(list, structural) {
    var set = {};
    (structural || []).forEach(function (p) { set[p] = true; });
    return (list || []).some(function (p) { return set[p]; }) ? 'layout' : 'style';
  }

  // S2.22b: estados do mock declarados em layers.json (states:[{name, mock}]); entrada invalida sai, nome repetido fica com o primeiro.
  function projectStates(man) {
    var seen = Object.create(null), out = [];
    var list = man && Array.isArray(man.states) ? man.states : [];
    list.forEach(function (s) {
      if (!s || typeof s.name !== 'string' || !s.name || typeof s.mock !== 'string' || !s.mock || seen[s.name]) return;
      seen[s.name] = true; out.push({ name: s.name, mock: s.mock });
    });
    return out;
  }

  // S2.22b: estado pedido, senao o primeiro; sem estados, null (o loader usa "mock").
  function pickState(states, wanted) {
    var list = states || [];
    for (var i = 0; i < list.length; i++) if (list[i].name === wanted) return list[i];
    return list.length ? list[0] : null;
  }

  // S9.1a: layouts declarados em layers.json (layouts:[{id, name, mock, states}]); sem nenhum valido, `main` implicito da raiz.
  var LAYOUT_ID = /^[A-Za-z0-9_-]{1,40}$/;

  function projectLayouts(man) {
    var seen = Object.create(null), out = [];
    var list = man && Array.isArray(man.layouts) ? man.layouts : [];
    list.forEach(function (l) {
      if (!l || typeof l.id !== 'string' || !LAYOUT_ID.test(l.id) || seen[l.id.toLowerCase()] || typeof l.mock !== 'string' || !l.mock) return;
      seen[l.id.toLowerCase()] = true; // case-insensitive: ids name backup folders, which collide on case-insensitive disks
      out.push({ id: l.id, name: typeof l.name === 'string' && l.name ? l.name : l.id, mock: l.mock, states: projectStates(l) });
    });
    if (out.length) return out;
    return [{ id: 'main', name: (man && man.name) || 'main', mock: man && typeof man.mock === 'string' ? man.mock : null, states: projectStates(man) }];
  }

  // S9.1a: layout pedido, senao o primeiro; lista vazia, null.
  function pickLayout(list, wanted) {
    var l = Array.isArray(list) ? list : [];
    for (var i = 0; i < l.length; i++) if (l[i] && l[i].id === wanted) return l[i];
    return l.length ? l[0] : null;
  }

  // S9.1a: `main` (ou id vazio) mantem a chave de hoje; outros layouts ganham o sufixo `|id`.
  function layoutPendingKey(base, id) {
    if (base === null || base === undefined) return null;
    return !id || id === 'main' ? base : base + '|' + id;
  }

  function stateMapKey(base, id) {
    var b = base || '-';
    return !id || id === 'main' ? b : b + '|' + id;
  }

  // S9.1a: [{item, index}] com o indice ORIGINAL; sem `layout` vale para todos, string so para o layout dele.
  function interactionsFor(list, layoutId) {
    var out = [];
    if (!Array.isArray(list)) return out;
    list.forEach(function (it, index) {
      if (!it || typeof it !== 'object') return;
      if (it.layout !== undefined && (typeof it.layout !== 'string' || it.layout !== layoutId)) return;
      out.push({ item: it, index: index });
    });
    return out;
  }

  // S9.1a: junta os pedidos de todos os layouts na ordem de `order`, com `activeReqs` no lugar do ativo; devolve copia.
  function mergeLayoutRequests(order, activeId, activeReqs, othersById) {
    var ids = Array.isArray(order) ? order.filter(function (id, i) { return order.indexOf(id) === i; }) : [], others = othersById && typeof othersById === 'object' ? othersById : {};
    var extra = Object.keys(others);
    if (typeof activeId === 'string' && extra.indexOf(activeId) < 0) extra.push(activeId);
    extra.filter(function (k) { return ids.indexOf(k) < 0; }).sort().forEach(function (k) { ids.push(k); });
    var out = [];
    ids.forEach(function (id) {
      var reqs = id === activeId ? activeReqs : others[id];
      if (!Array.isArray(reqs)) return;
      reqs.forEach(function (r) {
        if (!r || typeof r !== 'object' || Array.isArray(r) || typeof r.id !== 'string') return;
        var c = Object.assign({}, r);
        if (Array.isArray(r.texts)) c.texts = r.texts.slice();
        out.push(c);
      });
    });
    return out;
  }

  // S2.22a: true se a origem do bloco do snapshot (URL ou id Vite) termina numa folha de sheetPaths.
  function snapshotOriginCovered(origin, sheetPaths) {
    if (!origin) return false;
    var p = String(origin).replace(/\\/g, '/');
    try { p = new URL(p).pathname; } catch (e) { /* nao e URL: usa cru */ }
    p = p.replace(/[?#].*$/, '');
    try { p = decodeURIComponent(p); } catch (e) { /* mantem cru */ }
    return (sheetPaths || []).some(function (s) {
      return p === s || p.slice(-(s.length + 1)) === '/' + s;
    });
  }

  // S2.22c: atributos do <html> do snapshot que podem ir ao host do shadow root. Allowlist: data-* (menos os do proprio
  // Layers), lang, dir e class (so [\w\s-]); do style so declaracoes de variavel (--x: valor). S2.22f: valor por allowlist
  // (ver safeVarValue); nome data-* so [a-z0-9_.-].
  var VAR_FUNCS = {};
  ('var calc min max clamp abs sign round mod rem hypot sin cos tan rgb rgba hsl hsla hwb lab lch oklab oklch color color-mix light-dark env ' +
    'linear-gradient radial-gradient conic-gradient cubic-bezier steps repeat minmax fit-content translate translatex translatey translate3d rotate rotatex rotatey rotatez ' +
    'scale scalex scaley scale3d skew skewx skewy blur brightness contrast drop-shadow grayscale hue-rotate invert opacity saturate sepia').split(' ')
    .forEach(function (f) { VAR_FUNCS[f] = true; });
  // tamanho limitado: o scan de funcoes abaixo e quadratico numa corrida longa de letras sem `(`
  function safeVarValue(val) {
    if (val.length > 2000 || !/^[#\w\s.,%()+\-*\/"']+$/.test(val) || /\/\*|\*\//.test(val)) return false;
    if ((val.match(/"/g) || []).length % 2 || (val.match(/'/g) || []).length % 2) return false;
    var fns = val.match(/[a-z][a-z0-9-]*\(/gi) || [];
    return fns.every(function (f) { return Object.prototype.hasOwnProperty.call(VAR_FUNCS, f.slice(0, -1).toLowerCase()); });
  }
  function hostAttrsFromHtml(attrs) {
    var out = { attrs: [], vars: [] };
    (attrs || []).forEach(function (a) {
      var n = String(a.name).toLowerCase(), v = String(a.value);
      if (n === 'style') {
        v.split(';').forEach(function (d) {
          var k = d.indexOf(':'); if (k < 0) return;
          var name = d.slice(0, k).trim(), val = d.slice(k + 1).trim();
          if (!/^--[\w-]+$/.test(name) || !val || !safeVarValue(val)) return;
          out.vars.push({ name: name, value: val });
        });
        return;
      }
      if (n === 'class') { if (/^[\w\s-]+$/.test(v) && v.trim()) out.attrs.push({ name: n, value: v }); return; }
      if (n === 'lang' || n === 'dir' || (/^data-[a-z0-9_.-]+$/.test(n) && n !== 'data-src' && n !== 'data-name' && !/^data-layers-/.test(n))) out.attrs.push({ name: n, value: v });
    });
    return out;
  }

  // S2.22f: comentario `<!-- snapshot LAYERS · <url> · <data> · viewport WxH -->` nos primeiros 4000 caracteres; a captura vai ate o `-->`.
  // O marcador tem de COMECAR nos primeiros 4000 caracteres; o `-->` e procurado sem janela (URL de captura longa nao desfaz o snapshot).
  function snapshotCapture(html) {
    var m = typeof html === 'string' ? /<!--\s*snapshot LAYERS\s*(?:·\s*)?/.exec(html.slice(0, 4000)) : null;
    if (!m) return { snapshot: false, capture: '' };
    var from = m.index + m[0].length, end = html.indexOf('-->', from);
    return { snapshot: true, capture: end < 0 ? '' : html.slice(from, end).trim() };
  }

  // S2.22a: snapshot antigo (blob unico, nenhum bloco com origem) com regras reais pode mascarar as folhas: devolve todas.
  function maskedSheets(snapMock, blocks, sheetPaths) {
    if (!snapMock || !blocks || !blocks.length) return [];
    if (blocks.some(function (b) { return b.origin; })) return [];
    var hasRules = blocks.some(function (b) { return String(b.text || '').replace(/\/\*[\s\S]*?\*\//g, '').trim(); });
    return hasRules ? (sheetPaths || []).slice() : [];
  }

  // S2.22a: aviso de interacao morta entra antes dos avisos de URL remota; sem eles, vai ao fim.
  function placeDeadWarning(warn, text) {
    for (var i = 0; i < warn.length; i++) {
      if (/^(URL remota removida|url\(\) remota neutralizada)/.test(warn[i])) { warn.splice(i, 0, text); return; }
    }
    warn.push(text);
  }

  // S2.21: destino do backup do layout anterior; o mock aninhado vira so o basename.
  // S9.1a: com `layoutId` (mock de outro layout) o arquivo vai para layouts/<id>/, pois dois layouts podem ter mocks de mesmo basename.
  function layoutBackupPaths(stamp, mockPath, layoutId) {
    var dir = '.design-history/layout-' + stamp, name = String(mockPath).replace(/^.*\//, '');
    return { dir: dir, manifest: dir + '/layers.json', mock: dir + '/' + (layoutId ? 'layouts/' + layoutId + '/' : '') + name };
  }

  // Culling de planos no palco 3D: replica a transformacao do mundo de scene() (translate3d(-f),
  // rotateY, rotateX, scale 2D, translate, perspectiva) e devolve um teste por plano. true = os 4
  // cantos caem do mesmo lado fora do palco ampliado por `margin`; canto atras do olho nunca corta.
  function viewCuller(v) {
    var a = v.yaw * Math.PI / 180, b = v.tilt * Math.PI / 180;
    var ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    var hw = v.stageW / 2 + v.margin, hh = v.stageH / 2 + v.margin;
    var ox = -v.pageW / 2 - v.fx, oy = -v.pageH / 2 - v.fy;
    return function (x, y, w, h, z) {
      var z1 = z - v.fz, l = 0, r = 0, t = 0, d = 0;
      for (var i = 0; i < 4; i++) {
        var x1 = ox + x + (i & 1 ? w : 0), y1 = oy + y + (i & 2 ? h : 0);
        var x2 = x1 * ca + z1 * sa, z2 = -x1 * sa + z1 * ca;
        var y3 = y1 * cb - z2 * sb, z3 = y1 * sb + z2 * cb;
        var q = v.persp - z3;
        if (q <= 0) return false;
        var k = v.persp / q, sx = (v.S * x2 + v.tx) * k, sy = (v.S * y3 + v.ty) * k;
        if (sx < -hw) l++; else if (sx > hw) r++;
        if (sy < -hh) t++; else if (sy > hh) d++;
      }
      return l === 4 || r === 4 || t === 4 || d === 4;
    };
  }

  // S4.9: planos de mesmo translateZ (arredondado a 0,01) viram um grupo; grupos por z crescente, ids na ordem de entrada.
  function groupPlanesByZ(items) {
    var byZ = new Map();
    for (var i = 0; i < items.length; i++) {
      var z = Math.round(items[i].z * 100) / 100 + 0, g = byZ.get(z);
      if (!g) byZ.set(z, g = { z: z, ids: [] });
      g.ids.push(items[i].id);
    }
    return Array.from(byZ.values()).sort(function (a, b) { return a.z - b.z; });
  }

  // S3.5: z (in spacing units) of a plane in an exploded branch; depths past collapseAt share its plane.
  function branchZ(depth, rootDepth, collapseAt, spacing) {
    return (Math.min(depth, collapseAt == null ? Infinity : collapseAt) - rootDepth) * spacing;
  }

  // S3.5: true when id is root or one of its descendants (id prefix).
  function inBranchOf(id, root) {
    return id === root || id.indexOf(root + '.') === 0;
  }

  // S3.5: id of the ancestor of id at depth d (id prefix of d+1 segments); id itself when d is at or past its depth.
  function ancestorAt(id, d) {
    return id.split('.').slice(0, d + 1).join('.');
  }

  // S3.5: ids of the exploded branch (root + descendants), or null when no node has the root id; byId is unused (kept for the contract).
  function branchOf(nodes, byId, explodeFrom) {
    if (!explodeFrom) return null;
    var out = new Set(), found = false;
    for (var i = 0; i < nodes.length; i++) {
      var id = nodes[i].id;
      if (id === explodeFrom) found = true;
      if (inBranchOf(id, explodeFrom)) out.add(id);
    }
    return found ? out : null;
  }

  // S3.5: model of the stage context menu. layers[].count = nodes at depth d; inBranch (descendant rows) = those under the selection.
  function ctxMenuModel(o) {
    var nodes = o.nodes, selId = o.selId, sel = null, max = 0, i;
    for (i = 0; i < nodes.length; i++) {
      if (nodes[i].id === selId) sel = nodes[i];
      if (nodes[i].depth > max) max = nodes[i].depth;
    }
    if (!sel) return null;
    var total = [], inBranch = [], d;
    for (d = 0; d <= max; d++) { total.push(0); inBranch.push(0); }
    for (i = 0; i < nodes.length; i++) {
      total[nodes[i].depth]++;
      if (nodes[i].id !== selId && inBranchOf(nodes[i].id, selId)) inBranch[nodes[i].depth]++;
    }
    var layers = [];
    for (d = 0; d <= max; d++) {
      var kind = d < sel.depth ? 'ancestor' : d === sel.depth ? 'selected' : inBranch[d] ? 'descendant' : 'outside';
      var layer = { d: d, kind: kind, count: total[d] };
      if (kind === 'descendant') layer.inBranch = inBranch[d];
      layers.push(layer);
    }
    var from = o.explodeFrom, inside = !!from && inBranchOf(selId, from), items = [];
    if (o.flat && !inside) items.push({ id: 'explode', label: 'Explodir daqui', hint: 'só o ramo' });
    if (o.flat && inside && !(o.collapseAt != null && sel.depth >= o.collapseAt)) items.push({ id: 'collapse', label: 'Recolher até aqui', hint: 'L' + (sel.depth + 1) + '+ → L' + sel.depth });
    items.push({ id: 'request', label: 'Requisição', hint: '→ Ajustes' });
    return { header: { name: sel.name, depth: sel.depth }, layers: layers, items: items };
  }

  // Row window for the layer tree (S4.10). rows[i] = measured height of row i, or null/undefined for
  // rowH. Returns the slice [start, end) with overscan and the spacer heights; with `reveal`, the
  // scrollTop that brings that row inside the view with a rowH margin (null when already inside).
  function treeWindow(o) {
    var rows = o.rows, n = rows.length, rowH = o.rowH, ov = o.overscan || 0;
    var off = new Array(n + 1); off[0] = 0;
    for (var i = 0; i < n; i++) off[i + 1] = off[i] + (rows[i] == null ? rowH : rows[i]);
    var total = off[n], viewH = Math.max(0, o.viewH);
    var top = Math.min(Math.max(0, o.scrollTop), Math.max(0, total - viewH));
    var a = 0; while (a < n && off[a + 1] <= top) a++;
    var b = a; while (b < n && off[b] < top + viewH) b++;
    var start = Math.max(0, a - ov), end = Math.min(n, b + ov), scrollTo = null;
    if (o.reveal != null && o.reveal >= 0 && o.reveal < n) {
      var r0 = off[o.reveal], r1 = off[o.reveal + 1];
      if (r0 < top + rowH) scrollTo = Math.max(0, r0 - rowH);
      else if (r1 > top + viewH - rowH) scrollTo = r1 - (viewH - rowH);
      if (scrollTo === top) scrollTo = null; // row 0 at the top: nothing to move
    }
    return { start: start, end: end, top: off[start], bottom: total - off[end], total: total, scrollTo: scrollTo };
  }

  // S3.2: one menu pattern (hover opens, click pins, outside/Escape/item close); pure: cur { menu, pin, pending } -> { menu, pin, timer } or null (ignore, keep pending timer).
  var MENU_TIMING = { openDelay: 0, closeGrace: 260 };
  function menuStep(cur, ev, timing) {
    var t = timing || MENU_TIMING, open = cur.menu || null, pin = !!cur.pin;
    var shut = { menu: null, pin: false, timer: null };
    if ((ev.type === 'enter' || ev.type === 'leave') && ev.pointer === 'touch') return null;
    if (ev.type === 'enter') {
      if (ev.buttons) return null;
      if (open === ev.key) return { menu: open, pin: pin, timer: null };
      if (open && pin) return null;
      if (open || !(t.openDelay > 0)) return { menu: ev.key, pin: false, timer: null };
      return { menu: null, pin: false, timer: { kind: 'open', key: ev.key, ms: t.openDelay } };
    }
    if (ev.type === 'leave') {
      if (open === ev.key && !pin) return { menu: open, pin: false, timer: { kind: 'close', key: open, ms: t.closeGrace } };
      if (open) return null;
      return cur.pending === ev.key ? shut : null;
    }
    if (ev.type === 'timer') {
      if (ev.kind === 'open') return open ? null : { menu: ev.key, pin: false, timer: null };
      return open === ev.key && !pin ? shut : null;
    }
    if (ev.type === 'click') return open === ev.key && pin ? shut : { menu: ev.key, pin: true, timer: null };
    if (ev.type === 'inside') return open === ev.key && !pin ? { menu: open, pin: true, timer: null } : null;
    if (ev.type === 'close') return open || cur.pending ? shut : null;
    return null;
  }

  // S3.3: single action registry; scope global = onKey plain keys, ctrl = Ctrl/Cmd branch, local = field handlers, none = no key
  var ACTIONS = [
    { id: 'panLeft', label: 'Pan para a esquerda', keys: ['ArrowLeft'], hint: '←', scope: 'global' },
    { id: 'panRight', label: 'Pan para a direita', keys: ['ArrowRight'], hint: '→', scope: 'global' },
    { id: 'panUp', label: 'Pan para cima', keys: ['ArrowUp'], hint: '↑', scope: 'global' },
    { id: 'panDown', label: 'Pan para baixo', keys: ['ArrowDown'], hint: '↓', scope: 'global' },
    { id: 'layerUp', label: 'Próxima camada', keys: ['PageUp'], hint: 'PgUp', scope: 'global' },
    { id: 'layerDown', label: 'Camada anterior', keys: ['PageDown'], hint: 'PgDn', scope: 'global' },
    { id: 'orbitLeft', label: 'Girar à esquerda', keys: ['q'], hint: 'Q', scope: 'global' },
    { id: 'orbitRight', label: 'Girar à direita', keys: ['e'], hint: 'E', scope: 'global' },
    { id: 'tiltUp', label: 'Inclinar para cima', keys: ['w'], hint: 'W', scope: 'global' },
    { id: 'tiltDown', label: 'Inclinar para baixo', keys: ['s'], hint: 'S', scope: 'global' },
    { id: 'zoomIn', label: 'Zoom +', keys: ['+', '='], hint: '+', scope: 'global' },
    { id: 'zoomOut', label: 'Zoom −', keys: ['-'], hint: '−', scope: 'global' },
    { id: 'measure', label: 'Medidas', keys: ['m'], hint: 'M', scope: 'global' },
    { id: 'frame', label: 'Enquadrar seleção: centralizar + zoom', keys: ['f'], hint: 'F', scope: 'global' },
    { id: 'center', label: 'Centralizar seleção sem mudar o zoom', keys: ['c'], hint: 'C', scope: 'global' },
    { id: 'resetView', label: 'Recentrar câmera', keys: ['0'], hint: '0', scope: 'global' },
    { id: 'reload', label: 'Relê do disco os arquivos do projeto', keys: ['r'], hint: 'R', scope: 'global' },
    { id: 'shortcuts', label: 'Atalhos de teclado e mouse', keys: ['?'], hint: '?', scope: 'global' },
    { id: 'rightPanel', label: 'Recolher / expandir o painel de propriedades', keys: ['p'], hint: 'P', scope: 'global' },
    { id: 'escape', label: 'Fechar painel · sair do isolamento · limpar seleção', keys: ['Escape'], hint: 'Esc', scope: 'global' },
    { id: 'undo', label: 'Desfazer', keys: ['z'], hint: 'Ctrl+Z', scope: 'ctrl' },
    { id: 'redo', label: 'Refazer', keys: ['y'], hint: 'Ctrl+Shift+Z · Ctrl+Y', scope: 'ctrl' },
    { id: 'codeApply', label: 'Aplicar', keys: [], hint: 'Ctrl+Enter', scope: 'local' },
    { id: 'fieldEnter', label: 'Confirmar', keys: [], hint: 'Enter', scope: 'local' },
    { id: 'fieldClear', label: 'Limpar', keys: [], hint: 'Esc', scope: 'local' },
    { id: 'toggleNode', label: 'Recolher / expandir', keys: [], scope: 'none' },
    { id: 'isolate', label: 'Isolar o ramo da seleção', keys: [], scope: 'none' }
  ];

  var SHORTCUTS = [
    ['Câmera', [['scroll','zoom no ponto do cursor'],['arrastar','orbitar (giro + inclinação)'],['shift + arrastar · botão do meio','pan na tela'],['ctrl + arrastar','pan no plano da página'],['← → ↑ ↓','pan · com shift: no plano'],['Q / E','girar'],['W / S','inclinar'],['+ / −','zoom'],['=','zoom + (a mesma tecla do +, sem shift)'],['F','enquadrar a seleção'],['C','centralizar sem mudar o zoom'],['0','recentrar a câmera']]],
    ['Seleção', [['clique','selecionar elemento'],['duplo clique','isolar o ramo + enquadrar'],['alt + clique · ⚡ Interagir','disparar o clique nativo do elemento no mock (checkbox, radio, details)'],['duplo clique no fundo','sair do isolamento · recentrar'],['↑ Pai','subir para o elemento pai'],['Esc','fechar painel, lista ou menu aberto · sair do isolamento · sair da camada solo · limpar seleção']]],
    ['Camadas', [['PgUp / PgDn','camada ativa acima / abaixo'],['chip L0…Ln · clique','mostrar só essa camada'],['chip L0…Ln · hover','foco: frame da camada + atenuação das demais'],['Todas','voltar a mostrar todas'],['Explodido / Plano · Distância','espaçamento entre camadas'],['Frames · Intensidade','wireframe dos contêineres sem fundo/borda'],['Foco de camada · Destaque · Demais','liga o foco por hover/clique nos chips; Destaque = intensidade da camada em foco, Demais = opacidade das outras'],['chip · hover com seleção ativa','foca só os elementos da camada dentro do ramo selecionado/isolado']]],
    ['Árvore de camadas', [['hover','destaca o frame do elemento no palco'],['clique','selecionar'],['clique no palco','seleciona e rola a árvore até o elemento'],['{ } · ⊟ (barra da aba)','recolher todos os códigos abertos · recolher todas as linhas (só recolhem)'],['{ } na linha','abrir / fechar o código daquele elemento ou regra (padrão: oculto)'],['⌕ Buscar camada · Destacar / Filtrar','destaca ou mostra só as camadas cujo nome contém o texto (Esc limpa)'],['Hierarquia / Elementos','árvore do DOM · definições de estilo (arquivo › regra) sem repetição, com usos e código'],['{ } (Hierarquia)','mostra o código do elemento selecionado logo abaixo dele; Aplicar respeita "Aplicar em"'],['Elementos · regra ▾','lista os usos + textarea com o código; ctrl+Enter ou Aplicar grava em todos os usos'],['duplo clique','isolar o ramo'],['▾ / ▸','expandir / recolher o nó']]],
    ['Propriedades', [['● ● ● (cores de origem)','declarada na regra · herdada de regra acima · editada na sessão — paleta em Aparência › Cores de origem'],['chips declarada / herdada / editada','filtram as propriedades por origem (combináveis)'],['⌕ Buscar propriedade · Destacar / Filtrar','por nome, propriedade CSS ou título da seção'],['⊟ / ⊞','recolher / expandir todas as seções'],['P · » / «','recolher / expandir o painel de propriedades'],['Enter','aplicar o valor do campo'],['Esc (no campo de texto)','descartar a edição e sair do campo'],['Aplicar em','alcance: perguntar · só este · todos iguais'],['▾ título do grupo','recolher / expandir o grupo']]],
    ['Edição', [['Ctrl + Z','desfazer o último ajuste (propriedade ou código)'],['Ctrl + Shift + Z · Ctrl + Y','refazer']]],
    ['Geral', [['?','abrir / fechar este painel'],['M','ligar / desligar as medidas no palco'],['R','recarregar o projeto do disco (pasta local)'],['⚡ Interagir','superfícies e ações definidas pelo projeto em layers.json › interactions'],['Ações ▾','ver diff · aplicar nos arquivos · exportar']]],
  ];

  var KEY_TO_ID = {}, BY_ID = {}, TIP = {};
  ACTIONS.forEach(function (a) {
    BY_ID[a.id] = a;
    TIP[a.id] = a.label + (a.hint ? ' (' + a.hint + ')' : '');
    if (a.scope === 'global') a.keys.forEach(function (k) { KEY_TO_ID[k] = a.id; });
  });
  var hasOwn = Object.prototype.hasOwnProperty;
  // Same resolution as the old onKey map: exact key first, then lowercase (Shift+Q still rotates); null when no global action matches.
  function keyAction(key) {
    if (hasOwn.call(KEY_TO_ID, key)) return KEY_TO_ID[key];
    var low = String(key).toLowerCase();
    return hasOwn.call(KEY_TO_ID, low) ? KEY_TO_ID[low] : null;
  }
  // "Label (hint)" for the native title; `label` replaces the registry label; unknown id -> ''.
  function tooltip(id, label) {
    if (!hasOwn.call(BY_ID, id)) return '';
    if (label == null) return TIP[id];
    var a = BY_ID[id];
    return label + (a.hint ? ' (' + a.hint + ')' : '');
  }

  // Ha edicao nao salva (changes pendentes ou buffer de codigo)?
  function hasUnsaved(changes, codeBuf) {
    return (changes || []).length > 0 || Object.keys(codeBuf || {}).length > 0;
  }

  // Inline style writes that take the change list `cur` to `target`: [{ id, prop, value }].
  function inlineDelta(cur, target) {
    var out = [], seen = {};
    (target || []).forEach(function (c) {
      c.ids.forEach(function (id) { seen[id + '|' + c.prop] = 1; out.push({ id: id, prop: c.prop, value: c.to }); });
    });
    (cur || []).forEach(function (c) {
      c.ids.forEach(function (id) { if (!seen[id + '|' + c.prop]) out.push({ id: id, prop: c.prop, value: c.fromInline[id] || '' }); });
    });
    return out;
  }

  // New stack with `snap` on top, oldest entries dropped past `cap`; never mutates `stack`.
  function pushSnapshot(stack, snap, cap) {
    var next = (stack || []).concat([snap]);
    return next.length > cap ? next.slice(next.length - cap) : next;
  }

  // Recorta o mapa de mtimes so aos paths vigiados (ignora artefatos fora de `paths`).
  // Line diff as pure data: common prefix/suffix trimmed, 3 lines of context, kind '-' | '+' | ' '.
  function lineDiff(a, b) {
    var A = a.split('\n'), B = b.split('\n'), p = 0, q = 0, i, out = [], ctx = 3;
    while (p < A.length && p < B.length && A[p] === B[p]) p++;
    while (q < A.length - p && q < B.length - p && A[A.length - 1 - q] === B[B.length - 1 - q]) q++;
    var push = function (no, text, kind) { out.push({ no: String(no), text: text, kind: kind }); };
    for (i = Math.max(0, p - ctx); i < p; i++) push(i + 1, A[i], ' ');
    for (i = p; i < A.length - q; i++) push(i + 1, A[i], '-');
    for (i = p; i < B.length - q; i++) push(i + 1, B[i], '+');
    for (i = A.length - q; i < Math.min(A.length, A.length - q + ctx); i++) push(i + 1, A[i], ' ');
    if (!out.some(function (l) { return l.kind !== ' '; })) push('', '(sem alterações)', ' ');
    return out;
  }

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

  // Quatro chaves (a quinta, `pending`, veio na S2.14) com prefixo de versao no lugar das tres soltas da v2.24. Separadas por
  // ciclo de vida, nao por comodidade: 'ui' e preferencia de interface, 'projects' e o
  // historico, 'session' e o que a aba estava fazendo. Nenhuma delas guarda conteudo de
  // arquivo nem handle de pasta (F:68) — handle mora no IndexedDB.
  var LS = {
    meta: 'layers/v1/meta',
    ui: 'layers/v1/ui',
    projects: 'layers/v1/projects',
    session: 'layers/v1/session',
    pending: 'layers/v1/pending'
  };
  var LS_OLD = ['layers-cfg', 'layers-hist', 'layers-inter-size'];
  var CFG_KEYS = ['theme', 'selectColor', 'originColors', 'panelHeader', 'fontScale'];
  // Single source of the appearance defaults: the Aparência menu (layers/v1/ui) overrides them (S3.4).
  var APPEARANCE_DEFAULTS = Object.freeze({
    theme: 'Gray · 1 Grafite', accent: '5 · Cinza médio', selectColor: 'Coral', originColors: 'Mono · cor de seleção',
    panelHeader: 'B · Faixas rotuladas', sliderScale: 85, fontScale: 1, bmAlpha: 15
  });
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

  // ------------------------------------------------- ajustes pendentes (S2.14)

  // Teto de changes e de requests por projeto e vida da entrada; changes acima do teto nao sao gravadas (nem truncadas), requests sao truncadas.
  var PENDING_CAP = 200;
  var PENDING_TTL = 30 * 24 * 60 * 60 * 1000;

  // cyrb53: hash nao criptografico de 53 bits sobre unidades UTF-16, devolvido em base 36.
  function hash53(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  // Hash das fontes que o loader leu. Cada parte entra com marca de tipo e comprimento, entao
  // ['ab','c'] e ['a','bc'] divergem e null (dc ausente) difere de '' (dc vazio).
  function sourceHash(parts) {
    var s = '';
    (parts || []).forEach(function (p) {
      s += p === null || p === undefined ? 'n;' : 's' + String(p).length + ':' + p + ';';
    });
    return hash53(s);
  }

  // ------------------------------------------------- write log (S6.2)

  // Bumped when a layers-export.log column changes meaning or position.
  var WRITE_LOG_VERSION = 2;

  // SHA-256 of the UTF-8 bytes (lowercase hex, same as sha256sum on the written file) and their count.
  // The count never depends on crypto: if the digest is unavailable or rejects, sha256 is null.
  async function contentHash(text) {
    var bytes = new TextEncoder().encode(text);
    try {
      var buf = await globalThis.crypto.subtle.digest('SHA-256', bytes);
      return { sha256: Array.from(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join(''), bytes: bytes.length };
    } catch (e) { return { sha256: null, bytes: bytes.length }; }
  }

  // Control chars, Unicode line breaks and runs of 2+ spaces (the column separator) print as \xNN / \uNNNN,
  // so a path can never forge or split a log line; ordinary paths pass unchanged.
  function escapeLogPath(p) {
    var esc = function (c) { var n = c.charCodeAt(0); return n < 256 ? '\\x' + (n < 16 ? '0' : '') + n.toString(16) : '\\u' + n.toString(16).padStart(4, '0'); };
    return String(p).replace(/[\x00-\x1F\x7F\x85\u2028\u2029]/g, esc).replace(/ {2,}/g, function (m) { return m.replace(/ /g, '\\x20'); });
  }

  // layers-export.log text: versioned header, then one line per writeText entry; null prints '-'.
  function writeLogText(entries) {
    var v = function (x) { return x == null ? '-' : x; };
    var lines = ['# layers-export.log v' + WRITE_LOG_VERSION + ' — at  path  from -> to bytes (UTF-8)  sha256 before -> after  [.bak guardado]'];
    (entries || []).forEach(function (w) {
      lines.push([w.at, escapeLogPath(w.path), v(w.from) + ' -> ' + v(w.to) + ' bytes', 'sha256 ' + v(w.fromHash) + ' -> ' + v(w.toHash), w.bak ? '.bak guardado' : ''].filter(Boolean).join('  '));
    });
    return lines.join('\n') + '\n';
  }

  function pendingStr(v) { return typeof v === 'string'; }

  // Registro persistido e dado de fora: forma errada derruba a entrada inteira, nunca chega ao loader.
  function validPendingChange(c) {
    if (!c || typeof c !== 'object') return false;
    if (!pendingStr(c.key) || !pendingStr(c.id) || !pendingStr(c.prop) || !pendingStr(c.to)) return false;
    // so nome de propriedade de estilo: cssText, length, parentRule e indices numericos nao sao escrita valida em el.style
    if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(c.prop) || c.prop === 'cssText' || c.prop === 'length' || c.prop === 'parentRule') return false;
    if (!(c.ids instanceof Array) || !c.ids.length || !c.ids.every(pendingStr)) return false;
    return !!c.fromInline && typeof c.fromInline === 'object' && !(c.fromInline instanceof Array);
  }

  // Manual request: 6 required fields plus optional anchors; a present optional field must have its type.
  var REQUEST_OPTIONAL = { nodeId: 'string', srcHash: 'string', name: 'string', depth: 'number', alvo: 'string', caixa: 'string', estilos: 'string', uses: 'number', confirm: 'boolean' };
  function validRequest(r) {
    if (!r || typeof r !== 'object' || r instanceof Array) return false;
    if (!pendingStr(r.id) || !pendingStr(r.layoutId) || !pendingStr(r.nodeKey) || !pendingStr(r.path) || !pendingStr(r.text)) return false;
    if (typeof r.createdAt !== 'number') return false;
    for (var k in REQUEST_OPTIONAL) {
      if (r[k] !== undefined && typeof r[k] !== REQUEST_OPTIONAL[k]) return false;
    }
    if (r.texts !== undefined && !(r.texts instanceof Array && r.texts.every(pendingStr))) return false;
    return r.pendente === undefined || r.pendente === null || pendingStr(r.pendente);
  }

  function pendingMap(storage) {
    var all = getJson(storage, LS.pending, null);
    var by = all && all.schema === SCHEMA && all.byProject;
    return by && typeof by === 'object' && !(by instanceof Array) ? by : {};
  }

  function getPending(storage, key) {
    var e = pendingMap(storage)[key];
    if (!e || typeof e !== 'object' || typeof e.hash !== 'string' || typeof e.savedAt !== 'number') return null;
    // changes and requests are validated independently: an invalid request is dropped alone; entries from older versions have no `requests`
    var requests = e.requests instanceof Array ? e.requests.filter(validRequest) : [];
    var changes = e.changes instanceof Array && e.changes.every(validPendingChange) ? e.changes : null;
    if (!changes) {
      if (!requests.length) return null; // nothing usable left: old behaviour
      changes = []; // invalid changes are discarded, the valid requests survive
    }
    return { savedAt: e.savedAt, hash: e.hash, changes: changes, requests: requests };
  }

  // entry === null remove a entrada do projeto; outras chaves e a expiracao passam pelo mesmo
  // read-modify-write, entao nenhuma escrita de uma aba apaga o projeto de outra.
  function setPending(storage, key, entry, now) {
    var by = pendingMap(storage), next = {};
    Object.keys(by).forEach(function (k) {
      var e = by[k];
      if (k !== key && e && typeof e.savedAt === 'number' && now - e.savedAt <= PENDING_TTL) next[k] = e;
    });
    var requests = entry && entry.requests ? entry.requests.slice(0, PENDING_CAP) : [];
    // changes over the cap are not stored (see PENDING_CAP), but requests still are
    var changes = entry && entry.changes.length <= PENDING_CAP ? entry.changes : [];
    if (entry && (changes.length || requests.length)) {
      next[key] = { savedAt: now, hash: entry.hash, changes: changes, requests: requests };
    }
    if (!Object.keys(next).length) {
      try { storage.removeItem(LS.pending); return true; } catch (e) { return false; }
    }
    if (setJson(storage, LS.pending, { schema: SCHEMA, byProject: next })) return true;
    // gravacao falhou (cota): a entrada antiga continuaria valida e ressuscitaria ajuste ja desfeito
    try { storage.removeItem(LS.pending); } catch (e) { /* sem remocao possivel: nada mais a fazer */ }
    return false;
  }

  // S9.1a: `<base>|*` = entradas dos layouts irmaos de `base`; a de `base` exato so entra com `includeBase`.
  // Mesmo read-modify-write de setPending; so grava se algo mudou. `now` omitido = sem poda por TTL.
  function layoutEntries(storage, base, now, includeBase, onSibling, keepOnFail) {
    if (typeof base !== 'string' || !base) return true;
    var by = pendingMap(storage), next = {}, changed = false, prefix = base + '|';
    Object.keys(by).forEach(function (k) {
      var e = by[k];
      if (typeof now === 'number' && !(e && typeof e.savedAt === 'number' && now - e.savedAt <= PENDING_TTL)) { changed = true; return; }
      if (k.indexOf(prefix) === 0 || (includeBase && k === base)) {
        var r = onSibling(e);
        if (r !== e) changed = true;
        if (r) next[k] = r;
      } else next[k] = e;
    });
    if (!changed) return true;
    if (!Object.keys(next).length) {
      try { storage.removeItem(LS.pending); return true; } catch (e) { return false; }
    }
    if (setJson(storage, LS.pending, { schema: SCHEMA, byProject: next })) return true;
    if (keepOnFail) return false; // a touch only renews: the old entries stay valid, dropping the store would lose them
    try { storage.removeItem(LS.pending); } catch (e) { /* sem remocao possivel: nada mais a fazer */ }
    return false;
  }

  // S9.1a (ruling h): renova savedAt dos irmaos de `base` (e de `base` exato com `includeBase`, layout `main` declarado).
  // false = `now` invalid or the write failed (the stored entries are left as they were).
  function touchLayoutEntries(storage, base, now, includeBase) {
    if (typeof now !== 'number' || !isFinite(now)) return false;
    return layoutEntries(storage, base, now, !!includeBase, function (e) {
      return e && typeof e === 'object' ? Object.assign({}, e, { savedAt: now }) : e;
    }, true);
  }

  // S9.1a: remove os irmaos de `base` ("Zerar interface"); a de `base` exato so com `includeBase`; sem poda (o proximo setPending poda).
  function clearLayoutEntries(storage, base, includeBase) {
    return layoutEntries(storage, base, undefined, !!includeBase, function () { return null; });
  }

  // Hash igual: tudo volta, na ordem, ja decidido (a pergunta de escopo nao e persistida).
  // Hash diferente: nada volta, `dropped` conta o que se perdeu e `confirm` pede confirmacao do alvo.
  // Requests voltam sempre (copia por registro, `texts` tambem copiado); so as changes dependem do hash.
  // Request com `srcHash` (hash do estado em que nasceu) tem `confirm` derivado: so se o hash atual difere, sem marca pegajosa.
  function restorePlan(entry, hash) {
    if (!entry) return { keep: [], dropped: 0, requests: [], confirm: false };
    var requests = (entry.requests instanceof Array ? entry.requests : []).filter(function (r) { return r && typeof r === 'object'; }).map(function (r) {
      var c = Object.assign({}, r);
      if (c.texts instanceof Array) c.texts = c.texts.slice();
      if (typeof c.srcHash === 'string') { if (c.srcHash === hash) delete c.confirm; else c.confirm = true; }
      return c;
    });
    if (entry.hash !== hash) return { keep: [], dropped: entry.changes.length, requests: requests, confirm: true };
    return {
      keep: entry.changes.map(function (c) {
        return Object.assign({}, c, { ids: c.ids.slice(), fromInline: Object.assign({}, c.fromInline), decided: true });
      }),
      dropped: 0,
      requests: requests,
      confirm: false
    };
  }

  function mdLine(v) { return String(v).replace(/[\r\n\u2028\u2029]+/g, ' '); }
  function mdStr(v) { return v == null ? '' : mdLine(v); }

  // Request fallback name: last path segment, else the id.
  function requestName(r) {
    var name = mdStr(r.name).trim();
    if (name) return name;
    var seg = typeof r.path === 'string' ? mdLine(r.path.split('>').pop()).trim() : '';
    return seg || mdStr(r.id);
  }

  // Copy-ready Markdown of the manual requests; user text never opens a heading, fence or list at column 0.
  function requestsMarkdown(o) {
    var reqs = (o && o.requests instanceof Array ? o.requests : []).filter(function (r) {
      return r && typeof r === 'object' && !(r instanceof Array);
    });
    if (!reqs.length) return '';
    var multi = o.layouts > 1;
    var out = [
      '## Requisições Manuais · ' + mdStr(o.project) + ' · ' + reqs.length,
      '<!-- Layers ' + mdStr(o.version) + ' · ' + mdStr(o.stamp) + ' · mock ' + mdStr(o.mock) + (multi ? ' · ' + o.layouts + ' layouts' : '') + ' -->'
    ];
    reqs.forEach(function (r) {
      var texts = r.texts instanceof Array ? r.texts.filter(function (t) { return typeof t === 'string' && t; }) : [];
      var line = function (label, v) { var t = mdStr(v); if (t) out.push('- ' + label + ': ' + t); };
      out.push('');
      out.push('### ' + mdStr(r.id) + ' · ' + requestName(r) + (typeof r.depth === 'number' && isFinite(r.depth) ? ' (L' + r.depth + ')' : '') +
        (typeof r.uses === 'number' && isFinite(r.uses) && r.uses > 1 ? ' ×' + r.uses : '') + (multi ? ' · layout: ' + mdStr(r.layoutId) : ''));
      if (o.confirm || r.confirm === true) out.push('- status: alvo a confirmar');
      line('alvo', r.alvo);
      line('caminho', r.path);
      if (texts.length) out.push('- texto: ' + texts.map(function (t) { return '“' + mdLine(t) + '”'; }).join(', '));
      line('caixa', r.caixa);
      line('estilos', r.estilos);
      line('ajuste pendente', r.pendente);
      out.push('- pedido: ' + (r.text == null ? '' : String(r.text)).replace(/[\r\n]+$/, '').split(/\r\n|\r|\n/).join('\n    '));
    });
    return out.join('\n');
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
    HELMET_PLACEHOLDER: 'HELMET_PLACEHOLDER',
    SNAPSHOT_STYLE: 'SNAPSHOT_STYLE',
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
      var styleRange = null;
      for (;;) {
        while (j < end && /[\s\/]/.test(text.charAt(j))) j++;
        if (j >= end) break;
        if (text.charAt(j) === '>') { j++; break; }
        var ns = j;
        while (j < end && !/[\s=\/>]/.test(text.charAt(j))) j++;
        if (j === ns) { j++; continue; }
        var name = text.slice(ns, j).toLowerCase();
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
      out.push({ tplId: out.length, tag: tag, line: lineNo, styleRange: styleRange });
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
    checkOrigin: checkOrigin,
    isManualSource: isManualSource,
    staleFiles: staleFiles,
    hasUnsaved: hasUnsaved,
    sourceHash: sourceHash,
    contentHash: contentHash,
    writeLogText: writeLogText,
    WRITE_LOG_VERSION: WRITE_LOG_VERSION,
    restorePlan: restorePlan,
    requestsMarkdown: requestsMarkdown,
    getPending: getPending,
    setPending: setPending,
    PENDING_CAP: PENDING_CAP,
    validRequest: validRequest,
    inlineDelta: inlineDelta,
    pushSnapshot: pushSnapshot,
    lineDiff: lineDiff,
    pickWatched: pickWatched,
    dismissWatch: dismissWatch,
    staleBannerBox: staleBannerBox,
    citedSources: citedSources,
    watchGlobs: watchGlobs,
    compileGlob: compileGlob,
    globMatch: globMatch,
    globDirMayMatch: globDirMayMatch,
    layoutDrift: layoutDrift,
    staleKind: staleKind,
    projectStates: projectStates,
    pickState: pickState,
    projectLayouts: projectLayouts,
    pickLayout: pickLayout,
    layoutPendingKey: layoutPendingKey,
    stateMapKey: stateMapKey,
    interactionsFor: interactionsFor,
    mergeLayoutRequests: mergeLayoutRequests,
    touchLayoutEntries: touchLayoutEntries,
    clearLayoutEntries: clearLayoutEntries,
    snapshotOriginCovered: snapshotOriginCovered,
    hostAttrsFromHtml: hostAttrsFromHtml,
    snapshotCapture: snapshotCapture,
    maskedSheets: maskedSheets,
    placeDeadWarning: placeDeadWarning,
    layoutBackupPaths: layoutBackupPaths,
    viewCuller: viewCuller,
    groupPlanesByZ: groupPlanesByZ,
    branchZ: branchZ,
    inBranchOf: inBranchOf,
    ancestorAt: ancestorAt,
    branchOf: branchOf,
    ctxMenuModel: ctxMenuModel,
    treeWindow: treeWindow,
    movedSince: movedSince,
    deadInteractions: deadInteractions,
    attrAction: attrAction,
    attrIsOn: attrIsOn,
    attrToggle: attrToggle,
    MENU_TIMING: MENU_TIMING,
    menuStep: menuStep,
    ACTIONS: ACTIONS,
    SHORTCUTS: SHORTCUTS,
    keyAction: keyAction,
    tooltip: tooltip,
    CFG_KEYS: CFG_KEYS,
    APPEARANCE_DEFAULTS: APPEARANCE_DEFAULTS,
    readConfig: readConfig,
    writeConfig: writeConfig,
    migrateConfig: migrateConfig,
    exportConfig: exportConfig,
    importConfig: importConfig
  };

  root.LayersCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
