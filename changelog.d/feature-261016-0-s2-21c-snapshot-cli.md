---
adr: none
---

### Added
- `tools/layers-snapshot-cli.mjs`: regenera o `layers/mock.html` de um app que já está rodando, sem colar nada no console. `node tools/layers-snapshot-cli.mjs <url-do-app> <pasta>/layers/mock.html [--viewport 1280x760] [--wait 2500]` abre o app num Chromium headless separado, roda o mesmo `tools/layers-snapshot.js` e grava o mock. Só aceita `http:` em loopback e recusa a porta 5180 do editor. Depois, "Reanalisar do 0" no Layers guarda o layout atual e mostra a UI nova.

### Changed
- O aviso de deriva e os modais de "Reanalisar do 0" apontam para o CLI.

### Perf
- N/A — ferramenta de linha de comando fora do app; nada roda no carregamento nem no orbit.
