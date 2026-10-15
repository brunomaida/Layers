---
type: report
solution: Layers
status: draft
created: 2026-10-14
---

# S5.7 — Evidência de compatibilidade de navegadores

Evidência da linha E do [checklist de release](../../RELEASE-CHECKLIST.md) ("Chrome/Edge completos; Firefox/Safari em somente leitura com mensagem"), produzida pelo plano [S5.7](../plans/2026-10-14-s5-7-browser-compat.md). Insumo da S7.3 (matriz de suporte). Vale apenas para as versões testadas (`[!DECISION] version-claims`, opção A).

> Estado: as Tarefas 1-5 do plano estão executadas e verdes; os passos manuais M1-M5 **ainda não foram executados** (exigem seletor nativo, prompts de permissão e, para M4, um Mac). Células que dependem deles estão marcadas `não verificado` e o item E:62 do checklist continua aberto até o humano fechar M1 e M2.

## 1. Versões testadas

Data: 2026-10-14. Máquina de referência: Windows 11 (i7-12700). Playwright 1.63.0.

| Projeto | Motor | Versão | Origem |
|---|---|---|---|
| `chromium` | Chromium | 153.0.8010.12 | build do Playwright (rev 1243) |
| `chrome` | Chromium | 155.0.8059.41 | Chrome instalado (`channel: 'chrome'`) |
| `msedge` | Chromium | 155.0.4283.45 | Edge instalado (`channel: 'msedge'`) |
| `firefox` | Firefox | 155.0 | build do Playwright (rev 1543), não é o Firefox estável |
| `webkit` | WebKit | 26.6 | build do Playwright (rev 2359) para Windows: proxy do Safari, não é o Safari |

Linhas `[compat]` literais da execução do spec:

```
[compat] chromium chromium 153.0.8010.12
[compat] chrome chromium 155.0.8059.41
[compat] msedge chromium 155.0.4283.45
[compat] firefox firefox 155.0
[compat] webkit webkit 26.6
```

## 2. Sondas de API

Fonte: `e2e/__snapshots__/compat-probes.json`; a tabela abaixo é uma cópia. Detecção por recurso dentro da página (o app também ramifica por `window.showDirectoryPicker`), nunca por user-agent.

| Sonda | chromium | chrome | msedge | firefox | webkit |
|---|---|---|---|---|---|
| `secureContext` | sim | sim | sim | sim | sim |
| `fetch` | sim | sim | sim | sim | sim |
| `domParser` | sim | sim | sim | sim | sim |
| `shadowDom` | sim | sim | sim | sim | sim |
| `customElements` | sim | sim | sim | sim | sim |
| `resizeObserver` | sim | sim | sim | sim | sim |
| `indexedDB` | sim | sim | sim | sim | sim |
| `fontsApi` | sim | sim | sim | sim | sim |
| `blobUrl` | sim | sim | sim | sim | sim |
| `cssSupports` | sim | sim | sim | sim | sim |
| `preserve3d` | sim | sim | sim | sim | sim |
| `showDirectoryPicker` | sim | sim | sim | não | não |
| `showOpenFilePicker` | sim | sim | sim | não | não |
| `showSaveFilePicker` | sim | sim | sim | não | não |
| `handlePermissions` | sim | sim | sim | não | não |
| `createWritable` | sim | sim | sim | sim | sim |
| `handleMove` | sim | sim | sim | sim | sim |
| `opfs` | sim | sim | sim | sim | sim |
| `cryptoDigest` | sim | sim | sim | sim | sim |
| `deflateRaw` | sim | sim | sim | sim | sim |
| `accentColor` | sim | sim | sim | sim | sim |
| `textWrapPretty` | sim | sim | sim | não | sim |

Leitura da tabela: o corte de capacidade é exatamente o File System Access (seletores e permissões de handle). `createWritable` e `handleMove` existem em Firefox/WebKit porque pertencem ao OPFS, que não grava na pasta do usuário; o app só chega neles com um handle de pasta, que nesses motores nunca existe. Presença do seletor de pasta implica o tier de gravação completo (asserção do spec); ausência é afirmada pelo spec (`showOpenFilePicker`, `showSaveFilePicker` e `handlePermissions` falsos) e congelada pelo snapshot `compat-probes.json`.

## 3. Comportamento

Legenda: `ok (spec)` = coberto por teste automatizado; `ok (manual Mx)` = verificado por humano; `recusa com mensagem` = a entrada de gravação recusa nomeando a limitação; `não verificado` = sem evidência até agora.

| Capacidade | chromium | chrome | msedge | firefox | webkit | Safari real | Firefox real |
|---|---|---|---|---|---|---|---|
| Leitura (fixture) | ok (spec) `tree-snapshot.spec.js`, `Compat_TravalLoad_NoPageErrorNoEgress` | ok (spec) `Compat_<fixture>_TreeMatchesChromiumSnapshot` ×16, `Compat_TravalLoad_NoPageErrorNoEgress` | ok (spec) `Compat_<fixture>_TreeMatchesChromiumSnapshot` ×16, `Compat_TravalLoad_NoPageErrorNoEgress` | ok (spec) `Compat_<fixture>_TreeMatchesChromiumSnapshot` ×16 | ok (spec) `Compat_<fixture>_TreeMatchesChromiumSnapshot` ×16 | não verificado (M4) | não verificado (M5) |
| Leitura (GitHub) | ok (spec) `Compat_GithubRepoMocked_LoadsReadOnlyAndRefusesWrite` | ok (spec) idem | ok (spec) idem | ok (spec) idem | ok (spec) idem | não verificado (M4) | não verificado (M5) |
| Leitura (pasta local) | ok (spec) `apply-flow.spec.js` (OPFS, seletor simulado) | ok (spec) idem | ok (spec) idem | recusa com mensagem `Compat_NoFsAccess_WriteEntryPointsNameTheBrowser` | recusa com mensagem idem | não verificado (M4) | não verificado (M5) |
| Leitura (`.zip`) | não verificado (M1) | não verificado (M1) | não verificado (M2) | recusa com mensagem `Compat_NoFsAccess_…` | recusa com mensagem idem | não verificado (M4) | não verificado (M5) |
| Edição em memória + diff simulado | ok (spec) `Compat_FixtureEdit_DiffShowsSimulatedPatch` | ok (spec) idem | ok (spec) idem | ok (spec) idem | ok (spec) idem | não verificado (M4) | não verificado (M5) |
| Gravação (rascunho, aprovar, rollback) | ok (spec) `apply-flow.spec.js`, `write-log-hash.spec.js`; seletor nativo e prompt de permissão: não verificado (M1) | ok (spec) `apply-flow.spec.js`; nativo: não verificado (M1) | ok (spec) `apply-flow.spec.js`; nativo: não verificado (M2) | rascunho: recusa com mensagem (spec `Compat_NoFsAccess_WriteEntryPointsNameTheBrowser`); aprovar/rollback: inalcançáveis sem pasta | rascunho: recusa com mensagem (spec idem); aprovar/rollback: inalcançáveis sem pasta | não verificado (M4) | não verificado (M5) |
| Exportação (versões completas) | não verificado (M1) | não verificado (M1) | não verificado (M2) | recusa com mensagem `Compat_NoFsAccess_…` | recusa com mensagem idem | não verificado (M4) | não verificado (M5) |
| Config export/import | não verificado | não verificado | não verificado | recusa no código (`index.html:1199`, `:1207`), sem teste | recusa no código, sem teste | não verificado | não verificado |

Evidência visual (3D, fontes, layout): `Compat_TravalOrbit_ScreenshotsForManualReview` gera 10 PNGs em `test-results/` (não versionado) para a revisão manual M3, ainda pendente. Nenhuma asserção cobre a profundidade 3D.

## 4. Mensagens ao usuário

| Entrada | Mensagem (toast ou texto do palco) | `index.html` |
|---|---|---|
| Conectar pasta local | "File System Access API indisponível — use Chrome ou Edge. Os ajustes seguem em modo simulado." | `:1387` |
| Abrir arquivo .zip | "Abrir .zip usa a File System Access API — abra no Chrome ou Edge." | `:1400` |
| Exportar configuração | "Exportar configuração usa a File System Access API — abra no Chrome ou Edge." | `:1199` |
| Importar configuração | "Importar configuração usa a File System Access API — abra no Chrome ou Edge." | `:1207` |
| Rascunho, aprovação, exportação completa (sem pasta, com File System Access) | "Projeto carregado de <origem>, que é somente leitura. Conecte a pasta local para gravar." | `:1444` |
| Rascunho, aprovação, exportação completa (sem pasta, sem File System Access) | "Projeto carregado de <origem>, que é somente leitura. Este navegador não grava em disco — use Chrome ou Edge." (novo nesta folha) | `:1444` |
| Exportação sem seletor de diretório | "A exportação usa a File System Access API — abra no Chrome ou Edge." (inalcançável sem pasta: `readOnlyBlock` responde antes) | `:1938` |
| Palco vazio sem File System Access | "Este navegador não tem a File System Access API — use Chrome ou Edge para conectar uma pasta. O modo fixture (#layers=) continua funcionando aqui." | `:2204` |
| Nota do diff simulado | "(simulado — conecte a pasta para o diff real)" (texto inalterado; também aparece sem File System Access, onde conectar é impossível) | `:1931` |

## 5. Diferenças cosméticas

Registradas, não corrigidas (visual congelado).

| Item | Efeito | Por que não corrige |
|---|---|---|
| `::-webkit-scrollbar` | Firefox ignora e mostra as barras padrão | `scrollbar-width`/`scrollbar-color` também valem no Chromium 121+ e sobrepõem `::-webkit-scrollbar`: o visual congelado do Chrome mudaria |
| `text-wrap: pretty` | Sonda: sem suporte no Firefox 155.0; Chromium e WebKit suportam | Propriedade ignorada pelo motor; só altera a quebra de linha |
| `accent-color` | Sonda: suportado nos cinco | Sem diferença |
| Profundidade 3D, fontes (Inter, JetBrains Mono), sobreposição de painéis | Pendente de M3 | Revisão visual humana sobre os PNGs |

## 6. Achados

| # | Achado | Decisão |
|---|---|---|
| 1 | Recusa de rascunho, aprovação e exportação sem File System Access dizia "Conecte a pasta local para gravar.", impossível em Firefox/Safari | Corrigido nesta folha (`index.html:1443-1444`, `[!DECISION] readonly-message` A) |
| 2 | Config export/import não tem teste de recusa (`index.html:1199`, `:1207`) | Lacuna registrada; candidata a teste na S7.3 ou em folha própria |
| 3 | Exportação "versões completas" e `.zip` em Chrome/Edge sem teste automatizado (dependem do seletor nativo) | Cobertas somente por M1/M2, pendentes |
| 4 | Nenhuma falha de árvore (16 fixtures, em chrome, msedge, firefox e webkit), erro de página ou requisição externa | Sem ação |

## 7. Como reproduzir

Toda execução do Playwright passa pelo invólucro com trava e checagem de porta (`docs/superpowers/plans/2026-10-14-s5-7-browser-compat.md`, § Global Constraints):

```bash
n=0; until mkdir /tmp/layers-e2e.lock 2>/dev/null; do n=$((n+1)); [ "$n" -ge 60 ] && { echo 'COULD NOT RUN: stale lock'; exit 1; }; sleep 10; done
trap 'rmdir /tmp/layers-e2e.lock' EXIT
[ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5180/)" = 000 ] || { echo 'REFUSED: 5180 already served'; exit 1; }
npx playwright test e2e/browser-compat.spec.js
```

- Um projeto: `npx playwright test e2e/browser-compat.spec.js --project=firefox`.
- Regerar as sondas (sempre com o caminho do arquivo, senão `tree.json` também é reescrito): `UPDATE_SNAPSHOT=1 npx playwright test e2e/browser-compat.spec.js`.
- Chrome e Edge atualizam sozinhos: o spec compara neles apenas as sondas de leitura e de gravação; uma falha após atualização é mudança real de capacidade.
- Nunca rodar `e2e/perf.spec.js` junto (instável e longo; só Chromium).

Passos manuais (humano), com o dev server sob a mesma trava:

| # | Navegador | O que fazer | Passa quando |
|---|---|---|---|
| M1 | Chrome 155 instalado | Conectar pasta local (seletor nativo) numa cópia de `fixtures/plain-css`; selecionar `.card`, Sombra = `0 0 0 3px rgb(1, 2, 3)`; Aplicar, Gerar rascunho, aceitar o prompt readwrite, Aprovar; recarregar; Exportar versões completas noutra pasta; Abrir arquivo .zip | `style.css` alterado em disco, `style.css.bak` e `.design-history/` existem; a pasta reabre ou o aviso de reconexão aparece; exportação com `layers-export.log` e sha256; o .zip carrega somente leitura |
| M2 | Edge 155 instalado | Igual ao M1 | Igual ao M1 |
| M3 | — | Abrir os 10 PNGs de `test-results/` lado a lado (par `chromium` como referência); rodar `-g Screenshots` imediatamente antes da revisão, sem outra execução entre os dois (o Playwright limpa `test-results/` a cada run) | Planos com profundidade após o orbit em firefox/webkit; Inter/JetBrains Mono renderizadas; sem painéis sobrepostos |
| M4 | Safari no macOS | Rodar o repositório no Mac (`npm ci && npm run dev`), abrir `localhost:5180/?layers=fixtures/plain-css/`, editar `.card`, Ver diff, Aplicar, Gerar rascunho | Carrega, edita, mostra o diff simulado e o toast com a dica sem File System Access. Sem Mac: "Safari real: não verificado" |
| M5 | Firefox estável (opcional) | Igual ao M4 | Igual ao M4. Se pulado: "Firefox real: não verificado; evidência = build Playwright 155.0" |

Resultados de M1-M5 nesta data: **nenhum executado** (pendentes do humano).

## 8. Para a S7.3

| # | Entrega | Onde |
|---|---|---|
| 1 | Versões e data testadas | § 1 |
| 2 | Matriz de sondas legível por máquina | `e2e/__snapshots__/compat-probes.json`; cópia na § 2 |
| 3 | Matriz fonte × leitura/edição/gravação × motor, cada célula com teste ou passo manual | § 3 |
| 4 | Mensagens exatas das entradas recusadas | § 4 |
| 5 | Diferenças cosméticas e por que não se corrigem | § 5 |
| 6 | Células não verificadas, nomeadas (Safari real, Firefox real, M1-M3) | § 3, § 7 |
| 7 | Comandos de reexecução | § 7 |
| 8 | Linhas a reconciliar: `README.md:13`, `:36`, `:37` e a linha "Chrome/Edge apenas" de `docs/TOPOLOGY.md:99` | § 8 |
