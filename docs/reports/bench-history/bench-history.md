# Benchmark History

_generated 2026-10-17T01:16:52Z · env `61c971a2` · 12th Gen Intel(R) Core(TM) i7-12700 · chromium 153.0.8010.12 (playwright) · 20 cores · GC=V8_

_Methodology: `docs/bench-methodology.md` (v1)_

> Derived file — **do not edit by hand**. Regenerate with `/bench-report ingest`.
> Interactive view: Atlas Bench tab (`http://127.0.0.1:5190/`), reads `bench-history.json`.

## 2026-10-17

### layers-ui — 01:06:58Z  ·  _latency · env 61c971a2 · 4c5397a8fe11cd7d4e8fce2e34abbb653efb9cb3_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 7.80 ns | 0.00 ns | — | — | ≈ +2.6% |
| `load/traval/first-scan-end-ms` | 482.70 ns | 0.00 ns | — | — | ≈ +2.4% |
| `scan/1500-tags-ms` | 42.30 ns | 0.00 ns | — | — | ≈ -2.5% |
| `orbit/traval/mean-frame-ms` | 23.70 ns | 0.00 ns | — | — | ≈ -3.5% |
| `orbit/traval-gcs-ideal/mean-frame-ms` | 24.07 ns | 0.00 ns | — | — | ≈ +1.4% |
| `orbit/traval-panel-ideal/mean-frame-ms` | 24.09 ns | 0.00 ns | — | — | ≈ +0.1% |
| `orbit/traval-zoom/mean-frame-ms` | 18.58 ns | 0.00 ns | — | — | ≈ +1.5% |
| `orbit/traval-zoom-ideal/mean-frame-ms` | 19.85 ns | 0.00 ns | — | — | ▲ +8.2% |
| `orbit/traval-tree-closed/mean-frame-ms` | 23.79 ns | 0.00 ns | — | — | ≈ +1.9% |
| `orbit/traval-tree-ideal/mean-frame-ms` | 24.34 ns | 0.00 ns | — | — | ▲ +7.8% |
| `orbit/traval-v1/mean-frame-ms` | 23.63 ns | 0.00 ns | — | — | ≈ -0.4% |
| `orbit/traval-v1-tree-ideal/mean-frame-ms` | 23.10 ns | 0.00 ns | — | — | ≈ +2.1% |
| `orbit/1500-tags/mean-frame-ms` | 63.09 ns | 0.00 ns | — | — | ▼ -6.6% |
| `orbit/1500-tags-tree-closed/mean-frame-ms` | 42.52 ns | 0.00 ns | — | — | ▼ -11.1% |
| `orbit/1500-tags-tree-ideal/mean-frame-ms` | 40.88 ns | 0.00 ns | — | — | ▼ -13.6% |
| `orbit/1500-tags-v1/mean-frame-ms` | 62.36 ns | 0.00 ns | — | — | ≈ -0.9% |
| `orbit/1500-tags-v1-tree-ideal/mean-frame-ms` | 49.47 ns | 0.00 ns | — | — | ≈ +4.1% |
| `tree/traval/hover-ms` | 25.10 ns | 0.00 ns | — | — | ≈ -1.6% |
| `tree/traval/select-ms` | 78.50 ns | 0.00 ns | — | — | ▼ -6.2% |
| `tree/1500-tags/hover-ms` | 76.40 ns | 0.00 ns | — | — | ▼ -10.1% |
| `tree/1500-tags/select-ms` | 414.10 ns | 0.00 ns | — | — | ▼ -14.8% |
| `tree/1500-tags/scroll-frame-ms` | 250.63 ns | 0.00 ns | — | — | ▼ -7.5% |
| `explode/traval/toggle-ms` | 62.40 ns | 0.00 ns | — | — | ≈ +0.6% |

### layers-ui — 01:05:03Z  ·  _latency · env 61c971a2 · 4c5397a8fe11cd7d4e8fce2e34abbb653efb9cb3_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 7.60 ns | 0.00 ns | — | — | ▼ -9.5% |
| `load/traval/first-scan-end-ms` | 471.40 ns | 0.00 ns | — | — | ▼ -5.4% |
| `scan/1500-tags-ms` | 43.40 ns | 0.00 ns | — | — | ≈ +3.3% |
| `orbit/traval/mean-frame-ms` | 24.57 ns | 0.00 ns | — | — | ≈ +2.1% |
| `orbit/traval-gcs-ideal/mean-frame-ms` | 23.75 ns | 0.00 ns | — | — | ≈ -0.8% |
| `orbit/traval-panel-ideal/mean-frame-ms` | 24.07 ns | 0.00 ns | — | — | ≈ +2.6% |
| `orbit/traval-zoom/mean-frame-ms` | 18.30 ns | 0.00 ns | — | — | ≈ +0.1% |
| `orbit/traval-zoom-ideal/mean-frame-ms` | 18.34 ns | 0.00 ns | — | — | ≈ -3.6% |
| `orbit/traval-tree-closed/mean-frame-ms` | 23.34 ns | 0.00 ns | — | — | ▼ -7.5% |
| `orbit/traval-tree-ideal/mean-frame-ms` | 22.58 ns | 0.00 ns | — | — | ≈ -3.3% |
| `orbit/traval-v1/mean-frame-ms` | 23.72 ns | 0.00 ns | — | — | ≈ +0.8% |
| `orbit/traval-v1-tree-ideal/mean-frame-ms` | 22.63 ns | 0.00 ns | — | — | ≈ -1.7% |
| `orbit/1500-tags/mean-frame-ms` | 67.52 ns | 0.00 ns | — | — | ▼ -5.9% |
| `orbit/1500-tags-tree-closed/mean-frame-ms` | 47.85 ns | 0.00 ns | — | — | ▲ +14.0% |
| `orbit/1500-tags-tree-ideal/mean-frame-ms` | 47.32 ns | 0.00 ns | — | — | ▼ -5.3% |
| `orbit/1500-tags-v1/mean-frame-ms` | 62.89 ns | 0.00 ns | — | — | ▲ +14.1% |
| `orbit/1500-tags-v1-tree-ideal/mean-frame-ms` | 47.51 ns | 0.00 ns | — | — | ▲ +6.1% |
| `tree/traval/hover-ms` | 25.50 ns | 0.00 ns | — | — | ≈ -3.4% |
| `tree/traval/select-ms` | 83.70 ns | 0.00 ns | — | — | ▲ +9.4% |
| `tree/1500-tags/hover-ms` | 85.00 ns | 0.00 ns | — | — | ▲ +11.8% |
| `tree/1500-tags/select-ms` | 485.90 ns | 0.00 ns | — | — | ▼ -5.4% |
| `tree/1500-tags/scroll-frame-ms` | 270.91 ns | 0.00 ns | — | — | ≈ -1.4% |
| `explode/traval/toggle-ms` | 62.00 ns | 0.00 ns | — | — | ≈ -2.7% |

### layers-ui — 01:03:05Z  ·  _latency · env 61c971a2 · 4c5397a8fe11cd7d4e8fce2e34abbb653efb9cb3_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 8.40 ns | 0.00 ns | — | — | ≈ +2.4% |
| `load/traval/first-scan-end-ms` | 498.30 ns | 0.00 ns | — | — | ≈ +4.4% |
| `scan/1500-tags-ms` | 42.00 ns | 0.00 ns | — | — | ▼ -11.8% |
| `orbit/traval/mean-frame-ms` | 24.06 ns | 0.00 ns | — | — | ▲ +7.9% |
| `orbit/traval-gcs-ideal/mean-frame-ms` | 23.93 ns | 0.00 ns | — | — | ≈ +1.5% |
| `orbit/traval-panel-ideal/mean-frame-ms` | 23.46 ns | 0.00 ns | — | — | ≈ -2.0% |
| `orbit/traval-zoom/mean-frame-ms` | 18.28 ns | 0.00 ns | — | — | ≈ +4.0% |
| `orbit/traval-zoom-ideal/mean-frame-ms` | 19.03 ns | 0.00 ns | — | — | ≈ -0.8% |
| `orbit/traval-tree-closed/mean-frame-ms` | 25.22 ns | 0.00 ns | — | — | new |
| `orbit/traval-tree-ideal/mean-frame-ms` | 23.34 ns | 0.00 ns | — | — | new |
| `orbit/traval-v1/mean-frame-ms` | 23.52 ns | 0.00 ns | — | — | new |
| `orbit/traval-v1-tree-ideal/mean-frame-ms` | 23.01 ns | 0.00 ns | — | — | new |
| `orbit/1500-tags/mean-frame-ms` | 71.75 ns | 0.00 ns | — | — | new |
| `orbit/1500-tags-tree-closed/mean-frame-ms` | 41.97 ns | 0.00 ns | — | — | new |
| `orbit/1500-tags-tree-ideal/mean-frame-ms` | 49.99 ns | 0.00 ns | — | — | new |
| `orbit/1500-tags-v1/mean-frame-ms` | 55.09 ns | 0.00 ns | — | — | new |
| `orbit/1500-tags-v1-tree-ideal/mean-frame-ms` | 44.77 ns | 0.00 ns | — | — | new |
| `tree/traval/hover-ms` | 26.40 ns | 0.00 ns | — | — | new |
| `tree/traval/select-ms` | 76.50 ns | 0.00 ns | — | — | new |
| `tree/1500-tags/hover-ms` | 76.00 ns | 0.00 ns | — | — | new |
| `tree/1500-tags/select-ms` | 513.50 ns | 0.00 ns | — | — | new |
| `tree/1500-tags/scroll-frame-ms` | 274.63 ns | 0.00 ns | — | — | new |
| `explode/traval/toggle-ms` | 63.70 ns | 0.00 ns | — | — | ▼ -8.6% |

### layers-ui — 00:38:11Z  ·  _latency · env 61c971a2 · 226ad2fa27b81aa607494c24688ea7d4d1ffca68_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 8.20 ns | 0.00 ns | — | — | ≈ -4.7% |
| `load/traval/first-scan-end-ms` | 477.20 ns | 0.00 ns | — | — | ▼ -8.5% |
| `scan/1500-tags-ms` | 47.60 ns | 0.00 ns | — | — | ≈ +0.4% |
| `orbit/traval/mean-frame-ms` | 22.30 ns | 0.00 ns | — | — | ▼ -9.5% |
| `orbit/traval-gcs-ideal/mean-frame-ms` | 23.57 ns | 0.00 ns | — | — | ▼ -5.7% |
| `orbit/traval-panel-ideal/mean-frame-ms` | 23.95 ns | 0.00 ns | — | — | ≈ +1.0% |
| `orbit/traval-v1-no-hit/mean-frame-ms` | 22.95 ns | 0.00 ns | — | — | ≈ -4.9% |
| `orbit/traval-v2a-planes-no-will-change/mean-frame-ms` | 23.15 ns | 0.00 ns | — | — | ≈ -1.8% |
| `orbit/traval-v2b-world-no-will-change/mean-frame-ms` | 24.29 ns | 0.00 ns | — | — | ≈ -2.9% |
| `orbit/traval-wire-off/mean-frame-ms` | 22.83 ns | 0.00 ns | — | — | ▼ -6.0% |
| `orbit/traval-v3-empty-hidden/mean-frame-ms` | 21.31 ns | 0.00 ns | — | — | ▼ -33.3% |
| `orbit/traval-v4-half-hidden/mean-frame-ms` | 17.36 ns | 0.00 ns | — | — | ≈ -0.1% |
| `orbit/traval-aa/mean-frame-ms` | 22.75 ns | 0.00 ns | — | — | ≈ -4.6% |
| `orbit/traval-zoom/mean-frame-ms` | 17.57 ns | 0.00 ns | — | — | ≈ -1.9% |
| `orbit/traval-zoom-ideal/mean-frame-ms` | 19.19 ns | 0.00 ns | — | — | ▲ +8.1% |
| `explode/traval/toggle-ms` | 69.70 ns | 0.00 ns | — | — | ≈ -2.1% |

### layers-ui — 00:35:59Z  ·  _latency · env 61c971a2 · 226ad2fa27b81aa607494c24688ea7d4d1ffca68_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 8.60 ns | 0.00 ns | — | — | ▲ +7.5% |
| `load/traval/first-scan-end-ms` | 521.60 ns | 0.00 ns | — | — | ≈ +2.8% |
| `scan/1500-tags-ms` | 47.40 ns | 0.00 ns | — | — | ≈ +2.2% |
| `orbit/traval/mean-frame-ms` | 24.64 ns | 0.00 ns | — | — | ≈ +3.3% |
| `orbit/traval-gcs-ideal/mean-frame-ms` | 25.00 ns | 0.00 ns | — | — | ▲ +9.6% |
| `orbit/traval-panel-ideal/mean-frame-ms` | 23.71 ns | 0.00 ns | — | — | ≈ +2.2% |
| `orbit/traval-v1-no-hit/mean-frame-ms` | 24.13 ns | 0.00 ns | — | — | ≈ -1.5% |
| `orbit/traval-v2a-planes-no-will-change/mean-frame-ms` | 23.57 ns | 0.00 ns | — | — | ≈ -1.5% |
| `orbit/traval-v2b-world-no-will-change/mean-frame-ms` | 25.00 ns | 0.00 ns | — | — | ≈ +1.5% |
| `orbit/traval-wire-off/mean-frame-ms` | 24.29 ns | 0.00 ns | — | — | ≈ +0.5% |
| `orbit/traval-v3-empty-hidden/mean-frame-ms` | 31.93 ns | 0.00 ns | — | — | ▲ +47.9% |
| `orbit/traval-v4-half-hidden/mean-frame-ms` | 17.38 ns | 0.00 ns | — | — | ≈ +0.0% |
| `orbit/traval-aa/mean-frame-ms` | 23.85 ns | 0.00 ns | — | — | ≈ +0.2% |
| `orbit/traval-zoom/mean-frame-ms` | 17.91 ns | 0.00 ns | — | — | ▼ -11.6% |
| `orbit/traval-zoom-ideal/mean-frame-ms` | 17.75 ns | 0.00 ns | — | — | ▼ -6.5% |
| `explode/traval/toggle-ms` | 71.20 ns | 0.00 ns | — | — | ≈ +2.2% |

### layers-ui — 00:34:40Z  ·  _latency · env 61c971a2 · 226ad2fa27b81aa607494c24688ea7d4d1ffca68_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 8.00 ns | 0.00 ns | — | — | ≈ +2.6% |
| `load/traval/first-scan-end-ms` | 507.50 ns | 0.00 ns | — | — | ▲ +8.9% |
| `scan/1500-tags-ms` | 46.40 ns | 0.00 ns | — | — | ▲ +10.0% |
| `orbit/traval/mean-frame-ms` | 23.84 ns | 0.00 ns | — | — | ≈ +0.1% |
| `orbit/traval-gcs-ideal/mean-frame-ms` | 22.81 ns | 0.00 ns | — | — | ≈ -4.2% |
| `orbit/traval-panel-ideal/mean-frame-ms` | 23.20 ns | 0.00 ns | — | — | ≈ -3.5% |
| `orbit/traval-v1-no-hit/mean-frame-ms` | 24.50 ns | 0.00 ns | — | — | new |
| `orbit/traval-v2a-planes-no-will-change/mean-frame-ms` | 23.94 ns | 0.00 ns | — | — | new |
| `orbit/traval-v2b-world-no-will-change/mean-frame-ms` | 24.63 ns | 0.00 ns | — | — | new |
| `orbit/traval-wire-off/mean-frame-ms` | 24.16 ns | 0.00 ns | — | — | new |
| `orbit/traval-v3-empty-hidden/mean-frame-ms` | 21.58 ns | 0.00 ns | — | — | new |
| `orbit/traval-v4-half-hidden/mean-frame-ms` | 17.37 ns | 0.00 ns | — | — | new |
| `orbit/traval-aa/mean-frame-ms` | 23.81 ns | 0.00 ns | — | — | new |
| `orbit/traval-zoom/mean-frame-ms` | 20.25 ns | 0.00 ns | — | — | ▲ +10.9% |
| `orbit/traval-zoom-ideal/mean-frame-ms` | 19.00 ns | 0.00 ns | — | — | ▲ +5.4% |
| `explode/traval/toggle-ms` | 69.70 ns | 0.00 ns | — | — | ▲ +7.2% |

## 2026-10-15

### layers-ui — 01:06:00Z  ·  _latency · env 61c971a2 · d1135bec7b34a564059e20122ad2dc0216d034b9_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 7.80 ns | 0.00 ns | — | — | ≈ -1.3% |
| `load/traval/first-scan-end-ms` | 466.10 ns | 0.00 ns | — | — | ≈ +4.0% |
| `scan/1500-tags-ms` | 42.20 ns | 0.00 ns | — | — | ≈ -0.2% |
| `orbit/traval/mean-frame-ms` | 23.83 ns | 0.00 ns | — | — | ≈ -1.0% |
| `orbit/traval-gcs-ideal/mean-frame-ms` | 23.81 ns | 0.00 ns | — | — | ≈ -1.2% |
| `orbit/traval-panel-ideal/mean-frame-ms` | 24.03 ns | 0.00 ns | — | — | ≈ +0.9% |
| `orbit/traval-zoom/mean-frame-ms` | 18.26 ns | 0.00 ns | — | — | ≈ +0.4% |
| `orbit/traval-zoom-ideal/mean-frame-ms` | 18.03 ns | 0.00 ns | — | — | ≈ +0.2% |
| `explode/traval/toggle-ms` | 65.00 ns | 0.00 ns | — | — | ▲ +8.5% |

### layers-ui — 01:05:32Z  ·  _latency · env 61c971a2 · d1135bec7b34a564059e20122ad2dc0216d034b9_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 7.90 ns | 0.00 ns | — | — | ≈ +3.9% |
| `load/traval/first-scan-end-ms` | 448.00 ns | 0.00 ns | — | — | ≈ -0.2% |
| `scan/1500-tags-ms` | 42.30 ns | 0.00 ns | — | — | ≈ +0.0% |
| `orbit/traval/mean-frame-ms` | 24.07 ns | 0.00 ns | — | — | ≈ +1.4% |
| `orbit/traval-gcs-ideal/mean-frame-ms` | 24.10 ns | 0.00 ns | — | — | ≈ -0.1% |
| `orbit/traval-panel-ideal/mean-frame-ms` | 23.83 ns | 0.00 ns | — | — | ≈ -0.4% |
| `orbit/traval-zoom/mean-frame-ms` | 18.19 ns | 0.00 ns | — | — | ≈ +1.4% |
| `orbit/traval-zoom-ideal/mean-frame-ms` | 17.99 ns | 0.00 ns | — | — | ≈ -0.3% |
| `explode/traval/toggle-ms` | 59.90 ns | 0.00 ns | — | — | ≈ -0.3% |

### layers-ui — 01:05:03Z  ·  _latency · env 61c971a2 · d1135bec7b34a564059e20122ad2dc0216d034b9_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 7.60 ns | 0.00 ns | — | — | ▼ -37.2% |
| `load/traval/first-scan-end-ms` | 448.70 ns | 0.00 ns | — | — | ▼ -23.7% |
| `scan/1500-tags-ms` | 42.30 ns | 0.00 ns | — | — | ▼ -5.6% |
| `orbit/traval/mean-frame-ms` | 23.75 ns | 0.00 ns | — | — | ≈ +0.9% |
| `orbit/traval-gcs-ideal/mean-frame-ms` | 24.13 ns | 0.00 ns | — | — | new |
| `orbit/traval-panel-ideal/mean-frame-ms` | 23.93 ns | 0.00 ns | — | — | new |
| `orbit/traval-zoom/mean-frame-ms` | 17.94 ns | 0.00 ns | — | — | ▲ +7.6% |
| `orbit/traval-zoom-ideal/mean-frame-ms` | 18.04 ns | 0.00 ns | — | — | ▲ +8.3% |
| `explode/traval/toggle-ms` | 60.10 ns | 0.00 ns | — | — | ▼ -11.9% |

## 2026-10-14

### layers-ui — 18:31:39Z  ·  _latency · env 61c971a2 · e62e9656649ca0568ce7ad0849c69a8b0e7d4517_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 12.10 ns | 0.00 ns | — | — | ▲ +57.1% |
| `load/traval/first-scan-end-ms` | 587.80 ns | 0.00 ns | — | — | ▲ +28.5% |
| `scan/1500-tags-ms` | 44.80 ns | 0.00 ns | — | — | ≈ -1.8% |
| `orbit/traval/mean-frame-ms` | 23.53 ns | 0.00 ns | — | — | ≈ +2.1% |
| `orbit/traval-zoom/mean-frame-ms` | 16.67 ns | 0.00 ns | — | — | ≈ +0.0% |
| `orbit/traval-zoom-ideal/mean-frame-ms` | 16.67 ns | 0.00 ns | — | — | ≈ +0.0% |
| `explode/traval/toggle-ms` | 68.20 ns | 0.00 ns | — | — | ≈ +4.6% |

### layers-ui — 18:30:01Z  ·  _latency · env 61c971a2 · e62e9656649ca0568ce7ad0849c69a8b0e7d4517_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 7.70 ns | 0.00 ns | — | — | ▼ -6.1% |
| `load/traval/first-scan-end-ms` | 457.50 ns | 0.00 ns | — | — | ▼ -8.7% |
| `scan/1500-tags-ms` | 45.60 ns | 0.00 ns | — | — | ▲ +7.8% |
| `orbit/traval/mean-frame-ms` | 23.04 ns | 0.00 ns | — | — | ≈ -2.3% |
| `orbit/traval-zoom/mean-frame-ms` | 16.67 ns | 0.00 ns | — | — | ≈ -0.0% |
| `orbit/traval-zoom-ideal/mean-frame-ms` | 16.67 ns | 0.00 ns | — | — | ≈ -0.0% |
| `explode/traval/toggle-ms` | 65.20 ns | 0.00 ns | — | — | ≈ -2.4% |

### layers-ui — 18:27:18Z  ·  _latency · env 61c971a2 · e62e9656649ca0568ce7ad0849c69a8b0e7d4517_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 8.20 ns | 0.00 ns | — | — | ≈ +3.8% |
| `load/traval/first-scan-end-ms` | 501.30 ns | 0.00 ns | — | — | ▼ -6.7% |
| `scan/1500-tags-ms` | 42.30 ns | 0.00 ns | — | — | ▼ -7.8% |
| `orbit/traval/mean-frame-ms` | 23.59 ns | 0.00 ns | — | — | ▼ -5.7% |
| `orbit/traval-zoom/mean-frame-ms` | 16.67 ns | 0.00 ns | — | — | ▼ -39.8% |
| `orbit/traval-zoom-ideal/mean-frame-ms` | 16.67 ns | 0.00 ns | — | — | ≈ -1.1% |
| `explode/traval/toggle-ms` | 66.80 ns | 0.00 ns | — | — | ≈ +1.7% |

### layers-ui — 18:13:40Z  ·  _latency · env 61c971a2 · 63f137d9f4a0c488785583156b8cfe5688078710_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 7.90 ns | 0.00 ns | — | — | ▼ -26.2% |
| `load/traval/first-scan-end-ms` | 537.20 ns | 0.00 ns | — | — | ≈ -4.2% |
| `scan/1500-tags-ms` | 45.90 ns | 0.00 ns | — | — | ▼ -24.6% |
| `orbit/traval/mean-frame-ms` | 25.02 ns | 0.00 ns | — | — | ≈ +0.1% |
| `orbit/traval-zoom/mean-frame-ms` | 27.69 ns | 0.00 ns | — | — | ▲ +12.5% |
| `orbit/traval-zoom-ideal/mean-frame-ms` | 16.84 ns | 0.00 ns | — | — | ▼ -7.4% |
| `explode/traval/toggle-ms` | 65.70 ns | 0.00 ns | — | — | ≈ -4.4% |

### layers-ui — 18:13:17Z  ·  _latency · env 61c971a2 · 63f137d9f4a0c488785583156b8cfe5688078710_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 10.70 ns | 0.00 ns | — | — | ▲ +30.5% |
| `load/traval/first-scan-end-ms` | 561.00 ns | 0.00 ns | — | — | ≈ +3.9% |
| `scan/1500-tags-ms` | 60.90 ns | 0.00 ns | — | — | ▲ +37.8% |
| `orbit/traval/mean-frame-ms` | 25.00 ns | 0.00 ns | — | — | ≈ -1.1% |
| `orbit/traval-zoom/mean-frame-ms` | 24.62 ns | 0.00 ns | — | — | ▲ +12.3% |
| `orbit/traval-zoom-ideal/mean-frame-ms` | 18.18 ns | 0.00 ns | — | — | ≈ +4.5% |
| `explode/traval/toggle-ms` | 68.70 ns | 0.00 ns | — | — | ≈ -4.1% |

### layers-ui — 18:12:54Z  ·  _latency · env 61c971a2 · 63f137d9f4a0c488785583156b8cfe5688078710_

| benchId | Mean | StdDev | P99 | Alloc B/op | Δ vs prior |
|---|---|---|---|---|---|
| `load/traval/first-scan-ms` | 8.20 ns | 0.00 ns | — | — | ▼ -6.8% |
| `load/traval/first-scan-end-ms` | 540.20 ns | 0.00 ns | — | — | ▼ -15.5% |
| `scan/1500-tags-ms` | 44.20 ns | 0.00 ns | — | — | ▼ -21.1% |
| `orbit/traval/mean-frame-ms` | 25.28 ns | 0.00 ns | — | — | ▲ +5.2% |
| `orbit/traval-zoom/mean-frame-ms` | 21.92 ns | 0.00 ns | — | — | new |
| `orbit/traval-zoom-ideal/mean-frame-ms` | 17.40 ns | 0.00 ns | — | — | new |
| `explode/traval/toggle-ms` | 71.60 ns | 0.00 ns | — | — | ▼ -28.3% |

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
