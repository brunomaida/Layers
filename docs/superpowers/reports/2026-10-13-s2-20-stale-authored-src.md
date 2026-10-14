# Implementation Report — s2-20-stale-authored-src

- **Branch:** `fix/261013-0-s2-20-stale-authored-src`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-13 22:18 → 2026-10-13 22:22
- **Status:** `final`
- **Gerado em:** 2026-10-13 22:22

## Resumo

A hand-written `data-src` in the mock always won over the derived one, so a rule that moved in its sheet made the patch target the wrong line (Traval: 31 of 199 nodes). The loader now keeps an authored `data-src` only while the loaded sheet shows the selector at that line (`LayersCore.checkOrigin`); otherwise the line is corrected from the AST index when the selector still exists in the same file, or the attribute is dropped and the derived rule applies. Files outside the loaded sheets (`.ts`) are left as they are. A warning reports how many were corrected and dropped (Traval: 10 and 21).

## Mudanças

### Added (1)

- `changelog.d/fix-261013-0-s2-20-stale-authored-src.md` (+13/-0, doc)

### Changed (9)

- `docs/ARCHITECTURE.md` (+1/-1, doc)
- `docs/RELEASE-CHECKLIST.md` (+2/-2, doc)
- `docs/roadmap.data.json` (+4/-4, doc)
- `docs/roadmap.md` (+1/-1, doc)
- `e2e/__snapshots__/tree.json` (+1/-1, config)
- `e2e/origin-sample.spec.js` (+3/-4, src)
- `index.html` (+11/-0, other)
- `lib/layers-core.js` (+23/-0, src)
- `test/layers-core.test.js` (+57/-0, test)

### Changelog fragment

**Fixed:**
- A hand-written `data-src` in the mock always won over the derived one, so a rule that moved in its sheet made the patch target the wrong line (Traval: 31 of 199 nodes). The loader now keeps an authored `data-src` only while the loaded sheet shows the selector at that line (`LayersCore.checkOrigin`); otherwise the line is corrected from the AST index when the selector still exists in the same file, or the attribute is dropped and the derived rule applies. Files outside the loaded sheets (`.ts`) are left as they are. A warning reports how many were corrected and dropped (Traval: 10 and 21).

**Changed:**
- `e2e/origin-sample.spec.js` now fails on a stale authored `data-src`; the Traval tree snapshot drops from 199 to 178 nodes with `src`.

**Perf:**
- N/A — one pass over the nodes that carry a `data-src` at load; sheet text is already in memory.

## Arquivos tocados

### src (2)

- [`e2e/origin-sample.spec.js`](../../../e2e/origin-sample.spec.js) — M (+3/-4)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+23/-0)

### test (1)

- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+57/-0)

### doc (5)

- [`changelog.d/fix-261013-0-s2-20-stale-authored-src.md`](../../../changelog.d/fix-261013-0-s2-20-stale-authored-src.md) — A (+13/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+1/-1)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+2/-2)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+4/-4)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)

### config (1)

- [`e2e/__snapshots__/tree.json`](../../../e2e/__snapshots__/tree.json) — M (+1/-1)

### other (1)

- [`index.html`](../../../index.html) — M (+11/-0)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Fixed:** A hand-written `data-src` in the mock always won over the derived one, so a rule that moved in its sheet made the patch target the wrong line (Traval: 31 of 199 nodes). The loader now keeps an authored `data-src` only while the loaded sheet shows the selector at that line (`LayersCore.checkOrigin`); otherwise the line is corrected from the AST index when the selector still exists in the same file, or the attribute is dropped and the derived rule applies. Files outside the loaded sheets (`.ts`) are left as they are. A warning reports how many were corrected and dropped (Traval: 10 and 21).
  - [`5815592`](https://github.com/brunomaida/Layers/commit/581559206041f918bbb416d8c2d907b49c36b9cd) feat(core): checkOrigin validates an authored data-src against the loaded sheet (S2.20)
  - [`02505a3`](https://github.com/brunomaida/Layers/commit/02505a397bd7b506cc5c7ceef95ed4a59e0af58b) fix(loader): correct or drop a stale authored data-src before deriving origins (S2.20)
  - [`f5e2aec`](https://github.com/brunomaida/Layers/commit/f5e2aec7c801c207b85d5a2288f6339c28864217) test(e2e): fail on stale authored data-src, refresh Traval tree snapshot (S2.20)
- **Changed:** `e2e/origin-sample.spec.js` now fails on a stale authored `data-src`; the Traval tree snapshot drops from 199 to 178 nodes with `src`.
  - [`5815592`](https://github.com/brunomaida/Layers/commit/581559206041f918bbb416d8c2d907b49c36b9cd) feat(core): checkOrigin validates an authored data-src against the loaded sheet (S2.20)
  - [`02505a3`](https://github.com/brunomaida/Layers/commit/02505a397bd7b506cc5c7ceef95ed4a59e0af58b) fix(loader): correct or drop a stale authored data-src before deriving origins (S2.20)
  - [`f5e2aec`](https://github.com/brunomaida/Layers/commit/f5e2aec7c801c207b85d5a2288f6339c28864217) test(e2e): fail on stale authored data-src, refresh Traval tree snapshot (S2.20)
- **Perf:** N/A — one pass over the nodes that carry a `data-src` at load; sheet text is already in memory.
  - [`5815592`](https://github.com/brunomaida/Layers/commit/581559206041f918bbb416d8c2d907b49c36b9cd) feat(core): checkOrigin validates an authored data-src against the loaded sheet (S2.20)
  - [`02505a3`](https://github.com/brunomaida/Layers/commit/02505a397bd7b506cc5c7ceef95ed4a59e0af58b) fix(loader): correct or drop a stale authored data-src before deriving origins (S2.20)
  - [`f5e2aec`](https://github.com/brunomaida/Layers/commit/f5e2aec7c801c207b85d5a2288f6339c28864217) test(e2e): fail on stale authored data-src, refresh Traval tree snapshot (S2.20)

### Todos os commits

- [`75db3f9`](https://github.com/brunomaida/Layers/commit/75db3f91a36a46e428a7ff5e7224500a87695ba8) docs(roadmap): mark S2.20 in-progress (S2.20)
- [`5815592`](https://github.com/brunomaida/Layers/commit/581559206041f918bbb416d8c2d907b49c36b9cd) feat(core): checkOrigin validates an authored data-src against the loaded sheet (S2.20)
- [`02505a3`](https://github.com/brunomaida/Layers/commit/02505a397bd7b506cc5c7ceef95ed4a59e0af58b) fix(loader): correct or drop a stale authored data-src before deriving origins (S2.20)
- [`f5e2aec`](https://github.com/brunomaida/Layers/commit/f5e2aec7c801c207b85d5a2288f6339c28864217) test(e2e): fail on stale authored data-src, refresh Traval tree snapshot (S2.20)
- [`636b72b`](https://github.com/brunomaida/Layers/commit/636b72b8de238369eca5648b7496c78c8f1027c7) docs: close S2.20 with changelog fragment, checklist and architecture note (S2.20)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `5b54a0ee` | 2026-10-13 21:25 | 56.5m | 560 | 221.2k | 55.37M | 546.7k |
| **Total (1)** | — | **56.5m** | **560** | **221.2k** | **55.37M** | **546.7k** |
