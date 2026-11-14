> Relatório histórico anterior à adoção do índice visual do vento. Para o estado atual, gráficos e reprodução portátil, consulte [ESTUDO_CIENTIFICO.md](../ESTUDO_CIENTIFICO.md).

# Auditoria preliminar — Earth Jukebox

Pesquisa de fontes oficiais e comparação numérica. Nenhum arquivo do projeto foi alterado nesta pesquisa.

## Escopo e método

- Imagens: primeiro frame local, `2026-10-30T06:00`, interpretado pelo pipeline como horário Eastern (-04:00 nessa data), portanto 10:00 UTC. Essa associação é uma hipótese do pipeline, não uma comprovação nova do timestamp científico.
- Referência: GEOS-FP assimilação, média horária centrada em 2026-10-30 10:30 UTC (janela 10–11 UTC), índice temporal 78130 a partir de 2017-12-01 00:30 UTC. Não é exatamente o instante estampado na imagem.
- Foram consultados apenas um recorte temporal e uma subamostragem espacial: lat[0:5:720], lon[0:4:1151], grade de 145 × 288 pontos (~1,25°). Total de aproximadamente 2,5 MB de dados ASCII, sem baixar o dataset completo.
- T2M em K convertido para °C subtraindo 273,15; QV2M em kg/kg multiplicado por 1000 para g/kg. Unidades confirmadas no File Specification for GEOS FP, pp. 29–31; o DAS servido não traz essas unidades nas variáveis.
- Vento: sqrt(U10M²+V10M²), velocidade do vetor médio horário. Não é necessariamente a média das velocidades instantâneas.
- Contornos: o mesmo GeoJSON do projeto para ambos os lados, máscaras de centros dos pixels na imagem e pontos da grade no modelo; amostragem grosseira implica diferenças de borda. O grupo Europa inclui a Rússia inteira. Não são contornos de continentes físicos rigorosamente comparáveis aos de outros produtos.
- Comparação principal sem pesos para separar a conversão de cores do efeito da área. Ponderação testada separadamente com cos(latitude), sobre pixels/células aceitos. Não recupera os pixels rejeitados.
- As referências são campos do próprio modelo de origem, não observações independentes. Um recorte não valida os 124 frames nem permite estimar precisão científica global.

## Primeiro frame — imagem / campo numérico (sem ponderação)

| Grupo | Temperatura °C | Umidade específica g/kg | Vento m/s |
|---|---:|---:|---:|
| África | 29.18 / 30.59 | 9.27 / 9.33 | 5.13 / 3.04 |
| América do Sul | 18.31 / 19.04 | 13.90 / 13.19 | 5.33 / 1.69 |
| América do Norte | -3.21 / -3.44 | 3.39 / 3.79 | 7.87 / 3.70 |
| Europa (grupo atual) | -5.11 / -4.99 | 2.40 / 2.87 | 5.86 / 2.61 |
| Ásia (grupo atual) | 16.90 / 16.46 | 7.01 / 7.46 | 5.53 / 2.83 |
| Oceania | 27.33 / 25.57 | 9.20 / 9.64 | 5.20 / 3.20 |
| Antártida | -32.25 / -29.62 | 0.14 / 0.37 | 8.43 / 7.56 |

## Efeito da ponderação na imagem (não aplicada ao produto)

| Grupo | Temperatura atual → ponderada °C | Umidade atual → ponderada g/kg |
|---|---:|---:|
| África | 29.18 → 29.27 | 9.27 → 9.44 |
| América do Sul | 18.31 → 18.82 | 13.90 → 14.29 |
| América do Norte | -3.21 → 1.41 | 3.39 → 4.59 |
| Europa (grupo atual) | -5.11 → -3.19 | 2.40 → 2.67 |
| Ásia (grupo atual) | 16.90 → 18.08 | 7.01 → 7.63 |
| Oceania | 27.33 → 27.65 | 9.20 → 9.43 |
| Antártida | -32.25 → -31.99 | 0.14 → 0.15 |

A Rússia ocupa 78,02% dos pixels analisáveis do grupo Europa; com cos(latitude), sua participação no mesmo grupo seria 73,70%. Ponderar latitude reduz uma distorção de projeção, mas não muda esse agrupamento.

## Precipitação — comparação de grandezas diferentes

O JSON da imagem informa mm sem explicitar intervalo de acumulação. A referência PRECTOT é fluxo em kg/m²/s, convertido aqui para mm/h multiplicando por 3600 (1 kg/m² de água equivale a 1 mm). A coluna mm/h NÃO foi reinterpretada como o mm da imagem; não calcular erro ou razão de conversão entre essas colunas.

| Grupo | Imagem mm | Pixels aceitos % | GEOS-FP mm/h (sem pesos) |
|---|---:|---:|---:|
| África | 0.630 | 6.16 | 0.0754 |
| América do Sul | 0.645 | 11.98 | 0.1139 |
| América do Norte | 0.745 | 5.19 | 0.0852 |
| Europa (grupo atual) | 0.609 | 3.42 | 0.0515 |
| Ásia (grupo atual) | 0.705 | 8.49 | 0.1171 |
| Oceania | 0.841 | 9.79 | 0.1713 |
| Antártida | 0.521 | 0.42 | 0.0237 |

## Interpretação e prioridades

1. Temperatura: sinal regional e ordem de grandeza razoáveis neste recorte. Diferenças aproximadas entre imagem e modelo vão de 0,12 a 2,64 °C. Não são erros isolados de conversão: incluem diferença temporal, grade, contornos e altura/definição do campo. A página SVS 5147 menciona 3 m no resumo e 2 m na descrição, uma inconsistência a esclarecer.
2. Umidade: o contraste América do Sul úmida / Antártida seca aparece também no GEOS-FP. Nos trópicos e latitudes médias, diferenças neste recorte são geralmente menores que 1 g/kg. Na Antártida, 0,144 contra 0,368 g/kg indica subestimação relativa importante apesar da pequena diferença absoluta. Ponderação por latitude não resolve sozinha essa diferença.
3. Vento: as médias das imagens estão sistematicamente elevadas. O calibrador só usa cores visíveis a partir de cerca de 3,5 m/s; a seleção elimina muitos ventos fracos, e aceitações continentais no primeiro frame ficam entre ~5% e ~73%. Exemplo: América do Sul 5,33 m/s na imagem contra 1,69 m/s no campo completo. Latitude não recupera a faixa excluída nem desfaz a transparência das cores.
4. Precipitação: médias condicionadas a uma pequena amostra colorida (0,42% dos pixels antárticos; 3,42% da Europa). Não representam a precipitação média sobre toda a região, nem ausência de cor significa necessariamente zero. Precisamos confirmar intervalo temporal e mapeamento usado no renderizador. A escala rotulada oficial foi inspecionada e é linear 0–20 mm.
5. Prioridade recomendada: preservar os resultados atuais; adicionar método de média ponderada explicitamente versionado; resolver agrupamentos continentais; obter vento e precipitação dos campos numéricos; confirmar timestamps/intervalos e repetir uma amostra de vários instantes. Não recalibrar a música para esconder as discrepâncias.

## Fontes oficiais consultadas

- Temperatura SVS 5147: https://svs.gsfc.nasa.gov/5147/
- Vento SVS 5148: https://svs.gsfc.nasa.gov/5148/
- Precipitação SVS 5149: https://svs.gsfc.nasa.gov/5149/
- Umidade específica Q2M SVS 5150: https://svs.gsfc.nasa.gov/5150/
- Metadados SLV: https://opendap.nccs.nasa.gov/dods/GEOS-5/fp/0.25_deg/assim/tavg1_2d_slv_Nx.info
- Metadados FLX: https://opendap.nccs.nasa.gov/dods/GEOS-5/fp/0.25_deg/assim/tavg1_2d_flx_Nx.info
- GMAO File Specification for GEOS FP: https://gmao.gsfc.nasa.gov/pubs/docs/Lucchesi1203.pdf
- Ponderação por área numa grade latitude/longitude (documentação oficial Xarray): https://docs.xarray.dev/en/stable/examples/area_weighted_temperature.html
- Berkeley Earth, arquivo Europa (apenas referência de definição espacial/climatologia histórica, não validação de outubro/novembro de 2026): https://berkeley-earth-temperature.s3.us-west-1.amazonaws.com/Regional/TAVG/europe-TAVG-Trend.txt
- ONU M49: agrupamentos estatísticos de países não são automaticamente limites físicos dos continentes: https://unstats.un.org/unsd/methodology/m49/

## Reprodução

As consultas e scripts desta investigação foram salvos em /tmp/earth-jukebox-fetch-reference.py, /tmp/earth-jukebox-compare-reference.py e /tmp/earth-jukebox-precip-reference.py. O CSV em /tmp/earth-jukebox-reference-comparison.csv contém as médias com e sem pesos; os arquivos ASCII e DAS preservam a resposta obtida. Todos usam os arquivos locais da branch calculo-regiao sem modificá-los.
