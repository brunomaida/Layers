---
adr: none
---

### Added
- `e2e/perf.spec.js`: tempo de main thread por frame no orbit (task, script, style, layout via CDP `Performance.getMetrics`), chamadas de `getComputedStyle` por frame e os limites superiores `orbit/traval-gcs-ideal/mean-frame-ms` e `orbit/traval-panel-ideal/mean-frame-ms`. Nenhum cache foi entregue: a medição mostrou que ele não reduz o frame do orbit (S4.6 fechada como medido-negativo; lacuna encaminhada para a S4.8).

### Perf
- measured — orbit Traval, vista padrão: 42,0 fps (23,8 ms/frame, p95 35,8 ms); limite superior com toda leitura de estilo memoizada: 24,1 ms/frame, +1,1 % sobre a base (painel inteiro: 23,9 ms/frame); mediana de 3 execuções, Chromium 153.0.8010.12, i7-12700. Série não comparável com as linhas da S4.5 no bench-history (p95 50 → 35,8 ms; orbit com zoom 16,7 → 18,0 ms): entre elas entraram o merge da S3.2 e a sessão CDP `Performance` do `orbitDrag`; causa não isolada.
- measured — main thread por frame no orbit padrão: task 20,3 ms, script 7,7 ms, style 0,17 ms, layout 0,06 ms, outros 12,3 ms; lacuna encaminhada para S4.8. `getComputedStyle` por frame 0,62 (repartidas entre `renderVals` e `vis`; divisão estimada fora do harness).
