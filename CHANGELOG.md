# Changelog

## Não lançado
- Recarregar projeto (#17): tecla `R` ou `Projetos ▾ › Recarregar projeto` relê a pasta local sem perder câmera nem seleção,
  com confirmação se houver edições não salvas. Ao focar a janela, um aviso indica quando `layers.json`, o mock, o CSS
  ou o `dcSource` mudaram no disco. Ver `changelog.d/feature-260920-17-project-reload.md`.
- Repositório git criado (brunomaida/Layers, privado; master + develop).
- Recursos de runtime versionados: 15 .woff2 em fonts/ e React UMD em vendor/. O app
  não faz mais nenhuma requisição externa.
- fonts/fonts.css e fonts/README.md corrigidos: são 15 fontes variáveis subsetadas por
  unicode-range, não 8 estáticas por peso.
- Defaults visuais corrigidos no README e no CLAUDE.md: valem os data-props
  (Gray · 1 Grafite / 5 · Cinza médio / Coral), não os literais do :root.
- docs/LOCAL-SETUP.md, scripts/vendor-assets.py e hook pre-push.
- layers-specs.md movido para docs/text-specs/; layers-start-kit-desktop.zip removido.

## 0.25.0 — 2026-09-16
Novas ferramentas: Medir (redlines entre elementos), Box Model (margin/border/padding com sync no palco) e Tokens (variáveis CSS resolvidas com arquivo/linha, via AST em lib/layers-core.js).
Menu de projeto: Exemplos + "Zerar interface".
Botão Medir padronizado (ícone + texto, borda/texto em selectColor quando ativo), no mesmo padrão de Explodido/Foco.

## 0.24.0 — 2026-09-12
- LAYERS baseline: editor sem projeto embutido. Mock do Traval removido; palco, árvore e
  Propriedades com estados vazios até conectar uma pasta.
- Loader `layers.json` (mock HTML + CSS reais em shadow root, sanitizado; `viewport`, `rules`,
  `interactions`). Menu ⚡ Interagir passa a vir do manifesto do projeto.
- `data-src` automático a partir das folhas carregadas; modo fixture `#layers=` para testes;
  fixtures de Traval / Axai / MarketView / Results; `tools/layers-snapshot.js` para apps JS.
- localStorage migrado para `layers-*`. Docs: `docs/layers-json.md`, `docs/layers-requisitos.md`.

## 0.23.0 — 2026-09-12
- Painel superior: dropdown "Projetos recentes" no lugar do botão de pasta. Pastas locais
  reconectam pelo handle guardado no IndexedDB (pede permissão do navegador); repositórios
  GitHub entram só como registro por URL, até o loader (checklist B).
- Itens com origem, último uso, fixar (não expira) e remover; rodapé com conectar pasta,
  registrar repo e limpar histórico (mantém fixados). Limite via tweak histMax (padrão 10).
- Cabeçalho sobe de z-index enquanto um menu seu está aberto, para não ficar sob o dock.

## 0.22.0 — 2026-09-12
- alert() substituído por toast; emojis removidos das strings de UI.
- Planos com contain:layout paint; will-change só durante o drag.
- Dock: largura mínima de 360 px em telas estreitas.
- docs/ARCHITECTURE.md e docs/RELEASE-CHECKLIST.md.

## 0.21.0
- INTERAGIR redimensionável (largura, altura, divisor) com persistência.
- Dropdowns customizados em toda a interface; dock com ancoragem dinâmica.


