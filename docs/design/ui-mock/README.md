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
- Os boards podem carregar fontes por `<link>` do Google Fonts (são docs de design, fora da regra de rede do app); `<script src>` externo é proibido pelo teste.
- Os 4 boards atuais são da S2.22c (snapshot). Ainda não há board da UI atual do dock, dos painéis e do palco: entra no design conjunto da S3.5.
- Reexporte apenas os boards alterados, mais `canvas.json`.

## Boards

| Arquivo | Título | Região da UI |
|---|---|---|
| Main.dc.html | Visão geral e decisões | Loader · snapshot |
| Tema.dc.html | (a) Tema do html no host | Loader · snapshot |
| Canvas.dc.html | (b) canvas vira imagem congelada | Loader · snapshot |
| RotuloL0.dc.html | (c) Rótulo de L0 | Loader · snapshot |

## Matriz

| Região da UI | Board |
|---|---|
| Loader · snapshot | Main.dc.html |
| Dock | exempt |
| Painel de propriedades | exempt |
| Painel Ajustes | exempt |
| Palco 3D | exempt |
| Menus | exempt |
| Toasts | exempt |
