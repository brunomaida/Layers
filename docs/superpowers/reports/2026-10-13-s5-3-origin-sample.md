# Implementation Report — s5-3-origin-sample

- **Branch:** `feature/261013-35-s5-3-origin-sample`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-13 22:01 → 2026-10-13 22:06
- **Status:** `final`
- **Gerado em:** 2026-10-13 22:06

## Resumo

`e2e/origin-sample.spec.js`: for up to 30 nodes per fixture (`ORIGIN_SAMPLE` overrides), the `file|selector|line` origin must resolve to a file in the fixture and the rule prelude must show the selector or a class of the node. 16 fixtures pass for loader-derived origins.

## Mudanças

### Added (2)

- `changelog.d/feature-261013-35-s5-3-origin-sample.md` (+12/-0, doc)
- `e2e/origin-sample.spec.js` (+101/-0, src)

### Changed (4)

- `docs/RELEASE-CHECKLIST.md` (+2/-2, doc)
- `docs/roadmap.config.json` (+2/-1, doc)
- `docs/roadmap.data.json` (+4/-4, doc)
- `docs/roadmap.md` (+2/-1, doc)

### Changelog fragment

**Added:**
- `e2e/origin-sample.spec.js`: for up to 30 nodes per fixture (`ORIGIN_SAMPLE` overrides), the `file|selector|line` origin must resolve to a file in the fixture and the rule prelude must show the selector or a class of the node. 16 fixtures pass for loader-derived origins.

**Findings:**
- Traval carries only hand-written `data-src` in its mock: 31 of 199 nodes point to a line that no longer shows the selector, and 19 point into the real app's `.ts`, which the fixture does not vendor. The loader keeps an authored `data-src` over the derived one. Registered as S2.20; the spec reports it as an annotation and does not fail on it.

**Perf:**
- N/A — test-only change; no runtime code touched.

## Arquivos tocados

### src (1)

- [`e2e/origin-sample.spec.js`](../../../e2e/origin-sample.spec.js) — A (+101/-0)

### doc (5)

- [`changelog.d/feature-261013-35-s5-3-origin-sample.md`](../../../changelog.d/feature-261013-35-s5-3-origin-sample.md) — A (+12/-0)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+2/-2)
- [`docs/roadmap.config.json`](../../roadmap.config.json) — M (+2/-1)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+4/-4)
- [`docs/roadmap.md`](../../roadmap.md) — M (+2/-1)

## Testes

_Sem testes adicionados ou modificados no range._

## Commits ↔ changelog

- **Added:** `e2e/origin-sample.spec.js`: for up to 30 nodes per fixture (`ORIGIN_SAMPLE` overrides), the `file|selector|line` origin must resolve to a file in the fixture and the rule prelude must show the selector or a class of the node. 16 fixtures pass for loader-derived origins.
  - [`c106898`](https://github.com/brunomaida/Layers/commit/c106898ec25be0d295f73703f003c7cb01d020cb) test(e2e): sampled origin check per fixture, derived vs authored data-src (S5.3, #35)
- **Findings:** Traval carries only hand-written `data-src` in its mock: 31 of 199 nodes point to a line that no longer shows the selector, and 19 point into the real app's `.ts`, which the fixture does not vendor. The loader keeps an authored `data-src` over the derived one. Registered as S2.20; the spec reports it as an annotation and does not fail on it.
  - [`c106898`](https://github.com/brunomaida/Layers/commit/c106898ec25be0d295f73703f003c7cb01d020cb) test(e2e): sampled origin check per fixture, derived vs authored data-src (S5.3, #35)
  - [`85e6206`](https://github.com/brunomaida/Layers/commit/85e6206d08bc105db84a8aee5ede3904851b1192) docs: close S5.3, register S2.20 for stale authored data-src (S5.3, #35)
- **Perf:** N/A — test-only change; no runtime code touched.
  - [`c106898`](https://github.com/brunomaida/Layers/commit/c106898ec25be0d295f73703f003c7cb01d020cb) test(e2e): sampled origin check per fixture, derived vs authored data-src (S5.3, #35)

### Todos os commits

- [`ccf0593`](https://github.com/brunomaida/Layers/commit/ccf05939f5204abdf7e82f831fe0ffb94553de7d) docs(roadmap): mark S5.3 in-progress (S5.3, #35)
- [`c106898`](https://github.com/brunomaida/Layers/commit/c106898ec25be0d295f73703f003c7cb01d020cb) test(e2e): sampled origin check per fixture, derived vs authored data-src (S5.3, #35)
- [`85e6206`](https://github.com/brunomaida/Layers/commit/85e6206d08bc105db84a8aee5ede3904851b1192) docs: close S5.3, register S2.20 for stale authored data-src (S5.3, #35)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `5b54a0ee` | 2026-10-13 21:25 | 40.3m | 386 | 152.0k | 31.96M | 433.5k |
| **Total (1)** | — | **40.3m** | **386** | **152.0k** | **31.96M** | **433.5k** |
