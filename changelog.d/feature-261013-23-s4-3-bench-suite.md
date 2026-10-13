### Added
- `bench/` suite (`vitest bench` over tinybench) for `lib/layers-core.js` with warmup, fixed iterations and a per-op allocation probe; `npm run bench` writes `*.bench.json` for `bench-report`, history in `docs/reports/bench-history/`.

### Perf
- measured — first baseline recorded (22 benchmarks, e.g. parseSheet of a 274 KB icon sheet about 15 ms); no production code changed.
