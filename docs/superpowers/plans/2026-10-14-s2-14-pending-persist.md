---
title: "Layers — plano de implementação da persistência de ajustes pendentes (S2.14)"
type: plan
solution: Layers
status: draft
created: 2026-10-14
---

# Layers — persistência de ajustes pendentes (S2.14) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajustes de estilo pendentes (`changes[]`) sobrevivem a um reload ou à reabertura do projeto e voltam ao preview com um aviso.

**Architecture:** Cinco funções puras em `lib/layers-core.js` (`sourceHash`, `restorePlan`, `getPending`, `setPending`, constante `PENDING_CAP`) decidem validade e armazenamento; `index.html` liga o ciclo de vida (gravação por identidade de `state.changes`, restauração dentro de `loadProject`, limpeza em `doReload`/`resetUI`, refresh do hash após `approve`/`rollback`). Validade é tudo-ou-nada por hash das fontes lidas.

**Tech Stack:** JS puro (script clássico `LayersCore` + classe React em `index.html`), Vitest (`npm test`), Playwright (`npm run test:e2e`).

**Spec:** [2026-10-14-s2-14-pending-persist-design.md](../specs/2026-10-14-s2-14-pending-persist-design.md)

## Global Constraints

- Visual congelado: nenhuma cor, tipografia ou componente novo; a única saída visível é o toast existente (`toast(msg, kind)`).
- `index.html` + `support.js` continuam sendo o app; `support.js` é gerado: não editar.
- Nenhuma chave `layers/v1/*` guarda conteúdo de arquivo: `layers/v1/pending` guarda só valores CSS, metadados e o hash.
- Toda gravação em disco continua por `writeInto`/`writeText`; esta fatia só escreve em `localStorage`.
- `lib/layers-core.js` é script clássico ES5 (`var`, `function`), sem DOM e sem relógio: o tempo entra por parâmetro (`now`).
- Prosa de docs em PT-BR; código, comentários de código e commits em EN. Conventional Commits, nunca `Co-Authored-By`.
- `index.html` é grande: antes de cada `Edit`, conferir que a âncora casa exatamente 1 vez.
- Gate de commit: `npm test` passando.

## Review Focus

| Entrada ou condição | Comportamento esperado | Onde fica fixado |
|---|---|---|
| `layers.json` mudou (`rules`, `viewport`) sem tocar mock nem css | hash muda, tudo descartado | Task A: `SourceHash_ManMudou_HashDiferente` |
| Edição seguida de reload em menos de 400 ms | a edição volta (o `pagehide` drena a escrita) | Task C: `Reload_PendingEdit_RestoresInlineAndToasts` |
| Fonte mudou no disco | nada restaurado, toast `warn`, segundo reload não repete o aviso | Task C: `Reload_SourceChanged_DiscardsAndWarns` |
| Desfazer até vazio e recarregar | nada restaurado, entrada removida | Task C: `Reload_UndoneToEmpty_RestoresNothing` |
| Ajuste que oculta o nó (`display:none`) ou fonte que falha na leitura | restaura por caminho; leitura incompleta preserva a entrada | Task C, passo manual (não há fixture nem rota determinística) |

---

## Context

`changes[]` vive só em memória; `loadProject` a zera. A spec define a persistência por hash das fontes, com a chave de projeto calculada uma vez, e os pontos de ciclo de vida. Este plano implementa a spec sem alterá-la.

Reuses: `setJson`/`getJson`/`LS`/`SCHEMA` e o bloco de persistência de `lib/layers-core.js` (~651-703), `persistSoon`/`writeConfig` e `componentDidUpdate` (`index.html:1098`, `:1434`), `LS_STORE`, `toast()`, `cloneChanges()`, os helpers de `e2e/undo-redo.spec.js`.
Out of scope: pilha de undo/redo, `codeBuf`, defeitos pré-existentes listados na spec (§ Fora de escopo), `openDemo` não zerar zip/repo.

## Design: Architecture & Flows

Superfície: estado de edição e persistência local; sem UI nova (sem mockup).

### Topology (micro)

```
 lib/layers-core.js                          index.html (classe do editor)
 ┌───────────────────────────┐              ┌──────────────────────────────────────┐
 │ sourceHash(parts)         │◄─ hash ──────│ srcHash(man,mock,html,css,dc…)       │
 │ restorePlan(entry, hash)  │◄─ entry ─────│ loadProject: restaura + setState     │
 │ getPending(storage, key)  │◄─ leitura ───│                                      │
 │ setPending(st,key,e,now)  │◄─ escrita ───│ writePending / dropPending           │
 │ PENDING_CAP, LS.pending   │              │ componentDidUpdate: identidade       │
 └───────────────────────────┘              │ approve/rollback: refreshPendingHash │
                                            └──────────────────────────────────────┘
```

### Ciclo de vida

```
 loadProject ─ 1ª instrução: writeConfig() · pendingReady=false · pendingKey=pendingKeyNow()
      ─ lê man + mock + css + dc ─ guard seq ─ hash ─ getPending ─ restorePlan
      ─ el.style por caminho ─ setState({ changes: restaurados, pending: null })
      ─ pendingSeen=restaurados · pendingReady=true
 edição ─ state.changes ≠ pendingSeen ─ pendingDirty ─ persistSoon ─ writePending
 doReload/resetUI ─ dropPending ─ (loadProject)        approve/rollback ─ refreshPendingHash
```

## Implementation Outline

Tarefas A a D abaixo, na ordem: A (núcleo puro + Vitest) → B (integração em `index.html`) → C (E2E) → D (docs e fragmento de changelog).

---

### Task A: Funções puras de persistência em `LayersCore`

**Files:**
- Modify: `lib/layers-core.js` (objeto `LS` ~651; após `writeConfig` ~703; exports ~1053-1056)
- Test: `test/layers-core.test.js` (acrescentar ao fim)

**Interfaces:**
- Produces: `LayersCore.sourceHash(parts: Array<string|null>) → string`; `LayersCore.restorePlan(entry|null, hash: string) → { keep: change[], dropped: number }`; `LayersCore.getPending(storage, key: string) → { savedAt: number, hash: string, changes: change[] } | null`; `LayersCore.setPending(storage, key: string, entry: { hash, changes } | null, now: number) → boolean`; `LayersCore.PENDING_CAP === 200`.

- [ ] **Step 1: Write the failing tests**

Acrescentar ao fim de `test/layers-core.test.js`:

```js
const pendingChange = (o) => ({ key: '0.1|color', id: '0.1', ids: ['0.1'], name: '.a', src: 'a.css|.a|3', prop: 'color', from: 'red', fromInline: { '0.1': '' }, to: 'blue', scope: 'one', decided: false, scopedSel: null, ...o });
const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };
const DAY = 24 * 60 * 60 * 1000;

describe('SourceHash', () => {
  it('MesmasPartes_MesmoHash', () => {
    expect(core.sourceHash(['a', 'b'])).toBe(core.sourceHash(['a', 'b']));
  });

  it('PartesTrocadasDeFronteira_HashDiferente', () => {
    expect(core.sourceHash(['ab', 'c'])).not.toBe(core.sourceHash(['a', 'bc']));
  });

  it('DcNuloVsVazio_HashDiferente', () => {
    expect(core.sourceHash(['x', null])).not.toBe(core.sourceHash(['x', '']));
  });

  it('ManMudou_HashDiferente', () => {
    const a = core.sourceHash([JSON.stringify({ rules: { a: 1 } }), 'mock.html', '<p>']);
    const b = core.sourceHash([JSON.stringify({ rules: { a: 2 } }), 'mock.html', '<p>']);
    expect(a).not.toBe(b);
  });
});

describe('RestorePlan', () => {
  it('HashIgual_RestauraTudoDecidedTrue', () => {
    const entry = { savedAt: 1, hash: 'h', changes: [pendingChange({}), pendingChange({ key: '0.2|color', id: '0.2', ids: ['0.2'] })] };
    const plan = core.restorePlan(entry, 'h');
    expect(plan.dropped).toBe(0);
    expect(plan.keep.map((c) => c.decided)).toEqual([true, true]);
    expect(plan.keep[0]).not.toBe(entry.changes[0]);
  });

  it('HashIgual_PreservaOrdem', () => {
    const entry = { savedAt: 1, hash: 'h', changes: [pendingChange({ key: 'b|x', prop: 'x' }), pendingChange({ key: 'a|x', prop: 'x' })] };
    expect(core.restorePlan(entry, 'h').keep.map((c) => c.key)).toEqual(['b|x', 'a|x']);
  });

  it('HashDiferente_DescartaTudo', () => {
    const entry = { savedAt: 1, hash: 'h', changes: [pendingChange({}), pendingChange({ key: 'k2' })] };
    expect(core.restorePlan(entry, 'outro')).toEqual({ keep: [], dropped: 2 });
  });

  it('EntryNula_VazioSemDescarte', () => {
    expect(core.restorePlan(null, 'h')).toEqual({ keep: [], dropped: 0 });
  });
});

describe('SetPending / GetPending', () => {
  it('RoundTrip_DevolveEntrada', () => {
    const st = memStorage();
    core.setPending(st, 'fx:a', { hash: 'h', changes: [pendingChange({})] }, 1000);
    const e = core.getPending(st, 'fx:a');
    expect(e.hash).toBe('h');
    expect(e.savedAt).toBe(1000);
    expect(e.changes).toHaveLength(1);
  });

  it('EntryNull_RemoveSoDoProjeto', () => {
    const st = memStorage();
    core.setPending(st, 'fx:a', { hash: 'h', changes: [pendingChange({})] }, 1000);
    core.setPending(st, 'fx:b', { hash: 'h', changes: [pendingChange({})] }, 1000);
    core.setPending(st, 'fx:a', null, 2000);
    expect(core.getPending(st, 'fx:a')).toBeNull();
    expect(core.getPending(st, 'fx:b')).not.toBeNull();
  });

  it('OutraChave_Preserva', () => {
    const st = memStorage();
    core.setPending(st, 'fx:a', { hash: 'h1', changes: [pendingChange({})] }, 1000);
    core.setPending(st, 'fx:b', { hash: 'h2', changes: [pendingChange({})] }, 1000);
    expect(core.getPending(st, 'fx:a').hash).toBe('h1');
  });

  it('AcimaDoTeto_RemoveEntrada', () => {
    const st = memStorage();
    const many = Array.from({ length: core.PENDING_CAP + 1 }, (_, i) => pendingChange({ key: 'k' + i }));
    core.setPending(st, 'fx:a', { hash: 'h', changes: [pendingChange({})] }, 1000);
    core.setPending(st, 'fx:a', { hash: 'h', changes: many }, 2000);
    expect(core.getPending(st, 'fx:a')).toBeNull();
  });

  it('Expirada_Remove', () => {
    const st = memStorage();
    core.setPending(st, 'fx:old', { hash: 'h', changes: [pendingChange({})] }, 0);
    core.setPending(st, 'fx:new', { hash: 'h', changes: [pendingChange({})] }, 31 * DAY);
    expect(core.getPending(st, 'fx:old')).toBeNull();
    expect(core.getPending(st, 'fx:new')).not.toBeNull();
  });

  it('JsonCorrompido_DevolveNull', () => {
    const st = memStorage();
    st.setItem('layers/v1/pending', '{nao e json');
    expect(core.getPending(st, 'fx:a')).toBeNull();
  });

  it('ChangeSemIds_DevolveNull', () => {
    const st = memStorage();
    st.setItem('layers/v1/pending', JSON.stringify({ schema: 1, byProject: { 'fx:a': { savedAt: 1, hash: 'h', changes: [pendingChange({ ids: 'nao-array' })] } } }));
    expect(core.getPending(st, 'fx:a')).toBeNull();
  });

  it('PropCssText_DevolveNull', () => {
    const st = memStorage();
    st.setItem('layers/v1/pending', JSON.stringify({ schema: 1, byProject: { 'fx:a': { savedAt: 1, hash: 'h', changes: [pendingChange({ prop: 'cssText' })] } } }));
    expect(core.getPending(st, 'fx:a')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- test/layers-core.test.js`
Expected: FAIL com `core.sourceHash is not a function` (e equivalentes para `restorePlan`, `setPending`, `getPending`).

- [ ] **Step 3: Write the minimal implementation**

3a. No objeto `LS` (`lib/layers-core.js` ~651), acrescentar a chave. Âncora: a linha `    session: 'layers/v1/session'` (1 ocorrência). Novo conteúdo:

```js
    session: 'layers/v1/session',
    pending: 'layers/v1/pending'
```

3b. Logo depois da função `writeConfig` (termina em `return setJson(storage, LS.meta, meta) && ok;\n  }`), inserir:

```js
  // ------------------------------------------------- ajustes pendentes (S2.14)

  // Teto de changes por projeto e vida da entrada; acima do teto a entrada e removida, nao truncada.
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

  function pendingStr(v) { return typeof v === 'string'; }

  // Registro persistido e dado de fora: forma errada derruba a entrada inteira, nunca chega ao loader.
  function validPendingChange(c) {
    if (!c || typeof c !== 'object') return false;
    if (!pendingStr(c.key) || !pendingStr(c.id) || !pendingStr(c.prop) || !pendingStr(c.to) || c.prop === 'cssText') return false;
    if (!(c.ids instanceof Array) || !c.ids.length || !c.ids.every(pendingStr)) return false;
    return !!c.fromInline && typeof c.fromInline === 'object' && !(c.fromInline instanceof Array);
  }

  function pendingMap(storage) {
    var all = getJson(storage, LS.pending, null);
    var by = all && all.schema === SCHEMA && all.byProject;
    return by && typeof by === 'object' && !(by instanceof Array) ? by : {};
  }

  function getPending(storage, key) {
    var e = pendingMap(storage)[key];
    if (!e || typeof e !== 'object' || typeof e.hash !== 'string' || typeof e.savedAt !== 'number') return null;
    if (!(e.changes instanceof Array) || !e.changes.every(validPendingChange)) return null;
    return { savedAt: e.savedAt, hash: e.hash, changes: e.changes };
  }

  // entry === null remove a entrada do projeto; outras chaves e a expiracao passam pelo mesmo
  // read-modify-write, entao nenhuma escrita de uma aba apaga o projeto de outra.
  function setPending(storage, key, entry, now) {
    var by = pendingMap(storage), next = {};
    Object.keys(by).forEach(function (k) {
      var e = by[k];
      if (k !== key && e && typeof e.savedAt === 'number' && now - e.savedAt <= PENDING_TTL) next[k] = e;
    });
    if (entry && entry.changes.length && entry.changes.length <= PENDING_CAP) {
      next[key] = { savedAt: now, hash: entry.hash, changes: entry.changes };
    }
    if (!Object.keys(next).length) {
      try { storage.removeItem(LS.pending); return true; } catch (e) { return false; }
    }
    return setJson(storage, LS.pending, { schema: SCHEMA, byProject: next });
  }

  // Hash igual: tudo volta, na ordem, ja decidido (a pergunta de escopo nao e persistida).
  // Hash diferente: nada volta e `dropped` conta o que se perdeu.
  function restorePlan(entry, hash) {
    if (!entry) return { keep: [], dropped: 0 };
    if (entry.hash !== hash) return { keep: [], dropped: entry.changes.length };
    return {
      keep: entry.changes.map(function (c) {
        return Object.assign({}, c, { ids: c.ids.slice(), fromInline: Object.assign({}, c.fromInline), decided: true });
      }),
      dropped: 0
    };
  }

```

3c. No objeto exportado, depois de `    hasUnsaved: hasUnsaved,` (1 ocorrência), acrescentar:

```js
    sourceHash: sourceHash,
    restorePlan: restorePlan,
    getPending: getPending,
    setPending: setPending,
    PENDING_CAP: PENDING_CAP,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (todos os testes, incluindo os 14 novos).

- [ ] **Step 5: Commit**

```bash
git add lib/layers-core.js test/layers-core.test.js
git commit -m "feat(core): sourceHash, restorePlan and pending storage for persisted changes (S2.14 Task A)"
```

---

### Task B: Integração em `index.html`

**Files:**
- Modify: `index.html` (campos de classe junto de `histRef`; `writeConfig` ~1099; `componentDidUpdate` ~1442; `loadProject` ~1195-1259; `unloadProject` ~1261; `resetUI` ~1193; `doReload` ~1496; `approve` ~1835; `rollback` ~1850)

**Interfaces:**
- Consumes: `LayersCore.sourceHash`, `restorePlan`, `getPending`, `setPending`, `PENDING_CAP` (Task A).
- Produces: métodos `pendingKeyNow()`, `srcHash(man, mockPath, html, css, dcFile, dcText)`, `elAtPath(id)`, `writePending()`, `dropPending()`, `refreshPendingHash()`; campos `pendingReady`, `pendingKey`, `pendingHash`, `pendingSeen`, `pendingDirty`, `hashSpec`.

Cada passo abaixo é um `Edit` com âncora única; conferir 1 casamento antes de aplicar.

- [ ] **Step 1: Campos de estado (âncora `  histRef = React.createRef();`)**

Substituir por:

```js
  histRef = React.createRef();
  // S2.14: ajustes pendentes persistidos em layers/v1/pending. `pendingReady` so liga na carga
  // vencedora; `pendingSeen` e a identidade de state.changes ja contabilizada.
  pendingReady = false; pendingKey = null; pendingHash = null; pendingSeen = null; pendingDirty = false; hashSpec = null;
```

- [ ] **Step 2: Métodos e gravação (âncora a linha inteira de `writeConfig()` do componente)**

Substituir
`  writeConfig() { clearTimeout(this.persistT); LayersCore.writeConfig(LS_STORE, { ui: this.uiSnapshot(), projects: this.state.hist || [], session: this.sessionSnapshot() }); }`
por:

```js
  writeConfig() { clearTimeout(this.persistT); LayersCore.writeConfig(LS_STORE, { ui: this.uiSnapshot(), projects: this.state.hist || [], session: this.sessionSnapshot() }); this.writePending(); }
  // Espelha a origem que readBytes realmente le; calculada uma vez em loadProject e guardada em
  // this.pendingKey, nunca relida na hora de escrever (projectId pode ja ser o do proximo projeto).
  pendingKeyNow() { if (this.state.dir || this.zip || this.repo) return this.projectId || null; const b = this.fixtureBase; return b ? 'fx:' + b.replace(/\/$/, '') : null; }
  srcHash(man, mockPath, html, css, dcFile, dcText) { const parts = [JSON.stringify(man), mockPath, html]; css.forEach(c => { parts.push(c.file, c.text); }); parts.push(dcFile, dcText); return LayersCore.sourceHash(parts); }
  // Desce mockRoot pelo caminho do id: no de tamanho zero fica fora de this.els, o caminho segue valido.
  elAtPath(id) { let el = this.mockRoot; if (!el) return null; const p = String(id).split('.'); for (let k = 1; k < p.length && el; k++) el = el.children[+p[k]]; return el || null; }
  writePending() {
    if (!this.pendingReady || !this.pendingKey || !this.pendingDirty) return;
    const ch = this.state.changes;
    if (ch.length > LayersCore.PENDING_CAP) this.toast('Mais de ' + LayersCore.PENDING_CAP + ' ajustes pendentes: não serão restaurados ao reabrir.', 'warn');
    LayersCore.setPending(LS_STORE, this.pendingKey, ch.length ? { hash: this.pendingHash, changes: ch } : null, Date.now());
    this.pendingDirty = false;
  }
  // Descarte explicito (recarregar confirmado, zerar interface): limpa a entrada e para de gravar ate a proxima carga.
  dropPending() { if (this.pendingReady && this.pendingKey) LayersCore.setPending(LS_STORE, this.pendingKey, null, Date.now()); this.pendingDirty = false; this.pendingReady = false; }
  // approve/rollback reescrevem os .css sem recarregar: o hash da sessao passa a descrever os arquivos novos.
  async refreshPendingHash() {
    const hs = this.hashSpec; if (!hs || !this.pendingReady) return; const seq = this.loadSeq;
    try {
      const html = await this.readText(hs.mockPath); const css = [];
      for (const f of hs.cssFiles) css.push({ file: f, text: await this.readText(f) });
      const dcText = hs.dcFile ? await this.readText(hs.dcFile) : null;
      if (seq !== this.loadSeq) return;
      this.pendingHash = this.srcHash(hs.man, hs.mockPath, html, css, hs.dcFile, dcText); this.pendingDirty = true; this.persistSoon();
    } catch (e) { this.pendingReady = false; }
  }
```

- [ ] **Step 3: Gravação por identidade (âncora `    if (sig !== this.persistSig) { this.persistSig = sig; this.persistSoon(); }`)**

Acrescentar logo depois, dentro de `componentDidUpdate`:

```js
    if (this.pendingReady && this.state.changes !== this.pendingSeen) { this.pendingSeen = this.state.changes; this.pendingDirty = true; this.persistSoon(); }
```

- [ ] **Step 4: Início de `loadProject` (âncora `    this.loadSeq = (this.loadSeq || 0) + 1; const seq = this.loadSeq;`, 1 ocorrência)**

Substituir por:

```js
    this.writeConfig(); this.pendingReady = false; this.pendingKey = this.pendingKeyNow(); // drena a rajada na chave antiga antes de recalcular
    this.loadSeq = (this.loadSeq || 0) + 1; const seq = this.loadSeq;
```

- [ ] **Step 5: Restauração (âncora `    this.dc = dc && dc.trust ? dc : null;`, 1 ocorrência)**

Inserir imediatamente antes dessa linha (já depois do guard `seq !== this.loadSeq`; nenhum `await` entre aqui e o `setState`):

```js
    // S2.14: so a carga vencedora chega aqui. Fonte que falhou na leitura torna o hash nao confiavel:
    // nada e restaurado, a sessao nao grava e a entrada salva fica intacta.
    const incomplete = warn.some(w => /^(css não encontrado|dcSource não lido)/.test(w));
    const hash = this.srcHash(man, mockPath, html, css, dcText !== null ? dcFile : null, dcText);
    const saved = this.pendingKey ? LayersCore.getPending(LS_STORE, this.pendingKey) : null;
    const plan = incomplete ? { keep: [], dropped: 0 } : LayersCore.restorePlan(saved, hash);
    plan.keep.forEach(c => c.ids.forEach(i => { const e2 = this.elAtPath(i); if (e2) e2.style[c.prop] = c.to; }));
    const restored = plan.keep, dropped = plan.dropped;
    const pendNote = restored.length ? ' · ' + restored.length + ' ajuste(s) restaurado(s)' : dropped ? ' · ' + dropped + ' ajuste(s) salvo(s) descartado(s): arquivo mudou' : incomplete && saved ? ' · ajustes salvos mantidos: fonte não lida' : '';
    this.hashSpec = { man, mockPath, cssFiles: css.map(c => c.file), dcFile: dcText !== null ? dcFile : null };
    this.pendingHash = hash; this.pendingSeen = restored; this.pendingDirty = dropped > 0; this.pendingReady = !incomplete && !!this.pendingKey;
```

- [ ] **Step 6: `setState` e toast do loader**

6a. No `this.setState({ stale: null, project: ...` de `loadProject`, substituir a sequência
`isoId: (keep && keep.isoId) || null, changes: [], buf: {},`
por
`isoId: (keep && keep.isoId) || null, changes: restored, pending: null, buf: {},`

6b. Substituir o toast final do loader:
`(warn.length ? ' · ' + warn.length + ' aviso(s): ' + warn[0] : '') + '.', warn.length ? 'warn' : 'ok');`
por
`(warn.length ? ' · ' + warn.length + ' aviso(s): ' + warn[0] : '') + pendNote + '.', warn.length || dropped ? 'warn' : 'ok');`

6c. Logo depois do `this.setState({ stale: null, project: ... });` (a chamada termina em `}, () => { this.scan(); if (keep) this.select(keep.selId); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.scanSoon()); });`), acrescentar uma linha:

```js
    if (this.pendingDirty) this.persistSoon(); // hash diferente: a entrada antiga sai na proxima escrita
```

- [ ] **Step 7: `unloadProject`, `resetUI`, `doReload`**

7a. `  unloadProject(why) { this.resetUndo();` → `  unloadProject(why) { this.resetUndo(); this.pendingReady = false;`

7b. `  resetUI() { this.loadSeq = (this.loadSeq || 0) + 1; this.unloadProject();` → `  resetUI() { this.loadSeq = (this.loadSeq || 0) + 1; this.dropPending(); this.unloadProject();`

7c. `  doReload() { const s = this.state; this.pendingSel =` → `  doReload() { const s = this.state; this.dropPending(); this.pendingSel =`

- [ ] **Step 8: `approve` e `rollback`**

8a. Em `approve`, substituir
`    this.resetUndo();\n    this.setState(s => ({ modal: { ...s.modal, stage: 'done' }, history: [entry, ...s.history], changes: [] }));`
por
`    this.resetUndo();\n    if (this.state.dir && Object.keys(entry.written).length) this.refreshPendingHash();\n    this.setState(s => ({ modal: { ...s.modal, stage: 'done' }, history: [entry, ...s.history], changes: [] }));`

8b. Em `rollback`, depois da linha
`    if (this.state.dir) for (const f of h.files) { try { await this.writeText(f.path, await this.readText(f.hist)); } catch (e) {} }`
acrescentar:

```js
    if (this.state.dir) this.refreshPendingHash();
```

- [ ] **Step 9: Verificar**

Run: `npm test`
Expected: PASS (nada em `test/` toca `index.html`; o gate aqui é não quebrar o core).

Run: `npm run dev` e abrir `http://localhost:5180/?layers=fixtures/axai/`; DevTools → Console sem erros; DevTools → Application → Local Storage sem `layers/v1/pending` antes de editar.

- [ ] **Step 10: Commit**

```bash
git add index.html
git commit -m "feat(editor): persist pending changes across reloads with source-hash validation (S2.14 Task B)"
```

---

### Task C: E2E de persistência

**Files:**
- Create: `e2e/pending-persist.spec.js`

**Interfaces:**
- Consumes: comportamento da Task B; `readNodes` de `e2e/tree-helpers.js`.

- [ ] **Step 1: Write the spec**

```js
import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S2.14: pending changes survive a reload. Same axai setup as undo-redo.spec.js.
const SHADOW = '0 0 0 3px rgb(1, 2, 3)';
const KEY = 'fx:fixtures/axai';

function shadows() {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  return [...host.shadowRoot.querySelectorAll('*')].filter((e) => e.localName !== 'style').map((e) => e.style.boxShadow);
}
const count = (list, needle) => list.filter((v) => v.includes(needle)).length;

async function open(page) {
  await page.goto('/?layers=fixtures/axai/');
  await readNodes(page);
  await page.locator('[data-node-id][title^=".sum-stat"]').first().click();
  await page.getByText('Só este', { exact: false }).first().click();
}

const field = (page) => page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();

async function typeShadow(page, text) {
  await field(page).click({ clickCount: 3 });
  await page.keyboard.type(text);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
}

async function press(page, combo) {
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press(combo);
  await page.waitForTimeout(200);
}

async function reload(page) {
  await page.reload();
  await readNodes(page);
}

const entry = (page) => page.evaluate((k) => {
  const raw = localStorage.getItem('layers/v1/pending');
  return raw ? (JSON.parse(raw).byProject || {})[k] || null : null;
}, KEY);

test('Reload_PendingEdit_RestoresInlineAndToasts', async ({ page }) => {
  await open(page);
  await typeShadow(page, SHADOW); // 300 ms wait: the reload below lands inside the 400 ms trailing write
  await reload(page);
  expect(count(await page.evaluate(shadows), 'rgb(1, 2, 3)')).toBe(1);
  await expect(page.getByText('1 ajuste(s) restaurado(s)')).toBeVisible();
  expect((await entry(page)).changes).toHaveLength(1);
});

test('Reload_UndoneToEmpty_RestoresNothing', async ({ page }) => {
  await open(page);
  await typeShadow(page, SHADOW);
  await press(page, 'Control+z');
  await page.waitForTimeout(600); // let the trailing write remove the entry
  await reload(page);
  expect(count(await page.evaluate(shadows), 'rgb(1, 2, 3)')).toBe(0);
  await expect(page.getByText('restaurado(s)')).toHaveCount(0);
  expect(await entry(page)).toBeNull();
});

test('Reload_SourceChanged_DiscardsAndWarns', async ({ page }) => {
  await open(page);
  await typeShadow(page, SHADOW);
  await page.waitForTimeout(600);
  await page.route('**/fixtures/axai/wwwroot/index.html', async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, body: (await res.text()) + '\n<!-- changed -->' });
  });
  await reload(page);
  expect(count(await page.evaluate(shadows), 'rgb(1, 2, 3)')).toBe(0);
  await expect(page.getByText('1 ajuste(s) salvo(s) descartado(s)')).toBeVisible();
  await page.waitForTimeout(600);
  expect(await entry(page)).toBeNull();
  await reload(page); // the entry is gone: no second warning
  await expect(page.getByText('descartado(s)')).toHaveCount(0);
});
```

- [ ] **Step 2: Run the spec**

Run: `npx playwright test e2e/pending-persist.spec.js`
Expected: 3 passed. Se `getByText` do toast falhar por texto, abrir o toast no navegador e ajustar a string à de `pendNote` (Task B passo 5), que é a fonte.

- [ ] **Step 3: Verificação manual dos casos sem rota determinística**

1. `npm run dev`, abrir `http://localhost:5180/?layers=fixtures/traval/`, selecionar um nó e aplicar `display: none` pelo painel; recarregar: o nó continua oculto e o toast cita `1 ajuste(s) restaurado(s)`.
2. Com o mesmo ajuste pendente, bloquear uma folha `.css` da fixture pelo DevTools (Network request blocking) e recarregar: toast cita `ajustes salvos mantidos: fonte não lida`; desbloquear e recarregar: o ajuste volta.
3. Ciclo de vida (casos da spec sem E2E automatizado), cada um com a fixture `axai` e um ajuste `box-shadow` pendente:
   - editar e, em menos de 400 ms, abrir outro projeto pelo menu Projetos e voltar: a edição está lá;
   - abrir o demo e depois uma pasta local: a entrada grava na chave `folder:<nome>` (DevTools → Local Storage);
   - `cancelAll` e "Aplicar nos arquivos" removem a entrada;
   - "Aplicar", editar de novo e recarregar: o ajuste novo volta (hash recalculado);
   - editar e confirmar "Recarregar" (R) em seguida: nada volta;
   - duas abas no mesmo projeto, uma só orbitando a câmera: a entrada da outra não some.

- [ ] **Step 4: Commit**

```bash
git add e2e/pending-persist.spec.js
git commit -m "test(e2e): pending changes survive reload, undo-to-empty and source change (S2.14 Task C)"
```

---

### Task D: Docs e fragmento de changelog

**Files:**
- Modify: `docs/ARCHITECTURE.md` (§ Estado, § Persistência), `docs/RELEASE-CHECKLIST.md` (item B L28), `docs/roadmap.md` (linha S2.14), `docs/superpowers/specs/2026-10-14-s2-14-pending-persist-design.md` (algoritmo e semente)
- Create: `changelog.d/feature-261014-0-s2-14-pending-persist.md`

- [ ] **Step 1: ARCHITECTURE**

Em `docs/ARCHITECTURE.md`, § Estado, na linha que começa com `- Edição:`, acrescentar ao fim: ` Os ajustes pendentes (`changes`) também vão para `layers/v1/pending` e voltam em `loadProject` (§ Persistência).`

Em § Persistência, na tabela, depois da linha de `layers/v1/session`, inserir:

```markdown
| `localStorage` | `layers/v1/pending` | `{schema:1, byProject:{<chave>:{savedAt, hash, changes[]}}}`. `<chave>` = `projectId` (`folder:`/`zip:`/`repo:`) ou `fx:<fixtureBase>`. `hash` cobre `layers.json`, mock, folhas `.css` e `dcSource` lidos em `loadProject`; hash igual restaura tudo na ordem, hash diferente descarta tudo com toast `warn`. Teto de 200 changes e expiração de 30 dias. |
```

E, depois do parágrafo que termina em `…morreria com a página.`, acrescentar o parágrafo:

```markdown
Ajustes pendentes: a gravação segue a identidade de `state.changes` (não a assinatura de `ui`),
com `pendingDirty`, para que uma aba ociosa nunca regrave a entrada de outra. `loadProject`
drena a rajada pendente antes de recalcular `pendingKey`, restaura só na carga vencedora e, se
uma fonte falhou na leitura, preserva a entrada sem restaurar. `doReload` confirmado e
`resetUI` limpam a entrada; `approve`/`rollback` recalculam o hash da sessão.
```

- [ ] **Step 2: RELEASE-CHECKLIST**

Em `docs/RELEASE-CHECKLIST.md` L28, trocar o início `- [ ] Persistência de `changes` pendentes entre reloads (com aviso ao reabrir).` por `- [x] Persistência de `changes` pendentes entre reloads (com aviso ao reabrir): `layers/v1/pending`, validade por hash das fontes (tudo-ou-nada), toast de restaurados/descartados; `e2e/pending-persist.spec.js`.` e remover o restante da linha ("A fatia 4 persistiu … decisão própria.").

- [ ] **Step 3: Spec — duas correções de fidelidade**

Em `docs/superpowers/specs/2026-10-14-s2-14-pending-persist-design.md`:
- trocar `Hash não criptográfico (FNV-1a 53 bits) sobre a lista de strings, com separador entre elas.` por `Hash não criptográfico de 53 bits (cyrb53, base 36) sobre a lista de partes; cada parte entra com tipo e comprimento, e `null` difere de `''`.`
- trocar `semeia `pendingSig` com a assinatura da entrada lida (ou vazia se `null`) e `pendingDirty = false`` por `semeia `pendingSeen` com o array restaurado (identidade de `state.changes`) e `pendingDirty = dropped > 0``.

- [ ] **Step 4: Fragmento de changelog**

Criar `changelog.d/feature-261014-0-s2-14-pending-persist.md`:

```markdown
---
adr: none
---

### Added
- Ajustes pendentes sobrevivem a recarregar a página ou reabrir o projeto: `changes[]` é gravado em `layers/v1/pending` (por projeto, teto de 200, expira em 30 dias) e volta ao preview com toast. A validade é tudo-ou-nada por hash de `layers.json`, mock, `.css` e `dcSource`; fonte diferente descarta com aviso, fonte que falhou na leitura preserva a entrada. `LayersCore.sourceHash`, `restorePlan`, `getPending` e `setPending` (puros, testados). Fora: pilha de undo/redo e rascunho de código.
- `e2e/pending-persist.spec.js`: restauração após reload, desfazer até vazio e fonte alterada.

### Perf
- N/A — um `JSON.stringify` de `changes[]` por rajada de 400 ms e um hash linear das fontes já lidas por carga; nada no caminho de câmera (estimado).
```

- [ ] **Step 5: Roadmap e tracker**

Em `docs/roadmap.md`, a linha da S2.14 passa a `… | [](superpowers/specs/2026-10-14-s2-14-pending-persist-design.md) | [](superpowers/plans/2026-10-14-s2-14-pending-persist.md) | [](../changelog.d/feature-261014-0-s2-14-pending-persist.md) | — | done |`.

Run: `python ~/.claude/design/_build_proto.py C:/Development/Layers`
Expected: `phases: … leaves: 58`; `docs/roadmap.data.json` com S2.14 `done`.

- [ ] **Step 6: Verificar e commitar**

Run: `npm test`
Expected: PASS.

```bash
git add docs changelog.d
git commit -m "docs: close S2.14 with changelog fragment, checklist and architecture (S2.14 Task D)"
```

---

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| A. funções puras + Vitest | gen | Standard | Workhorse | lógica nova com testes; ES5 estrito |
| B. integração em `index.html` | gen | Standard | Workhorse | ciclo de vida com `loadSeq` e corridas; revisão logo abaixo |
| B. revisão da integração | review | Architectural | Architect | risco de perda de dado (rule 5) |
| C. E2E | gen | Standard | Workhorse | autoria de teste (exclusão da regra 7) |
| D. docs e changelog | gen | Standard | Workhorse | prosa de documentação |
| Pre-merge review | review | Architectural | Architect | verifier ≥ generator |

Executor: none — todas as tarefas exigem julgamento (código novo, teste ou prosa).

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — decidido no plano de design aprovado (leaf única no roadmap; S2.12 e S2.13 sem issue).

> [!DECISION] phase-intake
> Classification: **meso** `S2.14` under **S2 Loader de projeto**, target **Unreleased**; leaf já `in-progress`.
> Fork of an existing row? **No**.

> [!DECISION] execution
> Method: **Native** recomendado (4 tarefas encadeadas por nomes de interface, mudança concentrada em um arquivo), com a revisão Architect da Task B e a revisão pré-merge. Alternativa: **Subagent-driven**, um subagente por tarefa.
