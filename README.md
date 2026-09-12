# LAYERS

Editor visual de camadas para projetos web. Mostra o DOM de um app como planos em profundidade e permite ajustar CSS com gravação de volta nos arquivos.

## Requisitos
- Chrome ou Edge (File System Access API). Firefox/Safari: somente leitura.
- Node 20+ (só para servir e testar).

## Rodar
```
npm install
npm run dev        # http://localhost:5180
```
Não abrir via file:// — FS Access e fontes exigem origem HTTP.
Requer npm 11+ (o 10.9.2 quebra ao resolver os peers do Vitest 4).

## Estrutura
- index.html — o editor (v2.22)
- support.js — runtime gerado (não editar)
- vendor/ — React + ReactDOM UMD versionados (sem CDN)
- fonts/ — 15 .woff2 + fonts.css gerado (ver fonts/README.md)
- scripts/vendor-assets.py — regenera fonts/ e vendor/
- docs/LOCAL-SETUP.md — rodar local com visual idêntico
- docs/ARCHITECTURE.md — arquitetura e fluxo de dados
- docs/RELEASE-CHECKLIST.md — pendências para a v1 (funcional, testes, segurança)
- docs/text-specs/layers-specs.md — histórico de requisitos v2.0 → v2.21
- CLAUDE.md — instruções para o Claude Code

## Preferências persistidas (localStorage)
- traval-layer-editor-cfg — tema, cor de seleção, cores de origem, cabeçalho, escala de fonte
- traval-layer-editor-inter-size — tamanho do menu INTERAGIR

## Defaults visuais
Sem localStorage valem os `data-props` do index.html (os literais do `:root` são
placeholders pré-`applyTheme()`):

Tema **Gray · 1 Grafite** · acento **5 · Cinza médio** · seleção **Coral** ·
cores de origem Mono · cabeçalho B · sliderScale 85 · fontScale 1

## Sem rede
Todo recurso de runtime está no repositório — fontes e React inclusos. O app não faz
nenhuma requisição externa. Detalhes e como verificar: docs/LOCAL-SETUP.md.
