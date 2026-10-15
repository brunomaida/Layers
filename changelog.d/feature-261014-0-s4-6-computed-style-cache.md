---
adr: none
---

### Added
- `e2e/perf.spec.js`: tempo de main thread por frame no orbit (task, script, style, layout via CDP `Performance.getMetrics`), chamadas de `getComputedStyle` por frame e os limites superiores `orbit/traval-gcs-ideal/mean-frame-ms` e `orbit/traval-panel-ideal/mean-frame-ms`. Nenhum cache foi entregue: a medição mostrou que ele não reduz o frame do orbit (S4.6 fechada como medido-negativo; lacuna encaminhada para a S4.8).

### Perf
- measured — orbit Traval, vista padrão: 42,0 fps (23,8 ms/frame, p95 35,8 ms); limite superior com toda leitura de estilo memoizada: 24,1 ms/frame (painel inteiro: 23,9 ms/frame); mediana de 3 execuções, Chromium 153.0.8010.12, i7-12700.
- measured — main thread por frame no orbit padrão: task 20,3 ms, script 7,7 ms, style 0,17 ms, layout 0,06 ms, outros 12,3 ms; lacuna encaminhada para S4.8. `getComputedStyle` por frame 0,62 (0,30 de `renderVals`, 0,30 de `vis`).
