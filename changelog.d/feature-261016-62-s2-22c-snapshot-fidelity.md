---
adr: none
---

### Added
- O snapshot copia os atributos do `<html>` (`data-theme`, `lang`, `dir` e variáveis `--*` do `style`) e o loader os aplica ao host do shadow root por allowlist: o mock claro do Traval abre claro. Variáveis com `url(`, `expression`, `@import` ou caracteres de bloco são descartadas.
- O snapshot troca cada `<canvas>` por `<img data:image/png>` (até 4 Mpx e 1,5 M caracteres por canvas; acima disso o canvas fica vazio). A linha da árvore mostra o selo `IMG` e o tooltip "Imagem congelada".
- L0 de um mock de snapshot leva o rótulo `<nome> · snapshot`, com URL, data e viewport da captura no tooltip.

### Fixed
- `:root[data-theme='light']` e `html[…]` viravam `:host[data-theme='light']`, que nunca casa no shadow root; agora viram `:host([data-theme='light'])`.
- `root.name` e `root.src` do `layers.json` passam para o descendente que casa o seletor em mock de snapshot, em vez de rotular o L0 e o `.shell` com o mesmo nome.

### Perf
- N/A — a carga faz um filtro de atributos do `<html>` e um prefixo de rótulo; o custo extra do snapshot é a codificação PNG dos canvases, limitada por teto, fora de qualquer caminho quente do editor.
