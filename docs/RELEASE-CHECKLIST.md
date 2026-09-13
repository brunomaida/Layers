---
type: checklist
status: active
solution: Layers
---

# LAYERS — Checklist de release v1

Estados: `[ ]` aberto · `[~]` parcial · `[x]` concluído. Hoje: 17 concluídos, 2 parciais, 26 abertos.

## A. Setup local (visual idêntico)

- [x] `index.html` (v2.24, sem projeto embutido) + `support.js` no repositório.
- [x] Fontes locais: 15 `.woff2` variáveis subsetados por `unicode-range` em `fonts/` + `fonts/fonts.css` gerado (48 blocos `@font-face`), referenciado por `<link>` no `<helmet>`; `<link>` do Google Fonts removido. Espelhos byte-a-byte do `fonts.gstatic.com` — **não** são 8 estáticas por peso, como este item supunha.
- [x] Servir por HTTP (`npm run dev` na 5180) — FS Access e `document.fonts` exigem origem segura.
- [x] Defaults documentados (corrigidos — valem os `data-props`, não o `:root`): tema `Gray · 1 Grafite`, acento `5 · Cinza médio`, seleção `Coral`, `originColors Mono`, `panelHeader B`, `sliderScale 85`, `fontScale 1`.
- [ ] Chaves de `localStorage` documentadas e versionadas (prefixo `layers/v1/`). Hoje são 3 soltas: `layers-cfg`, `layers-hist`, `layers-inter-size`.
- [x] `docs/ARCHITECTURE.md` e este checklist na raiz de `docs/`.
- [x] React + ReactDOM UMD versionados em `vendor/`, validados contra o SRI declarado no `support.js`; zero requisições externas verificadas no Chrome (12/12 em `localhost:5180`). Ver `docs/LOCAL-SETUP.md`.

## B. Funcional (bloqueia release)

- [~] Loader de projeto: `layers.json` → mock sanitizado + folhas `.css` reais em shadow root offscreen → `walk()`. Entregue na v2.24 (`loadProject`, `docs/layers-json.md`). Falta ingestão de `.zip` e de repositório GitHub público.
- [x] Resolução de origem (arquivo/linha) a partir das folhas carregadas, sem depender de `data-src` autoral. Índice por AST (`css-tree`), cobrindo `@media`, `@layer`, nesting e `<style>` embutido no HTML (linha absoluta do arquivo).
- [x] Estados vazios/erro: o painel do palco diz **por que** está vazio — pasta sem `layers.json`, `mock` não encontrado, `<body>` do mock vazio, mock que rende só a raiz (shell de app → aponta `tools/layers-snapshot.js`) e navegador sem FS Access. Folha de `styles` ausente não esvazia: carrega e avisa.
- [ ] Undo/redo global (câmera fora; ajustes de propriedade e código dentro).
- [ ] Persistência de `changes` pendentes entre reloads (com aviso ao reabrir).
- [~] Patch em `.css` por recorte de bytes no intervalo da declaração (`patchCssAt`): round-trip validado por teste, formatação e `!important` preservados, `@media` acerta o bloco. Falta marcar TS/JS explicitamente como "manual" na interface.

## C. Consistência de interface

- [x] `alert()` → toast (v2.22).
- [x] Emojis removidos das strings de UI (v2.22).
- [x] Dock: piso de 360 px em telas estreitas (v2.22).
- [ ] Padrão único de abertura de menus (decidir: hover+fixar em todos ou clique em todos).
- [ ] Tooltips "ação · atalho" no dock e na árvore.
- [ ] Uma só fonte de verdade para aparência no desktop (menu Aparência; tweaks do host saem).

## D. Performance

- [x] `contain: layout paint style` e `will-change` só em drag (v2.22).
- [ ] Culling: pular planos fora do viewport e com opacidade < 0,05.
- [ ] Cache de `getComputedStyle` por nó, invalidado em change.
- [ ] Árvore virtualizada.
- [ ] Budget: scan < 300 ms para 1.500 nós; orbit > 50 fps (medir com os `bench/` no padrão do Traval).

## E. Testes

Fixtures em `fixtures/`, servidas por HTTP (`#layers=fixtures/<nome>/`): Traval (mock autoral + 4 `.css` reais), Axai (HTML estático), MarketView (arquivo único com `<style>` inline), Results (pendente de snapshot), `app-shell` (`<div id="app">` vazio), `plain-css` (shorthand, `!important`, `@media`, `[data-x="body"]`, `:root` dentro de string), `nested-oklch` (nesting + `oklch` + `color-mix`), `tailwind` (falha explícita esperada).

- [ ] Snapshot da árvore de nós por fixture (contagem, profundidade, bbox, `src`).
- [ ] Origem: para 30 nós amostrados por fixture, `src` aponta para arquivo/linha que contém o seletor.
- [x] `patchCssAt`: round-trip preserva formatação; casos com shorthand (`padding`, `font`, `border`), `!important`, regra inexistente (append), regra dentro de `@media`.
- [ ] Escopo "todos iguais": afeta todos os usos e nenhum outro.
- [ ] `lineDiff`: contexto de 3 linhas, sem alterações, arquivo novo.
- [ ] E2E (Playwright): conectar pasta → selecionar → editar → ver diff → aplicar → arquivo alterado.
- [ ] Compatibilidade: Chrome/Edge completos; Firefox/Safari em somente leitura com mensagem.

## F. Segurança

- [ ] FS Access: pedir `mode: 'read'` ao conectar; escalar para `readwrite` só no momento de aplicar/exportar.
- [ ] Nunca gravar fora da pasta conectada; rejeitar caminhos com `..` ou absolutos em `writeInto`.
- [ ] Gravação atômica: escrever `arquivo.tmp` → renomear; manter `.bak` da primeira versão da sessão.
- [ ] Confirmar antes de sobrescrever arquivo modificado fora do LAYERS (comparar `lastModified` lido × atual).
- [x] Sanitizar o mock do projeto: `script`/`link`/`iframe`/`object`/`embed`/`base`/`meta`/`noscript`/`template`, atributos `on*`, URLs `javascript:` e todo atributo com URL remota (`src`/`srcset`/`poster`/`data`/`href`/`xlink:href`; `data:` e `blob:` passam); `url(http…)` no CSS vira `url(about:blank)` com aviso. `<use href>` só aceita fragmento.
- [x] Não aplicável desde a v2.24: não há iframe. O mock vive num shadow root do próprio documento e nenhum script do projeto é executado — o isolamento vem da sanitização (item acima), não de `sandbox=`.
- [x] Sem chamadas de rede em runtime, incluindo as fontes que o projeto carregado pede: `fonts/projects.css` versiona Newsreader e Geist, `@font-face` do projeto sobe para o documento com `blob:`, e a meta CSP (`default-src 'self'`, `connect-src` só com a allowlist do GitHub) é a guarda. Medido com os 4 projetos: 18/18 requisições em `localhost:5180`, zero externas.
- [ ] `localStorage` só com preferências de UI; nunca conteúdo de arquivos ou handles.
- [ ] Log de gravações (`layers-export.log`) com caminho, hash antes/depois e timestamp.
- [x] Dependências de dev fixadas (`package-lock.json`, lockfileVersion 3) e auditadas: `npm audit` reporta 0 vulnerabilidades. Requer npm 11+.

## G. Documentação de release

- [ ] `README.md`: o que é, requisitos (Chrome/Edge), como rodar, como conectar um projeto.
- [ ] `CHANGELOG.md` com entradas por versão (padrão `changelog.d/` do Traval).
- [ ] Matriz de suporte: navegadores × funcionalidades (leitura, edição, gravação).
- [ ] Atalhos e interações (exportar o conteúdo do painel `?` para `docs/shortcuts.md`).
