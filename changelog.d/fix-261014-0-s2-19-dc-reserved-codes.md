---
adr: none
---

### Removed
- `LayersCore.DC_CODES` perde `UTILITY_SHEET` e `READONLY_ORIGIN`, reservados desde o writer dc e nunca emitidos. As recusas de folha de utilitários e de origem somente leitura seguem pelos toasts de `utilityBlock` e `readOnlyBlock`, com o mesmo texto.
- `mapDcTemplate` não devolve mais `attrNames` por elemento; nenhum código o lia.

### Changed
- A ordem dos avisos de carga passa a ser documentada: os do hoist de `@font-face` vêm depois dos do build (folha de utilitários, mapa dc, `rules`), então um aviso que desabilita gravação ganha de uma fonte do projeto ausente pelo `warn[0]` do toast.

### Perf
- measured — `mapDcTemplate/dc-template/index`: 10895 → 9687 B/op (`bench/alloc.mjs`).
