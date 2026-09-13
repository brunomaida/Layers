### Alterado

- O motor de CSS passa a ler por AST (css-tree) em vez de quatro varreduras por expressão
  regular. `lib/layers-core.js` concentra `parseSheet`, `buildIndex`, `ruleText`, `declaredIn`,
  `patchCssAt`, `scopeAst`, `safePath` e `isUtilitySheet` — lógica pura, sem DOM, alcançável
  pelo gate de commit do Vitest.
- O índice de seletores agora enxerga `@media` (guarda o `conditionText`), `@layer` e regra
  aninhada (marca `nested`), que a contagem de chaves descartava. Cada registro carrega os
  offsets da regra e do bloco, então `codeFor` recorta o trecho exato em vez de casar até o
  primeiro `}` — regra com bloco aninhado voltava cortada.
- `patchCssAt` troca o valor por recorte de bytes no intervalo da própria declaração:
  indentação, comentário na mesma linha, `!important` e ordem ficam como o autor escreveu.
  Patch de seletor que existe dentro e fora de `@media` cai na regra base.
- `scopeAst` reescreve seletores no AST. A versão por regex trocava `:root` dentro de string,
  `html` dentro de seletor de atributo e `body` dentro de comentário.
- `@font-face` sai do mesmo passo do escopo, não mais de uma varredura separada.

### Adicionado

- `vendor/csstree.js` (3.2.1), copiado de `node_modules` por `scripts/vendor-assets.py` e
  fixado por SRI próprio — um bump silencioso da dependência não troca o motor de CSS sem
  diff visível. Carregado antes do `support.js`, mesmo padrão do React UMD.
- 37 testes unitários em `test/layers-core.test.js`.

### Corrigido

- CSS embutido em `<style>` no HTML agora gera `data-src` com a linha absoluta do arquivo. O
  MarketView tinha 0 elementos com origem; passou a 17, apontando `index.html|.seg|109` e
  `index.html|.pill|59` — linhas conferidas no arquivo.

### Perf

measured — troca comportamentalmente neutra nos alvos que já funcionavam, e o parser custa
menos que a varredura anterior por não precisar zerar comentários antes de contar chaves.

- Traval: 414 elementos · 11 camadas · 258 regras · 199 com `data-src` — idênticos byte a byte
  aos do índice anterior, incluindo os valores de `arquivo|seletor|linha`.
- Axaí: 60 · 7 · 173 · 51 com `data-src`, inalterado.
- MarketView: 46 · 6 · 188 regras; origem de 0 → 17 elementos.
- Oráculo de regressão: 128/128 chaves idênticas no Traval e 78/78 no Axaí entre o índice
  antigo e o novo, antes de trocar o call site.
- `index.html` 246.471 → 250.712 bytes; as quatro funções por regex saíram e a fiação do AST
  entrou.
