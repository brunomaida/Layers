### feature/260914-8-fixtures-reais-html-css-js-ts-jsx — 2026-09-14

#### Added
- 5 fixtures vendorizados de projetos públicos reais (MIT), um por extensão pedida — `student-dashboard` (.html), `plain-admin` (.css), `choices-js` (.js), `todomvc-react` (.jsx), `coffee-masters` (.ts) — cada um com `NOTICE.md` (repo, commit, licença).
- `docs/RELEASE-CHECKLIST.md` (checklist E) atualizado com a lista dos 5 novos fixtures.

#### Perf
- **N/A** — cold path only (nenhum arquivo tocado está em `path-tiers.json`; projeto não tem esse arquivo, todos os arquivos tratados como cold).

#### Commits
- `97d2bee` — feat: add student-dashboard fixture (.html slot, vendored from ADi7YA26/Student-Dashboard)
- `5b1d200` — fix: list Cairo and Poppins fonts found in the vendored @import
- `48a6fd8` — feat: add plain-admin fixture (.css slot, vendored from PlainAdmin/plain-free-bootstrap-admin-template)
- `71bf6ad` — feat: add todomvc-react fixture (.jsx slot, vendored from tastejs/todomvc)
- `b048007` — feat: add choices-js fixture (.js slot, vendored from Choices-js/Choices)
- `9c6114d` — feat: add coffee-masters fixture (.ts slot, vendored from flaviodelgrosso/vanilla-typescript-spa)
