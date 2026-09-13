---
type: spec
status: superseded
solution: Layers
---

# Projeto de Edição Visual das estruturas visuais de uma Página Web
- Frameworks: typescript, javascript, html, html5, css
- Objetivo: Criar um ambiente 3D, em perspectiva, para expandir/explodir, quando solicitado, os componentes de painéis, frames, chips. Ao lado, de forma 2D, um painel com as principais propriedades de design (padding, border, margin, corner, archors, aligments, colors, transparency, visibility, position, size,...) para serem ajustadas.
- Dinâmica: 
  - O mecanismo deve ser capaz de ler o diretório completo do projeto, mapear os arquivos de design fixo, design em tempo de uso, estilos e outros para conseguir carregar fidedignamente o wireframe do projeto. Seria interessante poder carregar dados e simular a estrutura para avaliar como o design se altera de acordo com o uso (se possível,ou talvez numa fase 2).
  - Navegar entre os componentes para acessar componentes específicos e editar/ajustar propriedades para facilitar a edição de design. Incluir botão Salvar/Cancelar para escrever as alterações nos arquivos. Em um painel, mostrar tudo que já foi ajustado (De -> Para)
  - Toda nova edição inicia uma branch nova que ao finalizar a edição e com aprovação do usuário, faz commit no repositório local
- Visual:
  - Fundo escuro ou claro, com os wireframes/paineis/elementos gráficos bem destacados mas com cores simples
  - Permitir com o movimento do mouse, navegar pelas camadas abertas/explodidas sendo que a camada mais superior da interface fica no fundo e a mais recente/micro-painéis, labels, chips e outros, fiquem mais para frente. è importante identificar o total de camadas que a interface tem para dimensionar corretamente a visualização.
  - A distância entre camadas não pode ser muito grande nem muito pequena e deve ser possível selecionar a camada
  - Uma base para o projeto é a forma de visualização dos backups da timemachine da apple
  - Não será necessário redimensionar nada na interface, ela é apenas um mecanismo visual de entendimento da hierarquia de alocação de objetos e componentes gráficos no layout final.
- Desafio: 
  - Entedimento visual do projeto, interface clean e consistente, dinâmica de alteração de propriedades bem estruturada.
  - Validar se é necessário interpretar/visualizar uma página web local com a interface + leitura do diretório do projeto para entendimento correto de toda estrutura
  - O processo, quando pronto, não deve depender de IA.

Quaisquer dúvidas sobre a dinâmica visual, os eixos 3D, comandos e movimentação com o mouse, devem ser questionados. Experiência e facilidade do usuário são fundamentais.
Se possível, use o projeto C:\Development\Traval para construir a 1a versão. 

#-------------------------------------------------------------------------------------------------------------

# Alterações v2.0:
- Propriedades menu lateral:
  - Quero que os controles laterais identifiquem qual é o controle selecionado e mostre, para ele, a principais propriedades, como já listadas, sendo que nas propriedades, seja possível escolher os possíveis parâmetros através de sliders, combobox, up-down, já com as opções embutidas.
  - A lista de Ajustes De -> Para deve ser mostrado em um outro painel, flutuante do lado esquerdo inferior, colapsável/expansível, com todas propriedades alteradas e respectivos arquivos, configurações, linha de código. Este novo painel deve ter um botão com as opções de Diff, aplicar nos arquivos, exportar novas versões completas dos arquivos editados em diretório escolhido.
- Controle do Mouse:
  - Quero dissociar o zoom do mouse com a seleção das camadas o Zoom serve apenas para observação
  - Quero poder, com o mouse, mover para a esquerda ou direta, deslocando o desenho num eixo 2D. Aatualmente, a imagem plano/explodida só gira em torno do seu eixo. Acho que um bom atalho seja segurar a tela shift que trava o plano apenas permitindo movimentação no eixo X,Y.
  - Com os novos recursos de navegação, quero evitar que a imagem seja virada de cabeça para baixo, dificultado navegação e isolamento de componentes.
  - A seleção do componente no layout explodido pode ser feito com o mouse o clicando em uma das camadas abaixo, isolando-a para navegação
- Visualização
  - Ao clicar no exemplo, no painel direito de traval, onde estão os es	
  - Existem uma série de visualizações que mudam quando um checkbox é selecionado ou click no mouse é feito
- Atualmente, ao isolar um elemento e seus filhos, ele permanece na posição original, muitas vezes no canto da dela. Por isso que precisamos de comandos fáceis para reposicionar e trabalhar sua visualização com precisão (centralização, zoom, giro, pan2d, pan 3d).
- Cenário:
  - Alterei de 8.25 para 7 uma fonte em src/styles/dashboard.css .tile (.value L6) na linha L148 em um elemento que tem vários irmãos com as mesmas propriedades. Para estes casos, precisamos incluir um prompt/seleção ou modo de escolha que permita edição individual do elemento ou para todos estes elementos, assim a mudança é replicada, na interface de modo uniforme para todo mundo. (atualmente só aplica para o elemento selecionado).
  - No menu de configurações, ele atualmente só traz o menu e elementos gráficos da aba GERAIS, ou seja, não temos como acessar a interface das outras abas: precisamos de um recurso para isso.

#-------------------------------------------------------------------------------------------------------------

#Ajustes para implementar na v2.1:
- O que tiver dúvidas e precisar esclarecer, me pergunte.
- Apenas assuma e defina o que tiver certeza.
- Crie nova página, assim como fez na v2 para isolar as versões.

Painel Lateral Direito:
- Isolar melhor, os headers das propriedades, permitindo expandir/recolher o painel com suas respectivas propriedades/campos
- Validar se ainda existem propriedades de elementos CSS, Html, html5 (e outros) que ainda não estão listadas mas são completamente relevantes para definir/ajustar o layout
- Validar se o cabeçalho superior com nome do componente, definição do estilo, localização no arquivo, nome do arquivo, tem espaço suficiente para mostrar todo o texto quando os nomes forem grandes.

Chips de Camadas (tela principal - parte inferior)
- Alinhar horizontalmente o central do label CAMADAS com os chips L1....L(n)
- Incluir novo mecanismo de Manipulação Visual de Camadas:
  - Ao passar o mouse pelos chips das camadas, mostra um frame destacado, com bordas (similar de quando o chip TODAS está selecionado), contendo todos os elementos desta respectiva camada e atenuando a visualização dos demais (camadas inferiores e superiores). O objetivo é melhorar o foco dos componentes da camada.

Visualização das camadas
- Fazer com que wireContainers seja uma configuração no header de ajustes visuais superior e criar um slider para deixar os frames mais ou menos destacados (transparência e ou cores) - Valide que o que fica melhor.
- 

Novo Painel lateral superior esquerdo
- Posição: mesmo alinhamento vertical e largura do painel flutuante de AJUSTES (inferior esquerdo), que pode expandir e recolher. Máxima altura: 60% da altura do painel central. Quando ambos painéis esquerdos estiverem expandidos, nunca devem se sobrepor e deve haver um espaço mínimo entre eles.
- Será a representação, em forma de árvore, dos elementos de cada camada.
- Cada camada estará em um nível hierárquico, com seu nome (ex: L0 .shell (3) -> L1 .overlay-layers (n1).., .chart-stage(l2) e assim por diante), quantidade de filhos, assim como temos no header superior do painel direito.
  - Ao passar com o mouse em cima, destaca na interface central o frame que o contém
  - Ao clicar 2x, isola esse componente na interface central

Painel Lateral esquerdo (AJUSTES):
- Máxima altura: 35% da altura do painel central
- Quando a quantidade de itens exceder, incluir uma barra de rolagem vertical
  
Dicas de comandos visuais:
- Criar um painel para listar estes comandos, de forma melhor organizaa por categoria, acessível através de um botão chamado "ATALHOS", no menu superior, que contém as SUPERFÌCIES, PAINEL, Câmera, etc.

#-------------------------------------------------------------------------------------------------------------

#Ajustes v2.2

Painel Lateral Direito:
- A identificação de cada sessão está ruim. Preciso de 3 novas sugestões de layout para o painel que deixe o header da sessão em maior destaque visual, fonte/fundo.
- Ordene as sessões por ordem alfabética para facilitar identificação e posicionamento

Painel Superior Configurações Visuais:
- Ao longo das versões, as configurações e ajustes visuais de SUPERFICIES, PAINEL< DISTANCIA, FRAMES e FOCO de CAMADA foram enfileirados sem critério.
- Quero estruturar o visual com elementos que facilitem a identificação e ajustes dos parâmetros: Proponha 3 layouts. Use Chips padronizados para funcões similares. Use hierarquia se necessário, diferenciação de fundo, fonte (tamanho e cor), mas mantenha o header na altura que está para economizar layout.

#-------------------------------------------------------------------------------------------------------------

#Ajustes v2.3:
- O que tiver dúvidas e precisar esclarecer, me pergunte.
- Apenas assuma e defina o que tiver certeza.
- Crie nova página, assim como fez na v2 para isolar as versões.

Seleção de elementos visuais no gráfico:
- com 1 ou 2 clicks, focar o elemento na árvore de camadas e fazer o scroll até ele (caso esteja invisível: abaixo/acima)

Painel Lateral Direito:
- Encontrar uma maneira de colorir/destacar o textbox, titulo do campo, combobox ou conjunto da propriedade que tiver valor explícito no arquivo css ou definição html/js/ts : ajudará a diferenciar propriedadades setadas de novas propriedades que devem ser incluídas.

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.4:
- Árvore de Camadas:
  - incluir um pequeno painel abaixo do título como campo de busca para selecionar apenas os itens com determinado texto inputado: escolher entre filtrar ou apenas highlight

- Painel direito de propriedades:
  - possibilidade de clicar no chip correspondente à propriedade DECLARADA, HERDADA, EDITADA como toogle chips (1-N selecionados)
  - Incluir campo de busca de uma propriedade no estilo selecionado ou header/sessão a partir do texto digitado (opção de filtrar ou apenas highlight)
  - Incluir comando discreto para expandir/recolher todas sessões

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.5:
- Árvore de Camadas:
  - Incluir tabstrip com 2 abas para escolher em árvore hierarquica do projeto (HIERARQUIA) ou hierarquia de elementos gráficos (ELEMENTOS).
  - Na nova hierarquia de elementos, deve-se construir a árvore, sem repetição de elementos, mas ao expandir:
    - mostrar a lista de componentes gráficos que usam esta definição/estilo
    - colocar código ts/js/css/html que define este estilo para edição manual.

- Painel direito de propriedades:
  - highlight da busca na cor atual ficou estranho para o labels mais apagados, tornando difícil a leitura. Precisamos de nova cor tanto para esta busca quanto para a árvore de camadas.

# Correções v2.5:
- Árvore de Camadas: 
  - tab HIERARQUIA quando selecionado, fica com altura muito menor do que quando a tab ELEMENTOS é selecionada
  - chip com total de elementos no header "ÁRVORE DE CAMADAS" deve ir para a tab HIERARQUIA (assim como temos em ELEMENTOS)
  - incluir a síntese do mock(definição do elemento) na árvore de HIERARQUIA para edição manual (fácil acesso ao código)
- Painel direito de propriedades:
  - Cor de highlight continua ruim. Agora ficou escuro demais o fundo. Vamos pintar de laranja, como foi colocado inicialmente, e os labels que possuem cor escura, se tornam brancos, para destaque.

#-------------------------------------------------------------------------------------------------------------

# Correções v2.6:
- O que tiver dúvidas e precisar esclarecer, me pergunte.
- Apenas assuma e defina o que tiver certeza.
- Crie nova página, assim como fez na v2.5 para isolar as versões.

Árvore de Camadas:
- Pedi para ajustar altura, mas não falei do painel inteiro, mencionei a altura do componente tab HIERARQUIA da tabstrip: ela fica achatada. Retornar a altura do painel total para a anterior (65% da altura do painel principal).
- Permitir recolher/expandir o código do estilo a partir da linha selecionada.
- Ícone para recolher todas linhas expandidas nas abas HIERARQUIA e ELEMENTOS

Painel direito de propriedades:
  - logo abaixo dos chips PAI/MOSTRAR TUDO/ENQUADRAR, incluir campo para mostrar o código do componente, permitindo expandir/recolher. Propriedades condizentes com as que são mostradas nos campos das sessões editáveis.

Painel inferior esquerdo AJUSTES:
- Atualmente, o painel pode ter até 30% da altura do painel principal, mas se forem muitas alterações, o conteudo fica expremido e a barra de rolagem muito grande. Gostaria de tentar uma integração ou coexistência com o painel da árvore de Camadas. Qual seria sua sugestão?

#-------------------------------------------------------------------------------------------------------------

# Correções v2.7: PERFORMANCE

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.8:
- O que tiver dúvidas e precisar esclarecer, me pergunte.
- Apenas assuma e defina o que tiver certeza.
- Crie nova página, assim como fez na v2.7 para isolar as versões. (O melhor é partir de 2.7 ou 2.7-b?)

Árvore de Camadas:
- Por padrão, todos os códigos ficam ocultos. Usuário apenas habilita/desabilita a visualização, mesmo com click/seleção do componente na interface
- Tab HIERARQUIA tem um { } ao lado de Filtrar. Quero que a aba ELEMENTOS também tenha. AMBOS botões nas abas apenas para recolher tudo - botão não permite expandir tudo.

Painel Direito de propriedades:
- Tornar padrão o modo "Barra de Acento" para os headers das sessões, mas incluir as mesmas funcionalidades que foram implementadas em "Faixa sólida" para mostrar quantidades de props, declaradas, herdadas, editadas. Resuma o conteudo para o número de propriedades + letra inicial (D - declarada, H - herdada, E - editada).

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.9:
- O que tiver dúvidas e precisar esclarecer, me pergunte.
- Apenas assuma e defina o que tiver certeza.
- Crie nova página, assim como fez na v2.8 para isolar as versões.
- Não se esqueça que a essência de LAYERS é a simplicidade e velocidade de visualização/acesso a informações rapidamente.

Introdução de temas:
- Criar 2 outros temas, baseados no atual (Dark). Propor 3 sugestões para cada um.
  - Gray: Médio, combinação de tons de cinza claro, médio, escuro para contraste visual e pouco impacto visual. Uso de cores que destacam no cinza claro/médio/escuro.
  - Bright: Mais claro, fundos quase brancos/cinza claro. Uso de preto/cinza escuro em poucas circunstâncias. Uso de cores menos vivas mas coloridas e mais pro escuro.
- No tema atual, Dark, os sliders dos headers e paineis tem um tom de azul que destaca muito. Proponha outros 3 tons mais suaves/não tão claros/coloridos.

Tweaks toolbarLayout:
- Gostei da proposta de Capsulas/Segmentado mas contém muitas linhas e bordas. Quero algo mais sutil, simples e sofisticado. Use sua criatividade para propor novo layout e use a mesma lógica para os temas mais claros.

Painel Direito de Propriedades:
- Incluir possibilidade de recolher/expandir com ícone/comando pequeno, sutil, visivel e prático
- Propor 3 novos layouts para o header, desde a parte que contém informações do componente, até o campo da busca. as funções são bastante úteis e com visual ok, mas parecem estar empilhadas/socadas, confundindo um pouco a separação visual de propósito. Mantenha simplicidade e destaque usando chips, cores, fundos e fontes diferentes (cor, tamanho, estilo).

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.10:
Tweaks:
1) toolbarLayout:
- Gostei do "Etéreo" mas as sessões/paineis poderiam ser segmentados por um background de fundo um pouco mais escuro (para todos temas), ajudando a identificacar as sessões de funcionalidade. Talvez colocar um ">" colorido (com a cor do tema, ex: azul no dark), destaque a sessão. Ex: > SUPERFÍCIES
2) Theme:
- Permitir escolher a cor principal usada na seleção do objeto/hover dos elementos quando passa o mouse pelas camadas. Ex: Gostei do Cinza Ardósia, mas a cor vermelho claro/laranja vivo do elemento gráfico selecionado combina mais com tema "3 Cinza Quente". Dessa forma conseguimos combinar da forma que o usuário preferir.
3) Perspective
- Incorporar como configuração no header de ajustes visuais
4) baseAngle e dimOthers: Remover
5) sectionHeader: remover e deixar Barra de Acento como padrão
6) accent: incluir um Cinza claro, cinza médio e cinza escuro

Painel Central - Componente "Explodido"/Selecionado:
- Ao passar o mouse(hover), pelas camadaas (nos chips abaixo), usar o mesmo tom/cor do elemento selecionado mas 20% mais fraca para ressaltar os itens da camada.

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.11:

Conversa anterior parou no meio por limites de uso (mantenha v2.10):
- Estava refinando o design: Traval Layer Editor v2.10.dc.html > Complete o que falta.
Ações:
- Diminua em 15% as dimensões de altura dos sliders (aliás, coloque um tweak com um slider para definir a cada 5 pontos/%)
- ao selecionar a cor no twaek "selectColor", aplicat também no nome do arquivo que fica no painel direito (abaixo do nome do componente/estilo. Aplique também onde mais fizer sentido. Além disso, é possível, padronizarmos, a partir da cor central do tema, as cores de origem (DECLARADA, HERDADA, EDITADA) seguindo esse padrão e variando intensidade/claridade? Crie uma variação para isso também para facilitar visualização e definição.

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.12:
Na Árvore de Camadas:
- Item selecionado/Isolado pintar label com cor do tema escolhido "selectColor"
- Ao fazer o hover do item, incluir funcionalidade:
  - à esquerda do ícone que mostra o código para recolher os filhos um nivel abaixo
  - outro ícone à direita de recolher para isolar o componente (similar ao dupli clique)

Tweaks:
- Transformar todos em configurações mas
  - remover sliderScale com padrão 100%
  - remover accent com padrão Cinza Médio
- Ao transformar em configuração, temos que ter cuidado com o espaço utilizado, uma vez que temos já grande parte ocupando quase toda extensão horizontal. Como podemos seguir? Nova estruturação de alocação seguindo o layout visual atual?

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.13:
Header de Configurações Visuais:
- Centralizar menus
- Incluir um slider de tamanho proporcional de fonte que aumenta/diminui de forma geral, todos os textos dos headers, paineis, configurações, ações, atalhos, menos dos elementos da vista flutuante. Colocar o padrão atual como 30-40% do tamanho e fazer o passo/step o menor possível
- No menu APARÊNCIA, colocar todos os combobox com a mesma largura, respeitando o elemento que precisa da maior largura.
- Aumentar em 50% o tamanho dos ícones de triangulo ao lado direito do label do MENU
- Ao mudar a cor padrão em COR DE SELEÇÂO, ajustar o logo/label LAYERS no topo superior direito para um degrade randômico, contendo como base, a cor selecionada (as outras 2-3 cores extras são escolhidas de forma aleatória)

Menu lateral Esquerdo:
- Permitir expandir/recolher os menus ÁRVORE DE CAMADAS e AJUSTES ao clicar em qualquer lugar do header

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.14:
Header Principal (titulo/repositório\conexão de pasta\..\salvar):
- Combinação visual de fundo não funciona quando alterada APARÊNCIA > COR DE SELEÇÃO: Corrigir e não variar as outras cores, fazer um degradê baseado na cor principal
- Centralizar o logo LAYERS no centro do Header
- Colocar o simbolo > (na cor de seleção escolhida) antes do nome do projeto/pasta
- Botão Salvar ainda está em azul. Ele precisa de fundo normal e quando for feito hover, fica da cor da Seleção

Chips de Camadas no Gráfico:
- Centralizar baseado na largura total da tela (assim como os menus de configurações visuais no menu superior)

Painel lateral direito:
- Ao expandir o código, a borda do componente que contém o texto do estilo/código css/html está com borda verde. Cor precisa ser a mesma escolhida em APARERENCIA > COR DE SELEçÃO. Verifique também se mais algum ponto na interface tem essa inconsistência.

Menus de Ajustes Visuais:
- Todos sliders passam a sensação de dúvida se estamos aumentando ou diminuindo. Precisamos de uma referência de valor (min, max e atual) de forma bem distribuída e sutil na interface, respeitando os temas e cores.
- Ao colocar o mouse em cima do menu, colorir a esfera ao lado do label com nome do menu da cor de seleção para destaque
- Verificar todas as cores de esferas antes dos labels que uma parte delas está com cinza mais escuro e outras com cinza mais claro. Manter o mesmo tamanho para todas e cinza mais escuro (mesmo de SUPERFICIES, PAINEL, VISTA)

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.15:
- O que tiver dúvidas e precisar esclarecer, me pergunte.
- Apenas assuma e defina o que tiver certeza.
- Crie nova página, assim como fez na v2.14 para isolar as versões.

Painel Lateral direito:
- Permitir ampliar, do tamanho atual, mais 25% da largura mínima

Painel Flutuante de controles clicáveis (posição/perspectiva/....)
- Permitir minimizar e reposicionar dentro do painel: tentar usar padrão já usado em algum dos painéis.

Ajustes viuais de VISTA e FRAMES (menu visual superior):
- Remover deste painel e transferir para a parte superior do painel central (oposto dos chips de camadas), tornando-se visíveis e mais fáceis de ajustar (mais usados)
- Os sliders que ficarão expostos agora mostram os labels direito e esquerdo apenas quando o slider estiver hover/clicado com os valores lateriais mais sutis e o valor atual acompanhando a esfera e mais destacado (branco/efeito um pouco glow)
- EXPLODIDO/PLANO deve ser o componente central
- Proponha um destaque simples e sutil, seguindo o padrão de layout definido atualmente

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.16:
Menu lateral esquerdo:
- Permitir redimensionar a partir do tamanho atual diminuindo até 75% e expandindo até 120%
- Assim como o painel lateral direito tem o ícone de colapse/expand, aplicar nesse para recolher lateralmente (ambos paineís)

Controles Superiores Centrais - No painel principal:
- Remover a borda deixando-os flutuando/integrados com o painel central como se fizessem parte dele.
- os valores atuais dos sliders só devem aparecer no mousehover/componente selecionado e abaixo do slider
- Remover o chip FRAMES. Renomear INTENSIDADE for FI e DISTANCIA por FD

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.17:
- O que tiver dúvidas e precisar esclarecer, me pergunte.
- Apenas assuma e defina o que tiver certeza.
- Crie nova página, assim como fez na v2.16 para isolar as versões.

Menu superior e recursos visuais para tela principal:
- Usar padrão 1b (página Esquemas 2.17) mas:
  - Usar posicionamento dos menus hover SUPERFICIES, PAINEL e FOCO de 1a
  - Substituir label Perspectiva por um ícone que remeta à mudança do ângulo/visualização da perspectiva
  - Substituir FI e FD por ícones que remetam ao que fazem: Intensidade dos frames e distância entre os frames
  - Diminuir em 30% a largura horizontal dos sliders
  - Explodido, quando nesse modo, pintar o label/botão na cor da seleção e quando for plano, não colorir. Como é toggle, trocar a descrição, mantendo apenas 1 único botão central
  - Interagir e Camera sem bordas. E mudar o ícone para interagir, usando um mais sugestivo à ação (tipo botão play).

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.18:
Painel Superior:
- Aumentar o tamanho de LAYERS em 20% e apenas ele aparece centralmente.

Painel lateral direito:
- Ao redimensionar a largura, a borda de redimensionamento continua aparecendo após sair do controle/parar o redimensionamento (corrigir)

Controles Centrais visuais no gráfico:
- Quando estiver EXPLODIDO, botão toggle fica com label da cor do tema escolhido e apenas a borda também com highlight
- Trazer os 2 recursos de FOCO para este painel, após perspectiva
- Remover Camera
- Deslocar botão INTERAGIR para ancorar à direita, ficando à esquerda do painel direito
- Deslocar menu de SUPERFICIES para o lado esquerdo de Interagir, onde listará, por projeto, todas superfícies que ficam escondidas ou são secundárias/terciárias ao design principal
- Precisamos pensar em como melhorar e integrar/facilitar a identificação de todos os recursos de interação. Acho que seria uma boa idéia INTERAGIR virar um menu com todas as ações possíveis (Ex: CONFIGURAÇÔES > Selecionar Aba TEMA, RESUMO GLOBAL > Expandir / Recolher) 

Menu Superior - Botão Configurações:
- Remover função de ATALHO e deslocar o botão com ícone de atalhos ao lado das configurações no menu superior
- Remover função de CONECTAR PASTA e escolher outro ícone no padrão dos que estão sendo usados e colocar à esquerda do label (> pasta)

Menu Ajustes:
- Renomear titulo para apenas "AJUSTES"

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.19:
Controles Centrais visuais no gráfico:
- Mudar EXPLODIDO para no mouse hover, highlight da borda e label e se clicar para habilitar, permanece visual habilitado
- FOCO precisa se comportar visualmente igual EXPLODIDO
- Centralizar esse componente em relação à tela toda (igual titulo LAYERS)

Painel lateral direito:
- Ao redimensionar a largura, a borda de redimensionamento continua aparecendo após sair do controle/parar o redimensionamento. Precisa corrigir para não aparecer. Comportamento tem que ser igual ao painel direito de propriedades do componente selecionado.

SUPERFICIES + INTERAGIR:
- Unificar apenas em INTERAGIR:
  - Todos outros elementos escondidos e ações do layout principal também ficam no nível 1
  - Superfícies passam a ser nível 1, visível/não visível
  - Para cada supercifie, listar os menus, abas e ações possíveis, como se fosse uma árvore
  - Avaliar o melhor modelo de construção das interações
  - Expandir a largura do menu para alocar confortavelmente todo layout

Atualizer a interface completa com releitura do diretório Traval

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.20:
Controles Centrais visuais no gráfico:
- Deslocar EXPLODIDO para o 1o item à esquerda
- Incluir menu INTERAGIR após ultimo slider:
  - Ampliar largura e permitir redimensionar o controle (largura+altura) (salvando as configurações assim que redimensionado)
  - Ampliar a largura do painel esquerdo com os 1os níveis
  - Para todos os itens do menu esquerdo que estiverem ativos, colorir a bolinha à esquerda do label com a cor do tema e deixar o label destacado (branco no fundo escuro e preto na cor clara.) e quando estiver desabilitado (cinza já usado no menu direito de propriedades no fundo escuro e claro)

Painel LAteral Direito:
- Manter visual atual de textbox, combbox e outros elementos e quando a propriedade não estiver DECLARADA, HERDADA ou EDITADA, colorir a fonte de um jeito que a deixe um pouco apagada (tom de cinza).

Chips de Camadas - Central Inferior:
- Com mais de 9-10 camadas, o controle cria 2 linhas. Precisamos garantir que ele fique apenas em 1 e só em casos de tamanho da tela extremamente estreita, deslocar as camadas maiores para baixo da linha L0 (alinhamento vertical à esquerda).

Menu de Configuração:
- Ao ajustar o tamanho da fonte, como todos menus são recalculados, o posicionamento do controle sai do foco do mouse. Precisamos encontrar um jeito de fixar o controle.

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.21:
- O que tiver dúvidas e precisar esclarecer, me pergunte.
- Apenas assuma e defina o que tiver certeza.
- Crie nova página, assim como fez na v2.20 para isolar as versões.

Controles Centrais visuais no gráfico:
- Remover o separador entre o 1o e o 2o slider
- Ao desabilitar EXPLODIDO, manter o label com o mesmo texto (não vamos mais usar PLANO como label)
- Menu INTERAGIR:
  - Ao redimensionar, ele se desloca para alinhar à direita e o menu desaparece (pelo mouse não estar mais em cima)
  - Permitir redimensionar a proporção de ambos painéis.
  - Fazer com que "MODO INTERATIVO" Seja um toggle por si só (totalmente clicável) e remover Alt+Clique

Visual Geral:
- Todos os combobox da interface estão sem padrão visual:
  - Ao expandir, usar a cor do tema escolhido de forma suave para o item com hover, e para borda.

Menu Configuração:
- Na opção COR DE SELEÇÃO: Colocar cada label do combobox com a respectiva cor quando o mouse selecionar/hover o item

Chips de Camadas - Central Inferior:
- Trazer de volta o número de Elementos após o nome da Camada (como era na v2.19)

#-------------------------------------------------------------------------------------------------------------

# Ajustes v2.23:
- O que tiver dúvidas e precisar esclarecer, me pergunte.
- Apenas assuma e defina o que tiver certeza.
- Crie nova página, assim como fez na v2.22 para isolar as versões.

Painel superior:
- Incluir um dropdown com o histórico dos últimos N projetos/repos editados em LAYERS
  - Use templates/modelos já usados na aplicação (cores, controles, highlight).

# Dúvida:
- Como faço para conectar meus layouts daqui (sempre a última versão), com o projeto local de layers que estou desenvolvendo para implementar o carregamento de projetos? Atualmente, tenho um repositório GH privado de LAYERS com todo fonte replicado.
