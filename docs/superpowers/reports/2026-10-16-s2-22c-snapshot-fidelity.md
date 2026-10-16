# Implementation Report — s2-22c-snapshot-fidelity

- **Branch:** `feature/261016-62-s2-22c-snapshot-fidelity`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-16 16:13 → 2026-10-16 16:55
- **Status:** `final`
- **Gerado em:** 2026-10-16 16:56

## Resumo

O snapshot copia os atributos do `<html>` (`data-theme`, `class`, `lang`, `dir` e variáveis `--*` do `style`) e o loader os aplica ao host do shadow root por allowlist: o mock claro do Traval abre claro. Variáveis com `url(`, `expression`, `@import` ou caracteres de bloco são descartadas.

## Mudanças

### Added (6)

- `changelog.d/feature-261016-62-s2-22c-snapshot-fidelity.md` (+15/-0, doc)
- `docs/superpowers/plans/2026-10-16-s2-22c-snapshot-fidelity.md` (+250/-0, doc)
- `e2e/snap-fidelity.spec.js` (+59/-0, src)
- `fixtures/snap-fidelity/layers.json` (+1/-0, config)
- `fixtures/snap-fidelity/layers/mock.light.html` (+11/-0, other)
- `fixtures/snap-fidelity/layers/mock.plain.html` (+9/-0, other)

### Changed (13)

- `docs/ARCHITECTURE.md` (+4/-0, doc)
- `docs/RELEASE-CHECKLIST.md` (+1/-0, doc)
- `docs/_index.md` (+2/-2, doc)
- `docs/layers-json.md` (+1/-1, doc)
- `docs/roadmap.config.json` (+2/-1, doc)
- `docs/roadmap.data.json` (+38/-0, doc)
- `docs/roadmap.md` (+1/-0, doc)
- `docs/superpowers/specs/2026-10-16-s2-22-loader-checkchanges-design.md` (+18/-1, test)
- `e2e/snapshot-cli.spec.js` (+31/-0, src)
- `index.html` (+25/-12, other)
- `lib/layers-core.js` (+45/-8, src)
- `test/layers-core.test.js` (+55/-0, test)
- `tools/layers-snapshot.js` (+16/-1, src)

### Changelog fragment

**Added:**
- O snapshot copia os atributos do `<html>` (`data-theme`, `class`, `lang`, `dir` e variáveis `--*` do `style`) e o loader os aplica ao host do shadow root por allowlist: o mock claro do Traval abre claro. Variáveis com `url(`, `expression`, `@import` ou caracteres de bloco são descartadas.
- O snapshot troca cada `<canvas>` por `<img data:image/png>` (até 4 Mpx e 1,5 M caracteres por canvas; acima disso o canvas fica vazio). A linha da árvore mostra o selo `IMG` e o tooltip "Imagem congelada".
- L0 de um mock de snapshot leva o rótulo `<nome> · snapshot`, com URL, data e viewport da captura no tooltip.

**Fixed:**
- `:root[data-theme='light']` e `html[…]` viravam `:host[data-theme='light']`, que nunca casa no shadow root; agora viram `:host([data-theme='light'])`.
- `root.name` e `root.src` do `layers.json` passam para o descendente que casa o seletor em mock de snapshot, em vez de rotular o L0 e o `.shell` com o mesmo nome.

**Perf:**
- N/A — a carga faz um filtro de atributos do `<html>` e um prefixo de rótulo; o custo extra do snapshot é a codificação PNG dos canvases, limitada por teto, fora de qualquer caminho quente do editor.

## Arquivos tocados

### src (4)

- [`e2e/snap-fidelity.spec.js`](../../../e2e/snap-fidelity.spec.js) — A (+59/-0)
- [`e2e/snapshot-cli.spec.js`](../../../e2e/snapshot-cli.spec.js) — M (+31/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+45/-8)
- [`tools/layers-snapshot.js`](../../../tools/layers-snapshot.js) — M (+16/-1)

### test (2)

- [`docs/superpowers/specs/2026-10-16-s2-22-loader-checkchanges-design.md`](../specs/2026-10-16-s2-22-loader-checkchanges-design.md) — M (+18/-1)
- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+55/-0)

### doc (9)

- [`changelog.d/feature-261016-62-s2-22c-snapshot-fidelity.md`](../../../changelog.d/feature-261016-62-s2-22c-snapshot-fidelity.md) — A (+15/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+4/-0)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+1/-0)
- [`docs/_index.md`](../../_index.md) — M (+2/-2)
- [`docs/layers-json.md`](../../layers-json.md) — M (+1/-1)
- [`docs/roadmap.config.json`](../../roadmap.config.json) — M (+2/-1)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+38/-0)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-0)
- [`docs/superpowers/plans/2026-10-16-s2-22c-snapshot-fidelity.md`](../plans/2026-10-16-s2-22c-snapshot-fidelity.md) — A (+250/-0)

### config (1)

- [`fixtures/snap-fidelity/layers.json`](../../../fixtures/snap-fidelity/layers.json) — A (+1/-0)

### other (3)

- [`fixtures/snap-fidelity/layers/mock.light.html`](../../../fixtures/snap-fidelity/layers/mock.light.html) — A (+11/-0)
- [`fixtures/snap-fidelity/layers/mock.plain.html`](../../../fixtures/snap-fidelity/layers/mock.plain.html) — A (+9/-0)
- [`index.html`](../../../index.html) — M (+25/-12)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Added:** O snapshot copia os atributos do `<html>` (`data-theme`, `class`, `lang`, `dir` e variáveis `--*` do `style`) e o loader os aplica ao host do shadow root por allowlist: o mock claro do Traval abre claro. Variáveis com `url(`, `expression`, `@import` ou caracteres de bloco são descartadas.
  - [`fe6da4e`](https://github.com/brunomaida/Layers/commit/fe6da4e0b5d98e0751353ebc087c5b5d214e940b) feat: scope root-with-attribute selectors to :host() and filter <html> attributes (S2.22c)
  - [`859f034`](https://github.com/brunomaida/Layers/commit/859f034694408b0d33651222223124077c1f40de) feat: snapshot carries <html> attributes and freezes canvases as images (S2.22c)
  - [`71d80c5`](https://github.com/brunomaida/Layers/commit/71d80c591785e3e19ae724ced00291ca43a7d032) feat: apply <html> theme to the host, label snapshot roots and flag frozen canvases (S2.22c)
  - [`12765ca`](https://github.com/brunomaida/Layers/commit/12765ca6ac59b7da491bf0ceac138f407e994298) fix: keep :has() compounds in the old scope and apply the <html> class to the host (S2.22c)
- **Added:** O snapshot troca cada `<canvas>` por `<img data:image/png>` (até 4 Mpx e 1,5 M caracteres por canvas; acima disso o canvas fica vazio). A linha da árvore mostra o selo `IMG` e o tooltip "Imagem congelada".
  - [`859f034`](https://github.com/brunomaida/Layers/commit/859f034694408b0d33651222223124077c1f40de) feat: snapshot carries <html> attributes and freezes canvases as images (S2.22c)
  - [`71d80c5`](https://github.com/brunomaida/Layers/commit/71d80c591785e3e19ae724ced00291ca43a7d032) feat: apply <html> theme to the host, label snapshot roots and flag frozen canvases (S2.22c)
- **Added:** L0 de um mock de snapshot leva o rótulo `<nome> · snapshot`, com URL, data e viewport da captura no tooltip.
  - [`859f034`](https://github.com/brunomaida/Layers/commit/859f034694408b0d33651222223124077c1f40de) feat: snapshot carries <html> attributes and freezes canvases as images (S2.22c)
  - [`71d80c5`](https://github.com/brunomaida/Layers/commit/71d80c591785e3e19ae724ced00291ca43a7d032) feat: apply <html> theme to the host, label snapshot roots and flag frozen canvases (S2.22c)
- **Fixed:** `:root[data-theme='light']` e `html[…]` viravam `:host[data-theme='light']`, que nunca casa no shadow root; agora viram `:host([data-theme='light'])`.
  - [`fe6da4e`](https://github.com/brunomaida/Layers/commit/fe6da4e0b5d98e0751353ebc087c5b5d214e940b) feat: scope root-with-attribute selectors to :host() and filter <html> attributes (S2.22c)
  - [`859f034`](https://github.com/brunomaida/Layers/commit/859f034694408b0d33651222223124077c1f40de) feat: snapshot carries <html> attributes and freezes canvases as images (S2.22c)
  - [`71d80c5`](https://github.com/brunomaida/Layers/commit/71d80c591785e3e19ae724ced00291ca43a7d032) feat: apply <html> theme to the host, label snapshot roots and flag frozen canvases (S2.22c)
  - [`12765ca`](https://github.com/brunomaida/Layers/commit/12765ca6ac59b7da491bf0ceac138f407e994298) fix: keep :has() compounds in the old scope and apply the <html> class to the host (S2.22c)
- **Fixed:** `root.name` e `root.src` do `layers.json` passam para o descendente que casa o seletor em mock de snapshot, em vez de rotular o L0 e o `.shell` com o mesmo nome.
  - [`fe6da4e`](https://github.com/brunomaida/Layers/commit/fe6da4e0b5d98e0751353ebc087c5b5d214e940b) feat: scope root-with-attribute selectors to :host() and filter <html> attributes (S2.22c)
  - [`859f034`](https://github.com/brunomaida/Layers/commit/859f034694408b0d33651222223124077c1f40de) feat: snapshot carries <html> attributes and freezes canvases as images (S2.22c)
  - [`71d80c5`](https://github.com/brunomaida/Layers/commit/71d80c591785e3e19ae724ced00291ca43a7d032) feat: apply <html> theme to the host, label snapshot roots and flag frozen canvases (S2.22c)
- **Perf:** N/A — a carga faz um filtro de atributos do `<html>` e um prefixo de rótulo; o custo extra do snapshot é a codificação PNG dos canvases, limitada por teto, fora de qualquer caminho quente do editor.
  - [`fe6da4e`](https://github.com/brunomaida/Layers/commit/fe6da4e0b5d98e0751353ebc087c5b5d214e940b) feat: scope root-with-attribute selectors to :host() and filter <html> attributes (S2.22c)
  - [`859f034`](https://github.com/brunomaida/Layers/commit/859f034694408b0d33651222223124077c1f40de) feat: snapshot carries <html> attributes and freezes canvases as images (S2.22c)
  - [`71d80c5`](https://github.com/brunomaida/Layers/commit/71d80c591785e3e19ae724ced00291ca43a7d032) feat: apply <html> theme to the host, label snapshot roots and flag frozen canvases (S2.22c)
  - [`12765ca`](https://github.com/brunomaida/Layers/commit/12765ca6ac59b7da491bf0ceac138f407e994298) fix: keep :has() compounds in the old scope and apply the <html> class to the host (S2.22c)

### Todos os commits

- [`316067c`](https://github.com/brunomaida/Layers/commit/316067ca011ec27a697971ff7709b58bed45c2ec) docs: register S2.22c leaf in the tracker (S2.22c)
- [`a3077ad`](https://github.com/brunomaida/Layers/commit/a3077ade65484de4c25056a63040bbc9c77de342) docs: record S2.22c design decisions D1-D3 and repo findings (S2.22c)
- [`31fd5aa`](https://github.com/brunomaida/Layers/commit/31fd5aa462ac5f31d0b10c560ec82086f3219e2c) docs: add the S2.22c implementation plan and link it in the tracker (S2.22c)
- [`fe6da4e`](https://github.com/brunomaida/Layers/commit/fe6da4e0b5d98e0751353ebc087c5b5d214e940b) feat: scope root-with-attribute selectors to :host() and filter <html> attributes (S2.22c)
- [`859f034`](https://github.com/brunomaida/Layers/commit/859f034694408b0d33651222223124077c1f40de) feat: snapshot carries <html> attributes and freezes canvases as images (S2.22c)
- [`71d80c5`](https://github.com/brunomaida/Layers/commit/71d80c591785e3e19ae724ced00291ca43a7d032) feat: apply <html> theme to the host, label snapshot roots and flag frozen canvases (S2.22c)
- [`25ebbd3`](https://github.com/brunomaida/Layers/commit/25ebbd3552d76f28d284a5783e31f8b16624849d) docs: close S2.22c in the tracker (S2.22c)
- [`12765ca`](https://github.com/brunomaida/Layers/commit/12765ca6ac59b7da491bf0ceac138f407e994298) fix: keep :has() compounds in the old scope and apply the <html> class to the host (S2.22c)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `36d73ecd` | 2026-10-16 15:34 | 1.37h | 386 | 165.1k | 33.67M | 504.7k |
| `agent-a9` | 2026-10-16 16:42 | 11.6m | 94 | 1.3k | 2.60M | 141.2k |
| **Total (2)** | — | **1.56h** | **480** | **166.5k** | **36.28M** | **645.9k** |
