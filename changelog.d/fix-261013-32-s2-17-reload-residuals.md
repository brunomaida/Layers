---
adr: none
---

### Fixed
- Rollback of an approved change overwrote a file edited outside LAYERS when the file was no longer in the manifest after a reload. The approve now records the mtime it left (`entry.written`) and the rollback refuses with a toast when it differs.
  Root-cause: #32 · Regression-test: test/layers-core.test.js (MovedSince, DismissWatchSeen, StaleBannerBox), e2e/stale-banner.spec.js
- Pressing R during a failed layers.json auto-create retry could let the stale retry unload the newer load; the retry now captures `loadSeq` on entry and bails when superseded (no automated test: the race needs a slow folder scan; reviewed by reading).
- Dismissing the "files changed" banner after an own write re-applied the old mtime and could raise a false banner on the next focus; `dismissWatch` now takes the watch snapshot from `checkStale` and skips paths moved since.
- A superseded load's late `readText` wrote into the freshly reset `this.mtimes`; it now writes into the map captured before its first `await` (same: no automated test).
- At about 1024px the banner covered the top of the right panel. `LayersCore.staleBannerBox` keeps it between the left column and the right panel (minimum 240px).

### Added
- `e2e/stale-banner.spec.js`: connects an OPFS copy of a fixture through a stubbed `showDirectoryPicker`, changes a watched file and measures the banner against the right panel at 1024px.

### Perf
- N/A — reload and banner paths only; no scan, render or drag code touched.
