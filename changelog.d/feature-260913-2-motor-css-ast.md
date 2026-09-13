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

### Adicionado (fixtures e falha explícita)

- `fixtures/plain-css/` (shorthand, `!important`, `@media`, `[data-x="body"]`, `:root` dentro de
  string), `fixtures/nested-oklch/` (nesting, `oklch`, `color-mix`, `@layer`) e
  `fixtures/tailwind/` (folha de utilitários sintética, 1.263 regras).
- Projeto com folha de utilitários é detectado na carga e a gravação é **recusada com o nome da
  folha**, em vez de gravar um patch numa classe utilitária e mudar o projeto inteiro. A guarda
  é única, no caminho de escrita (`makeDraft` e `approve`).
- A heurística não marca mais por `@layer utilities` sozinho: uma folha autoral pode declarar a
  camada com duas regras, e isso desabilitava Aplicar sem motivo. `@tailwind` continua bastando.

### Verificado nas fixtures

- `nested-oklch`: `.nav-link` aninhado dentro de `.nav` resolve para `style.css|.nav-link|21`,
  `.post-title|35`, `.post-body|36` — linhas conferidas no arquivo. `oklch()` renderiza.
- `plain-css`: `[data-x="body"]` mantém `#777` e `content: ":root html body"` fica intacto —
  os dois casos que a reescrita por regex corrompia. `:root` vira `:host` e `--ink` chega ao host.
- `tailwind`: 1.241 regras parseadas, aviso de folha de utilitários na carga.
