---
adr: none
---

### Fixed
- Aprovar e Descartar só aparecem depois que o rascunho paralelo foi gravado, e agem só em rascunhos que a execução atual gravou; um rascunho editado à mão que a execução atual não gravou nunca é promovido nem apagado, e fechar e reabrir o modal no meio da gravação não deixa rascunho órfão.
- Cobertura: o 2º clique em Analisar cobertura não dispara outra varredura, o aviso `projeto ainda carregando` some quando a carga termina e, com o modal aberto, as teclas de câmera e `?` não agem por baixo. O prompt de escopo flutuante não prende mais o teclado.
- Projeto com 2+ layouts: o badge de Salvar, Ver diff e Exportar contam as pendências de todos os layouts, e os retratos LOD do Espalhar são relidos depois de Aplicar e Reverter.
- Um `/` inicial ou `..` no caminho do mock resolvem igual na Cobertura e no loader (`LayersCore.normalizePath`); um `\` no `base` do `layers.json` é normalizado só na Cobertura (limite 10 parcial).

### Changed
- Limites fechados ficam marcados Fechado no ARCHITECTURE; os aceitos do ciclo do rascunho entram numerados. Decisões abertas da S9.1 fechadas (regra 4 da Cobertura, chip ativo, aviso de varredura parcial).

### Tests
- Vitest: 694 testes (7 novos). Playwright, um spec por vez: `apply-flow` 108, `spread` 119, `layouts` 65, `coverage` 22, `coverage-modal` 19, `autocreate` 7, `scope-all-equal` 9, `undo-redo` 8, `dc-write` 4, `stale-banner` 4. Varredura manual em fixture: 17 ok, 0 bug, 7 pendentes de pasta conectada (RELEASE-CHECKLIST § C).

### Perf
- N/A — correções de fluxo e de teclas sem mudança na cena nem no orbit; `perf.spec` não rodou e o custo medido na S9.1d vale.
