# Implementation Report — s2-22e-attr-action

- **Branch:** `feature/261016-62-s2-22e-attr-action`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-16 18:48 → 2026-10-16 18:50
- **Status:** `final`
- **Gerado em:** 2026-10-16 18:50

## Resumo

`layers.json › interactions`: ação `attr: {selector, name, value, off?}` alterna `data-*`/`aria-*` no mock (ex.: `data-dock`, `data-collapsed`, `aria-expanded`), então o CSS que reage a atributo pode ser visto e editado sem script. Outros nomes (`on*`, `style`, `class`, `href`) são recusados, o chip fica informativo com `title` "attr inválido" e um seletor sem alvo entra no aviso de interações mortas.

## Mudanças

### Added (5)

- `changelog.d/feature-261016-62-s2-22e-attr-action.md` (+9/-0, doc)
- `docs/superpowers/plans/2026-10-16-s2-22e-attr-action.md` (+30/-0, doc)
- `e2e/attr-action.spec.js` (+46/-0, src)
- `fixtures/attr-action/index.html` (+7/-0, other)
- `fixtures/attr-action/layers.json` (+13/-0, config)

### Changed (10)

- `docs/ARCHITECTURE.md` (+7/-0, doc)
- `docs/RELEASE-CHECKLIST.md` (+1/-0, doc)
- `docs/_index.md` (+2/-2, doc)
- `docs/layers-json.md` (+14/-1, doc)
- `docs/roadmap.config.json` (+1/-0, doc)
- `docs/roadmap.data.json` (+38/-0, doc)
- `docs/roadmap.md` (+1/-0, doc)
- `index.html` (+5/-4, other)
- `lib/layers-core.js` (+27/-0, src)
- `test/layers-core.test.js` (+70/-0, test)

### Changelog fragment

**Added:**
- `layers.json › interactions`: ação `attr: {selector, name, value, off?}` alterna `data-*`/`aria-*` no mock (ex.: `data-dock`, `data-collapsed`, `aria-expanded`), então o CSS que reage a atributo pode ser visto e editado sem script. Outros nomes (`on*`, `style`, `class`, `href`) são recusados, o chip fica informativo com `title` "attr inválido" e um seletor sem alvo entra no aviso de interações mortas.

**Perf:**
- N/A — a ação roda só no clique do chip, sobre os elementos que casam o seletor; sem `attr` declarado nada muda na carga.

## Arquivos tocados

### src (2)

- [`e2e/attr-action.spec.js`](../../../e2e/attr-action.spec.js) — A (+46/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+27/-0)

### test (1)

- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+70/-0)

### doc (9)

- [`changelog.d/feature-261016-62-s2-22e-attr-action.md`](../../../changelog.d/feature-261016-62-s2-22e-attr-action.md) — A (+9/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+7/-0)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+1/-0)
- [`docs/_index.md`](../../_index.md) — M (+2/-2)
- [`docs/layers-json.md`](../../layers-json.md) — M (+14/-1)
- [`docs/roadmap.config.json`](../../roadmap.config.json) — M (+1/-0)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+38/-0)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-0)
- [`docs/superpowers/plans/2026-10-16-s2-22e-attr-action.md`](../plans/2026-10-16-s2-22e-attr-action.md) — A (+30/-0)

### config (1)

- [`fixtures/attr-action/layers.json`](../../../fixtures/attr-action/layers.json) — A (+13/-0)

### other (2)

- [`fixtures/attr-action/index.html`](../../../fixtures/attr-action/index.html) — A (+7/-0)
- [`index.html`](../../../index.html) — M (+5/-4)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Added:** `layers.json › interactions`: ação `attr: {selector, name, value, off?}` alterna `data-*`/`aria-*` no mock (ex.: `data-dock`, `data-collapsed`, `aria-expanded`), então o CSS que reage a atributo pode ser visto e editado sem script. Outros nomes (`on*`, `style`, `class`, `href`) são recusados, o chip fica informativo com `title` "attr inválido" e um seletor sem alvo entra no aviso de interações mortas.
  - [`2b49b04`](https://github.com/brunomaida/Layers/commit/2b49b04f40d37b6cff1a276ac57d60a52ea1cce3) feat: add the attr action to interactions for data-* and aria-* toggles (S2.22e)
  - [`1133793`](https://github.com/brunomaida/Layers/commit/1133793c17f0b5a9dde3a3156a350dbd30e7689a) docs: document the attr action and close S2.22e in the tracker (S2.22e)
- **Perf:** N/A — a ação roda só no clique do chip, sobre os elementos que casam o seletor; sem `attr` declarado nada muda na carga.
  - [`2b49b04`](https://github.com/brunomaida/Layers/commit/2b49b04f40d37b6cff1a276ac57d60a52ea1cce3) feat: add the attr action to interactions for data-* and aria-* toggles (S2.22e)
  - [`1133793`](https://github.com/brunomaida/Layers/commit/1133793c17f0b5a9dde3a3156a350dbd30e7689a) docs: document the attr action and close S2.22e in the tracker (S2.22e)

### Todos os commits

- [`a222fa3`](https://github.com/brunomaida/Layers/commit/a222fa38b1d853859c5576ceccd909bd858179af) docs: open the S2.22e leaf in the tracker (S2.22e)
- [`2b49b04`](https://github.com/brunomaida/Layers/commit/2b49b04f40d37b6cff1a276ac57d60a52ea1cce3) feat: add the attr action to interactions for data-* and aria-* toggles (S2.22e)
- [`1133793`](https://github.com/brunomaida/Layers/commit/1133793c17f0b5a9dde3a3156a350dbd30e7689a) docs: document the attr action and close S2.22e in the tracker (S2.22e)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `48158d32` | 2026-10-16 18:47 | 3.4m | 116 | 37.5k | 5.54M | 258.5k |
| **Total (1)** | — | **3.4m** | **116** | **37.5k** | **5.54M** | **258.5k** |
