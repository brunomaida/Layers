---
adr: none
---

### Fixed
- Variáveis `--*` do `<html>` do snapshot passam por allowlist de valor (funções de cor, `var`, `calc` e similares; `image-set(`, `/*` e aspas abertas saem) e os nomes `data-*` só aceitam `[a-z0-9_.-]`.
- O snapshot não copia mais os atributos `on*` do `<html>` e limita o total de canvases congelados a 4 M caracteres.
- Em mock de snapshot, `root.name`/`root.src` ficam no L0 quando ele mesmo casa o seletor; o sufixo `· snapshot` entra depois de `rules`, então um body com vários filhos continua renomeável por elas.
- A captura (URL, data, viewport) do tooltip de L0 é lida até o `-->`, mesmo com URL de mais de 1000 caracteres.

### Perf
- N/A — só valida atributos na carga e soma o tamanho dos canvases no momento do snapshot; fora de qualquer caminho quente do editor.
