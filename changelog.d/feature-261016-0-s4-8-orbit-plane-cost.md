---
adr: none
---

### Added
- `e2e/perf.spec.js`: variantes de custo dos planos no orbit (sem hit-test, sem `will-change` nos planos ou no mundo, wire desligado com e sem os planos vazios, metade dos planos ocultos, A/A do viés de ordem), trocas de hover por frame, censo de planos vazios e `e2e/orbit-trace.spec.js` opcional (`LAYERS_TRACE=1`) com as fases de paint do trace. Nenhum fix foi entregue: nenhuma variante passou o gate (S4.8 fechada como medido-negativo; lacuna encaminhada para a S4.9, agrupamento de folhas).

### Perf
- measured — variantes da Task 1 (delta pareado com `orbit/traval` da mesma execução, mediana de 3; A/A −0,03 ms): V1 sem hit-test +0,65 ms, V2a sem `will-change` nos planos +0,09 ms, V2b sem `will-change` no mundo +0,78 ms, V3 planos vazios ocultos −1,53 ms contra wire desligado (−2,57/+7,64/−1,53, ruidoso), V4 metade dos planos ocultos −6,47 ms (outros 12,89 → 6,69 ms: custo linear por plano visível). Chromium 153.0.8010.12, i7-12700.
- measured — base: 41,9 fps (23,8 ms/frame, p95 50 ms, outros 12,9 ms); trace de 1 execução (67 frames): Layerize 11,53 ms/frame, Commit 0,49, HitTest 0,29, Paint 0,15, PrePaint 0,06; trocas de hover por frame ~0,01 na base. O custo está nas camadas compostas por plano; lacuna encaminhada para S4.7 / S4.9.
