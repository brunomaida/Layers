---
title: "LAYERS"
type: readme
solution: layers
created: 2026-09-12
---

# LAYERS

Editor visual de camadas para projetos web. Mostra o DOM de um app como planos em profundidade e permite ajustar CSS com gravação de volta nos arquivos.

## Requisitos
- Chrome ou Edge (File System Access API). Firefox/Safari: somente leitura.
- Node 22.22.2+ ou 24.15.0+ e npm 12+ (só para servir e testar). Verificado em Node 24.19.0 LTS + npm 12.0.2.

## Rodar
Duplo clique em `run.bat`, ou:
```
npm install
npm run dev        # http://localhost:5180
```
`run.bat` instala as dependências se faltarem, avisa se a 5180 já estiver ocupada e
deixa a janela aberta em caso de erro.

Não abrir via file:// — FS Access e fontes exigem origem HTTP.

## Conectar um projeto
Tudo começa no botão do canto superior esquerdo (**Conectar pasta** ou o nome do projeto
aberto), que abre a lista **Projetos recentes**. O editor lê o `layers.json` na raiz do
projeto, monta o mock fora da tela e mostra cada elemento como uma camada. Contrato
completo do arquivo: [docs/layers-json.md](docs/layers-json.md).

### Origens
| Origem | Como abrir | Grava? |
|---|---|---|
| Pasta local | Projetos recentes › **Conectar pasta local…** (Chrome/Edge) | sim |
| `.zip` | Projetos recentes › **Abrir arquivo .zip…** (Chrome/Edge) | não |
| Repositório GitHub público | Projetos recentes › **Registrar repositório GitHub…** (`github.com/usuario/repo`), depois clique no item | não |
| Fixture HTTP | `http://localhost:5180/?layers=fixtures/<nome>/` ou Projetos recentes › Exemplos › Traval | não |
| Pasta via Atlas | `http://localhost:5180/?project=<pasta absoluta>` (só com `npm run dev`; a pasta precisa ter `layers.json`) | não |

- **Pasta local** conecta em modo leitura; a permissão de escrita só é pedida quando você
  grava ou quando o LAYERS cria o `layers.json`, sempre a partir de um clique. Uma pasta
  já autorizada reabre sozinha no reload; se o navegador não manteve a permissão, clique
  nela em Projetos recentes.
- **GitHub** pede confirmação a cada carga, nomeando `api.github.com` e
  `raw.githubusercontent.com`. Só repositórios públicos, branch padrão, sem token
  (limite de 60 requisições por hora).
- Origem somente leitura recusa a gravação com um aviso que nomeia a origem.

### layers.json
Pasta local sem `layers.json`: ao conectar por clique, o LAYERS varre os `.html`/`.css`,
escolhe o mock e grava um manifesto mínimo. Reconexão automática nunca grava — o painel
mostra o botão **Criar layers.json**. Um `layers.json` existente nunca é sobrescrito.
Revise `mock`, `base` e `styles` se a heurística errar. Apps renderizados por JS precisam
de snapshot: `tools/layers-snapshot.js` (ver [docs/layers-json.md](docs/layers-json.md)).

### Gravar alterações
Só com pasta local conectada. No painel **Ajustes**, menu **Ações ▾**:
1. **Ver diff** — revisa o patch de cada arquivo.
2. **Aplicar nos arquivos…** › **1 · Gerar rascunho paralelo** — grava
   `<arquivo>.design-draft.<ext>` ao lado do original.
3. **2 · Aprovar, substituir e commitar** — o original vai para `.design-history/` e o
   rascunho o substitui. Os comandos git aparecem no log para você rodar; o navegador
   não executa git.

- **Exportar versões completas…** grava as versões alteradas numa pasta que você escolhe
  e, se houve gravações na sessão, o `layers-export.log` (ver
  [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md) § F).

Toda gravação guarda um `.bak` da primeira versão da sessão, grava via `.tmp` + `move`
e é recusada se o arquivo mudou fora do LAYERS desde a leitura (recarregue com `R`).
Só regras em `.css` e o template dc são reescritas; origem TS/JS fica como "manual".
Detalhes: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) § Camadas de gravação.

## Estrutura
- index.html — o editor (CHANGELOG 0.25.0)
- support.js — runtime gerado (não editar)
- lib/layers-core.js — lógica pura do loader (sem DOM/React), carregada pelo index.html
- vendor/ — React + ReactDOM UMD + csstree versionados (sem CDN)
- fonts/ — 15 .woff2 + fonts.css gerado (ver fonts/README.md)
- run.bat — sobe o dev server (duplo clique)
- test/ — testes unitários (Vitest) de lib/layers-core.js: `npm test`
- tools/ — layers-snapshot.js, layers-suggest.js, layers-derive.js (snapshot e spikes do loader)
- fixtures/ — projetos-alvo do loader, servidos por HTTP (`#layers=<pasta>/`)
- vite.config.js — config do dev server (serve fixtures/ sem o wrapper de HMR)
- scripts/vendor-assets.py — regenera fonts/ e vendor/
- docs/LOCAL-SETUP.md — rodar local com visual idêntico
- docs/ARCHITECTURE.md — arquitetura e fluxo de dados
- docs/RELEASE-CHECKLIST.md — pendências para a v1 (funcional, testes, segurança)
- docs/text-specs/layers-specs.md — histórico de requisitos v2.0 → v2.21
- CLAUDE.md — instruções para o Claude Code

## Preferências persistidas (localStorage)
- layers/v1/ui — tema, cor de seleção, cores de origem, cabeçalho, escala de fonte, painéis, navegação, árvore, escopo
- layers/v1/projects — histórico de projetos (pasta, .zip, repositório)
- layers/v1/session — último projeto, seleção e câmera; `layers/v1/tab` (sessionStorage) faz cada aba lembrar do seu projeto
- layers/v1/meta — schema e data da última gravação

Nada de conteúdo de arquivo aqui: o handle da pasta conectada mora no IndexedDB
`layers-hist`. Exportar/importar essas preferências em `layers-config.json` está no
dropdown de projetos.

## Defaults visuais
Sem localStorage valem os `data-props` do index.html (os literais do `:root` são
placeholders pré-`applyTheme()`):

Tema **Gray · 1 Grafite** · acento **5 · Cinza médio** · seleção **Coral** ·
cores de origem Mono · cabeçalho B · sliderScale 85 · fontScale 1

## Sem rede
Todo recurso de runtime está no repositório — fontes e React inclusos. O app não faz
nenhuma requisição externa. Detalhes e como verificar: docs/LOCAL-SETUP.md.
