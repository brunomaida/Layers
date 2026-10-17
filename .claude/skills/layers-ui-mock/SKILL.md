---
name: layers-ui-mock
description: 'Use when a request changes Layers'' visible interface (layout, color, spacing, screen text, dialog, menu, panel): Layers profile of the web-ui-mock skill.'
---

# Layers UI mock profile

Follow the global skill `web-ui-mock` (steps, mechanism, bootstrap). This file only holds the Layers values.

| Field | Layers value |
|---|---|
| Canvas | `https://claude.ai/artifact/YAjnzs8CsEDpSbwpn5CCuJ` (`/design` on Opus) |
| Boards, contract, matrix | `docs/design/ui-mock/README.md` (`## Contrato de autoria`, `## Boards`, `## Matriz`) |
| Coverage test | `npx vitest run test/uiMockCoverage.test.js` |
| Regions | Loader · snapshot, Dock, Painel de propriedades, Painel Ajustes, Palco 3D, Menus, Seletor de layout, Toasts (`exempt`) |
| Token source | `THEMES`/`ACCENTS`/`SELECTS` in `index.html`; visual defaults in `docs/LOCAL-SETUP.md` |
| Frozen visual | root `CLAUDE.md`: do not change colors, typography, spacing or dock/panel sizes without a request; the mock proposes only what the leaf asks |
| Pattern | reference board `Base.dc.html` (1440x900): props `tema`/`selecao`, panel chrome, 960 or 1240 wide boards, header `S<leaf> · n` |

Layers specifics: no board may load an external `<script src>` (Google Fonts `<link>` is allowed);
the Design `./support.js` runtime is never versioned. Commit gate: `npm test`.
