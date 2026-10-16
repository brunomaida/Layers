---
title: "S2.22b — Múltiplos estados do mock no layers.json e no CLI"
type: plan
solution: Layers
status: draft
created: 2026-10-16
---

# S2.22b — Múltiplos estados do mock — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Um projeto declara vários mocks (`states`), o menu ⚡ Interagir troca o estado e recarrega as camadas, e o CLI de snapshot captura `gallery.html#/<estado>` (G4, G5 do [design S2.22](../specs/2026-10-16-s2-22-loader-checkchanges-design.md)).

**Architecture:** Dois helpers puros em `lib/layers-core.js` (`projectStates`, `pickState`); o loader escolhe o mock pelo estado ativo (`this.stateMap[chave]`); o item "Modo interativo" ganha o grupo "Estado do mock" quando há 2+ estados; o CLI ganha `--url` e `--state`. Sem `states`, o comportamento é idêntico ao atual (`mock`).

**Tech Stack:** JS puro, Vitest, Playwright.

## Global Constraints

- Visual congelado: o seletor de estado reutiliza `item()` do menu Interagir; nenhum estilo novo.
- `support.js` intocado; sem requisição externa; escrita só por `writeInto`/`writeText`; CLI só loopback.
- `index.html`: âncoras únicas, contagem de matches antes de substituir.
- Nomes de teste `Metodo_Cenario_Esperado`; `npm test` verde antes de cada commit; commits EN, sem atribuição a IA além do trailer de sessão.
- Fragmento `changelog.d/feature-261016-62-s2-22b-multi-state.md` com `### Perf` (≥20 caracteres).

## Review Focus

- `states` ausente, vazio, não-array ou com entradas inválidas: cai em `mock` (byte a byte o comportamento atual).
- Nome ativo que não existe mais no manifesto: cai no primeiro estado.
- Troca de estado com edições não salvas: pede confirmação e descarta como o Recarregar.
- `--state` com `/`, `..`, `#` ou espaço: recusado antes de abrir o navegador.

## Design: Architecture & Flows

```
layers.json  states:[{name:"empty",mock:"layers/mock.empty.html"},{name:"csv-loaded",mock:"…"}]
     │ projectStates(man) ─▶ pickState(states, this.stateMap[chave]) ─▶ mockPath (via base)
     ▼
loadProject ─▶ project.states / project.stateName ─▶ menu Interagir › Modo interativo › "Estado do mock"
     ▲                                                          │ clique
     └──────── switchState(name): confirma se há edições, dropPending, stateMap[chave]=name, loadProject()

CLI:  --state csv-loaded  ─▶ goto <origem do app>/gallery.html#/csv-loaded ─▶ snapshot ─▶ <saída>.html
```

## Implementation Outline

- **Task 1** — helpers puros + testes.
- **Task 2** — CLI: `--url`, `--state`.
- **Task 3** — loader e menu + fixture + E2E.
- **Task 4** — docs, changelog, roadmap.

## Critical Files

`lib/layers-core.js` (junto de `staleKind`), `test/layers-core.test.js`, `tools/layers-snapshot-cli.mjs`, `test/snapshot-cli.test.js`, `e2e/snapshot-cli.spec.js`, `index.html` (`loadProject` ~1278, `reloadProject` ~1602, INTER ~2256), `fixtures/multi-state/`, `e2e/multi-state.spec.js`, `docs/layers-json.md`, `docs/ARCHITECTURE.md`, `docs/RELEASE-CHECKLIST.md`.

### Task 1: Helpers puros

**Interfaces:**
- Produces: `core.projectStates(man) -> {name:string, mock:string}[]` (só entradas com `name` e `mock` strings não vazias; nome repetido mantém a primeira; fora de array → `[]`).
- Produces: `core.pickState(states, wanted) -> {name, mock}|null` (nome igual a `wanted`, senão o primeiro, senão `null`).

- [ ] Testes (`ProjectStates_*`, `PickState_*`): manifesto sem `states` → `[]`; não-array → `[]`; entradas inválidas descartadas; nome duplicado mantém o primeiro; `pickState` com nome existente, inexistente, `null` e lista vazia.
- [ ] Rodar e ver falhar; implementar; ver passar; `npm test`.
- [ ] Commit: `feat: add project-state helpers for multi-state manifests (S2.22b)`

### Task 2: CLI `--url` e `--state`

**Interfaces:** `parseSnapshotArgs` devolve `state: string|null`; `--url <u>` equivale ao primeiro posicional (posicional e `--url` juntos → erro); `snapshotTarget(url, state) -> string` resolve `gallery.html#/<state>` contra a URL do app (sem `state`, devolve a URL).

- [ ] Testes: `--state csv-loaded` parseado; nome com `/`, `..`, `#`, espaço → erro; `--url` no lugar do posicional; `snapshotTarget('http://localhost:5173/', 'csv-loaded')` → `http://localhost:5173/gallery.html#/csv-loaded`; sem estado, URL intacta.
- [ ] E2E (`e2e/snapshot-cli.spec.js`): app falso serve `/gallery.html` com `<body>` distinto; `--state x` grava o corpo da gallery.
- [ ] Implementar `main` usando `snapshotTarget`; revalidar `page.url()` com `checkSnapshotUrl` (já existe, ignora o hash).
- [ ] Commit: `feat: capture a gallery state with --state and --url in the snapshot CLI (S2.22b)`

### Task 3: Loader e menu

**Interfaces:** `loadProject` escolhe `mockPath` por `pickState(projectStates(man), this.stateMap[chave])` (fallback `man.mock`); `project.states` e `project.stateName` no estado do app; `switchState(name)` no componente.

- [ ] Fixture `fixtures/multi-state/` (`layers.json` com 2 estados, 2 mocks de cores distintas) e `e2e/multi-state.spec.js`: abre no 1º estado; troca pelo menu Interagir; cor de `#b` muda; `fixtures/snap-origin` (sem `states`) não mostra o grupo.
- [ ] Rodar e ver falhar; implementar no `index.html` (âncoras únicas); ver passar; `npm test` e os E2E vizinhos (`dead-interactions`, `stale-banner`, `layout-drift`, `snapshot-dedupe`).
- [ ] Commit: `feat: switch the project mock state from the Interagir menu (S2.22b)`

### Task 4: Docs, changelog e roadmap

- [ ] `docs/layers-json.md` (campo `states`), `docs/ARCHITECTURE.md` (escolha do mock e `switchState`), `docs/RELEASE-CHECKLIST.md` (item do E2E), fragmento de changelog (`### Added` + `### Perf` `N/A`), linha S2.22b do roadmap com `plan` ligado e status `done`, rebuild do tracker.
- [ ] `npm test` verde; `python -X utf8 ~/.claude/scripts/retrofit_docs.py .`.
- [ ] Commit: `docs: close S2.22b in the tracker (S2.22b)`

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| Task 1, 2, 3. loader, CLI e testes | gen | Standard | Workhorse | julgamento e autoria de testes |
| Task 4. docs, changelog e roadmap | gen | Standard | Workhorse | prosa de docs |
| Pre-merge review | review | Architectural | Architect | verificador ≥ gerador |

Executor: none — toda tarefa exige julgamento ou autoria de testes.

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — já coberto pela issue #62 (S2.22); nenhuma issue nova.

> [!DECISION] phase-intake
> Classification: **micro** `S2.22b` sob **S2.22**, alvo **Unreleased**.
> Fork of an existing row? **No**.
> - **Option A**: branch própria `feature/261016-62-s2-22b-multi-state` (aplicada: a S2.22 já foi mesclada no PR #63)

> [!DECISION] execution
> Method: **Inline** (4 tarefas pequenas e sequenciais, mesmo arquivo `index.html`).
