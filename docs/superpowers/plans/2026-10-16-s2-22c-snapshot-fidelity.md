---
title: "S2.22c — Fidelidade do snapshot: tema, canvas e rótulo de L0"
type: plan
solution: Layers
status: draft
created: 2026-10-16
---

# S2.22c — Fidelidade do snapshot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** O mock de snapshot passa a carregar o tema do `<html>` (G7), os `<canvas>` como imagem congelada sinalizada (G8) e um L0 com rótulo coerente, sem `.shell` duplicado (G12).

**Architecture:** `tools/layers-snapshot.js` copia os atributos de `<html>` e troca cada `<canvas>` por `<img data:>` marcado com `data-layers-frozen="canvas"`. O loader filtra os atributos de `<html>` por allowlist (`LayersCore.hostAttrsFromHtml`), aplica ao host do shadow root e reescreve `:root[...]`/`html[...]` como `:host([...])` em `scopeAst`. Para mock de snapshot, L0 vira `<nome> · snapshot` e `root.name`/`root.src` do manifesto vão para o descendente que casa o seletor.

**Tech Stack:** JS puro, Vitest, Playwright.

**Spec:** [design S2.22](../specs/2026-10-16-s2-22-loader-checkchanges-design.md) § Decisões da S2.22c (D1 A, D2 A, D3 A; G7 tema, G8 canvas, G12 L0). Mockup: canvas Design https://claude.ai/artifact/YAjnzs8CsEDpSbwpn5CCuJ.

## Global Constraints

- Visual congelado: só entram o selo `IMG` na linha da árvore e o sufixo `· snapshot` no nome de L0; nenhuma cor, fonte ou espaçamento novo. `SELECTS` não muda (D3 A), só o comentário de `index.html:942`.
- `support.js` intocado; sem requisição externa; escrita só por `writeInto`/`writeText`.
- O Layers continua sem executar código do alvo: `<img data:>` e atributos de `<html>` filtrados; `url(`, `expression`, `@import` e `javascript:` nunca chegam ao host.
- `index.html`: âncoras únicas, contagem de matches antes de substituir.
- Nomes de teste `Metodo_Cenario_Esperado`; `npm test` verde antes de cada commit; commits EN, trailer de sessão, sem `Co-Authored-By`.
- Fragmento `changelog.d/feature-261016-62-s2-22c-snapshot-fidelity.md` com `### Perf` (≥20 caracteres).
- Teto do snapshot: `<canvas>` com mais de 4 000 000 px (`width*height`) ou data URL acima de 1 500 000 caracteres fica como `<canvas>` vazio e o script imprime `console.warn`.

## Review Focus

- `<html>` sem atributos (snapshot antigo) ou com `style` que traz `url(`/`expression`: host fica limpo, só variáveis `--*` seguras passam.
- Trocar de estado (S2.22b) de um mock com `data-theme` para um sem: o host perde o atributo e as variáveis.
- `:root`/`html` sozinhos, `html .x` e `*` mantêm o escopo atual; só o composto com atributo, classe ou pseudo vira `:host(...)`.
- `<canvas>` tainted (`toDataURL` lança), de 0 px ou acima do teto: o snapshot não aborta, o canvas fica no lugar.
- `root.name` que não casa nenhum descendente, ou projeto que não é snapshot: comportamento atual, L0 recebe o nome.

## Design: Architecture & Flows

```
app alvo (gallery.html#/<estado>)
   │ tools/layers-snapshot.js
   │   <html lang data-theme style>  ──▶ <html …mesmos atributos…> no mock
   │   <canvas>                      ──▶ <img data:image/png data-layers-frozen="canvas" id class style w h>
   ▼
layers/mock.<estado>.html
   │ buildProjectFromHtml
   │   hostAttrsFromHtml(doc.documentElement.attributes) ──▶ { attrs, vars }
   │   scopeAst: :root[data-theme='light'] ─▶ :host([data-theme='light'])
   │   snapMock: L0 = "#app · snapshot"; man.root.{name,src} ─▶ querySelector(man.root.name) (.shell em L1)
   ▼
loadProject: applyHostAttrs(host, hostAttrs) ─▶ shadow root ─▶ scan: node.frozen, node.capture ─▶ árvore
```

### Mockup: árvore de camadas (novo/alterado)

```
┌ Hierarquia ──────────────────────────────────────┐
│ ▾ #app · snapshot                         L0 (1) │ <-- NOVO sufixo, title = captura (URL · data · viewport)
│   ▾ .shell                                L1 (3) │ <-- recebe root.name/root.src
│     · img                         IMG  ●  L2     │ <-- NOVO selo IMG, title "Imagem congelada: …"
└──────────────────────────────────────────────────┘
```

## Implementation Outline

- **Task 1** — `hostAttrsFromHtml` e `scopeAst` com `:host(...)` + testes.
- **Task 2** — snapshot: atributos de `<html>` e `<canvas>` → `<img data:>` + E2E do CLI.
- **Task 3** — loader: host, rótulo de L0, `root.*`, selo `IMG`, fixture e E2E.
- **Task 4** — docs, changelog e roadmap.

## Critical Files

`lib/layers-core.js` (`scopeAst` ~242, helper novo junto de `snapshotOriginCovered` ~570), `test/layers-core.test.js`, `tools/layers-snapshot.js`, `e2e/snapshot-cli.spec.js`, `index.html` (`buildProjectFromHtml` 984-1067, `loadProject` ~1297, `unloadProject` ~1346, `scan` ~1702, linhas de árvore ~2174 e ~2207, `SELECTS` 942), `fixtures/snap-fidelity/`, `e2e/snap-fidelity.spec.js`, `docs/layers-json.md`, `docs/ARCHITECTURE.md`, `docs/RELEASE-CHECKLIST.md`.

### Task 1: Helpers puros

**Files:**
- Modify: `lib/layers-core.js` (`scopeAst` e helper novo, exportado no objeto público junto de `scopeAst`)
- Test: `test/layers-core.test.js`

**Interfaces:**
- Produces: `LayersCore.hostAttrsFromHtml(attrs: Array<{name: string, value: string}>): { attrs: Array<{name, value}>, vars: Array<{name, value}> }`.
- Produces: `scopeAst(text, rootClass)` mantém a assinatura; `:root` ou `html` seguidos, no mesmo composto, de atributo, classe ou pseudo viram `:host(<composto>)`.

- [ ] **Step 1: Escrever os testes que falham**

Em `test/layers-core.test.js`, `describe('ScopeAst')` (ou o existente do `scopeAst`):
  - `ScopeAst_RootComAtributo_EmiteHostFuncional`: `:root[data-theme='light'] .a{x:1}` contém `:host([data-theme='light']) .a` e não contém `:host[`.
  - `ScopeAst_HtmlComAtributoEClasse_EmiteHostFuncional`: `html[data-theme=dark] .b{x:1}` contém `:host([data-theme=dark]) .b`; `:root.dark{x:1}` contém `:host(.dark)`.
  - `ScopeAst_RootEHtmlSimples_MantemEscopoAtual`: `:root{--c:red}` → `:host{--c:red}`; `html{x:1}` e `html .x{x:1}` continuam `.__layers-root`.

`describe('HostAttrsFromHtml')`:
  - `HostAttrsFromHtml_AllowlistDeAtributos_MantemDataLangDir`: entrada `data-theme=light`, `lang=pt-BR`, `dir=ltr`, `class=x`, `onclick=a()`, `data-src=y`, `data-layers-frozen=z`, `id=i` → `attrs` só com `data-theme`, `lang`, `dir`.
  - `HostAttrsFromHtml_StyleComUrlOuExpression_DescartaADeclaracao`: `style="--a:#fff;--b:url(http://x/y);--c: expression(1);color:red"` → `vars` = `[{name:'--a',value:'#fff'}]`.
  - `HostAttrsFromHtml_SemAtributos_DevolveListasVazias`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run test/layers-core.test.js -t "ScopeAst|HostAttrsFromHtml"`
Expected: FAIL (`hostAttrsFromHtml is not a function`; `:host[` presente).

- [ ] **Step 3: Implementar `hostAttrsFromHtml` e o composto `:host(...)` em `scopeAst`**

`hostAttrsFromHtml`: allowlist `data-*` (exceto `data-src`, `data-name`, `data-layers-*`), `lang`, `dir`; `style` vira `vars` (divide por `;`, mantém só `--nome: valor`, descarta valor com `url(`, `expression`, `@import`, `javascript:` ou `\`). `scopeAst`: ao encontrar `:root` (sem filhos) ou `TypeSelector html` seguido de `AttributeSelector`/`ClassSelector`/`PseudoClassSelector` antes do próximo `Combinator`, emitir `:host(` + texto cru dos seguintes + `)` e consumi-los; sem seguintes, o comportamento atual.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS, nenhuma regressão nos testes de `scopeAst` existentes.

- [ ] **Step 5: Commit**

```bash
git add lib/layers-core.js test/layers-core.test.js
git commit -m "feat: scope root-with-attribute selectors to :host() and filter <html> attributes (S2.22c)"
```

### Task 2: Snapshot — atributos de `<html>` e `<canvas>`

**Files:**
- Modify: `tools/layers-snapshot.js`
- Test: `e2e/snapshot-cli.spec.js`

**Interfaces:**
- Produces: mock com `<html lang="…" [mesmos atributos do <html> vivo, exceto lang]>` e cada `<canvas>` trocado por `<img src="data:image/png;base64,…" data-layers-frozen="canvas">` mantendo `id`, `class`, `style`, `width`, `height`.

- [ ] **Step 1: Escrever o teste E2E que falha**

Em `e2e/snapshot-cli.spec.js`, novo teste `Snapshot_HtmlAttrsAndCanvas_AreCarriedIntoTheMock` com app falso próprio (mesmo padrão do primeiro teste): `<html data-theme="light" style="--bg-base:#f4f2ed">`, `<canvas id="c" class="chart" width="40" height="20">` desenhado com `fillRect` e `<canvas id="big" width="2100" height="2100">`. Asserções sobre o arquivo: contém `data-theme="light"` e `--bg-base:#f4f2ed` no `<html>`; `<img` com `id="c"`, `class="chart"`, `width="40"`, `data-layers-frozen="canvas"` e `src="data:image/png;base64,`; sem `<canvas id="c"`; `<canvas id="big"` continua (acima de 4 000 000 px) e `r.stderr`/`r.stdout` não derrubam o status 0.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/snapshot-cli.spec.js -g "HtmlAttrsAndCanvas"`
Expected: FAIL (sem `data-theme` no `<html>` do mock).

- [ ] **Step 3: Implementar em `tools/layers-snapshot.js`**

Antes de montar `html`: (a) serializar os atributos de `document.documentElement` (com `esc`) no lugar do `lang` fixo, mantendo `lang` com o default `pt-BR`; (b) para cada `<canvas>` do clone, achar o vivo pelo mesmo índice, pular se `width*height` for 0 ou > 4 000 000, `toDataURL('image/png')` dentro de `try`, pular se o resultado passar de 1 500 000 caracteres, e trocar por `<img>` com os atributos citados. Cada pulo faz `console.warn('LAYERS snapshot: canvas #' + i + ' mantido vazio (' + motivo + ')')`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx playwright test e2e/snapshot-cli.spec.js`
Expected: PASS (o teste antigo continua verde).

- [ ] **Step 5: Commit**

```bash
git add tools/layers-snapshot.js e2e/snapshot-cli.spec.js
git commit -m "feat: snapshot carries <html> attributes and freezes canvases as images (S2.22c)"
```

### Task 3: Loader — host, L0, selo `IMG`

**Files:**
- Modify: `index.html` (âncoras únicas)
- Create: `fixtures/snap-fidelity/layers.json`, `fixtures/snap-fidelity/layers/mock.light.html`, `fixtures/snap-fidelity/layers/mock.plain.html`
- Test: `e2e/snap-fidelity.spec.js`

**Interfaces:**
- Consumes: `LayersCore.hostAttrsFromHtml` (Task 1); marcador `data-layers-frozen="canvas"` (Task 2).
- Produces: `built.hostAttrs = { attrs, vars }` de `buildProjectFromHtml`; método `applyHostAttrs(host, hostAttrs)` do `Component`; campos `frozen: boolean` e `capture: string` nos nós de `scan()`.

- [ ] **Step 1: Criar a fixture e o E2E que falha**

`fixtures/snap-fidelity/layers.json`: `{"name":"Snap fidelity","viewport":{"width":600,"height":300},"mock":"layers/mock.light.html","states":[{"name":"light","mock":"layers/mock.light.html"},{"name":"plain","mock":"layers/mock.plain.html"}],"root":{"name":".shell","src":"src/app.ts|AppShell|1"}}`. `mock.light.html`: comentário `<!-- snapshot LAYERS · http://localhost:5173/gallery.html#/light · 2026-10-16T00:00:00.000Z · viewport 600×300 -->`, `<html lang="pt-BR" data-theme="light" style="--bg-base:#f4f2ed;--evil:url(http://x/y)">`, um `<style data-layers-origin="x">` com `:root{--bg-base:#101114}` e `:root[data-theme='light'] .shell{background:var(--bg-base)}`, corpo `<div id="app"><div class="shell"><img data-layers-frozen="canvas" width="40" height="20" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="><p class="t">Texto</p></div></div>`. `mock.plain.html`: igual sem atributos em `<html>`.

`e2e/snap-fidelity.spec.js` (padrão de `multi-state.spec.js`, `readNodes` de `./tree-helpers.js`), testes:
  - `SnapFidelity_LightHtml_AppliesThemeToHost`: host tem `data-theme="light"`, `getComputedStyle(.shell).backgroundColor` é `rgb(244, 242, 237)`, `--evil` não definida.
  - `SnapFidelity_RootNames_L0SnapshotAndShellInL1`: L0 = `#app · snapshot`, L1 = `.shell` com `data-src` `src/app.ts|AppShell|1`, L0 sem `data-src`.
  - `SnapFidelity_FrozenCanvas_ShowsImgBadgeWithTitle`: a linha do `img` na árvore mostra `IMG` e o `title` contém `Imagem congelada`; o `title` de L0 contém `gallery.html#/light`.
  - `SnapFidelity_SwitchToPlainState_ClearsHostAttrs`: pelo menu Interagir › `plain`, o host perde `data-theme` e a variável.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/snap-fidelity.spec.js`
Expected: FAIL (host sem `data-theme`, L0 chamado `.shell`).

- [ ] **Step 3: Implementar em `index.html`**

  1. `buildProjectFromHtml`: mover `snapMock` (hoje depois do `rootEl`) para antes da nomeação de L0; devolver `hostAttrs: LayersCore.hostAttrsFromHtml([...doc.documentElement.attributes].map(a => ({ name: a.name, value: a.value })))`.
  2. Nomeação (`index.html:1028`): para `snapMock`, calcular o nome automático como hoje e gravar `rootEl.dataset.name = nome + ' · snapshot'`; `rootEl.dataset.layersCapture` recebe o trecho `<url> · <data> · viewport …` do comentário `snapshot LAYERS`. Com `man.root`, o alvo de `name`/`src` é `rootEl.querySelector(man.root.name)` (em `try`; seletor inválido ou sem match cai em `rootEl`); fora de snapshot, comportamento atual.
  3. `loadProject` (logo após o `attachShadow`): `this.applyHostAttrs(host, built.hostAttrs)`; `unloadProject` chama `applyHostAttrs(host, { attrs: [], vars: [] })`. `applyHostAttrs` remove o que aplicou antes (`this.hostApplied`), usa `setAttribute` para `attrs` e `host.style.setProperty` para `vars`, e nunca toca atributos que o host já tinha antes da primeira aplicação.
  4. `scan()`: nó ganha `frozen: el.dataset.layersFrozen === 'canvas'` e `capture: el.dataset.layersCapture || ''`.
  5. Linhas da árvore (Hierarquia ~2174 e Elementos ~2207): `badge` = `'isolado'` se isolado, senão `'●'` (com ` IMG` antes quando `frozen`) se selecionado, senão `'IMG'` quando `frozen`; `title` ganha ` — Imagem congelada: o <canvas> do app virou PNG no snapshot` quando `frozen` e ` — captura: ` + `capture` quando houver.
  6. Comentário de `SELECTS` (`index.html:942`): trocar "o mock é sempre escuro" por "o mock pode ser claro via data-theme no <html> (S2.22c); estes tons seguem valendo".

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` e `npx playwright test e2e/snap-fidelity.spec.js e2e/multi-state.spec.js e2e/tree-snapshot.spec.js`
Expected: PASS; sem snapshot de árvore alterado (fixtures existentes não são snapshot de `<html>`).

- [ ] **Step 5: Verificação manual de rede e commit**

DevTools › Network em `localhost:5180` com `?layers=fixtures/snap-fidelity/`: nenhuma requisição fora de `localhost:5180`.

```bash
git add index.html fixtures/snap-fidelity e2e/snap-fidelity.spec.js
git commit -m "feat: apply <html> theme to the host, label snapshot roots and flag frozen canvases (S2.22c)"
```

### Task 4: Docs, changelog e roadmap

**Files:**
- Modify: `docs/layers-json.md`, `docs/ARCHITECTURE.md`, `docs/RELEASE-CHECKLIST.md`, `docs/roadmap.md`, `docs/superpowers/specs/2026-10-16-s2-22-loader-checkchanges-design.md` (nota de que a gallery do Traval precisa de um estado claro, fora deste repo)
- Create: `changelog.d/feature-261016-62-s2-22c-snapshot-fidelity.md`

- [ ] **Step 1: Atualizar os docs**

`layers-json.md`: `root.name`/`root.src` em mock de snapshot vão para o descendente que casa o seletor; L0 leva o sufixo `· snapshot`. `ARCHITECTURE.md`: fluxo do snapshot (atributos de `<html>`, canvas congelado, allowlist do host). `RELEASE-CHECKLIST.md`: item marcado com `e2e/snap-fidelity.spec.js` e `e2e/snapshot-cli.spec.js`, mais o item manual do Traval real (rodar o CLI e conferir tema e gráficos).

- [ ] **Step 2: Fragmento de changelog**

`changelog.d/feature-261016-62-s2-22c-snapshot-fidelity.md` no formato do fragmento da S2.22b: `adr: none`, `### Added` (atributos de `<html>`, canvas congelado com selo `IMG`, `L0 · snapshot`), `### Fixed` (`:root[data-theme]` virava `:host[data-theme]`; `.shell` duplicado em L0 e L1), `### Perf` (≥20 caracteres, `N/A` com motivo).

- [ ] **Step 3: Fechar a leaf**

`docs/roadmap.md`: S2.22c com `plan` linkado e status `done`; reconstruir o tracker: `python ~/.claude/design/_build_proto.py .`

- [ ] **Step 4: Rodar e commitar**

Run: `npm test`
Expected: PASS.

```bash
git add docs changelog.d
git commit -m "docs: close S2.22c in the tracker (S2.22c)"
```

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| Task 1, 2, 3. loader, snapshot e testes | gen | Standard | Workhorse | julgamento e autoria de testes |
| Task 4. docs, changelog e roadmap | gen | Standard | Workhorse | prosa de docs |
| Pre-merge review | review | Architectural | Architect | verificador ≥ gerador |

Executor: none — toda tarefa exige julgamento ou autoria de testes.

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — já coberto pela issue #62 (S2.22); nenhuma issue nova.

> [!DECISION] phase-intake
> Classification: **micro** `S2.22c` sob **S2.22**, alvo **Unreleased**.
> Fork of an existing row? **No**.
> - **Option A**: branch própria `feature/261016-62-s2-22c-snapshot-fidelity` (aplicada: a S2.22b já foi mesclada no PR #64)

> [!DECISION] execution
> Method: **Inline** (4 tarefas sequenciais que tocam `index.html` e o mesmo fluxo de snapshot).
