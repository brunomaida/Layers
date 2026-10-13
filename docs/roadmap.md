---
title: "Layers — Roadmap"
type: report
solution: Layers
status: draft
created: 2026-10-13
---

# Layers — Roadmap

Tracker de fases e leaves do Layers. A ordem de prioridade do trabalho vem das seções do [checklist de release](RELEASE-CHECKLIST.md); este arquivo é a fonte que o Atlas renderiza (`roadmap.data.json`).

| id | level | parent | title | reason | spec | plan | report | issue | status |
|---|---|---|---|---|---|---|---|---|---|
| S1 | 1 | — | Baseline e setup | Repo, fontes/React versionados, baseline sem projeto embutido | — | — | — | — | done |
| S1.1 | 2 | S1 | Setup do repo e recursos versionados | checklist A | — | — | [](../changelog.d/setup-260912-project-setup.md) | — | done |
| S1.2 | 2 | S1 | Histórico de projetos (0.23) | Dropdown de projetos recentes | — | — | [](../changelog.d/archived/0.23.0/feature-260912-v2-23-project-history.md) | — | done |
| S1.3 | 2 | S1 | Baseline sem projeto embutido (0.24) | Mock do Traval removido | — | — | [](../changelog.d/archived/0.24.0/feature-260912-v2-24-baseline-loader.md) | — | done |
| S2 | 1 | — | Loader de projeto | Abrir e editar projetos reais (checklist B) | — | — | — | — | in-progress |
| S2.1 | 2 | S2 | Loader layers.json e rede zero | PR #3 | — | — | [](../changelog.d/feature-260912-2-loader-baseline-rede-zero.md) | — | done |
| S2.2 | 2 | S2 | Motor CSS por AST | PR #4 | — | — | [](../changelog.d/feature-260913-2-motor-css-ast.md) | — | done |
| S2.3 | 2 | S2 | Ingestão de .zip e GitHub | PR #5 | — | — | [](../changelog.d/feature-260913-2-ingestao-zip-github.md) | — | done |
| S2.4 | 2 | S2 | Persistência layers/v1 | PR #6 | — | — | [](../changelog.d/feature-260913-2-persistencia-layers-v1.md) | — | done |
| S2.5 | 2 | S2 | Spike de superfícies latentes | PR #7 | [](superpowers/reports/2026-09-13-spike-superficies-latentes.md) | — | [](../changelog.d/feature-260913-2-spike-superficies-latentes.md) | — | done |
| S2.6 | 2 | S2 | Fixtures reais, lote 1 | PR #9 | — | — | [](../changelog.d/feature-260914-8-fixtures-reais-html-css-js-ts-jsx.md) | #8 | done |
| S2.7 | 2 | S2 | Fixtures reais, lote 2 | PR #11 | — | [](superpowers/plans/2026-09-14-fixtures-reais-batch-2.md) | [](../changelog.d/feature-260914-10-fixtures-reais-batch-2.md) | #10 | done |
| S2.8 | 2 | S2 | Auto-criação de layers.json | PR #14 | — | [](superpowers/plans/2026-09-18-layers-auto-criacao-de-layers-json-quando.md) | [](../changelog.d/feature-260918-13-auto-create-layers-json.md) | #13 | done |
| S2.9 | 2 | S2 | Mapeador de template dc e writer em camadas | PR #16, slices 0-2 | — | [](superpowers/plans/2026-09-18-layers-editar-apps-renderizados-por-js-no.md) | [](../changelog.d/feature-260918-15-dc-template-writer.md) | #15 | done |
| S2.10 | 2 | S2 | Recarregar projeto e banner disco mudou | PR #18 | — | [](superpowers/plans/2026-09-20-layers-spec-recarregar-projeto-banner-disco-mudou.md) | [](../changelog.d/feature-260920-17-project-reload.md) | #17 | done |
| S2.11 | 2 | S2 | Parâmetro ?project= (lançamento pelo Atlas) | PR #21 | — | — | [](../changelog.d/feature-260925-project-param.md) | — | done |
| S2.12 | 2 | S2 | Aviso de interactions mortas | checklist B L27 | [](superpowers/reports/2026-09-13-spike-superficies-latentes.md) | — | — | — | registered |
| S2.13 | 2 | S2 | Undo/redo global | checklist B L28 | — | — | — | — | registered |
| S2.14 | 2 | S2 | Persistência de changes pendentes | checklist B L29; exige decisão própria | — | — | — | — | registered |
| S2.15 | 2 | S2 | Marcador manual para TS/JS | checklist B L30 | — | — | — | — | registered |
| S3 | 1 | — | Ferramentas e UI | Checklist C e ferramentas 0.25 | — | — | — | — | in-progress |
| S3.1 | 2 | S3 | Medir, Box Model e Tokens | PR #12 | — | — | [](../changelog.d/archived/0.25.0/feature-260916-v2-24b-tools-reconcile.md) | — | done |
| S3.2 | 2 | S3 | Padrão único de abertura de menus | checklist C L37; decisão de produto | — | — | — | — | registered |
| S3.3 | 2 | S3 | Tooltips ação e atalho | checklist C L38 | — | — | — | — | registered |
| S3.4 | 2 | S3 | Fonte única de aparência | checklist C L39 | — | — | — | — | registered |
| S4 | 1 | — | Performance | Checklist D; orçamentos scan/orbit | — | — | — | — | in-progress |
| S4.1 | 2 | S4 | contain e will-change só em drag | v2.22 | — | — | — | — | done |
| S4.2 | 2 | S4 | Medição da travessia do scan | Spike da fatia 5 (~2,5 µs/nó) | [](superpowers/reports/2026-09-13-spike-superficies-latentes.md) | — | — | — | done |
| S4.3 | 2 | S4 | Suite de benchmark do core | Disciplina BDN em JS | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | — | #23 | in-progress |
| S4.4 | 2 | S4 | Testes de performance de UI | Playwright: scan, orbit e explode | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | — | #23 | registered |
| S4.5 | 2 | S4 | Culling de planos fora do viewport | checklist D L44 | — | — | — | — | registered |
| S4.6 | 2 | S4 | Cache de getComputedStyle por nó | checklist D L45 | — | — | — | — | registered |
| S4.7 | 2 | S4 | Árvore virtualizada | checklist D L46 | — | — | — | — | registered |
| S5 | 1 | — | Testes | Checklist E | — | — | — | — | in-progress |
| S5.1 | 2 | S5 | Unit do core (Vitest, 128 casos) | patchCssAt, parseSheet, scopeAst, zip e dc | — | — | — | — | done |
| S5.2 | 2 | S5 | Snapshot de árvore por fixture | checklist E L57 | — | — | — | — | registered |
| S5.3 | 2 | S5 | Origem de 30 nós amostrados | checklist E L58 | — | — | — | — | registered |
| S5.4 | 2 | S5 | Escopo todos iguais | checklist E L60 | — | — | — | — | registered |
| S5.5 | 2 | S5 | lineDiff testável | checklist E L61; extrair de index.html | — | — | — | — | registered |
| S5.6 | 2 | S5 | E2E Playwright funcional | checklist E L62; infra nasce em S4.4 | — | — | — | — | registered |
| S5.7 | 2 | S5 | Compatibilidade de navegadores | checklist E L63 | — | — | — | — | registered |
| S6 | 1 | — | Segurança | Checklist F | — | — | — | — | in-progress |
| S6.1 | 2 | S6 | Superfície de gravação e ingestão | checklist F, 9 itens | — | — | — | — | done |
| S6.2 | 2 | S6 | Hash no log de gravação | checklist F L75 | — | — | — | — | registered |
| S7 | 1 | — | Release e governança | Checklist G e docs do projeto | — | — | — | — | in-progress |
| S7.1 | 2 | S7 | README atualizado | checklist G L80 | — | — | — | — | registered |
| S7.2 | 2 | S7 | CHANGELOG por versão | checklist G L81 | — | — | — | — | registered |
| S7.3 | 2 | S7 | Matriz de suporte | checklist G L82 | — | — | — | — | registered |
| S7.4 | 2 | S7 | docs/shortcuts.md | checklist G L83 | — | — | — | — | registered |
| S7.5 | 2 | S7 | Bootstrap do roadmap | Este tracker | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | [](../changelog.d/docs-261013-23-s7-5-roadmap-bootstrap.md) | #23 | done |
| S7.6 | 2 | S7 | CLAUDE.md enxuto | Revisão de duplicatas e fatos stale | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | [](../changelog.d/docs-261013-23-s7-6-claude-md-lean.md) | #23 | done |
| S8 | 1 | — | Trilha MCP e plugin | Ideia gravada no checkpoint de 2026-09-18 | [](superpowers/reports/2026-09-18-wnext-checkpoint-mcp-plugin-track.md) | — | — | — | registered |
| S8.1 | 2 | S8 | Spike de servidor MCP stdio sobre o core | find_rule, get_rule_text, propose_css_patch | — | — | — | — | registered |
| S8.2 | 2 | S8 | Spike Playwright: data-vite-dev-id sobrevive | Apps Vite com React | — | — | — | — | registered |
| S8.3 | 2 | S8 | Snapshot headless (slice 3) | Depende de S8.1 e S8.2 | — | — | — | — | registered |
| S8.4 | 2 | S8 | apply_patch e porta Node de writeText | Modelo de confiança primeiro | — | — | — | — | registered |
