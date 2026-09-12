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
- `run.bat` — sobe o dev server por duplo clique. Faz `cd` para a pasta do script, instala as dependências se faltarem, recusa subir se a 5180 já estiver ocupada, e dá `pause` em caso de erro (senão a janela fecha antes da mensagem ser lida). Usa `call npm`, sem o qual o `.bat` encerraria na primeira chamada — `npm` é um `.cmd`.
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
- Toolchain da máquina atualizada com autorização: Node 22.14.0 → **24.19.0 LTS (Krypton)** via `winget install OpenJS.NodeJS.LTS`, e npm 10.9.2 → **12.0.2**. O 10.9.2 quebrava em `arborist#loadPeerSet` no grafo de peers do Vitest 4.x, o que forçava `--legacy-peer-deps` e travava o `npm audit`. Escolhida a linha LTS em vez da 26 Current: satisfaz o npm 12 (`^24.15.0`) sem assumir uma linha que recebe breaking changes.
- Revalidado sobre a toolchain nova: `npm install` limpo, `npm audit` com 0 vulnerabilidades, `npm test` verde, e o app renderizando com as mesmas 12 requisições em `localhost:5180`, sem erro de console. Fecha o item de dependências do checklist F.
- Piso de versão documentado no README, `CLAUDE.md` e `LOCAL-SETUP.md`: Node 22.22.2+ ou 24.15.0+ com npm 12+. Vem do npm 12; o Vitest 4 além disso não suporta a linha 23.
- `npm test` passa a usar `--passWithNoTests`: `vitest run` saía com 1 em suíte vazia, o que tornava o commit gate do `CLAUDE.md` insatisfazível enquanto o checklist E estiver zerado. Um teste quebrado continua falhando.
- `@babel/standalone`, declarado no `support.js`, nunca é baixado: só é usado por `x-import` com `kind === "jsx"`, e o `index.html` não tem nenhum. Confirmado em runtime.
