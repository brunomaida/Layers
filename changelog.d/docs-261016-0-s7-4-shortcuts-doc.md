---
adr: none
---

### Docs

- Novo `docs/shortcuts.md`: as tabelas do painel `?` (geradas de `LayersCore.SHORTCUTS`) e os contextos que o painel não diz: campos de texto, Esc em cascata, Ctrl/Cmd+Enter, `R` com confirmação e menus; as interações de projeto apontam para `docs/layers-json.md`.
- README (Estrutura) aponta para o doc; checklist G "Atalhos e interações" fechado.

### Tests

- `test/shortcuts.test.js`: `npm test` falha se as tabelas de `docs/shortcuts.md` divergirem de `LayersCore.SHORTCUTS` (grupos, linhas e ordem) ou se o item G for marcado sem o link do doc.

### Perf

- N/A — documentação e um teste unitário de consistência; nenhum código de runtime mudou.
