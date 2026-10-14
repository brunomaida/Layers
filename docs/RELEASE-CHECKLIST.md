---
type: guide
solution: Layers
---

# LAYERS — Checklist de release v1

Estados: `[ ]` aberto · `[~]` parcial · `[x]` concluído. Hoje: 31 concluídos, 3 parciais, 13 abertos.

## A. Setup local (visual idêntico)

- [x] `index.html` (CHANGELOG 0.25.0, sem projeto embutido) + `support.js` no repositório.
- [x] Fontes locais: 15 `.woff2` variáveis subsetados por `unicode-range` em `fonts/` + `fonts/fonts.css` gerado (48 blocos `@font-face`), referenciado por `<link>` no `<helmet>`; `<link>` do Google Fonts removido. Espelhos byte-a-byte do `fonts.gstatic.com` — **não** são 8 estáticas por peso, como este item supunha.
- [x] Servir por HTTP (`npm run dev` na 5180) — FS Access e `document.fonts` exigem origem segura.
- [x] Defaults documentados (corrigidos — valem os `data-props`, não o `:root`): tema `Gray · 1 Grafite`, acento `5 · Cinza médio`, seleção `Coral`, `originColors Mono`, `panelHeader B`, `sliderScale 85`, `fontScale 1`.
- [x] Chaves de `localStorage` documentadas e versionadas: `layers/v1/{meta,ui,projects,session}` + `layers/v1/tab` no `sessionStorage`, mapeadas em `docs/ARCHITECTURE.md` § Persistência. `LayersCore.migrateConfig` converte as 3 soltas (`layers-cfg`, `layers-hist`, `layers-inter-size`) e não as apaga — remoção na v2.26.
- [x] `docs/ARCHITECTURE.md` e este checklist na raiz de `docs/`.
- [x] React + ReactDOM UMD versionados em `vendor/`, validados contra o SRI declarado no `support.js`; zero requisições externas verificadas no Chrome (12/12 em `localhost:5180`). Ver `docs/LOCAL-SETUP.md`.

## B. Funcional (bloqueia release)

- [x] Loader de projeto: `layers.json` → mock sanitizado + folhas `.css` reais em shadow root offscreen → `walk()`. Quatro origens numa porta só (`readText`/`readBytes`): pasta local, `.zip`, repositório GitHub público e fixture HTTP.
- [x] Resolução de origem (arquivo/linha) a partir das folhas carregadas, sem depender de `data-src` autoral. Índice por AST (`css-tree`), cobrindo `@media`, `@layer`, nesting e `<style>` embutido no HTML (linha absoluta do arquivo).
- [x] Estados vazios/erro: o painel do palco diz **por que** está vazio — pasta sem `layers.json`, `layers.json` presente mas com JSON inválido (estado distinto de "ausente" desde a auto-criação, ver item abaixo), `mock` não encontrado, `<body>` do mock vazio, mock que rende só a raiz (shell de app → aponta `tools/layers-snapshot.js`) e navegador sem FS Access. Folha de `styles` ausente não esvazia: carrega e avisa.
- [x] Pasta local sem `layers.json`: auto-criação de um manifesto mínimo (`LayersCore.deriveManifest`, heurística portada de `tools/layers-derive.js`) quando a conexão veio de um clique (`useDir(dir, true)`); reconexão sem gesto (`restoreSession`) nunca escreve sozinha — cai no mesmo painel com um botão "Criar layers.json" para o mesmo processo sob clique explícito. `layers.json` existente nunca é sobrescrito (recheque de existência imediatamente antes da gravação).
- [x] Avisar quando um seletor de `interactions` não resolve no mock (`LayersCore.deadInteractions`): a carga acrescenta um aviso com os três primeiros e a superfície sem alvo ganha o rótulo "sem alvo" no menu ⚡ Interagir; `e2e/dead-interactions.spec.js`. Medido no spike da fatia 5: 7 das 8 entradas do Traval apontam para classes que o mock autoral não tem (foram escritas contra o app real), e o menu ⚡ Interagir lista sete ações sem efeito. Ver `docs/superpowers/reports/2026-09-13-spike-superficies-latentes.md` §5.
- [x] Undo/redo global (câmera fora; ajustes de propriedade e código dentro): Ctrl+Z, Ctrl+Shift+Z e Ctrl+Y sobre snapshots de `changes[]` (`LayersCore.inlineDelta`), pilha de 100 passos zerada ao recarregar ou aplicar; `e2e/undo-redo.spec.js`.
- [x] Persistência de `changes` pendentes entre reloads (com aviso ao reabrir): `layers/v1/pending`, validade por hash das fontes (tudo-ou-nada), toast de restaurados/descartados; `e2e/pending-persist.spec.js`.
- [x] Patch em `.css` por recorte de bytes no intervalo da declaração (`patchCssAt`): round-trip validado por teste, formatação e `!important` preservados, `@media` acerta o bloco. Origem TS/JS aparece como "manual" no cabeçalho do painel de propriedades e na lista de Ajustes (S2.15; `e2e/manual-marker.spec.js`).

## C. Consistência de interface

- [x] `alert()` → toast (v2.22).
- [x] Emojis removidos das strings de UI (v2.22).
- [x] Dock: piso de 360 px em telas estreitas (v2.22).
- [ ] Padrão único de abertura de menus (decidir: hover+fixar em todos ou clique em todos).
- [ ] Tooltips "ação · atalho" no dock e na árvore.
- [ ] Uma só fonte de verdade para aparência no desktop (menu Aparência; tweaks do host saem).

## D. Performance

- [x] `contain: layout paint style` e `will-change` só em drag (v2.22).
- [x] Culling: durante o arrasto da câmera, planos com projeção inteira fora do palco ficam `display:none` (`LayersCore.viewCuller`, S4.5; `e2e/viewport-culling.spec.js`). Opacidade < 0,05 descartada como critério: os planos esmaecidos ficam em 0,30/0,35 (v2.7-b), então um limiar útil mudaria o visual.
- [ ] Cache de `getComputedStyle` por nó, invalidado em change.
- [ ] Árvore virtualizada.
- [~] Budget: scan < 300 ms para 1.500 nós; orbit > 50 fps (core: `npm run bench`, histórico em [bench-history](reports/bench-history/bench-history.md); UI: `npx playwright test e2e/perf.spec.js`, S4.4 no [roadmap](roadmap.md)). Medido em 2026-10-13 (Chromium 153, i7-12700): scan sintético de 1.712 tags em ~56 ms (dentro do orçamento); orbit com input real ~42,5 fps no Traval após o culling da S4.5 (23,5 ms/frame, p95 50 ms; antes ~40 fps), abaixo dos 50 fps — orçamento ainda não cumprido (S4.6–S4.7). Travessia do `scan()` já medida no spike da fatia 5 — ~2,5 µs/nó, ~3,8 ms para 1.500 nós, 80× abaixo do orçamento; falta o render do React e o fps do orbit, que precisam de aba em foco.

## E. Testes

Fixtures em `fixtures/`, servidas por HTTP (`#layers=fixtures/<nome>/`): Traval (mock autoral + 4 `.css` reais), Axai (HTML estático), MarketView (arquivo único com `<style>` inline), Results (pendente de snapshot), `app-shell` (`<div id="app">` vazio), `plain-css` (shorthand, `!important`, `@media`, `[data-x="body"]`, `:root` dentro de string), `nested-oklch` (nesting + `oklch` + `color-mix`), `tailwind` (falha explícita esperada).

Cinco fixtures vendorizados de projetos públicos reais (MIT, `NOTICE.md` por pasta com repo/commit/licença — não sintéticos, cobrem `.html`/`.css`/`.js`/`.ts`/`.jsx`): `student-dashboard` (HTML estático multi-página, vendor direto, de ADi7YA26/Student-Dashboard), `plain-admin` (CSS real multi-arquivo + `@font-face` de ícone, vendor direto, de PlainAdmin/plain-free-bootstrap-admin-template), `choices-js` (widget JS interativo, snapshot com dropdown aberto/`aria-expanded`, de Choices-js/Choices), `todomvc-react` (JSX, snapshot da demo ao vivo com 3 todos reais, `root.src` referencia `src/app.jsx`, de tastejs/todomvc), `coffee-masters` (TS + Custom Elements com Shadow DOM, snapshot local com o shadow root de `<app-home>` desmontado manualmente — achado: `tools/layers-snapshot.js` não atravessa shadow roots, ver `fixtures/coffee-masters/NOTICE.md`).

Cinco fixtures vendorizados de projetos públicos reais (MIT), lote 2, mesma extensão do batch 1 mas casos diferentes (`.html`/`.css`/`.js`/`.ts`/`.jsx`): `vcard-portfolio` (página única densa, HTML estático com sidebar/formulário/layout, vendor direto, de codewithsadee/vcard-personal-portfolio), `pico-css` (classless + dark-mode + custom-properties, vendor separado de demo HTML + CSS minificado, de picocss/examples + picocss/pico), `slick-carousel` (carousel via snapshot do DOM renderizado, JS snapshot do exemplo básico, de kenwheeler/slick), `mobile-select` (TS app em light DOM sem Shadow DOM, snapshot da demo ao vivo + referência `.ts` pura, de onlyhom/mobile-select — contraste com coffee-masters Custom Elements), `ecommerce-jsx` (React + CSS Modules com classname hash, snapshot hand-assembled da seção hero+flash-sales, vendor da demo ao vivo, de Moamal-2000/e-commerce).

- [x] Snapshot da árvore de nós por fixture (contagem, profundidade máxima, nós com `src`, arquivos de origem e caixa da raiz): `e2e/tree-snapshot.spec.js` contra `e2e/__snapshots__/tree.json` (16 fixtures; `results` fica de fora, pendente de snapshot). Regenerar com `UPDATE_SNAPSHOT=1 npx playwright test e2e/tree-snapshot.spec.js`. Gate manual (E2E).
- [x] Origem: para até 30 nós amostrados por fixture, `src` aponta para arquivo/linha que mostra o seletor (`e2e/origin-sample.spec.js`, 16 fixtures; gate manual). `data-src` autoral obsoleto é corrigido pela linha atual da regra ou descartado pelo loader (S2.20: no Traval, 10 corrigidos e 21 descartados de 199); 19 nós apontam para `.ts` do app real, não vendorizado, e ficam como manual.
- [x] `patchCssAt`: round-trip preserva formatação; casos com shorthand (`padding`, `font`, `border`), `!important`, regra inexistente (append), regra dentro de `@media`.
- [x] Escopo "todos iguais": afeta todos os usos e nenhum outro (`e2e/scope-all-equal.spec.js`, via UI no `axai`: `.sum-stat` com 6 usos; contraste "Só este" = 1 elemento). Gate manual (E2E).
- [x] `lineDiff` (`LayersCore.lineDiff`): contexto de 3 linhas, sem alterações, arquivo novo — 6 casos em `test/layers-core.test.js`.
- [x] E2E funcional (Playwright): conectar pasta → selecionar → editar → ver diff → aplicar → arquivo alterado, numa cópia real do `plain-css` no OPFS (`e2e/apply-flow.spec.js`, helper `e2e/folder-helpers.js`); confere `.bak`, histórico e ausência de rascunho/`.tmp`, mais rollback e sua recusa. Gate manual (E2E): `npm run test:e2e`.
- [ ] Compatibilidade: Chrome/Edge completos; Firefox/Safari em somente leitura com mensagem.

## F. Segurança

- [x] FS Access: `pickDir` e `openHist` pedem `mode: 'read'`; `ensureWrite()` escala para `readwrite` no topo de `writeText`, sempre como consequência de um clique — inclui a auto-criação de `layers.json` (que roda `ensureWrite()` antes de qualquer varredura, no mesmo fluxo de clique de `pickDir`/`openHist`) e o botão "Criar layers.json" do painel de erro.
- [x] `LayersCore.safePath` recusa vazio, `/` inicial, `C:`, esquema de URL e segmento `.`/`..`; aplicado em `writeInto`, `fileHandle`, `dirOf`, em `readBytes` e em cada entrada de `.zip` — o vetor real de travessia.
- [x] Gravação atômica: `.tmp` + `handle.move()` (presente no Chrome 152), com escrita direta como fallback; `.bak` da primeira versão da sessão.
- [x] `lastModified` é registrado na leitura e conferido antes de gravar; divergência recusa a escrita nomeando o arquivo.
- [x] Sanitizar o mock do projeto: `script`/`link`/`iframe`/`object`/`embed`/`base`/`meta`/`noscript`/`template`, atributos `on*`, URLs `javascript:` e todo atributo com URL remota (`src`/`srcset`/`poster`/`data`/`href`/`xlink:href`; `data:` e `blob:` passam); `url(http…)` no CSS vira `url(about:blank)` com aviso. `<use href>` só aceita fragmento.
- [x] Não aplicável desde a v2.24: não há iframe. O mock vive num shadow root do próprio documento e nenhum script do projeto é executado — o isolamento vem da sanitização (item acima), não de `sandbox=`.
- [x] Sem chamadas de rede em runtime, incluindo as fontes que o projeto carregado pede: `fonts/projects.css` versiona Newsreader e Geist, `@font-face` do projeto sobe para o documento com `blob:`, e a meta CSP (`default-src 'self'`, `connect-src` só com a allowlist do GitHub) é a guarda. Medido com os 4 projetos: 18/18 requisições em `localhost:5180`, zero externas.
- [x] `localStorage` só com preferências de UI, histórico de projetos e ponteiros de sessão; o handle da pasta fica no IndexedDB `layers-hist` e conteúdo de arquivo não sai do disco.
- [x] Log de gravações: `layers-export.log` sai na exportação com cabeçalho de versão (`v2`), caminho, timestamp, tamanho antes/depois em bytes UTF-8, SHA-256 do conteúdo antes e depois e se houve `.bak` (`LayersCore.contentHash`/`writeLogText`; `e2e/write-log-hash.spec.js`).
- [x] Dependências de dev fixadas (`package-lock.json`, lockfileVersion 3) e auditadas: `npm audit` reporta 0 vulnerabilidades. Requer npm 11+.

## G. Documentação de release

- [ ] `README.md`: o que é, requisitos (Chrome/Edge), como rodar, como conectar um projeto.
- [x] `CHANGELOG.md` com entradas por versão (padrão `changelog.d/` do Traval).
- [ ] Matriz de suporte: navegadores × funcionalidades (leitura, edição, gravação).
- [ ] Atalhos e interações (exportar o conteúdo do painel `?` para `docs/shortcuts.md`).
