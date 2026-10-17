---
adr: none
---

### Added
- `LayersCore.groupPlanesByZ(items)`: agrupa `[{id, z}]` por `z` (arredondado a 0,01), grupos por `z` crescente e ids na ordem de entrada.
- `div[data-plane-group]` e `data-plane="<id>"`: todo `Plane` leva o marcador estável em qualquer modo; durante o arrasto os planos de mesmo `z` ficam num wrapper com `translateZ(z)`, `will-change: transform` e `pointer-events: none`. Os planos mantêm `contain: layout paint` e o `pointer-events` próprio (solo), então hover e clique seguem nos filhos.
- `e2e/leaf-grouping.spec.js` (hover atrás de um grupo mais próximo e clique, solo, foco de camada, transição após soltar, planos agrupados durante o arrasto e de volta a um por camada ao soltar; pixels com `LAYERS_VISUAL=1`, baselines fora do repositório) e, em `e2e/perf.spec.js` e `e2e/perf-helpers.js`, `dragStartMs`/`dragEndMs`, `countCompositedLayers`, `reapplyMarks` e as variantes G1, G2 e A/A do spike (`native: true` no app novo).
- `bench/results/`: 6 runs ABABAB da S4.9 (base `b87f00c`, depois `3c2d58f`).

### Changed
- `Plane` e `scene()`: com `dragging`, os planos saem de `div[data-plane]` soltos e entram em grupos por `z`; sem `transform`, `transition` e `will-change` próprios. Fora do arrasto o DOM é o de antes (um plano por camada, com transições). `sel`, `lframe`, `llbl` e as medidas ficam fora dos grupos.
- Helpers e specs de plano (`planeCensus`, `markScene`, `countPlaneHovers`, `countHoverSwaps`, `noPlaneHits`, `viewport-culling`) passaram a casar por `[data-plane]` e continuam aceitando o predicado antigo (`translateZ` inline) na base. As marcas por nó (`data-s48-*`) são reaplicadas por id depois da remontagem do primeiro movimento.
- `Orbit_Budget_Above50Fps` deixou de ser `test.fail`: orçamento cumprido, a guarda passa a valer. `RELEASE-CHECKLIST.md` (Budget `[x]`) e `ARCHITECTURE.md` atualizados.

### Perf
- measured — orbit do Traval, mediana de 3 runs ABABAB (Chromium 153.0.8010.12, i7-12700, `dirty false`): 23,84 para 17,71 ms/frame (sd 0,92); fps 41,8/41,9/44,9 para 56,5/57,0/55,2; p95 50 para ~17 ms. Camadas compostas 429 para 31. Gate `gate-s4-9` cumprido (muito além de −2,4 ms) e orçamento fechado: fps > 50 nas três runs, frame < 20 ms. Spike da Task E1 (agrupamento manual, 3 runs pareadas): orbit 25,4 para 17,5 ms/frame; G1 e G2 iguais (manter `contain`); A/A −2,4/−2,0/+1,7 ms (viés de ordem de até ~2 ms).
- measured — fora do Traval: `orbit/1500-tags` 60,26 para 45,92 ms/frame (ruidoso: 45,9/33,6/47,9); `scan/1500-tags` 44,5 para 43,5 ms; `explode` 66,5 para 65,1 ms; `tree/*` sem mudança além do ruído (select e scroll muito ruidosos, só reportados). `orbit/traval-zoom` 17,19 para 19,70 ms (+2,5 ms, dentro de ~2σ): item a observar, sem guarda.
- measured — custo de remontagem (3 runs, app com o agrupamento, variantes S49 nativas): `dragStartMs` ~66 a 67 ms (~4 frames, sob a guarda de 100 ms; o A/A tem o mesmo valor, é a remontagem de ~414 planos no primeiro movimento) e `dragEndMs` 83 a 133 ms ao soltar (remontagem de volta a um plano por camada, ~1 a 2 frames perdidos no mouseup; custo conhecido e aceito).
- measured — exceção documentada ao "diff zero" visual: com o DOM final idêntico à base, o quadro estático depois de um arrasto difere em 4 a 6 pixels de borda por 1 nível de canal (a base contra ela mesma: 0; recriar as camadas da própria base sem mexer no DOM também muda 6 pixels por 1 nível): é o histórico das camadas compostas, não o DOM. O quadro estático inicial segue com diff zero. A pose de arrasto difere em 0,037 % dos pixels no limiar YIQ 0,1 (0 no limiar 0,2 do Playwright), antialiasing do raster 3D.
