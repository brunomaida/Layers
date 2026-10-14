### Added
- `e2e/apply-flow.spec.js`: fluxo funcional do checklist E numa pasta real (cópia do `plain-css` no OPFS, `showDirectoryPicker` substituído) — conectar, selecionar `.card`, editar, ver diff, rascunho, aprovar e ler o `style.css` gravado; confere `.bak`, `.design-history/`, ausência de rascunho e `.tmp`; rollback e recusa por mudança externa.
- `e2e/folder-helpers.js`: `connectFixture`, `selectLayer`, `readDisk`, `listDisk`.

### Perf
- N/A — só testes E2E novos; `index.html` e `lib/` intocados, nenhum caminho de execução do app mudou.
