---
title: "BDN Benchmark Methodology"
type: bench-methodology
solution: Layers
created: 2026-10-13
---

# BDN Benchmark Methodology

> Project-specific methodology consumed by the `bench-report` skill. Prose is for
> humans; the machine block below drives verdict thresholds and the regression gate.
> Layers is JavaScript: the discipline of BenchmarkDotNet (warmup, fixed iterations, baseline,
> allocation per op) is applied with `vitest bench` (tinybench) on the same V8 the browser uses.

## Setup
| Parameter | Value |
|-----------|-------|
| Tool | `vitest bench` 4.x over tinybench 2.9 |
| Runtime | Node 24 (V8), no .NET |
| Config | `warmupIterations: 5, warmupTime: 200 ms, iterations: 20, time: 1000 ms` per benchmark (`bench/core.bench.js`) |
| Allocation | `heapUsed` delta per call, median of 7 rounds after `gc()` (`bench/alloc.mjs`); approximate, same machine and Node only |

## How to Run
- Micro (core): `npm run bench` writes `bench/results/<ts>-layers-core.bench.json`.
- Ingest and render: `python ~/.claude/hooks/bench-history-cli.py ingest --repo .` then `render`.
- UI (Playwright, tag `latency`): see `e2e/perf.spec.js` once S4.4 lands.

## Noise Floor
Observed on the reference machine (i7-12700, Node 24): parseSheet/scopeAst on small sheets vary about 20-35 % run to run; large sheets about 5-20 %. Hence the 10 µs floor and 2 sigma rule below. Record the first stable baseline before gating.

## Decision rules
A delta counts as a regression only when it exceeds `regressionPct` (5 %), exceeds 2 sigma of the baseline and is above `noiseFloorNs`. Compare only inside the same `env` hash; never compare runs from different machines or Node majors.

## Interpreting Results
Mean and StdDev decide speed; `Alloc B/op` is a trend indicator (young-generation scavenges make single values jumpy). Watch `parseSheet` and `scopeAst`: they run once per stylesheet at project load.

## Pre-regression Gate
Run `npm run bench` before and after any change to `lib/layers-core.js` parse paths; `bench-history-cli gate` must not report a regression. Manual until there is CI.

## Machine knobs

The block below is parsed by the `bench-report` tooling. Edit the values; keep the sentinel comments and the ```json fence intact.

<!-- bench-methodology:begin -->
```json
{
  "schemaVersion": 1,
  "version": 1,
  "defaults": {
    "regressionPct": 0.05,
    "noiseSigma": 2.0,
    "noiseFloorNs": 0,
    "gateMaxRegression": 0.05,
    "gated": true
  },
  "perTag": {
    "micro": {
      "noiseFloorNs": 10,
      "gated": true,
      "run": "npm run bench"
    }
  }
}
```
<!-- bench-methodology:end -->

<!-- doc-links:auto -->
## Related

- [Bench history](reports/bench-history/bench-history.md)
