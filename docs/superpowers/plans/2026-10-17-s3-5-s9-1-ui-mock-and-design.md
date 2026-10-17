---
title: "Plano S3.5 × S9.1 — base local do mock e design conjunto"
type: plan
solution: Layers
status: draft
created: 2026-10-17
---

# Plano S3.5 × S9.1 — base local do mock e design conjunto

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar as leaves S3.5, S9 e S9.1, criar a cópia local versionada do mock `/design` com teste de cobertura e produzir (Opus) os boards de S3.5 e S9.1 para a decisão V1/V2/V3 antes do plan-mode de código.

**Architecture:** `docs/design/ui-mock/` guarda `boards/*.dc.html`, `canvas.json` e um `README.md` com a matriz região-da-UI → board; um teste Vitest garante que README, `canvas.json` e `boards/` não divergem. O canvas privado `https://claude.ai/artifact/YAjnzs8CsEDpSbwpn5CCuJ` segue sendo a fonte editável; o repo guarda o export. Sem mudança em `index.html`.

**Tech Stack:** Vitest (`npm test`), Artifact `read`/`publish` do tipo Design, skill de projeto.

**Spec:** [](../specs/2026-10-17-s3-5-s9-1-sequencing-design.md), [](../../text-specs/2026-10-16-s3-5-visual-functions-new.md), [](../../text-specs/2026-10-17-s9-1-layouts-newlogic.md)

## Global Constraints

- Branch nasce de leaf do `docs/roadmap.md`, token do id no slug (`s3-5`, `s9-1`); leaf escrita no 1º commit da branch (row + `docs/roadmap.config.json` + rebuild).
- Visual congelado: o design só propõe mudança nos itens das duas text-specs; sem alterar cores, tipografia ou espaçamentos fora do que o mock aprovar.
- Estilo: prosa PT-BR nos docs; commits em EN, Conventional Commits, sem `Co-Authored-By`.
- Fragmento `changelog.d/<slug>.md` por branch com bloco `### Perf` (`N/A`, bullet ≥ 20 caracteres); `CHANGELOG.md` só no release.
- Boards editados só via `/design` sobre o canvas; nunca à mão, exceto sem canvas (ver Task 5).
- Boards que dependem do runtime `./support.js` do tipo Design, que não é versionado.

## Review Focus

1. Board listado no README sem arquivo em `boards/` (ou o inverso): o teste deve falhar nomeando o board.
2. `canvas.json` com board ausente de `boards/` ou duas caixas sobrepostas: falha nomeando o par.
3. Board com `<script src>`/`<link href>` `http(s)` : quebra a regra de nenhuma requisição externa.
4. Export velho: board editado no canvas e não reexportado (não testável; mitigado pelo passo "reexportar só os boards alterados" da skill).
5. Decisão `states` × layouts perdida: registrada em `docs/superpowers/specs/` antes do plan-mode de S9.1.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `docs/roadmap.md`, `docs/roadmap.config.json`, `docs/roadmap.data.json` | Rows e árvore das leaves S3.5, S9, S9.1 |
| `docs/design/ui-mock/README.md` | Contrato de autoria, tabela Boards, matriz região → board |
| `docs/design/ui-mock/boards/*.dc.html` | Export dos boards do canvas |
| `docs/design/ui-mock/canvas.json` | Posições e títulos das caixas |
| `test/uiMockCoverage.test.js` | Guarda de consistência README × canvas × boards |
| `.claude/skills/layers-ui-mock/SKILL.md` | Perfil do projeto sobre a skill genérica (T7) |
| `~/.claude/skills/web-ui-mock/SKILL.md` | Skill genérica de mock de UI web (T7) |
| `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md` | Escolha V1/V2/V3 e decisão `states` × layouts |
| `changelog.d/docs-261017-0-s3-5-ui-mock.md` | Fragmento da branch da infra |

---

### Task 1: Registrar as leaves no tracker

**Files:**
- Modify: `docs/roadmap.md` (nova row S3.5 entre S3.4 e S3.6; rows S9 e S9.1 após as rows S8.*)
- Modify: `docs/roadmap.config.json` (`S3.members` ganha `"S3.5"` entre S3.4 e S3.6; novo nó `{"id":"S9","name":"Layouts múltiplos","members":["S9.1"]}` após S8)
- Modify: `docs/roadmap.data.json` (rebuild)

**Interfaces:**
- Produces: ids `S3.5` (depth 2, parent `S3`), `S9` (depth 1), `S9.1` (depth 2, parent `S9`), status `registered`, coluna spec apontando para as text-specs.

- [ ] **Step 1:** Em `docs/roadmap.md`, inserir `| S3.5 | 2 | S3 | Funções visuais novas | Menu de botão direito (Explodir daqui, Recolher até aqui) e Requisição no painel Ajustes; inclui a base local do mock | [](text-specs/2026-10-16-s3-5-visual-functions-new.md) | — | — | — | registered |` e as rows `S9` (depth 1, `Layouts múltiplos`, `registered`) e `S9.1` (depth 2, parent `S9`, `Layouts newlogic`, spec `text-specs/2026-10-17-s9-1-layouts-newlogic.md`, `registered`), no mesmo formato das rows vizinhas.
- [ ] **Step 2:** Atualizar `docs/roadmap.config.json` como na lista de arquivos acima.
- [ ] **Step 3:** Commitar os docs, depois reconstruir com `python ~/.claude/design/_build_proto.py Layers` (o build lê só arquivos rastreados). Expected: `docs/roadmap.data.json` com `S3.5`, `S9`, `S9.1` e exit 0.
- [ ] **Step 4:** Commit `docs: register the S3.5, S9 and S9.1 leaves in the tracker` (inclui `docs/roadmap.data.json`).

---

### Task 2: Teste de cobertura do mock local (TDD)

**Files:**
- Create: `test/uiMockCoverage.test.js`
- Create: `docs/design/ui-mock/README.md`, `docs/design/ui-mock/canvas.json`, `docs/design/ui-mock/boards/` (vazio até a Task 3)

**Interfaces:**
- Produces: formato do README lido pelo teste: seção `## Boards` com linhas `| <Arquivo>.dc.html | <título> | <região da UI> |` e seção `## Matriz` com linhas `| <região> | <board ou "exempt"> |`.

- [ ] **Step 1:** Escrever `test/uiMockCoverage.test.js` (estilo de `test/support-matrix.test.js`: `fs`, `path`, `root`) com os casos `Boards_ReadmeListaArquivoInexistente_Falha`, `Boards_ArquivoForaDoReadme_Falha`, `CanvasJson_BoardForaDeBoards_Falha`, `CanvasJson_CaixasSobrepostas_Falha` e `Boards_ScriptOuLinkExterno_Falha` (regex `<(script|link)[^>]+(src|href)="https?:`), cada um com a mensagem citando o nome do board ou do par.
- [ ] **Step 2:** Rodar `npx vitest run test/uiMockCoverage.test.js`. Expected: FAIL (README e `canvas.json` ausentes).
- [ ] **Step 3:** Criar `README.md` com contrato de autoria (token engine do tipo Design copiado, nunca reescrito), tabelas `## Boards` (vazia) e `## Matriz` (regiões do dock, painel de propriedades, painel Ajustes, palco 3D, menus, toasts, todas `exempt` por ora) e `canvas.json` mínimo `{"v":3,"boards":{},"order":[]}`.
- [ ] **Step 4:** Rodar o teste. Expected: PASS com zero boards.
- [ ] **Step 5:** Commit `test: guard the local ui-mock against drift`.

---

### Task 3: Exportar o canvas existente para o repo

**Files:**
- Create: `docs/design/ui-mock/boards/{Main,Tema,Canvas,RotuloL0}.dc.html`
- Modify: `docs/design/ui-mock/canvas.json`, `docs/design/ui-mock/README.md`

**Interfaces:**
- Consumes: formato do README da Task 2.

- [ ] **Step 1:** `Artifact read` com `url` do canvas e `path` `project/<board>.dc.html` para cada um dos 4 boards e `project/canvas.json`; copiar os arquivos salvos para `docs/design/ui-mock/boards/` e sobrescrever `canvas.json`.
- [ ] **Step 2:** Preencher a tabela `## Boards` do README: os 4 boards pertencem ao snapshot S2.22c (Main = decisões, Tema/Canvas/RotuloL0 = estados do snapshot), região `Loader · snapshot`; registrar na matriz que **não existe board da UI atual do Layers** (dock, painéis, palco).
- [ ] **Step 3:** Rodar `npx vitest run test/uiMockCoverage.test.js`. Expected: PASS; se `Boards_ScriptOuLinkExterno_Falha` acusar um export legítimo, restringir a regex a `<script src`, anotar o motivo no README e repetir.
- [ ] **Step 4:** Commit `docs(design): export the S2.22c ui-mock boards`.

---

### Task 4: Design conjunto S3.5 × S9.1 (Opus)

**Files:**
- Modify (canvas): boards novos `Base.dc.html` (UI atual), `S35Menu.dc.html`, `S35Requisicao.dc.html`, `S91Fluxos.dc.html`, `S91Cobertura.dc.html`
- Create: `docs/design/ui-mock/boards/` (reexport dos boards novos)
- Modify: `docs/design/ui-mock/{README.md,canvas.json}`
- Create: `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md`

**Interfaces:**
- Consumes: canvas `YAjnzs8CsEDpSbwpn5CCuJ`; capturas da UI atual (`npm run dev`, porta 5180, abrir `?layers=fixtures/<nome>/` e fotografar dock, painéis e palco via Chrome).
- Produces: um board por entregável abaixo; o doc de decisões com `Escolha S9.1: V1|V2|V3` e `states × layouts: ortogonal|unificado`.

- [ ] **Step 1:** Subir o app e capturar a UI atual (dock, painel de propriedades, Ajustes, palco explodido e não explodido) como referência de fidelidade.
- [ ] **Step 2:** Despachar o subagente com `model: "opus"` e prompt autossuficiente: canvas a editar, capturas, as duas text-specs, regra de visual congelado e os entregáveis: (a) `Base`: reprodução da UI atual; (b) `S35Menu`: menu de botão direito com camadas L0-Ln, "Explodir daqui"/"Recolher até aqui" e "Requisição"; (c) `S35Requisicao`: entrada em Ajustes (chip com nome/dados/estilos + textarea) e seção "Requisições Manuais"; (d) `S91Fluxos`: V1 stack/abas, V2 espalhado no 3D (foco 1-N), V3 híbrido, com a recomendação marcada e o seletor de layout aparecendo no menu da S3.5; (e) `S91Cobertura`: modelo de cobertura % mono × múltiplos e o caso `states` × layouts (ortogonal vs unificado) com recomendação.
- [ ] **Step 3:** Conferir o canvas publicado pelo `Artifact read` de cada board novo; recusar entregável que altere cor, tipografia ou espaçamento fora do escopo.
- [ ] **Step 4:** Reexportar só os boards novos e `canvas.json`; atualizar tabela Boards e matriz do README (regiões: dock, propriedades, Ajustes, palco, menu de contexto, seletor de layout → board correspondente).
- [ ] **Step 5:** Rodar `npx vitest run test/uiMockCoverage.test.js`. Expected: PASS.
- [ ] **Step 6:** Apresentar os boards ao usuário; gravar em `design-decisions.md` a escolha V1/V2/V3 e a decisão `states` × layouts (com a razão).
- [ ] **Step 7:** Commit `docs(design): add the S3.5 menu and request boards and the S9.1 layout flows`.

---

### Task 5: Skill de manutenção do mock e fechamento da fatia

**Files:**
- Create: `.claude/skills/layers-ui-mock/SKILL.md`
- Create: `changelog.d/docs-261017-0-s3-5-ui-mock.md`
- Modify: `docs/roadmap.md` (S3.5 → `in-progress`, coluna plan → este plano), `docs/roadmap.data.json`
- Modify: memória `project_ui-mock-s3-5.md` (remover o aviso de adiado)

**Interfaces:**
- Consumes: README, `uiMockCoverage.test.js`.

- [ ] **Step 1:** Escrever a skill espelhando `C:\Development\WAVE\.claude\skills\traval-ui-mock\SKILL.md` com os caminhos do Layers: quando usar (mudança visível), localizar board na matriz, editar via `/design` Opus sobre o canvas, reexportar só os boards alterados, atualizar matriz, código, um commit, `npx vitest run test/uiMockCoverage.test.js`; sem canvas, editar `boards/*.dc.html` e republicar.
- [ ] **Step 2:** Escrever o fragmento `changelog.d/docs-261017-0-s3-5-ui-mock.md` com bloco `### Perf` `N/A` (doc/teste, sem efeito em runtime).
- [ ] **Step 3:** Atualizar a row S3.5 e reconstruir o tracker depois de commitar os docs (`python ~/.claude/design/_build_proto.py Layers`).
- [ ] **Step 4:** `npm test`. Expected: tudo PASS.
- [ ] **Step 5:** Commit `docs: add the ui-mock skill, changelog fragment and tracker update`; seguir `branch-lifecycle` (pr-precheck → finishing) e abrir os plan-modes de código `s3-5` e depois `s9-1`.

---

### Task 6: Alinhar os boards ao padrão visual do Layers

**Files:**
- Modify (canvas): `Main`, `Tema`, `Canvas`, `RotuloL0` (padrão do Traval da S2.22c) e `Base` (fidelidade)
- Modify: `docs/design/ui-mock/boards/*.dc.html`, `docs/design/ui-mock/canvas.json`, `docs/design/ui-mock/README.md`

**Interfaces:**
- Consumes: `Base.dc.html` como referência do padrão (motor de tokens com `tema`/`selecao`, cromo dos painéis, cabeçalho de board) e os valores reais de `THEMES`/`ACCENTS`/`SELECTS` em `index.html` e os defaults de `docs/LOCAL-SETUP.md` (tema Gray · 1 Grafite, acento 5 · Cinza médio).
- Produces: README § "Contrato de autoria" com o padrão concreto (tokens, props, cabeçalho, grade de tamanhos); 9 boards no mesmo padrão.

- [ ] **Step 1:** Fixar o padrão no README § Contrato de autoria: motor de tokens copiado do `Base`, props `tema` (Gray · 1 Grafite padrão, Dark, Bright · 1 Papel) e `selecao`, cromo de painel (borda 1px `--line1`, raio 6px, cabeçalho mono caixa-alta 11px), cabeçalho de board (rótulo da leaf + título), tamanhos 960/1240 de largura.
- [ ] **Step 2:** Despachar subagente `model: "opus"` para editar no canvas os 4 boards da S2.22c para o padrão (tokens reais em vez de `#60a5fa`/Dark fixo; conteúdo e decisões da S2.22c intactos; o mock Traval/WAVE dentro dos quadros continua sendo o assunto) e corrigir o `Base` (larguras de painel e logo reais a 1440×900; defaults do app; sem inventar elementos).
- [ ] **Step 3:** Conferir com `Artifact read` cada board alterado; recusar mudança de conteúdo da S2.22c ou de cor/medida fora do padrão.
- [ ] **Step 4:** Reexportar os boards alterados e `canvas.json`; rodar `npx vitest run test/uiMockCoverage.test.js`. Expected: PASS.
- [ ] **Step 5:** Commit `docs(design): align the ui-mock boards to the Layers pattern`.

---

### Task 7: Skill genérica de mock de UI web

**Files:**
- Create: `~/.claude/skills/web-ui-mock/SKILL.md` (global, Tier 2 em `fact-setup-tiers`)
- Modify: `.claude/skills/layers-ui-mock/SKILL.md` (vira perfil fino do projeto)

**Interfaces:**
- Produces: contrato de perfil que cada projeto web declara no README do seu `docs/design/ui-mock/`: URL do canvas, caminho do teste de cobertura, matriz região → board, fonte dos tokens, regra de visual congelado. `traval-ui-mock` (WAVE) não é editada: passa a poder referenciar a skill genérica quando o WAVE quiser.

- [ ] **Step 1:** Verificar sobreposição (`fact-setup-tiers`): `wpf-ui-review` cobre WPF/`.uispec.json`, `traval-ui-mock` é skill de projeto do WAVE; nenhuma cobre web genérica. Veredito Tier 2, sem merge necessário.
- [ ] **Step 2:** Escrever `web-ui-mock/SKILL.md`: quando usar (mudança visível em app web com mock `/design`), passos genéricos (localizar board na matriz, editar via `/design` Opus, reexportar só alterados, atualizar matriz, código e boards no mesmo commit, rodar o teste de cobertura do perfil), seção "Perfil do projeto" com os campos acima e a instrução de criar infra nova (README com Boards/Matriz, `canvas.json`, teste de cobertura nos moldes de `test/uiMockCoverage.test.js`).
- [ ] **Step 3:** Reduzir `layers-ui-mock/SKILL.md` a perfil: aponta para `web-ui-mock` e lista os valores do Layers (canvas, teste, regiões, regra de visual congelado).
- [ ] **Step 4:** `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit do perfil no repo (`docs: make layers-ui-mock a profile of the generic web-ui-mock skill`); a skill global fica em `~/.claude` e o commit lá segue a regra de branch daquele repo (reportar ao usuário se estiver em branch protegida).

---

## Self-review

- Cobertura da spec de sequenciamento: passos 1 (T1), 2 (T2-T3, T5), 3 (T4), 4 (T4 Step 6); passos 5-6 saem como plan-modes seguintes.
- Correção ao plano aprovado: o canvas atual só tem boards do snapshot S2.22c, não da UI do Layers; por isso T4 cria o board `Base` antes dos novos. `S9` é fase nova (macro), não só leaf: o `[!DECISION] phase-intake` abaixo registra isso.
- Branch: T1 vai na branch atual (`docs/261017-0-s9-1-layouts-newlogic-text-spec`, que já carrega as text-specs). T2-T5 vão em `docs/261017-0-s3-5-ui-mock` criada de `develop` após o merge da atual; o fragmento de changelog acima segue esse slug.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| T1 | gen | Standard | Workhorse | texto de rows e config, exige julgamento de formato |
| T2, T3, T5 | gen | Standard | Workhorse | teste, export e skill |
| T4 passo 2 | gen | Architectural | Architect (Opus) | pedido do usuário: `/design` com Opus; decisões de produto |
| T4 passos 1, 3-7 | gen | Standard | Workhorse | captura, conferência, export |
| T6 passo 2 | gen | Architectural | Architect (Opus) | `/design` com Opus (pedido do usuário) |
| T6 passos 1, 3-5; T7 | gen | Standard | Workhorse | padrão no README, conferência, export, skills |
| Revisão pré-merge | review | Architectural | Architect | `adversarial-reviewer` (verifier ≥ generator) |

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — infra de docs/teste e design; as issues de feature nascem nos plan-modes de código de S3.5 e S9.1.

> [!DECISION] phase-intake
> Classificação: S3.5 = meso (leaf de S3); **S9 = macro nova** (Layouts múltiplos) com S9.1 = meso. Correção ao desenho anterior que dizia "sem fase nova". T6 e T7 (pedido de 2026-10-17) entram na S3.5 como parte da fatia da base do mock: sem nova linha no tracker.

> [!DECISION] execution
> Method: **Subagent-driven** (pedido do usuário, para o Atlas mostrar as tasks). Um implementador por task (T6 Opus para o design, T7 Workhorse) e revisor fresco por task; cada `description` de dispatch começa com o token da leaf (`S3.5 Task 6 …`) e cada commit de task leva `(S3.5 Task <id>)`. O plano está ligado às linhas S3.5 e S9.1 do tracker, então as duas leaves o mostram; dispatches de `S9.1 Task <id>` aparecem quando o plano de código da S9.1 existir.
