---
adr: none
---

### Added
- Projetos Playwright `chrome`, `msedge`, `firefox` e `webkit` ao lado do `chromium` (que segue rodando toda a suíte): `e2e/browser-compat.spec.js` roda nos cinco — sondas de API em `e2e/__snapshots__/compat-probes.json`, árvore das fixtures igual à do Chromium, carga sem erro e sem requisição externa, edição com diff simulado, repositório GitHub simulado por `page.route` e capturas para revisão visual; `e2e/apply-flow.spec.js` também roda no Chrome e no Edge instalados.
- `docs/LOCAL-SETUP.md`: navegadores exigidos pelo E2E e a trava `/tmp/layers-e2e.lock` que serializa as execuções na porta 5180 compartilhada.

### Fixed
- Sem File System Access (Firefox, Safari), a recusa de rascunho, aprovação e exportação dizia "Conecte a pasta local para gravar.", o que não é possível nesses navegadores; agora diz que o navegador não grava em disco e indica Chrome ou Edge.

### Perf
- N/A — o app só ganha uma escolha de texto por `window.showDirectoryPicker` num toast de recusa (caminho frio, um clique); o resto é teste E2E e configuração do Playwright.
