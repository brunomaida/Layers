---
title: "S9.1b — Cobertura mono × múltiplos layouts — Implementation Plan"
type: plan
solution: Layers
status: draft
created: 2026-10-18
---

# S9.1b — Cobertura mono × múltiplos layouts — Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox syntax. Dispatch descriptions `S9.1b Task <id> …`; commit subjects end `(S9.1b Task <id>)` (Atlas convention).

**Goal:** item "Analisar cobertura" em Projetos ▾ que varre o repo sem rodar o app e mostra, num modal, `cob_reg`/`cob_el` de Monovisual, Monovisual + states e Múltiplos layouts, o veredito da regra de decisão e um trecho `layouts` copiável.

**Architecture:** lógica pura em `LayersCore` (tokenizador de HTML com pilha, modelo, veredito, sugestão), coleta de arquivos em `index.html` (walker extraído de `autoCreateLayersJson`), modal próprio no padrão do overlay Atalhos.
**Tech Stack:** JS puro (`lib/layers-core.js`, `index.html`), Vitest, Playwright, estilo inline.

**Spec:** [](../specs/2026-10-18-s9-1b-modelo-de-cobertura-mono-design.md) (issue #89). Board de método: [](../../design/ui-mock/boards/S91Cobertura.dc.html).

## Context

Nenhum modelo diz hoje quanto de um repo um mock, um mock com states ou vários layouts mostram. A S9.1a entregou `layouts` (Foco); a S9.1b mede e recomenda. Decisões do usuário (2026-10-18): sob demanda, regex em `.ts`/`.js` com selo de confiança baixa.

Reuses: `describeHtml`/`deriveManifest` (`lib/layers-core.js:356,392`), `projectLayouts`/`projectStates` (`:654,674`), walker de `autoCreateLayersJson` (`index.html:1552-1604`), overlay Atalhos (`:786-808`), `menuAct` (`:1706`), `readText` (`:2302`).
Out of scope: Espalhar/LOD (S9.1c), gravar `layers.json`, router por AST, docs de UI como dica, executar o app, aviso de escopo `all`.

## Global Constraints

- **Visual congelado**: o modal segue o board aprovado na Task 1.
- Nenhuma requisição de rede nova; nada é gravado no disco pela análise; Copiar usa a área de transferência.
- Projeto sem uso do item: comportamento byte a byte igual ao de hoje (nenhum teste existente editado, exceto o que a Task 4 declara).
- Constantes da regra no core, em um objeto `COVERAGE`: `MONO_MIN 0.85`, `GAIN_MIN 0.15`, `PLANES_MAX 1500`, `SHARED_MIN 0.6`, `SCRIPT_FILES_MAX 200`, `SCRIPT_BYTES_MAX 262144`.

## Review Focus

Casos-limite da spec sem task óbvia; cada um tem teste na task dona.

1. HTML malformado ou com texto de marcação dentro de `<script>`/`<style>`/comentário/`<template>` não pode inventar região nem lançar (Task 2).
2. Repo sem nenhuma região: sem `NaN`, veredito `Indeterminado` (Task 3).
3. Mock declarado ausente ou ilegível: aviso, o resto da análise segue (Task 3).
4. Ids sugeridos que colidem (`a/config.html` e `b/config.html`) ou têm caracteres inválidos (Task 3).
5. Trocar de projeto durante a varredura não pode mostrar o resultado do projeto antigo (Task 4).

## Design: Architecture & Flows

```
 Projetos ▾ › Analisar cobertura                       (clique do usuário)
        │ analyzeCoverage()   dir/loadSeq capturados antes do 1º await
        ▼
 coleta ── pasta local : collectProjectFiles(dir, {html,css,script})  ─┐
        ── zip         : this.zip.files (decodifica html/css/script)   ├─► files[]
        ── GitHub/fixt. : sem listagem → files=[], partial=true        ─┘
        ── mocks       : readText(P(mock)) de cada layout × state    ──► mocks{}
        ▼
 LayersCore (puro)
   coverageScope(path, base) ─► filtra docs/test/vendor/…
   htmlRegions(html, hiddenSels) · cssHiddenSelectors(css[]) · scanScriptMarkers(path, text)
   coverageModel(input) ─► {regions, models:{mono,monoStates,multi}, sharedStates, confidence, unreadable}
   coverageVerdict(model) ─► {verdict, rule, split, gainPp}
   suggestLayouts(model, man, files) ─► [{id,name,mock}]
        ▼
 state.coverage ─► overlay (barras · regra · tabela · trecho + Copiar)
```

### Contratos do core

| Função | Assinatura | Regras fixadas |
|---|---|---|
| `coverageScope` | `(path: string, base: string) => boolean` | `false` se algum segmento (sem caixa) é `docs`, `test`, `tests`, `testing`, `e2e`, `fixtures`, `bench`, `tools`, `vendor`, `node_modules`, `.design-history`, ou o arquivo termina em `.dc.html`; com `base` não vazia exige o prefixo `base/` |
| `cssHiddenSelectors` | `(cssTexts: string[]) => string[]` | regras de topo (fora de `@`) cujo corpo tem `display:none` (espaços e `!important` toleráveis) e cujo seletor, por vírgula, é exatamente `#id` ou `.cls`; sem duplicatas, ordem de aparição |
| `htmlRegions` | `(text: string, hiddenSels?: string[]) => {nodes, visibleNodes, rootEl, tokens, regions}` | ver abaixo |
| `scanScriptMarkers` | `(path: string, text: string) => Region[]` | `role="tab"` (aspas simples ou duplas) → `aba`; `<dialog` ou `aria-modal` → `diálogo`; cada `#/nome` distinto (`#\/([A-Za-z][\w-]{0,30})`) → `tela`; chaves `path:aba`, `path:dialog`, `path:route:<nome>`; todas `lowConf:true`, `el:null` |
| `coverageModel` | `(input: CoverageInput) => CoverageModel` | ver Task 3 |
| `coverageVerdict` | `(model) => {verdict, rule, split, gainPp}` | ver Task 3 |
| `suggestLayouts` | `(model, man, files) => {id,name,mock}[]` | ver Task 3 |

`htmlRegions` (só o `<body>` se existir; remove comentários, `<script>`, `<style>` e `<template>` antes de tokenizar; elementos void não abrem pilha; tag de fechamento sem par é ignorada; fim do texto fecha tudo):

- `nodes` = tags do corpo; `visibleNodes` = tags não ocultas; `rootEl` = tags fora de qualquer região.
- **Oculto** (efetivo, herdado dos ancestrais): atributo `hidden`; `style` com `display:none`; `<dialog>` sem `open`; `#id` ou `.cls` presente em `hiddenSels`.
- **Região**: `role="tabpanel"` → `aba`; `<dialog>`, `aria-modal="true"` ou classe `modal` → `diálogo`; elemento oculto com `id` ou classe → `painel`. Região: `{sel, kind, el, hidden}`; `el` = tags cujo menor ancestral-região é ela (partição, sem dupla contagem).
- `sel` = `tag#id`, senão `tag.c1.c2` (classes na ordem do atributo); repetição no mesmo arquivo ganha `~2`, `~3`.
- `tokens`: `{[tag#id | tag.cls]: hidden}` para todo elemento com id ou classe; em repetição vale `false` se alguma instância é visível.

## Tasks

### Task 1: Board do modal no `/design` (Opus) — STOP

**Files:** `docs/design/ui-mock/boards/S91CoberturaModal.dc.html` (novo, exportado), `docs/design/ui-mock/canvas.json`, `docs/design/ui-mock/README.md` (linha em § Boards e na Matriz), `.claude/skills/layers-ui-mock/SKILL.md` (região "Modal de cobertura"), `test/uiMockCoverage.test.js` (só se o teste exigir).

**Interfaces:** Produces: o contrato visual da Task 5 (posição do item em Projetos ▾, cromo, tabela, barras, estados).

- [ ] **Step 1:** subagente `model: "opus"` com `/design` sobre o canvas `https://claude.ai/artifact/YAjnzs8CsEDpSbwpn5CCuJ` (skill `layers-ui-mock`), editando o canvas existente, sem mock novo. Board com cabeçalho `S9.1 · 3`: (a) item "Analisar cobertura" em Projetos ▾ logo abaixo de "Reanalisar do 0"; (b) modal com 3 barras `cob_reg · cob_el · planos`, linha de veredito com a regra que disparou, tabela de regiões (Região, Tipo, Elem., Mono, Mono + states, Layouts), trecho `layouts` com Copiar; (c) estados: analisando, `cobertura parcial`, `confiança baixa`, `Indeterminado`, erro. Reusar cromo e tokens do overlay Atalhos e do board `S91Cobertura` (conteúdo já aprovado).
- [ ] **Step 2:** exportar o board e o `canvas.json` para o repo; atualizar README e a skill conforme Files. Verify: `npx vitest run test/uiMockCoverage.test.js` verde.
- [ ] **Step 3:** commit `docs: add S9.1b coverage modal board (S9.1b Task 1)`.
- [ ] **STOP:** o controlador apresenta o board e **só libera a Task 5 depois da aprovação do usuário**. As Tasks 2–4 não dependem dele.

### Task 2: Detecção de regiões no core (TDD)

**Files:** Modify `lib/layers-core.js` (funções + exports no objeto `api`); Test `test/layers-core.test.js` (novos `describe`).

**Interfaces:** Produces: `COVERAGE`, `coverageScope`, `cssHiddenSelectors`, `htmlRegions`, `scanScriptMarkers` conforme a tabela de contratos; `Region = {sel, kind: 'aba'|'diálogo'|'painel'|'tela', el: number|null, hidden: boolean}`.

- [ ] **Step 1: testes que falham** (`describe('HtmlRegions')`, `it('Cenario_Esperado')`):
  - `TabpanelEDialog_ClassificaRegioes`: `<body><div role="tablist"><button role="tab">A</button></div><div id="p1" role="tabpanel"><span>x</span></div><div id="p2" role="tabpanel" hidden><b>y</b><i>z</i></div><dialog id="dlg"><p>q</p></dialog></body>` → `nodes 9`, `visibleNodes 4`, `rootEl 2`; regiões `div#p1` aba oculto `false` `el 2`; `div#p2` aba `true` `el 3`; `dialog#dlg` diálogo `true` `el 2`; `tokens['div#p1'] === false`, `tokens['div#p2'] === true`.
  - `ScriptStyleComentarioTemplate_NaoContam` (Review Focus 1): `<body><!-- <dialog id="x"> --><script>var s='<dialog id="y">'</script><style>.a{}</style><template><dialog id="t"></dialog></template><p>ok</p></body>` → `regions []`, `nodes 1`.
  - `TagNaoFechadaEFechamentoSolto_NaoLancaEContaRegiao` (Review Focus 1): `<body></span><div id="a"><p>x<div hidden id="b"><span>` → não lança; `nodes 4`; região `div#b` painel oculto `el 2`.
  - `OcultoPorCss_PainelOculto`: `htmlRegions('<body><div id="empty"><p>x</p></div></body>', ['#empty'])` → `div#empty` painel oculto `el 2`.
  - `DisplayNoneInline_PainelOculto`: `<div class="box a" style="color:red; display: none"><i>1</i></div>` → `sel 'div.box.a'`, oculto.
  - `DialogComOpen_Visivel` (`hidden false`); `AncestralOculto_FilhoHerdaOculto` (`<div id="p" hidden><dialog open id="d"></dialog></div>`: `dialog#d` oculto `true`, `el` de `div#p` = 1); `ClasseRepetida_GanhaOrdinal` (`div.row~2`).
  - `describe('CssHiddenSelectors')`: `#empty{display:none}.modal,.dlg { display : none !important }.x{color:red}a:hover{display:none}@media print{.p{display:none}}` → `['#empty', '.modal', '.dlg']`.
  - `describe('ScanScriptMarkers')`: texto `render('<button role="tab">'); open('<dialog>'); href('#/config'); href('#/replay'); href('#/config');` com path `src/ui.ts` → chaves `src/ui.ts:aba`, `src/ui.ts:dialog`, `src/ui.ts:route:config`, `src/ui.ts:route:replay`, todas `lowConf`.
  - `describe('CoverageScope')`: `''`+`src/index.html` e `layers/mock.html` → `true`; `docs/superpowers/reports/a.html`, `test/x.html`, `tests/x.html`, `e2e/x.html`, `fixtures/x/y.html`, `bench/a.html`, `tools/a.html`, `vendor/a.html`, `node_modules/a.html`, `.design-history/a.html`, `boards/S.dc.html` → `false`; base `app`: `app/index.html` → `true`, `other/index.html` → `false`.
- [ ] **Step 2:** `npx vitest run test/layers-core.test.js -t "HtmlRegions|CssHiddenSelectors|ScanScriptMarkers|CoverageScope"`. Expected: FAIL (funções ausentes).
- [ ] **Step 3:** implementar as funções com as assinaturas da tabela, em `lib/layers-core.js` (estilo `var`/IIFE do arquivo, comentários em EN, sem DOM). Tokenizador: um único `RegExp` global de tags sobre o texto já limpo, com pilha `{tag, region, hidden}`; elementos void: `area base br col embed hr img input link meta source track wbr`.
- [ ] **Step 4:** mesmo comando. Expected: PASS; `npm test` verde.
- [ ] **Step 5:** commit `feat(core): add coverage region detection (S9.1b Task 2)`.

### Task 3: Modelo, veredito e sugestão no core (TDD)

**Files:** Modify `lib/layers-core.js`; Test `test/layers-core.test.js`.

**Interfaces:** Consumes: Task 2. Produces:

```
CoverageInput = { man: object, files: {path, kind: 'html'|'css'|'script', text}[],
                  mocks: {[mockPath]: string}, planes?: {[mockPath]: number}, partial?: boolean }
CoverageModel = { regions: {key, kind, name, el: number|null, lowConf: boolean}[],
                  models: { mono|monoStates|multi: { mocks: string[], visible: string[], cobReg: number|null,
                                                      cobEl: number|null, planes: {[mock]: number}, maxPlanes: number } },
                  sharedStates: [string, string][], unreadable: string[], estimates: {[mock]: number},
                  confidence: 'ok'|'baixa'|'parcial' }
```

Regras fixadas:
- **Detectadas**: para cada `html` de `files` dentro do escopo (`coverageScope(path, man.base || '')`): tela `{key: path, kind:'tela', el: rootEl}` (omitida se shell: corpo ≤ 3 tags com `div#app|root|main` vazio, que marca `confidence 'baixa'`) + cada região do arquivo (`key: path + '#' + sel`, `hiddenSels` vindos de `cssHiddenSelectors` dos `css` do escopo); mais `scanScriptMarkers` dos `script` do escopo (no máximo `SCRIPT_FILES_MAX` arquivos de até `SCRIPT_BYTES_MAX` bytes). Duas telas com `|tokens comuns| / min(|A|,|B|) ≥ SHARED_MIN` (e `min > 0`) fundem numa só (fica a de menor caminho) e entram em `sharedStates`.
- **Contém**: tela R está em mock M se `M.path === R.key` ou o teste de tokens acima vale entre o HTML do mock e o de R; sub-região R está em M se `tokens[R.sel]` existe no mock. **Visível**: contida e (tela: sempre; sub-região: `tokens[R.sel] === false`). Região de `scanScriptMarkers` é visível se o texto do mock contém o literal do marcador.
- **Mocks por modelo**: `mono` = mock padrão do layout principal (`projectLayouts(man)[0]`: 1º state, senão `mock`); `monoStates` = todos os mocks desse layout; `multi` = todos os mocks de todos os layouts declarados; sem `layouts` declarados, `monoStates` ∪ os `html` de telas ainda não contidas (candidatas). Mock sem texto em `mocks` entra em `unreadable` e é ignorado.
- `cobReg = |visíveis| / |detectadas|`; `cobEl = Σ el visíveis / Σ el` (só `el` não nulo); denominador 0 → `null` (nunca `NaN`).
- **Planos** por mock: `planes[mock]` se dado; senão `visibleNodes` do mock (`estimates[mock]`). `maxPlanes` = máximo do modelo.
- `confidence`: `'parcial'` se `partial`; `'baixa'` se houve shell ou região `lowConf`; senão `'ok'`.
- **Veredito** (`best` = maior `cobReg` entre `mono` e `monoStates`, `bestModel` o dele): sem regiões → `Indeterminado`, `rule 0`; `best ≥ MONO_MIN` e `bestModel.maxPlanes ≤ PLANES_MAX` → `Monovisual`, `rule 2`; `best ≥ MONO_MIN` e `maxPlanes > PLANES_MAX` → `Múltiplos layouts`, `rule 4`, `split true`; `multi.cobReg − best ≥ GAIN_MIN` → `Múltiplos layouts`, `rule 3`; senão `Monovisual (layouts não ajudam)`, `rule 3`. `gainPp` = ganho em pontos percentuais.
- **Sugestão**: `main` primeiro (`{id:'main', name: man.name || 'main', mock}`) quando `man.layouts` não existe; depois uma entrada por tela candidata não contida em `monoStates`, com `mock` relativo a `man.base` e fora das já declaradas; `id` = nome do arquivo sem extensão, caracteres fora de `[A-Za-z0-9_-]` viram `-`, `-` repetidos colapsam e as pontas saem, máximo 40; colisão ganha `-2`, `-3`; `name` = nome do arquivo sem extensão.

- [ ] **Step 1: testes que falham** (`describe('CoverageModel')`, `describe('CoverageVerdict')`, `describe('SuggestLayouts')`), com estes arquivos: `main.html` = `<body><div id="app"><p>a</p></div><div id="empty" hidden><p>b</p></div></body>`; `config.html` = `<body><section id="cfg"><h1>c</h1><p>d</p></section></body>`; `replay.html` = `<body><main class="replay"><p>e</p></main></body>`; `docs/x.html` = `<body><p>z</p></body>`; `man = {name:'App', mock:'main.html'}`; `mocks = {'main.html': <texto do main.html>}`:
  - `SemLayouts_MonoVsCandidatas`: `cobReg` mono `0.25`, `cobEl` mono ≈ `0.2222` (2/9), multi `0.75`, `cobEl` multi ≈ `0.7778` (7/9); `docs/x.html` fora das regiões; veredito `Múltiplos layouts`, `rule 3`, `gainPp` ≈ `50`.
  - `ComStates_MonoStatesSomaOutroMock`: `man.states = [{name:'base',mock:'main.html'},{name:'aberto',mock:'main.open.html'}]` e `mocks['main.open.html']` = `main.html` sem `hidden` → `mono.cobReg 0.25`, `monoStates.cobReg 0.5`.
  - `TelasComTokensIguais_FundemEmSharedStates`: `a.html` e `b.html` com o mesmo corpo → 1 tela, `sharedStates [['a.html','b.html']]`.
  - `MuitosPlanos_Regra4Divide`: só `main.html` sem painel oculto, `planes {'main.html': 1600}` → veredito `Múltiplos layouts`, `rule 4`, `split true`.
  - `Vazio_IndeterminadoSemNaN` (Review Focus 2): `files []`, `mocks {}` → todos `cobReg`/`cobEl` `null`, `rule 0`, `Indeterminado`.
  - `MockAusente_AvisaESegue` (Review Focus 3): `layouts [{id:'a',mock:'a.html'},{id:'b',mock:'gone.html'}]` sem texto de `gone.html` → `unreadable ['gone.html']`, não lança, `multi` calculado só com `a`.
  - `Shell_ConfiancaBaixa` (`<body><div id="root"></div></body>`); `Parcial_ConfiancaParcial` (`partial: true`).
  - `SuggestLayouts_SemLayouts_MainEDuasTelas`: `[{id:'main',name:'App',mock:'main.html'},{id:'config',name:'config',mock:'config.html'},{id:'replay',name:'replay',mock:'replay.html'}]`.
  - `SuggestLayouts_IdsColidemEInvalidos` (Review Focus 4): `a/config.html` e `b/config.html` → `config`, `config-2`; `My Page!.html` → `My-Page`; `man.base = 'app'` com `app/x.html` → `mock 'x.html'`.
- [ ] **Step 2:** `npx vitest run test/layers-core.test.js -t "CoverageModel|CoverageVerdict|SuggestLayouts"`. Expected: FAIL.
- [ ] **Step 3:** implementar `coverageModel`, `coverageVerdict`, `suggestLayouts` (+ exports), reusando `describeHtml` (shell), `projectLayouts`, `safePath`/`resolvePosix` para caminhos.
- [ ] **Step 4:** mesmo comando. Expected: PASS; `npm test` verde.
- [ ] **Step 5:** commit `feat(core): add coverage model, verdict and layout suggestion (S9.1b Task 3)`.

### Task 4: Coleta de arquivos e `analyzeCoverage` (sem UI)

**Files:** Modify `index.html` (`autoCreateLayersJson` `:1552-1604`; novos métodos perto dele); Create `e2e/autocreate.spec.js` (caracterização).

**Interfaces:** Consumes: Tasks 2–3. Produces: `collectProjectFiles(dir, kinds, exclude)`; `analyzeCoverage(): Promise<void>` que preenche `state.coverage`:

```
state.coverage = null
  | { open: true, status: 'running' }
  | { open: true, status: 'error', error: string }
  | { open: true, status: 'done', model, verdict, suggestion: {id,name,mock}[], snippet: string, capped: boolean }
```

`snippet` = `JSON.stringify({ layouts: suggestion }, null, 2)`. Não há teste do `autoCreateLayersJson` hoje (verificado).

- [ ] **Step 1: teste de caracterização** `e2e/autocreate.spec.js` (usar `folder-helpers.js`/`connectFixture` como base, criando no OPFS uma pasta com `index.html` + `style.css` e sem `layers.json`): conectar, deixar o auto-create rodar e afirmar que `layers.json` gravado é `{ name, viewport:{width:1280,height:760}, mock:'index.html', styles:['style.css'] }`; segundo caso: pasta só com `node_modules/x.html` e sem HTML legível → erro "nenhum HTML legível". Rodar: `npx playwright test e2e/autocreate.spec.js`. Expected: PASS **antes** de tocar o walker.
- [ ] **Step 2:** extrair o walker para `collectProjectFiles(dir, kinds, exclude)`: mesmos tetos (`MAX_DEPTH 6`, `MAX_ENTRIES 5000`, 3 MB por arquivo, 20 MB total), `SKIP` + `exclude` (conjunto de nomes de pasta), devolve `{files, capped}`; `kinds` é `Set` de `'html'|'css'|'script'` (script = `.ts .tsx .js .jsx .mjs`, não `.d.ts`; no máximo `COVERAGE.SCRIPT_FILES_MAX` arquivos e `SCRIPT_BYTES_MAX` bytes cada). `autoCreateLayersJson` passa a chamar `collectProjectFiles(dir, new Set(['html','css']))` e mantém a captura de `dir` e as rechecagens. Rodar o Step 1 de novo. Expected: PASS sem edição do teste.
- [ ] **Step 3:** `analyzeCoverage()`: captura `const dir = this.state.dir; const seq = this.loadSeq;` antes do 1º `await`; `setState({coverage:{open:true,status:'running'}})`. Fontes: pasta local → `requestPermission({mode:'read'})` se `queryPermission` não for `granted`, depois `collectProjectFiles(dir, new Set(['html','css','script']), new Set(['docs','test','tests','testing','e2e','fixtures','bench','tools','vendor']))`; zip → `this.zip.files` (Map) filtrado pelas extensões, decodificado com `TextDecoder`, mesmos tetos; GitHub/fixture → `files=[]`, `partial=true`. `mocks`: `await this.readText(P(mock))` de cada mock de `projectLayouts(man)` × `states` (falha de leitura = ausente); `planes`: `{[mock do layout montado]: this.state.nodes.length}`. Chamar `LayersCore.coverageModel/coverageVerdict/suggestLayouts`. Antes do `setState` final: `if (this.state.dir !== dir || seq !== this.loadSeq) return;` (Review Focus 5). Erros viram `status:'error'`. Registrar o parsed `layers.json` (`man`) como o `loadProject` já faz, ou reler com `readText('layers.json')` se não estiver guardado.
- [ ] **Step 4:** Verify: `npx playwright test e2e/autocreate.spec.js e2e/layouts.spec.js e2e/multi-state.spec.js e2e/perf.spec.js` verdes; `npm test` verde. (A cobertura de `analyzeCoverage` por e2e vem na Task 6, via `act(page, 'analyzeCoverage')`.)
- [ ] **Step 5:** commit `feat(ui): add project file collection and analyzeCoverage (S9.1b Task 4)`.

### Task 5: Modal e item de menu (depende da aprovação do board da Task 1)

**Files:** Modify `index.html` (menu `:75-83`, overlay perto de `:786-808`, render model `:2790` e `:2816`, Esc `:2231`, estado inicial `:1206`).

**Interfaces:** Consumes: `state.coverage` da Task 4; board `S91CoberturaModal`. Produces: item `coverageItem`, overlay `coverageOpen`, `closeCoverage`, `copySnippet`.

- [ ] **Step 1:** item "Analisar cobertura" na ordem do board, visível com `hasDirProject`-equivalente para projeto carregado (`!!s.project`), `onClick={{ coverageItem }}` com `coverageItem: this.menuAct(() => this.analyzeCoverage())`.
- [ ] **Step 2:** overlay no padrão Atalhos (`z-index:100`, fecha no fundo e em Fechar, `stop` no cartão): estados `running`, `error`, `done` conforme o board; barras `cob_reg · cob_el` e `maxPlanes` por modelo; veredito com a regra (`rule`, `gainPp`, `split`); selos `cobertura parcial`/`confiança baixa`; lista `unreadable`; tabela de regiões (no máximo 200 linhas, com "+N" no excedente); `<pre>` com `snippet` e botão Copiar (mesma lógica de fallback de `copyRequests` `:2052`; extrair só se o diff em `copyRequests` ficar ≤ 5 linhas) visíveis só com veredito `Múltiplos layouts` e sugestão não vazia.
- [ ] **Step 3:** Esc fecha o overlay (acrescentar na cadeia `:2231` antes de `modal`); incluir `s.coverage && s.coverage.open` nas guardas que bloqueiam atalhos com overlay aberto (as que já testam `s.modal || s.pending || s.diff`).
- [ ] **Step 4:** Verify: abrir `npm run dev` (porta 5180), conectar uma pasta, Projetos ▾ › Analisar cobertura: modal confere com o board nos três temas; Network sem requisições fora de `localhost:5180`; `npm test` verde.
- [ ] **Step 5:** commit `feat(ui): add coverage modal to the Projetos menu (S9.1b Task 5)`.

### Task 6: Fixture e e2e

**Files:** Create `fixtures/coverage-multi/` (`layers.json` `{name:'Coverage', viewport, mock:'main.html', styles:['style.css']}`, `main.html`, `config.html`, `replay.html`, `style.css`, `docs/page.html`), `e2e/coverage.spec.js`.

- [ ] **Step 1:** `main.html` com `role="tablist"` + dois `tabpanel` (um `hidden`), um `<dialog id="confirm">` e `<div id="empty">` oculto por `style.css` (`#empty{display:none}`); `config.html` e `replay.html` telas distintas (tokens sem sobreposição relevante); `docs/page.html` é isca de escopo. ≤ 40 elementos por arquivo.
- [ ] **Step 2: testes** (`Coverage_*`, via `open(page, 'coverage-multi')` + menu real + `ctx-helpers`):
  - `Coverage_Menu_ShowsThreeBarsAndMultiVerdict`: três barras, veredito `Múltiplos layouts`, regra 3.
  - `Coverage_Suggestion_ListsMissingScreensAndSkipsDocs`: `snippet` tem `config` e `replay` e não tem `page`; `JSON.parse` do trecho válido e ids casam `^[A-Za-z0-9_-]{1,40}$`.
  - `Coverage_Copy_PutsSnippetOnClipboard`.
  - `Coverage_SingleScreenFixture_VerdictMonovisual`: fixture de uma tela sem regiões ocultas (`plain-css` ou `pico-css`; se nenhuma der `cobReg 1`, criar `fixtures/coverage-single/`).
  - `Coverage_HttpFixture_ReportsPartial`: `/?layers=fixtures/multi-layout/` → selo `cobertura parcial`, sem erro.
  - `Coverage_Load_DoesNotScan`: após a carga `state.coverage === null`.
  - `Coverage_ProjectSwitchDuringScan_DropsResult` (Review Focus 5): trocar de fixture enquanto `running` → `state.coverage` não recebe o resultado antigo.
  - `Coverage_PlanesEstimate_WithinTolerance`: no `multi-layout` montado, `estimates['main.html']` dentro de ±25 % de `state.nodes.length`.
- [ ] **Step 3:** `npx playwright test e2e/coverage.spec.js`. Expected: PASS (se `Coverage_SingleScreen…` falhar por região oculta no fixture, trocar o fixture, nunca afrouxar a regra).
- [ ] **Step 4:** commit `test(e2e): cover coverage analysis flows (S9.1b Task 6)`.

### Task 7: Perf

**Files:** Modify `bench/workloads.js`/`bench/core.bench.js` (microbench do core), `e2e/perf.spec.js`, `docs/RELEASE-CHECKLIST.md` § D.

- [ ] **Step 7.1 (Workhorse):** bench `coverage/html-regions-1500-tags` (um HTML de 1.500 tags) e `coverage/model-200-html` (200 HTMLs de ~30 tags); teste em `perf.spec.js` `Coverage_Analyze_CostsUnder…` que mede `analyzeCoverage` na fixture e fixa o orçamento depois de medido (mediana de 3, orçamento = 2× a mediana arredondada, como na S9.1a); ids novos em `EXPECTED`.
- [ ] **Step 7.2 (Executor):** `npm run bench` e `npx playwright test e2e/perf.spec.js`; devolver `exit_code`, cauda e as medianas.
- [ ] **Step 7.3:** registrar as medidas e o orçamento em § D; commit `test(perf): measure coverage analysis (S9.1b Task 7)`.

### Task 8: Docs e fechamento

**Files:** `docs/ARCHITECTURE.md` (§ Cobertura S9.1b), `docs/layers-json.md` (nota sobre a sugestão, entre `## layouts` e `## Snapshot`), `docs/RELEASE-CHECKLIST.md` (§ D medidas, § E fixture), `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md` (§ "Divergências do código (S9.1b)"), `README.md`, `changelog.d/feature-261018-89-s9-1b-cobertura-layouts.md`, `docs/roadmap.md`, `docs/roadmap.data.json`, `docs/_index.md`.

- [ ] **Step 1:** ARCHITECTURE: fluxo, contratos do core, limites (sem router por AST; sem listagem em GitHub/fixture; visível = estático; painéis visíveis por padrão ficam dentro da tela; estimativa de planos ±25 %). Divergências do board: regra para "mono < 85 % e ganho < 15 p.p." e "Indeterminado" são preenchimentos; `.ts/.js` por regex; regiões visíveis por padrão não viram região própria.
- [ ] **Step 2:** changelog (≤ 2048 B; `### Added`, `### Tests`, `### Perf` com o bullet `measured` e as medianas da Task 7); roadmap: coluna `plan` já ligada, S9.1b `done`, S9.1 segue `in-progress` até a S9.1c; rebuild: `python ~/.claude/design/_build_proto.py .`.
- [ ] **Step 3:** `phase-close-gate`, `adversarial-reviewer` da branch inteira, fix wave, `pr-precheck`: `python -X utf8 ~/.claude/scripts/gates/precheck.py --root .` sem BLOCKED.
- [ ] **Step 4:** commit `docs: document coverage analysis and close S9.1b (S9.1b Task 8)`.

## Verification

- `npm test` verde após cada task.
- `npx playwright test e2e/coverage.spec.js e2e/autocreate.spec.js e2e/layouts.spec.js e2e/multi-state.spec.js e2e/perf.spec.js` (porta 5180 livre).
- Manual: `npm run dev` → conectar `fixtures/coverage-multi` → Projetos ▾ › Analisar cobertura: três barras, `Múltiplos layouts`, trecho copiável; fixture de uma tela → `Monovisual`; Network sem requisições externas.
- `python -X utf8 ~/.claude/scripts/gates/precheck.py --root .` sem BLOCKED.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 1. board do modal (`/design`) | gen | Architectural | Architect (Opus) | pedido do usuário para mocks; o model-gate exige Opus no `/design` |
| 2, 3. detecção, modelo, veredito (core) | gen | Standard | Workhorse | contratos e casos-limite de parsing |
| 4. walker extraído, zip, `analyzeCoverage` | gen | Standard | Workhorse | refator com teste de caracterização e guarda de corrida |
| 5. modal, menu, Esc, guardas | gen | Standard | Workhorse | integração em `index.html` |
| 6. fixture + e2e | gen | Standard | Workhorse | autoria de testes |
| 7.1. bench e orçamento | gen | Standard | Workhorse | escrever bench e orçamento |
| 7.2. rodar bench e perf | gen | Mechanical | Executor | comando + `exit_code` + cauda; o chamador valida |
| 7.3, 8. docs, changelog, roadmap | gen | Standard | Workhorse | prosa e métricas |
| 2, 3, 4. revisão por task | review | Architectural | Architect (`adversarial-reviewer`) | parsing e walker: custo de erro alto (regra 5) |
| Pre-merge review | review | Architectural | Architect (`adversarial-reviewer`) | verifier ≥ generator |

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — issue #89 já criada (`feat: add layout coverage analysis and decision panel (S9.1b)`); nenhuma outra a abrir.

> [!DECISION] phase-intake
> Classification: **micro** `S9.1b` under **S9.1 Layouts newlogic** (meso, `in-progress`), parent **S9 Layouts múltiplos**, target **Unreleased**.
> Current tree (relevant slice): Unreleased › S9 › S9.1 (in-progress) — S9.1a `done`, S9.1b `in-progress`, S9.1c `registered`.
> Fork of an existing row? **No** (fatia planejada do meso).
> - **Option A**: S9.1b numa branch própria (decidida na spec aprovada)

> [!DECISION] execution
> Method: **Subagent-driven** (decidido no plano aprovado; tasks `S9.1b Task <id>` no Atlas). A Task 5 só começa depois da aprovação do board da Task 1.
