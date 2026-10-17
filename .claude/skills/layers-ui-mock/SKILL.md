---
name: layers-ui-mock
description: 'Use when a request changes Layers'' visible interface (layout, color, spacing, screen text, new dialog, menu or panel): keeps docs/design/ui-mock boards and code in sync.'
---

# Layers UI mock maintenance

The boards under `docs/design/ui-mock/` are the visual guide to the Layers UI.
Board first, code second, one commit for both. Guard: `test/uiMockCoverage.test.js`.

## When to use

Any change to what the user sees in Layers: layout, color, spacing, screen text, a new dialog, menu,
popover or panel. Not for logic with no visible effect. The visual is frozen (root `CLAUDE.md`): only the
change the request asks for.

## Steps

1. Locate the board: find the UI region in the README matrix (`docs/design/ui-mock/README.md`).
   New region: add it to the matrix with its board, or mark it `exempt` if it has no UI.
2. Change the board on the canvas: `/design` over `https://claude.ai/artifact/YAjnzs8CsEDpSbwpn5CCuJ`
   (Opus, project rule). Follow the README "Contrato de autoria" (token engine copied, never rewritten).
3. Re-export only the changed boards: `Artifact read` of each `project/<board>.dc.html` into
   `docs/design/ui-mock/boards/`, plus `project/canvas.json` into `docs/design/ui-mock/canvas.json`.
4. Update the README Boards table, the matrix row and the canvas positions if a board was added or moved.
5. Implement the code.
6. One commit with boards and code. Run `npx vitest run test/uiMockCoverage.test.js`.

No canvas available: edit the local `boards/*.dc.html` and republish with `/design` (the boards need
the Design type's `./support.js` runtime, which is not stored in the repo).
