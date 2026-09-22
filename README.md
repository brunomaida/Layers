---
title: "LAYERS"
type: readme
solution: layers
created: 2026-09-12
---

# LAYERS

Editor visual de camadas para projetos web. Mostra o DOM de um app como planos em profundidade e permite ajustar CSS com gravação de volta nos arquivos.

## Requisitos
- Chrome ou Edge (File System Access API). Firefox/Safari: somente leitura.
- Node 22.22.2+ ou 24.15.0+ e npm 12+ (só para servir e testar). Verificado em Node 24.19.0 LTS + npm 12.0.2.

## Rodar
Duplo clique em `run.bat`, ou:
```
npm install
npm run dev        # http://localhost:5180
```
`run.bat` instala as dependências se faltarem, avisa se a 5180 já estiver ocupada e
deixa a janela aberta em caso de erro.

Não abrir via file:// — FS Access e fontes exigem origem HTTP.

## Estrutura
- index.html — o editor (CHANGELOG 0.25.0)
- support.js — runtime gerado (não editar)
- lib/layers-core.js — lógica pura do loader (sem DOM/React), carregada pelo index.html
- vendor/ — React + ReactDOM UMD + csstree versionados (sem CDN)
- fonts/ — 15 .woff2 + fonts.css gerado (ver fonts/README.md)
- run.bat — sobe o dev server (duplo clique)
- test/ — testes unitários (Vitest) de lib/layers-core.js: `npm test`
- tools/ — layers-snapshot.js, layers-suggest.js, layers-derive.js (snapshot e spikes do loader)
- fixtures/ — projetos-alvo do loader, servidos por HTTP (`#layers=<pasta>/`)
- vite.config.js — config do dev server (serve fixtures/ sem o wrapper de HMR)
- scripts/vendor-assets.py — regenera fonts/ e vendor/
- docs/LOCAL-SETUP.md — rodar local com visual idêntico
- docs/ARCHITECTURE.md — arquitetura e fluxo de dados
- docs/RELEASE-CHECKLIST.md — pendências para a v1 (funcional, testes, segurança)
- docs/text-specs/layers-specs.md — histórico de requisitos v2.0 → v2.21
- CLAUDE.md — instruções para o Claude Code

## Preferências persistidas (localStorage)
- layers/v1/ui — tema, cor de seleção, cores de origem, cabeçalho, escala de fonte, painéis, navegação, árvore, escopo
- layers/v1/projects — histórico de projetos (pasta, .zip, repositório)
- layers/v1/session — último projeto, seleção e câmera; `layers/v1/tab` (sessionStorage) faz cada aba lembrar do seu projeto
- layers/v1/meta — schema e data da última gravação

Nada de conteúdo de arquivo aqui: o handle da pasta conectada mora no IndexedDB
`layers-hist`. Exportar/importar essas preferências em `layers-config.json` está no
dropdown de projetos.

## Defaults visuais
Sem localStorage valem os `data-props` do index.html (os literais do `:root` são
placeholders pré-`applyTheme()`):

Tema **Gray · 1 Grafite** · acento **5 · Cinza médio** · seleção **Coral** ·
cores de origem Mono · cabeçalho B · sliderScale 85 · fontScale 1

## Sem rede
Todo recurso de runtime está no repositório — fontes e React inclusos. O app não faz
nenhuma requisição externa. Detalhes e como verificar: docs/LOCAL-SETUP.md.
