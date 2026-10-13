---
title: "Benchmark History"
type: bench-history
solution: Layers
created: 2026-10-13
---

# Benchmark History

_generated 2026-10-13T22:44:32Z · env `61c971a2` · 12th Gen Intel(R) Core(TM) i7-12700 · chromium 153.0.8010.12 (playwright) · 20 cores · GC=V8_

_Methodology: `docs/bench-methodology.md` (v1)_

> Derived file — **do not edit by hand**. Regenerate with `/bench-report ingest`.
> Interactive view: Atlas Bench tab (`http://127.0.0.1:5190/`), reads `bench-history.json`.

## 2026-10-13

### layers-ui — 22:44:08Z  ·  _latency · env 61c971a2 · c2f7aadbe2ea912185134e0ae716a9ba3673641b_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 8.80 ns | 0.00 ns | — | — | new |
| `load/traval/first-scan-end-ms` | 639.40 ns | 0.00 ns | — | — | new |
| `scan/1500-tags-ms` | 56.00 ns | 0.00 ns | — | — | new |
| `orbit/traval/mean-frame-ms` | 24.02 ns | 0.00 ns | — | — | new |
| `explode/traval/toggle-ms` | 99.80 ns | 0.00 ns | — | — | new |

### layers-core — 22:40:55Z  ·  _micro · env 9cde50ed · 9d70ef1babf9c105e5d39f73adf131039e4e10a6_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `parseSheet/plain-admin/materialdesignicons` | 14.40 ms | 3.03 ms | — | 5.19 MB | new |
| `parseSheet/ecommerce-jsx/app` | 7.81 ms | 1.54 ms | — | 7.04 MB | new |
| `parseSheet/traval/components` | 649.70 µs | 296.11 µs | — | 433.79 KB | new |
| `parseSheet/axai/painel` | 1.17 ms | 404.82 µs | — | 839.67 KB | new |
| `parseSheet/marketview/inline` | 1.09 ms | 419.20 µs | — | 891.43 KB | new |
| `scopeAst/plain-admin/materialdesignicons` | 17.82 ms | 2.85 ms | — | 2.81 MB | new |
| `scopeAst/ecommerce-jsx/app` | 12.20 ms | 2.78 ms | — | 10.17 MB | new |
| `scopeAst/traval/components` | 642.59 µs | 133.02 µs | — | 485.02 KB | new |
| `scopeAst/axai/painel` | 1.31 ms | 294.91 µs | — | 887.31 KB | new |
| `scopeAst/marketview/inline` | 1.21 ms | 177.91 µs | — | 1.70 MB | new |
| `isUtilitySheet/plain-admin/materialdesignicons` | 16.70 ms | 3.76 ms | — | — | new |
| `isUtilitySheet/ecommerce-jsx/app` | 8.07 ms | 1.58 ms | — | — | new |
| `isUtilitySheet/traval/components` | 646.51 µs | 190.21 µs | — | — | new |
| `isUtilitySheet/axai/painel` | 1.06 ms | 208.68 µs | — | — | new |
| `isUtilitySheet/marketview/inline` | 1.16 ms | 358.08 µs | — | — | new |
| `buildIndex/traval/4-sheets` | 2.40 ms | 480.26 µs | — | 1.32 MB | new |
| `varIndex/traval/4-sheets` | 1.65 ms | 312.75 µs | — | — | new |
| `patchCssAt/ecommerce-jsx/app/color` | 14.18 ms | 836.19 µs | — | — | new |
| `mapDcTemplate/dc-template/index` | 3.36 µs | 3.00 µs | — | 10.64 KB | new |
| `patchDc/dc-template/one-item` | 12.46 µs | 11.45 µs | — | — | new |
| `deriveManifest/plain-admin/html+css` | 165.04 µs | 40.18 µs | — | — | new |
| `openZip/zip/evil` | 416.72 µs | 380.29 µs | — | — | new |

<!-- doc-links:auto -->
## Related

- [Bench methodology](../../bench-methodology.md)
