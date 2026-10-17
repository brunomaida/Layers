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
- Padrão do Layers (referência: `Base.dc.html`): props `tema` (`Gray · 1 Grafite` padrão, `Dark`, `Bright · 1 Papel`) e `selecao` (`Âmbar` padrão do mock, `Coral` padrão do app, `Azul`); tokens `bg0 bg1 bg2 line0 line1 line2 fg0..fg3 acc warn ok err violet stageA shadow shadow2 faint bg0Rgb bg1Rgb accRgb` mais `sel`/`selRgb`, com os valores reais de `THEMES`/`ACCENTS`/`SELECTS` do `index.html` (acento do app: `5 · Cinza médio`, `docs/LOCAL-SETUP.md`).
- Cromo de painel: borda 1px `--line1`, raio 6px, cabeçalho mono em caixa-alta 11px com `letter-spacing:.12em`; fontes Inter e JetBrains Mono.
- Cabeçalho de board: rótulo mono 9px com a leaf (`S3.5 · 1`) e título 16px; boards de 960 ou 1240 de largura (exceção: `Base`, 1440×900, o viewport de referência do app).
- Boards da S2.22c que mostram um app de terceiro (Traval/WAVE) usam o padrão acima no cromo do Layers; o mock do terceiro dentro do quadro mantém as cores dele.
- Os boards podem carregar fontes por `<link>` do Google Fonts (são docs de design, fora da regra de rede do app); `<script src>` externo é proibido pelo teste.
- `Main`, `Tema`, `Canvas` e `RotuloL0` são da S2.22c (snapshot). `Base` reproduz a UI atual a 1440×900 com os padrões do app (seleção `Coral`); os demais são as propostas da S3.5 e da S9.1.
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
| Seletor de layout | S91Fluxos.dc.html |
| Toasts | exempt |
