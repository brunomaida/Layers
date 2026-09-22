### docs/260921-5-doc-sync — 2026-09-21

#### Changed
- Docs alinhados ao código: `docs/TOPOLOGY.md` passa a listar `lib/layers-core.js`, `vendor/csstree.js`, `tools/`, `test/`, `fixtures/` e `vite.config.js`; `CLAUDE.md` e `README.md` descrevem os testes unitários e a estrutura atual; `docs/ARCHITECTURE.md` aponta para `index.html` (a referência antiga a um `.dc.html` inexistente saiu).
- Frontmatter: `type` e `status` no vocabulário canônico (`adr`, `reference`, `guide`); `docs/_index.md` regenerado; frontmatter adicionado a `docs/layers-requisitos.md` e `fonts/README.md`.
- `docs/architecture-decisions.md`: entrada de 2026-09-13 reordenada (mais nova em cima).
- Fragmentos de 0.23.0, 0.24.0 e 0.25.0 movidos para `changelog.d/archived/<versão>/`.
- Correção de revisão: rótulo `v2.24b` (circular — só existia em nome de branch e diretório de archive desta mesma branch) removido de `CLAUDE.md`, `docs/ARCHITECTURE.md`, `README.md` e `docs/RELEASE-CHECKLIST.md`; as quatro docs agora citam só `CHANGELOG 0.25.0`. `docs/TOPOLOGY.md`: a coluna "Origem" de `vendor/csstree.js` passa a citar `scripts/vendor-assets.py (pinned by hash)` em vez do local de uso (`index.html:14`), igual às linhas irmãs de `vendor/`. `CLAUDE.md`: tamanho de `index.html` corrigido de `~246 KB` para `~305 KB` (contagem real de bytes).

#### Perf
- **N/A** — mudança somente de documentação; nenhum código de runtime ou caminho quente tocado.
