---
type: checklist
status: active
solution: Layers
---

# LAYERS — Checklist de release v1

Estados: `[ ]` aberto · `[~]` parcial · `[x]` concluído. Hoje: 10 concluídos, 2 parciais, 33 abertos.

## A. Setup local (visual idêntico)

- [x] `index.html` (= `Traval Layer Editor v2.22.dc.html`) + `support.js` no repositório.
- [x] Fontes locais: 15 `.woff2` variáveis subsetados por `unicode-range` em `fonts/` + `fonts/fonts.css` gerado (48 blocos `@font-face`), referenciado por `<link>` no `<helmet>`; `<link>` do Google Fonts removido. Espelhos byte-a-byte do `fonts.gstatic.com` — **não** são 8 estáticas por peso, como este item supunha.
- [x] Servir por HTTP (`npm run dev` na 5180) — FS Access e `document.fonts` exigem origem segura.
- [x] Defaults documentados (corrigidos — valem os `data-props`, não o `:root`): tema `Gray · 1 Grafite`, acento `5 · Cinza médio`, seleção `Coral`, `originColors Mono`, `panelHeader B`, `sliderScale 85`, `fontScale 1`.
- [ ] Chaves de `localStorage` documentadas e versionadas (prefixo `layers/v1/`).
- [x] `docs/ARCHITECTURE.md` e este checklist na raiz de `docs/`.
- [x] React + ReactDOM UMD versionados em `vendor/`, validados contra o SRI declarado no `support.js`; zero requisições externas verificadas no Chrome (12/12 em `localhost:5180`). Ver `docs/LOCAL-SETUP.md`.

## B. Funcional (bloqueia release)

- [ ] Loader de projeto: iframe + `walk()` no documento do app alvo.
- [ ] Resolução de origem via CSSOM + `css-tree` (arquivo/linha) sem depender de `data-src`.
- [ ] Estados vazios/erro: pasta sem CSS, app não carrega, iframe cross-origin, navegador sem FS Access (modo somente leitura).
- [ ] Undo/redo global (câmera fora; ajustes de propriedade e código dentro).
- [ ] Persistência de `changes` pendentes entre reloads (com aviso ao reabrir).
- [ ] Patch em `.css` com round-trip validado; TS/JS marcado explicitamente como "manual".

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

Fixtures em `test/fixtures/`: Traval (Vite + TS), React/Vite, Vue, HTML/CSS puro, Tailwind (falha explícita esperada).

- [ ] Snapshot da árvore de nós por fixture (contagem, profundidade, bbox, `src`).
- [ ] Origem: para 30 nós amostrados por fixture, `src` aponta para arquivo/linha que contém o seletor.
- [ ] `patchCss`: round-trip preserva formatação; casos com shorthand (`padding`, `font`, `border`), `!important`, regra inexistente (append).
- [ ] Escopo "todos iguais": afeta todos os usos e nenhum outro.
- [ ] `lineDiff`: contexto de 3 linhas, sem alterações, arquivo novo.
- [ ] E2E (Playwright): conectar pasta → selecionar → editar → ver diff → aplicar → arquivo alterado.
- [ ] Compatibilidade: Chrome/Edge completos; Firefox/Safari em somente leitura com mensagem.

## F. Segurança

- [ ] FS Access: pedir `mode: 'read'` ao conectar; escalar para `readwrite` só no momento de aplicar/exportar.
- [ ] Nunca gravar fora da pasta conectada; rejeitar caminhos com `..` ou absolutos em `writeInto`.
- [ ] Gravação atômica: escrever `arquivo.tmp` → renomear; manter `.bak` da primeira versão da sessão.
- [ ] Confirmar antes de sobrescrever arquivo modificado fora do LAYERS (comparar `lastModified` lido × atual).
- [ ] `dangerouslySetInnerHTML` (SVG dos planos): sanitizar SVG vindo do app alvo (remover `<script>`, `on*`, `href="javascript:"`).
- [ ] Iframe do app alvo com `sandbox="allow-scripts allow-same-origin"` mínimo necessário; sem `allow-top-navigation`.
- [~] Sem chamadas de rede em runtime: fontes e React locais, verificado 12/12 em `localhost:5180`. Falta o header CSP `default-src 'self'`.
- [ ] `localStorage` só com preferências de UI; nunca conteúdo de arquivos ou handles.
- [ ] Log de gravações (`layers-export.log`) com caminho, hash antes/depois e timestamp.
- [~] Dependências de dev fixadas: `package-lock.json` gerado e commitado. Falta `npm audit` (bloqueado pelo bug de peer-deps do npm 10.9.2 — ver `docs/LOCAL-SETUP.md`).

## G. Documentação de release

- [ ] `README.md`: o que é, requisitos (Chrome/Edge), como rodar, como conectar um projeto.
- [ ] `CHANGELOG.md` com entradas por versão (padrão `changelog.d/` do Traval).
- [ ] Matriz de suporte: navegadores × funcionalidades (leitura, edição, gravação).
- [ ] Atalhos e interações (exportar o conteúdo do painel `?` para `docs/shortcuts.md`).
