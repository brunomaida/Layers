# Implementation Report — s4-5-viewport-culling

- **Branch:** `feature/261014-0-s4-5-viewport-culling`
- **Range:** `origin/devel..HEAD`
- **Período:** 2026-10-14 16:55 → 2026-10-14 16:57
- **Status:** `final`
- **Gerado em:** 2026-10-14 17:01

## Resumo

Culling de planos por viewport durante o arrasto da câmera (orbit, pan, foco): plano cuja projeção cai inteira fora do palco ampliado em 15 % fica `display:none`; selecionado e hover nunca cortam, e soltar o arrasto mostra todos. `LayersCore.viewCuller` (puro, testado) replica a transformação do mundo de `scene()`.

## Mudanças

### Added (15)

- `bench/results/2026-10-14T18-12-54-618Z-layers-ui.bench.json` (+115/-0, config)
- `bench/results/2026-10-14T18-13-17-750Z-layers-ui.bench.json` (+115/-0, config)
- `bench/results/2026-10-14T18-13-40-279Z-layers-ui.bench.json` (+115/-0, config)
- `bench/results/2026-10-14T18-27-18-871Z-layers-ui.bench.json` (+115/-0, config)
- `bench/results/2026-10-14T18-30-01-553Z-layers-ui.bench.json` (+115/-0, config)
- `bench/results/2026-10-14T18-31-39-461Z-layers-ui.bench.json` (+115/-0, config)
- `changelog.d/feature-261014-0-s4-5-viewport-culling.md` (+12/-0, doc)
- `docs/reports/bench-history/runs/20261014T181254.618Z-layers-ui-63f137d9f4a0c488785583156b8cfe5688078710-d8f198bf.json` (+188/-0, doc)
- `docs/reports/bench-history/runs/20261014T181317.750Z-layers-ui-63f137d9f4a0c488785583156b8cfe5688078710-7a52b8ff.json` (+188/-0, doc)
- `docs/reports/bench-history/runs/20261014T181340.279Z-layers-ui-63f137d9f4a0c488785583156b8cfe5688078710-99baff48.json` (+188/-0, doc)
- `docs/reports/bench-history/runs/20261014T182718.871Z-layers-ui-e62e9656649ca0568ce7ad0849c69a8b0e7d4517-2ba219b2.json` (+188/-0, doc)
- `docs/reports/bench-history/runs/20261014T183001.553Z-layers-ui-e62e9656649ca0568ce7ad0849c69a8b0e7d4517-c1ef13b2.json` (+188/-0, doc)
- `docs/reports/bench-history/runs/20261014T183139.461Z-layers-ui-e62e9656649ca0568ce7ad0849c69a8b0e7d4517-e63fe578.json` (+188/-0, doc)
- `docs/superpowers/plans/2026-10-14-s4-5-viewport-culling.md` (+764/-0, doc)
- `e2e/viewport-culling.spec.js` (+78/-0, src)

### Changed (11)

- `docs/ARCHITECTURE.md` (+2/-2, doc)
- `docs/RELEASE-CHECKLIST.md` (+2/-2, doc)
- `docs/reports/bench-history/bench-history.json` (+1430/-2, doc)
- `docs/reports/bench-history/bench-history.md` (+75/-13, doc)
- `docs/roadmap.data.json` (+20/-13, doc)
- `docs/roadmap.md` (+1/-1, doc)
- `e2e/perf-helpers.js` (+47/-0, src)
- `e2e/perf.spec.js` (+46/-3, src)
- `index.html` (+8/-6, other)
- `lib/layers-core.js` (+25/-0, src)
- `test/layers-core.test.js` (+70/-0, test)

### Changelog fragment

**Added:**
- Culling de planos por viewport durante o arrasto da câmera (orbit, pan, foco): plano cuja projeção cai inteira fora do palco ampliado em 15 % fica `display:none`; selecionado e hover nunca cortam, e soltar o arrasto mostra todos. `LayersCore.viewCuller` (puro, testado) replica a transformação do mundo de `scene()`.
- `e2e/viewport-culling.spec.js`: nenhum plano visível some durante o arrasto; nenhum fica oculto depois de soltar.
- `e2e/perf.spec.js`: censo de planos, cenário de orbit com zoom (`orbit/traval-zoom/mean-frame-ms`) e seu limite superior com os planos fora do palco ocultos à mão (`orbit/traval-zoom-ideal/mean-frame-ms`).

**Perf:**
- measured — orbit Traval, vista padrão: 40,0 → 42,5 fps (25,0 → 23,5 ms/frame, p95 50,0 → 50,0 ms); mediana de 3 execuções, Chromium 153.0.8010.12, i7-12700.
- measured — orbit Traval com zoom 1,1^12: 40,6 → 60,0 fps (24,6 → 16,7 ms/frame, p95 50,1 → 16,8 ms; 60 fps é o teto do vsync); censo com zoom: 254/414 planos fora do palco.

## Arquivos tocados

### src (4)

- [`e2e/perf-helpers.js`](../../../e2e/perf-helpers.js) — M (+47/-0)
- [`e2e/perf.spec.js`](../../../e2e/perf.spec.js) — M (+46/-3)
- [`e2e/viewport-culling.spec.js`](../../../e2e/viewport-culling.spec.js) — A (+78/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+25/-0)

### test (1)

- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+70/-0)

### doc (14)

- [`changelog.d/feature-261014-0-s4-5-viewport-culling.md`](../../../changelog.d/feature-261014-0-s4-5-viewport-culling.md) — A (+12/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+2/-2)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+2/-2)
- [`docs/reports/bench-history/bench-history.json`](../../reports/bench-history/bench-history.json) — M (+1430/-2)
- [`docs/reports/bench-history/bench-history.md`](../../reports/bench-history/bench-history.md) — M (+75/-13)
- [`docs/reports/bench-history/runs/20261014T181254.618Z-layers-ui-63f137d9f4a0c488785583156b8cfe5688078710-d8f198bf.json`](../../reports/bench-history/runs/20261014T181254.618Z-layers-ui-63f137d9f4a0c488785583156b8cfe5688078710-d8f198bf.json) — A (+188/-0)
- [`docs/reports/bench-history/runs/20261014T181317.750Z-layers-ui-63f137d9f4a0c488785583156b8cfe5688078710-7a52b8ff.json`](../../reports/bench-history/runs/20261014T181317.750Z-layers-ui-63f137d9f4a0c488785583156b8cfe5688078710-7a52b8ff.json) — A (+188/-0)
- [`docs/reports/bench-history/runs/20261014T181340.279Z-layers-ui-63f137d9f4a0c488785583156b8cfe5688078710-99baff48.json`](../../reports/bench-history/runs/20261014T181340.279Z-layers-ui-63f137d9f4a0c488785583156b8cfe5688078710-99baff48.json) — A (+188/-0)
- [`docs/reports/bench-history/runs/20261014T182718.871Z-layers-ui-e62e9656649ca0568ce7ad0849c69a8b0e7d4517-2ba219b2.json`](../../reports/bench-history/runs/20261014T182718.871Z-layers-ui-e62e9656649ca0568ce7ad0849c69a8b0e7d4517-2ba219b2.json) — A (+188/-0)
- [`docs/reports/bench-history/runs/20261014T183001.553Z-layers-ui-e62e9656649ca0568ce7ad0849c69a8b0e7d4517-c1ef13b2.json`](../../reports/bench-history/runs/20261014T183001.553Z-layers-ui-e62e9656649ca0568ce7ad0849c69a8b0e7d4517-c1ef13b2.json) — A (+188/-0)
- [`docs/reports/bench-history/runs/20261014T183139.461Z-layers-ui-e62e9656649ca0568ce7ad0849c69a8b0e7d4517-e63fe578.json`](../../reports/bench-history/runs/20261014T183139.461Z-layers-ui-e62e9656649ca0568ce7ad0849c69a8b0e7d4517-e63fe578.json) — A (+188/-0)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+20/-13)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)
- [`docs/superpowers/plans/2026-10-14-s4-5-viewport-culling.md`](../plans/2026-10-14-s4-5-viewport-culling.md) — A (+764/-0)

### config (6)

- [`bench/results/2026-10-14T18-12-54-618Z-layers-ui.bench.json`](../../../bench/results/2026-10-14T18-12-54-618Z-layers-ui.bench.json) — A (+115/-0)
- [`bench/results/2026-10-14T18-13-17-750Z-layers-ui.bench.json`](../../../bench/results/2026-10-14T18-13-17-750Z-layers-ui.bench.json) — A (+115/-0)
- [`bench/results/2026-10-14T18-13-40-279Z-layers-ui.bench.json`](../../../bench/results/2026-10-14T18-13-40-279Z-layers-ui.bench.json) — A (+115/-0)
- [`bench/results/2026-10-14T18-27-18-871Z-layers-ui.bench.json`](../../../bench/results/2026-10-14T18-27-18-871Z-layers-ui.bench.json) — A (+115/-0)
- [`bench/results/2026-10-14T18-30-01-553Z-layers-ui.bench.json`](../../../bench/results/2026-10-14T18-30-01-553Z-layers-ui.bench.json) — A (+115/-0)
- [`bench/results/2026-10-14T18-31-39-461Z-layers-ui.bench.json`](../../../bench/results/2026-10-14T18-31-39-461Z-layers-ui.bench.json) — A (+115/-0)

### other (1)

- [`index.html`](../../../index.html) — M (+8/-6)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Added:** Culling de planos por viewport durante o arrasto da câmera (orbit, pan, foco): plano cuja projeção cai inteira fora do palco ampliado em 15 % fica `display:none`; selecionado e hover nunca cortam, e soltar o arrasto mostra todos. `LayersCore.viewCuller` (puro, testado) replica a transformação do mundo de `scene()`.
  - [`99be351`](https://github.com/brunomaida/Layers/commit/99be351532a604931173f64547d469e3398ed75f) test(perf): add plane census and zoomed orbit scenario (S4.5 Task 1)
  - [`6bd6b90`](https://github.com/brunomaida/Layers/commit/6bd6b90fc8489c413c3195cf66674c460947e71c) test(perf): record S4.5 orbit baseline and plane census (S4.5 Task 1)
  - [`82a0c0c`](https://github.com/brunomaida/Layers/commit/82a0c0c4abb19d8c3508427ed9ae4e7c1f80549a) feat(core): add viewCuller screen-space predicate for scene planes (S4.5 Task 2)
  - [`8c1bbb4`](https://github.com/brunomaida/Layers/commit/8c1bbb44472bcd2af34076bee0868f12b3a02b32) perf(scene): hide off-screen planes while dragging the camera (S4.5 Task 3)
  - [`10664ed`](https://github.com/brunomaida/Layers/commit/10664ede98b336abb2628416a459d8bd2f9ba446) test(e2e): prove culling never hides on-screen planes (S4.5 Task 4)
  - [`28342c7`](https://github.com/brunomaida/Layers/commit/28342c7b41704dcc9bb9286a0e1d45eefbc6729f) test(perf): record S4.5 after-measure and update orbit budget gap (S4.5 Task 5)
- **Added:** `e2e/viewport-culling.spec.js`: nenhum plano visível some durante o arrasto; nenhum fica oculto depois de soltar.
  - [`10664ed`](https://github.com/brunomaida/Layers/commit/10664ede98b336abb2628416a459d8bd2f9ba446) test(e2e): prove culling never hides on-screen planes (S4.5 Task 4)
- **Added:** `e2e/perf.spec.js`: censo de planos, cenário de orbit com zoom (`orbit/traval-zoom/mean-frame-ms`) e seu limite superior com os planos fora do palco ocultos à mão (`orbit/traval-zoom-ideal/mean-frame-ms`).
  - [`99be351`](https://github.com/brunomaida/Layers/commit/99be351532a604931173f64547d469e3398ed75f) test(perf): add plane census and zoomed orbit scenario (S4.5 Task 1)
  - [`6bd6b90`](https://github.com/brunomaida/Layers/commit/6bd6b90fc8489c413c3195cf66674c460947e71c) test(perf): record S4.5 orbit baseline and plane census (S4.5 Task 1)
  - [`8c1bbb4`](https://github.com/brunomaida/Layers/commit/8c1bbb44472bcd2af34076bee0868f12b3a02b32) perf(scene): hide off-screen planes while dragging the camera (S4.5 Task 3)
  - [`10664ed`](https://github.com/brunomaida/Layers/commit/10664ede98b336abb2628416a459d8bd2f9ba446) test(e2e): prove culling never hides on-screen planes (S4.5 Task 4)
  - [`28342c7`](https://github.com/brunomaida/Layers/commit/28342c7b41704dcc9bb9286a0e1d45eefbc6729f) test(perf): record S4.5 after-measure and update orbit budget gap (S4.5 Task 5)
- **Perf:** measured — orbit Traval, vista padrão: 40,0 → 42,5 fps (25,0 → 23,5 ms/frame, p95 50,0 → 50,0 ms); mediana de 3 execuções, Chromium 153.0.8010.12, i7-12700.
  - [`99be351`](https://github.com/brunomaida/Layers/commit/99be351532a604931173f64547d469e3398ed75f) test(perf): add plane census and zoomed orbit scenario (S4.5 Task 1)
  - [`6bd6b90`](https://github.com/brunomaida/Layers/commit/6bd6b90fc8489c413c3195cf66674c460947e71c) test(perf): record S4.5 orbit baseline and plane census (S4.5 Task 1)
  - [`28342c7`](https://github.com/brunomaida/Layers/commit/28342c7b41704dcc9bb9286a0e1d45eefbc6729f) test(perf): record S4.5 after-measure and update orbit budget gap (S4.5 Task 5)
- **Perf:** measured — orbit Traval com zoom 1,1^12: 40,6 → 60,0 fps (24,6 → 16,7 ms/frame, p95 50,1 → 16,8 ms; 60 fps é o teto do vsync); censo com zoom: 254/414 planos fora do palco.
  - [`99be351`](https://github.com/brunomaida/Layers/commit/99be351532a604931173f64547d469e3398ed75f) test(perf): add plane census and zoomed orbit scenario (S4.5 Task 1)
  - [`6bd6b90`](https://github.com/brunomaida/Layers/commit/6bd6b90fc8489c413c3195cf66674c460947e71c) test(perf): record S4.5 orbit baseline and plane census (S4.5 Task 1)
  - [`28342c7`](https://github.com/brunomaida/Layers/commit/28342c7b41704dcc9bb9286a0e1d45eefbc6729f) test(perf): record S4.5 after-measure and update orbit budget gap (S4.5 Task 5)

### Todos os commits

- [`8230661`](https://github.com/brunomaida/Layers/commit/8230661111a97fe35084dbec37ec839e4c644d8e) docs: start S4.5 in the tracker (S4.5)
- [`d0afab3`](https://github.com/brunomaida/Layers/commit/d0afab38e448294ebea2dddc8424d23457050a44) docs: add S4.5 implementation plan (S4.5)
- [`a2b770b`](https://github.com/brunomaida/Layers/commit/a2b770b769214f0141127b0fc8509a72ef17064a) docs: apply plan review findings (S4.5)
- [`99be351`](https://github.com/brunomaida/Layers/commit/99be351532a604931173f64547d469e3398ed75f) test(perf): add plane census and zoomed orbit scenario (S4.5 Task 1)
- [`6bd6b90`](https://github.com/brunomaida/Layers/commit/6bd6b90fc8489c413c3195cf66674c460947e71c) test(perf): record S4.5 orbit baseline and plane census (S4.5 Task 1)
- [`82a0c0c`](https://github.com/brunomaida/Layers/commit/82a0c0c4abb19d8c3508427ed9ae4e7c1f80549a) feat(core): add viewCuller screen-space predicate for scene planes (S4.5 Task 2)
- [`8c1bbb4`](https://github.com/brunomaida/Layers/commit/8c1bbb44472bcd2af34076bee0868f12b3a02b32) perf(scene): hide off-screen planes while dragging the camera (S4.5 Task 3)
- [`10664ed`](https://github.com/brunomaida/Layers/commit/10664ede98b336abb2628416a459d8bd2f9ba446) test(e2e): prove culling never hides on-screen planes (S4.5 Task 4)
- [`28342c7`](https://github.com/brunomaida/Layers/commit/28342c7b41704dcc9bb9286a0e1d45eefbc6729f) test(perf): record S4.5 after-measure and update orbit budget gap (S4.5 Task 5)
- [`7ef46d0`](https://github.com/brunomaida/Layers/commit/7ef46d0e140bccf68c75b4a525ffe4999ec33488) docs: close S4.5 with changelog fragment, checklist and architecture note (S4.5 Task 6.2)

## Custo (tokens + tempo)

_Sem sessões Claude detectadas no range._
