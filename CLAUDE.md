# LAYERS — instruções para o Claude Code

Leia primeiro: docs/ARCHITECTURE.md e docs/RELEASE-CHECKLIST.md.

Regras:
- index.html + support.js são o app inteiro (arquivo único, CSS inline, classe React via runtime support.js). Não converter para framework/bundler sem decisão explícita.
- Estilo inline; só @font-face, @keyframes e resets no <style> do <helmet>.
- Visual congelado: não alterar cores, tipografia, espaçamentos ou tamanhos do dock/painéis sem pedido. Paletas em THEMES/ACCENTS/SELECTS.
- Prioridade de trabalho: checklist B (loader de projeto) → E (testes) → F (segurança) → D (performance).
- Toda gravação em disco passa por writeInto/writeText; nunca fora da pasta conectada.
- Commits pequenos; uma entrada em CHANGELOG.md por mudança visível.

## Stack

- Front-end estático puro: HTML + CSS inline + JS. Sem TypeScript, sem bundler em produção.
- Vite **apenas como dev server e para testes** (`npm run dev`). O app não é buildado.
- React 18.3.1 UMD — globais `window.React` / `window.ReactDOM`, servidos de `vendor/`.
- Vitest (unit), Playwright (E2E), css-tree (parser CSS, para o loader do checklist B).
- `npm install --legacy-peer-deps` — bug do npm 10.9.2; ver docs/LOCAL-SETUP.md.

## Recursos sem rede (hard)

O app **não pode** fazer nenhuma requisição externa. Fontes e React são versionados.

- Nunca reintroduzir `<link>` do Google Fonts nem `<script>` do unpkg no index.html.
- `fonts/` e `vendor/` são gerados por `scripts/vendor-assets.py` e commitados. Não editar `fonts/fonts.css` à mão — os `unicode-range` precisam casar com a saída do Google.
- As tags `<script>` de `vendor/` vêm **antes** de `support.js` no `<head>`. É isso que faz o `loadReactUmd()` curto-circuitar. Não reordenar.
- Ao mexer no `<head>` do index.html, revalide: DevTools → Network, zero requisições fora de `localhost:5180`.

## Defaults visuais

Sem localStorage valem os `data-props` do index.html, **não** os literais do `:root`
(esses são placeholders pré-`applyTheme()`). Tema Gray · 1 Grafite, acento 5 · Cinza
médio, seleção Coral, originColors Mono, panelHeader B, sliderScale 85, fontScale 1.

Ao comparar render, limpe `traval-layer-editor-cfg` antes de concluir que regrediu.

## Git Workflow

- Commit gate: testes unitários passando.
- Branch protection no GitHub está **inativa** (exige GitHub Pro em repo privado). A regra "nunca commitar em develop/master" é local: o hook `.git/hooks/pre-push` bloqueia, mas hooks não são versionados — reinstale com `bash scripts/install-hooks.sh` ao clonar.

## Changelog Fragment Format

Obrigatório antes de fechar qualquer branch feature/fix/refactor:
`changelog.d/<slug>.md` — usar a skill `changelog-draft`.
Deve conter bloco `### Perf`: measured | estimated | N/A, ≥1 bullet de ≥20 caracteres.

## Project Layout

```
index.html                    o editor inteiro (v2.22, ~414 KB)
support.js                    runtime dc gerado — NÃO EDITAR
vendor/                       React + ReactDOM UMD (commitados)
fonts/                        15 .woff2 + fonts.css gerado (commitados)
scripts/vendor-assets.py      regenera fonts/ e vendor/
docs/                         ARCHITECTURE, RELEASE-CHECKLIST, LOCAL-SETUP, _index
docs/text-specs/              histórico de requisitos
test/fixtures/                projetos-alvo para o loader (checklist E)
changelog.d/                  fragmentos por branch
```

## Testing

- Unit: Vitest. Integração e E2E: Playwright.
- Gates: unit = commit; integração = merge; E2E = manual até o loader existir.
- Nomes de teste: `Metodo_Cenario_Esperado`.
- Fixtures previstas em `test/fixtures/`: Traval (Vite+TS), React/Vite, Vue, HTML/CSS puro, Tailwind (falha explícita esperada). Ver checklist E.
- Nenhum teste ainda escrito — checklist E está inteiro em aberto.

## Code Style

- Prosa PT-BR nos docs (o corpus existente é PT-BR); comentários de código e commits em EN.
- Commits: Conventional Commits. Nunca `Co-Authored-By`, nunca sufixo de atribuição a IA.
- index.html já é grande por natureza; ao editar, use âncoras únicas e verifique a contagem de matches antes de substituir.

## Artifacts

- `docs/ARCHITECTURE.md`: atualizar ao adicionar componente, mudar fluxo de dados ou protocolo.
- `docs/LOCAL-SETUP.md`: atualizar ao mexer em fontes, vendor/ ou nos defaults visuais.
- `docs/RELEASE-CHECKLIST.md`: marcar itens conforme concluídos; é o gate da v1.
- `README.md`: atualizar no release.
- `CHANGELOG.md`: uma entrada por mudança visível.
- `CLAUDE.md`: revisar a cada 90 dias.
