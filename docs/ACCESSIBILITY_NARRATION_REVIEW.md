# Revisão da navegação falada e descrições

## Fala durante a navegação

- Cada controle anuncia seu nome, estado e instrução curta quando necessária.
- `data-spoken-description` oferece uma versão curta só para o narrador próprio.
  `aria-describedby` permanece disponível com os detalhes para leitores de tela.
- Checkboxes de camadas anunciam o valor e o som atual sem repetir cobertura e
  diagnósticos longos em cada Tab. O texto completo permanece junto ao mapa.
- Sugestões avisam que selecionam o lugar e iniciam o áudio.
- Seções recolhíveis anunciam nome, estado e como abrir/fechar. Não leem todos
  os descendentes. Elementos decorativos marcados aria-hidden não entram na fala.
- O cabeçalho de Rhythm and time control explica que contém velocidade e
  metrônomo. O controle do metrônomo explica que as batidas representam datas
  dos dados e acompanham a velocidade. A seleção semanal explica a segunda-feira.
- Menus continuam lendo só a opção selecionada; a timeline usa aria-valuetext
  com lugar, quadro, data, valor e cobertura. A tabela inteira não é narrada
  automaticamente. Read this frame lê só a linha atual quando solicitado.

## Explicações solicitadas

- Read sound explanation lê o mapeamento e a escala do instrumento atual.
- Read values and methods lê o painel explicativo quando solicitado.
- Os dois botões aparecem apenas com a navegação falada ativa.
- A introdução preserva as instruções essenciais e agora descreve a ordem
  atual: discos, lugares, playback e mapas. O atalho de lugares abre a seção
  antes de focar seu controle. Os atalhos do combinado alcançam os switches
  que agora estão junto dos mapas, em vez do contêiner antigo vazio.

## Instrumentos e metodologia

Verificados os sete motores contra guias, exemplos e leituras. Precipitação:
mais quantidade produz golpes mais rápidos e mais agudos; exemplos de 0,5/1 mm.
Ozônio: voz original sem limiar nem dinâmica de volume. PM2.5: tom sustentado,
mais alto e brilhante conforme o índice, com volume fixo por valor. Um ajuste
fixo de calibração do canal não é uma nova codificação da concentração.

Ganhos finais: precipitação 4,75; ozônio 2,3; PM2.5 3,5. A explicação geral
sobre normalização foi corrigida: temperatura/CO/ozônio usam as posições
normalizadas, vento/PM2.5 usam o índice visual quando declarado, e
precipitação/umidade usam a média fornecida em sua unidade física.

## Verificação

83 testes passaram nos 10 arquivos de testes do front, executados diretamente
com Node. Os novos casos cobrem descrições curtas sem remover aria-describedby,
explicações solicitadas e cabeçalhos recolhíveis com nome e estado. Os testes
verificam textos e lógica; não constituem uma sessão de escuta com usuário ou
um teste manual completo com leitor de tela.

## Introdução e demonstrações

O guia de teclado é a primeira das sete etapas da introdução; o painel
separado no fim da página foi removido. Hear sound examples usa voz somente
quando a navegação falada está ativa. O motor espera o término de cada fala
antes de tocar e para o áudio antes do rótulo seguinte. A navegação falada
fica suspensa durante a sequência, e sua ativação fica bloqueada até parar
os exemplos. Textos de progresso da legenda usam aria-live off para evitar
anúncios automáticos sobre as demonstrações. Os dois novos testes verificam
a sequência sem voz e a ordem parar áudio, falar, aguardar, tocar.
