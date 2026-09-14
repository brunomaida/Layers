### Adicionado

- 5 fixtures vendorizados de projetos públicos reais (MIT), mesma extensão do batch 1
  mas casos diferentes — `vcard-portfolio` (.html, página única densa), `pico-css` (.css,
  classless/custom-properties/dark-mode), `slick-carousel` (.js, carousel via snapshot),
  `mobile-select` (.ts, wheel picker sem Shadow DOM), `ecommerce-jsx` (.jsx, React + CSS
  Modules com classname hash) — cada um com `NOTICE.md` (repo, commit, licença, captura/vendor
  desvios).
- `docs/RELEASE-CHECKLIST.md` (checklist E) atualizado com a lista dos 5 fixtures novos.

### Corrigido

- Revisão final whole-branch (adversarial, tier Opus): `ecommerce-jsx/layers.json` tinha
  `viewport.height` no placeholder do plano (900) nunca corrigido pra altura real do mock
  (medido: 1367px a 1280px de largura); `slick-carousel/layers.json` tinha `viewport.width` 900
  (mostra ~340px do segundo slide) trocado pra 610 (o slide único do exemplo Basic, como a demo
  ao vivo mostra). `NOTICE.md` de `vcard-portfolio`, `pico-css`, `slick-carousel` e
  `ecommerce-jsx` tinham descrições incorretas do mecanismo do loader (iframe removido vs.
  "permanece", `dropRemoteUrls` citado por engano, `<ion-icon>` grafado errado, tamanho de
  arquivo pré-rewrite citado como pós-rewrite, `rules` justificado por um `<body>` multi-filho
  que na verdade tem um filho só) e afirmações que não se sustentam (CSS "resolve todos os
  seletores", claim de `<footer>` inexistente, comparação incorreta com `student-dashboard`) —
  corrigidas para refletir o pipeline real (`index.html:1034-1049`, `lib/layers-core.js`).
  `docs/RELEASE-CHECKLIST.md` descrevia a captura de `mobile-select` como "snapshot local"
  (convenção do parágrafo do batch 1 pra app rodando localmente) quando na verdade veio da demo
  ao vivo do GitHub Pages — corrigido para "snapshot da demo ao vivo".

### Achado registrado

- `mobile-select`: o heurístico de CSS por elemento do loader nunca atribui `data-src` ao nó
  raiz (L0) sozinho — só resolve quando `root`/`rules` aponta pra ele explicitamente; descendentes
  então herdam essa mesma origem (`ms-core.ts`) em vez de resolverem sua própria linha em
  `mobile-select.css`, porque nenhuma regra descendente do arquivo é uma regra top-level (todas
  são compostas sob `.ms-mobile-select`). Achado real do heurístico, não defeito da fixture —
  documentado em `fixtures/mobile-select/NOTICE.md`.
- `ecommerce-jsx`: o filtro de segurança de dados da ferramenta de browser (`javascript_tool`)
  bloqueia `outerHTML`/slices dele quando o markup tem muitos atributos serializados em sequência
  (`href="…" data-discover="true"` repetido) ou coordenadas de `<path d="…">` de SVG inline —
  ambos batem no padrão de blob-de-exfiltração mesmo sendo markup comum. Forçou capturar este
  mock por montagem manual (leituras pequenas e direcionadas) em vez do clone-e-retorna usado nas
  outras fixtures de snapshot — documentado em `fixtures/ecommerce-jsx/NOTICE.md`.

### Perf

- **N/A** — cold path only (nenhum arquivo tocado está em `path-tiers.json`; o projeto não
  tem esse arquivo, todos os arquivos tratados como cold).
