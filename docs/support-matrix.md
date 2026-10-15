---
title: "LAYERS — Matriz de suporte"
type: reference
solution: Layers
created: 2026-10-14
---

# LAYERS — Matriz de suporte

O que funciona em cada navegador e qual teste prova cada célula. Vale só para as versões testadas abaixo: faixas de versão não são afirmadas (decisão `version-claims` A do [plano da S5.7](superpowers/plans/2026-10-14-s5-7-browser-compat.md)). Procedimentos, sondas completas e diferenças cosméticas estão no [relatório de evidência da S5.7](superpowers/reports/2026-10-14-s5-7-compat-evidence.md); requisitos e como rodar, no [README](../README.md).

## Resumo

- **Chrome e Edge:** leitura, edição e gravação. A gravação é testada com o seletor de pasta simulado (pasta no OPFS); o seletor nativo, o prompt de permissão, o `.zip` e a exportação completa aguardam a verificação manual M1 e M2.
- **Firefox e Safari:** somente leitura (fixture e repositório GitHub público), edição em memória e diff simulado. Toda entrada de gravação recusa com uma mensagem que indica Chrome ou Edge. Provado nos builds do Playwright (Firefox 155.0, WebKit 26.6). No Safari real e no Firefox estável, nada foi verificado: M4 e M5 cobrem só leitura de fixture, edição, diff e recusa do rascunho.
- O app decide por detecção de recurso (`window.showDirectoryPicker`), nunca por user-agent. Um navegador que ganhe a File System Access API passa a gravar sem mudança no app, mas só entra nesta matriz depois de testado.

## Versões testadas

Data: 2026-10-14. Sistema: Windows 11 (i7-12700). Playwright 1.63.0. Fonte: linhas `[compat]` da execução de `e2e/browser-compat.spec.js`.

| Coluna | Projeto Playwright | Motor | Versão | Origem |
|---|---|---|---|---|
| Chromium | `chromium` | Chromium | 153.0.8010.12 | build do Playwright (rev 1243); roda a suíte E2E inteira |
| Chrome | `chrome` | Chromium | 155.0.8059.41 | Chrome instalado (`channel: 'chrome'`) |
| Edge | `msedge` | Chromium | 155.0.4283.45 | Edge instalado (`channel: 'msedge'`) |
| Firefox (build) | `firefox` | Gecko | 155.0 | build do Playwright (rev 1543), não é o Firefox estável |
| WebKit (build) | `webkit` | WebKit | 26.6 | build do Playwright (rev 2359) para Windows: aproxima o Safari, não é o Safari |
| Safari | — | WebKit | — | não testado: exige macOS (M4) |
| Firefox estável | — | Gecko | — | não testado: não instalado na máquina de referência (M5) |

Chrome e Edge se atualizam sozinhos: a versão acima é a da execução, não um piso.

## Matriz

Legenda: `sim · E<n>` = coberto pelo teste automatizado E<n> (ver Evidências); `recusa · E<n>` = a entrada existe e recusa com mensagem que indica Chrome ou Edge, provado por E<n>; `não verificado · M<n>` = sem evidência, e o passo manual M<n> cobre exatamente esta célula; `não verificado · L<n>` = sem evidência e sem passo manual que a cubra (ver Lacunas).

| Capacidade | Chromium (`chromium`) | Chrome (`chrome`) | Edge (`msedge`) | Firefox build (`firefox`) | WebKit build (`webkit`) | Safari | Firefox estável |
|---|---|---|---|---|---|---|---|
| Carregar sem erro de página nem requisição externa | sim · E1 | sim · E1 | sim · E1 | sim · E1 | sim · E1 | não verificado · L2 | não verificado · L2 |
| Leitura: fixture HTTP (`?layers=`) | sim · E2 | sim · E3 | sim · E3 | sim · E3 | sim · E3 | não verificado · M4 | não verificado · M5 |
| Leitura: repositório GitHub público | sim · E4 | sim · E4 | sim · E4 | sim · E4 | sim · E4 | não verificado · L2 | não verificado · L2 |
| Leitura: pasta local | sim · E6 | sim · E6 | sim · E6 | recusa · E7 | recusa · E7 | não verificado · L2 | não verificado · L2 |
| Leitura: arquivo `.zip` | não verificado · L3 | não verificado · M1 | não verificado · M2 | recusa · E7 | recusa · E7 | não verificado · L2 | não verificado · L2 |
| Edição em memória | sim · E5 | sim · E5 | sim · E5 | sim · E5 | sim · E5 | não verificado · M4 | não verificado · M5 |
| Diff simulado | sim · E5 | sim · E5 | sim · E5 | sim · E5 | sim · E5 | não verificado · M4 | não verificado · M5 |
| Gravação: rascunho, aprovar, rollback | sim · E6 | sim · E6 | sim · E6 | recusa · E7 | recusa · E7 | não verificado · M4 | não verificado · M5 |
| Gravação: seletor nativo e prompt de permissão | não verificado · L3 | não verificado · M1 | não verificado · M2 | recusa · E7 | recusa · E7 | não verificado · L2 | não verificado · L2 |
| Exportar versões completas | não verificado · L3 | não verificado · M1 | não verificado · M2 | recusa · E7 | recusa · E7 | não verificado · L2 | não verificado · L2 |
| Exportar/importar configuração | não verificado · L1 | não verificado · L1 | não verificado · L1 | não verificado · L1 | não verificado · L1 | não verificado · L2 | não verificado · L2 |
| Visual: profundidade 3D e fontes | não verificado · M3 | não verificado · M3 | não verificado · M3 | não verificado · M3 | não verificado · M3 | não verificado · L2 | não verificado · L2 |

## Evidências

Todas as execuções em 2026-10-14, nas versões acima.

| Id | Teste | Spec | Projetos |
|---|---|---|---|
| E1 | `Compat_TravalLoad_NoPageErrorNoEgress` | `e2e/browser-compat.spec.js` | os cinco |
| E2 | `Tree_<fixture>_MatchesSnapshot` (16 fixtures) | `e2e/tree-snapshot.spec.js` | `chromium` |
| E3 | `Compat_<fixture>_TreeMatchesChromiumSnapshot` (16 fixtures, mesma árvore do Chromium) | `e2e/browser-compat.spec.js` | `chrome`, `msedge`, `firefox`, `webkit` |
| E4 | `Compat_GithubRepoMocked_LoadsReadOnlyAndRefusesWrite` (GitHub simulado por `page.route`: nenhuma requisição real sai) | `e2e/browser-compat.spec.js` | os cinco |
| E5 | `Compat_FixtureEdit_DiffShowsSimulatedPatch` | `e2e/browser-compat.spec.js` | os cinco |
| E6 | `Apply_CardShadowOnConnectedFolder_RewritesOnlyTheRuleWithBakAndHistory`, `Rollback_AfterApply_RestoresOriginalFile`, `Rollback_FileChangedOutside_RefusesAndKeepsFile` (pasta no OPFS entregue por `showDirectoryPicker` simulado) | `e2e/apply-flow.spec.js` | `chromium`, `chrome`, `msedge` |
| E7 | `Compat_NoFsAccess_WriteEntryPointsNameTheBrowser` (conectar pasta, abrir `.zip`, rascunho e exportação recusam; aprovar e rollback são inalcançáveis sem pasta) | `e2e/browser-compat.spec.js` | `firefox`, `webkit` (pulado onde há File System Access) |
| E8 | `ExportLog_AfterDraft_HasSha256MatchingDisk` (evidência parcial da exportação: destino no OPFS, seletor simulado; afere só o `layers-export.log`, com o hash do rascunho; arquivos exportados e `layers-changes.json` não conferidos) | `e2e/write-log-hash.spec.js` | `chromium` |

Sondas de API por motor: `Compat_Probes_ReadPathEverywhereWriteTierAllOrNothing` contra `e2e/__snapshots__/compat-probes.json` (tabela legível no relatório, § 2). O corte entre os motores é exatamente a File System Access API: seletores de pasta, de arquivo e de gravação, e permissões de handle.

## Verificação pendente

Nenhum passo manual foi executado até 2026-10-14. Procedimento de cada um no relatório da S5.7, § 7.

| Id | Navegador | O que falta provar |
|---|---|---|
| M1 | Chrome instalado | seletor nativo e prompt `readwrite`, aprovar numa pasta real, reabrir após reload, exportação completa, abrir `.zip` |
| M2 | Edge instalado | igual ao M1 |
| M3 | os cinco projetos Playwright (PNGs de `Compat_TravalOrbit_ScreenshotsForManualReview`) | profundidade 3D após orbitar, Inter e JetBrains Mono renderizadas, painéis sem sobreposição |
| M4 | Safari no macOS | leitura de fixture, edição, diff simulado e recusa do rascunho |
| M5 | Firefox estável | igual ao M4 |

## Lacunas

| Id | Capacidade | Por que não verificado |
|---|---|---|
| L1 | Exportar/importar configuração (`layers-config.json`) | Nenhum teste em nenhum motor. A recusa sem File System Access existe no código (ver Mensagens), mas nenhum teste a exercita. Achado 2 do relatório da S5.7, candidato a folha própria. |
| L2 | Safari real e Firefox estável, fora das linhas que M4/M5 cobrem | Safari real e Firefox estável fora do escopo de M4/M5: só carga de fixture, edição, diff e recusa do rascunho. As demais células não têm teste nem passo manual nesses navegadores. |
| L3 | Coluna Chromium: `.zip`, seletor nativo e exportação completa | O build do Playwright não é usado à mão; ver M1 no Chrome, mesmo motor. Na exportação, E8 roda neste build mas é evidência parcial (ver Evidências). |

## Mensagens

Texto exibido quando falta a File System Access API (trecho literal do `index.html`).

| Entrada | Texto |
|---|---|
| Conectar pasta local… | `File System Access API indisponível — use Chrome ou Edge. Os ajustes seguem em modo simulado.` |
| Abrir arquivo .zip… | `Abrir .zip usa a File System Access API — abra no Chrome ou Edge.` |
| Gerar rascunho, Exportar versões completas (Aprovar recusa igual, inalcançável sem pasta) | `Este navegador não grava em disco — use Chrome ou Edge.` |
| Exportar configuração | `Exportar configuração usa a File System Access API — abra no Chrome ou Edge.` |
| Importar configuração | `Importar configuração usa a File System Access API — abra no Chrome ou Edge.` |
| Palco vazio | `Este navegador não tem a File System Access API — use Chrome ou Edge para conectar uma pasta.` |

## Sistema operacional

| Sistema | Estado | Fonte |
|---|---|---|
| Windows 11 | verificado: todas as execuções automatizadas | Versões testadas, acima |
| macOS | não verificado · M4 | sem Mac na máquina de referência |
| Linux | não verificado | nenhuma execução registrada |

## Ambiente de desenvolvimento

Só para servir e testar; o app em si roda no navegador.

| Item | Estado | Fonte |
|---|---|---|
| Node 24.19.0 LTS + npm 12.0.2 | verificado | [LOCAL-SETUP.md](LOCAL-SETUP.md) § Rodar, Toolchain (install limpo, `npm audit` sem vulnerabilidades, app sem erro de console) |
| Node 22.22.2+ ou 24.15.0+ com npm 12+ | requisito; versões-piso não verificadas | o piso vem do `engines` do próprio npm 12 ([LOCAL-SETUP.md](LOCAL-SETUP.md) § Rodar, Toolchain); `package.json` não declara `engines` |
| npm 10.9.2 | não suportado | falha conhecida no `npm install` ([LOCAL-SETUP.md](LOCAL-SETUP.md) § Problemas conhecidos) |
| Playwright 1.63.0 (E2E) | verificado | `package-lock.json`; precisa do Chrome e do Edge instalados e de `npx playwright install firefox webkit` |

## Como manter

- `npm test` falha em `test/support-matrix.test.js` nestes casos: a matriz diverge de `e2e/__snapshots__/compat-probes.json` (uma coluna por motor; gravação `sim` só onde há `showDirectoryPicker`, recusa só onde não há); cita um teste que não existe em `e2e/`; cita uma mensagem ausente do `index.html`; ou ainda cita M1/M2 depois que a linha "Compatibilidade" do checklist E for fechada.
- Mudar um texto de recusa ou um título citado exige atualizar a matriz no mesmo commit (o `npm test` reprova). Outras branches que mexam nos 6 toasts ou renomeiem testes citados (ex.: S3.4) devem cuidar disso.
- Ao concluir um passo M1-M5, troque as células `não verificado · M<n>` pela evidência e registre a data aqui e no relatório.
- Navegador atualizado: rode de novo `e2e/browser-compat.spec.js` (comandos no relatório, § 7) e atualize Versões testadas.
