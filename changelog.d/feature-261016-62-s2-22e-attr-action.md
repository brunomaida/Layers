---
adr: none
---

### Added
- `layers.json › interactions`: ação `attr: {selector, name, value, off?}` alterna `data-*`/`aria-*` no mock (ex.: `data-dock`, `data-collapsed`, `aria-expanded`), então o CSS que reage a atributo pode ser visto e editado sem script. Outros nomes (`on*`, `style`, `class`, `href`) são recusados, o chip fica informativo com `title` "attr inválido" e um seletor sem alvo entra no aviso de interações mortas.

### Perf
- N/A — a ação roda só no clique do chip, sobre os elementos que casam o seletor; sem `attr` declarado nada muda na carga.
