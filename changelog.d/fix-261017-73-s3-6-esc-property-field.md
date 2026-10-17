---
adr: none
---

### Fixed
- Esc num campo de propriedade descarta o valor digitado: o campo volta ao valor anterior, perde o foco e nada entra em Ajustes. Antes o `onBlur` do `blur()` lia o `buf` do render anterior e aplicava o valor. Enter e blur continuam aplicando.
  - Root-cause: #73 · Regression-test: e2e/esc-property-field.spec.js
- Painel `?` e `docs/shortcuts.md`: "Esc (no campo de texto)" diz "descartar a edição e sair do campo".

### Perf
- N/A — um flag de instância lido só no blur de um campo de texto; fora de qualquer caminho quente de render ou de arrasto.
