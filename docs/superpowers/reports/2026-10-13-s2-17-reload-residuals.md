# Implementation Report — s2-17-reload-residuals

- **Branch:** `fix/261013-32-s2-17-reload-residuals`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-13 22:24 → 2026-10-13 22:32
- **Status:** `final`
- **Gerado em:** 2026-10-13 22:32

## Resumo

Rollback of an approved change overwrote a file edited outside LAYERS when the file was no longer in the manifest after a reload. The approve now records the mtime it left (`entry.written`) and the rollback refuses with a toast when it differs.

## Mudanças

### Added (2)

- `changelog.d/fix-261013-32-s2-17-reload-residuals.md` (+17/-0, doc)
- `e2e/stale-banner.spec.js` (+55/-0, src)

### Changed (6)

- `docs/ARCHITECTURE.md` (+6/-2, doc)
- `docs/roadmap.data.json` (+4/-4, doc)
- `docs/roadmap.md` (+1/-1, doc)
- `index.html` (+16/-9, other)
- `lib/layers-core.js` (+23/-1, src)
- `test/layers-core.test.js` (+60/-0, test)

### Changelog fragment

**Fixed:**
- Rollback of an approved change overwrote a file edited outside LAYERS when the file was no longer in the manifest after a reload. The approve now records the mtime it left (`entry.written`) and the rollback refuses with a toast when it differs.
- Pressing R during a failed layers.json auto-create retry could let the stale retry unload the newer load; the retry now captures `loadSeq` on entry and bails when superseded (no automated test: the race needs a slow folder scan; reviewed by reading).
- Dismissing the "files changed" banner after an own write re-applied the old mtime and could raise a false banner on the next focus; `dismissWatch` now takes the watch snapshot from `checkStale` and skips paths moved since.
- A superseded load's late `readText` wrote into the freshly reset `this.mtimes`; it now writes into the map captured before its first `await` (same: no automated test).
- At about 1024px the banner covered the top of the right panel. `LayersCore.staleBannerBox` keeps it between the left column and the right panel (minimum 240px).

**Added:**
- `e2e/stale-banner.spec.js`: connects an OPFS copy of a fixture through a stubbed `showDirectoryPicker`, changes a watched file and measures the banner against the right panel at 1024px.

**Perf:**
- N/A — reload and banner paths only; no scan, render or drag code touched.

## Arquivos tocados

### src (2)

- [`e2e/stale-banner.spec.js`](../../../e2e/stale-banner.spec.js) — A (+55/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+23/-1)

### test (1)

- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+60/-0)

### doc (4)

- [`changelog.d/fix-261013-32-s2-17-reload-residuals.md`](../../../changelog.d/fix-261013-32-s2-17-reload-residuals.md) — A (+17/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+6/-2)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+4/-4)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)

### other (1)

- [`index.html`](../../../index.html) — M (+16/-9)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Fixed:** Rollback of an approved change overwrote a file edited outside LAYERS when the file was no longer in the manifest after a reload. The approve now records the mtime it left (`entry.written`) and the rollback refuses with a toast when it differs.
  - [`a82faa9`](https://github.com/brunomaida/Layers/commit/a82faa973ee46c6b3e73167bdd2f654ddcd15903) fix(reload): rollback guard, retry seq, dismiss snapshot, readText map and banner box (S2.17, #32)
- **Fixed:** Pressing R during a failed layers.json auto-create retry could let the stale retry unload the newer load; the retry now captures `loadSeq` on entry and bails when superseded (no automated test: the race needs a slow folder scan; reviewed by reading).
  - [`a82faa9`](https://github.com/brunomaida/Layers/commit/a82faa973ee46c6b3e73167bdd2f654ddcd15903) fix(reload): rollback guard, retry seq, dismiss snapshot, readText map and banner box (S2.17, #32)
  - [`19b054c`](https://github.com/brunomaida/Layers/commit/19b054c8e33323d6131c4ac8513a5c2f4ea66428) test(e2e): stale banner stays clear of column and right panel at 1024px (S2.17, #32)
- **Fixed:** Dismissing the "files changed" banner after an own write re-applied the old mtime and could raise a false banner on the next focus; `dismissWatch` now takes the watch snapshot from `checkStale` and skips paths moved since.
  - [`69fbdb3`](https://github.com/brunomaida/Layers/commit/69fbdb30b7356dddc0888c9a9aef3d7163b110f6) feat(core): dismissWatch seen snapshot, staleBannerBox and movedSince helpers (S2.17, #32)
  - [`a82faa9`](https://github.com/brunomaida/Layers/commit/a82faa973ee46c6b3e73167bdd2f654ddcd15903) fix(reload): rollback guard, retry seq, dismiss snapshot, readText map and banner box (S2.17, #32)
  - [`19b054c`](https://github.com/brunomaida/Layers/commit/19b054c8e33323d6131c4ac8513a5c2f4ea66428) test(e2e): stale banner stays clear of column and right panel at 1024px (S2.17, #32)
- **Fixed:** A superseded load's late `readText` wrote into the freshly reset `this.mtimes`; it now writes into the map captured before its first `await` (same: no automated test).
  - [`a82faa9`](https://github.com/brunomaida/Layers/commit/a82faa973ee46c6b3e73167bdd2f654ddcd15903) fix(reload): rollback guard, retry seq, dismiss snapshot, readText map and banner box (S2.17, #32)
  - [`19b054c`](https://github.com/brunomaida/Layers/commit/19b054c8e33323d6131c4ac8513a5c2f4ea66428) test(e2e): stale banner stays clear of column and right panel at 1024px (S2.17, #32)
- **Fixed:** At about 1024px the banner covered the top of the right panel. `LayersCore.staleBannerBox` keeps it between the left column and the right panel (minimum 240px).
  - [`69fbdb3`](https://github.com/brunomaida/Layers/commit/69fbdb30b7356dddc0888c9a9aef3d7163b110f6) feat(core): dismissWatch seen snapshot, staleBannerBox and movedSince helpers (S2.17, #32)
  - [`a82faa9`](https://github.com/brunomaida/Layers/commit/a82faa973ee46c6b3e73167bdd2f654ddcd15903) fix(reload): rollback guard, retry seq, dismiss snapshot, readText map and banner box (S2.17, #32)
  - [`19b054c`](https://github.com/brunomaida/Layers/commit/19b054c8e33323d6131c4ac8513a5c2f4ea66428) test(e2e): stale banner stays clear of column and right panel at 1024px (S2.17, #32)
- **Added:** `e2e/stale-banner.spec.js`: connects an OPFS copy of a fixture through a stubbed `showDirectoryPicker`, changes a watched file and measures the banner against the right panel at 1024px.
  - [`a82faa9`](https://github.com/brunomaida/Layers/commit/a82faa973ee46c6b3e73167bdd2f654ddcd15903) fix(reload): rollback guard, retry seq, dismiss snapshot, readText map and banner box (S2.17, #32)
  - [`19b054c`](https://github.com/brunomaida/Layers/commit/19b054c8e33323d6131c4ac8513a5c2f4ea66428) test(e2e): stale banner stays clear of column and right panel at 1024px (S2.17, #32)
- **Perf:** N/A — reload and banner paths only; no scan, render or drag code touched.
  - [`a82faa9`](https://github.com/brunomaida/Layers/commit/a82faa973ee46c6b3e73167bdd2f654ddcd15903) fix(reload): rollback guard, retry seq, dismiss snapshot, readText map and banner box (S2.17, #32)
  - [`19b054c`](https://github.com/brunomaida/Layers/commit/19b054c8e33323d6131c4ac8513a5c2f4ea66428) test(e2e): stale banner stays clear of column and right panel at 1024px (S2.17, #32)

### Todos os commits

- [`9bb62c1`](https://github.com/brunomaida/Layers/commit/9bb62c1632ff681540a54dd994449895eb77324d) docs(roadmap): mark S2.17 in-progress (S2.17, #32)
- [`69fbdb3`](https://github.com/brunomaida/Layers/commit/69fbdb30b7356dddc0888c9a9aef3d7163b110f6) feat(core): dismissWatch seen snapshot, staleBannerBox and movedSince helpers (S2.17, #32)
- [`a82faa9`](https://github.com/brunomaida/Layers/commit/a82faa973ee46c6b3e73167bdd2f654ddcd15903) fix(reload): rollback guard, retry seq, dismiss snapshot, readText map and banner box (S2.17, #32)
- [`19b054c`](https://github.com/brunomaida/Layers/commit/19b054c8e33323d6131c4ac8513a5c2f4ea66428) test(e2e): stale banner stays clear of column and right panel at 1024px (S2.17, #32)
- [`e2aa904`](https://github.com/brunomaida/Layers/commit/e2aa904dbe4a83e03dd530c67f19c20e30098034) docs: close S2.17 with changelog fragment and architecture notes (S2.17, #32)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `5b54a0ee` | 2026-10-13 21:25 | 1.11h | 694 | 273.4k | 76.87M | 627.2k |
| **Total (1)** | — | **1.11h** | **694** | **273.4k** | **76.87M** | **627.2k** |
