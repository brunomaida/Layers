---
title: "S9.1b — Modelo de cobertura mono × múltiplos layouts"
type: spec
solution: Layers
status: draft
created: 2026-10-18
---

# S9.1b — Modelo de cobertura mono × múltiplos layouts (plano de design)

Spec da leaf S9.1b, issue #89. Contexto em [](../../text-specs/2026-10-17-s9-1-layouts-newlogic.md) e decisões em [](2026-10-17-s3-5-s9-1-design-decisions.md); board em [](../../design/ui-mock/boards/S91Cobertura.dc.html).

## Context

S9.1 (meso, `in-progress`) pede, além de layouts (S9.1a, mergeada #88) e Espalhar (S9.1c), um **modelo de avaliação** que diga, em %, quanto do app cada abordagem (Monovisual, Monovisual + states, Múltiplos layouts) mostra, e recomende uma. Board aprovado: `docs/design/ui-mock/boards/S91Cobertura.dc.html` (método, fórmulas, regra de decisão). Leaf `S9.1b` já registrada (`registered`, sem plano). Decisões do usuário (2026-10-18): análise **sob demanda**, resultado em **modal via Projetos ▾**, `layers.json` sugerido como **trecho com Copiar** (sem gravar).

Entrega: item "Analisar cobertura" em Projetos ▾ → varre o repo (sem rodar o app, sem rede) → modal com 3 barras (`cob_reg · cob_el`, planos), regra de decisão com veredito, tabela de regiões (✓/– por modelo) e, se o veredito for Múltiplos layouts, o bloco `layouts` sugerido + Copiar. Carga normal e orçamento de perf da carga: intactos.

## Design: Architecture & Flows

### Decisões de design (minhas, a validar)

| # | Decisão | Por quê |
|---|---|---|
| 1 | Pura em `LayersCore`; sem DOM. Tokenizador de tags com pilha (`htmlRegions`) para subárvore de região | Vitest roda em node; só há regex hoje (`describeHtml`), nada detecta `hidden/dialog/role=tab` |
| 2 | **Região** = tela (cada `.html` de entrada estático), aba (`role=tabpanel`), diálogo (`<dialog>`, `[aria-modal]`, `.modal`), painel/estado (`[hidden]`, `display:none` inline ou em regra CSS simples `#id`/`.cls`). **Escopo** do detectado: HTML sob `base` (ou raiz), fora de `docs/`, `test*/`, `e2e/`, `fixtures/`, `bench/`, `tools/`, `vendor/`, `.design-history/`, `node_modules/` e de `*.dc.html`; tela exige corpo não-shell. Vitest: HTML de doc/relatório não conta. **`.ts`/`.js` (decisão do usuário, 2026-10-18)**: `scanScriptMarkers` roda regex sobre `.ts/.tsx/.js/.jsx` do escopo (teto de 200 arquivos e 256 KB cada) atrás de marcadores literais (`role="tab"`, `<dialog`, `aria-modal`, rota `#/nome` da gallery); essas regiões entram no cálculo com selo `confiança baixa` e contam só em `cob_reg`. Router por AST e docs de UI como dica ficam fora (registrado em "Divergências S9.1b") | Ground truth do board sem executar JS; evita o Layers recomendar Múltiplos por causa dos próprios docs |
| 3 | **Identidade**: `key` = `<caminho>` (tela) ou `<caminho>#<sel>`, com `sel` = `#id`, senão `tag.classe1.classe2` + ordinal no arquivo. Um mock **contém** a região se (tela) `mock.path == region.path` ou ≥ 60 % dos tokens de nó (`tag#id`, `tag.cls`) em comum com o HTML da tela (o mesmo teste funde mock autoral e fonte numa região só e implementa a regra 5); (sub-região) o mock tem nó com o mesmo `sel`. **Visível** = contida e sem `hidden`/`display:none`/ancestral oculto. `cob_reg = visíveis/detectadas`; `cob_el = Σ elementos visíveis / Σ estimados` (subárvore na fonte). **Planos**: `nodes.length` real para o layout montado; estimativa (elementos visíveis do mock) só para os desmontados, calibrada contra `nodes.length` em e2e (±25 %) | O board define "visível" por caixa > 0, só medível com o layout montado; Foco monta 1 |
| 4 | Modelos: **Mono** = `mock` do `main` (ou do 1º layout; sem `layouts`, o `mock` raiz — ruling g da S9.1a); **Mono + states** = + `states` desse layout; **Múltiplos** = layouts declarados × states, ou, sem `layouts`, as telas candidatas (`suggestLayouts`) | Reproduz o exemplo do board (3 colunas); coerente com `projectLayouts` |
| 5 | Regra (constantes no core): melhor mono ≥ 85 % e ≤ 1.500 planos → Monovisual; senão, ganho ≥ 15 p.p. → Múltiplos; layout > 1.500 planos → dividir; capturas com ≥ 60 % de nós comuns viram *states* (avisa, mescla no cálculo). **Meu preenchimento**: mono < 85 % e ganho < 15 p.p. → "Monovisual (layouts não ajudam)"; 0 regiões → "Indeterminado" | O board não cobre esses dois casos |
| 6 | Fonte dos arquivos: pasta local = varredura (extrai o walker de `autoCreateLayersJson` para `collectProjectFiles`, mesmos tetos 5.000/depth 6/3 MB/20 MB); zip = `this.zip.files`; GitHub/fixture **não têm listagem** → só os mocks declarados (leitura por `readText`, já usada pelo loader), selo `cobertura parcial`. `analyzeCoverage` mantém as guardas de corrida do `autoCreateLayersJson`: captura `dir` antes do 1º `await`, rechecando `dir` e `loadSeq` antes de gravar `state.coverage` | Fatos do loader: `repo` sem tree API; fixture só por caminho; troca de projeto durante a varredura |
| 7 | App renderizado por JS (shell) → selo `confiança baixa` (regiões vêm só de entradas/states/layouts) | Honestidade do modelo estático |
| 8 | Sugestão: `suggestLayouts(files, man)` lista `{id,name,mock}` de telas estáticas ainda não cobertas (id válido `^[A-Za-z0-9_-]{1,40}$`, `main` = mock atual); `styles` é do projeto, não do layout. Só Copiar | `deriveManifest` fica intacto |

```
 Projetos ▾ › Analisar cobertura
        │ ensureRead + collectProjectFiles(dir | zip | declarados)
        ▼
 LayersCore.coverageModel(files, man, mocksText)   (puro)
   htmlRegions(html) ─► regiões {key,kind,el,hidden}
   3 modelos ─► cob_reg · cob_el · planos estimados
   coverageVerdict(model) ─► Monovisual | Múltiplos | dividir | Indeterminado
   suggestLayouts(...) ─► trecho layouts
        ▼
 state.coverage ─► modal (barras · regra · tabela · trecho + Copiar)
```

## Tasks (outline; `writing-plans` detalha depois da aprovação)

| # | Tarefa | Verifica | Tier |
|---|---|---|---|
| 1 | Leaf: ligar coluna `plan` da S9.1b, status `in-progress`, rebuild (`roadmap`) | rebuild sem erro | Mechanical (Executor) |
| 2 | `/design` (Opus) no canvas: board do **modal** (posição no menu, estados vazio/parcial/confiança baixa, trecho + Copiar); regiões da skill/matriz do README. **STOP: o usuário aprova o board antes da Task 5 tocar `index.html`** (Tasks 3–4 não dependem dele) | `npx vitest run test/uiMockCoverage.test.js` | Architect |
| 3 | Core TDD: `htmlRegions`, `scanScriptMarkers`, `coverageModel`, `coverageVerdict`, `suggestLayouts` + constantes | `npm test` | Workhorse |
| 4 | `collectProjectFiles(dir, kinds)` (extração do walker; `autoCreateLayersJson` segue pedindo só html/css, comportamento idêntico) + leitura de `.ts/.js` com tetos próprios + adaptador zip + `analyzeCoverage()` | e2e `autocreate*` verdes sem edição + novo | Workhorse |
| 5 | Modal (overlay próprio como Atalhos, `z-index:100`), item em Projetos ▾, Esc chain, guardas, Copiar; estilo inline, visual congelado | e2e `coverage.spec.js` | Workhorse |
| 6 | Fixture `fixtures/coverage-multi` (HTMLs com abas/diálogo/hidden) + e2e (3 barras, veredito, trecho, parcial no fixture HTTP, calibração planos×nodes) | `npx playwright test e2e/coverage.spec.js` | Workhorse |
| 7 | Perf: bench do tokenizador (1.500 tags; 200 HTMLs) e medição do modal; § D | `npm run bench`, `perf.spec.js` | Workhorse (Executor roda) |
| 8 | Docs: ARCHITECTURE § Cobertura, `layers-json.md`, RELEASE-CHECKLIST §§ D/E, decisions doc ("Divergências S9.1b"), README, changelog (`### Perf`), roadmap → `done` | `precheck.py` sem BLOCKED | Workhorse |

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 1. leaf/roadmap rebuild | gen | Mechanical | Executor | edição de tabela + comando, validada pelo chamador |
| 2. board do modal (`/design`) | gen | Architectural | Architect (Opus) | pedido do usuário para mocks |
| 3. core TDD | gen | Standard | Workhorse | contratos e casos-limite de parsing |
| 4. walker, zip, `analyzeCoverage` | gen | Standard | Workhorse | refator preservando comportamento |
| 5. modal, menu, Esc, guardas | gen | Standard | Workhorse | integração em `index.html` |
| 6. fixture + e2e | gen | Standard | Workhorse | |
| 7. rodar bench/perf e resumir | gen | Mechanical | Executor | comando + `exit_code` + cauda |
| 7. escrever o bench e § D | gen | Standard | Workhorse | |
| 8. docs/changelog/roadmap | gen | Standard | Workhorse | prosa e métricas |
| 3, 4. revisão por task; pré-merge | review | Architectural | Architect (`adversarial-reviewer`) | verifier ≥ generator |

## Arquivos críticos

`lib/layers-core.js` (novas funções + exports; ~`:392` `deriveManifest`, `:356` `describeHtml`), `index.html` (`:43-84` menu, `:1552-1604` walker, `:786-808` overlay modelo, `:2231` Esc, `:2816` render model), `test/layers-core.test.js`, `e2e/coverage.spec.js` + `ctx-helpers.js`, `fixtures/coverage-multi/`, `docs/design/ui-mock/**`, `.claude/skills/layers-ui-mock/SKILL.md`, docs listados na task 8.

## Fora de escopo

Espalhar/LOD (S9.1c), gravar `layers.json`, ler router JS, executar o app, aviso de escopo `all`.

## Verificação ponta a ponta

`npm test`; `npx playwright test e2e/coverage.spec.js e2e/autocreate*.spec.js e2e/layouts.spec.js e2e/perf.spec.js`; manual `npm run dev` → conectar `fixtures/coverage-multi` → Projetos ▾ › Analisar cobertura: 3 barras, veredito Múltiplos, trecho copiável; `fixtures/traval` → Monovisual; Network sem requisições externas.

> [!DECISION] phase-intake
> Classification: **micro** `S9.1b` under **S9.1 Layouts newlogic** (meso, `in-progress`), parent **S9 Layouts múltiplos**, target **Unreleased**. Leaf already registered `registered` (sem plano).
> Current tree (relevant slice): Unreleased › S9 › S9.1 (in-progress) — S9.1a `done`, S9.1b `registered`, S9.1c `registered`.
> Fork of an existing row? **No** (fatia planejada do meso).
> - **Option A**: S9.1b numa branch própria, só medição + decisão (recomendada; escolha do usuário)
> - **Option B**: S9.1b junto da S9.1c (Espalhar)

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — funcionalidade visível nova (item de menu + modal) em várias regiões; a S9.1b não tem issue.
> - **Title**: `feat: add layout coverage analysis and decision panel (S9.1b)`
> - **Labels**: enhancement
> - **Milestone**: (none)
> - **Body**:
>   ## Context
>   Layers shows one mock per layout (S9.1a). Users cannot tell how much of a repo a single mock, a mock with states, or several layouts would show, nor when splitting into layouts pays off. Design approved in ui-mock board S91Cobertura.
>   ## Proposal
>   On-demand "Analisar cobertura" in Projetos ▾: scan the repo statically (no app run, no network), detect regions (screens, tabs, dialogs, hidden panels), compute cob_reg and cob_el for Monovisual, Monovisual + states and Multiple layouts, apply the decision rule (85 % / +15 p.p. / 1.500 planes / 60 % shared nodes) and show a modal with bars, regions table and a copyable suggested `layouts` block.
>   ## Acceptance criteria
>   - [ ] The normal project load is unchanged and its perf budget holds.
>   - [ ] The modal shows the three coverages, the verdict and the rule that fired.
>   - [ ] A repo with several static screens gets a valid suggested `layouts` block; a one-screen repo gets Monovisual.
>   - [ ] GitHub and fixture sources report partial coverage instead of failing.
>   - [ ] Nothing is written to disk; no request beyond the file fetches the existing GitHub loader already makes.
>   ## Refs
>   `docs/design/ui-mock/boards/S91Cobertura.dc.html`, `docs/text-specs/2026-10-17-s9-1-layouts-newlogic.md`

> [!DECISION] execution
> Subagent-driven (tasks `S9.1b Task <id>` no Atlas).
