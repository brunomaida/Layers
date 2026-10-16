---
title: "S3.4 — Fonte única de aparência"
type: plan
solution: Layers
status: draft
created: 2026-10-16
---

# S3.4 — Fonte única de aparência (`APPEARANCE_DEFAULTS`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** os defaults de aparência passam a ter um dono só, `LayersCore.APPEARANCE_DEFAULTS`; o menu Aparência grava por cima (`localStorage`); os tweaks do host saem de `data-props` (fica só `fixture` e `histMax`). Zero mudança visual (item C de [RELEASE-CHECKLIST.md](../../RELEASE-CHECKLIST.md), linha 44; D1 = opção A do [plano geral da Onda 3](2026-10-16-layers-plano-geral-da-onda-3.md)).

**Architecture:** `cfg(k)` passa de `state.cfg › this.props` para `state.cfg › APPEARANCE_DEFAULTS`. Com isso todo fallback repetido (`THEMES.Dark`, `theme: 'Dark'`, `|| 'Dark'`, `|| 85`, `this.props.accent`) vira leitura da constante ou some. A regra "último que mudou" (`componentDidUpdate`) e o código morto (`DEFAULT_GRAD`, `randGrad`, `logoGrad`) saem.

**Tech Stack:** JS puro, Vitest, Playwright.

## Global Constraints

- Visual congelado: o diff de pixels tem que ser zero. Esta leaf **não** regenera baselines de propósito; isso substitui o item (c) do [plano da S3.2](2026-10-14-s3-2-menu-open-pattern.md) (`:194-198`). As baselines saem do `index.html` igual ao de `develop` (Task 1) e nunca mais são atualizadas.
- Menu Aparência: não tocar `data-menu="apar"` (`index.html:92`) nem o prefixo `Aparência · Fonte` do `title`. Abrir e fechar continua em `menuEv('apar')`. Nenhum popup novo; se surgir um, ele fica dentro de `aparRef` (`:91`).
- `:root` do `<style>` (`index.html:23`) fica intocado: é placeholder antes do `applyTheme()`, não é default.
- Não editar a linha 8 do `RELEASE-CHECKLIST.md` (contador; regra da Onda 3, recontado na Task E do plano geral).
- Números de linha são de antes das edições (`develop@0da02d6`); o Task 3 Step 1 desloca tudo abaixo de `:946` em −2. Editar por âncora, nunca por número.
- `support.js` intocado. `index.html`: âncoras únicas, contagem de matches antes de substituir. Nomes de teste `Metodo_Cenario_Esperado`; `npm test` verde antes de cada commit; commits EN com trailer de sessão, sem `Co-Authored-By`.
- Baselines locais (`e2e/menu-visual.spec.js-snapshots/`) e dumps do Task 1 nunca entram em commit: `git add` sempre com caminhos explícitos.
- Branch `refactor/261016-0-s3-4-appearance-source`; fragmento `changelog.d/refactor-261016-0-s3-4-appearance-source.md` com `adr: updated` e `### Perf` N/A (≥20 caracteres).

## Review Focus

- **Fallback silencioso (risco principal):** sem `data-props`, todo `|| X` que antes nunca disparava passa a disparar. `THEMES[...] || THEMES.Dark` (`:1577`) mostraria Dark; `SELECTS[cfg('selectColor')] || t.acc` (`:1578`) mostraria o acento do tema (teal no Grafite) em vez de Coral; `cfg('originColors') || ''` (`:1579`) mostraria Semântica em vez de Mono. Os rótulos do menu (`:2339`) e o `cur` de `opts` (`:2335`) derivam do mesmo jeito. A dobradiça é `cfg(k)` (`:1573`) cair na constante.
- **Tema salvo inválido:** `loadCfg` (`:970`) não sanitiza; um `theme` corrompido no `localStorage` caía em Dark e passa a cair em Grafite (o default real). Mudança intencional, só para storage corrompido.
- **`logoGrad` fora de `CFG_KEYS`** (`lib/layers-core.js:945`): `migrateConfig`, `loadCfg`, `sanitizeUi` e o import deixam de ler essa chave. Quem só tem `logoGrad` salvo perde `cfgDirty`/`menuOn.apar`: o ⚙ deixa de aparecer "sujo". Efeito desprezível (a chave nunca teve UI).
- **`ph` está vivo:** `:2293` lê `panelHeader` e `phA/phB/phC` escolhem um de três cabeçalhos do painel direito (`<sc-if>` em `:393`, `:458`, `:528`). Só `hs` (`hdrA/hdrB/hdrC`, `:628`) é fixo. Ver `[!DECISION] panelHeader`.
- **Strings com "tweak":** `title` do reset (`:102`, 10 linhas do trigger que a S3.3 edita em `:92`) e a linha de ajuda em `SHORTCUTS` (`:833`, que a S3.3 move para o core). A S3.4 mescla antes; a S3.3 rebaseia.

## Design: Architecture & Flows

```
ANTES                                        DEPOIS
data-props (theme, accent, selectColor,      lib/layers-core.js
 originColors, sliderScale, panelHeader)       APPEARANCE_DEFAULTS (congelado)
        │ this.props[k]                               │
        ▼                                             ▼
cfg(k) = state.cfg[k] ?? props[k]            cfg(k) = state.cfg[k] ?? APPEARANCE_DEFAULTS[k]
        │                                             │
        ├─ applyTheme: || THEMES.Dark,               ├─ applyTheme: THEMES[cfg] || THEMES[DEFAULTS.theme]
        │   ACCENTS[props.accent], props.sliderScale ├─   ACCENTS[DEFAULTS.accent], DEFAULTS.sliderScale
        ├─ opts/cfgVals: || 'Dark', || 'Padrão…'     ├─ opts/cfgVals: cfg(k) direto
        ├─ render: props.sliderScale || 85           ├─ render: DEFAULTS.sliderScale
        └─ componentDidUpdate: "último que mudou"    └─ (sai)
           (tweak alterado apaga state.cfg[k])

precedência: localStorage (menu Aparência) › APPEARANCE_DEFAULTS › :root (placeholder pré-applyTheme)
```

Valores da constante, copiados exatamente do `data-props` atual (`:800`):

| Chave | Valor | Variável resolvida |
|---|---|---|
| `theme` | `Gray · 1 Grafite` | `--bg0: #2a2e34` |
| `accent` | `5 · Cinza médio` | `--acc: #8b96a3` (escuro) / `#59626d` (claro) |
| `selectColor` | `Coral` | `--sel: #f08c6c` |
| `originColors` | `Mono · cor de seleção` | `--oD` = `--sel` |
| `panelHeader` | `B · Faixas rotuladas` | `phB` |
| `sliderScale` | `85` | `--sliderS: 0.85` |
| `fontScale` | `1` | `--fs: 1` |
| `bmAlpha` | `15` | ver `[!DECISION] bmAlpha` |

## Implementation Outline

- **Task 0** — reservar a leaf.
- **Task 1** — baselines, dump "antes" e E2E de guarda, com o `index.html` igual ao de `develop`.
- **Task 2** — `APPEARANCE_DEFAULTS` e `CFG_KEYS` no core, com Vitest.
- **Task 3** — `index.html`: `cfg()`, fallbacks, `data-props`, regra "último que mudou", código morto, strings.
- **Task 4** — verificação: greps, dump "depois", pixels, revisão.
- **Task 5** — docs, ADR, changelog, checklist e roadmap.

## Critical Files

`lib/layers-core.js` (`CFG_KEYS` `:945`, `migrateConfig` `:1114`, exports `:1494`), `test/layers-core.test.js`, `index.html` (`:92`, `:102`, `:800` `data-props`, `:833` `SHORTCUTS`, `:944` `CFG_KEYS`, `:946-948` código morto, `:1572-1581` `cfg`/`applyTheme`, `:1591-1596` `componentDidUpdate`, `:2277` `sliderS`, `:2293` `ph`, `:2335-2342` `opts`/`cfgVals`, `:2354` `bmAlpha`), `e2e/appearance-defaults.spec.js` (novo), `e2e/menu-visual.spec.js` (gate, sem edição), `docs/LOCAL-SETUP.md` (`:94-123`), `docs/ARCHITECTURE.md` (`:74`), `docs/architecture-decisions.md` (`:130-148`), `docs/RELEASE-CHECKLIST.md` (`:15`, `:44`), `docs/roadmap.md` (`:55`).

### Task 0: Reservar a leaf

**Files:**
- Modify: `docs/roadmap.md` (linha S3.4, `:55`)

A linha S3.4 (`registered`) e o membro em `docs/roadmap.config.json` (`:61`) já existem: o primeiro commit só muda o status e linka o plano.

- [ ] **Step 1: Branch**

```bash
git checkout develop && git pull --ff-only
git checkout -b refactor/261016-0-s3-4-appearance-source
```

- [ ] **Step 2: Linha do roadmap**

Se este plano ainda não estiver em `develop`: `git checkout docs/261016-0-wave-3-plan -- docs/superpowers/plans/2026-10-16-s3-4-appearance-source.md`. Na linha S3.4: coluna `plan` = `[](superpowers/plans/2026-10-16-s3-4-appearance-source.md)`, status `in-progress`. Depois:

Run: `python ~/.claude/design/_build_proto.py .`
Expected: `docs/roadmap.data.json` regenerado sem erro.

- [ ] **Step 3: Commit**

```bash
git add docs/roadmap.md docs/roadmap.data.json docs/_index.md docs/superpowers/plans/2026-10-16-s3-4-appearance-source.md
git commit -m "docs: reserve the S3.4 leaf in the tracker (S3.4)"
```

### Task 1: Baselines, dump "antes" e guarda E2E

**Files:**
- Create: `e2e/appearance-defaults.spec.js`
- Local, sem commit: `e2e/menu-visual.spec.js-snapshots/`, `$D/s3-4-dump.cjs`, `$D/before.json` (`D="${TMPDIR:-/tmp}/layers-s3-4"`)

`index.html` ainda é o de `develop` (o Task 0 só tocou docs). Nada deste task muda código.

- [ ] **Step 1: Baselines de pixel**

Run: `npm ci && LAYERS_VISUAL=1 npx playwright test e2e/menu-visual.spec.js --project=chromium --update-snapshots`
Expected: 9 testes PASS e 5 PNGs criados (`menu-closed`, `menu-{hist,apar,inter,acoes}-open`). Rodar de novo sem `--update-snapshots`: 9 PASS.

- [ ] **Step 2: Script do dump das variáveis**

Criar `$D/s3-4-dump.cjs` (fora do repo; resolve `@playwright/test` a partir da raiz):

```js
// Dumps every --* custom property applyTheme sets, for each saved appearance combo (S3.4 gate).
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd()] }));
const THEMES = ['Dark', 'Gray · 1 Grafite', 'Gray · 2 Ardósia', 'Gray · 3 Cinza quente', 'Bright · 1 Papel', 'Bright · 2 Névoa', 'Bright · 3 Linho'];
const SELECTS = ['Padrão do tema', 'Azul', 'Teal', 'Coral', 'Âmbar', 'Violeta', 'Verde', 'Branco'];
const ORIGINS = ['Semântica · verde / âmbar / acento', 'Mono · cor de seleção', 'Mono · acento'];
(async () => {
  const combos = [null, {}, { theme: 'Dark' }, { selectColor: 'Azul' }, { originColors: 'Mono · acento' }];
  for (const theme of THEMES) for (const selectColor of SELECTS) for (const originColors of ORIGINS) combos.push({ theme, selectColor, originColors });
  const browser = await chromium.launch(), out = {};
  for (const ui of combos) {
    const ctx = await browser.newContext();
    if (ui) await ctx.addInitScript(u => { localStorage.setItem('layers/v1/meta', JSON.stringify({ schema: 1 })); localStorage.setItem('layers/v1/ui', JSON.stringify(u)); }, ui);
    const page = await ctx.newPage();
    await page.goto('http://localhost:5180/');
    await page.getByText('Ações ▾').waitFor();
    out[ui ? JSON.stringify(ui) : 'no-storage'] = await page.evaluate(() => {
      const s = document.documentElement.style, cs = getComputedStyle(document.documentElement), v = {};
      for (let i = 0; i < s.length; i++) if (s[i].startsWith('--')) v[s[i]] = cs.getPropertyValue(s[i]).trim();
      return v;
    });
    await ctx.close();
  }
  await browser.close();
  require('fs').writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
  console.log(Object.keys(out).length + ' combos');
})();
```

As combinações parciais (`{}`, só `theme`, só `selectColor`, só `originColors`) são as que expõem o fallback: as chaves ausentes caem no default.

- [ ] **Step 3: Dump "antes"**

Run (com `npm run dev` rodando na porta 5180): `mkdir -p "$D" && node "$D/s3-4-dump.cjs" "$D/before.json"`
Expected: `173 combos`. Em `"no-storage"`, `--bg0` = `#2a2e34`, `--acc` = `#8b96a3`, `--sel` = `#f08c6c`, `--sliderS` = `0.85`.

- [ ] **Step 4: Guarda E2E (passa antes e depois)**

`e2e/appearance-defaults.spec.js`, só Chromium. Semeia `localStorage` com `page.addInitScript` (`layers/v1/meta` = `{schema:1}`, `layers/v1/ui` = objeto), abre `/` e espera `Ações ▾`. Lê as variáveis com `getComputedStyle(document.documentElement).getPropertyValue(...)`.
  - `AppearanceDefaults_NoStorage_ResolvesGrafiteCoralMono`: sem storage → `--bg0` `#2a2e34`, `--acc` `#8b96a3`, `--sel` `#f08c6c`, `--oD` `#f08c6c`, `--sliderS` `0.85`, `--fs` `1`.
  - `AppearanceDefaults_StoredThemeOnly_KeepsDefaultSelectAndOrigin`: `ui = {theme:'Dark'}` → `--bg0` `#0e1116`, `--sel` `#f08c6c`, `--oD` `#f08c6c`, `--acc` `#8b96a3`.
  - `AppearanceDefaults_EmptyUi_MenuLabelsShowDefaults`: `ui = {}` → clicar `button[title^="Aparência · Fonte"]`; os quatro combos mostram `Gray · 1 Grafite`, `Coral`, `Mono · cor de seleção` e `B · Faixas rotuladas`.

Run: `npx playwright test e2e/appearance-defaults.spec.js --project=chromium`
Expected: 3 PASS no `index.html` atual (é guarda de equivalência, não teste vermelho).

- [ ] **Step 5: Commit**

```bash
git add e2e/appearance-defaults.spec.js
git commit -m "test: guard the resolved appearance defaults before the refactor (S3.4)"
```

### Task 2: `APPEARANCE_DEFAULTS` no core

**Files:**
- Modify: `lib/layers-core.js` (`:945` e o objeto público, junto de `CFG_KEYS: CFG_KEYS,` `:1494`)
- Test: `test/layers-core.test.js`

**Interfaces:**
- Produces: `LayersCore.APPEARANCE_DEFAULTS: Readonly<{ theme, accent, selectColor, originColors, panelHeader, sliderScale, fontScale, bmAlpha }>`; `LayersCore.CFG_KEYS` = `['theme', 'selectColor', 'originColors', 'panelHeader', 'fontScale']`.

- [ ] **Step 1: Testes que falham**

  - `AppearanceDefaults_Valores_IguaisAosDataPropsAntigos`: `toEqual` com a tabela do Design (8 chaves, `sliderScale` 85, `fontScale` 1, `bmAlpha` 15).
  - `AppearanceDefaults_CfgKeys_TodaChaveTemDefault`: cada item de `CFG_KEYS` existe em `APPEARANCE_DEFAULTS`; `CFG_KEYS` não contém `logoGrad`.
  - `AppearanceDefaults_Objeto_Congelado`: `Object.isFrozen(core.APPEARANCE_DEFAULTS)` é `true`.
  - `MigrateConfig_LogoGradAntigo_NaoMigra`: `fakeStorage({ 'layers-cfg': JSON.stringify({ theme: 'Dark', logoGrad: 'x' }) })` → `migrateConfig(s).ui` é `{ theme: 'Dark' }`.

Run: `npx vitest run test/layers-core.test.js -t "AppearanceDefaults|MigrateConfig_LogoGrad"`
Expected: FAIL (`APPEARANCE_DEFAULTS` indefinido; `logoGrad` migrado).

- [ ] **Step 2: Implementar**

```js
  var CFG_KEYS = ['theme', 'selectColor', 'originColors', 'panelHeader', 'fontScale'];
  // Single source of the appearance defaults: the Aparência menu (layers/v1/ui) overrides them (S3.4).
  var APPEARANCE_DEFAULTS = Object.freeze({
    theme: 'Gray · 1 Grafite', accent: '5 · Cinza médio', selectColor: 'Coral', originColors: 'Mono · cor de seleção',
    panelHeader: 'B · Faixas rotuladas', sliderScale: 85, fontScale: 1, bmAlpha: 15
  });
```

Exportar `APPEARANCE_DEFAULTS: APPEARANCE_DEFAULTS,` logo depois de `CFG_KEYS: CFG_KEYS,`.

- [ ] **Step 3: Rodar e ver passar**

Run: `npm test`
Expected: PASS; `DepoisDaMigracao_PreservaMigratedFrom` e `RoundTrip_PreservaUiProjectsSession` seguem verdes.

- [ ] **Step 4: Commit**

```bash
git add lib/layers-core.js test/layers-core.test.js
git commit -m "refactor: add APPEARANCE_DEFAULTS and drop logoGrad from CFG_KEYS (S3.4)"
```

### Task 3: `index.html` lê a constante

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `LayersCore.APPEARANCE_DEFAULTS`, `LayersCore.CFG_KEYS` (Task 2).

Cada substituição: contar os matches da âncora antes (`grep -c`), esperar 1.

- [ ] **Step 1: Constante e código morto (`:944-948`)**

Depois de `const CFG_KEYS = LayersCore.CFG_KEYS;`, adicionar `const APPEARANCE_DEFAULTS = LayersCore.APPEARANCE_DEFAULTS;`. Remover `const DEFAULT_GRAD = …`, o comentário `// degradê aleatório …` e `const randGrad = …` (3 linhas).

- [ ] **Step 2: `cfg()` e `applyTheme` (`:1572-1581`)**

- Comentário `:1572` ("último que mudou") → `// Appearance: a value saved from the Aparência menu wins, else APPEARANCE_DEFAULTS (S3.4)`.
- `cfg(k) { const c = this.state.cfg; return c[k] !== undefined ? c[k] : APPEARANCE_DEFAULTS[k]; }`
- `:1577`: `THEMES[this.cfg('theme')] || THEMES[APPEARANCE_DEFAULTS.theme]` e `ACCENTS[APPEARANCE_DEFAULTS.accent]`.
- `:1581`: `const sliderS = (APPEARANCE_DEFAULTS.sliderScale / 100).toFixed(2);` (o resto da linha igual).
- `:1578-1579` ficam como estão: com `cfg()` caindo na constante, `|| t.acc` só cobre `Padrão do tema` (comportamento atual) e `|| ''` vira inalcançável sem mudar resultado.

- [ ] **Step 3: `componentDidUpdate` (`:1593-1595`)**

Remover as três linhas (`const changed = …`, o `if` que apaga `state.cfg`, o `if` que chama `applyTheme` por `accent`/`sliderScale`). A linha do `fixture` (`:1596`) fica.

- [ ] **Step 4: Render (`:2277`, `:2293`, `:2335-2342`, `:2354`)**

- `:2277`: `const sliderS = APPEARANCE_DEFAULTS.sliderScale / 100;`
- `:2293`: `ph = String(this.cfg('panelHeader'))[0]` (sai `?? 'B'`; `ph` continua vivo, ver `[!DECISION] panelHeader`).
- `:2335` (`opts`): `const cur = this.cfg(key) === v;` no lugar de `(this.cfg(key) || ({ theme: 'Dark', panelHeader: 'B · Faixas rotuladas' })[key] || list[0]) === v`.
- `:2339` (`cfgVals`): `cfgTheme: this.cfg('theme'), cfgSelectColor: this.cfg('selectColor'), cfgOriginColors: this.cfg('originColors'), cfgPanelHeader: this.cfg('panelHeader'),`
- `:2342`: remover `, logoGrad: s.cfg.logoGrad || DEFAULT_GRAD` (sem uso no template; conferir com `grep -c "{{ logoGrad" index.html` = 0).
- `:2354` (se `[!DECISION] bmAlpha` = A): `const bmA = APPEARANCE_DEFAULTS.bmAlpha / 100;`

- [ ] **Step 5: `data-props` (`:800`)**

Substituir o valor inteiro do atributo por exatamente:

```
data-props="{&quot;fixture&quot;:{&quot;editor&quot;:&quot;text&quot;,&quot;default&quot;:&quot;&quot;,&quot;tsType&quot;:&quot;string&quot;,&quot;section&quot;:&quot;Dev&quot;},&quot;histMax&quot;:{&quot;editor&quot;:&quot;int&quot;,&quot;default&quot;:10,&quot;min&quot;:3,&quot;max&quot;:20,&quot;tsType&quot;:&quot;number&quot;,&quot;section&quot;:&quot;Projetos&quot;}}"
```

Run: `node -e "const h=require('fs').readFileSync('index.html','utf8');const m=h.match(/data-props=\"([^\"]*)\"/);console.log(Object.keys(JSON.parse(m[1].replace(/&quot;/g,'\"'))).join(','))"`
Expected: `fixture,histMax`.

- [ ] **Step 6: Strings com "tweak" (só texto)**

- `:102` `title`: `Volta aos valores dos tweaks e limpa o que foi salvo neste navegador` → `Volta aos valores padrão e limpa o que foi salvo neste navegador`.
- `:833` (`SHORTCUTS`, Propriedades): `paleta no tweak Cores de origem` → `paleta em Aparência › Cores de origem`.

- [ ] **Step 7: Rodar**

Run: `npm test && npx playwright test e2e/appearance-defaults.spec.js e2e/menu-open.spec.js --project=chromium`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "refactor: read appearance defaults from APPEARANCE_DEFAULTS, drop host tweaks (S3.4)"
```

### Task 4: Verificação de zero mudança visual

**Files:** nenhum (só leitura).

- [ ] **Step 1: Greps de fallback e de props**

Run: `grep -nE "\|\| 'Dark'|THEMES\.Dark|theme: 'Dark'|\|\| 85|DEFAULT_GRAD|randGrad|logoGrad|último que mudou" index.html lib/layers-core.js`
Expected: nenhuma saída (exit 1).

Run: `grep -oE "this\.props(\.[A-Za-z]+|\[)" index.html | sort | uniq -c`
Expected: só `this.props.fixture` e `this.props.histMax` (mais `this.props.bmAlpha` se `[!DECISION] bmAlpha` = B).

- [ ] **Step 2: Dump "depois" e diff**

Run (com `npm run dev` na 5180): `node "$D/s3-4-dump.cjs" "$D/after.json" && diff "$D/before.json" "$D/after.json" && echo IDENTICAL`
Expected: `173 combos` e `IDENTICAL`.

- [ ] **Step 3: Pixels**

Run: `LAYERS_VISUAL=1 npx playwright test e2e/menu-visual.spec.js --project=chromium`
Expected: 9 PASS contra as baselines do Task 1 (`maxDiffPixels: 0`). Nunca usar `--update-snapshots` aqui.

- [ ] **Step 4: Regressão completa**

Run: `npm test && npx playwright test --project=chromium`
Expected: PASS (os `test.fail` existentes de `e2e/perf.spec.js` seguem como estão).

- [ ] **Step 5: Revisão Architect**

`adversarial-reviewer` sobre `git diff develop...HEAD -- index.html lib/layers-core.js`, com foco no Review Focus (fallbacks, `ph`, `logoGrad`) e nos números dos Steps 1-3.

### Task 5: Docs, ADR, changelog e roadmap

**Files:**
- Modify: `docs/LOCAL-SETUP.md`, `docs/ARCHITECTURE.md`, `docs/architecture-decisions.md`, `docs/RELEASE-CHECKLIST.md`, `docs/roadmap.md`
- Create: `changelog.d/refactor-261016-0-s3-4-appearance-source.md`

- [ ] **Step 1: Docs**

- `LOCAL-SETUP.md` § Defaults visuais reais (`:94-107`): "Sem `localStorage`, valem os `LayersCore.APPEARANCE_DEFAULTS` (`lib/layers-core.js`)…"; coluna `Prop` → `Chave`; linha `bmAlpha` se aplicada. O snippet de limpeza e o parágrafo da migração ficam.
- `ARCHITECTURE.md:74`: `- Aparência: \`cfg\` (só o que o usuário mudou no menu Aparência; o resto vem de \`LayersCore.APPEARANCE_DEFAULTS\`).`
- `architecture-decisions.md`: entrada nova no topo (mais nova em cima), ≤ 1.200 B, no formato do arquivo: `## 2026-10-16 · Código é dono dos defaults de aparência` — Contexto (defaults em `data-props` e repetidos em fallbacks; regra "último que mudou"), Decisão (`APPEARANCE_DEFAULTS`; precedência `localStorage` › constante › `:root`; `data-props` só com `fixture`/`histMax`; `accent` e `sliderScale` fixos), Alternativas descartadas (B: controles novos no menu, muda o popover; C: só deduplicar, mantém os tweaks), Consequências (mudar default = editar a constante; o host de design não muda mais acento nem slider). Na entrada de 2026-09-12 (`:130`), emendar no lugar: primeira linha do corpo `> Superada pela entrada de 2026-10-16 (\`APPEARANCE_DEFAULTS\`).`; sem correção datada no fim.
- `RELEASE-CHECKLIST.md:15`: `valem os \`data-props\`, não o \`:root\`` → `valem os \`APPEARANCE_DEFAULTS\`, não o \`:root\``. `:44` → `[x]` com `(\`LayersCore.APPEARANCE_DEFAULTS\`; \`e2e/appearance-defaults.spec.js\`, visual inalterado em \`e2e/menu-visual.spec.js\`)`. Linha 8 intocada.
- `README.md:114-118` (Defaults visuais) ainda cita `data-props`: fica para o release (CLAUDE.md § Manutenção); anotar no PR. Se `retrofit_docs.py` anexar o bloco "Related" ao `README.md`, reverter.

- [ ] **Step 2: Changelog**

```markdown
---
adr: updated
---

### Changed
- Aparência com uma fonte só: `LayersCore.APPEARANCE_DEFAULTS` (Gray · 1 Grafite, acento 5 · Cinza médio, seleção Coral, origem Mono · cor de seleção, cabeçalho B, slider 85 %, fonte 1). O menu Aparência grava por cima; `theme`, `accent`, `selectColor`, `originColors`, `sliderScale` e `panelHeader` saíram de `data-props` e a regra "último que mudou" acabou. Visual idêntico (variáveis `--*` de 173 combinações e `menu-visual` com diff zero).

### Removed
- Código morto `DEFAULT_GRAD`, `randGrad` e a chave `logoGrad` (fora de `CFG_KEYS`): um `logoGrad` salvo deixa de ser lido.

### Tests
- `AppearanceDefaults_*` e `MigrateConfig_LogoGradAntigo_NaoMigra` (Vitest); `e2e/appearance-defaults.spec.js` (3 casos).

### Perf
- N/A — `applyTheme` faz os mesmos `setProperty`; só a origem do default muda (constante em vez de prop).
```

- [ ] **Step 3: Leaf**

`docs/roadmap.md` S3.4: `report` = `[](../changelog.d/refactor-261016-0-s3-4-appearance-source.md)`, status `done` (via `phase-close-gate`, Task E do plano geral). Rebuild: `python ~/.claude/design/_build_proto.py .`

- [ ] **Step 4: Rodar e commitar**

Run: `npm test && python -X utf8 ~/.claude/scripts/docs-linkcheck.py . && python -X utf8 ~/.claude/scripts/adr-body-check.py docs/architecture-decisions.md --base develop`
Expected: PASS; `0 broken link(s)`; `adr-body-check` com exit 0 (o arquivo usa o formato próprio `## AAAA-MM-DD · Título`, que o checker não analisa; a entrada de 2026-09-12 tem 972 B e continua < 1.200 B com a linha de supersessão).

```bash
git add docs/_index.md docs/LOCAL-SETUP.md docs/ARCHITECTURE.md docs/architecture-decisions.md docs/RELEASE-CHECKLIST.md docs/roadmap.md docs/roadmap.data.json changelog.d/refactor-261016-0-s3-4-appearance-source.md
git commit -m "docs: record APPEARANCE_DEFAULTS as the appearance source and close S3.4 (S3.4)"
```

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| Task 0. reserva da leaf | gen | Standard | Workhorse | edição de tracker com rebuild |
| Task 1.1-1.3. baselines, script dado e dump "antes" | gen | Mechanical | Executor | arquivo verbatim + comandos dados; caller valida `exit_code`, `173 combos` e os 5 PNGs |
| Task 1.4, 2, 3. guarda E2E, core e `index.html` | gen | Standard | Workhorse | autoria de testes e edição por âncora |
| Task 4.1-4.4. greps, diff, pixels | gen | Mechanical | Executor | comandos dados; saída esperada exata (`IDENTICAL`, exit 1, 9 PASS) |
| Task 4.5. revisão do fallback e do dump | review | Architectural | Architect | regressão visual silenciosa; verificador ≥ gerador |
| Task 5. docs, ADR, changelog | gen | Standard | Workhorse | prosa de docs |

Executor: Task 1.1-1.3 e 4.1-4.4, sempre com formato, tokens de recusa (`COULD NOT RUN`) e validação pelo caller; desvio refaz no Workhorse.

> [!DECISION] panelHeader — `ph` não é código morto
> `ph` (`:2293`) lê `panelHeader` e escolhe o cabeçalho do painel direito (`phA/phB/phC`, `:393`, `:458`, `:528`); só `hs` (`hdrA/hdrB/hdrC`) é fixo. Remover `ph` muda o visual de quem tem A ou C salvo, e o gate de pixels não vê (os blocos só aparecem com projeto carregado, `:392`).
> - **Opção A (aplicada neste plano)**: manter `ph` e `panelHeader` em `CFG_KEYS`; só o default sai de `data-props` para a constante. Zero mudança visual.
> - **Opção B**: remover `ph` e fixar `B`; o combo "Cabeçalho do painel" vira inerte de fato. Muda o painel de quem salvou A ou C.
> `hdrA`/`hdrC` (`:2364`) não têm uso no template: código morto fora do escopo, só registrado.

> [!DECISION] bmAlpha — prop fantasma
> `:2354` lê `this.props.bmAlpha ?? 15`, mas `bmAlpha` não existe em `data-props` desde a v2.24b: o valor é sempre 15.
> - **Opção A (recomendada, aplicada)**: `bmAlpha: 15` em `APPEARANCE_DEFAULTS`; zero mudança visual e nenhuma leitura de prop de aparência sobra.
> - **Opção B**: deixar `:2354` como está (fora do texto do checklist).

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — leaf rastreada pelo roadmap; sem issue nova.

> [!DECISION] execution
> Method: **Inline** (6 tarefas sequenciais; o Task 1 tem que rodar antes de qualquer edição de `index.html`).
