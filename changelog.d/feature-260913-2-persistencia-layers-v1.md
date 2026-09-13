### Adicionado

- Persistência em quatro chaves `layers/v1/*` no lugar das três soltas da v2.24:
  `meta` (schema + data + origem da migração), `ui` (aparência e painéis),
  `projects` (histórico) e `session` (último projeto, seleção, câmera). O mapa completo
  está em `docs/ARCHITECTURE.md` § Persistência (**A:17**).
- `LayersCore.migrateConfig(storage)`: converte `layers-cfg`, `layers-hist` e
  `layers-inter-size` e **não** as apaga — remoção na v2.26, com uma linha no CHANGELOG.
  Idempotente pela presença de `layers/v1/meta`. O degrau anterior
  (`traval-layer-editor-*` → `layers-*`) continua valendo para quem nunca abriu a v2.24.
- Interface que volta num reload: painéis (direito, coluna, árvore, ajustes), navegação
  flutuante, `interSize` do menu INTERAGIR, wireframe, foco de camada, espaçamento, abas
  da árvore, modo das listas e escopo de aplicação — 21 chaves, antes só 6.
- Sessão: `layers/v1/session` guarda câmera, seleção e isolamento; `layers/v1/tab` no
  `sessionStorage` guarda o projeto **daquela aba** e vence o `session` ao restaurar
  (cada aba reabre o seu projeto; câmera e seleção, que moram na chave compartilhada, só
  voltam para a aba que as gravou). `lastProjectId: null` é valor legítimo e persistido —
  primeira carga, ou histórico limpo — e abre vazio em vez de adivinhar um projeto. Não há
  ação de "fechar projeto" na interface: `null` nasce daí, não de um clique.
- Reabertura do último projeto por `queryPermission()`: pasta já autorizada volta sozinha.
  `requestPermission()` recusaria — não há ativação do usuário no carregamento —, então
  pasta sem permissão, `.zip` (vive em memória) e repositório GitHub (pede confirmação
  explícita a cada carga) viram convite nomeado no painel do palco, não erro genérico.
  Reabrir o último projeto preserva câmera e seleção; abrir outro volta à vista padrão.
- Export/import de configuração em `layers-config.json`
  (`{schema, exportedAt, ui, projects}` — sessão fica fora, é da aba), duas linhas novas no
  dropdown de projetos. No import `ui` substitui as chaves que o arquivo traz, `projects`
  faz merge por `id` preservando o `pinned` local e passa pela poda de `histMax`, e o toast
  diz que pasta local precisa ser reconectada — handle não é serializável (**L13**).
- `sanitizeUi` guarda o import: valor tem de casar com o tipo do estado, `theme` e
  `selectColor` têm de existir nas paletas, `fontScale` fica entre 0,7 e 1,6 e `interSize`
  passa pela mesma normalização da carga. Um `layers-config.json` corrompido deixava
  `--fs: 50` persistido ou derrubava o `applyTheme` na montagem.

### Alterado

- A gravação deixou de ser espalhada: `setCfg`, `saveInter`, `saveHist` e o resizer não
  escrevem mais direto no `localStorage`. Um único ponto em `componentDidUpdate` compara a
  assinatura do que é persistido e agenda `persistSoon()` com trailing de 400 ms.
- `showSaveFilePicker` para a configuração, com o alvo escolhido no clique;
  `writeInto`/`writeText` seguem exclusivos da pasta conectada. Decisão registrada em
  `docs/architecture-decisions.md`, junto com a de manter o IndexedDB `layers-hist` em vez
  de criar `layers-store` (renomear orfanaria os projetos já conectados).

### Corrigido

- `projectId` é semeado de `layers/v1/session` na montagem. Sem isso, qualquer carga em que
  o projeto não reabre sozinho (navegador reiniciado, `.zip`, repositório, fixture) gravava
  `lastProjectId: null` sobre o ponteiro 400 ms depois e o último projeto se perdia.
- Marcar a aba passou do `touchHist` para os três pontos de carga: registrar um repositório
  no dropdown não troca mais o projeto da aba.
- Câmera e seleção só voltam quando o `session` compartilhado é da aba que está abrindo —
  duas abas em projetos diferentes não trocam mais de vista entre si.
- Seleção restaurada entra por `select()`: camada ativa, árvore aberta nos ancestrais e
  regra carregada, em vez de só `selId` no state.

### Segurança

- `layers/v1/*` só guarda preferência de interface, histórico e ponteiro de sessão. Handle
  de pasta continua exclusivo do IndexedDB e conteúdo de arquivo não entra em
  `localStorage` nem no arquivo de export (**F:68**).
- `localStorage`/`sessionStorage` indisponíveis (aba privada, cookies bloqueados) caem para
  um store em memória: a sessão roda sem persistir em vez de quebrar na primeira leitura.

### Perf

- **measured** — a assinatura do `componentDidUpdate` custa **1,21 µs por render**
  (`JSON.stringify` de 620 bytes, média de 20.000 iterações no Chrome 152, fixture Traval
  com 414 elementos). Orbitar a câmera renderiza ~60 vezes por segundo: 73 µs/s de CPU, e
  em troca as ~60 gravações de `localStorage` por segundo que um write-por-evento faria
  viram **uma**.
- **measured** — 12 eventos de órbita seguidos produziram **4 chamadas de `setItem`** (uma
  por chave, uma única rajada), verificado com espião em `Storage.prototype.setItem`.
- Loader sem regressão: fixture Traval segue em 414 elementos · 11 camadas, zero
  requisições fora de `localhost:5180`.
