### docs/260921-5-doc-sync — 2026-09-21

#### Changed
- Docs alinhados ao código: `docs/TOPOLOGY.md` passa a listar `lib/layers-core.js`, `vendor/csstree.js`, `tools/`, `test/`, `fixtures/` e `vite.config.js`; `CLAUDE.md` e `README.md` descrevem os testes unitários e a estrutura atual; `docs/ARCHITECTURE.md` aponta para `index.html` (a referência antiga a um `.dc.html` inexistente saiu).
- Frontmatter: `type` e `status` no vocabulário canônico (`adr`, `reference`, `guide`); `docs/_index.md` regenerado; frontmatter adicionado a `docs/layers-requisitos.md` e `fonts/README.md`.
- `docs/architecture-decisions.md`: entrada de 2026-09-13 reordenada (mais nova em cima).
- Fragmentos de 0.23.0, 0.24.0 e 0.25.0 movidos para `changelog.d/archived/<versão>/`.

#### Perf
- **N/A** — mudança somente de documentação; nenhum código de runtime ou caminho quente tocado.
