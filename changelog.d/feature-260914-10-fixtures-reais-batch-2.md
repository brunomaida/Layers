### Adicionado

- 5 fixtures vendorizados de projetos públicos reais (MIT), mesma extensão do batch 1
  mas casos diferentes — `vcard-portfolio` (.html, página única densa), `pico-css` (.css,
  classless/custom-properties/dark-mode), `slick-carousel` (.js, carousel via snapshot),
  `mobile-select` (.ts, wheel picker sem Shadow DOM), `ecommerce-jsx` (.jsx, React + CSS
  Modules com classname hash) — cada um com `NOTICE.md` (repo, commit, licença, captura/vendor
  desvios).
- `docs/RELEASE-CHECKLIST.md` (checklist E) atualizado com a lista dos 5 fixtures novos.

### Perf

- **N/A** — cold path only (nenhum arquivo tocado está em `path-tiers.json`; o projeto não
  tem esse arquivo, todos os arquivos tratados como cold).
