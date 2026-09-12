### Alterado

- Fontes do projeto carregado agora vêm do repositório, não da rede. `fonts/projects.css`
  versiona Newsreader, Geist e JetBrains Mono 600 — as famílias que os projetos-alvo pedem e
  que o sheet do editor não carregava. O campo `fonts` do `layers.json` passa a nomear famílias;
  uma URL de serviço de fontes ainda é aceita, mas só as famílias são lidas dela e a URL nunca
  é requisitada. Família ausente do sheet local vira aviso e cai no fallback.
- `@font-face` declarado pelo próprio projeto sobe da folha escopada para o documento, com cada
  `url()` relativa lida da pasta conectada e trocada por `blob:`. Dentro de shadow root a regra
  não carregava fonte nenhuma; `url()` remota é descartada.
- Sanitização do mock passa a remover todo atributo com URL remota (`src`, `srcset`, `poster`,
  `data`, `href`, `xlink:href`); `data:` e `blob:` continuam válidos e `<use href>` só aceita
  fragmento. No CSS escopado, `url(http…)` vira `url(about:blank)` com aviso.

### Adicionado

- Meta CSP no `<head>`: `default-src 'self'`, `connect-src` restrito a `api.github.com` e
  `raw.githubusercontent.com`. É guarda de rede, não de injeção — `'unsafe-inline'` e
  `'unsafe-eval'` são inevitáveis porque o runtime `dc` compila a classe de lógica com
  `new Function()`.
- `vite.config.js` serve `/fixtures/**` sem transformação e devolve 404 para arquivo ausente.

### Corrigido

- Modo fixture lia JavaScript em vez de CSS. O Vite responde todo `.css` como módulo de HMR,
  então `readText()` recebia o wrapper: das 174 regras do `painel.css` do Axaí o navegador
  parseava 2, nenhuma variável do projeto aplicava e a contagem caía de 60 para 51 elementos.
- `layers.json` apontando para um `mock` inexistente fazia o fallback de SPA do Vite devolver o
  `index.html` do próprio editor, que era então parseado como se fosse o projeto — 297 elementos
  de LAYERS no lugar do estado vazio.

### Perf

measured — sem regressão de tempo de carga; o que mudou foi o número de regras que realmente
entram no shadow root.

- Axaí: 173 regras CSS parseadas contra 2 antes da correção do dev server; 60 elementos · 7
  camadas, batendo a medição de referência.
- Traval: 414 elementos · 11 camadas · 258 regras; 199 elementos com `data-src` resolvido para
  arquivo e linha reais.
- MarketView: 46 elementos · 6 camadas.
- Rede: 18 requisições ao carregar o Traval, 18 em `localhost:5180`, zero externas.
