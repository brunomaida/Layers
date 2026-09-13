// LAYERS — inventário de superfícies latentes (spike da fatia 5, descartável)
//
// Cole no console do editor com um projeto carregado (`#layers=fixtures/<nome>/` serve).
// Varre o mock no shadow root, sugere um `interactions[]` a partir de sinais estáticos, e
// compara a sugestão com o `interactions` que o autor escreveu no layers.json.
//
// Não altera o editor nem o mock: só lê. A pergunta que este script responde é uma só —
// quanto do manifesto autoral um scanner acha sozinho, e quanto lixo ele traz junto.
//
// Uso:
//   const r = await layersSuggest();     // mede, imprime as tabelas, devolve o relatório
//   copy(JSON.stringify(r, null, 2));    // se quiser o JSON inteiro
(() => {
  const CLASS_PAIRS = ['active', 'is-open', 'open', 'show', 'shown', 'expanded', 'collapsed', 'hidden', 'is-active', 'selected'];

  const mockRoot = () => {
    const host = document.querySelector('div[style*="-20000px"]');
    const sh = host && host.shadowRoot;
    return sh ? sh.lastElementChild : null;
  };

  // identidade estável de elemento: cadeia de índices desde a raiz do mock
  const pathOf = (root, el) => {
    const parts = [];
    for (let e = el; e && e !== root; e = e.parentElement) parts.unshift([...e.parentElement.children].indexOf(e));
    return parts.join('.') || '0';
  };

  const setOf = (root, sel) => {
    try {
      const L = [...root.querySelectorAll(sel)];
      if (root.matches(sel)) L.unshift(root);
      return new Set(L.map(e => pathOf(root, e)));
    } catch (e) { return new Set(); }
  };

  const sameSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
  const meets = (a, b) => [...a].some(x => b.has(x));

  // seletor legível e específico o bastante para o `act()` do editor reencontrar o elemento
  const selFor = (root, el) => {
    if (el.id) return '#' + CSS.escape(el.id);
    const cls = [...(el.classList || [])].filter(c => !CLASS_PAIRS.includes(c));
    if (cls.length) {
      const s = '.' + CSS.escape(cls[0]);
      if (setOf(root, s).size <= 4) return s;
      return el.tagName.toLowerCase() + s;
    }
    if (el.dataset && el.dataset.name) return '[data-name="' + el.dataset.name.replace(/"/g, '\\"') + '"]';
    return el.tagName.toLowerCase();
  };

  // ---- sinais, do mais preciso para o mais ruidoso ------------------------------------
  function collect(root) {
    const out = [];
    const push = (signal, el, extra) => out.push({ signal, sel: selFor(root, el), tag: el.tagName.toLowerCase(), ...extra });
    const all = [root, ...root.querySelectorAll('*')];

    all.forEach(el => {
      if (el.tagName === 'DIALOG') push('dialog', el, { kind: 'toggle' });
      else if (el.tagName === 'DETAILS') push('details', el, { kind: 'toggle' });
      if (el.hasAttribute && el.hasAttribute('hidden')) push('hidden-attr', el, { kind: 'toggle' });
      if (el.hasAttribute && el.hasAttribute('popovertarget')) {
        const t = root.querySelector('#' + CSS.escape(el.getAttribute('popovertarget')));
        if (t) push('popovertarget', t, { kind: 'toggle', by: selFor(root, el) });
      }
      if (el.hasAttribute && el.hasAttribute('aria-controls')) {
        el.getAttribute('aria-controls').split(/\s+/).forEach(id => {
          const t = id && root.querySelector('#' + CSS.escape(id));
          if (t) push('aria-controls', t, { kind: 'toggle', by: selFor(root, el) });
        });
      }
      if (el.hasAttribute && el.hasAttribute('aria-expanded')) push('aria-expanded', el, { kind: 'class', name: 'expanded' });
      const role = el.getAttribute && el.getAttribute('role');
      if (role === 'tab' || role === 'tabpanel') push('role-' + role, el, { kind: role === 'tab' ? 'class' : 'toggle', name: 'active' });
    });

    // display:none computado — o walk() do editor pula bbox 0x0, então isto é exatamente o
    // que a árvore de camadas não mostra até alguém alternar
    all.forEach(el => {
      if (!el.getBoundingClientRect) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' && !el.hasAttribute('hidden') && el.tagName !== 'DIALOG') push('display-none', el, { kind: 'toggle' });
    });

    // heurística de classe alternada: o sinal com mais recall e mais ruído
    const byPair = {};
    all.forEach(el => {
      [...(el.classList || [])].forEach(c => {
        if (!CLASS_PAIRS.includes(c)) return;
        const base = [...el.classList].find(x => !CLASS_PAIRS.includes(x));
        const key = (base ? '.' + base : el.tagName.toLowerCase()) + '|' + c;
        if (!byPair[key]) { byPair[key] = true; push('class-pair', el, { kind: 'class', name: c, sel: base ? '.' + CSS.escape(base) : el.tagName.toLowerCase() }); }
      });
    });

    // dedupe por (conjunto de elementos + kind): dois sinais na mesma superfície são uma sugestão
    const seen = new Map();
    out.forEach(s => {
      s.set = setOf(root, s.sel);
      const k = s.kind + '#' + [...s.set].sort().join(',') + '#' + (s.name || '');
      if (!seen.has(k)) seen.set(k, { ...s, signals: [s.signal] });
      else seen.get(k).signals.push(s.signal);
    });
    return [...seen.values()].filter(s => s.set.size > 0);
  }

  // ---- entradas autorais: as folhas de groups[].items[] mais o `show` da superfície ----
  function authored(root, interactions) {
    const leaves = [];
    (interactions || []).forEach((it, i) => {
      if (!it || typeof it !== 'object' || it.sep !== undefined) return;
      const selsOf = a => {
        const s = [];
        ['toggle', 'show', 'hide', 'click'].forEach(k => { if (a[k]) s.push(a[k]); });
        if (a.class) s.push(typeof a.class === 'string' ? a.class : a.class.selector);
        return s.filter(Boolean);
      };
      if (it.show) leaves.push({ label: it.label || 'i' + i, where: 'surface', sels: [it.show] });
      (it.groups || []).forEach(g => (g.items || []).forEach(a => {
        const sels = selsOf(a);
        if (sels.length) leaves.push({ label: (it.label || '') + ' › ' + (a.label || ''), where: 'item', sels });
      }));
    });
    leaves.forEach(l => {
      l.set = new Set();
      l.sels.forEach(s => setOf(root, s).forEach(p => l.set.add(p)));
    });
    return leaves;
  }

  window.layersSuggest = async function layersSuggest() {
    const root = mockRoot();
    if (!root) { console.warn('mock não encontrado — carregue um projeto antes.'); return null; }

    const hash = /[#&]layers=([^&]+)/.exec(location.hash);
    const base = hash ? decodeURIComponent(hash[1]) : null;
    let man = null;
    if (base) { try { man = await (await fetch('/' + base.replace(/\/$/, '') + '/layers.json')).json(); } catch (e) {} }

    const sug = collect(root);
    const aut = authored(root, man && man.interactions);

    // cobertura: um item autoral conta como coberto quando alguma sugestão cai no mesmo
    // conjunto de elementos (igualdade) ou dentro dele (o autor agrupou dois seletores)
    aut.forEach(a => {
      a.exact = sug.filter(s => sameSet(s.set, a.set)).map(s => s.sel);
      a.partial = sug.filter(s => !sameSet(s.set, a.set) && meets(s.set, a.set)).map(s => s.sel);
      a.hit = a.exact.length > 0 || a.partial.length > 0;
    });
    sug.forEach(s => { s.fp = !aut.some(a => meets(s.set, a.set)); });

    const perSignal = {};
    sug.forEach(s => s.signals.forEach(sig => {
      const r = perSignal[sig] || (perSignal[sig] = { sugeridas: 0, casaram: 0, falsoPositivo: 0 });
      r.sugeridas++; if (s.fp) r.falsoPositivo++; else r.casaram++;
    }));

    // custo do re-scan: é o que o scan() do editor faz a cada ação (walk + getComputedStyle)
    const els = [root, ...root.querySelectorAll('*')];
    const t0 = performance.now();
    let sink = 0;
    for (let i = 0; i < 5; i++) els.forEach(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); sink += r.width + parseFloat(cs.opacity || 0); });
    const scanMs = (performance.now() - t0) / 5;

    const rep = {
      projeto: (man && man.name) || base || '(desconhecido)',
      nos: els.length,
      autorais: aut.length,
      sugeridas: sug.length,
      cobertas: aut.filter(a => a.hit).length,
      cobertasExatas: aut.filter(a => a.exact.length).length,
      falsosPositivos: sug.filter(s => s.fp).length,
      scanMs: +scanMs.toFixed(1),
      porSinal: perSignal,
      perdidas: aut.filter(a => !a.hit).map(a => ({ label: a.label, sels: a.sels, elementos: a.set.size })),
      extras: sug.filter(s => s.fp).map(s => ({ sel: s.sel, kind: s.kind, name: s.name || '', sinais: s.signals.join('+'), elementos: s.set.size })),
      _sink: sink && 0
    };
    console.log('projeto', rep.projeto, '·', rep.nos, 'nós ·', rep.autorais, 'autorais ·', rep.sugeridas, 'sugeridas ·', rep.cobertas, 'cobertas ·', rep.falsosPositivos, 'FP ·', rep.scanMs, 'ms de re-scan');
    console.table(rep.porSinal);
    if (rep.perdidas.length) console.table(rep.perdidas);
    return rep;
  };

  console.log('layersSuggest() pronto — chame `await layersSuggest()` com um projeto carregado.');
})();
