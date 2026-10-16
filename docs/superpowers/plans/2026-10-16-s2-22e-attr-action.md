---
title: "S2.22e — Ação attr em interactions"
type: plan
solution: Layers
status: draft
created: 2026-10-16
---

# S2.22e — Ação `attr` em `interactions` — Implementation Plan

**Goal:** o mock estático alterna `data-dock`, `data-collapsed` e `aria-*` por chips do menu ⚡ Interagir (G6 do [design S2.22](../specs/2026-10-16-s2-22-loader-checkchanges-design.md)).

**Architecture:** três helpers puros em `lib/layers-core.js` (`attrAction`, `attrIsOn`, `attrToggle`), `deadInteractions` lista o seletor do `attr`, e `index.html` liga o helper em `hasAct`/`act`/`actOn`. Sem UI nova: o chip reaproveita o visual e o hint vai no `title`.

## Global Constraints

- Visual congelado; `support.js` intocado; só `data-*`/`aria-*` (`on*`, `style`, `class`, `href` recusados); `value`/`off` até 200 caracteres.
- `index.html` com âncoras únicas; `npm test` verde antes de commitar.

## Review Focus

- Nome fora de `data-*`/`aria-*`, valor não escalar ou longo: ação recusada, chip inerte com `title` "attr inválido".
- Sem `off`, desligar remove o atributo; com `off`, volta ao valor de `off`.
- Seletor sem alvo entra em `deadInteractions` só quando o `attr` é válido.

## Tasks

- [x] Task 1 — helpers puros e testes Vitest (`AttrAction`).
- [x] Task 2 — `index.html` (`hasAct`, `act`, `actOn`, hint do chip), fixture `fixtures/attr-action/` e `e2e/attr-action.spec.js`.
- [x] Task 3 — docs (`layers-json.md`, `ARCHITECTURE.md`, `RELEASE-CHECKLIST.md`), changelog e roadmap.
