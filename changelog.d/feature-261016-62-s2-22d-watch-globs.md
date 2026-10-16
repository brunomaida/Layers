---
adr: none
---

### Added
- `layers.json › watch`: globs de fontes TS/JS (`src/ui/**/*.ts`, relativos à raiz da pasta) entram na deriva do layout. Editar um arquivo que casa o glob depois do mock mostra o banner "Mock mais antigo que a fonte", inclusive em mock de snapshot sem `data-src`. Até 20 globs (200 caracteres e 8 curingas cada), 5000 entradas varridas, 8 níveis de pasta e 50 arquivos observados; o excedente vira um toast.

### Perf
- N/A — a varredura roda uma vez por carga, em segundo plano, só nas pastas que algum glob alcança e com teto de 5000 entradas e 50 arquivos; sem `watch` nada muda.
