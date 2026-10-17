---
title: "S9.1 — layouts newlogic"
type: text-spec
solution: "Layers"
created: 2026-10-17
level: meso
---

# Text spec — S9.1 layouts newlogic

## Contexto

- Atualmente, a interface de Layers é um monobloco, com todo layout interligado em apenas um grande conjunto visual.

## Objetivo

- Expandir a leitura de repositórios visuais (páginas web) para identificar quebras de layout (ex: Tela principal, tela de configuração, painel de de funções específicas)
- Segmentar logicamente as interfaces por função
- Garantir cobertura maior de visualização para repos e soluções onde não é possível montar tudo em apenas 1 único layout
- Manter a velocidade, performance e menor consumo de memória possível, evitando travamentos em layouts mais complexos e com mais elementos.

## Escopo

- Criar modelo técnico de avaliação dos arquivos de design/arquitetura visual para decidir a melhor abordagem para o projeto
- Para cada tipo (monovisual / multiplos layouts), informar a cobertura/capacidade de visualização final (em %) para que decida a melhor abordagem
- Montar, para o tipo "Multiplos Layouts" um stack com os layouts criados na melhor posiçao do painel principal para que o usuário escolha o layout que deseja ver e focar. Pensar também na possibilidade de segmentar (configurável), no próprio painel principal que mostra o layout de forma 3d, todos os layouts criados, separados espacialmente. A configuração deve permitir o usuário ver os multiplos layouts ao mesmo tempo ou selecionar apenas 1-N e navegar entre eles.
- Segmentar as funções de interação quando for escolhido o tipo de visualização "Multiplos layouts", permitindo que apenas as funções do layout fiquem logicamente atreladas a ele.
- Fazer o mock visual com /design antes de entrar em plan-mode para revisão final das fases. Proponha 2-3 interfaces/fluxos para os requisitos acima para decisão, sempre com a melhor recomendação.
