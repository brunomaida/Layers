# Implementation Report — s2-15-manual-marker

- **Branch:** `feature/261014-0-s2-15-manual-marker`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-14 12:56 → 2026-10-14 13:12
- **Status:** `final`
- **Spec:** [docs\superpowers\specs\2026-10-14-s2-15-manual-marker-design.md](../specs/2026-10-14-s2-15-manual-marker-design.md)
- **Gerado em:** 2026-10-14 13:12

## Resumo

**S2.15 — Marcador manual para TS/JS (design)**

title: "S2.15 — Marcador manual para TS/JS (design)" type: spec solution: Layers status: draft created: 2026-10-14 Leaf S2.15 do [roadmap](../../roadmap.md); item do [checklist de release](../../RELEASE-CHECKLIST.md) (B, "Falta marcar TS/JS explicitamente como 'manual' na interface"). O comportamento "patch manual" para origens TS/JS já existe como texto livre: nota do trecho de código (`index.html` `codeRow`), nota do diff (`openDiff`) e log do rascunho (`dcWhy.SOURCE_NOT_CSS`). `makeDraft`, `approve` e `exportFull` já pulam origens não-CSS e não-dc. Falta um marcador visível no chip de orige…

## Solicitação & Spec

### Spec definida

**S2.15 — Marcador manual para TS/JS (design)**

title: "S2.15 — Marcador manual para TS/JS (design)" type: spec solution: Layers status: draft created: 2026-10-14 Leaf S2.15 do [roadmap](../../roadmap.md); item do [checklist de release](../../RELEASE-CHECKLIST.md) (B, "Falta marcar TS/JS explicitamente como 'manual' na interface"). O comportamento "patch manual" para origens TS/JS já existe como texto livre: nota do trecho de código (`index.html` `codeRow`), nota do diff (`openDiff`) e log do rascunho (`dcWhy.SOURCE_NOT_CSS`). `makeDraft`, `approve` e `exportFull` já pulam origens não-CSS e não-dc. Falta um marcador visível no chip de orige…

[Ver spec completa: `docs\superpowers\specs\2026-10-14-s2-15-manual-marker-design.md`](../specs/2026-10-14-s2-15-manual-marker-design.md)

## Mudanças

### Added (4)

- `changelog.d/feature-261014-0-s2-15-manual-marker.md` (+10/-0, doc)
- `docs/superpowers/plans/2026-10-14-s2-15-manual-marker.md` (+313/-0, doc)
- `docs/superpowers/specs/2026-10-14-s2-15-manual-marker-design.md` (+65/-0, test)
- `e2e/manual-marker.spec.js` (+56/-0, src)

### Changed (8)

- `docs/ARCHITECTURE.md` (+1/-1, doc)
- `docs/RELEASE-CHECKLIST.md` (+1/-1, doc)
- `docs/_index.md` (+2/-0, doc)
- `docs/roadmap.data.json` (+21/-14, doc)
- `docs/roadmap.md` (+1/-1, doc)
- `index.html` (+5/-5, other)
- `lib/layers-core.js` (+6/-0, src)
- `test/layers-core.test.js` (+28/-0, test)

### Changelog fragment

**Added:**
- Origens TS/JS aparecem como "manual" no cabeçalho do painel de propriedades ("· patch manual"), no tooltip do chip de origem e na lista de Ajustes (prefixo "patch manual ·", que o corte por reticências não alcança). `LayersCore.isManualSource` (puro, testado); nenhum caminho de gravação mudou.
- `e2e/manual-marker.spec.js`: cabeçalho e Ajustes no `traval` (origem curta e longa, medindo recorte), e nenhum marcador em origem `.css`.

**Perf:**
- estimated — um teste de regex por seleção de nó e por linha de Ajustes; nada no caminho de câmera.

## Arquivos tocados

### src (2)

- [`e2e/manual-marker.spec.js`](../../../e2e/manual-marker.spec.js) — A (+56/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+6/-0)

### test (2)

- [`docs/superpowers/specs/2026-10-14-s2-15-manual-marker-design.md`](../specs/2026-10-14-s2-15-manual-marker-design.md) — A (+65/-0)
- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+28/-0)

### doc (7)

- [`changelog.d/feature-261014-0-s2-15-manual-marker.md`](../../../changelog.d/feature-261014-0-s2-15-manual-marker.md) — A (+10/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+1/-1)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+1/-1)
- [`docs/_index.md`](../../_index.md) — M (+2/-0)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+21/-14)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)
- [`docs/superpowers/plans/2026-10-14-s2-15-manual-marker.md`](../plans/2026-10-14-s2-15-manual-marker.md) — A (+313/-0)

### other (1)

- [`index.html`](../../../index.html) — M (+5/-5)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Added:** Origens TS/JS aparecem como "manual" no cabeçalho do painel de propriedades ("· patch manual"), no tooltip do chip de origem e na lista de Ajustes (prefixo "patch manual ·", que o corte por reticências não alcança). `LayersCore.isManualSource` (puro, testado); nenhum caminho de gravação mudou.
  - [`8e1e7c4`](https://github.com/brunomaida/Layers/commit/8e1e7c4dcb2564e54c461b32f9c4106f45283b58) docs(spec): add S2.15 manual marker design and link it in the tracker (S2.15)
  - [`e010e1a`](https://github.com/brunomaida/Layers/commit/e010e1a8237b6217195be962b5e4afae2c9727fc) docs(plan): add S2.15 manual marker implementation plan and link it in the tracker (S2.15)
  - [`7c2e022`](https://github.com/brunomaida/Layers/commit/7c2e0221efff4f35e43ba0f964e0959e6c3daf3e) feat(core): add isManualSource predicate for TS/JS origins (S2.15)
  - [`25c20e8`](https://github.com/brunomaida/Layers/commit/25c20e8831632cdb79f934331cfc9a0befc4cfa9) feat(editor): mark TS/JS origins as manual in the origin chip and Ajustes (S2.15)
  - [`0f3c654`](https://github.com/brunomaida/Layers/commit/0f3c654286fc96327c48374528abf0ceafe9f135) fix(editor): move manual marker to header and Ajustes prefix so it is not clipped (S2.15)
- **Added:** `e2e/manual-marker.spec.js`: cabeçalho e Ajustes no `traval` (origem curta e longa, medindo recorte), e nenhum marcador em origem `.css`.
  - [`8e1e7c4`](https://github.com/brunomaida/Layers/commit/8e1e7c4dcb2564e54c461b32f9c4106f45283b58) docs(spec): add S2.15 manual marker design and link it in the tracker (S2.15)
  - [`e010e1a`](https://github.com/brunomaida/Layers/commit/e010e1a8237b6217195be962b5e4afae2c9727fc) docs(plan): add S2.15 manual marker implementation plan and link it in the tracker (S2.15)
  - [`25c20e8`](https://github.com/brunomaida/Layers/commit/25c20e8831632cdb79f934331cfc9a0befc4cfa9) feat(editor): mark TS/JS origins as manual in the origin chip and Ajustes (S2.15)
  - [`0f3c654`](https://github.com/brunomaida/Layers/commit/0f3c654286fc96327c48374528abf0ceafe9f135) fix(editor): move manual marker to header and Ajustes prefix so it is not clipped (S2.15)
- **Perf:** estimated — um teste de regex por seleção de nó e por linha de Ajustes; nada no caminho de câmera.
  - [`25c20e8`](https://github.com/brunomaida/Layers/commit/25c20e8831632cdb79f934331cfc9a0befc4cfa9) feat(editor): mark TS/JS origins as manual in the origin chip and Ajustes (S2.15)
  - [`0f3c654`](https://github.com/brunomaida/Layers/commit/0f3c654286fc96327c48374528abf0ceafe9f135) fix(editor): move manual marker to header and Ajustes prefix so it is not clipped (S2.15)

### Todos os commits

- [`b937087`](https://github.com/brunomaida/Layers/commit/b93708741a4eef05f53e1b0fbc3d6e0b237f597e) docs(roadmap): mark S2.15 in-progress (S2.15)
- [`8e1e7c4`](https://github.com/brunomaida/Layers/commit/8e1e7c4dcb2564e54c461b32f9c4106f45283b58) docs(spec): add S2.15 manual marker design and link it in the tracker (S2.15)
- [`e010e1a`](https://github.com/brunomaida/Layers/commit/e010e1a8237b6217195be962b5e4afae2c9727fc) docs(plan): add S2.15 manual marker implementation plan and link it in the tracker (S2.15)
- [`7c2e022`](https://github.com/brunomaida/Layers/commit/7c2e0221efff4f35e43ba0f964e0959e6c3daf3e) feat(core): add isManualSource predicate for TS/JS origins (S2.15)
- [`25c20e8`](https://github.com/brunomaida/Layers/commit/25c20e8831632cdb79f934331cfc9a0befc4cfa9) feat(editor): mark TS/JS origins as manual in the origin chip and Ajustes (S2.15)
- [`1a1eab7`](https://github.com/brunomaida/Layers/commit/1a1eab73e827b8a3991f3cbdce22e175bd34a66f) docs: close S2.15 with changelog fragment, checklist and architecture note (S2.15)
- [`0f3c654`](https://github.com/brunomaida/Layers/commit/0f3c654286fc96327c48374528abf0ceafe9f135) fix(editor): move manual marker to header and Ajustes prefix so it is not clipped (S2.15)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `214965d6` | 2026-10-14 12:20 | 52.2m | 324 | 121.2k | 22.14M | 424.5k |
| `agent-a7` | 2026-10-14 13:03 | 4.7m | 110 | 4.2k | 2.22M | 99.7k |
| **Total (2)** | — | **56.9m** | **434** | **125.4k** | **24.36M** | **524.2k** |
