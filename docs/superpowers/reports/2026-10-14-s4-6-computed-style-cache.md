# Implementation Report — s4-6-computed-style-cache

- **Branch:** `feature/261014-0-s4-6-computed-style-cache`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-14 22:02 → 2026-10-14 22:20
- **Status:** `final`
- **Gerado em:** 2026-10-14 22:20

## Resumo

`e2e/perf.spec.js`: tempo de main thread por frame no orbit (task, script, style, layout via CDP `Performance.getMetrics`), chamadas de `getComputedStyle` por frame e os limites superiores `orbit/traval-gcs-ideal/mean-frame-ms` e `orbit/traval-panel-ideal/mean-frame-ms`. Nenhum cache foi entregue: a medição mostrou que ele não reduz o frame do orbit (S4.6 fechada como medido-negativo; lacuna encaminhada para a S4.8).

## Mudanças

### Added (10)

- `bench/results/2026-10-15T01-05-03-132Z-layers-ui.bench.json` (+176/-0, config)
- `bench/results/2026-10-15T01-05-32-139Z-layers-ui.bench.json` (+176/-0, config)
- `bench/results/2026-10-15T01-06-00-993Z-layers-ui.bench.json` (+176/-0, config)
- `changelog.d/feature-261014-0-s4-6-computed-style-cache.md` (+10/-0, doc)
- `docs/reports/bench-history/runs/20261015T010503.132Z-layers-ui-d1135bec7b34a564059e20122ad2dc0216d034b9-12069999.json` (+269/-0, doc)
- `docs/reports/bench-history/runs/20261015T010532.139Z-layers-ui-d1135bec7b34a564059e20122ad2dc0216d034b9-e524d348.json` (+269/-0, doc)
- `docs/reports/bench-history/runs/20261015T010600.993Z-layers-ui-d1135bec7b34a564059e20122ad2dc0216d034b9-ad17f8d5.json` (+269/-0, doc)
- `docs/superpowers/plans/2026-10-14-s4-6-computed-style-cache.md` (+1068/-0, doc)
- `docs/superpowers/reports/2026-10-14-s4-6-computed-style-cache.html` (+686/-0, doc)
- `docs/superpowers/reports/2026-10-14-s4-6-computed-style-cache.md` (+114/-0, doc)

### Changed (10)

- `docs/ARCHITECTURE.md` (+1/-1, doc)
- `docs/RELEASE-CHECKLIST.md` (+2/-2, doc)
- `docs/_index.md` (+4/-4, doc)
- `docs/reports/bench-history/bench-history.json` (+1001/-2, doc)
- `docs/reports/bench-history/bench-history.md` (+45/-1, doc)
- `docs/roadmap.config.json` (+2/-1, doc)
- `docs/roadmap.data.json` (+36/-4, doc)
- `docs/roadmap.md` (+2/-1, doc)
- `e2e/perf-helpers.js` (+68/-3, src)
- `e2e/perf.spec.js` (+38/-3, src)

### Changelog fragment

**Added:**
- `e2e/perf.spec.js`: tempo de main thread por frame no orbit (task, script, style, layout via CDP `Performance.getMetrics`), chamadas de `getComputedStyle` por frame e os limites superiores `orbit/traval-gcs-ideal/mean-frame-ms` e `orbit/traval-panel-ideal/mean-frame-ms`. Nenhum cache foi entregue: a medição mostrou que ele não reduz o frame do orbit (S4.6 fechada como medido-negativo; lacuna encaminhada para a S4.8).

**Perf:**
- measured — orbit Traval, vista padrão: 42,0 fps (23,8 ms/frame, p95 35,8 ms); limite superior com toda leitura de estilo memoizada: 24,1 ms/frame, +1,1 % sobre a base (painel inteiro: 23,9 ms/frame); mediana de 3 execuções, Chromium 153.0.8010.12, i7-12700. Série não comparável com as linhas da S4.5 no bench-history (p95 50 → 35,8 ms; orbit com zoom 16,7 → 18,0 ms): entre elas entraram o merge da S3.2 e a sessão CDP `Performance` do `orbitDrag`; causa não isolada.
- measured — main thread por frame no orbit padrão: task 20,3 ms, script 7,7 ms, style 0,17 ms, layout 0,06 ms, outros 12,3 ms; lacuna encaminhada para S4.8. `getComputedStyle` por frame 0,62 (repartidas entre `renderVals` e `vis`; divisão estimada fora do harness).

## Arquivos tocados

### src (2)

- [`e2e/perf-helpers.js`](../../../e2e/perf-helpers.js) — M (+68/-3)
- [`e2e/perf.spec.js`](../../../e2e/perf.spec.js) — M (+38/-3)

### doc (15)

- [`changelog.d/feature-261014-0-s4-6-computed-style-cache.md`](../../../changelog.d/feature-261014-0-s4-6-computed-style-cache.md) — A (+10/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+1/-1)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+2/-2)
- [`docs/_index.md`](../../_index.md) — M (+4/-4)
- [`docs/reports/bench-history/bench-history.json`](../../reports/bench-history/bench-history.json) — M (+1001/-2)
- [`docs/reports/bench-history/bench-history.md`](../../reports/bench-history/bench-history.md) — M (+45/-1)
- [`docs/reports/bench-history/runs/20261015T010503.132Z-layers-ui-d1135bec7b34a564059e20122ad2dc0216d034b9-12069999.json`](../../reports/bench-history/runs/20261015T010503.132Z-layers-ui-d1135bec7b34a564059e20122ad2dc0216d034b9-12069999.json) — A (+269/-0)
- [`docs/reports/bench-history/runs/20261015T010532.139Z-layers-ui-d1135bec7b34a564059e20122ad2dc0216d034b9-e524d348.json`](../../reports/bench-history/runs/20261015T010532.139Z-layers-ui-d1135bec7b34a564059e20122ad2dc0216d034b9-e524d348.json) — A (+269/-0)
- [`docs/reports/bench-history/runs/20261015T010600.993Z-layers-ui-d1135bec7b34a564059e20122ad2dc0216d034b9-ad17f8d5.json`](../../reports/bench-history/runs/20261015T010600.993Z-layers-ui-d1135bec7b34a564059e20122ad2dc0216d034b9-ad17f8d5.json) — A (+269/-0)
- [`docs/roadmap.config.json`](../../roadmap.config.json) — M (+2/-1)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+36/-4)
- [`docs/roadmap.md`](../../roadmap.md) — M (+2/-1)
- [`docs/superpowers/plans/2026-10-14-s4-6-computed-style-cache.md`](../plans/2026-10-14-s4-6-computed-style-cache.md) — A (+1068/-0)
- [`docs/superpowers/reports/2026-10-14-s4-6-computed-style-cache.html`](2026-10-14-s4-6-computed-style-cache.html) — A (+686/-0)
- [`docs/superpowers/reports/2026-10-14-s4-6-computed-style-cache.md`](2026-10-14-s4-6-computed-style-cache.md) — A (+114/-0)

### config (3)

- [`bench/results/2026-10-15T01-05-03-132Z-layers-ui.bench.json`](../../../bench/results/2026-10-15T01-05-03-132Z-layers-ui.bench.json) — A (+176/-0)
- [`bench/results/2026-10-15T01-05-32-139Z-layers-ui.bench.json`](../../../bench/results/2026-10-15T01-05-32-139Z-layers-ui.bench.json) — A (+176/-0)
- [`bench/results/2026-10-15T01-06-00-993Z-layers-ui.bench.json`](../../../bench/results/2026-10-15T01-06-00-993Z-layers-ui.bench.json) — A (+176/-0)

## Testes

- `e2e/perf.spec.js` (modificado): testes novos `Orbit_GcsIdeal_RecordsFrameInterval` e `Orbit_PanelIdeal_RecordsFrameInterval` (limites superiores; exigem gcs/frame ≤ 0,05); `gcsPerFrame` e `main` registrados nos três cenários de orbit existentes; mensagem do `Orbit_Budget_Above50Fps` aponta S4.7 e S4.8 (segue como falha esperada, `test.fail`).
- `e2e/perf-helpers.js` (modificado): `instrument` conta chamadas de `getComputedStyle`; `orbitDrag` mede o main thread por frame via CDP; stubs `memoComputedStyle` e `memoClientBox`.
- Execução: `e2e/perf.spec.js` 9 testes passando em 3 execuções limpas; `npm test` 268 passaram.

_Detecção automática ignora `*.spec.js` fora de `test/`; lista escrita à mão._

## Commits ↔ changelog

- **Added:** `e2e/perf.spec.js`: tempo de main thread por frame no orbit (task, script, style, layout via CDP `Performance.getMetrics`), chamadas de `getComputedStyle` por frame e os limites superiores `orbit/traval-gcs-ideal/mean-frame-ms` e `orbit/traval-panel-ideal/mean-frame-ms`. Nenhum cache foi entregue: a medição mostrou que ele não reduz o frame do orbit (S4.6 fechada como medido-negativo; lacuna encaminhada para a S4.8).
  - [`4888c31`](https://github.com/brunomaida/Layers/commit/4888c31a59353be4885b3c3832569b35da3fb7d6) docs: start S4.6 in the tracker (S4.6 Task 0)
  - [`090bf95`](https://github.com/brunomaida/Layers/commit/090bf95f1c19021a5baedec1e892cced2b3254e0) docs: add S4.6 computed-style cache plan (S4.6 Task 0)
  - [`d1135be`](https://github.com/brunomaida/Layers/commit/d1135bec7b34a564059e20122ad2dc0216d034b9) test(perf): add main-thread breakdown and computed-style upper bounds (S4.6 Task 2)
  - [`b92dbbe`](https://github.com/brunomaida/Layers/commit/b92dbbe2e29c1bf09b4e2c343a044e6cf19d889d) test(perf): record S4.6 orbit baseline and computed-style upper bounds (S4.6 Task 2)
  - [`cb04508`](https://github.com/brunomaida/Layers/commit/cb04508ee9b776c94eed6168a5eb2f5ed65d908a) test(perf): point the orbit budget gap at S4.7 and S4.8 (S4.6 Task 2)
  - [`528270a`](https://github.com/brunomaida/Layers/commit/528270aa3af88d3b8f76657725d5ae59f55f6b32) docs: record the S4.6 measured-negative in checklist, architecture and changelog (S4.6 Task 7)
- **Perf:** measured — orbit Traval, vista padrão: 42,0 fps (23,8 ms/frame, p95 35,8 ms); limite superior com toda leitura de estilo memoizada: 24,1 ms/frame, +1,1 % sobre a base (painel inteiro: 23,9 ms/frame); mediana de 3 execuções, Chromium 153.0.8010.12, i7-12700. Série não comparável com as linhas da S4.5 no bench-history (p95 50 → 35,8 ms; orbit com zoom 16,7 → 18,0 ms): entre elas entraram o merge da S3.2 e a sessão CDP `Performance` do `orbitDrag`; causa não isolada.
  - [`b92dbbe`](https://github.com/brunomaida/Layers/commit/b92dbbe2e29c1bf09b4e2c343a044e6cf19d889d) test(perf): record S4.6 orbit baseline and computed-style upper bounds (S4.6 Task 2)
  - [`cb04508`](https://github.com/brunomaida/Layers/commit/cb04508ee9b776c94eed6168a5eb2f5ed65d908a) test(perf): point the orbit budget gap at S4.7 and S4.8 (S4.6 Task 2)
  - [`528270a`](https://github.com/brunomaida/Layers/commit/528270aa3af88d3b8f76657725d5ae59f55f6b32) docs: record the S4.6 measured-negative in checklist, architecture and changelog (S4.6 Task 7)
  - [`98664d1`](https://github.com/brunomaida/Layers/commit/98664d10e23be5e08f7d5ea50105c611881070a6) docs: close S4.6 measured-negative with its report (S4.6)
- **Perf:** measured — main thread por frame no orbit padrão: task 20,3 ms, script 7,7 ms, style 0,17 ms, layout 0,06 ms, outros 12,3 ms; lacuna encaminhada para S4.8. `getComputedStyle` por frame 0,62 (repartidas entre `renderVals` e `vis`; divisão estimada fora do harness).
  - [`4888c31`](https://github.com/brunomaida/Layers/commit/4888c31a59353be4885b3c3832569b35da3fb7d6) docs: start S4.6 in the tracker (S4.6 Task 0)
  - [`090bf95`](https://github.com/brunomaida/Layers/commit/090bf95f1c19021a5baedec1e892cced2b3254e0) docs: add S4.6 computed-style cache plan (S4.6 Task 0)
  - [`d1135be`](https://github.com/brunomaida/Layers/commit/d1135bec7b34a564059e20122ad2dc0216d034b9) test(perf): add main-thread breakdown and computed-style upper bounds (S4.6 Task 2)
  - [`b92dbbe`](https://github.com/brunomaida/Layers/commit/b92dbbe2e29c1bf09b4e2c343a044e6cf19d889d) test(perf): record S4.6 orbit baseline and computed-style upper bounds (S4.6 Task 2)
  - [`cb04508`](https://github.com/brunomaida/Layers/commit/cb04508ee9b776c94eed6168a5eb2f5ed65d908a) test(perf): point the orbit budget gap at S4.7 and S4.8 (S4.6 Task 2)
  - [`528270a`](https://github.com/brunomaida/Layers/commit/528270aa3af88d3b8f76657725d5ae59f55f6b32) docs: record the S4.6 measured-negative in checklist, architecture and changelog (S4.6 Task 7)
  - [`47a42e0`](https://github.com/brunomaida/Layers/commit/47a42e0817423e60c567c9a7ef6ebba61a2fcd41) docs: correct the S4.6 plan call-site table for vis() (S4.6)
  - [`98664d1`](https://github.com/brunomaida/Layers/commit/98664d10e23be5e08f7d5ea50105c611881070a6) docs: close S4.6 measured-negative with its report (S4.6)

### Todos os commits

- [`4888c31`](https://github.com/brunomaida/Layers/commit/4888c31a59353be4885b3c3832569b35da3fb7d6) docs: start S4.6 in the tracker (S4.6 Task 0)
- [`090bf95`](https://github.com/brunomaida/Layers/commit/090bf95f1c19021a5baedec1e892cced2b3254e0) docs: add S4.6 computed-style cache plan (S4.6 Task 0)
- [`d1135be`](https://github.com/brunomaida/Layers/commit/d1135bec7b34a564059e20122ad2dc0216d034b9) test(perf): add main-thread breakdown and computed-style upper bounds (S4.6 Task 2)
- [`b92dbbe`](https://github.com/brunomaida/Layers/commit/b92dbbe2e29c1bf09b4e2c343a044e6cf19d889d) test(perf): record S4.6 orbit baseline and computed-style upper bounds (S4.6 Task 2)
- [`ba49b41`](https://github.com/brunomaida/Layers/commit/ba49b415ab17ca549df10835a4c321f662194e6d) docs: register S4.8 plane cost leaf (S4.6)
- [`cb04508`](https://github.com/brunomaida/Layers/commit/cb04508ee9b776c94eed6168a5eb2f5ed65d908a) test(perf): point the orbit budget gap at S4.7 and S4.8 (S4.6 Task 2)
- [`528270a`](https://github.com/brunomaida/Layers/commit/528270aa3af88d3b8f76657725d5ae59f55f6b32) docs: record the S4.6 measured-negative in checklist, architecture and changelog (S4.6 Task 7)
- [`47a42e0`](https://github.com/brunomaida/Layers/commit/47a42e0817423e60c567c9a7ef6ebba61a2fcd41) docs: correct the S4.6 plan call-site table for vis() (S4.6)
- [`98664d1`](https://github.com/brunomaida/Layers/commit/98664d10e23be5e08f7d5ea50105c611881070a6) docs: close S4.6 measured-negative with its report (S4.6)
- [`78504f5`](https://github.com/brunomaida/Layers/commit/78504f584dca99007afa50673916dcadfcdee59c) docs: remove a false broken link from the S4.6 plan (S4.6)
- [`ff9a765`](https://github.com/brunomaida/Layers/commit/ff9a76584414ed2429f34bdda3e5a5c507404ae9) docs: correct S4.6 close-out wording after review (S4.6)

## Custo (tokens + tempo)

_Sem sessões Claude detectadas no range._
