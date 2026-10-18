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

## Limites conhecidos dos boards

- `Base` reproduz a UI a 1440×900 com larguras de painel (340 px, coluna de 384 px) e logo reais, medidos no app.
- Cobertura (43/64/93 %) e o projeto de 3 layouts do `S91Cobertura` são ilustrativos.
- Defaults dos boards: tema Grafite e seleção Âmbar, exceto o `Base`, que usa Coral (o default do app).
