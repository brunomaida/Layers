# LAYERS — instruções para o Claude Code

Leia primeiro: docs/ARCHITECTURE.md e docs/roadmap.md (tracker; o gate da v1 é docs/RELEASE-CHECKLIST.md).

## Regras

- index.html + support.js são o app inteiro (arquivo único, CSS inline, classe React via runtime support.js). Não converter para framework/bundler sem decisão explícita. `support.js` é gerado: não editar.
- Estilo inline; só @font-face, @keyframes e resets no <style> do <helmet>.
- Visual congelado: não alterar cores, tipografia, espaçamentos ou tamanhos do dock/painéis sem pedido. Paletas em THEMES/ACCENTS/SELECTS; defaults visuais e limpeza das chaves `layers/v1/*` em docs/LOCAL-SETUP.md.
- Toda gravação em disco passa por writeInto/writeText; nunca fora da pasta conectada.
- Toda branch nasce de uma leaf de docs/roadmap.md (token do id no slug, ex.: `s4-3`).

## Stack (override do global: JS puro, sem .NET)

- HTML + CSS inline + JS, sem TypeScript e sem bundler em produção; Vite só como dev server e para testes (`npm run dev`, porta 5180).
- React 18.3.1 UMD em `vendor/`, css-tree no loader; Vitest (unit, `npm test`) e Playwright (E2E/perf, `npm run test:e2e`).
- Node 22.22.2+ ou 24.15.0+ com npm 12+ (verificado em Node 24.19.0).
- Não se aplicam do global: IClock, `DateTime`, BenchmarkDotNet, zero-alloc/`Unsafe`/NUMA e path-tiers (.NET). Tier de performance = General; orçamentos em docs/RELEASE-CHECKLIST.md § D, metodologia em docs/bench-methodology.md.

## Recursos sem rede (hard)

- Nenhuma requisição externa no carregamento: fontes e React são versionados em `fonts/` e `vendor/` (gerados por `scripts/vendor-assets.py`; não editar `fonts/fonts.css` à mão).
- Única saída de rede: o loader de repositório público do GitHub, iniciado pelo usuário (CSP `connect-src` api.github.com e raw.githubusercontent.com).
- Nunca reintroduzir `<link>` do Google Fonts nem `<script>` do unpkg. As `<script>` de `vendor/` e `lib/` vêm antes de `support.js` no `<head>`; não reordenar.
- Ao mexer no `<head>`: DevTools → Network sem requisições fora de `localhost:5180` no carregamento.

## Git

- Commit gate: `npm test` passando. Ao clonar, rode `bash scripts/install-hooks.sh`; o `pre-push` recusa push com develop/master em checkout e delega ao hook global (detalhes em docs/LOCAL-SETUP.md).
- Fragmento `changelog.d/<slug>.md` por branch (skill `changelog-draft`), com bloco `### Perf` (measured | estimated | N/A, ≥1 bullet de ≥20 caracteres); CHANGELOG.md só no release.

## Layout

index.html (app) · support.js (runtime gerado) · lib/layers-core.js (lógica pura do loader) · test/ (Vitest) · bench/ (microbenchmarks do core, `npm run bench`) · e2e/ (testes de performance de UI, Playwright) · fixtures/ (projetos-alvo, `?layers=fixtures/<nome>/`) · tools/ (snapshot do DOM e spikes da fatia 5) · scripts/ (vendor-assets, install-hooks) · docs/ (mapa em docs/TOPOLOGY.md e docs/_index.md).

## Testes

- Vitest em `test/`, nomes `Metodo_Cenario_Esperado`; fixtures em `fixtures/`, casos em docs/RELEASE-CHECKLIST.md § E.
- Gates: unit = commit; integração = merge; E2E/perf = manual enquanto não houver CI.

## Estilo

- Prosa PT-BR nos docs (o corpus é PT-BR); comentários de código e commits em EN. Conventional Commits, commits pequenos; nunca `Co-Authored-By` nem atribuição a IA.
- index.html é grande: edite com âncoras únicas e confira a contagem de matches antes de substituir.

## Manutenção

- Atualizar docs/ARCHITECTURE.md ao mudar componente, fluxo ou protocolo; docs/LOCAL-SETUP.md ao mexer em fontes, vendor/ ou defaults; docs/RELEASE-CHECKLIST.md e docs/roadmap.md ao concluir; README.md no release; revisar este arquivo a cada 90 dias.
