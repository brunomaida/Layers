---
title: "Layers — ui-mock local"
type: guide
solution: Layers
status: draft
created: 2026-10-17
---

# Layers — ui-mock local

Cópia versionada dos boards `/design` (Opus) do Layers. O canvas privado `https://claude.ai/artifact/YAjnzs8CsEDpSbwpn5CCuJ` é a fonte editável; este diretório guarda o export para consulta e revisão. Fluxo de manutenção: skill `layers-ui-mock`. Guarda: `test/uiMockCoverage.test.js`.

## Contrato de autoria

- Edite boards só via `/design` sobre o canvas; o runtime `./support.js` do tipo Design não é versionado.
- O motor de tokens do tipo Design é copiado, nunca reescrito.
- Visual congelado: o mock só propõe mudança no que a leaf pede.
- Reexporte apenas os boards alterados, mais `canvas.json`.

## Boards

| Arquivo | Título | Região da UI |
|---|---|---|

## Matriz

| Região da UI | Board |
|---|---|
| Dock | exempt |
| Painel de propriedades | exempt |
| Painel Ajustes | exempt |
| Palco 3D | exempt |
| Menus | exempt |
| Toasts | exempt |
