# Implementation Report — s2-22d-watch-globs

- **Branch:** `feature/261016-62-s2-22d-watch-globs`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-16 17:09 → 2026-10-16 17:28
- **Status:** `final`
- **Gerado em:** 2026-10-16 17:28

## Resumo

`layers.json › watch`: globs de fontes TS/JS (`src/ui/**/*.ts`, relativos à raiz da pasta) entram na deriva do layout. Editar um arquivo que casa o glob depois do mock mostra o banner "Mock mais antigo que a fonte", inclusive em mock de snapshot sem `data-src`. Até 20 globs, 5000 entradas varridas e 50 arquivos observados; o excedente vira um toast.

## Mudanças

### Added (3)

- `changelog.d/feature-261016-62-s2-22d-watch-globs.md` (+9/-0, doc)
- `docs/superpowers/plans/2026-10-16-s2-22d-watch-globs.md` (+184/-0, doc)
- `e2e/watch-globs.spec.js` (+114/-0, src)

### Changed (10)

- `docs/ARCHITECTURE.md` (+2/-0, doc)
- `docs/RELEASE-CHECKLIST.md` (+1/-0, doc)
- `docs/_index.md` (+2/-2, doc)
- `docs/layers-json.md` (+1/-0, doc)
- `docs/roadmap.config.json` (+2/-1, doc)
- `docs/roadmap.data.json` (+38/-0, doc)
- `docs/roadmap.md` (+1/-0, doc)
- `index.html` (+33/-3, other)
- `lib/layers-core.js` (+55/-4, src)
- `test/layers-core.test.js` (+66/-0, test)

### Changelog fragment

**Added:**
- `layers.json › watch`: globs de fontes TS/JS (`src/ui/**/*.ts`, relativos à raiz da pasta) entram na deriva do layout. Editar um arquivo que casa o glob depois do mock mostra o banner "Mock mais antigo que a fonte", inclusive em mock de snapshot sem `data-src`. Até 20 globs, 5000 entradas varridas e 50 arquivos observados; o excedente vira um toast.

**Perf:**
- N/A — a varredura roda uma vez por carga, em segundo plano, só nas pastas que algum glob alcança e com teto de 5000 entradas e 50 arquivos; sem `watch` nada muda.

## Arquivos tocados

### src (2)

- [`e2e/watch-globs.spec.js`](../../../e2e/watch-globs.spec.js) — A (+114/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+55/-4)

### test (1)

- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+66/-0)

### doc (9)

- [`changelog.d/feature-261016-62-s2-22d-watch-globs.md`](../../../changelog.d/feature-261016-62-s2-22d-watch-globs.md) — A (+9/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+2/-0)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+1/-0)
- [`docs/_index.md`](../../_index.md) — M (+2/-2)
- [`docs/layers-json.md`](../../layers-json.md) — M (+1/-0)
- [`docs/roadmap.config.json`](../../roadmap.config.json) — M (+2/-1)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+38/-0)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-0)
- [`docs/superpowers/plans/2026-10-16-s2-22d-watch-globs.md`](../plans/2026-10-16-s2-22d-watch-globs.md) — A (+184/-0)

### other (1)

- [`index.html`](../../../index.html) — M (+33/-3)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Added:** `layers.json › watch`: globs de fontes TS/JS (`src/ui/**/*.ts`, relativos à raiz da pasta) entram na deriva do layout. Editar um arquivo que casa o glob depois do mock mostra o banner "Mock mais antigo que a fonte", inclusive em mock de snapshot sem `data-src`. Até 20 globs, 5000 entradas varridas e 50 arquivos observados; o excedente vira um toast.
  - [`89c4ba6`](https://github.com/brunomaida/Layers/commit/89c4ba632887e6cf69aa1bdfc21ca5981695c525) feat: watch glob helpers and extra sources in citedSources (S2.22d)
  - [`cd1618d`](https://github.com/brunomaida/Layers/commit/cd1618df77a067102d21bb152e26f67ddf4b1685) feat: watch globs feed the layout drift probe (S2.22d)
  - [`008aab6`](https://github.com/brunomaida/Layers/commit/008aab6b9e18abfbd8dc8756d65acec54f4865dd) fix: keep watch overflow toast scoped to watch, align the glob pruner and matcher and survive an unreadable directory (S2.22d)
- **Perf:** N/A — a varredura roda uma vez por carga, em segundo plano, só nas pastas que algum glob alcança e com teto de 5000 entradas e 50 arquivos; sem `watch` nada muda.
  - [`89c4ba6`](https://github.com/brunomaida/Layers/commit/89c4ba632887e6cf69aa1bdfc21ca5981695c525) feat: watch glob helpers and extra sources in citedSources (S2.22d)
  - [`cd1618d`](https://github.com/brunomaida/Layers/commit/cd1618df77a067102d21bb152e26f67ddf4b1685) feat: watch globs feed the layout drift probe (S2.22d)
  - [`008aab6`](https://github.com/brunomaida/Layers/commit/008aab6b9e18abfbd8dc8756d65acec54f4865dd) fix: keep watch overflow toast scoped to watch, align the glob pruner and matcher and survive an unreadable directory (S2.22d)

### Todos os commits

- [`ee6f589`](https://github.com/brunomaida/Layers/commit/ee6f589a4068257a0ee1d7900d09249464eefba9) docs: register S2.22d leaf in the tracker (S2.22d)
- [`d1db7a7`](https://github.com/brunomaida/Layers/commit/d1db7a7caa03ea512982a6a570a4ae3575200e75) docs: add the S2.22d implementation plan and link it in the tracker (S2.22d)
- [`89c4ba6`](https://github.com/brunomaida/Layers/commit/89c4ba632887e6cf69aa1bdfc21ca5981695c525) feat: watch glob helpers and extra sources in citedSources (S2.22d)
- [`cd1618d`](https://github.com/brunomaida/Layers/commit/cd1618df77a067102d21bb152e26f67ddf4b1685) feat: watch globs feed the layout drift probe (S2.22d)
- [`38e17f9`](https://github.com/brunomaida/Layers/commit/38e17f966fd3d80cf669de12dc528bf0bc1668a8) docs: close S2.22d in the tracker (S2.22d)
- [`008aab6`](https://github.com/brunomaida/Layers/commit/008aab6b9e18abfbd8dc8756d65acec54f4865dd) fix: keep watch overflow toast scoped to watch, align the glob pruner and matcher and survive an unreadable directory (S2.22d)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `36d73ecd` | 2026-10-16 15:34 | 1.90h | 598 | 266.2k | 66.78M | 666.5k |
| `agent-af` | 2026-10-16 17:20 | 5.2m | 56 | 226 | 900.5k | 65.7k |
| **Total (2)** | — | **1.99h** | **654** | **266.4k** | **67.68M** | **732.3k** |
