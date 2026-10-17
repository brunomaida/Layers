---
title: "LAYERS — Atalhos e interações"
type: reference
solution: Layers
created: 2026-10-16
---

# LAYERS — Atalhos e interações

Conteúdo do painel `?` do editor (a tecla `?` abre e fecha o painel) e o que ele não diz: onde as teclas não valem, a ordem do Esc, os campos com teclas próprias e os menus. As ações que cada projeto define no menu ⚡ Interagir estão em [layers-json.md § interactions](layers-json.md#interactions).

Ctrl vale também como Cmd no macOS: o editor trata Meta como Ctrl nos atalhos de teclado e no arrasto. As tabelas repetem o painel ao pé da letra e por isso dizem só Ctrl.

## Atalhos

Geradas de `LayersCore.SHORTCUTS` (`lib/layers-core.js`); `test/shortcuts.test.js` falha se divergirem.

### Câmera

| Tecla ou gesto | Ação |
|---|---|
| scroll | zoom no ponto do cursor |
| arrastar | orbitar (giro + inclinação) |
| shift + arrastar · botão do meio | pan na tela |
| ctrl + arrastar | pan no plano da página |
| ← → ↑ ↓ | pan · com shift: no plano |
| Q / E | girar |
| W / S | inclinar |
| + / − | zoom |
| = | zoom + (a mesma tecla do +, sem shift) |
| F | enquadrar a seleção |
| C | centralizar sem mudar o zoom |
| 0 | recentrar a câmera |

### Seleção

| Tecla ou gesto | Ação |
|---|---|
| clique | selecionar elemento |
| duplo clique | isolar o ramo + enquadrar |
| alt + clique · ⚡ Interagir | disparar o clique nativo do elemento no mock (checkbox, radio, details) |
| duplo clique no fundo | sair do isolamento · recentrar |
| ↑ Pai | subir para o elemento pai |
| Esc | fechar painel, lista ou menu aberto · sair do isolamento · sair da camada solo · limpar seleção |

### Camadas

| Tecla ou gesto | Ação |
|---|---|
| PgUp / PgDn | camada ativa acima / abaixo |
| chip L0…Ln · clique | mostrar só essa camada |
| chip L0…Ln · hover | foco: frame da camada + atenuação das demais |
| Todas | voltar a mostrar todas |
| Explodido / Plano · Distância | espaçamento entre camadas |
| Frames · Intensidade | wireframe dos contêineres sem fundo/borda |
| Foco de camada · Destaque · Demais | liga o foco por hover/clique nos chips; Destaque = intensidade da camada em foco, Demais = opacidade das outras |
| chip · hover com seleção ativa | foca só os elementos da camada dentro do ramo selecionado/isolado |

### Árvore de camadas

| Tecla ou gesto | Ação |
|---|---|
| hover | destaca o frame do elemento no palco |
| clique | selecionar |
| clique no palco | seleciona e rola a árvore até o elemento |
| { } · ⊟ (barra da aba) | recolher todos os códigos abertos · recolher todas as linhas (só recolhem) |
| { } na linha | abrir / fechar o código daquele elemento ou regra (padrão: oculto) |
| ⌕ Buscar camada · Destacar / Filtrar | destaca ou mostra só as camadas cujo nome contém o texto (Esc limpa) |
| Hierarquia / Elementos | árvore do DOM · definições de estilo (arquivo › regra) sem repetição, com usos e código |
| { } (Hierarquia) | mostra o código do elemento selecionado logo abaixo dele; Aplicar respeita "Aplicar em" |
| Elementos · regra ▾ | lista os usos + textarea com o código; ctrl+Enter ou Aplicar grava em todos os usos |
| duplo clique | isolar o ramo |
| ▾ / ▸ | expandir / recolher o nó |

### Propriedades

| Tecla ou gesto | Ação |
|---|---|
| ● ● ● (cores de origem) | declarada na regra · herdada de regra acima · editada na sessão — paleta em Aparência › Cores de origem |
| chips declarada / herdada / editada | filtram as propriedades por origem (combináveis) |
| ⌕ Buscar propriedade · Destacar / Filtrar | por nome, propriedade CSS ou título da seção |
| ⊟ / ⊞ | recolher / expandir todas as seções |
| P · » / « | recolher / expandir o painel de propriedades |
| Enter | aplicar o valor do campo |
| Esc (no campo de texto) | descartar a edição e sair do campo |
| Aplicar em | alcance: perguntar · só este · todos iguais |
| ▾ título do grupo | recolher / expandir o grupo |

### Edição

| Tecla ou gesto | Ação |
|---|---|
| Ctrl + Z | desfazer o último ajuste (propriedade ou código) |
| Ctrl + Shift + Z · Ctrl + Y | refazer |

### Geral

| Tecla ou gesto | Ação |
|---|---|
| ? | abrir / fechar este painel |
| M | ligar / desligar as medidas no palco |
| R | recarregar o projeto do disco (pasta local) |
| ⚡ Interagir | superfícies e ações definidas pelo projeto em layers.json › interactions |
| Ações ▾ | ver diff · aplicar nos arquivos · exportar |

## Contextos

### Campos de texto

Com o foco em qualquer controle de formulário (`<input>` de qualquer tipo, `<textarea>`, `<select>`), nenhuma tecla simples dispara. Com Ctrl ou Cmd pressionado, as teclas simples também não disparam.

- Ctrl/Cmd+Z e Ctrl/Cmd+Y ficam com o navegador num campo de texto e num `<textarea>`.
- Em controles não textuais (slider, cor, checkbox, radio, botão) e no `<select>`, Ctrl/Cmd+Z e Ctrl/Cmd+Y desfazem e refazem o ajuste global, e o Esc não faz nada (o editor ignora controles de formulário e eles não têm handler próprio).
- Campo de propriedade de texto: Enter aplica o valor e sai do campo. Esc descarta o valor digitado, restaura o anterior e sai do campo, sem registrar nada em Ajustes. A linha `Esc (no campo de texto)` do painel diz o mesmo.
- ⌕ Buscar camada e ⌕ Buscar propriedade: Esc limpa a busca e sai do campo.
- Campo do repositório GitHub (menu Projetos): Enter registra, Esc cancela.

### Esc em cascata

Vale com o foco fora dos controles de formulário; num campo de texto age o Esc do próprio campo (acima). Cada Esc fecha só o primeiro item aberto, nesta ordem:

1. painel de atalhos (`?`);
2. prompt "Aplicar em" (Esc equivale a "Só este", não a cancelar);
3. diff;
4. modal;
5. dropdown de valor;
6. menu (o foco volta ao gatilho se estava dentro do menu);
7. isolamento (sai e recentra);
8. camada solo;
9. seleção (volta à raiz e à camada 0).

### Ctrl/Cmd + Enter

Nos textareas de código (regra em Elementos, elemento em Hierarquia e painel Propriedades), aplica o código. Nesses campos o Esc só sai do campo.

### Recarregar com `R`

- Sem pasta conectada, não faz nada. Durante uma carga, também não.
- Com diff, modal ou prompt "Aplicar em" aberto, só avisa ("feche o painel aberto antes de recarregar"). O painel `?` aberto não bloqueia.
- Com edições não salvas, pede confirmação ("Recarregar projeto?") e descarta as edições ao confirmar.

### Menus

Projetos, Aparência, ⚡ Interagir e Ações abrem por hover e fixam por clique. Fecham com Esc, clique fora, foco saindo do menu, item de ação ou 260 ms depois de o mouse sair (se não estiverem fixados). Tab e Enter são os nativos do navegador; não há navegação por setas nos itens.

### Interações do projeto

alt + clique (ou o modo ⚡ Interagir) dispara o clique nativo do elemento no mock; nesse modo, o duplo clique no palco não isola (na linha da árvore, o duplo clique continua isolando). Os chips (`toggle`, `show`, `hide`, `class`, `click`, `attr`, `hint`) estão em [layers-json.md § interactions](layers-json.md#interactions), e a ação `attr` em [layers-json.md § attr](layers-json.md#attr).

## Como manter

Mudar um atalho = editar `LayersCore.SHORTCUTS` e o handler juntos, regenerar as tabelas com o comando `node` do Task 2 Step 2 do plano `docs/superpowers/plans/2026-10-16-s7-4-shortcuts-doc.md` e rodar `npm test`.
