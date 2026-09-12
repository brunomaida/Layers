# Changelog

## Não lançado
- Repositório git criado (brunomaida/Layers, privado; master + develop).
- Recursos de runtime versionados: 15 .woff2 em fonts/ e React UMD em vendor/. O app
  não faz mais nenhuma requisição externa.
- fonts/fonts.css e fonts/README.md corrigidos: são 15 fontes variáveis subsetadas por
  unicode-range, não 8 estáticas por peso.
- Defaults visuais corrigidos no README e no CLAUDE.md: valem os data-props
  (Gray · 1 Grafite / 5 · Cinza médio / Coral), não os literais do :root.
- docs/LOCAL-SETUP.md, scripts/vendor-assets.py e hook pre-push.
- layers-specs.md movido para docs/text-specs/; layers-start-kit-desktop.zip removido.

## 0.22.0 — 2026-09-12
- alert() substituído por toast; emojis removidos das strings de UI.
- Planos com contain:layout paint; will-change só durante o drag.
- Dock: largura mínima de 360 px em telas estreitas.
- docs/ARCHITECTURE.md e docs/RELEASE-CHECKLIST.md.

## 0.21.0
- INTERAGIR redimensionável (largura, altura, divisor) com persistência.
- Dropdowns customizados em toda a interface; dock com ancoragem dinâmica.
