---
title: "S2.22f — Achados menores da revisão da S2.22c"
type: plan
solution: Layers
status: draft
created: 2026-10-16
---

# S2.22f — Achados menores da S2.22c — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fechar os 7 Minors adiados na revisão da S2.22c ([design S2.22](../specs/2026-10-16-s2-22-loader-checkchanges-design.md) § Decisões da S2.22c).

**Architecture:** Endurecer `hostAttrsFromHtml` (allowlist de valor e nome), tirar `on*` do `<html>` no snapshot, mover a decisão de `root.name` e do sufixo `· snapshot` para depois de `rules`, somar um teto agregado de canvas, e ler a captura até o primeiro `-->` (`LayersCore.snapshotCapture`).

**Tech Stack:** JS puro, Vitest, Playwright.

**Spec:** [design S2.22](../specs/2026-10-16-s2-22-loader-checkchanges-design.md).

## Global Constraints

- Visual congelado; `support.js` intocado; sem rede; escrita só por `writeInto`/`writeText`.
- `index.html`: âncoras únicas. Testes `Metodo_Cenario_Esperado`; `npm test` verde antes de cada commit; commits EN, trailer de sessão.
- Teto agregado de canvas: 4 000 000 caracteres de data URL por snapshot; o canvas que o estourar fica vazio com `console.warn`.
- Fragmento `changelog.d/fix-261016-62-s2-22f-snapshot-minors.md` com `### Perf`.

## Review Focus

- Valor de variável legítimo (`#fff`, `rgb(1 2 3 / 50%)`, `calc(1px + 2px)`, `var(--x)`, `"Inter", sans-serif`) continua passando; `image-set(`, `/*`, aspas abertas e função fora da lista saem.
- `root.name` que casa o próprio L0 e um descendente: fica no L0.
- Body com vários filhos e `rules` que casam a classe do body: L0 é renomeado, com o sufixo.
- Comentário `snapshot LAYERS` com URL de mais de 1000 caracteres: o tooltip mostra a captura inteira.

## Design: Architecture & Flows

```
snapshot.js: <html …attrs sem on*…>  canvases: soma de data URLs <= 4 000 000
     ▼
buildProjectFromHtml: snapshotCapture(html) ─▶ {snapshot, capture}
   rules (renomeia body) ─▶ depois: sufixo " · snapshot" e root.name (rootEl.matches antes de descendente)
hostAttrsFromHtml: nome ^data-[a-z0-9_.-]+$ ; valor: sem /*, aspas pares, so funcoes da lista
```

## Implementation Outline

- **Task 1** — helpers puros: valor/nome de atributo e `snapshotCapture`.
- **Task 2** — snapshot: `on*` fora e teto agregado.
- **Task 3** — loader: `root.name` no L0, sufixo depois de `rules`, captura longa; fixture e E2E.
- **Task 4** — docs, changelog, roadmap.

## Critical Files

`lib/layers-core.js` (`hostAttrsFromHtml`), `test/layers-core.test.js`, `tools/layers-snapshot.js`, `e2e/snapshot-cli.spec.js`, `index.html` (`buildProjectFromHtml` ~1030-1070), `fixtures/snap-fidelity/`, `e2e/snap-fidelity.spec.js`, `docs/ARCHITECTURE.md`, `docs/layers-json.md`.

### Task 1: Helpers puros

**Files:** Modify `lib/layers-core.js`; Test `test/layers-core.test.js`.

**Interfaces:** Produces `LayersCore.snapshotCapture(html: string): { snapshot: boolean, capture: string }`; `hostAttrsFromHtml` com a regra nova.

- [ ] **Step 1: testes que falham.** `HostAttrsFromHtml_ValorFora_DaAllowlist`: `--c:image-set("http://e/x.png" 1x)`, `--a:/*`, `--d:"a`, `--e:foo(1)` saem; `#fff`, `rgb(1 2 3 / 50%)`, `calc(1px + 2px)`, `var(--x)`, `"Inter", sans-serif`, `0 1px 2px rgba(0,0,0,.2)` ficam. `HostAttrsFromHtml_NomeDataInvalido_Sai`: `data-a<b` e `data-x"y` saem; `data-theme`, `data-bs-theme` ficam. `SnapshotCapture_UrlLonga_DevolveCapturaInteira`: comentário com URL de 1500 caracteres → `capture` termina na data/viewport; sem comentário → `{ snapshot: false, capture: '' }`; o comentário depois dos primeiros 4000 caracteres não conta.
- [ ] **Step 2:** `npx vitest run test/layers-core.test.js -t "HostAttrsFromHtml|SnapshotCapture"` → FAIL.
- [ ] **Step 3: implementar.** Valor: caracteres `[#\w\s.,%()+\-*/"']`, sem `/*` nem `*/`, número par de `"` e de `'`, cada `nome(` na lista `var calc min max clamp rgb rgba hsl hsla hwb lab lch oklab oklch color color-mix linear-gradient radial-gradient conic-gradient cubic-bezier`. Nome: `/^data-[a-z0-9_.-]+$/`. `snapshotCapture`: regex `/<!--\s*snapshot LAYERS\s*·?\s*([\s\S]*?)\s*-->/` nos primeiros 4000 caracteres.
- [ ] **Step 4:** `npm test` → PASS. **Step 5:** commit `fix: allowlist host var values and names, read long snapshot captures (S2.22f)`.

### Task 2: Snapshot — `on*` e teto agregado

**Files:** Modify `tools/layers-snapshot.js`; Test `e2e/snapshot-cli.spec.js`.

- [ ] **Step 1: testes que falham.** Em `Snapshot_HtmlAttrsAndCanvas_AreCarriedIntoTheMock` o `<html>` ganha `onclick="x()"` e o mock não pode conter `onclick` no `<html>`. Novo `Snapshot_CanvasesAboveTheAggregateCap_LastOnesStayEmpty`: 5 canvases 400×400 com ruído (cada data URL ≈ 850 000 caracteres) → 4 `<img data-layers-frozen` e 1 `<canvas`.
- [ ] **Step 2:** `npx playwright test e2e/snapshot-cli.spec.js -g "HtmlAttrsAndCanvas|AggregateCap"` → FAIL.
- [ ] **Step 3: implementar.** Atributos do `<html>` sem `/^on/i`; acumulador de `url.length` que passa a motivo `soma acima de 4 M caracteres`.
- [ ] **Step 4:** `npx playwright test e2e/snapshot-cli.spec.js` → PASS. **Step 5:** commit `fix: drop on* html attributes and cap the total frozen canvas size (S2.22f)`.

### Task 3: Loader

**Files:** Modify `index.html`; fixtures `fixtures/snap-fidelity/layers/mock.self.html`, `mock.multi.html`, `layers.json`; Test `e2e/snap-fidelity.spec.js`.

**Interfaces:** Consumes `snapshotCapture` (Task 1).

- [ ] **Step 1: testes que falham.** Estado `self`: `#app.shell > .shell`, `root.name ".shell"` → o L0 (`#app`) leva `name` `.shell · snapshot` e o `src`; o filho não. Estado `multi`: body com classe `page` e 2 filhos, `rules: { ".page": "src/app.ts|Page|1" }` → L0 `.page · snapshot`. Estado `light` com URL de 1500 caracteres no comentário: `title` de L0 contém o trecho final da captura.
- [ ] **Step 2:** `npx playwright test e2e/snap-fidelity.spec.js` → FAIL.
- [ ] **Step 3: implementar.** `buildProjectFromHtml`: `snapshotCapture(html)` define `snapMock` e a captura; `nameEl = rootEl.matches(sel) ? rootEl : rootEl.querySelector(sel) || rootEl`; o sufixo `· snapshot` entra depois do laço de `rules`.
- [ ] **Step 4:** `npm test` e E2E relacionados → PASS. **Step 5:** commit `fix: keep root.name on a matching L0 and suffix snapshot roots after rules (S2.22f)`.

### Task 4: Docs, changelog e roadmap

- [ ] `ARCHITECTURE.md` e `layers-json.md`: allowlist de valor, teto agregado, limite do canvas em `<img>` (regras escritas para `canvas` deixam de casar, resets de `img` passam a valer, canvas WebGL sem `preserveDrawingBuffer` congela em branco). Fragmento de changelog com `### Fixed` e `### Perf`. `docs/roadmap.md`: S2.22f com `plan` e `report`, status `done`; `python ~/.claude/design/_build_proto.py .`; `npm test`; commit `docs: close S2.22f in the tracker (S2.22f)`.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| Task 1, 2, 3. código e testes | gen | Standard | Workhorse | julgamento e autoria de testes |
| Task 4. docs | gen | Standard | Workhorse | prosa de docs |
| Pre-merge review | review | Architectural | Architect | verificador ≥ gerador |

Executor: none — toda tarefa exige julgamento ou autoria de testes.

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — já coberto pela issue #62 (S2.22); nenhuma issue nova.

> [!DECISION] phase-intake
> Classification: **micro** `S2.22f` sob **S2.22**, alvo **Unreleased**.
> Fork of an existing row? **No**.
> - **Option A**: branch `fix/261016-62-s2-22f-snapshot-minors` (aplicada: os achados vêm da revisão da S2.22c, já mesclada no PR #65)

> [!DECISION] execution
> Method: **Inline** (4 tarefas sequenciais, `index.html` e o mesmo fluxo de snapshot).
