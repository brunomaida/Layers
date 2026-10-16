---
title: "S2.22 — Loader checkchanges: Layers absorve os estados reais do Traval"
type: spec
solution: Layers
status: draft
created: 2026-10-16
---

# S2.22 — Loader checkchanges: Layers passa a absorver os estados reais do Traval

## Context

Spec: `docs/text-specs/2026-10-16-s2-22-loader-checkchanges.md`. O usuário não consegue configurar workspace nem carregar arquivos do Traval pelo Layers.
Resultado da varredura (Opus): o loader funciona; o Layers **nunca executa código do app alvo** (ADR 2026-09-18, `docs/architecture-decisions.md:21-27`).
Ele só exibe um **mock estático**. `tools/layers-snapshot-cli.mjs:55-64` sempre grava o estado **vazio** do Traval (perfil novo, sem workspace nem CSV),
o mock tem 0 `data-src` (a deriva nunca enxerga `workspace*.ts`) e a cópia de CSS do snapshot mascara as folhas reais (o ajuste aplicado some após Recarregar).

Decisões do usuário: abordagem **B (captura de estados)**; estados vêm da **gallery do Traval**; **G1/G2/G9 primeiro**; deriva vigia uma **lista declarada no `layers.json`**.

## Design: Architecture & Flows

Macro: ferramentas do Layers (CLI + loader) mais a gallery do Traval como fonte de estados. O Layers continua sem rodar código do Traval; só lê o DOM capturado.

### Topology (macro)

```
┌─────────────────────────┐   gallery.html#/<state>   ┌──────────────────────────┐
│ Traval (repo WAVE)      │ ◀──────── goto ────────── │ tools/layers-snapshot-   │
│ src/gallery/states.ts   │                           │ cli.mjs  (--state)       │
│ (store semeado)         │ ───── snapshot do DOM ──▶ │ Chromium headless        │
└─────────────────────────┘                           └────────────┬─────────────┘
                                                                   │ writeText
                                                                   ▼
                          ┌─────────────────────────────────────────────────────┐
                          │ traval/layers/mock.<state>.html + layers.json       │
                          │   states:[{name,mock}]  watch:[globs]  styles:[7]   │
                          └────────────────────────────┬────────────────────────┘
                                                       │ loadProject
                                                       ▼
                          ┌─────────────────────────────────────────────────────┐
                          │ Layers index.html: escolhe estado ─▶ buildProject-  │
                          │ FromHtml; remove CSS do snapshot já coberto por     │
                          │ styles ─▶ shadow root; probeLayout: watch ─▶ banner │
                          └─────────────────────────────────────────────────────┘
```

### Flow: ajuste sobrevive ao Recarregar (S2.22a)

```
Aplicar ─▶ grava folha real ─▶ Recarregar ─▶ staleKind
   mock é snapshot? ─sim─▶ 'layout' ─▶ Reanalisar do 0
   loader: bloco do snapshot com origem ∈ styles[] ─▶ descartado ─▶ folha real vence
```

## Implementation Outline

Cada passo vira leaf e branch próprias; `npm test` verde antes de cada commit.

- **S2.22a** — corrigir mascaramento de CSS → snapshot rotula cada bloco CSS com a origem (`data-vite-dev-id` do `ownerNode`); loader descarta blocos cobertos por `styles`; `staleKind` devolve `layout` para mock de snapshot; aviso de interações mortas aparece antes do aviso do `href` remoto (G1, G2, G9).
- **S2.22b** — múltiplos estados → `states:[{name, mock}]` no `layers.json`; CLI com `--url`/`--state` apontando para `gallery.html#/<state>`; menu troca o estado e recarrega as camadas (G4, G5).
- **S2.22c** — fidelidade do snapshot → copiar `<html>` (`data-theme`, variáveis inline), converter `<canvas>` em `<img data:>`, rótulo de L0 coerente (G7, G8, G12).
- **S2.22d** — deriva em snapshot → globs declarados em `watch` alimentam `LayersCore.citedSources` com teto de arquivos; `layers.json` do Traval lista as 7 folhas (G3, G10).
- **S2.22e** — ação `attr` em `interactions` para `data-dock`, `data-collapsed`, `aria-*` (G6).
- **Fora deste repo (WAVE, skill `traval-ui-mock`)** — novos estados na gallery (`workspace-configured`, `csv-loaded`, `settings-open`, `workspace-menu-open`) em `src/gallery/states.ts:66-151`; reescrever as `interactions` do Traval no vocabulário do snapshot. Depende da S2.22b.

## Escopo e limites de fidelidade

Resposta às notas da revisão r00 (seção Implementation Outline).

**1. As correções trocam o interpretador ou estendem o atual?** Estendem. Parser de CSS (css-tree), `buildProjectFromHtml` e sanitizador continuam; nenhum interpretador novo.

| Fatia | Produtor (snapshot/CLI) | Loader / motor de interação | Natureza |
|---|---|---|---|
| S2.22a | rótulo de origem por bloco CSS | passo novo de dedupe antes de montar o CSS do snapshot; regra nova em `staleKind` | extensão |
| S2.22b | `--state` / `--url` no CLI | leitura de `states` no manifesto e escolha do mock | extensão |
| S2.22c | copia `<html>`, canvas → `<img data:>` | aplica os atributos de `<html>` ao host do shadow root; `scopeAst` passa a emitir `:host([data-theme='light'])` | extensão (ver § Decisões da S2.22c) |
| S2.22d | — | `citedSources` lê `watch` | extensão |
| S2.22e | — | ação `attr` no motor de interações | extensão |

**2. Há fidelidade de execução e carga de dados pelas interações? Não.** O mock é DOM estático: scripts e `on*` são removidos (`index.html:985-990`) e as interações só fazem `toggle`/`show`/`hide`/`class`/`click` nativo (`index.html:2237-2239`).

| Capacidade | Depois da S2.22 |
|---|---|
| Ver a UI com workspace configurado e CSV carregado | Sim, como estado pré-capturado (S2.22b + gallery) |
| Editar CSS desses estados e ver o resultado fiel | Sim (S2.22a, c) |
| Alternar painéis e estados `data-*`/`aria-*` | Sim (S2.22e) |
| Carregar um CSV do usuário ou escolher pasta de workspace dentro do Layers | **Não** (handlers removidos, picker exige gesto no app real) |
| Gráfico atualizar com dados novos | **Não** (canvas vira imagem congelada) |
| Menus/diálogos criados sob demanda | Só se existirem como estado da gallery |

Resultado: o objetivo "interface carrega dados e atualiza painéis" é atingido **visualmente** (estados reais capturados), não **comportamentalmente**. Para executar ações reais seria a Opção C (ponte headless viva): custo alto, exige revisar a ADR e as regras R1 de segurança; fica fora da S2.22 e pode virar leaf futura.

## Decisões da S2.22c

Mockup: canvas Design privado (https://claude.ai/artifact/YAjnzs8CsEDpSbwpn5CCuJ; quadros Main, Tema, Canvas, RotuloL0). Mapeamento confirmado: G7 = tema, G8 = canvas, G12 = rótulo de L0.

| Id | Decisão | Efeito |
|---|---|---|
| D1 | Selo `IMG` no slot de badge da linha da árvore, mais `title` nativo | Nada é desenhado sobre o mock; o toast da carga não muda, para manter o aviso de interações mortas como `warn[0]` (S2.22a) |
| D2 | Rótulo de L0 `#app · snapshot`; origem da captura (URL, data, viewport) no `title` | `root.name`/`root.src` passam para o `.shell` real em L1 |
| D3 | Manter `SELECTS` como está | Sem cor de seleção alternativa para mock claro; atualizar o comentário de `index.html:942` ("o mock é sempre escuro") |

Achados do repo que ampliam o escopo:

- `scopeAst` (`lib/layers-core.js:271-272`) troca só o `:root` do seletor: `:root[data-theme='light']` vira `:host[data-theme='light']`, que nunca casa no shadow DOM. Deve emitir `:host([data-theme='light'])`. As variáveis inline no host funcionam sem essa mudança.
- No mock do WAVE (`WAVE/src/ui/traval/layers/mock.html`) o único filho do `<body>` é `#app`, mas `index.html:1028` aplica a ele `root.name ".shell"`: `.shell` aparece em L0 e em L1 e `root.src` aponta para o elemento errado (causa da G12).
- O mock tem 7 `<canvas>` de lightweight-charts (808×652, eixo 56 px, eixo 28 px) que viram 7 PNG em `data:` num arquivo de 170 KB. Definir teto de tamanho no plano.
- Não há estado claro na gallery do Traval; a demo do tema claro depende de um estado novo fora deste repo.

## Critical Files

- `tools/layers-snapshot.js:8,11,22-24` — origem do CSS, canvas e atributos de `<html>` no snapshot.
- `tools/layers-snapshot-cli.mjs:26-64` — argumentos de estado/URL.
- `lib/layers-core.js:522-531,546-550` — `citedSources`, `staleKind`; novos helpers puros para dedupe de CSS e parse de `states`.
- `index.html:985-1017,1264,1282-1329,2231-2240` — sanitizador, escolha do mock, avisos/toast da carga, ações de interação (editar com âncoras únicas).
- `docs/layers-json.md`, `docs/ARCHITECTURE.md`, `docs/RELEASE-CHECKLIST.md`, `docs/roadmap.md`, `changelog.d/<slug>.md` — docs e fechamento.
- Intocados: `support.js` (gerado), visual congelado, CSP; `fixtures/traval` fica congelado (só regressão, G13).

## Verification

- Unit (Vitest, `Metodo_Cenario_Esperado`): dedupe de bloco CSS por origem, `staleKind` em mock de snapshot, `citedSources` com globs declarados, parse de `states`, ação `attr`.
- E2E (Playwright, gate manual): fixture com mock de snapshot — editar CSS, Aplicar, Recarregar e o ajuste permanece; troca de estado; aviso de interação morta visível.
- Manual no Traval real: rodar o CLI por estado da gallery, conectar `WAVE/src/ui/traval`, ver workspace/CSV no mock, banner de deriva ao editar `workspace*.ts`; DevTools → Network sem requisições fora de `localhost:5180`.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| S2.22a, S2.22b, S2.22c, S2.22d, S2.22e. lógica de loader/CLI e testes | gen | Standard | Workhorse | código com julgamento e autoria de testes |
| Estados da gallery no WAVE | gen | Standard | Workhorse | design novo de store semeado em outro repo |
| Revisão por fatia da S2.22a (precedência de CSS, semântica da deriva) | review | Architectural | Architect | regra 5, custo de erro alto |
| Pre-merge review | review | Architectural | Architect | verificador ≥ gerador |

Executor: none — todo passo exige julgamento ou autoria de testes.

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — capacidade visível ao usuário, em várias fatias e dois repositórios.
> Draft to be created (via `gh-issue-gate`):
> - **Title**: `feat: capture real Traval states in the Layers loader (S2.22)` (≤72 chars)
> - **Labels**: enhancement
> - **Milestone**: (none)
> - **Body**: Contexto: o Layers mostra só o estado vazio do Traval e uma cópia de CSS mascara as folhas reais. Proposta: fatias S2.22a-e (dedupe de CSS, múltiplos estados, fidelidade do snapshot, deriva declarada, ação `attr`). Critérios de aceite: ajustes sobrevivem ao Recarregar em mock de snapshot; estados trocam pelo menu; deriva dispara nas fontes declaradas; `npm test` verde.

> [!DECISION] phase-intake
> Classification: **meso** `S2.22` sob **S2 leitura de projeto/loader**, fatias **micro** `S2.22a`–`S2.22e`, alvo **Unreleased**.
> Current tree (relevant slice): Unreleased › S2 › S2.21 (done) › S2.21a-c (done).
> Fork of an existing row? **No** (novo meso irmão).
> - **Option A**: meso S2.22 com fatias micro a–e (recomendada)
> - **Option B**: uma leaf S2.22 sem fatias (branch única grande)

> [!DECISION] execution
> Method: **Subagent-driven** (fatias independentes após a S2.22a; sem linhas Mechanical).
