### Adicionado

- Ingestão de `.zip`: leitor pelo diretório central com `DecompressionStream('deflate-raw')`,
  ~80 linhas e nenhuma dependência nova. Somente leitura. Entrada cujo caminho não passa por
  `safePath` é recusada e contada no aviso — um `.zip` baixado é o único caminho por onde
  `../../evil.css` chegaria ao loader, já que a pasta do picker não deixa sair.
- Ingestão de repositório GitHub público: `api.github.com` para o branch padrão e
  `raw.githubusercontent.com` para os arquivos, ambos com `Access-Control-Allow-Origin: *`
  (medido). Confirmação explícita por repositório, no modal do próprio editor, dizendo quais
  hosts serão chamados. Nenhum token é pedido nem guardado, então repositório privado não
  carrega; sem token o limite é 60 requisições por hora.
- `readBytes()` como porta binária ao lado de `readText()`. As quatro origens — pasta, `.zip`,
  repositório, fixture — entram aqui, e foi por isso que as duas novas couberam sem tocar em
  `loadProject`.
- Duas linhas no dropdown de projetos: "Abrir arquivo .zip…" e o item de repositório agora
  carrega de verdade em vez de só registrar.
- Estágio de confirmação no modal existente. Não foi usado `window.confirm`: ele bloqueia a
  página e a v2.22 já havia trocado `alert()` por toast.

### Segurança

- `safePath` aplicado em `writeInto`, `fileHandle`, `dirOf`, em `readBytes` e em cada entrada
  de `.zip` (**F:62**).
- A pasta é conectada em `mode: 'read'`; `ensureWrite()` escala para `readwrite` só no topo de
  `writeText`, sempre como consequência de um clique (**F:61**).
- Gravação atômica: `.tmp` + `handle.move()` — presente no Chrome 152, medido — com escrita
  direta como fallback, e `.bak` da primeira versão da sessão (**F:63**).
- `lastModified` é registrado na leitura e conferido antes de gravar; divergência recusa a
  escrita nomeando o arquivo, em vez de sobrescrever alteração feita fora do editor (**F:64**).
- `layers-export.log` sai na exportação com caminho, timestamp, tamanho antes/depois e se
  houve `.bak` (**F:70**, parcial — falta o hash).
- Origem somente leitura recusa gravação nomeando a origem, em vez de deixar `fileHandle`
  estourar sem contexto.

### Perf

N/A — ingestão e guardas de gravação, fora de qualquer caminho quente. O `.zip` de teste
(1.112 bytes, 7 entradas) descomprime e carrega dentro de um quadro.

- Cadeia completa do `.zip` verificada em runtime: 4 entradas aceitas, 3 recusadas por caminho
  inseguro, projeto carregado com 2 nós e `data-src` resolvido para `style.css|.line|2`.
- GitHub verificado em runtime: API responde 200, `readText` traz o conteúdo do arquivo, 404
  vira erro nomeado e `../../etc/passwd` é recusado antes de virar requisição.
- Traval segue em 414 elementos · 11 camadas · 258 regras · 199 com `data-src`.
