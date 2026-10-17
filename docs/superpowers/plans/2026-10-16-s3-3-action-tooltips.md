---
title: "S3.3 — Tooltips ação e atalho (registro único de ações)"
type: plan
solution: Layers
status: draft
created: 2026-10-16
---

# S3.3 — Tooltips ação e atalho (registro único de ações) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** todo botão de ação sem texto visível, e todo botão (com ou sem texto) que tem atalho, mostra no `title` nativo o nome da ação e, se houver, a tecla, no formato que já existe: `Ação (K)`. O gatilho "Ações ▾" ganha um `title` próprio, como os outros 3 gatilhos de menu. O nome e a tecla vêm de um registro único em `lib/layers-core.js`, que também alimenta o painel `?` e o `onKey`, fecha as divergências `M` e `=` e dá à S7.4 uma fonte única para guardar `docs/shortcuts.md`. Fecha o item C "Tooltips" do [checklist de release](../../RELEASE-CHECKLIST.md), com o texto corrigido para o formato decidido.

**Architecture:** `LayersCore.ACTIONS` (id, rótulo, teclas, dica, escopo), `LayersCore.SHORTCUTS` (a tabela do painel `?`, movida de `index.html` sem mudar de forma), `LayersCore.keyAction(key)` (tecla → id) e `LayersCore.tooltip(id, label?)` (texto do `title`, com cache). Em `index.html`, `this.keyRun` (id → função, montado uma vez) troca o literal `map` que hoje é recriado a cada tecla; os `title` existentes passam a vir de `tooltip()` e as lacunas são preenchidas. Só `title` nativo; nenhum componente de tooltip.

**Tech Stack:** JS puro (core em ES5: `var`/`function`), Vitest, Playwright.

**Contexto:** [plano geral da Onda 3](2026-10-16-layers-plano-geral-da-onda-3.md) (decisão D2, ordem S4.7 → S3.3 → S7.4); consumidor do registro: [plano da S7.4](2026-10-16-s7-4-shortcuts-doc.md).

## Global Constraints

- Pré-condição: a branch `docs/261016-0-wave-3-plan` (este plano) já mesclada em `develop`, e a S4.7 (região da árvore) e a S3.4 (menu Aparência) também. Worktree próprio a partir de `origin/develop`, branch `feature/261016-0-s3-3-action-tooltips`, `npm ci` no worktree. Nenhuma cópia `git checkout <ref> -- docs/...`. Nunca commitar em `develop`/`master`.
- Visual congelado: nenhuma cor, tipografia, espaçamento ou tamanho muda. Só atributos `title` e as duas linhas novas do painel `?` (conteúdo, fora do gate visual). `support.js` intocado; nenhum `<script>`/`<link>` novo.
- `index.html`: âncoras de texto, nunca número de linha (S3.4 e S4.7 deslocam o arquivo). Antes de cada substituição, `grep -cF '<âncora>' index.html` e exigir a contagem indicada. Os números de linha deste plano são de `develop@d2d0226` e só orientam.
- Seletores de teste que **não mudam**: `button[title^="Aparência · Fonte"]` (`e2e/menu-visual.spec.js`), `div[title="Arrastar para redimensionar"]` (`e2e/menu-open.spec.js`), `div[title="Recolher / expandir"]` (`index.html:246`; usado pela S4.7 em `e2e/tree-perf-helpers.js`), `[data-node-id][title^="<nome>"]` (`e2e/folder-helpers.js` e 6 specs), as regex de `e2e/snap-fidelity.spec.js`, `button[title="attr inválido"]` (`e2e/attr-action.spec.js`). O `title` da linha da árvore não muda (ver Review Focus); `data-menu="apar"` e o prefixo `Aparência · Fonte` ficam como estão. A S3.3 não edita o gatilho Aparência (`index.html:92`): a colisão com a S3.4 citada em `2026-10-16-s3-4-appearance-source.md:36` não existe (o plano geral `:83` já diz isso).
- O ramo Ctrl/Cmd+Z/Y do `onKey` (antes da guarda de campos, com a exceção `typing`), a guarda `INPUT|TEXTAREA|SELECT`, o teste `!e.ctrlKey && !e.metaKey` e o `preventDefault` só quando há handler ficam **idênticos**.
- Testes `Metodo_Cenario_Esperado` (Vitest: `describe('<Metodo>')` + `it('<Cenario>_<Esperado>')`, como `test/layers-core.test.js`). `npm test` verde antes de cada commit. Commits EN, Conventional Commits terminando em `(S3.3)`, sem `Co-Authored-By`; os comandos de commit deste plano não levam trailer (regra única da Onda 3; o harness acrescenta o que for exigido).
- Nunca `git add bench/results` em bloco (a suíte E2E grava JSON de bench ali): só caminhos explícitos.
- E2E é gate manual. Em worktrees paralelos, envolver cada `npx playwright test` no bloco de trava da [S3.2](2026-10-14-s3-2-menu-open-pattern.md) (§ Global Constraints): a porta 5180 é compartilhada e `reuseExistingServer: true` testaria outro servidor em silêncio.
- **Não editar a linha 8 do checklist** (contador `Hoje: …`): recontagem única na Task E do plano geral.
- Fragmento `changelog.d/feature-261016-0-s3-3-action-tooltips.md` com `### Perf` (≥1 bullet de ≥20 caracteres).

## Review Focus

- **Escopo: Opção A + Ações ▾.** Entram: botões sem texto visível (com ou sem tecla), botões com texto que têm tecla (Fechar dos três modais → Esc; Aplicar do código → Ctrl+Enter; Recarregar do banner → R; Registrar/× do repositório → Enter/Esc no campo; Isolar/Mostrar tudo → Esc sai do isolamento) e o gatilho "Ações ▾". O gatilho e seus 3 itens (`index.html:341`, `:344-346`) estão dentro da `div onClick="{{ toggleAj }}" title="Recolher / expandir"` (`:336`, fecha em `:350`): hoje o hover mostra o nome de outra ação. Um `title` na `div ref="{{ acoesRef }}"` (`:340`), no formato dos outros gatilhos, cobre gatilho e popover. Ficam sem `title` novo, por terem texto e nenhuma tecla: Cancelar, Salvar, ↑ Pai (3 painéis, `:407`/`:475`/`:542`; sem ancestral com `title`, o texto se explica), Descartar. "Todas" (`title="Mostrar todas as camadas"`) e os chips `L0…Ln` (`'Camada L' + d + ' — …'`, `:2212`) mantêm o título atual, sem sufixo de tecla (PgUp/PgDn mudam a camada ativa sem `solo`; é outra ação). Ver o callout "Escopo" abaixo.
- **Linha da árvore sem sufixo.** O `title` da linha (`n.name · L… — clique: selecionar · duplo: isolar`) já descreve as ações de mouse, e nenhuma tecla age sobre a linha apontada. Nada é anexado; os 7 specs que usam `[data-node-id][title^=…]` ficam intactos.
- **Textos que mudam.** Um rótulo por ação unifica F: os 3 botões "⊕ Enquadrar" passam de "Centralizar e ajustar o zoom na seleção (F)" para "Enquadrar seleção: centralizar + zoom (F)" (o do dock). O `▲` do dock perde " · shift: no plano": a nota é falsa nos botões, porque `navBtns` chama `this.pan(0, -40)` sem `mode` (`index.html:2280-2283`) e `pan()` só usa o plano com `mode === 'plane'` (`:1853`); Shift+clique não muda nada. A nota fica só em `SHORTCUTS` e no doc da S7.4; nenhum seletor depende dela. O item Recarregar do menu Projetos passa de "(atalho R)" para "(R)". Os demais `title` migrados saem idênticos.
- **`getByTitle` casa por substring e sem caixa.** `e2e/browser-compat.spec.js:170` chama `getByTitle('Fechar')` com o modal de salvar aberto; com "Fechar (Esc)" no botão do modal, o locator acharia 2 elementos (strict mode). O spec passa a usar `{ exact: true }` (Task 4). `getByRole('button', { name: 'Fechar' | 'Recarregar' })` não muda: o nome acessível vem do texto do botão; o `title` vira descrição. O `title` novo de Ações não contém `Fechar` nem `Ignorar` (os únicos `getByTitle` dos E2E).
- **"Fechar (Esc)" vale com o foco fora de campo.** Nenhum modal usa `autoFocus`; com o cursor no campo de branch ou mensagem do modal de salvar, o Esc fica com o campo (guarda do `onKey`), como hoje. O E2E prova o Esc só no painel `?`.
- **`onKey` derivado, comportamento caracterizado.** `keyAction(key)` repete a resolução de hoje (`map[e.key] || map[lower]`): Shift+Q ainda gira. `keyRun` é montado uma vez em `componentDidMount`; uma ação `global` sem função em `keyRun` loga `console.error('keyRun: …')`, e o E2E exige zero desses erros. Os testes do core (`KeyAction_*`, `KeyMap_*`) e o `KeyRun_Montagem_*` não provam que cada função é a certa: os E2E de hoje só apertam Escape, r, Control+z e ArrowLeft (em `e2e/undo-redo.spec.js:107`/`:117` a seta age num slider, não no handler global). Por isso `e2e/onkey-keys.spec.js` (Task 2 Step 0) caracteriza toda tecla global, verde antes e depois do refactor. Ctrl+Enter, Enter e Esc dos campos continuam nos handlers locais (`key`, `pcKey`, `treeQKey`, `propQKey`, `histRepoKey`): no registro são escopo `local`, só documentação e dica.
- **Contrato com a S7.4.** `SHORTCUTS` mantém a forma `Array<[grupo, Array<[teclas, descrição]>]>`. As teclas do handler saem de `core.ACTIONS.filter((a) => a.scope === 'global').flatMap((a) => a.keys)`, mais `z`/`y` do escopo `ctrl` (a mesma expressão de `handlerKeys` no plano da S7.4). A guarda "toda tecla tratada está no painel" fica **neste** plano (`KeyMap_TeclaComHandler_EstaNoPainel`, endurecida); a S7.4 a cita em vez de manter `Shortcuts_HandlerKeys_AllDocumented`, que não pega a remoção da linha `Esc` de Seleção (a célula `Esc (no campo)` fornece o token `ESC`).
- **Visual.** O `title` nativo não aparece em screenshot, e o painel `?` não está em `MENUS` de `menu-visual.spec.js`. As baselines são geradas na `develop` com S3.4 e S4.7 mescladas, antes de qualquer edição.

## Design: Architecture & Flows

```
lib/layers-core.js
  ACTIONS[] {id,label,keys[],hint,scope}   scope: global | ctrl | local | none
     │            │                      │
     │ keyAction(key) ─▶ id | null       │ tooltip(id, label?) ─▶ "Rótulo (Dica)" | "Rótulo" | ''
     │ (global, exato → minúscula)       │ (cache por id sem label; label sobrepõe o rótulo)
  SHORTCUTS[] [grupo, [[teclas, desc]…]] (painel ?, 53 linhas)
     │                                   │
     ▼                                   ▼
index.html                                index.html
  componentDidMount:                      top-level: const TIP = { … tooltip(…) }  (uma vez)
    this.keyRun = { id: e => … }          render(): nb(glyph, id, go) · measTitle · isoSelTitle
    ACTIONS global sem keyRun ─▶ console.error   · chevTitle · tip* no modelo
    onKey: Ctrl Z/Y (igual) ─▶ guarda campos (igual)      · title estático na div acoesRef
           ─▶ id = keyAction(e.key) ─▶ keyRun[id](e)
  render(): shortcutGroups = LayersCore.SHORTCUTS.map(…)
     │
     ▼
test/layers-core.test.js (Tooltip_*, Shortcuts_*, KeyAction_*, KeyMap_*)
e2e/onkey-keys.spec.js (caracterização)   e2e/tooltips.spec.js   S7.4 cita KeyMap_*
```

## Implementation Outline

- **Task 0** — worktree, abrir a leaf, baselines e recontagem de âncoras.
- **Task 1** — registro no core e testes.
- **Task 2** — caracterização do `onKey`; painel `?` e `onKey` derivados do registro; `M`, `=` e Esc no painel; checagem do Esc no campo.
- **Task 3** — migrar os `title` existentes para `tooltip()`.
- **Task 4** — preencher as lacunas (incluindo Ações ▾) e o E2E.
- **Task 5** — gate visual, regressão, docs, changelog e roadmap.

## Critical Files

`lib/layers-core.js` (registro junto de `MENU_TIMING`/`menuStep` ~:772; exports depois de `menuStep: menuStep,` ~:1493), `test/layers-core.test.js`, `index.html` (`const SHORTCUTS` ~:828-836, `onKey` ~:1609-1619, `pan()` ~:1852-1855, `escape()` ~:1858, campo de propriedade `commit`/`key` ~:2172-2173, `shortcutGroups`/`nb`/`navBtns` ~:2275-2285, `measTitle` ~:2372, `isoLabel` ~:2405, `pushRow` e `elemRows` ~:2217-2254, template ~:69-70, :81, :107, :261, :276, :293, :307, :322, :336-350 (cabeçalho Ajustes e `acoesRef`), :382-552, :581, :702, :726, :743, :781), `e2e/onkey-keys.spec.js` (novo, Task 2), `e2e/tooltips.spec.js` (novo; modelo: `e2e/menu-open.spec.js`), `e2e/browser-compat.spec.js:170`, `docs/RELEASE-CHECKLIST.md` (item C "Tooltips"), `docs/ARCHITECTURE.md` (tabela de componentes, depois da linha "Menus"), `docs/roadmap.md`.

### Task 0: Worktree, leaf, baselines e âncoras

A S3.3 já está registrada: a linha existe em `docs/roadmap.md` (`registered`) e `docs/roadmap.config.json` já lista `S3.3` em `S3`. Este task não adiciona linha nem membro: só liga o plano e marca `in-progress`.

**Files:**
- Modify: `docs/roadmap.md` (linha S3.3), `docs/roadmap.data.json` (rebuild)

- [ ] **Step 1: Worktree sobre a `origin/develop` com S4.7, S3.4 e este plano**

```bash
git fetch origin
git log origin/develop --oneline --grep='(S4.7)' | head -1
git log origin/develop --oneline --grep='(S3.4)' | head -1
git worktree add -b feature/261016-0-s3-3-action-tooltips ../Layers-s3-3 origin/develop
cd ../Layers-s3-3
test -f docs/superpowers/plans/2026-10-16-s3-3-action-tooltips.md
npm ci
```

Expected: cada `git log` imprime um commit e o `test -f` passa (a branch `docs/261016-0-wave-3-plan` já está em `develop`). Sem algum deles, parar (ordem do plano geral); nunca copiar o plano de outra ref.

- [ ] **Step 2: Baselines visuais antes de editar**

Run: `LAYERS_VISUAL=1 npx playwright test e2e/menu-visual.spec.js --update-snapshots`
Expected: baselines locais geradas sobre a `develop` atual (a S3.4 regenera as do menu; as de antes dela não valem).

- [ ] **Step 3: Recontar as âncoras**

```bash
for a in 'const SHORTCUTS = [' 'SHORTCUTS.map(' 'const map = { ArrowLeft' 'const nb = (glyph, title, go, on)' 'measTitle: s.measure ?' 'isoLabel: s.isoId ?' 'title="Atalhos de teclado e mouse (?)"' 'title="Relê do disco os arquivos do projeto (atalho R)"' 'title="Expandir o painel de propriedades (P)"' 'title="Recolher o painel de propriedades (P)"' 'title="Centralizar e ajustar o zoom na seleção (F)"' 'title="Aplicar (Ctrl+Enter)"' 'title="Limpar (Esc)"' '<button onClick="{{ closeShortcuts }}" style=' '<button onClick="{{ closeDiff }}" style=' '<button onClick="{{ closeModal }}" style=' '<button onClick="{{ reloadItem }}" style=' '<button onClick="{{ t.apply }}" style=' '<button onClick="{{ r.apply }}" style=' '<button onClick="{{ t.toggle }}" style=' '<button onClick="{{ r.toggle }}" style=' '<button onClick="{{ isolateSel }}" style=' '<button onClick="{{ histRepoAdd }}" style=' '<button onClick="{{ histRepoCancel }}" style=' '<div ref="{{ acoesRef }}" onPointerEnter=' "isoTitle: isIso ? 'Sair do isolamento'"; do printf '%s => %s\n' "$a" "$(grep -cF "$a" index.html)"; done
grep -rn "SHORTCUTS" --include=*.js --include=*.html --exclude-dir=node_modules --exclude-dir=.claude --exclude-dir=export .
```

Expected (em `develop@d2d0226`): `Recolher o painel… (P)` = 4, `Centralizar e ajustar… (F)` = 3, `Aplicar (Ctrl+Enter)` = 3, `Limpar (Esc)` = 4, `isolateSel` = 3, todas as outras = 1; `SHORTCUTS` só em `index.html`. Contagem diferente (a S4.7 reescreve `pushRow`/`elemRows` e o template das linhas): anotar a âncora nova no relatório antes de editar, nunca substituir às cegas.

- [ ] **Step 4: Abrir a leaf e commitar**

Âncora: `grep -c '^| S3.3 | 2 | S3 | Tooltips ação e atalho | checklist C | — | — | — | — | registered |$' docs/roadmap.md` imprime `1`. Trocar por:

```md
| S3.3 | 2 | S3 | Tooltips ação e atalho | checklist C | — | [](superpowers/plans/2026-10-16-s3-3-action-tooltips.md) | — | — | in-progress |
```

```bash
python ~/.claude/design/_build_proto.py .
npm test
git add docs/roadmap.md docs/roadmap.data.json
git commit -m "docs: open the S3.3 leaf in the tracker (S3.3)"
```

Expected: `npm test` PASS; o diff toca só esses arquivos.

### Task 1: Registro no core

**Files:**
- Modify: `lib/layers-core.js` (bloco novo depois de `menuStep`; exports depois de `menuStep: menuStep,`)
- Test: `test/layers-core.test.js` (`describe('Tooltip')`, `describe('Shortcuts')`)

**Interfaces:**
- Produces: `LayersCore.ACTIONS: Array<{ id: string, label: string, keys: string[], hint?: string, scope: 'global'|'ctrl'|'local'|'none' }>`, `LayersCore.SHORTCUTS: Array<[string, Array<[string, string]>]>`, `LayersCore.keyAction(key: string): string|null`, `LayersCore.tooltip(id: string, label?: string): string`.

- [ ] **Step 1: Escrever os testes que falham**

  - `Tooltip` › `AcaoComAtalho_RetornaAcaoEAtalho`: `tooltip('orbitLeft')` → `'Girar à esquerda (Q)'`; `tooltip('panUp')` → `'Pan para cima (↑)'`; `tooltip('zoomIn')` → `'Zoom + (+)'`; `tooltip('rightPanel', 'Recolher o painel de propriedades')` → `'Recolher o painel de propriedades (P)'`; `tooltip('codeApply')` → `'Aplicar (Ctrl+Enter)'`; `tooltip('escape', 'Fechar')` → `'Fechar (Esc)'`; `tooltip('measure', 'Medidas ligadas')` → `'Medidas ligadas (M)'`.
  - `Tooltip` › `AcaoSemAtalho_RetornaSoAcao`: `tooltip('toggleNode')` → `'Recolher / expandir'`; `tooltip('isolate')` → `'Isolar o ramo da seleção'`; `tooltip('nope')` e `tooltip('nope', 'X')` → `''`.
  - `Shortcuts` › `Registro_SemTeclaDuplicada`: ids únicos em `ACTIONS`; dentro de cada escopo `global` e `ctrl`, nenhuma tecla (em minúscula) em duas ações.
  - `Shortcuts` › `Registro_SemTeclaSemDescricao`: `SHORTCUTS` tem 7 grupos; toda linha tem exatamente 2 strings não vazias e nenhuma célula contém `|`; toda ação tem `label` não vazio; ação `global`/`ctrl`/`local` tem `hint` não vazio; ação `none` não tem `keys` nem `hint`; ação `global`/`ctrl` tem `keys.length ≥ 1`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run test/layers-core.test.js -t "Tooltip|Shortcuts"`
Expected: FAIL (`core.tooltip is not a function`; `core.SHORTCUTS` indefinido).

- [ ] **Step 3: Implementar**

`ACTIONS`, exatamente:

```js
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
```

`SHORTCUTS`: copiar verbatim o array de `index.html` (`const SHORTCUTS = [` até `];`, 7 grupos, 51 linhas) como `var SHORTCUTS = [ … ];` logo abaixo de `ACTIONS`; as linhas novas entram no Task 2.

`keyAction(key)`: índice `KEY_TO_ID` montado uma vez na carga a partir das ações `global`; devolve `KEY_TO_ID[key] || KEY_TO_ID[String(key).toLowerCase()] || null` (com `hasOwnProperty`, para `key` como `'constructor'` não casar).

`tooltip(id, label)`: `BY_ID` e `TIP` (cache) montados na carga; id desconhecido → `''`; sem `label` → `TIP[id]`; com `label` → mesma composição com o rótulo trocado. Composição: `rótulo + (hint ? ' (' + hint + ')' : '')`.

Exports, depois de `menuStep: menuStep,`: `ACTIONS: ACTIONS, SHORTCUTS: SHORTCUTS, keyAction: keyAction, tooltip: tooltip,`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS, sem regressão.

- [ ] **Step 5: Commit**

```bash
git add lib/layers-core.js test/layers-core.test.js
git commit -m "feat: add the action and shortcut registry to the core (S3.3)"
```

### Task 2: Painel `?` e `onKey` derivados do registro

**Files:**
- Modify: `lib/layers-core.js` (`SHORTCUTS`: 2 linhas novas e o texto do Esc), `index.html` (remove `const SHORTCUTS`; `shortcutGroups`; `keyRun`; `onKey`)
- Create: `e2e/onkey-keys.spec.js` (caracterização)
- Test: `test/layers-core.test.js` (`describe('KeyAction')`, `describe('KeyMap')`)

**Interfaces:**
- Consumes: `ACTIONS`, `SHORTCUTS`, `keyAction` (Task 1).
- Produces: `this.keyRun: Record<actionId, (e: KeyboardEvent) => void>` no `Component`, uma função por ação `global`.

- [ ] **Step 0: Caracterização do `onKey`, verde antes do refactor**

Regra "Refactor: tests pass before and after": o spec nasce aqui, com `index.html` ainda intocado (o Task 1 só mexe no core), e roda verde antes e depois do Step 4. As expectativas saem do literal `map` de hoje (`index.html:1613-1616`); verde sobre este estado é a referência da `develop`.

`e2e/onkey-keys.spec.js`, carga como `menu-open.spec.js` (`page.goto('/?layers=fixtures/plain-css/')` + `readNodes`), um teste `OnKey_TeclaGlobal_MesmoEfeitoDoMapa`. Observáveis, sem depender de `title` que o Task 3 muda:
- **palco**: `style.transform` inline da `div` mundo (filha da `div` com `perspective-origin`), lido do atributo, nunca o computado (a transição `.35s` daria valor no meio do caminho); parse de `translate(x, y)`, `scale(k)`, `rotateX(t)`, `rotateY(y)`, `translate3d(…)`. Esperar com `expect.poll` até o valor mudar.
- **chip ativo**: índice do `[title^="Camada L"]` cujo `style.color` é `var(--acc)`.
- **painel direito**: contagem de `div[title^="Arrastar para ampliar o painel"]` (só existe com `rightOpen`).
- **painel `?`**: visibilidade de `getByText('teclado · mouse · painéis', { exact: false })`.
- **medida**: o `title` de `button[title*="(M) — "]` (contagem 1).

Roteiro, cada tecla de palco partindo de `0` (recentrar) e comparando com o estado logo depois do `0`:
1. Logo após a carga (camada ativa 0): `PageUp` → chip ativo +1; `PageDown` → volta ao inicial. PgUp antes de PgDn: de 0, `stepActive(-1)` satura e não prova nada.
2. `ArrowLeft` = `pan(-40, 0)`: `translate` x −40, y igual. `ArrowRight` = `pan(40, 0)`: x +40. `ArrowUp` = `pan(0, -40)`: y −40, x igual. `ArrowDown` = `pan(0, 40)`: y +40. Em todas, `scale`/`rotate*` iguais.
3. `Shift+ArrowUp` (modo `plane`): `translate` igual e `translate3d` diferente (o foco anda). É o caso que quebra se `keyRun` não receber `e`.
4. `q` e `Shift+Q`: `rotateY` −10; `e`: `rotateY` +10; `w`: `rotateX` +10; `s`: `rotateX` −10.
5. `+` e `=`: `scale` × 1,2; `-`: `scale` ÷ 1,2 (tolerância 1e-3).
6. Clique na 2ª linha `[data-node-id]` (seleção), `0`, depois `f`: `transform` diferente; `0`, depois `c`: `scale` igual e `translate3d` diferente.
7. Depois de girar com `q`, `0`: `rotateY`, `rotateX`, `scale` e `translate` iguais aos do primeiro `0`.
8. `m`: o `title` da medida alterna entre "Medidas ligadas (M) — …" e "Medidas desligadas (M) — …"; outra vez, volta. `?`: painel visível; outra vez, oculto. `p`: painel direito some (0); outra vez, volta (1).

Escape e `r` já são cobertos (`e2e/menu-open.spec.js`, `e2e/layout-drift.spec.js:186`).

Run: `npx playwright test e2e/onkey-keys.spec.js`
Expected: PASS sobre o `index.html` de `develop`. FAIL aqui = expectativa errada no spec (corrigir o spec, nunca o app).

- [ ] **Step 1: Escrever os testes que falham**

  - `KeyAction` › `TeclaGlobal_ResolveId`: para cada ação `global` e cada `k` de `keys`, `keyAction(k) === a.id`, e para `k` de uma letra também `keyAction(k.toUpperCase()) === a.id`; `keyAction('x')`, `keyAction('Enter')`, `keyAction('z')` e `keyAction('constructor')` → `null`.
  - `KeyMap` › `TeclaComHandler_EstaNoPainel`: tabela de token igual à da S7.4 (`ArrowLeft→←`, `ArrowRight→→`, `ArrowUp→↑`, `ArrowDown→↓`, `PageUp→PgUp`, `PageDown→PgDn`, `Escape→Esc`, `-→−`; demais = a própria tecla); os tokens do painel são as células de teclas de `SHORTCUTS` divididas por espaço, sem caixa, **excluídas as células que contêm `(`** (`Esc (no campo)`, `{ } (Hierarquia)`, `● ● ● (cores de origem)`: descrevem contexto, não a tecla global); toda tecla de ação `global` e `ctrl` vira um token presente; e existe uma célula de teclas exatamente `Esc`. Mensagem: lista das teclas ausentes. Este é o guarda "toda tecla tratada está documentada" da Onda 3; a S7.4 o cita.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run test/layers-core.test.js -t "KeyAction|KeyMap"`
Expected: FAIL só em `TeclaComHandler_EstaNoPainel`, com `m` e `=` ausentes (nenhuma das células excluídas fornece token exigido).

- [ ] **Step 3: Esc no campo de propriedade e linhas do painel**

Checagem única no navegador (não vira teste): `npm run dev`, `?layers=fixtures/plain-css/`, selecionar um nó, digitar um valor novo num campo de propriedade (localizador de `e2e/undo-redo.spec.js`) e apertar Esc. Conferir o contador do cabeçalho Ajustes (`{{ changeCount }}`, `index.html:339`) e o valor do campo. `SHORTCUTS` diz `['Esc (no campo)','descartar a edição']` (`:833`), mas `:2173` chama `delBuf(k)` e depois `e.target.blur()`; o `commit` do `onBlur` (`:2172`) lê o `s.buf[k]` capturado e roda dentro do mesmo keydown, antes do `setState` do `delBuf`: o valor provavelmente é **aplicado**. Anotar o resultado no relatório. Se aplicado: aplicar o padrão do callout "Esc no campo de propriedade" (texto da linha corrigido + issue); nunca commitar teste que afirma o bug.

Em `SHORTCUTS` (`lib/layers-core.js`):
- Câmera, logo depois de `['+ / −','zoom']`: `['=','zoom + (a mesma tecla do +, sem shift)']`.
- Geral, logo depois de `['?','abrir / fechar este painel']`: `['M','ligar / desligar as medidas no palco']`.
- Seleção, a descrição de `'Esc'` vira `'fechar painel, lista ou menu aberto · sair do isolamento · sair da camada solo · limpar seleção'` (ordem de `escape()`).
- Só se a checagem acima mostrou o valor aplicado: a descrição de `'Esc (no campo)'` deixa de dizer "descartar" e passa a `'sair do campo (o valor digitado é aplicado)'`.

Total: 7 grupos, 53 linhas.

- [ ] **Step 4: `index.html`**

1. Apagar o bloco `const SHORTCUTS = [` … `];` (âncora `const SHORTCUTS = [` = 1). No lugar, a constante de títulos do Task 3 (`const TIP = …`) entra depois; neste task o lugar fica vazio.
2. `const shortcutGroups = SHORTCUTS.map(` → `const shortcutGroups = LayersCore.SHORTCUTS.map(` (âncora `SHORTCUTS.map(` = 1).
3. Em `componentDidMount`, antes de `this.onKey = e => {`, montar `this.keyRun` com as mesmas chamadas do literal `map` de hoje, por id: `panLeft: e => this.pan(-40, 0, e.shiftKey ? 'plane' : 'screen')`, `panRight: e => this.pan(40, 0, e.shiftKey ? 'plane' : 'screen')`, `panUp: e => this.pan(0, -40, e.shiftKey ? 'plane' : 'screen')`, `panDown: e => this.pan(0, 40, e.shiftKey ? 'plane' : 'screen')`, `layerUp: () => this.stepActive(1)`, `layerDown: () => this.stepActive(-1)`, `orbitLeft: () => this.orbit(-10, 0)`, `orbitRight: () => this.orbit(10, 0)`, `tiltUp: () => this.orbit(0, 10)`, `tiltDown: () => this.orbit(0, -10)`, `zoomIn: () => this.zoomBy(1.2)`, `zoomOut: () => this.zoomBy(1 / 1.2)`, `measure: () => this.setState(st => ({ measure: !st.measure }))`, `frame: () => this.frame(this.state.selId)`, `center: () => this.frame(this.state.selId, true)`, `resetView: () => this.resetView()`, `reload: () => this.reloadProject()`, `shortcuts: () => this.setState(st => ({ shortcuts: !st.shortcuts }))`, `rightPanel: () => this.setState(st => ({ rightOpen: !st.rightOpen }))`, `escape: () => this.escape()`. Logo depois: `LayersCore.ACTIONS.forEach(a => { if (a.scope === 'global' && !this.keyRun[a.id]) console.error('keyRun: no handler for ' + a.id); });`.
4. No `onKey`, manter as linhas do `typing`, do Ctrl+Z/Y e da guarda `INPUT|TEXTAREA|SELECT`; trocar `const mode = …; const st = 40;`, o literal `const map = { … };` e a linha `const fn = map[e.key] || …` por: `const id = LayersCore.keyAction(e.key); const fn = id && this.keyRun[id]; if (fn && !e.ctrlKey && !e.metaKey) { e.preventDefault(); fn(e); }` (âncora `const map = { ArrowLeft` = 1).

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test` e `npx playwright test e2e/onkey-keys.spec.js e2e/undo-redo.spec.js e2e/menu-open.spec.js e2e/layout-drift.spec.js`
Expected: PASS (`onkey-keys.spec.js` sem mudança desde o Step 0). `grep -cF 'const SHORTCUTS = [' index.html` e `grep -cF 'const map = {' index.html` → `0`.

- [ ] **Step 6: Commit**

```bash
git add lib/layers-core.js index.html test/layers-core.test.js e2e/onkey-keys.spec.js
git commit -m "refactor: derive the shortcuts panel and onKey from the core registry (S3.3)"
```

- [ ] **Step 7: Prova de vermelho da caracterização**

Trocar temporariamente, em `this.keyRun`, `panUp: e => this.pan(0, -40,` por `panUp: e => this.pan(0, 40,`; rodar `npx playwright test e2e/onkey-keys.spec.js` → FAIL no passo `ArrowUp`. Restaurar com `git checkout -- index.html` (Task 2 já commitada).

### Task 3: Migrar os `title` existentes

**Files:**
- Modify: `index.html`
- Create: `e2e/tooltips.spec.js`

**Interfaces:**
- Consumes: `LayersCore.tooltip` (Task 1).
- Produces: `const TIP` (top-level do script, no lugar do antigo `SHORTCUTS`): `shortcuts`, `reload`, `rightOpen`, `rightClose`, `frame`, `codeApply`, `clear`, `measOn`, `measOff`, `closeEsc`, `isoExit`, `isolate`, `node`, `repoAdd`, `repoCancel` (os 5 últimos usados no Task 4).

- [ ] **Step 1: Escrever o E2E que falha**

`e2e/tooltips.spec.js`, carga como `menu-open.spec.js` (`page.goto('/?layers=fixtures/plain-css/')` + `readNodes` de `./tree-helpers.js`), erros do console coletados por `page.on('console')` registrado **antes** do `page.goto` (o `keyRun` é montado no `componentDidMount`, durante a carga; um listener posto depois não vê o erro):
  - `Tooltip_NavBtns_NomeiaAcaoEAtalho`: ids `orbitLeft, panUp, orbitRight, panLeft, frame, panRight, tiltUp, panDown, tiltDown, zoomOut, center, zoomIn, layerDown, resetView, layerUp`; `tips = page.evaluate(ids => ids.map(id => LayersCore.tooltip(id)), ids)`; os 15 são distintos, cada um casa `/^.+ \(.+\)/`, e `page.locator('button[title="' + tip + '"]:visible').first()` está visível (`:visible` evita cair num "⊕ Enquadrar" oculto; o dock abre por padrão, `navMin: false`).
  - `KeyRun_Montagem_SemAcaoSemHandler`: depois da carga, nenhum erro de console contém `keyRun:`.
  - `Tooltip_TeclaM_AlternaTituloDaMedida`: lê o `title` inicial do botão de medida (`button[title*="(M) — "]`, contagem 1); `page.keyboard.press('m')` → o `title` troca de "Medidas desligadas (M)" para "Medidas ligadas (M)" ou o inverso; outra vez → volta ao inicial. Não supõe o estado padrão.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/tooltips.spec.js`
Expected: FAIL em `Tooltip_NavBtns_NomeiaAcaoEAtalho` só por `Pan para cima (↑)` (o `▲` ainda tem " · shift: no plano"; os outros 14 títulos do dock já casam). As outras duas PASS (o Task 2 já liga `keyRun`; `measTitle` ainda é literal idêntico).

Prova de vermelho do `KeyRun_Montagem_*`: apagar temporariamente a entrada `measure` de `this.keyRun`, rodar `npx playwright test e2e/tooltips.spec.js -g "KeyRun|TeclaM"` → FAIL em `KeyRun_Montagem_SemAcaoSemHandler` (e em `Tooltip_TeclaM_*`, esperado: `m` perde o handler); restaurar com `git checkout -- index.html` (o arquivo está limpo: Task 2 commitada).

- [ ] **Step 3: Implementar**

1. `const TIP = { shortcuts: LayersCore.tooltip('shortcuts'), reload: LayersCore.tooltip('reload'), rightOpen: LayersCore.tooltip('rightPanel', 'Expandir o painel de propriedades'), rightClose: LayersCore.tooltip('rightPanel', 'Recolher o painel de propriedades'), frame: LayersCore.tooltip('frame'), codeApply: LayersCore.tooltip('codeApply'), clear: LayersCore.tooltip('fieldClear'), measOn: LayersCore.tooltip('measure', 'Medidas ligadas') + ' — distâncias entre a seleção e o elemento sob o cursor; sem hover, até o pai', measOff: LayersCore.tooltip('measure', 'Medidas desligadas') + ' — clique para mostrar distâncias no palco', closeEsc: LayersCore.tooltip('escape', 'Fechar'), isoExit: LayersCore.tooltip('escape', 'Sair do isolamento'), isolate: LayersCore.tooltip('isolate'), node: LayersCore.tooltip('toggleNode'), repoAdd: LayersCore.tooltip('fieldEnter', 'Registrar'), repoCancel: LayersCore.tooltip('fieldClear', 'Cancelar') };`
2. `nb`: `const nb = (glyph, title, go, on) => ({ glyph, title, go,` → `const nb = (glyph, id, go, on) => ({ glyph, title: LayersCore.tooltip(id), go,`; nos 15 `nb(…)` de `navBtns`, trocar o texto pelo id (mesma ordem do Step 1).
3. `measTitle: s.measure ? '…' : '…'` → `measTitle: s.measure ? TIP.measOn : TIP.measOff` (sai idêntico).
4. Template, `title` estático → ligação, com a contagem exigida: `title="Atalhos de teclado e mouse (?)"` (1) → `title="{{ tipShortcuts }}"`; `title="Relê do disco os arquivos do projeto (atalho R)"` (1) → `title="{{ tipReload }}"`; `title="Expandir o painel de propriedades (P)"` (1) → `title="{{ tipRightOpen }}"`; `title="Recolher o painel de propriedades (P)"` (4) → `title="{{ tipRightClose }}"`; `title="Centralizar e ajustar o zoom na seleção (F)"` (3) → `title="{{ tipFrame }}"`; `title="Aplicar (Ctrl+Enter)"` (3) → `title="{{ tipCodeApply }}"`; `title="Limpar (Esc)"` (4) → `title="{{ tipClear }}"`.
5. No objeto de modelo do `render()`, junto de `measTitle`: `tipShortcuts: TIP.shortcuts, tipReload: TIP.reload, tipRightOpen: TIP.rightOpen, tipRightClose: TIP.rightClose, tipFrame: TIP.frame, tipCodeApply: TIP.codeApply, tipClear: TIP.clear,` (antes, `grep -c "tipShortcuts\|tipReload\|tipFrame\|tipClear" index.html` = 0).

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` e `npx playwright test e2e/tooltips.spec.js e2e/onkey-keys.spec.js e2e/menu-open.spec.js`
Expected: PASS. `grep -cE 'title="[^"{]*\((\?|P|F|R|Esc|Ctrl\+Enter|atalho R)\)"' index.html` → `0`.

- [ ] **Step 5: Commit**

```bash
git add index.html e2e/tooltips.spec.js
git commit -m "refactor: build existing action titles from the registry (S3.3)"
```

### Task 4: Preencher as lacunas

**Files:**
- Modify: `index.html`, `e2e/tooltips.spec.js`, `e2e/browser-compat.spec.js`

- [ ] **Step 1: Escrever o E2E que falha**

Em `e2e/tooltips.spec.js`:
  - `Tooltip_ControleDeAcao_TemTitleNaoVazio`: varredura de `page.evaluate` que lista os `button` visíveis (`offsetParent !== null`) cujo texto aparado casa `/^[^\p{L}\p{N}]*$/u` (só glifo ou vazio) e não é valor de dropdown (texto com mais de 1 caractere terminado em `▾`), e cujo título efetivo é vazio; espera `[]` (mensagem: o `outerHTML` cortado em 80). Título efetivo: dentro de `[data-node-id]` (linha da árvore), só o `title` do próprio botão, porque o `title` da linha cobriria um chevron sem título; fora das linhas, `closest('[title]')` (cobre os chevrons de cabeçalho `▾`/`▸` de Árvore e Ajustes, cujo `title` está na `div` pai). A varredura roda em cada estado:
    1. Carga + clique na 2ª linha `[data-node-id]` (seleção com painel aberto).
    2. `page.keyboard.press('?')`: o botão Fechar do painel `?` (`getByRole('button', { name: 'Fechar' })` dentro do painel) tem `title` `Fechar (Esc)`, e `Escape` fecha o painel.
    3. Projetos aberto (`[data-menu="hist"]`) → "Registrar repositório GitHub…" (`histRepoStart`, `index.html:76`; abre o campo, `histAdding`): Registrar (`histRepoAdd`) tem `title` `Registrar (Enter)` e × (`histRepoCancel`) tem `Cancelar (Esc)`; × fecha o campo.
    4. Uma edição de propriedade (localizador de `e2e/undo-redo.spec.js`), depois Ações ▾ → "Ver diff": o Fechar do diff (`closeDiff`) tem `Fechar (Esc)`; fechar. Ações ▾ → "Aplicar nos arquivos…" (padrão de `e2e/browser-compat.spec.js:150-153`): o Fechar do modal (`closeModal`) tem `Fechar (Esc)`; fechar.
  - `Tooltip_GatilhoAcoes_TemTituloProprio`: o título efetivo de `button[data-menu="acoes"]` (`closest('[title]').title`) é `Ver diff · aplicar nos arquivos · exportar — passe o mouse para abrir · clique para fixar`, e não `Recolher / expandir`. O gatilho tem texto e sai do filtro de glifo; sem esta asserção, o `closest('[title]')` aceitaria o título herdado do cabeçalho Ajustes.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/tooltips.spec.js -g "ControleDeAcao|GatilhoAcoes"`
Expected: FAIL em `ControleDeAcao` listando os chevrons `▾`/`▸`/`·` das linhas da árvore (sem `title` próprio; hoje herdam o da linha) e o Fechar do painel `?` sem `title` (a varredura para no primeiro estado que falha); FAIL em `GatilhoAcoes` com `Recolher / expandir`.

- [ ] **Step 3: Implementar**

Template, inserindo ` title="{{ … }}"` logo depois do `onClick` (contagem exigida):
- `<button onClick="{{ closeShortcuts }}" style=` (1), `<button onClick="{{ closeDiff }}" style=` (1), `<button onClick="{{ closeModal }}" style=` (1) → `title="{{ tipCloseEsc }}"`.
- `<button onClick="{{ reloadItem }}" style=` (1, botão Recarregar do banner) → `title="{{ tipReload }}"`.
- `<button onClick="{{ t.apply }}" style=` (1) e `<button onClick="{{ r.apply }}" style=` (1) → `title="{{ tipCodeApply }}"`.
- `<button onClick="{{ histRepoAdd }}" style=` (1) → `title="{{ tipRepoAdd }}"`; `<button onClick="{{ histRepoCancel }}" style=` (1) → `title="{{ tipRepoCancel }}"`.
- `<button onClick="{{ isolateSel }}" style=` (3) → `title="{{ isoSelTitle }}"`.
- `<button onClick="{{ t.toggle }}" style=` (1) → `title="{{ t.chevTitle }}"`; `<button onClick="{{ r.toggle }}" style=` (1) → `title="{{ r.chevTitle }}"`.

Gatilho Ações, `title` estático como o dos outros gatilhos (`index.html:92`, `:166`): `<div ref="{{ acoesRef }}" onPointerEnter=` (1) → `<div ref="{{ acoesRef }}" title="Ver diff · aplicar nos arquivos · exportar — passe o mouse para abrir · clique para fixar" onPointerEnter=`. Um atributo cobre gatilho e popover; sem efeito visual.

Modelo:
- Objeto do `render()`: `tipCloseEsc: TIP.closeEsc, tipRepoAdd: TIP.repoAdd, tipRepoCancel: TIP.repoCancel, isoSelTitle: s.isoId ? TIP.isoExit : TIP.isolate,` (antes, `grep -c "isoSelTitle\|tipCloseEsc" index.html` = 0).
- `pushRow` (Hierarquia): `chevTitle: kids.length ? TIP.node : 'Nada para expandir'`; `isoTitle: isIso ? 'Sair do isolamento' :` → `isoTitle: isIso ? TIP.isoExit :`. Na S4.7, `pushRow` monta cada linha por `remake(isSel, isHov)` (plano da S4.7, `:392`): pôr os dois campos no objeto que `remake` devolve. `chevTitle` e `isoTitle` dependem só de `kids` (de `nodes`) e de `isoId`, que estão na chave estrutural do memo; nenhuma chave nova.
- `elemRows`: linha de arquivo e de regra `chevTitle: TIP.node`; linha de uso (`chev: '·'`) `chevTitle: 'Nada para expandir'`. Se a S4.7 trocou a estrutura dessas linhas, pôr `chevTitle` onde o objeto de linha com `chev` é montado, e conferir que toda linha que renderiza `t.toggle`/`r.toggle` o recebe (nunca `title=""`: título vazio esconde o `title` da linha).
- O `title` da linha da árvore (`title: n.name + ' · L' + …`) não muda.

`e2e/browser-compat.spec.js`: `await page.getByTitle('Fechar').click();` (1) → `await page.getByTitle('Fechar', { exact: true }).click();`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` e `npx playwright test e2e/tooltips.spec.js e2e/onkey-keys.spec.js e2e/browser-compat.spec.js e2e/apply-flow.spec.js e2e/layout-drift.spec.js e2e/snapshot-dedupe.spec.js e2e/menu-open.spec.js e2e/tree-rows.spec.js e2e/virtual-tree.spec.js` (os dois últimos são da S4.7; se o plano mesclado deu outros nomes, usar os dele)
Expected: PASS. Se o `evaluate` listar um botão só de glifo fora desta lista, decidir pelo D2: ação sem texto → `title` via `TIP`; valor exibido (não ação) → excluir no filtro com o motivo em comentário, e anotar no relatório.

- [ ] **Step 5: Commit**

```bash
git add index.html e2e/tooltips.spec.js e2e/browser-compat.spec.js
git commit -m "feat: name the action and key on every glyph-only and keyed button (S3.3)"
```

### Task 5: Gate visual, regressão, docs e roadmap

**Files:**
- Modify: `docs/RELEASE-CHECKLIST.md` (item C "Tooltips"), `docs/ARCHITECTURE.md` (tabela de componentes), `docs/roadmap.md`, `docs/roadmap.data.json`
- Create: `changelog.d/feature-261016-0-s3-3-action-tooltips.md`

- [ ] **Step 1: Gate visual e regressão**

Run: `LAYERS_VISUAL=1 npx playwright test e2e/menu-visual.spec.js` e depois `npx playwright test`
Expected: diff 0 em todas as capturas (baselines do Task 0 Step 2); suíte E2E inteira PASS (o `test.fail` de `perf.spec.js` segue como a S4.8/S4.7 deixaram). Os JSON que a suíte grava em `bench/results/` não entram em commit desta leaf.

- [ ] **Step 2: Docs**

- `docs/RELEASE-CHECKLIST.md`: âncora `grep -c '^- \[ \] Tooltips "ação · atalho" no dock e na árvore\.$' docs/RELEASE-CHECKLIST.md` = 1; trocar por `- [x] Tooltips "Ação (atalho)" nos botões de ação sem texto visível e nos que têm atalho (dock, painéis, modais e árvore) e um \`title\` próprio no gatilho "Ações ▾"; botões com texto e sem tecla (Salvar, Cancelar, Descartar, ↑ Pai) ficam sem \`title\` novo, e "Todas" e os chips \`L0…Ln\` mantêm o título atual; nome e tecla vêm do registro único \`LayersCore.ACTIONS\` (\`tooltip(id)\`), que também gera o painel \`?\` e o \`onKey\` (\`e2e/tooltips.spec.js\`, \`e2e/onkey-keys.spec.js\`).` A linha 8 não muda.
- `docs/ARCHITECTURE.md`: nova linha na tabela de componentes, logo depois da linha "Menus (Projetos, Aparência, Interagir, Ações)…": `| \`LayersCore.ACTIONS\`, \`SHORTCUTS\`, \`keyAction\`, \`tooltip\`; \`keyRun\`, \`onKey\` | Registro único de ações e atalhos (S3.3). \`ACTIONS\` dá rótulo, teclas e escopo (\`global\` no \`onKey\`, \`ctrl\` no ramo Ctrl/Cmd, \`local\` nos campos, \`none\` sem tecla); \`keyAction\` resolve a tecla e \`keyRun\` (montado uma vez) executa; \`SHORTCUTS\` é a tabela do painel \`?\`; \`tooltip(id)\` gera o \`title\` "Ação (K)". |`

- [ ] **Step 3: Changelog e leaf**

`changelog.d/feature-261016-0-s3-3-action-tooltips.md` no formato do da S3.2 (`adr: none`):
- `### Added`: `title` "Ação (K)" nos chevrons da árvore, nos Fechar dos modais, no Recarregar do banner, no Aplicar do código, no Registrar/× do repositório e no Isolar; `title` próprio no gatilho "Ações ▾" (antes herdava "Recolher / expandir"); registro `LayersCore.ACTIONS`/`SHORTCUTS`/`keyAction`/`tooltip`; linhas `M` e `=` no painel `?`; `e2e/tooltips.spec.js` e `e2e/onkey-keys.spec.js` (caracterização das teclas globais).
- `### Changed`: `onKey` e painel `?` derivados do registro; Esc do painel com a cascata completa; textos unificados (Enquadrar, Recarregar "(R)"); o `▲` do dock perde o " · shift: no plano", que não vale para o clique.
- `### Perf`: `- estimated — o mapa de teclas deixa de ser recriado a cada keydown (keyRun montado uma vez); os títulos são strings cacheadas no core, sem alocação nova por render do dock.`

`docs/roadmap.md`: âncora `grep -c '^| S3.3 | 2 | S3 | Tooltips ação e atalho |' docs/roadmap.md` = 1; a linha vira:

```md
| S3.3 | 2 | S3 | Tooltips ação e atalho | checklist C | — | [](superpowers/plans/2026-10-16-s3-3-action-tooltips.md) | [](../changelog.d/feature-261016-0-s3-3-action-tooltips.md) | — | done |
```

```bash
python ~/.claude/design/_build_proto.py .
npm test
git add docs changelog.d
git commit -m "docs: close S3.3 in the checklist, architecture and tracker (S3.3)"
```

Expected: `npm test` PASS; `README.md` sem mudança (reverter o bloco "Related" se o `retrofit_docs.py` o anexou).

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| Task 0. worktree, baselines, âncoras, leaf | gen | Standard | Workhorse | depende da `develop` pós S4.7/S3.4: julgamento de âncora |
| Task 1-4. registro, `onKey`, títulos, lacunas e testes | gen | Standard | Workhorse | código e autoria de testes |
| Task 5. gate visual, docs, changelog, roadmap | gen | Standard | Workhorse | prosa de docs e leitura do diff visual |
| Pre-merge review | review | Architectural | Architect | verificador ≥ gerador (`adversarial-reviewer`) |

Executor: none — toda tarefa exige julgamento sobre âncoras deslocadas ou autoria de testes.

> [!DECISION] D2 — formato e escopo (resolvida pelo usuário)
> Formato `Ação (K)` mantido (sem regravar para "Ação · atalho"); texto do item C do checklist corrigido. Escopo: todo botão de ação sem texto visível, mesmo sem tecla (só o nome), mais os botões com tecla. `SHORTCUTS` vai para `lib/layers-core.js` como registro único (`ACTIONS`, `SHORTCUTS`, `tooltip(id)`) exportado no `api`. Só `title` nativo; visual congelado.

> [!DECISION] Escopo — override explícito do esboço do plano geral
> Este plano diverge do texto do [plano geral](2026-10-16-layers-plano-geral-da-onda-3.md) em `:37` (sufixo anexado ao `title` da linha da árvore) e `:140` (lacunas: Ações ▾, ↑ Pai, Isolar, Fechar, chevrons, chips PgUp/PgDn, "com sufixo no `title` da linha") e segue o D2 do próprio plano geral (`:167`): Opção A mais o gatilho Ações ▾.
> - **Entra**: o `title` da `div acoesRef`, que cobre o gatilho e os 3 itens (antes, herdavam "Recolher / expandir" do cabeçalho Ajustes).
> - **Fica de fora, sem `title` novo** (texto e nenhuma tecla): Cancelar, Salvar, ↑ Pai (sem ancestral com `title`), Descartar.
> - **Mantêm o título atual, sem sufixo de tecla**: "Todas", chips `L0…Ln`, a linha da árvore.
> - **Exceção aceita**: Isolar (`isolateSel`, texto, sem tecla) recebe `Isolar o ramo da seleção` fora do isolamento. É o mesmo botão que, com `isoId`, mostra "Mostrar tudo" e ganha `Sair do isolamento (Esc)`; um título só no estado com tecla exigiria `title=""` no outro, que este plano proíbe (esconde o `title` de um ancestral).

> [!DECISION] Textos unificados (menor)
> Um rótulo por ação: F vira "Enquadrar seleção: centralizar + zoom (F)" nos 4 botões; Recarregar diz "(R)". As setas do dock ficam sem " · shift: no plano" (o `▲` perde o sufixo): o clique não usa o plano (`index.html:2280-2283`, `:1853`); a nota fica em `SHORTCUTS` e no doc. Alternativa: `tooltip(id, label)` com o rótulo antigo nos 3 "⊕ Enquadrar".

> [!DECISION] Linhas do painel (alinhadas com a S7.4)
> `=` numa linha própria na Câmera (token `=` literal, exigido pela guarda); `M` em Geral; descrição do Esc com a cascata de `escape()`. A cascata detalhada fica em "Contextos" da S7.4 (D5). A guarda "toda tecla tratada está no painel" é `KeyMap_TeclaComHandler_EstaNoPainel` deste plano (endurecida: sem células com `(`, célula `Esc` exata); a S7.4 a cita no lugar de `Shortcuts_HandlerKeys_AllDocumented`.

> [!DECISION] Esc no campo de propriedade (para o usuário)
> `SHORTCUTS` promete "Esc (no campo): descartar a edição" (`index.html:833`), mas `:2173` chama `delBuf(k)` e depois `blur()`, e o `commit` do `onBlur` (`:2172`) provavelmente aplica o valor. O Task 2 Step 3 confere no navegador. Mesma pergunta do [plano geral](2026-10-16-layers-plano-geral-da-onda-3.md) `:188`.
> - **Padrão, se o valor for aplicado**: a S3.3 corrige só o texto da linha (`'sair do campo (o valor digitado é aplicado)'`), sem dizer "descartar", e abre issue + leaf de runtime para o descarte real; a S7.4 herda o texto.
> - **Alternativa**: corrigir o runtime dentro da S3.3 (o `commit` passa a ignorar o buffer descartado), fora do escopo de tooltips.

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — leaf já rastreada pelo roadmap; sem issue nova (exceto a do Esc no campo, se a checagem confirmar o bug).

> [!DECISION] phase-intake
> Classification: **micro** `S3.3` sob **S3**, alvo **Unreleased**.
> Fork of an existing row? **No** (a linha e o membro da config já existem).

> [!DECISION] execution
> Method: **Inline** (tarefas sequenciais sobre `index.html` e o mesmo registro).
