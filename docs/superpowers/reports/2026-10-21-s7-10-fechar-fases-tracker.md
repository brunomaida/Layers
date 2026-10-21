# Implementation Report — s7-10-fechar-fases-tracker

- **Branch:** `docs/261021-0-s7-10-fechar-fases-tracker`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-21 18:19 → 2026-10-21 18:20
- **Status:** `final`
- **Gerado em:** 2026-10-21 18:20

## Resumo

Tracker: as linhas de fase S2, S4, S5, S6 e S7 de `docs/roadmap.md` passam para `done` (todas as leaves já estavam `done`); S4.5 e S4.9 ganham razão e título que descrevem o que foi entregue, e a regressão do orbit com zoom (+2,5 ms) fica registrada como conhecida e aceita na S4.9.

## Mudanças

### Added (1)

- `changelog.d/docs-261021-0-s7-10-fechar-fases-tracker.md` (+10/-0, doc)

### Changed (7)

- `docs/ARCHITECTURE.md` (+2/-2, doc)
- `docs/RELEASE-CHECKLIST.md` (+1/-1, doc)
- `docs/TOPOLOGY.md` (+6/-1, doc)
- `docs/bench-methodology.md` (+1/-1, doc)
- `docs/roadmap.config.json` (+2/-1, doc)
- `docs/roadmap.data.json` (+30/-4, doc)
- `docs/roadmap.md` (+8/-7, doc)

### Changelog fragment

**Changed:**
- Tracker: as linhas de fase S2, S4, S5, S6 e S7 de `docs/roadmap.md` passam para `done` (todas as leaves já estavam `done`); S4.5 e S4.9 ganham razão e título que descrevem o que foi entregue, e a regressão do orbit com zoom (+2,5 ms) fica registrada como conhecida e aceita na S4.9.
- `docs/TOPOLOGY.md` lista `bench/`, `bench/results/`, `e2e/` e as configs de benchmark e Playwright, e descreve os helpers de render de `lib/layers-core.js`; `docs/ARCHITECTURE.md` perde o "próximo passo" da S4.9 e marca `flushMove()` como sem chamadores; `docs/bench-methodology.md` aponta o comando do perf de UI.

**Perf:**
- N/A — só documentação e tracker, sem código nem cena tocados.

## Arquivos tocados

### doc (8)

- [`changelog.d/docs-261021-0-s7-10-fechar-fases-tracker.md`](../../../changelog.d/docs-261021-0-s7-10-fechar-fases-tracker.md) — A (+10/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+2/-2)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+1/-1)
- [`docs/TOPOLOGY.md`](../../TOPOLOGY.md) — M (+6/-1)
- [`docs/bench-methodology.md`](../../bench-methodology.md) — M (+1/-1)
- [`docs/roadmap.config.json`](../../roadmap.config.json) — M (+2/-1)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+30/-4)
- [`docs/roadmap.md`](../../roadmap.md) — M (+8/-7)

## Arquitetura impactada

**`docs/TOPOLOGY.md` diff:**

```diff
diff --git a/docs/TOPOLOGY.md b/docs/TOPOLOGY.md
index e2076ba..c88507e 100644
--- a/docs/TOPOLOGY.md
+++ b/docs/TOPOLOGY.md
@@ -20,7 +20,7 @@ artefatos de topo.
 | `vendor/react.production.min.js` | Global `window.React` | Não | `scripts/vendor-assets.py` |
 | `vendor/react-dom.production.min.js` | Global `window.ReactDOM` | Não | `scripts/vendor-assets.py` |
 | `vendor/csstree.js` | Global `csstree` (parser CSS); dependência declarada no cabeçalho de `lib/layers-core.js` | Não | `scripts/vendor-assets.py` (pinned by hash) |
-| `lib/layers-core.js` | `globalThis.LayersCore`: lógica pura do loader (caminhos, AST CSS, zip, config, manifesto, template dc), sem DOM/React | Sim | Mão |
+| `lib/layers-core.js` | `globalThis.LayersCore`: lógica pura do loader (caminhos, AST CSS, zip, config, manifesto, template dc) e helpers puros de render chamados pelo `index.html` (culling, agrupamento por z, janela e slots da árvore), sem DOM/React | Sim | Mão |
 | `fonts/fonts.css` | 48 blocos `@font-face` com `unicode-range` | Não | `scripts/vendor-assets.py` |
 | `fonts/*.woff2` | 15 faces variáveis subsetadas | Não | `scripts/vendor-assets.py` |
 | `scripts/vendor-assets.py` | Regenera `fonts/` e `vendor/`; valida SRI do React | Sim | Mão |
@@ -29,6 +29,9 @@ artefatos de topo.
 | `tools/layers-suggest.js` | Spike: sugere `interactions` a partir do mock (colado no console) | Sim | Mão |
 | `tools/layers-derive.js` | Spike: deriva manifesto de uma pasta (`node`; só `fs`/`path`) | Sim | Mão |
 | `test/layers-core.test.js`, `test/setup.js` | Vitest sobre `lib/layers-core.js`; `setup.js` instala a global `csstree` (pacote `css-tree`) | Sim | Mão |
+| `bench/` (`run.mjs`, `core.bench.js`, `workloads.js`, `alloc.mjs`, `to-bench-json.js`), `vitest.bench.config.js` | Microbenchmarks do core (`npm run bench`); lêem `lib/layers-core.js`, nada no app aponta para eles | Sim | Mão |
+| `bench/results/*.json` | Resultados de benchmark e de `e2e/perf.spec.js` (ignorados pelo git, exceto os já versionados) | Não | Gerado por `npm run bench` e `npx playwright test e2e/perf.spec.js` |
+| `e2e/*.spec.js`, `e2e/*-helpers.js`, `playwright.config.js` | Playwright: E2E funcional, perf de UI e gates de pixel; sobem o dev server `:5180` e leem `fixtures/**` | Sim | Mão |
 | `fixtures/` | Projetos-alvo do loader, lidos por HTTP (`#layers=<pasta>/`) e pelos testes | Sim | Vendor/Mão |
 | `vite.config.js` | Plugin dev que serve `fixtures/` sem o wrapper de HMR | Sim | Mão |
 | `package.json` | Dev server (Vite) e runners de teste. Não há build de produção | Sim | Mão |
@@ -78,6 +81,8 @@ artefatos de topo.
      test/*.test.js ──importa──▶ test/setup.js ──▶ css-tree (npm) + lib/layers-core.js
                    └─ le ─────▶ fixtures/**
      vite.config.js ── serve fixtures/ ao dev server (#layers=<pasta>/)
+     bench/*.bench.js ──importa──▶ lib/layers-core.js     (npm run bench)
+     e2e/*.spec.js ──abre──▶ dev server :5180 + fixtures/**  (playwright.config.js)
      tools/layers-derive.js    (node: fs, path)   · layers-snapshot.js / layers-suggest.js
                                                     (colados no console do navegador)
 ```
```

## Testes

_Sem testes adicionados ou modificados no range._

## Commits ↔ changelog

- **Changed:** Tracker: as linhas de fase S2, S4, S5, S6 e S7 de `docs/roadmap.md` passam para `done` (todas as leaves já estavam `done`); S4.5 e S4.9 ganham razão e título que descrevem o que foi entregue, e a regressão do orbit com zoom (+2,5 ms) fica registrada como conhecida e aceita na S4.9.
  - [`e7e69e4`](https://github.com/brunomaida/Layers/commit/e7e69e4504c0d41a66b346fc904a86a59149e34c) docs: register S7.10 to close the tracker phases and the S4 doc debts
  - [`470c76b`](https://github.com/brunomaida/Layers/commit/470c76be300140de21f8f6db4d29dd8bbb835590) docs: close the tracker phases and the S4 doc debts (S7.10)
- **Changed:** `docs/TOPOLOGY.md` lista `bench/`, `bench/results/`, `e2e/` e as configs de benchmark e Playwright, e descreve os helpers de render de `lib/layers-core.js`; `docs/ARCHITECTURE.md` perde o "próximo passo" da S4.9 e marca `flushMove()` como sem chamadores; `docs/bench-methodology.md` aponta o comando do perf de UI.
  - [`e7e69e4`](https://github.com/brunomaida/Layers/commit/e7e69e4504c0d41a66b346fc904a86a59149e34c) docs: register S7.10 to close the tracker phases and the S4 doc debts
  - [`470c76b`](https://github.com/brunomaida/Layers/commit/470c76be300140de21f8f6db4d29dd8bbb835590) docs: close the tracker phases and the S4 doc debts (S7.10)
- **Perf:** N/A — só documentação e tracker, sem código nem cena tocados.
  - [`e7e69e4`](https://github.com/brunomaida/Layers/commit/e7e69e4504c0d41a66b346fc904a86a59149e34c) docs: register S7.10 to close the tracker phases and the S4 doc debts
  - [`470c76b`](https://github.com/brunomaida/Layers/commit/470c76be300140de21f8f6db4d29dd8bbb835590) docs: close the tracker phases and the S4 doc debts (S7.10)

### Todos os commits

- [`e7e69e4`](https://github.com/brunomaida/Layers/commit/e7e69e4504c0d41a66b346fc904a86a59149e34c) docs: register S7.10 to close the tracker phases and the S4 doc debts
- [`470c76b`](https://github.com/brunomaida/Layers/commit/470c76be300140de21f8f6db4d29dd8bbb835590) docs: close the tracker phases and the S4 doc debts (S7.10)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `56e2e6a8` | 2026-10-21 15:23 | 2.96h | 518 | 223.7k | 53.99M | 771.6k |
| **Total (1)** | — | **2.96h** | **518** | **223.7k** | **53.99M** | **771.6k** |
