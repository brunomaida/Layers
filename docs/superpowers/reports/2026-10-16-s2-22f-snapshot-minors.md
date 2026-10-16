# Implementation Report — s2-22f-snapshot-minors

- **Branch:** `fix/261016-62-s2-22f-snapshot-minors`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-16 18:20 → 2026-10-16 18:37
- **Status:** `final`
- **Gerado em:** 2026-10-16 18:37

## Resumo

Variáveis `--*` do `<html>` do snapshot passam por allowlist de valor (funções de cor, `var`, `calc` e similares; `image-set(`, `/*` e aspas abertas saem) e os nomes `data-*` só aceitam `[a-z0-9_.-]`.

## Mudanças

### Added (5)

- `changelog.d/fix-261016-62-s2-22f-snapshot-minors.md` (+12/-0, doc)
- `docs/superpowers/plans/2026-10-16-s2-22f-snapshot-minors.md` (+110/-0, doc)
- `fixtures/snap-fidelity/layers/mock.self.html` (+6/-0, other)
- `fixtures/snap-multi/layers.json` (+1/-0, config)
- `fixtures/snap-multi/layers/mock.html` (+6/-0, other)

### Changed (14)

- `docs/ARCHITECTURE.md` (+1/-1, doc)
- `docs/_index.md` (+2/-2, doc)
- `docs/layers-json.md` (+1/-1, doc)
- `docs/roadmap.config.json` (+2/-1, doc)
- `docs/roadmap.data.json` (+39/-0, doc)
- `docs/roadmap.md` (+1/-0, doc)
- `e2e/snap-fidelity.spec.js` (+31/-1, src)
- `e2e/snapshot-cli.spec.js` (+25/-1, src)
- `fixtures/snap-fidelity/layers.json` (+1/-1, config)
- `fixtures/snap-fidelity/layers/mock.light.html` (+1/-1, other)
- `index.html` (+4/-3, other)
- `lib/layers-core.js` (+26/-3, src)
- `test/layers-core.test.js` (+73/-0, test)
- `tools/layers-snapshot.js` (+4/-2, src)

### Changelog fragment

**Fixed:**
- Variáveis `--*` do `<html>` do snapshot passam por allowlist de valor (funções de cor, `var`, `calc` e similares; `image-set(`, `/*` e aspas abertas saem) e os nomes `data-*` só aceitam `[a-z0-9_.-]`.
- O snapshot não copia mais os atributos `on*` do `<html>` e limita o total de canvases congelados a 4 M caracteres.
- Em mock de snapshot, `root.name`/`root.src` ficam no L0 quando ele mesmo casa o seletor; o sufixo `· snapshot` entra depois de `rules`, então um body com vários filhos continua renomeável por elas.
- A captura (URL, data, viewport) do tooltip de L0 é lida até o `-->`, mesmo com URL de mais de 1000 caracteres.

**Perf:**
- N/A — só valida atributos na carga e soma o tamanho dos canvases no momento do snapshot; fora de qualquer caminho quente do editor.

## Arquivos tocados

### src (4)

- [`e2e/snap-fidelity.spec.js`](../../../e2e/snap-fidelity.spec.js) — M (+31/-1)
- [`e2e/snapshot-cli.spec.js`](../../../e2e/snapshot-cli.spec.js) — M (+25/-1)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+26/-3)
- [`tools/layers-snapshot.js`](../../../tools/layers-snapshot.js) — M (+4/-2)

### test (1)

- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+73/-0)

### doc (8)

- [`changelog.d/fix-261016-62-s2-22f-snapshot-minors.md`](../../../changelog.d/fix-261016-62-s2-22f-snapshot-minors.md) — A (+12/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+1/-1)
- [`docs/_index.md`](../../_index.md) — M (+2/-2)
- [`docs/layers-json.md`](../../layers-json.md) — M (+1/-1)
- [`docs/roadmap.config.json`](../../roadmap.config.json) — M (+2/-1)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+39/-0)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-0)
- [`docs/superpowers/plans/2026-10-16-s2-22f-snapshot-minors.md`](../plans/2026-10-16-s2-22f-snapshot-minors.md) — A (+110/-0)

### config (2)

- [`fixtures/snap-fidelity/layers.json`](../../../fixtures/snap-fidelity/layers.json) — M (+1/-1)
- [`fixtures/snap-multi/layers.json`](../../../fixtures/snap-multi/layers.json) — A (+1/-0)

### other (4)

- [`fixtures/snap-fidelity/layers/mock.light.html`](../../../fixtures/snap-fidelity/layers/mock.light.html) — M (+1/-1)
- [`fixtures/snap-fidelity/layers/mock.self.html`](../../../fixtures/snap-fidelity/layers/mock.self.html) — A (+6/-0)
- [`fixtures/snap-multi/layers/mock.html`](../../../fixtures/snap-multi/layers/mock.html) — A (+6/-0)
- [`index.html`](../../../index.html) — M (+4/-3)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Fixed:** Variáveis `--*` do `<html>` do snapshot passam por allowlist de valor (funções de cor, `var`, `calc` e similares; `image-set(`, `/*` e aspas abertas saem) e os nomes `data-*` só aceitam `[a-z0-9_.-]`.
  - [`ed7ed9e`](https://github.com/brunomaida/Layers/commit/ed7ed9e920bc621916bc9a207463de239f616776) fix: allowlist host var values and names, read long snapshot captures (S2.22f)
  - [`5ede26a`](https://github.com/brunomaida/Layers/commit/5ede26a23a73de145fb5b99180049a82a821610f) fix: drop on* html attributes and cap the total frozen canvas size (S2.22f)
  - [`b67504d`](https://github.com/brunomaida/Layers/commit/b67504dc16ad3ad57dee5466256b6907b7f76af7) fix: keep root.name on a matching L0 and suffix snapshot roots after rules (S2.22f)
  - [`8ce95d6`](https://github.com/brunomaida/Layers/commit/8ce95d6056d90ef8eb7563252c1dd4e02de1cde5) fix: keep long-URL snapshots detected, bound the var value scan and widen the function allowlist (S2.22f)
- **Fixed:** O snapshot não copia mais os atributos `on*` do `<html>` e limita o total de canvases congelados a 4 M caracteres.
  - [`ed7ed9e`](https://github.com/brunomaida/Layers/commit/ed7ed9e920bc621916bc9a207463de239f616776) fix: allowlist host var values and names, read long snapshot captures (S2.22f)
  - [`5ede26a`](https://github.com/brunomaida/Layers/commit/5ede26a23a73de145fb5b99180049a82a821610f) fix: drop on* html attributes and cap the total frozen canvas size (S2.22f)
  - [`b67504d`](https://github.com/brunomaida/Layers/commit/b67504dc16ad3ad57dee5466256b6907b7f76af7) fix: keep root.name on a matching L0 and suffix snapshot roots after rules (S2.22f)
- **Fixed:** Em mock de snapshot, `root.name`/`root.src` ficam no L0 quando ele mesmo casa o seletor; o sufixo `· snapshot` entra depois de `rules`, então um body com vários filhos continua renomeável por elas.
  - [`ed7ed9e`](https://github.com/brunomaida/Layers/commit/ed7ed9e920bc621916bc9a207463de239f616776) fix: allowlist host var values and names, read long snapshot captures (S2.22f)
  - [`b67504d`](https://github.com/brunomaida/Layers/commit/b67504dc16ad3ad57dee5466256b6907b7f76af7) fix: keep root.name on a matching L0 and suffix snapshot roots after rules (S2.22f)
- **Fixed:** A captura (URL, data, viewport) do tooltip de L0 é lida até o `-->`, mesmo com URL de mais de 1000 caracteres.
  - [`8ce95d6`](https://github.com/brunomaida/Layers/commit/8ce95d6056d90ef8eb7563252c1dd4e02de1cde5) fix: keep long-URL snapshots detected, bound the var value scan and widen the function allowlist (S2.22f)
- **Perf:** N/A — só valida atributos na carga e soma o tamanho dos canvases no momento do snapshot; fora de qualquer caminho quente do editor.
  - [`ed7ed9e`](https://github.com/brunomaida/Layers/commit/ed7ed9e920bc621916bc9a207463de239f616776) fix: allowlist host var values and names, read long snapshot captures (S2.22f)
  - [`b67504d`](https://github.com/brunomaida/Layers/commit/b67504dc16ad3ad57dee5466256b6907b7f76af7) fix: keep root.name on a matching L0 and suffix snapshot roots after rules (S2.22f)

### Todos os commits

- [`8cdaea7`](https://github.com/brunomaida/Layers/commit/8cdaea77f9b46e47579849b92e3bb1ba10b915d8) docs: register S2.22f leaf in the tracker (S2.22f)
- [`b2d6f53`](https://github.com/brunomaida/Layers/commit/b2d6f53e657a022ad88910ac834affc90f0d6d73) docs: add the S2.22f implementation plan and link it in the tracker (S2.22f)
- [`ed7ed9e`](https://github.com/brunomaida/Layers/commit/ed7ed9e920bc621916bc9a207463de239f616776) fix: allowlist host var values and names, read long snapshot captures (S2.22f)
- [`5ede26a`](https://github.com/brunomaida/Layers/commit/5ede26a23a73de145fb5b99180049a82a821610f) fix: drop on* html attributes and cap the total frozen canvas size (S2.22f)
- [`b67504d`](https://github.com/brunomaida/Layers/commit/b67504dc16ad3ad57dee5466256b6907b7f76af7) fix: keep root.name on a matching L0 and suffix snapshot roots after rules (S2.22f)
- [`c75ba30`](https://github.com/brunomaida/Layers/commit/c75ba302e06b8ed697c6d82b10c17ffaa7b67495) docs: close S2.22f in the tracker (S2.22f)
- [`8ce95d6`](https://github.com/brunomaida/Layers/commit/8ce95d6056d90ef8eb7563252c1dd4e02de1cde5) fix: keep long-URL snapshots detected, bound the var value scan and widen the function allowlist (S2.22f)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `36d73ecd` | 2026-10-16 15:34 | 3.05h | 798 | 394.7k | 105.38M | 823.4k |
| `agent-a9` | 2026-10-16 18:27 | 8.3m | 42 | 11.7k | 807.8k | 141.4k |
| **Total (2)** | — | **3.19h** | **840** | **406.4k** | **106.19M** | **964.8k** |
