# Setup de projeto: repositório, docs e recursos locais

Branch `setup/260912-project-setup`.

### Added

- `vendor/react.production.min.js` e `vendor/react-dom.production.min.js` — React 18.3.1 UMD versionado. Validado contra os hashes `REACT_SRI` / `REACT_DOM_SRI` que o próprio `support.js` declara, provando que a cópia local é byte-idêntica ao que vinha do unpkg.
- `fonts/` — 15 `.woff2` espelhados do `fonts.gstatic.com`, subsetados por `unicode-range`.
- `scripts/vendor-assets.py` — regenera `fonts/` e `vendor/`, aborta se o CDN mudar os bytes do React.
- `.githooks/pre-push` + `scripts/install-hooks.sh` — bloqueia push direto em `develop`/`master`, barra reintrodução de CDN no `index.html` e edição do `support.js`. Delega ao hook global (`~/.git-hooks/pre-push`), que já cobre o gate de `changelog.d`.
- `docs/LOCAL-SETUP.md` — como rodar local com visual idêntico, defaults reais, verificação e problemas conhecidos.
- `docs/TOPOLOGY.md` e `docs/architecture-decisions.md` — exigidos pelo manifesto do archetype `app` (`docs-doctor.py`). Topologia é o grafo de arquivos e a ordem de carga do `<head>`; decisões registram o vendoring sem editar `support.js` e a precedência dos defaults visuais.
- `.gitattributes` — `vendor/**` e `support.js` como `-text`, para o clone receber os mesmos bytes que validaram o SRI.
- `.claude/settings.json` — routing de modelo (`sonnet` / advisor `fable`).
- `package-lock.json`, `changelog.d/`, `test/fixtures/`.

### Changed

- `index.html` — `<link>` do Google Fonts trocado por `./fonts/fonts.css`; tags `<script>` locais do React inseridas antes do `support.js`. `support.js` não foi tocado: `loadReactUmd()` já curto-circuita quando `window.React` e `window.ReactDOM` existem.
- `fonts/fonts.css` e `fonts/README.md` reescritos. Ambos descreviam 8 fontes estáticas, uma por peso; o Google serve 15 variáveis subsetadas por `unicode-range`, com o mesmo arquivo cobrindo 400–700. Seguir a versão antiga daria métricas de texto diferentes das atuais.
- `README.md` e `CLAUDE.md` — defaults visuais corrigidos. Documentavam `Dark / acento 1 Aço / seleção Azul`; o que vale sem `localStorage` são os `data-props` do `index.html`: `Gray · 1 Grafite`, acento `5 · Cinza médio`, seleção `Coral`. Confirmado em runtime (`--bg0:#2a2e34`, `--acc:#8b96a3`, `--sel:#f08c6c`). Os literais do `:root` eram placeholders pré-`applyTheme()`.
- `CLAUDE.md` — acrescidas as seções Stack, Recursos sem rede, Defaults visuais, Git Workflow, Changelog Fragment Format, Project Layout, Testing, Code Style e Artifacts. As 6 regras originais ficaram intactas.
- `docs/RELEASE-CHECKLIST.md` — seção A fechada, itens de rede e lockfile marcados como parciais, legenda de estados adicionada.
- `layers-specs.md` movido para `docs/text-specs/`.

### Removed

- `layers-start-kit-desktop.zip` — os 11 arquivos eram idênticos aos da pasta; era o export já extraído.

### Perf

**N/A** — nenhuma mudança em caminho de execução do app. O trabalho foi de
infraestrutura, documentação e versionamento de recursos.

Efeito colateral positivo, não medido: o carregamento inicial deixa de depender de
três handshakes TLS externos (`fonts.googleapis.com`, `fonts.gstatic.com`,
`unpkg.com`) e passa a servir tudo da mesma origem.

### Notes

- O hook `pre-push` inicial não rodava: `core.hooksPath` está definido globalmente para `~/.git-hooks`, então `.git/hooks/` nunca é consultado. Corrigido com `core.hooksPath` por repositório apontando para `.githooks/` versionado, que delega ao global antes de rodar as guardas locais. O check de `support.js` também dava falso-positivo em arquivo adicionado (`--diff-filter=M` agora).
- Guardas verificadas rodando o hook: bloqueia com `HEAD` em `develop` e em `master`, bloqueia com CDN reintroduzido no `index.html`, e libera nesta branch (push real confirmou que o git invoca `.githooks/pre-push`). Ressalva: por ser versionado, o hook só roda em branches que já contêm `.githooks/` — a guarda de `develop`/`master` só vale após o merge.

- Branch protection no GitHub retornou 403: exige GitHub Pro em repositório privado. Compensado pelo hook `pre-push` local.
- `npm install` puro falha com `Cannot read properties of null (reading 'edgesOut')` — bug do npm 10.9.2 em `arborist#loadPeerSet` no grafo de peers do Vitest 4.x. As quatro dependências declaradas resolvem normalmente. Contorno: `--legacy-peer-deps`. Correção definitiva (`npm i -g npm@latest`) é mudança global da máquina e ficou fora do escopo.
- `@babel/standalone`, declarado no `support.js`, nunca é baixado: só é usado por `x-import` com `kind === "jsx"`, e o `index.html` não tem nenhum. Confirmado em runtime.
