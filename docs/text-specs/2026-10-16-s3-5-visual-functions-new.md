---
title: "S3.5 — visual functions new"
type: text-spec
solution: "Layers"
created: 2026-10-16
level: meso
---

# Text spec — S3.5 visual functions new

## Objetivo

- Expandir capacidade visual de layers com novas funções práticas de validação e solicitações de mudanças escritas, conectadas com o layout selecionado

## Escopo

1) Mouse botão direot em um componente selecionado > Menu de Opções:
- Mostra todas as camadas L0-Ln, com o elemento selecionado em destaque na respectiva camada. Submenus:
   - Quando em modo "Não explodido": Criar submenu a partir da linha selecionada e mostrar "Explodir daqui" > explode apenas a partir do componente selecionado e os demais componentes no painel central continuam não explodidos. Se um componente gráfico explodido no modo "Nao Explodido" for clicado com botão direito, mostrar a opção "Recolher até aqui" que recolher todos os subníveis maiores L(n).
   - Opção "Requisição": abre uma nova entrada no painel direito "Ajustes", informando o nome do compoente selecionado, dados relevantes, estilos e formatações num chip como cabeçalho e abaixo uma área de texto livre para o usuário escrever o que quer mudar. Ao final essas requisições devem ser formatadas numa sessão "Requisições Manuais" e a lista de todas elas com estes detalhes, para que fique fácil para a IA reconhecer o componente e entender o que deve ser feito. (parecido com a funcionalidade de Anotação que existe no Claude Design). 
- Usar /design para validar ambas alterações no mock visual de Layers.
