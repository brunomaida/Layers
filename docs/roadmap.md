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
| S2.12 | 2 | S2 | Aviso de interactions mortas | checklist B; ver spike superficies-latentes (docs/superpowers/reports) | — | — | [](../changelog.d/feature-261013-0-s2-12-dead-interactions.md) | — | done |
| S2.13 | 2 | S2 | Undo/redo global | checklist B | [](superpowers/specs/2026-10-14-s2-13-undo-redo-design.md) | [](superpowers/plans/2026-10-14-s2-13-undo-redo.md) | [](../changelog.d/feature-261014-0-s2-13-undo-redo.md) | — | done |
| S2.14 | 2 | S2 | Persistência de changes pendentes | checklist B; exige decisão própria | [](superpowers/specs/2026-10-14-s2-14-pending-persist-design.md) | [](superpowers/plans/2026-10-14-s2-14-pending-persist.md) | [](../changelog.d/feature-261014-0-s2-14-pending-persist.md) | — | done |
| S2.15 | 2 | S2 | Marcador manual para TS/JS | checklist B | [](superpowers/specs/2026-10-14-s2-15-manual-marker-design.md) | [](superpowers/plans/2026-10-14-s2-15-manual-marker.md) | [](../changelog.d/feature-261014-0-s2-15-manual-marker.md) | — | done |
| S2.16 | 2 | S2 | Fechar findings adiados da revisão do reload | Issue #19 | — | — | [](../changelog.d/fix-261013-19-s2-16-reload-deferred-findings.md) | #19 | done |
| S2.17 | 2 | S2 | Achados restantes da revisão do reload | Follow-up da S2.16 (rollback, retry, dismiss, banner a 1024px) | — | — | [](../changelog.d/fix-261013-32-s2-17-reload-residuals.md) | #32 | done |
| S2.18 | 2 | S2 | Verificação manual da gravação real do template dc | Checkpoint 2026-09-18: gravar via `dcSource` nunca foi verificado à mão (conectar pasta → editar → aprovar → diff) | — | — | — | — | registered |
| S2.19 | 2 | S2 | Limpar códigos dc reservados e avisos do hoistFaces | `UTILITY_SHEET` e `READONLY_ORIGIN` reservados sem uso; ordem dos avisos do `hoistFaces`; `attrNames` | — | [](superpowers/plans/2026-10-14-s2-19-dc-reserved-codes.md) | [](../changelog.d/fix-261014-0-s2-19-dc-reserved-codes.md) | — | done |
| S2.20 | 2 | S2 | Origem autoral obsoleta em data-src corrigida ou descartada | Achado da S5.3: Traval tem 31 de 199 nós com linha que não mostra o seletor; decidir validar `data-src` autoral contra o índice | — | — | [](../changelog.d/fix-261013-0-s2-20-stale-authored-src.md) | — | done |
| S2.21 | 2 | S2 | Reanalisar projeto do 0 com detecção de deriva do layout | Traval mudou e o Layers não percebeu: mock manual e .ts citados não vigiados; backup do layout antes de reler | [](text-specs/2026-10-16-s2-21-restructure-project.md) | [](superpowers/plans/2026-10-16-s2-21-restructure-project.md) | [](../changelog.d/feature-261016-0-s2-21-restructure-project.md) | #57 | done |
| S2.21a | 3 | S2.21 | Remover o Traval como demo fixa do menu Projetos | ↳ Pedido do usuário: o item Exemplos › Traval mostrava um mock fixo e desatualizado; `fixtures/traval` e `?layers=` seguem para testes | — | — | [](../changelog.d/feature-261016-0-s2-21-restructure-project.md) | — | done |
| S2.21b | 3 | S2.21 | Reanalisar do 0 avisa quando o mock não mudou e informa o backup | Traval real: backup feito mas sem feedback; o mock do disco nunca mudou e o aviso voltava a cada carga (#59) | — | — | [](../changelog.d/fix-261016-59-s2-21b-restructure-feedback.md) | #59 | done |
| S2.21c | 3 | S2.21 | CLI de snapshot headless para regenerar o mock | Traval real: Reanalisar do 0 só mostra a UI nova depois de um mock novo; o snapshot por console é manual. Testado: snapshot do app em :5173 + reanálise mostra a UI nova | — | — | [](../changelog.d/feature-261016-0-s2-21c-snapshot-cli.md) | — | done |
| S2.22 | 2 | S2 | Loader captura estados reais do Traval | Workspace e CSV do Traval não aparecem no Layers: snapshot grava só o estado vazio e a cópia de CSS mascara as folhas reais; fatias a–e no design | [](text-specs/2026-10-16-s2-22-loader-checkchanges.md) | [](superpowers/plans/2026-10-16-s2-22a-css-masking.md) | [](../changelog.d/feature-261016-62-s2-22-loader-checkchanges.md) | #62 | in-progress |
| S2.22a | 3 | S2.22 | CSS do snapshot deixa de mascarar as folhas reais | O snapshot copia o CSS das folhas e essa cópia, depois do escopo, ganhava das folhas reais de `styles` | — | [](superpowers/plans/2026-10-16-s2-22a-css-masking.md) | [](../changelog.d/feature-261016-62-s2-22-loader-checkchanges.md) | #62 | done |
| S2.22b | 3 | S2.22 | Múltiplos estados do mock no layers.json e no CLI | Traval só mostra o estado vazio: `states:[{name, mock}]` no manifesto, menu troca o estado e o CLI captura `gallery.html#/<estado>` (G4, G5) | — | [](superpowers/plans/2026-10-16-s2-22b-multi-state.md) | [](../changelog.d/feature-261016-62-s2-22b-multi-state.md) | #62 | done |
| S2.22c | 3 | S2.22 | Fidelidade do snapshot: tema, canvas e rótulo de L0 | `<html>` copiado e `:host([data-theme])` no escopo, `<canvas>` vira `<img data:>` com selo `IMG`, L0 `#app · snapshot` sem `.shell` duplicado (G7, G8, G12); mockup no canvas Design | [](superpowers/specs/2026-10-16-s2-22-loader-checkchanges-design.md) | [](superpowers/plans/2026-10-16-s2-22c-snapshot-fidelity.md) | [](../changelog.d/feature-261016-62-s2-22c-snapshot-fidelity.md) | #62 | done |
| S2.22d | 3 | S2.22 | Deriva em snapshot: globs declarados em `watch` | `layers.json › watch` lista globs de fontes TS/JS; eles entram em `citedSources` com teto e a deriva avisa quando o código muda depois do mock (G3, G10) | [](superpowers/specs/2026-10-16-s2-22-loader-checkchanges-design.md) | [](superpowers/plans/2026-10-16-s2-22d-watch-globs.md) | [](../changelog.d/feature-261016-62-s2-22d-watch-globs.md) | #62 | done |
| S2.22f | 3 | S2.22 | Achados menores da revisão da S2.22c | Filtro de variáveis por allowlist, nome `data-*` validado, `on*` fora do `<html>` do snapshot, `root.name` no próprio L0, L0 de body múltiplo renomeável por `rules`, teto agregado de canvas e captura além de 1000 caracteres | [](superpowers/specs/2026-10-16-s2-22-loader-checkchanges-design.md) | [](superpowers/plans/2026-10-16-s2-22f-snapshot-minors.md) | — | #62 | in-progress |
| S3 | 1 | — | Ferramentas e UI | Checklist C e ferramentas 0.25 | — | — | — | — | in-progress |
| S3.1 | 2 | S3 | Medir, Box Model e Tokens | PR #12 | — | — | [](../changelog.d/archived/0.25.0/feature-260916-v2-24b-tools-reconcile.md) | — | done |
| S3.2 | 2 | S3 | Padrão único de abertura de menus | checklist C; decisão de produto | — | [](superpowers/plans/2026-10-14-s3-2-menu-open-pattern.md) | [](../changelog.d/feature-261014-0-s3-2-menu-open-pattern.md) | — | done |
| S3.3 | 2 | S3 | Tooltips ação e atalho | checklist C | — | — | — | — | registered |
| S3.4 | 2 | S3 | Fonte única de aparência | checklist C | — | — | — | — | registered |
| S4 | 1 | — | Performance | Checklist D; orçamentos scan/orbit | — | — | — | — | in-progress |
| S4.1 | 2 | S4 | contain e will-change só em drag | v2.22 | — | — | — | — | done |
| S4.2 | 2 | S4 | Medição da travessia do scan | Spike da fatia 5 (~2,5 µs/nó); ver spike superficies-latentes (docs/superpowers/reports) | — | — | — | — | done |
| S4.3 | 2 | S4 | Suite de benchmark do core | Disciplina BDN em JS | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | [](../changelog.d/feature-261013-23-s4-3-bench-suite.md) | #23 | done |
| S4.4 | 2 | S4 | Testes de performance de UI | Playwright: scan, orbit e explode | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | [](../changelog.d/feature-261013-23-s4-4-ui-perf-tests.md) | #23 | done |
| S4.4a | 3 | S4.4 | Vitest ignora e2e/ | npm test falhava ao coletar o spec do Playwright | — | — | [](../changelog.d/fix-261013-23-s4-4a-vitest-exclude-e2e.md) | #23 | done |
| S4.4b | 3 | S4.4 | waitForScan ignora rajadas pequenas | Só a última rajada de getComputedStyle era conferida; 40-50 % das execuções completas de perf.spec.js estouravam o timeout | — | — | [](../changelog.d/fix-261014-0-s4-4b-wait-for-scan.md) | — | done |
| S4.5 | 2 | S4 | Culling de planos fora do viewport | checklist D | — | [](superpowers/plans/2026-10-14-s4-5-viewport-culling.md) | [](../changelog.d/feature-261014-0-s4-5-viewport-culling.md) | — | done |
| S4.6 | 2 | S4 | Cache de getComputedStyle por nó | medido-negativo: teto do cache +1,1 %; ver S4.8 | — | [](superpowers/plans/2026-10-14-s4-6-computed-style-cache.md) | [](../changelog.d/feature-261014-0-s4-6-computed-style-cache.md) | — | done |
| S4.7 | 2 | S4 | Árvore virtualizada | checklist D | — | — | — | — | registered |
| S4.8 | 2 | S4 | Custo dos planos no orbit | otherMs 12,3 ms (61 % da tarefa) no orbit padrão e 5,1 ms com zoom (254 de 414 planos cortados): sugere custo por plano visível (inferência de 2 cenários; CDP sem métrica de paint); S4.6 mediu o teto do cache de getComputedStyle em +1,1 % | — | — | — | — | registered |
| S5 | 1 | — | Testes | Checklist E | — | — | — | — | in-progress |
| S5.1 | 2 | S5 | Unit do core (Vitest) | patchCssAt, parseSheet, scopeAst, zip e dc | — | — | — | — | done |
| S5.2 | 2 | S5 | Snapshot de árvore por fixture | checklist E | — | — | [](../changelog.d/feature-261013-35-s5-2-tree-snapshot.md) | #35 | done |
| S5.3 | 2 | S5 | Origem de 30 nós amostrados | checklist E | — | — | [](../changelog.d/feature-261013-35-s5-3-origin-sample.md) | #35 | done |
| S5.4 | 2 | S5 | Escopo todos iguais | checklist E; achou regressão em scopedSelector | — | — | [](../changelog.d/fix-261013-35-s5-4-scope-all-equal.md) | #35 | done |
| S5.5 | 2 | S5 | lineDiff testável | checklist E; extrair de index.html | — | — | [](../changelog.d/refactor-261013-35-s5-5-linediff-core.md) | #35 | done |
| S5.6 | 2 | S5 | E2E Playwright funcional | checklist E; infra nasce em S4.4 | — | [](superpowers/plans/2026-10-14-s5-6-e2e-functional.md) | [](../changelog.d/feature-261014-0-s5-6-e2e-functional.md) | — | done |
| S5.7 | 2 | S5 | Compatibilidade de navegadores | checklist E | — | [](superpowers/plans/2026-10-14-s5-7-browser-compat.md) | [](../changelog.d/feature-261014-0-s5-7-browser-compat.md) | — | done |
| S6 | 1 | — | Segurança | Checklist F | — | — | — | — | in-progress |
| S6.1 | 2 | S6 | Superfície de gravação e ingestão | checklist F, 9 itens | — | — | — | — | done |
| S6.2 | 2 | S6 | Hash no log de gravação | checklist F | — | [](superpowers/plans/2026-10-14-s6-2-write-log-hash.md) | [](../changelog.d/feature-261014-0-s6-2-write-log-hash.md) | — | done |
| S7 | 1 | — | Release e governança | Checklist G e docs do projeto | — | — | — | — | in-progress |
| S7.1 | 2 | S7 | README atualizado | checklist G | — | [](superpowers/plans/2026-10-14-s7-1-readme.md) | [](../changelog.d/docs-261014-0-s7-1-readme.md) | — | done |
| S7.2 | 2 | S7 | CHANGELOG por versão | checklist G | — | — | [](../changelog.d/docs-261013-23-s7-2-changelog-checklist.md) | #23 | done |
| S7.3 | 2 | S7 | Matriz de suporte | checklist G | — | — | — | — | registered |
| S7.4 | 2 | S7 | docs/shortcuts.md | checklist G | — | — | — | — | registered |
| S7.5 | 2 | S7 | Bootstrap do roadmap | Este tracker | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | [](../changelog.d/docs-261013-23-s7-5-roadmap-bootstrap.md) | #23 | done |
| S7.6 | 2 | S7 | CLAUDE.md enxuto | Revisão de duplicatas e fatos stale | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | [](../changelog.d/docs-261013-23-s7-6-claude-md-lean.md) | #23 | done |
| S7.7 | 2 | S7 | Hook pre-push valida o ref de destino | Review S7.6: push HEAD:develop passa; delete de branch estando em develop é recusado | — | — | [](../changelog.d/fix-261013-23-s7-7-pre-push-dest-ref.md) | #23 | done |
| S7.8 | 2 | S7 | Reconciliar contadores, versão e colunas do tracker | Varredura 2026-10-13: contador do checklist, S5.1, package.json, S7.2 e S4.4a fora do tracker | — | — | [](../changelog.d/docs-261013-0-s7-8-tracker-reconcile.md) | — | done |
| S7.8a | 3 | S7.8 | Recontar o contador do checklist após a Onda 1 | Linha 8 dizia 31/3/13; os itens contam 38/1/8 depois de S2.19, S4.5, S5.6, S6.2 e S7.1 | — | — | [](../changelog.d/docs-261014-0-s7-8a-counter-recount.md) | — | done |
| S8 | 1 | — | Trilha MCP e plugin | Ideia gravada no checkpoint de 2026-09-18 | [](superpowers/reports/2026-09-18-wnext-checkpoint-mcp-plugin-track.md) | — | — | — | registered |
| S8.1 | 2 | S8 | Spike de servidor MCP stdio sobre o core | find_rule, get_rule_text, propose_css_patch | — | — | — | — | registered |
| S8.2 | 2 | S8 | Spike Playwright: data-vite-dev-id sobrevive | Apps Vite com React | — | — | — | — | registered |
| S8.3 | 2 | S8 | Snapshot headless (slice 3) | Depende de S8.1 e S8.2 | — | — | — | — | registered |
| S8.4 | 2 | S8 | apply_patch e porta Node de writeText | Modelo de confiança primeiro | — | — | — | — | registered |
| S8.5 | 2 | S8 | Proveniência SPA via data-vite-dev-id | Slice 4 do plano dc; depende de S8.2 | — | — | — | — | registered |
| S8.6 | 2 | S8 | Re-snapshot sem renovar mtimes com changes pendentes | Slice 5 do plano dc; medir antes; depende de S8.3 | — | — | — | — | registered |
