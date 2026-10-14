---
title: "Layers — Roadmap"
type: report
solution: Layers
status: draft
created: 2026-10-13
---

# Layers — Roadmap

Tracker de fases e leaves do Layers. Prioridade de trabalho: checklist B (loader de projeto) → E (testes) → F (segurança) → D (performance), depois C e G; os itens estão no [checklist de release](RELEASE-CHECKLIST.md). Este arquivo é a fonte que o Atlas renderiza (`roadmap.data.json`).

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
| S2.5 | 2 | S2 | Spike de superfícies latentes | PR #7 | — | — | [](../changelog.d/feature-260913-2-spike-superficies-latentes.md) | — | done |
| S2.6 | 2 | S2 | Fixtures reais, lote 1 | PR #9 | — | — | [](../changelog.d/feature-260914-8-fixtures-reais-html-css-js-ts-jsx.md) | #8 | done |
| S2.7 | 2 | S2 | Fixtures reais, lote 2 | PR #11 | — | [](superpowers/plans/2026-09-14-fixtures-reais-batch-2.md) | [](../changelog.d/feature-260914-10-fixtures-reais-batch-2.md) | #10 | done |
| S2.8 | 2 | S2 | Auto-criação de layers.json | PR #14 | — | [](superpowers/plans/2026-09-18-layers-auto-criacao-de-layers-json-quando.md) | [](../changelog.d/feature-260918-13-auto-create-layers-json.md) | #13 | done |
| S2.9 | 2 | S2 | Mapeador de template dc e writer em camadas | PR #16, slices 0-2 | — | [](superpowers/plans/2026-09-18-layers-editar-apps-renderizados-por-js-no.md) | [](../changelog.d/feature-260918-15-dc-template-writer.md) | #15 | done |
| S2.10 | 2 | S2 | Recarregar projeto e banner disco mudou | PR #18 | — | [](superpowers/plans/2026-09-20-layers-spec-recarregar-projeto-banner-disco-mudou.md) | [](../changelog.d/feature-260920-17-project-reload.md) | #17 | done |
| S2.11 | 2 | S2 | Parâmetro ?project= (lançamento pelo Atlas) | PRs #21 e #22 | — | — | [](../changelog.d/feature-260925-project-param.md) | — | done |
| S2.12 | 2 | S2 | Aviso de interactions mortas | checklist B; ver spike superficies-latentes (docs/superpowers/reports) | — | — | — | — | registered |
| S2.13 | 2 | S2 | Undo/redo global | checklist B | — | — | — | — | registered |
| S2.14 | 2 | S2 | Persistência de changes pendentes | checklist B; exige decisão própria | — | — | — | — | registered |
| S2.15 | 2 | S2 | Marcador manual para TS/JS | checklist B | — | — | — | — | registered |
| S2.16 | 2 | S2 | Fechar findings adiados da revisão do reload | Issue #19 | — | — | [](../changelog.d/fix-261013-19-s2-16-reload-deferred-findings.md) | #19 | done |
| S2.17 | 2 | S2 | Achados restantes da revisão do reload | Follow-up da S2.16 (rollback, retry, dismiss, banner a 1024px) | — | — | — | #32 | registered |
| S2.18 | 2 | S2 | Verificação manual da gravação real do template dc | Checkpoint 2026-09-18: gravar via `dcSource` nunca foi verificado à mão (conectar pasta → editar → aprovar → diff) | — | — | — | — | registered |
| S2.19 | 2 | S2 | Limpar códigos dc reservados e avisos do hoistFaces | `UTILITY_SHEET` e `READONLY_ORIGIN` reservados sem uso; ordem dos avisos do `hoistFaces`; `attrNames` | — | — | — | — | registered |
| S2.20 | 2 | S2 | Origem autoral em data-src obsoleta vence a derivada | Achado da S5.3: Traval tem 31 de 199 nós com linha que não mostra o seletor; decidir validar `data-src` autoral contra o índice | — | — | — | — | registered |
| S3 | 1 | — | Ferramentas e UI | Checklist C e ferramentas 0.25 | — | — | — | — | in-progress |
| S3.1 | 2 | S3 | Medir, Box Model e Tokens | PR #12 | — | — | [](../changelog.d/archived/0.25.0/feature-260916-v2-24b-tools-reconcile.md) | — | done |
| S3.2 | 2 | S3 | Padrão único de abertura de menus | checklist C; decisão de produto | — | — | — | — | registered |
| S3.3 | 2 | S3 | Tooltips ação e atalho | checklist C | — | — | — | — | registered |
| S3.4 | 2 | S3 | Fonte única de aparência | checklist C | — | — | — | — | registered |
| S4 | 1 | — | Performance | Checklist D; orçamentos scan/orbit | — | — | — | — | in-progress |
| S4.1 | 2 | S4 | contain e will-change só em drag | v2.22 | — | — | — | — | done |
| S4.2 | 2 | S4 | Medição da travessia do scan | Spike da fatia 5 (~2,5 µs/nó); ver spike superficies-latentes (docs/superpowers/reports) | — | — | — | — | done |
| S4.3 | 2 | S4 | Suite de benchmark do core | Disciplina BDN em JS | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | [](../changelog.d/feature-261013-23-s4-3-bench-suite.md) | #23 | done |
| S4.4 | 2 | S4 | Testes de performance de UI | Playwright: scan, orbit e explode | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | [](../changelog.d/feature-261013-23-s4-4-ui-perf-tests.md) | #23 | done |
| S4.4a | 3 | S4.4 | Vitest ignora e2e/ | npm test falhava ao coletar o spec do Playwright | — | — | [](../changelog.d/fix-261013-23-s4-4a-vitest-exclude-e2e.md) | #23 | done |
| S4.5 | 2 | S4 | Culling de planos fora do viewport | checklist D | — | — | — | — | registered |
| S4.6 | 2 | S4 | Cache de getComputedStyle por nó | checklist D | — | — | — | — | registered |
| S4.7 | 2 | S4 | Árvore virtualizada | checklist D | — | — | — | — | registered |
| S5 | 1 | — | Testes | Checklist E | — | — | — | — | in-progress |
| S5.1 | 2 | S5 | Unit do core (Vitest) | patchCssAt, parseSheet, scopeAst, zip e dc | — | — | — | — | done |
| S5.2 | 2 | S5 | Snapshot de árvore por fixture | checklist E | — | — | [](../changelog.d/feature-261013-35-s5-2-tree-snapshot.md) | #35 | done |
| S5.3 | 2 | S5 | Origem de 30 nós amostrados | checklist E | — | — | [](../changelog.d/feature-261013-35-s5-3-origin-sample.md) | #35 | done |
| S5.4 | 2 | S5 | Escopo todos iguais | checklist E | — | — | — | #35 | registered |
| S5.5 | 2 | S5 | lineDiff testável | checklist E; extrair de index.html | — | — | [](../changelog.d/refactor-261013-35-s5-5-linediff-core.md) | #35 | done |
| S5.6 | 2 | S5 | E2E Playwright funcional | checklist E; infra nasce em S4.4 | — | — | — | — | registered |
| S5.7 | 2 | S5 | Compatibilidade de navegadores | checklist E | — | — | — | — | registered |
| S6 | 1 | — | Segurança | Checklist F | — | — | — | — | in-progress |
| S6.1 | 2 | S6 | Superfície de gravação e ingestão | checklist F, 9 itens | — | — | — | — | done |
| S6.2 | 2 | S6 | Hash no log de gravação | checklist F | — | — | — | — | registered |
| S7 | 1 | — | Release e governança | Checklist G e docs do projeto | — | — | — | — | in-progress |
| S7.1 | 2 | S7 | README atualizado | checklist G | — | — | — | — | registered |
| S7.2 | 2 | S7 | CHANGELOG por versão | checklist G | — | — | [](../changelog.d/docs-261013-23-s7-2-changelog-checklist.md) | #23 | done |
| S7.3 | 2 | S7 | Matriz de suporte | checklist G | — | — | — | — | registered |
| S7.4 | 2 | S7 | docs/shortcuts.md | checklist G | — | — | — | — | registered |
| S7.5 | 2 | S7 | Bootstrap do roadmap | Este tracker | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | [](../changelog.d/docs-261013-23-s7-5-roadmap-bootstrap.md) | #23 | done |
| S7.6 | 2 | S7 | CLAUDE.md enxuto | Revisão de duplicatas e fatos stale | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | [](../changelog.d/docs-261013-23-s7-6-claude-md-lean.md) | #23 | done |
| S7.7 | 2 | S7 | Hook pre-push valida o ref de destino | Review S7.6: push HEAD:develop passa; delete de branch estando em develop é recusado | — | — | [](../changelog.d/fix-261013-23-s7-7-pre-push-dest-ref.md) | #23 | done |
| S7.8 | 2 | S7 | Reconciliar contadores, versão e colunas do tracker | Varredura 2026-10-13: contador do checklist, S5.1, package.json, S7.2 e S4.4a fora do tracker | — | — | [](../changelog.d/docs-261013-0-s7-8-tracker-reconcile.md) | — | done |
| S8 | 1 | — | Trilha MCP e plugin | Ideia gravada no checkpoint de 2026-09-18 | [](superpowers/reports/2026-09-18-wnext-checkpoint-mcp-plugin-track.md) | — | — | — | registered |
| S8.1 | 2 | S8 | Spike de servidor MCP stdio sobre o core | find_rule, get_rule_text, propose_css_patch | — | — | — | — | registered |
| S8.2 | 2 | S8 | Spike Playwright: data-vite-dev-id sobrevive | Apps Vite com React | — | — | — | — | registered |
| S8.3 | 2 | S8 | Snapshot headless (slice 3) | Depende de S8.1 e S8.2 | — | — | — | — | registered |
| S8.4 | 2 | S8 | apply_patch e porta Node de writeText | Modelo de confiança primeiro | — | — | — | — | registered |
| S8.5 | 2 | S8 | Proveniência SPA via data-vite-dev-id | Slice 4 do plano dc; depende de S8.2 | — | — | — | — | registered |
| S8.6 | 2 | S8 | Re-snapshot sem renovar mtimes com changes pendentes | Slice 5 do plano dc; medir antes; depende de S8.3 | — | — | — | — | registered |
