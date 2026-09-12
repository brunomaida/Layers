# Fontes locais

Os `.woff2` desta pasta **já estão no repositório**. Não há nada para baixar manualmente.

## Por que não baixar do site do autor

Um `.woff2` de [rsms.me/inter](https://rsms.me/inter/) ou do site da JetBrains **não é o
mesmo arquivo** que o Google serve: o build difere em hinting, subsetting e tabelas de
métrica. Trocar um pelo outro muda o ritmo do texto na interface — e o objetivo aqui é
que o visual local seja idêntico ao que o app já renderizava.

Estes arquivos são espelhos byte-a-byte do que `fonts.gstatic.com` entrega para a query
usada pelo `index.html` antes da mudança para fontes locais.

## Formato real

O Google não serve uma fonte estática por peso. Serve **15 arquivos variáveis
subsetados por `unicode-range`** (latin, latin-ext, greek, cyrillic, vietnamese…), e o
mesmo arquivo cobre os pesos 400–700 de uma família. O browser baixa só o subset que a
página realmente usa.

| Família | Arquivos | Pesos declarados |
|---|---|---|
| Inter | 7 subsets | 400, 500, 600, 700 |
| JetBrains Mono | 6 subsets | 400, 500, 700 |
| Michroma | 2 subsets | 400 |

`fonts.css` tem 48 blocos `@font-face` — um por combinação família × peso × subset. É
**gerado**, não editado à mão: os `unicode-range` precisam casar exatamente com a saída
do Google, senão o browser escolhe o subset errado.

## Regenerar

Só ao atualizar uma versão fixada. Rode da raiz do repositório:

```
python scripts/vendor-assets.py
```

Revise o diff depois. Um `.woff2` alterado significa que o Google reemitiu a face, e a
renderização pode mudar — valide visualmente antes de commitar.

Ver também: [../docs/LOCAL-SETUP.md](../docs/LOCAL-SETUP.md) ·
[../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
