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

  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }

  var api = {
    safePath: safePath,
    openZip: openZip,
    zipRoot: zipRoot,
    parseSheet: parseSheet,
    buildIndex: buildIndex,
    varIndex: varIndex,
    findRule: findRule,
    ruleText: ruleText,
    declaredIn: declaredIn,
    patchCssAt: patchCssAt,
    scopeAst: scopeAst,
    isUtilitySheet: isUtilitySheet,
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
