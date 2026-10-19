---
title: "S3.5 × S9.1 — decisões do design conjunto"
type: spec
solution: Layers
status: draft
created: 2026-10-17
---

# S3.5 × S9.1 — decisões do design conjunto

Decisões do usuário sobre os boards do canvas `https://claude.ai/artifact/YAjnzs8CsEDpSbwpn5CCuJ` (export em [](../../design/ui-mock/README.md)), tomadas em 2026-10-17 antes dos plan-modes de código. Contexto: [](2026-10-17-s3-5-s9-1-sequencing-design.md) e plano [](../plans/2026-10-17-s3-5-s9-1-ui-mock-and-design.md).

| # | Decisão | Escolha | Consequência |
|---|---|---|---|
| 1 | Fluxo de múltiplos layouts (S9.1) | **V3 Híbrido** | Seletor LAYOUTS na barra inferior, acima de Camadas; modo Foco por padrão (um layout montado inteiro) e modo Espalhar configurável (todos ou 1–N, demais em LOD L0–L1, no máximo 2 shadow roots completos, aviso acima de 1.500 planos). Sugestão de fatiamento: Foco primeiro, Espalhar em fatia seguinte, medido contra `RELEASE-CHECKLIST.md` § D. |
| 2 | `states` × layouts | **Ortogonais** | Layout = tela distinta; state = variação da mesma tela; cada layout tem seus states. O `states` da raiz vira os states do layout implícito `main`. Sem migração do `layers.json` nem do CLI `--state`. Chave de pendentes passa a `<pendingKey>\|<layoutId>`; `stateMap` por layout; entradas antigas lidas como `main`. Dentro de um layout o `hash` continua por estado do mock; por isso a S3.5 grava um `srcHash` por requisição e deriva `confirm = r.srcHash !== hash` ao restaurar (sem marca persistente): trocar de estado marca, voltar desmarca. A S9.1 só precisa escopar a chave por layout. |
| 3 | Posição do painel Ajustes | **Manter onde está** (coluna esquerda, sob a Árvore, `index.html` ~339) | A Requisição entra no painel Ajustes real; a text-spec da S3.5 passa a dizer "painel Ajustes" em vez de "painel direito". Visual congelado preservado. |
| 4 | Persistência das Requisições Manuais | **Persistir como "alvo a confirmar"** | Ficam em `layers/v1/pending › requests[]`; se o hash do mock mudar, são mantidas marcadas para confirmação (os `changes` seguem descartados); não contam no Salvar. |

## Funções atuais em conflito (proposta do design, a validar no plan-mode de cada leaf)

| Função | Conflito | Resolução |
|---|---|---|
| `toggleFlat` / `flat` | flag global | `flat` e `explodeFrom`/`collapseAt` por layout; o dock mostra o do layout ativo |
| `selId` / `isoId` / hover | ids só são únicos dentro de um shadow root | chave `layoutId:nodeId`; clicar em outro layout o torna ativo |
| câmera | uma só na sessão | câmera por layout + câmera de visão geral do Espalhar |
| Camadas L0–Ln / Foco | contam o projeto inteiro | rail e Foco do layout ativo |
| `changes` / pending | uma entrada, hash de 1 mock | `change.layoutId`; uma entrada por layout; Aplicar junta tudo e deduplica `arquivo\|seletor\|prop` |
| escopo `all` | a mesma regra CSS pode estar em outro layout | aviso "também afeta <layout> (N usos)" |
| undo/redo | snapshots sem layout | pilha única; cada passo guarda o `layoutId` e foca o layout ao desfazer |
| `switchState` | relê o projeto todo | relê só o layout ativo |
| Recarregar / Reanalisar | supõem 1 mock | relêem os layouts montados; backup inclui todos os mocks |
| watch / drift | 1 mock | mtime dos mocks de todos os layouts; o drift diz qual layout |
| `interactions` | só o mock único | `interactions[].layout` opcional; `deadInteractions` por layout |
| botão direito | `onContextMenu = noCtx` bloqueava (`index.html` ~201) | resolvido na S3.5: `onStageCtx` abre o menu de contexto no lugar de `noCtx` |

## Divergências do código (S3.5)

Onde o que foi entregue difere dos boards `S35Menu` e `S35Requisicao`. Os boards continuam sendo a referência visual; as linhas abaixo são desvios conhecidos, não decisões novas.

| Item do board | Como ficou no código | Motivo |
|---|---|---|
| Selo do ramo explodido no canto inferior esquerdo | Canto inferior direito (`▤ Plana · ▧ ramo`) | O canto esquerdo fica sob a coluna da Árvore; o superior direito fica sob o dock |
| Dica do submenu cabe em 164 px (`L6+ → L5`) | A linha "Recolher até aqui" com a dica passa dos 164 px e a dica encosta no recuo direito | Mesmos estilos do board; a geometria desenhada já estourava. Largura congelada, não alterada |
| Planos recolhidos fantasma/tracejados e irmãos do ramo sem esmaecimento | Não implementados | Fora do escopo da fatia; o ramo só ganha profundidade (`branchZ`) e os planos recolhidos voltam ao plano daquele nível |
| `caminho` com `:nth-of-type` | Só os nomes das camadas L0..nó, unidos por ` > ` | O índice por tipo não existe no modelo de nós; o `nodeKey` (`arquivo\|seletor\|linha`) já ancora a busca |
| Nome do estado do mock no registro da requisição | Ausente do registro | A S9.1 traz o layout/estado como parte do escopo (`layoutId`, hoje fixo em `'main'`) |
| Versão do app no cabeçalho do Markdown | Travessão (`—`) | A interface não mostra versão em lugar nenhum |
| `Mostrar no palco` sempre ativo | Desabilitado quando a requisição está "alvo a confirmar" | O id posicional (`nodeId`) só descreve o DOM de um hash igual e é removido no restauro com deriva |

## Divergências do código (S9.1a)

Onde o que foi entregue na S9.1a (layouts, faixa LAYOUTS, modo Foco) difere dos boards `S91Fluxos` e `S91Cobertura`. Os boards seguem como referência visual; as linhas abaixo são desvios conhecidos, não decisões novas. Modelo, chaves e limites em [](../../ARCHITECTURE.md#layouts-s91a).

| Item do board | Como ficou no código | Motivo |
|---|---|---|
| Botão "Espalhar" e o glifo `⊞` | Ausentes; só o modo Foco | Espalhar (vários layouts montados, LOD, câmera de visão geral) é a S9.1c; evita também o choque de nome com o FOCO das camadas |
| Chip ativo com a borda `sel` e `selRgb` .16 (V3) | O chip ativo usa a variante **não solo** do rail de Camadas (preenchido com `accRgb` .15 e "●") | Reuso do estilo dos chips existentes (visual congelado). **Decisão visual do usuário pendente**: se a variante do board for a pretendida, troca-se só os tokens do chip em `renderVals` |
| Faixa LAYOUTS como linha da barra inferior | Pílula própria acima da barra de Camadas, com `gap` de 4 px | O 3 px do board é a 0,75 de escala; 4 px reais igualam o `gap` interno da barra. Cada linha encolhe ao conteúdo, e a barra de um projeto de um layout só mantém largura e posição |
| Tabela do board: "Aplicar junta tudo" | **Aplicar** e **Salvar** agem só no layout montado; os outros mostram badge de pendentes | Só um layout está montado (Foco); "Aplicar junta tudo" fica na S9.1c |
| Aviso do escopo `all` ("também afeta <layout> (N usos)") | Adiado | Exige contar usos em layouts desmontados; S9.1c |
| Undo/Redo com `layoutId` e watch/deriva globais | Valem só para o layout montado | Pilha única e watch global só fazem sentido com vários montados (S9.1c); o backup do Reanalisar já lê o mock de todos |
| Ajustes com grupos recolhidos por layout | Linha única `outros layouts: Nome (N), …`, só contagem | As requisições dos outros layouts são lidas do `layers/v1/pending` na carga; a lista delas só aparece ao abrir o layout |
| Custo do Foco: um shadow root montado | Trocar de layout recarrega o mock (como Trocar de estado) e mantém 1 shadow root | A linha de custo do board coincide; medido em [](../../RELEASE-CHECKLIST.md) § D: troca 175,1 ms contra recarga 181,2 ms (razão 0,97) |

## Divergências do código (S9.1b)

Onde o que foi entregue na S9.1b (Analisar cobertura) difere do board `S91Cobertura` e da spec [](2026-10-18-s9-1b-modelo-de-cobertura-mono-design.md). Os boards seguem como referência visual; as linhas abaixo são desvios conhecidos, não decisões novas. Fluxo, contratos e limites em [](../../ARCHITECTURE.md#cobertura-s91b).

| Item do board ou da spec | Como ficou no código | Motivo |
|---|---|---|
| Regra de decisão cobre mono ≥ 85 % e ganho ≥ 15 p.p. | Dois casos são preenchimentos do código: **mono < 85 % e ganho < 15 p.p.** vira "Monovisual (layouts não ajudam)" e **0 regiões** vira "Indeterminado" | O board não cobre esses dois casos; a decisão fica registrada aqui |
| Regiões vêm só do HTML estático | `.ts/.js/.tsx/.jsx` entram por regex de marcadores literais (`role="tab"`, `<dialog`, `aria-modal`, rota `#/nome`) com selo "confiança baixa", contando só em `cob_reg` | Decisão do usuário (2026-10-18); router por AST e docs de UI como dica ficam fora |
| Painel oculto e painel visível como regiões | Só o que nasce oculto (`hidden`, `display:none` inline ou em regra CSS de topo `#id`/`.cls`) vira região de painel; as regiões visíveis por padrão não viram região própria | Contam nos elementos da tela que as contém, então não somam em `cob_reg` |
| Aviso de varredura parcial do board | O texto virou "Varredura parcial: arquivos ou tamanho acima dos tetos; parte da pasta ficou fora." (linha do board editada) | O texto antigo nomeava a causa errada quando o teto de scripts (200 arquivos, 8 MB) estourava; mudar uma string é reversível |
| Subtítulo da regra 0 com o nome do projeto | Mostra só "0 regiões" | O board mostra só a contagem |
| Spec, decisão 8: `suggestLayouts(files, man)` | A assinatura real é `suggestLayouts(model, man, files)`; `files` segue na assinatura e não é lido | O modelo já traz as regiões e as telas candidatas |
| Regra 4 ("dividir") | Só dispara com o melhor monovisual ≥ 85 % e um layout acima de 1.500 planos | A redação do board é ambígua; o código segue a spec (regras 2 e 4 só sob mono ≥ 85 %) e, com cobertura menor, vale a regra 3 |

## Divergências do código (S9.1c)

Onde o que foi entregue na S9.1c (Espalhar) difere do board `S91Fluxos` (V3) e da spec [](2026-10-19-s9-1c-espalhar-lod-design.md). Os boards seguem como referência visual; as linhas abaixo são desvios conhecidos, não decisões novas. Fluxo, contratos e limites em [](../../ARCHITECTURE.md#espalhar-s91c).

| Item do board ou da spec | Como ficou no código | Motivo |
|---|---|---|
| Seleção e hover com `layoutId:nodeId` | O layout ativo segue com ids simples; `layoutId:nodeId` só existe no hover transitório do plano LOD (`state.lodHover`) e na resolução do clique | Os ids só são únicos dentro de um shadow root e só o ativo aceita seleção; mudar o formato quebraria Árvore, Camadas, Ajustes e `planeCensus` |
| LOD como montagem parcial dos layouts | **Varredura rasa** (`scanRoot` com `maxDepth: 1`, profundidade ≤ 1) num host temporário descartado a cada layout; os ids são subconjunto dos da varredura cheia | Mantém 1 shadow root vivo; clicar num plano LOD seleciona o mesmo nó depois da troca |
| Popover com 2 segmentos (Ver todos, Selecionar 1–N) | **3 segmentos Foco \| Todos \| 1–N**: Foco é o Espalhar desligado; as linhas de layout e o slider só aparecem fora do Foco | Decisão 8 da spec (o "Foco" de layouts é o Espalhar desligado, sem botão novo no dock); "Ver todos" virou "Todos" e "Selecionar 1–N", "1–N" |
| Fontes e tamanhos literais do botão e do popover | Na escala do app (o board desenha o dock a ~0,72×): botão de 11 px e 24 px de altura (board 8,5 px e 17 px), título 10, segmentos 11, linhas 12, contagem 10, distância 11, caixa do checkbox 13 px (board 10 px); tudo multiplicado por `--fs`. Largura 176 px, `right:10`, `bottom:52`, cores, bordas, raio e sombra seguem o board | Mesma razão dos irmãos da faixa LAYOUTS (visual congelado: o botão tem que ter o tamanho dos chips) |
| Slider de distância como linha de 2 px | `input type=range` com `accent-color: var(--sel)` | Padrão dos outros sliders do app |
| Selo com o total de planos | A linha `Total: N planos` e o aviso ficam **só dentro do popover**; no botão aparecem apenas o `⚠` e um `title` com o aviso acima de 1.500 planos | O botão é do tamanho de um chip; um selo o alargaria e deslocaria a faixa |
| Texto do aviso de 1.500 planos | O board não traz a frase; usa-se `Acima de 1.500 planos (N): a órbita pode degradar. Selecione menos layouts.` (não bloqueante) | Mudar uma string é reversível |
| Retrato cheio do último ativo como o LOD | `dim` sólido `.35` (borda contínua) para o retrato cheio e tracejado `.45` para o LOD, como o board | O board distingue os dois modos |
| Bordas internas `.45` dos níveis d > 0 na página ativa | **Não desenhadas** | `Plane` já codifica seleção, hover, camada e wire nas bordas; o visual do ativo é congelado (limite 11 do Espalhar) |
| Câmera de visão geral: `cam()` com a pegada `N·pageW + (N−1)·gap` | O mundo é `scale(zoom) scale3d(fit,fit,fit)`, com `fit` de `LayersCore.overviewFit` (bisseção sobre a caixa projetada); o zoom é 2D fora do `scale3d`. A câmera de visão geral não está em `state.spread.cam`: é a câmera comum e a normal fica em `this.normalCam`; `spread.cam` só existe na entrada de sessão | O `scale(fit · zoom)` do Foco colapsava o `fit` (~1,9e-4 a 1280×760) e empurrava páginas distantes para trás do olho; espelhar a câmera no `state.spread` por quadro de órbita anularia as memoizações |
| Slots por `spreadOffsets` sobre os escolhidos (R12) | Os offsets valem para as páginas **desenhadas**: layouts indisponíveis são compactados para fora e as páginas seguintes se deslocam uma vez quando uma leitura em voo vira indisponível | Um slot vazio no meio do palco não ajuda ninguém |
| Edição entre layouts (undo com `layoutId`, watch global, "também afeta …", Aplicar junta tudo) | Adiada para a leaf **S9.1d**; com o Espalhar ligado só o ativo aceita seleção, edição, Árvore, Camadas, Interagir e menu de contexto | Pede pilha única com `layoutId`, contagem de usos em layouts desmontados e watch de vários mocks |
| Retratos congelados | Não acompanham mudanças em disco até Recarregar, Reanalisar ou reconectar; as fontes de um layout não ativo não sobem para o documento (a geometria pode usar a fonte de fallback) | Um retrato é um instantâneo barato; subir fontes quebraria o invariante de uma só folha `@font-face` |

## Limites conhecidos dos boards

- `Base` reproduz a UI a 1440×900 com larguras de painel (340 px, coluna de 384 px) e logo reais, medidos no app.
- Cobertura (43/64/93 %) e o projeto de 3 layouts do `S91Cobertura` são ilustrativos.
- Defaults dos boards: tema Grafite e seleção Âmbar, exceto o `Base`, que usa Coral (o default do app).
