# Média ponderada e agrupamentos de países

O método atual é versionado por statistics.mean=area_weighted e
statistics.weighting=cos_latitude. A média usa os pixels aceitos após os mesmos
filtros de antes: sum(value * cos(latitude)) / sum(cos(latitude)). Cada latitude
é o centro de uma linha da imagem equiretangular. O filtro de cores, as unidades,
os nomes de frames e os timestamps são preservados. Norm usa essa nova média
com os mesmos limites de legenda. P90 é mantido como percentil de pixels sem
ponderação; coverage é mantida como razão de contagens de pixels.

Isso corrige o peso exagerado dos polos, mas não recupera regiões rejeitadas
pelo filtro. As médias de vento continuam condicionadas à parte colorida do
campo, e a precipitação continua sem um intervalo de acumulação confirmado.

## Regiões

Os contornos permanecem os mesmos. A interface passa a chamar continent: de
Country group. A Europa inclui a Rússia inteira; a Ásia exclui a Rússia.
Os identificadores antigos são mantidos para compatibilidade. Não se atribuiu
um limite físico arbitrário entre Europa e Ásia. O grupo de territórios
insulares não é uma média dos oceanos.

## Preservação e geração

Os oito arquivos JSON anteriores à mudança foram copiados para
/tmp/earth-jukebox-before-area-weighting. Essa pasta é temporária; o Git também
preserva a versão publicada anterior. O relatório de comparação é gerado
separadamente para revisão.

Comando executado: python pipeline/regions.py --update-features
Esse comando atualiza os arquivos gerais e regionais na mesma passagem pelos
frames, preservando as datas já existentes. A tabela regional usa schemaVersion
2. O front compara o método e os valores fonte para rejeitar tabelas antigas;
o mixer também rejeita fontes com métodos de média diferentes.

## Vento: disponibilidade temporal verificada

A consulta ao endpoint de assimilação tavg1_2d_slv_Nx retornou o eixo temporal
2017-12-01 00:30 UTC até 2026-11-14 14:30 UTC. Interpretando os timestamps dos
frames como America/New_York e escolhendo a média horária centrada 30 minutos
após o instante estampado, 122 de 124 instantes estão dentro da faixa publicada.
Os frames 123 e 124 (14/11 11:00 e 14:00 EST) corresponderiam a centros de
16:30 e 19:30 UTC, além do último horário então disponível.

Essa cobertura do eixo temporal não comprova valores válidos em todas as
células/horários nem equivalência entre um frame instantâneo e uma média horária.
O último frame de vento foi inspecionado e sua imagem mostra 14 Nov 2026
14:00:00 EST. A extração numérica anterior confirmou U10M/V10M no começo do
período. Uma tentativa adicional de consultar os dois extremos recebeu erro
HTML com HTTP 200; outra tentativa com sintaxe corrigida expirou por timeout.
Portanto, não foi implementada substituição do vento nem declarada uma
validação completa dos 124 horários.

Para migração futura: confirmar se as imagens finais representam previsão,
consultar a coleção/ciclo correspondente sem misturar previsão e assimilação
silenciosamente, ou escolher um período comum comprovado. Extração por cores
não pode reconstruir univocamente ventos transparentes sobre um mapa-base
arbitrário. Se ela permanecer, o som deve continuar identificado como uma
estimativa da parcela colorida, não uma média completa do território.

## Precipitação

A NASA SVS 5149 representa precipitação total (chuva e neve) sobre nuvens.
Da imagem, o pipeline extrai valores aproximados da escala de 0–20 mm nos
pixels aceitos. O intervalo de acumulação não está explícito na legenda/JSON;
por isso, o número não deve ser interpretado como mm/h, mm/dia ou acumulado
por frame. Os 3 h entre frames não estabelecem que cada imagem acumule 3 h.
A média é apenas dos pixels aceitos, não necessariamente toda a região. Pixels
sem cor podem estar transparentes/ocultos e não podem ser convertidos em zero
sem suporte no renderizador/dado original.

Referências:
- https://docs.xarray.dev/en/stable/examples/area_weighted_temperature.html
- https://svs.gsfc.nasa.gov/5148/
- https://svs.gsfc.nasa.gov/5149/
- https://opendap.nccs.nasa.gov/dods/GEOS-5/fp/0.25_deg/assim/tavg1_2d_slv_Nx.info
- https://gmao.gsfc.nasa.gov/pubs/docs/Lucchesi1203.pdf

## Atualização qualitativa posterior

O vento passou a usar visualSignal para a sonificação, preservando as médias condicionais como diagnóstico. Consulte [ESTUDO_CIENTIFICO.md](ESTUDO_CIENTIFICO.md) para os três instantes de avaliação, gráficos e limites. Isso não representa migração para vento numérico nem recuperação de ventos transparentes.
