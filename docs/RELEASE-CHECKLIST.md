---
type: checklist
status: active
solution: Layers
---

# LAYERS — Checklist de release v1

Estados: `[ ]` aberto · `[~]` parcial · `[x]` concluído. Hoje: 24 concluídos, 3 parciais, 20 abertos.

## A. Setup local (visual idêntico)

- [x] `index.html` (v2.24, sem projeto embutido) + `support.js` no repositório.
- [x] Fontes locais: 15 `.woff2` variáveis subsetados por `unicode-range` em `fonts/` + `fonts/fonts.css` gerado (48 blocos `@font-face`), referenciado por `<link>` no `<helmet>`; `<link>` do Google Fonts removido. Espelhos byte-a-byte do `fonts.gstatic.com` — **não** são 8 estáticas por peso, como este item supunha.
- [x] Servir por HTTP (`npm run dev` na 5180) — FS Access e `document.fonts` exigem origem segura.
- [x] Defaults documentados (corrigidos — valem os `data-props`, não o `:root`): tema `Gray · 1 Grafite`, acento `5 · Cinza médio`, seleção `Coral`, `originColors Mono`, `panelHeader B`, `sliderScale 85`, `fontScale 1`.
- [x] Chaves de `localStorage` documentadas e versionadas: `layers/v1/{meta,ui,projects,session}` + `layers/v1/tab` no `sessionStorage`, mapeadas em `docs/ARCHITECTURE.md` § Persistência. `LayersCore.migrateConfig` converte as 3 soltas (`layers-cfg`, `layers-hist`, `layers-inter-size`) e não as apaga — remoção na v2.26.
- [x] `docs/ARCHITECTURE.md` e este checklist na raiz de `docs/`.
- [x] React + ReactDOM UMD versionados em `vendor/`, validados contra o SRI declarado no `support.js`; zero requisições externas verificadas no Chrome (12/12 em `localhost:5180`). Ver `docs/LOCAL-SETUP.md`.

## B. Funcional (bloqueia release)

- [x] Loader de projeto: `layers.json` → mock sanitizado + folhas `.css` reais em shadow root offscreen → `walk()`. Quatro origens numa porta só (`readText`/`readBytes`): pasta local, `.zip`, repositório GitHub público e fixture HTTP.
- [x] Resolução de origem (arquivo/linha) a partir das folhas carregadas, sem depender de `data-src` autoral. Índice por AST (`css-tree`), cobrindo `@media`, `@layer`, nesting e `<style>` embutido no HTML (linha absoluta do arquivo).
- [x] Estados vazios/erro: o painel do palco diz **por que** está vazio — pasta sem `layers.json`, `mock` não encontrado, `<body>` do mock vazio, mock que rende só a raiz (shell de app → aponta `tools/layers-snapshot.js`) e navegador sem FS Access. Folha de `styles` ausente não esvazia: carrega e avisa.
- [ ] Avisar quando um seletor de `interactions` não resolve no mock. Medido no spike da fatia 5: as 8 entradas do Traval e as do Results apontam para classes que o snapshot não tem, e o menu ⚡ Interagir lista ação que não faz nada. Ver `docs/superpowers/reports/2026-09-13-spike-superficies-latentes.md`.
- [ ] Undo/redo global (câmera fora; ajustes de propriedade e código dentro).
- [ ] Persistência de `changes` pendentes entre reloads (com aviso ao reabrir). A fatia 4 persistiu interface, histórico e sessão (`layers/v1/*`); ajuste pendente continua só em memória, de propósito — gravar edição não aplicada precisa de decisão própria.
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
- [~] Budget: scan < 300 ms para 1.500 nós; orbit > 50 fps (medir com os `bench/` no padrão do Traval). Travessia do `scan()` já medida no spike da fatia 5 — ~2,5 µs/nó, ~3,8 ms para 1.500 nós, 80× abaixo do orçamento; falta o render do React e o fps do orbit, que precisam de aba em foco.

## E. Testes

Fixtures em `fixtures/`, servidas por HTTP (`#layers=fixtures/<nome>/`): Traval (mock autoral + 4 `.css` reais), Axai (HTML estático), MarketView (arquivo único com `<style>` inline), Results (pendente de snapshot), `app-shell` (`<div id="app">` vazio), `plain-css` (shorthand, `!important`, `@media`, `[data-x="body"]`, `:root` dentro de string), `nested-oklch` (nesting + `oklch` + `color-mix`), `tailwind` (falha explícita esperada).

- [ ] `vite.config.js`: o middleware `layers-fixtures-raw` não roda no Vite 8.2.2 — CSS de fixture volta como `text/javascript` e arquivo ausente volta como o `index.html` do editor em vez de 404. Quebra resolução de origem em modo fixture e esconde o estado vazio "mock não encontrado". Medido em `docs/superpowers/reports/2026-09-13-spike-superficies-latentes.md` §9.
- [ ] Snapshot da árvore de nós por fixture (contagem, profundidade, bbox, `src`).
- [ ] Origem: para 30 nós amostrados por fixture, `src` aponta para arquivo/linha que contém o seletor.
- [x] `patchCssAt`: round-trip preserva formatação; casos com shorthand (`padding`, `font`, `border`), `!important`, regra inexistente (append), regra dentro de `@media`.
- [ ] Escopo "todos iguais": afeta todos os usos e nenhum outro.
- [ ] `lineDiff`: contexto de 3 linhas, sem alterações, arquivo novo.
- [ ] E2E (Playwright): conectar pasta → selecionar → editar → ver diff → aplicar → arquivo alterado.
- [ ] Compatibilidade: Chrome/Edge completos; Firefox/Safari em somente leitura com mensagem.

## F. Segurança

- [x] FS Access: `pickDir` e `openHist` pedem `mode: 'read'`; `ensureWrite()` escala para `readwrite` no topo de `writeText`, sempre como consequência de um clique.
- [x] `LayersCore.safePath` recusa vazio, `/` inicial, `C:`, esquema de URL e segmento `.`/`..`; aplicado em `writeInto`, `fileHandle`, `dirOf`, em `readBytes` e em cada entrada de `.zip` — o vetor real de travessia.
- [x] Gravação atômica: `.tmp` + `handle.move()` (presente no Chrome 152), com escrita direta como fallback; `.bak` da primeira versão da sessão.
- [x] `lastModified` é registrado na leitura e conferido antes de gravar; divergência recusa a escrita nomeando o arquivo.
- [x] Sanitizar o mock do projeto: `script`/`link`/`iframe`/`object`/`embed`/`base`/`meta`/`noscript`/`template`, atributos `on*`, URLs `javascript:` e todo atributo com URL remota (`src`/`srcset`/`poster`/`data`/`href`/`xlink:href`; `data:` e `blob:` passam); `url(http…)` no CSS vira `url(about:blank)` com aviso. `<use href>` só aceita fragmento.
- [x] Não aplicável desde a v2.24: não há iframe. O mock vive num shadow root do próprio documento e nenhum script do projeto é executado — o isolamento vem da sanitização (item acima), não de `sandbox=`.
- [x] Sem chamadas de rede em runtime, incluindo as fontes que o projeto carregado pede: `fonts/projects.css` versiona Newsreader e Geist, `@font-face` do projeto sobe para o documento com `blob:`, e a meta CSP (`default-src 'self'`, `connect-src` só com a allowlist do GitHub) é a guarda. Medido com os 4 projetos: 18/18 requisições em `localhost:5180`, zero externas.
- [x] `localStorage` só com preferências de UI, histórico de projetos e ponteiros de sessão; o handle da pasta fica no IndexedDB `layers-hist` e conteúdo de arquivo não sai do disco.
- [~] Log de gravações: `layers-export.log` sai na exportação com caminho, timestamp, tamanho antes/depois e se houve `.bak`. Falta o hash.
- [x] Dependências de dev fixadas (`package-lock.json`, lockfileVersion 3) e auditadas: `npm audit` reporta 0 vulnerabilidades. Requer npm 11+.

## G. Documentação de release

- [ ] `README.md`: o que é, requisitos (Chrome/Edge), como rodar, como conectar um projeto.
- [ ] `CHANGELOG.md` com entradas por versão (padrão `changelog.d/` do Traval).
- [ ] Matriz de suporte: navegadores × funcionalidades (leitura, edição, gravação).
- [ ] Atalhos e interações (exportar o conteúdo do painel `?` para `docs/shortcuts.md`).
