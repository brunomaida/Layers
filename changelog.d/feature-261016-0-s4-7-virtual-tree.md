---
adr: none
---

### Added
- `e2e/tree-perf-helpers.js` e 14 ids novos em `e2e/perf.spec.js`: orbit com a árvore recolhida (painel e raiz L0) e com a V1 da S4.8 simulada, no Traval e inflado a 1.500 tags, trocas de `hoverId` por frame, custo de hover e seleção de linha e frame do scroll da árvore. Informativos, sem guarda. Nenhum código do app mudou: a S4.7 foi fechada como medido-negativo no Traval (memo ≈ 0, teto de 2,6 % do frame) e a janela da árvore em escala virou a leaf S4.10.

### Perf
- measured — orbit Traval: base 24,06 ms/frame; árvore recolhida 23,79 (painel) e 23,34 (raiz L0); com V1 simulada 23,63 e 23,01. Teto da árvore 2,6 % do frame (pior caso entre com e sem V1), abaixo dos 10 % do gate; mediana de 3 execuções limpas, Chromium 153, i7-12700. O script cai de 7,75 para 3,0 ms/frame, mas o frame é limitado pelo compositor (Layerize, S4.8).
- measured — troca de `hoverId` por frame no orbit: 0,01 a 0,03 (0 com V1). A premissa de que o churn de hover reconstrói a árvore a cada frame não se sustenta; teto do memo das linhas (recolhido menos raiz) ≈ 0 nos dois cenários.
- measured — 1.500 tags: orbit 67,52 ms/frame (V1: 62,36); raiz recolhida 47,32 (V1: 47,51), teto de 23,8 %, quase todo na montagem e no diff de cerca de 1.650 linhas (painel recolhido 42,52). Seleção de linha 485,9 ms, hover 76,4 ms (Traval: 78,5 e 25,5 ms; só relatados, presos ao vsync) e scroll da árvore 270,9 ms/frame (p95 299,9) sem janela, causa não diagnosticada. Ruído: desvio de 0,1 a 1,0 ms no Traval e de 2,4 a 4,7 ms em 1.500 tags. Encaminhado para a S4.10.

| cenário (ms/frame) | base | painel recolhido | raiz L0 | V1 | V1 e raiz L0 |
|---|---|---|---|---|---|
| Traval | 24,06 | 23,79 | 23,34 | 23,63 | 23,01 |
| 1.500 tags | 67,52 | 42,52 | 47,32 | 62,36 | 47,51 |
