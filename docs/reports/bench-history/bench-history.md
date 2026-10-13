---
title: "Benchmark History"
type: bench-history
solution: Layers
created: 2026-10-13
---

# Benchmark History

_generated 2026-10-13T22:14:05Z · env `473384da` · 12th Gen Intel(R) Core(TM) i7-12700 · chromium (playwright) · 20 cores · GC=V8_

_Methodology: `docs/bench-methodology.md` (v1)_

> Derived file — **do not edit by hand**. Regenerate with `/bench-report ingest`.
> Interactive view: Atlas Bench tab (`http://127.0.0.1:5190/`), reads `bench-history.json`.

## 2026-10-13

### layers-ui — 22:13:33Z  ·  _latency · env 473384da · 8b38d8a294d69ad2f89f0407e290afbe6b6c773a_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 113.00 ns | 0.00 ns | — | — | new |
| `load/traval/wall-ms` | 1.50 µs | 0.00 ns | — | — | new |
| `load/traval/gcs-calls` | 832.00 ns | 0.00 ns | — | — | new |
| `scan/1500-tags-ms` | 43.20 ns | 0.00 ns | — | — | new |
| `scan/1500-tags-gcs-calls` | 1.66 µs | 0.00 ns | — | — | new |
| `orbit/traval/fps` | 16.95 ns | 0.00 ns | — | — | new |
| `orbit/traval/p95-frame-ms` | 66.80 ns | 0.00 ns | — | — | new |
| `orbit/traval/longtasks` | 0.00 ns | 0.00 ns | — | — | new |
| `explode/traval/toggle-ms` | 67.80 ns | 0.00 ns | — | — | new |

### layers-core — 22:05:51Z  ·  _micro · env 9cde50ed · 6c6dbfd9bec267d42865408b5bbf87875edfdc5e_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `parseSheet/plain-admin/materialdesignicons` | 14.99 ms | 3.11 ms | — | 4.90 MB | new |
| `parseSheet/ecommerce-jsx/app` | 7.72 ms | 1.13 ms | — | 2.82 MB | new |
| `parseSheet/traval/components` | 524.84 µs | 81.94 µs | — | 434.19 KB | new |
| `parseSheet/axai/painel` | 1.18 ms | 309.14 µs | — | 840.44 KB | new |
| `parseSheet/marketview/inline` | 1.06 ms | 271.67 µs | — | 886.74 KB | new |
| `scopeAst/plain-admin/materialdesignicons` | 19.35 ms | 2.96 ms | — | 5.74 MB | new |
| `scopeAst/ecommerce-jsx/app` | 11.79 ms | 2.59 ms | — | 10.16 MB | new |
| `scopeAst/traval/components` | 667.24 µs | 247.32 µs | — | 487.13 KB | new |
| `scopeAst/axai/painel` | 1.22 ms | 262.60 µs | — | 869.15 KB | new |
| `scopeAst/marketview/inline` | 1.23 ms | 172.55 µs | — | 1.68 MB | new |
| `isUtilitySheet/plain-admin/materialdesignicons` | 15.80 ms | 4.16 ms | — | — | new |
| `isUtilitySheet/ecommerce-jsx/app` | 7.45 ms | 352.88 µs | — | — | new |
| `isUtilitySheet/traval/components` | 557.52 µs | 113.75 µs | — | — | new |
| `isUtilitySheet/axai/painel` | 1.07 ms | 191.80 µs | — | — | new |
| `isUtilitySheet/marketview/inline` | 1.04 ms | 234.60 µs | — | — | new |
| `buildIndex/traval/4-sheets` | 1.90 ms | 398.55 µs | — | 1.32 MB | new |
| `varIndex/traval/4-sheets` | 1.64 ms | 306.76 µs | — | — | new |
| `patchCssAt/ecommerce-jsx/app/color` | 15.20 ms | 1.12 ms | — | — | new |
| `mapDcTemplate/dc-template/index` | 3.62 µs | 7.52 µs | — | 10.64 KB | new |
| `patchDc/dc-template/one-item` | 11.76 µs | 8.09 µs | — | — | new |
| `deriveManifest/plain-admin/html+css` | 159.96 µs | 29.23 µs | — | — | new |
| `openZip/zip/evil` | — | — | — | — | new |

<!-- doc-links:auto -->
## Related

- [Bench methodology](../../bench-methodology.md)
