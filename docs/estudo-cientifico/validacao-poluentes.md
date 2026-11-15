# PM2.5, CO e ozônio — auditoria da extração por imagens

Pesquisa realizada em 15/11/2026. Dados publicados auditados no estado `80cee4e`.

**Atualização posterior:** este documento preserva a auditoria inicial. A [avaliação qualitativa de PM2.5](pm25-qualitativo.md) ampliou as amostras e substituiu a entrada sonora dessa faixa por um índice visual. Os números “publicados” abaixo se referem ao estado anterior, preservado em `dados/poluentes/baseline/ar-pm25/`; a afirmação de que as três tabelas estão sem ponderação também descreve aquele estado. PM2.5 agora usa ponderação e índice; CO/O3 continuam como auditados aqui.

## Já havia validação?

Não foi encontrado estudo numérico dessas três variáveis nos arquivos ou no histórico Git disponível (`git log --all`). O commit `f0976a4`, que adicionou a validação científica, inclui somente temperatura, umidade, vento e precipitação em `compare_reference.py`; a avaliação de tendências é específica do vento. As adições de PM2.5, CO e O3 incluem calibração, extração, alinhamento de frames e testes de software. Esses testes verificam o comportamento do código, inclusive com legendas sintéticas; não são comparações com concentrações numéricas de referência. Isso documenta a ausência de evidência no repositório, sem excluir trabalho externo não arquivado.

As três tabelas regionais publicadas ainda têm `schemaVersion: 1`, `equal pixel weights` e nenhuma declaração `statistics`. Portanto, a ponderação por área do estudo meteorológico não foi aplicada a essas tabelas. Esta pesquisa calcula também uma alternativa ponderada, apenas para diagnóstico, sem alterar dados ou sons de produção.

## Referência e correspondência

As páginas oficiais [SVS 5151](https://svs.gsfc.nasa.gov/5151/), [5152](https://svs.gsfc.nasa.gov/5152/) e [5153](https://svs.gsfc.nasa.gov/5153/) identificam concentrações próximas da superfície estimadas pelo GEOS-CF. O GEOS-FP do estudo anterior não é a referência química apropriada.

Usamos a coleção de análise `GEOS-CF v2/ana/aqc_tavg_1hr_glo_L1440x721_slv`, disponível no [OPeNDAP NASA](https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/v2/ana/aqc_tavg_1hr_glo_L1440x721_slv.info). A [especificação v2, rascunho, p. 10 impressa / p. 16 do PDF](https://portal.nccs.nasa.gov/datashare/gmao/geos-cf/v2/GEOS-CF_FileSpecv2.0_Draft2.pdf) e o DAS arquivado identificam:

| Campo | Definição da referência | Conversão |
|---|---|---|
| `pm25_rh35` | PM2.5 a umidade relativa de 35%, inclui água, µg/m³ | Nenhuma |
| `co` | Fração molar em ar seco, mol/mol | × 10⁹ para ppbv |
| `o3` | Fração molar em ar seco, mol/mol | × 10⁹ para ppbv |

São médias horárias na camada inferior do modelo, nível 72; esse número não é uma altitude de 72 hPa. Não são medições de estações. O catálogo SVS aponta para v2, mas não publica a coleção, a execução de análise/previsão ou a receita exata de PM2.5 usada pelo renderizador. Assim, esta é uma comparação com um campo de referência plausível da mesma família, não uma identificação comprovada dos valores exatos que originaram cada pixel.

Foram escolhidos cinco instantes ao longo do período, antes de calcular as métricas. Os rótulos impressos das 15 imagens foram inspecionados e coincidem com os JSONs, inclusive EDT/EST:

| Frame local (1-based) | Rótulo da imagem, Eastern | Centro horário de referência UTC |
|---|---|---|
| 1 | 30/10/2026 06:00 EDT | 30/10/2026 10:30 |
| 32 | 03/11/2026 02:00 EST | 03/11/2026 07:30 |
| 63 | 06/11/2026 23:00 EST | 07/11/2026 04:30 |
| 100 | 11/11/2026 14:00 EST | 11/11/2026 19:30 |
| 120 | 14/11/2026 02:00 EST | 14/11/2026 07:30 |

A escolha do centro 30 minutos depois do rótulo segue o estudo anterior: compara, por hipótese, o rótulo das 10:00 com a média de 10–11 UTC. O intervalo exato do renderizador não foi confirmado. Não se estabeleceu equivalência com uma média instantânea ou com outra janela. O frame 124 fica depois do fim da análise disponível na consulta, 14/11/2026 08:30 UTC; não o extrapolamos.

## Método

- Cada consulta usa uma grade subamostrada de 145 × 288 pontos (~1,25°), extraída da grade nativa de 0,25°. Os cinco snapshots, unidades, coordenadas, horários, URLs e hashes estão arquivados em [dados/poluentes](dados/poluentes/). Não foi baixada a série global completa.
- Mesmos polígonos GeoJSON e agrupamentos do projeto nos dois lados. Europa inclui toda a Rússia. Médias de referência recebem peso cos(latitude). Diferenças de resolução, bordas, máscaras de logos e texto permanecem.
- O decodificador atual foi executado novamente nas 15 imagens. Todas as médias regionais publicadas foram reproduzidas com tolerância de 0,002 unidade, incluindo a presença de valores nulos. Isso confirma a reprodução do cálculo, não sua exatidão física.
- A comparação entre países inclui pelo menos 8 pontos válidos da referência e 100 pixels analisáveis da imagem, como no estudo do vento. São 98 países/territórios elegíveis; a entidade `country:Antarctica` vem do GeoJSON. Países sem pixels aceitos permanecem ausentes, nunca recebem zero.
- Médias da imagem usam apenas pixels aceitos. Calculamos tanto a média publicada sem pesos quanto uma versão ponderada, sobre a mesma seleção. `pixel_inclusion` é fração de pixels; `accepted_area_fraction` é a fração geométrica ponderada aceita, não confiança científica.
- As legendas oficiais rotuladas foram inspecionadas: PM2.5 logarítmica 0,4–409,6 µg/m³; O3 linear 5–60 ppbv; CO com âncoras 40, 100, 130, 200 e 500 ppbv em espaçamento não proporcional à concentração. A escala de CO é interpolada por trechos pelo código. Verificar a legenda não resolve compressão, contornos ou mistura com o mapa-base.

## Resultados dos dados atualmente publicados

Spearman mede a ordenação entre países em cada instante, não porcentagem de precisão. MAE é a média das diferenças absolutas entre médias nacionais da imagem e da referência; cada país entra com o mesmo peso nessa métrica. Não é erro por pixel nem média global ponderada pela área dos países.

| Variável | Países com dados por instante | Spearman nos cinco instantes | MAE por instante | Viés médio imagem − referência, reunindo as amostras |
|---|---|---|---|---|
| PM2.5 | 98 em todos | 0,566 / 0,539 / 0,549 / 0,719 / 0,653 | 11,47 / 10,99 / 12,24 / 12,75 / 10,00 µg/m³ | −9,78 µg/m³ |
| CO | 98 em todos | 0,984 / 0,985 / 0,983 / 0,978 / 0,969 | 16,13 / 17,72 / 18,84 / 20,38 / 19,89 ppbv | +17,32 ppbv |
| O3 | 96 / 96 / 94 / 97 / 95 | 0,968 / 0,960 / 0,893 / 0,931 / 0,933 | 2,78 / 3,34 / 3,85 / 3,66 / 3,03 ppbv | +3,12 ppbv |

O MAE reunindo países e instantes é 11,49 µg/m³ para PM2.5, 18,59 ppbv para CO e 3,33 ppbv para O3. Os países ausentes em O3 estão listados por instante no [JSON de resultados](dados/poluentes/validacao-poluentes.json).

Exemplos continentais no frame 1; **imagem publicada / referência ponderada**, com unidades de cada variável:

| Grupo | PM2.5 µg/m³ | CO ppbv | O3 ppbv |
|---|---|---|---|
| África | 3,47 / 14,56 | 122,13 / 109,33 | 43,06 / 40,81 |
| América do Sul | 3,51 / 10,43 | 136,67 / 122,16 | 34,59 / 24,47 |
| América do Norte | 2,69 / 6,17 | 98,15 / 98,24 | 43,44 / 40,86 |
| Europa, grupo do projeto | 3,82 / 8,24 | 90,87 / 91,35 | 38,42 / 36,51 |
| Ásia, grupo do projeto | 5,64 / 21,95 | 143,21 / 138,31 | 48,01 / 46,09 |
| Oceania | 1,95 / 5,88 | 89,80 / 85,80 | 38,87 / 34,84 |
| Antártida | 0,47 / 0,85 | 56,99 / 52,01 | 27,61 / 23,11 |

**Tendências:** comparamos a direção da mudança somente entre instantes amostrados consecutivos, em países com dados nos dois. São mudanças em intervalos de vários dias, não todas as transições de três horas. Pares são dependentes e não constituem ensaios independentes.

| Variável | Qualquer mudança não nula na referência | Mudança acima de um piso descritivo |
|---|---|---|
| PM2.5 | 348/392 (88,8%) | >1 µg/m³: 297/318 (93,4%) |
| CO | 363/392 (92,6%) | >5 ppbv: 260/269 (96,7%) |
| O3 | 327/377 (86,7%) | >2 ppbv: 257/275 (93,5%) |

Os pisos são análise de sensibilidade para tirar diferenças pequenas, não limites de precisão, saúde ou aprovação. Em O3, 15 pares foram excluídos por ausência de dados; transições entre ausente e disponível não foram avaliadas.

## Interpretação e pendências concretas

1. **CO preserva muito bem a ordenação e a direção das mudanças nas amostras**, mas apresenta viés positivo. A boa correlação não autoriza tratar ppbv extraído da imagem como concentração exata. Devem ser investigados o mapeamento entre âncoras, a composição da imagem e a equivalência da execução do modelo.
2. **O3 também preserva contrastes, mas perde baixas concentrações.** A legenda fica quase branca no extremo inferior; o filtro exige saturação ≥40. No frame 1, só 43,45% dos pixels analisáveis da América do Sul e 1,84% da Antártida são aceitos. A média representa essa seleção; por exemplo, na América do Sul, 34,59 contra 24,47 ppbv. Essa é evidência de cobertura limitada e possível seleção enviesada, não prova isolada da causa de toda diferença.
3. **PM2.5 não está demonstrado como suficientemente próximo em valor absoluto.** A ordenação é apenas moderada, com forte diferença negativa contra `pm25_rh35`; África e Ásia ficam várias vezes abaixo da referência no primeiro frame. A direção temporal é mais consistente que os valores absolutos. Não se deve multiplicar os dados por um fator empírico para esconder isso.
4. **A receita exata de PM2.5 permanece uma incerteza relevante.** A [descrição oficial do sistema](https://gmao.gsfc.nasa.gov/gmao-products/geos-cf/system-description_geos-cf/) identifica os módulos GEOS-Chem e GOCART; a [especificação v1](https://gmao.gsfc.nasa.gov/pubs/docs/Knowland1446.pdf) distingue PM2.5 desses esquemas, inclusive com unidades diferentes. Consultamos também as coleções v2 `chm` e `xgc`; não encontramos nelas uma segunda variante GOCART diretamente identificada para esta comparação. O SVS descreve PM2.5 calculado de campos de aerossóis e meteorologia, sem publicar a expressão. Logo, a discrepância detectada não pode ser atribuída inteiramente ao conversor de cores. É necessário identificar a variável/fórmula e a execução usadas pelo SVS e repetir o confronto.
5. **Ponderação espacial é uma pendência real nas três faixas**, mas não explica os desvios principais observados. A alternativa ponderada não melhora de forma consistente o MAE ou a ordenação entre países. No frame 1, PM2.5 da África passa de 3,47 para 3,54 µg/m³, ainda longe de 14,56. CO da América do Norte passa de 98,15 para 106,32 ppbv, enquanto a referência é 98,24: reduzir um erro pontual não é o critério para escolher pesos fisicamente adequados.

Não existia um limiar de aceitação quantitativo definido para essas variáveis. Portanto, não há um resultado formal “aprovado/reprovado”. A evidência sustenta uso qualitativo de CO e O3 dentro das limitações descritas; PM2.5 exige investigação adicional para alegar fidelidade de concentração ou de ordenação espacial. Não se demonstrou validação por observações independentes, nem precisão nos 124 instantes, nem desempenho em países pequenos ou eventos locais. A reprodução bem-sucedida das estatísticas atuais também não transforma cobertura em qualidade.

## Artefatos e reprodução

- [Comparações completas em CSV](dados/poluentes/comparacao-poluentes.csv): todas as regiões e cinco instantes, incluindo ausências, contagens e resultados com/sem pesos.
- [Métricas e hashes dos insumos](dados/poluentes/validacao-poluentes.json).
- `dados/poluentes/frame-*.npz` e `.json`: campos numéricos e metadados de cada consulta; `geos-cf.das`, `geos-cf.dds` e `time-origin.ascii`: metadados do servidor. A origem temporal é verificada no calendário do servidor por diferenças relativas, sem supor equivalência com o calendário proléptico do Python.

Na raiz, com `pipeline/requirements.txt` instalado (SciPy vem com scikit-image):

```bash
# Offline; lê snapshots arquivados e imagens locais, escreve só no destino indicado.
python pipeline/evaluate_pollutants.py --baseline-dir docs/estudo-cientifico/dados/poluentes/baseline --output-dir /tmp/validacao-poluentes

# Refazer consultas, opcional; arquivo remoto muda com o tempo.
python pipeline/fetch_pollutant_reference.py --output-dir /tmp/referencia-poluentes
python pipeline/evaluate_pollutants.py --reference-dir /tmp/referencia-poluentes --output-dir /tmp/nova-validacao-poluentes

python -m unittest discover -s pipeline -p 'test_*.py'
```

O avaliador rejeita unidade alterada, snapshot com hash divergente, grade incompatível, datas incompatíveis e média publicada que não reproduza o método auditado. Os hashes dos frames, legendas e JSONs permitem identificar mudanças posteriores. Os resultados desta pesquisa não alteram as faixas publicadas.

Pesquisa e scripts assistidos por OpenAI Codex. Referências numéricas: NASA GMAO; visualizações: NASA SVS.
