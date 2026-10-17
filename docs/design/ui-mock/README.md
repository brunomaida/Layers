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
- `Main`, `Tema`, `Canvas` e `RotuloL0` são da S2.22c (snapshot). `Base` reproduz a UI atual (larguras de painel reduzidas; logo simplificado); os demais são as propostas da S3.5 e da S9.1.
- Reexporte apenas os boards alterados, mais `canvas.json`.

## Boards

| Arquivo | Título | Região da UI |
|---|---|---|
| Main.dc.html | Visão geral e decisões | Loader · snapshot |
| Tema.dc.html | (a) Tema do html no host | Loader · snapshot |
| Canvas.dc.html | (b) canvas vira imagem congelada | Loader · snapshot |
| RotuloL0.dc.html | (c) Rótulo de L0 | Loader · snapshot |
| Base.dc.html | Base · UI atual do Layers | Dock · Painel de propriedades · Painel Ajustes · Palco 3D |
| S35Menu.dc.html | S3.5 · 1 Menu de contexto | Menus |
| S35Requisicao.dc.html | S3.5 · 2 Requisição em Ajustes | Painel Ajustes |
| S91Cobertura.dc.html | S9.1 · 2 Cobertura, regra e states × layouts | Palco 3D |
| S91Fluxos.dc.html | S9.1 · 1 Três fluxos de múltiplos layouts | Palco 3D · Dock |

## Matriz

| Região da UI | Board |
|---|---|
| Loader · snapshot | Main.dc.html |
| Dock | Base.dc.html |
| Painel de propriedades | Base.dc.html |
| Painel Ajustes | S35Requisicao.dc.html |
| Palco 3D | S91Fluxos.dc.html |
| Menus | S35Menu.dc.html |
| Toasts | exempt |
