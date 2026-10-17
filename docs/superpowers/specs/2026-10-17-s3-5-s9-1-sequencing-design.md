---
title: "S3.5 × S9.1 — ordem, fusão e mock /design"
type: spec
solution: Layers
status: draft
created: 2026-10-17
---

# S3.5 × S9.1 — ordem, fusão e mock /design

## Contexto

Duas text-specs de layout sem linha no tracker: `docs/text-specs/2026-10-16-s3-5-visual-functions-new.md` (menu de botão direito: "Explodir daqui" / "Recolher até aqui" / "Requisição" → painel Ajustes) e `docs/text-specs/2026-10-17-s9-1-layouts-newlogic.md` (múltiplos layouts, stack/3D espacial, funções por layout, modelo de cobertura %). Ambas exigem mock com `/design` (Opus) antes do plan-mode. A memória `project_ui-mock-s3-5` já reserva a S3.5 para criar a cópia local do mock (`docs/design/ui-mock/`), que hoje **não existe** (`docs/design/` vazio).

## Design: Architecture & Flows

```
 canvas Design (privado)                    repo Layers
 ┌──────────────────────┐  Artifact read   ┌──────────────────────────────┐
 │ Main/Tema/Canvas/... │ ───────────────► │ docs/design/ui-mock/         │
 │ + boards S3.5 / S9.1 │ ◄─────────────── │   boards/*.dc.html           │
 └──────────▲───────────┘  /design (Opus)  │   canvas.json  README.md     │
            │                              └──────────────┬───────────────┘
            │ edita board vivo                            │ matriz + teste de cobertura
            │                                             ▼
   [Opus subagente] ◄── specs S3.5 + S9.1        leaf s3-5 ─► leaf s9-1
```

> [!DECISION] phase-intake
> Classificação: S3.5 = meso, S9.1 = meso; ambas viram leaves novas no tracker (sem fase nova). Infra do mock = 1ª fatia da S3.5.

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — este plano só sequencia o trabalho e cria a infra do mock; as issues de feature nascem por leaf (S3.5, S9.1) no `gh-issue-gate` após o design aprovado.

## Model Routing

| Passo | Tier | Modelo |
|---|---|---|
| 1 leaf/roadmap rebuild | Mechanical | `executor` (Haiku) |
| 2 export boards + skill + teste | Workhorse | Sonnet |
| 3 `/design` dos boards S3.5 + S9.1 | Architect | Opus (pedido do usuário) |
| 4 conflito `states` × layouts | Architect | Opus |
| 5 plan-mode por leaf | Workhorse (revisão Architect) | Sonnet + `adversarial-reviewer` |
| 6 código | Workhorse | Sonnet |

## Achados

| Ponto | Evidência | Efeito |
|---|---|---|
| Base local do mock inexistente | `docs/design/**` sem arquivos; mock só no canvas Design `https://claude.ai/artifact/YAjnzs8CsEDpSbwpn5CCuJ` (Main, Tema, Canvas, RotuloL0, canvas.json) | Pré-requisito comum das duas |
| `layers.json › states` já existe | ARCHITECTURE § Estados do mock: 1 mock por estado, `switchState` relê o projeto do zero | S9.1 colide: "layouts" ≠ "estados"; precisa decidir relação (layout = tela distinta vs estado = variação da mesma tela) |
| S3.5 "Explodir daqui" é por componente | spec S3.5 item 1 | S9.1 precisa dele escopado por layout (explosão não atravessa layouts) |
| S3.5 "Requisição" "conectada com o layout selecionado" | spec S3.5 Objetivo | Requisição guarda `layoutId`; depende do modelo de layout da S9.1 |
| S9.1 "funções atreladas ao layout" | spec S9.1 Escopo | Mesmas ações da S3.5 viram per-layout (seleção, explosão, requisições, pendentes) |
| `ajustes pendentes` chaveados por `pendingKey` + hash do mock | ARCHITECTURE linha 86 | Multi-layout muda a chave (layout entra no hash) |

## Recomendação

**Um único passo de design, dois ramos de código, S3.5 antes de S9.1.**

```
 [infra mock local]  ─►  [/design Opus: boards S3.5 + S9.1 juntos]
        │                              │
        ▼                              ▼
   leaf s3-5  (código)  ─────────►  leaf s9-1 (código)
   menu ctx + Requisição            multi-layout + escopo por layout
   (single layout, sem risco)       (reaproveita menu/Requisição)
```

| Opção | Prós | Contras | Veredito |
|---|---|---|---|
| A. Uma branch só | Menos overhead | S9.1 é meso com modelo de cobertura, stack 3D, perf (memória); S3.5 é pequena e entregável; PR gigante, review fraco, regressão difícil de isolar | Não |
| B. S9.1 primeiro | Define layout, S3.5 já nasce per-layout | S9.1 grande/arriscada; S3.5 vira refator | Não |
| **C. Design conjunto + S3.5 código → S9.1 código** | Mocks coerentes (menu já mostra o seletor de layout), S3.5 entrega valor cedo, S9.1 estende ações já prontas | Dois ciclos de PR | **Recomendada** |

Regra de acoplamento a fixar no design: toda ação da S3.5 recebe `layoutId` opcional (default = único layout), assim a S3.5 não precisa saber da S9.1.

## Passos

1. **Branch/leaf (gate)**: `branch-lifecycle`; reservar leaf `S3.5` e `S9.1` em `docs/roadmap.md` + `docs/roadmap.config.json` (rebuild) como primeiro commit; branch atual `docs/261017-0-s9-1-...` só carrega a text-spec. → verify: `roadmap` rebuild sem erro.
2. **Infra do mock local (leaf S3.5, 1ª fatia)**: exportar boards do canvas Design com `Artifact read` → `docs/design/ui-mock/boards/*.dc.html` + `canvas.json` + `README.md` (matriz módulo→board, contrato de autoria) + skill de projeto `layers-ui-mock` + teste de cobertura (`test/uiMockCoverage.test.js`), espelhando `C:\Development\WAVE\.claude\skills\traval-ui-mock\SKILL.md`. → verify: `npm test` verde.
3. **Design conjunto (Opus)**: subagente `model: "opus"` com `/design` sobre o canvas `YAjnzs8CsEDpSbwpn5CCuJ`, editando os boards existentes (não criar mock novo). Entregáveis:
   - S3.5: menu de botão direito (camadas L0-Ln, "Explodir daqui" / "Recolher até aqui"), entrada "Requisição" no painel Ajustes (chip + textarea) e seção "Requisições Manuais".
   - S9.1: 3 fluxos para decisão, com recomendação marcada:
     - V1 Stack/abas no painel principal (um layout por vez).
     - V2 Layouts separados espacialmente no 3D (todos visíveis, foco 1-N).
     - V3 Híbrido: stack + modo "espalhar" configurável (**provável recomendada**: cobre os dois requisitos da spec).
   - Quadro do modelo de cobertura % (mono vs múltiplos layouts).
   → verify: boards exportados de volta, matriz do README atualizada.
4. **Resolver conflito `states` × layouts** (no design, antes do plan): decidir se `states` vira subtipo de layout ou segue ortogonal. Pergunta ao usuário se o design não resolver.
5. **Plan-mode por leaf** (`writing-plans`, Model Routing): primeiro `s3-5`, depois `s9-1`; `gh-issue-gate` após aprovação da spec.
6. **Código**: S3.5 → merge → S9.1. Visual congelado: só o que o mock aprovar muda; sem rede; estilo inline.

## Arquivos críticos

- `docs/text-specs/2026-10-16-s3-5-visual-functions-new.md`, `docs/text-specs/2026-10-17-s9-1-layouts-newlogic.md` (specs; pode precisar de correção do conflito `states`)
- `docs/roadmap.md`, `docs/roadmap.config.json` (leaves)
- `docs/design/ui-mock/**` (novo), `.claude/skills/layers-ui-mock/SKILL.md` (novo), `test/uiMockCoverage.test.js` (novo)
- `docs/ARCHITECTURE.md` (§ Estados do mock; novo § Layouts na S9.1)
- `index.html`, `lib/layers-core.js` (só na fase de código, não agora)

## Verificação

- Infra: `npm test` passa, teste de cobertura falha ao remover um board da matriz.
- Design: boards S3.5 + S9.1 renderizam no canvas; o usuário escolhe V1/V2/V3 antes do plan-mode.
- E2E/perf da S9.1 (fase de código): `npm run test:e2e` com fixture multi-layout; orçamento de memória em `docs/RELEASE-CHECKLIST.md § D`.

## Decisões do usuário (2026-10-17)

1. Opção C aprovada: design conjunto, dois ramos (S3.5 código → S9.1 código).
2. `states` × layouts: o `/design` apresenta ortogonal vs unificado e traz a recomendação antes do plan-mode.
