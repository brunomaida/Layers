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
    if (/@tailwind\b/.test(text) || /@layer\s+utilities\b/.test(text)) return true;
    var rules = parseSheet('', text, 0);
    if (rules.length < 800) return false;
    var single = 0;
    for (var i = 0; i < rules.length; i++) if (/^\.[^\s,>+~]+$/.test(rules[i].selector)) single++;
    return single > 800;
  }

  var api = {
    safePath: safePath,
    parseSheet: parseSheet,
    buildIndex: buildIndex,
    findRule: findRule,
    ruleText: ruleText,
    declaredIn: declaredIn,
    patchCssAt: patchCssAt,
    scopeAst: scopeAst,
    isUtilitySheet: isUtilitySheet
  };

  root.LayersCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
