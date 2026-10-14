---
adr: none
---

### Added
- Culling de planos por viewport durante o arrasto da câmera (orbit, pan, foco): plano cuja projeção cai inteira fora do palco ampliado em 15 % fica `display:none`; selecionado e hover nunca cortam, e soltar o arrasto mostra todos. `LayersCore.viewCuller` (puro, testado) replica a transformação do mundo de `scene()`.
- `e2e/viewport-culling.spec.js`: nenhum plano visível some durante o arrasto; nenhum fica oculto depois de soltar.
- `e2e/perf.spec.js`: censo de planos, cenário de orbit com zoom (`orbit/traval-zoom/mean-frame-ms`) e seu limite superior com os planos fora do palco ocultos à mão (`orbit/traval-zoom-ideal/mean-frame-ms`).

### Perf
- measured — orbit Traval, vista padrão: 40,0 → 42,5 fps (25,0 → 23,5 ms/frame, p95 50,0 → 50,0 ms); mediana de 3 execuções, Chromium 153.0.8010.12, i7-12700.
- measured — orbit Traval com zoom 1,1^12: 40,6 → 60,0 fps (24,6 → 16,7 ms/frame, p95 50,1 → 16,8 ms; 60 fps é o teto do vsync); censo com zoom: 254/414 planos fora do palco.
