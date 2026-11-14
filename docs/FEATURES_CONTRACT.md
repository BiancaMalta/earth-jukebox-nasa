# Contrato do `features.json`

É o **único ponto de contato** entre Dados (Python) e Front/Som (JavaScript).
Enquanto ninguém mudar este formato, os dois trabalham em paralelo sem conflito.

Arquivo: `public/data/<faixa>/features.json` (no MVP: `public/data/clima-temperatura/features.json`)

```json
{
  "mock": true,
  "track": "clima-temperatura",
  "svsId": 5147,
  "unit": "°C",
  "vmin": -40,
  "vmax": 40,
  "frames": [
    { "file": "frame_000001.webp", "date": "2026-10-30T06:00", "mean": 0.0, "p90": 12.0, "norm": 0.5 }
  ]
}
```

| Campo | Tipo | O que é |
|---|---|---|
| `mock` | bool | `true` = valores falsos de exemplo. O pipeline real grava `false`. |
| `track` | string | ID da faixa (igual a `public/tracks/<id>.json`) |
| `svsId` | number | ID da visualização no SVS |
| `unit` | string | Unidade dos valores (`°C`) |
| `vmin`, `vmax` | number | Faixa da legenda de cores |
| `frames[].file` | string | Nome do arquivo em `frames/` |
| `frames[].date` | string | Data/hora do frame (`YYYY-MM-DDTHH:MM`), usada na fala |
| `frames[].mean` | number | Média em `unit` dos pixels decodificados aceitos; ponderada por cos(latitude) quando `statistics.mean` é `area_weighted` |
| `frames[].p90` | number | Percentil 90 não ponderado dos pixels aceitos, em `unit` |
| `frames[].norm` | number | `mean` normalizado de 0 a 1 entre `vmin` e `vmax`. **Na temperatura, é o valor que vira nota. As outras variáveis usam `mean` na unidade física.** |
| `frames[].coverage` | number | Opcional: fração dos pixels analisáveis usados no cálculo, após os filtros; não é precisão nem área geográfica |

Para vento (SVS 5148), `mean` e `p90` usam apenas pixels coloridos que
passam nos filtros de correspondência com a legenda. A escala deixa os ventos baixos
transparentes e seu extremo alto se confunde com o mapa-base; portanto, esses
valores não são uma média global completa. `coverage` informa a proporção
efetivamente usada em cada quadro.

Para precipitação (SVS 5149), a unidade da legenda é milímetros e os pixels
coloridos são sobrepostos a nuvens e ao mapa-base. `mean` e `p90` usam apenas
pixels que passam nos filtros de correspondência com a legenda; não representam uma média
global da precipitação. `coverage` informa a proporção efetivamente usada em
cada quadro.

## Regras

- **Dados** é dono do arquivo: gera com `pipeline/features.py` e substitui o mock (mantendo os mesmos campos).
- **Front/Som** só lê. Não edita o arquivo; se precisar de campo novo, combina e atualiza este documento primeiro.
- O número de frames é `frames.length` (o player não precisa mais descobrir um a um).
- Campos novos podem ser adicionados; os existentes não mudam de nome nem de significado.

## Dados regionais pré-calculados (`regions.json`, versão 2)

Gerados por `python pipeline/regions.py` em `public/data/<faixa>/regions.json`.
O front só lê esses valores: não decodifica cores, calcula médias ou normaliza
valores regionais. `features.json` continua sendo o contrato do quadro completo.

O documento regional contém:

- `schemaVersion: 2`, `track`, `svsId`, `mock: false`, `unit`, `vmin`, `vmax`.
- `frames`: cópia dos registros de `features.json`, com nomes, datas e valores
  originais. O consumidor compara todos esses campos para rejeitar tabelas
  desatualizadas. O gerador verifica também que as estatísticas do quadro
  completo coincidem com os frames e a calibração atuais antes de publicar.
- `columns: ["mean", "p90", "norm", "coverage"]` define a ordem das linhas.
- `regions`: objeto indexado por `country:<NAME_EN>` ou `continent:<CONTINENT>`
  do arquivo `public/data/world-countries.geojson` (fallback do nome: ADMIN/NAME).
  Cada entrada contém `kind`, `name` e `values`, com uma linha por frame, na
  mesma ordem de `frames`.

Exemplo de entrada: `"country:Brazil": {"kind":"country","name":"Brazil",
"values":[[24.1,29.2,0.801,0.95], ...]}`. Números meramente ilustrativos.

### Método e limitações

Média, percentil, normalização e filtros usam as mesmas funções Python do
quadro completo em `features.py`. A normalização mantém os limites fixos da
legenda da faixa, compartilhados por todas as regiões; não se adapta à amplitude
de cada país. Média, p90 e norm são arredondados para três casas decimais; coverage usa seis casas, preservando pequenas frações positivas. Os JSONs legados podem conter coverage com três casas; devem ser regenerados com --update-features antes de produzir novas tabelas ponderadas.

Os contornos são rasterizados na resolução nativa de cada frame e na projeção
equiretangular: o centro do pixel determina sua inclusão. Buracos e múltiplos
polígonos são preservados; grupos continentais são a união dos países inteiros do GeoJSON, sem
adicionar áreas oceânicas. O arquivo de origem já divide os polígonos na linha
de mudança de data. Logos e timestamps são excluídos com a mesma máscara do
quadro completo. Não há redimensionamento nem mistura de pixels na borda.

`coverage` é a fração dos pixels analisáveis **dentro da região** que passaram
nos filtros da faixa. Sem filtro, todos os pixels analisáveis são usados, como
no cálculo geral atual. Essa fração não é uma porcentagem da área da Terra.
Sem pixels válidos (inclusive regiões menores que um pixel), a linha é
`[null,null,null,0]`. Ausência não é zero medido e não produz som.

As médias continuam sendo estimativas extraídas de imagens. Agora usam pesos
proporcionais a cos(latitude) dos centros dos pixels, para representar sua área
relativa numa esfera. A ponderação incide somente nos pixels aceitos, não nas
áreas rejeitadas ou sem dados. Padronizar os dois caminhos não
remove limitações da legenda, filtros e resolução da imagem. O gerador copia os
timestamps existentes; não determina novos fusos ou instantes científicos.

Após alterar frames, legenda, filtros, limites geográficos ou `features.json`,
regenere as tabelas antes de publicar. O navegador detecta incompatibilidade com
os registros fonte, mas não calcula hashes de todas as imagens ou calibrações.
Falhas no carregamento/validação mantêm o áudio regional silencioso e exibem
uma mensagem; limpar a seleção retorna aos valores originais do quadro completo.


### Interpretação dos indicadores na interface

O rótulo é “analyzed image pixels used”, não “confidently matched”. Não há
probabilidade de confiança estatística estimada. `p90` é o percentil dos valores
decodificados, não um intervalo de confiança. `norm` posiciona a média na escala
fixa da legenda, não na distribuição de países, e não é recalculado no front.

O filtro configurado em `colorbar.json` aceita cores por distância euclidiana
RGB (`maxColorDistance`), saturação (`minSaturation`, em 0–255) e, quando
configurado, teto do valor decodificado (`maxValue`). A temperatura atual não
tem `pixelFilter`: todos os pixels analisáveis recebem a cor mais próxima da
legenda, sem teste de aceitação. Portanto, inclusão de 100% não demonstra
qualidade nem certeza científica.

Na interface, frações positivas abaixo de 0,1% aparecem como `<0.1%`, nunca
como zero; valores menores que 100% mas superiores a 99,9% usam `>99.9%`.
A porcentagem é calculada sobre os pixels analisáveis após a máscara de logos e
timestamps, dentro da região quando selecionada. Não mede área da Terra.


## Método de média por área e compatibilidade (versão 2)

`features.json` e `regions.json` compartilham o metadado:

```json
"statistics": {
  "mean": "area_weighted",
  "weighting": "cos_latitude",
  "p90": "unweighted_pixel_percentile",
  "coverage": "accepted_pixel_fraction"
}
```

Para cada pixel de centro de latitude φ, peso w = cos(φ). A média é
Σ(w × valor) / Σ(w), somente sobre os pixels aceitos e fora das máscaras.
Em uma grade equiretangular regular do globo completo, esses pesos são
proporcionais à área das células na aproximação esférica. P90 permanece o
percentil não ponderado dos valores dos pixels; coverage continua uma razão de
contagens, não uma razão de áreas. Norm usa a nova média, os mesmos limites da
legenda e o mesmo arredondamento de três casas. Filtros e timestamps não mudam.

O front aceita dados legados sem statistics como médias de pixels com pesos
iguais. Tabelas regionais ponderadas exigem schemaVersion 2 e o mesmo statistics
no arquivo geral. O modo combinado recusa misturar métodos entre experiências.

`python pipeline/regions.py --update-features` recalcula os arquivos geral e
regional na mesma passagem, preservando file/date do features.json existente.
Sem essa opção, o gerador exige fonte já ponderada e verifica sua consistência.
O comando pode ser usado com `--track` para selecionar uma faixa.

Os identificadores continent: continuam estáveis por compatibilidade, mas são
apresentados como grupos de países. Não representam um recorte físico rigoroso
dos continentes. O grupo Europa inclui toda a Rússia e Ásia a exclui. Territórios
insulares aparecem como terra, não como médias dos oceanos. Não foram criadas
novas fronteiras nem atribuições geográficas silenciosas.

## Vento qualitativo: `visualSignal` e tabela regional versão 3

A faixa clima-vento declara `sonification: {"input":"visualSignal",
"quantity":"visible wind color signal","unit":"1"}` nos arquivos geral e
regional. Cada frame geral recebe `visualSignal` (número 0–1 ou null). A tabela
regional de vento passa a `schemaVersion: 3` e suas colunas são
`["mean","p90","norm","coverage","visualSignal"]`. As outras faixas mantêm
versão 2 e quatro colunas; documentos legados continuam aceitos somente com o
método e formato correspondentes.

O Python calcula, usando os mesmos filtros, máscara e pesos por latitude:

`visualSignal = sum(weight * clip((decoded - vmin)/(vmax-vmin),0,1), accepted)
/ sum(weight, analyzed)`.

O denominador inclui todos os pixels analisáveis da região, capturando a
extensão do sinal visível. Pixels rejeitados não contribuem sinal visual, o que
não significa que seu vento físico seja zero. Sem nenhum pixel aceito, o índice
é null. O índice não é m/s, percentual de área com vento nem confiança
estatística. Média, p90, norm, cobertura e timestamps mantêm os significados
anteriores. O front não deriva visualSignal deles.

A flauta usa `0.3 + 3.7 * (1-exp(-visualSignal/0.04))` Hz, uma curva fixa
compartilhada por países, grupos e instantes. A legenda usa referências de
índice 0.01/0.10, não velocidades fictícias. O caminho antigo de velocidade só
permanece para dados sem a declaração visualSignal; o player nunca o usa como
fallback para um índice ausente em uma fonte que declara o novo modo.

A avaliação exploratória em três instantes, os países sem sinal e as limitações
estão em [ESTUDO_CIENTIFICO.md](ESTUDO_CIENTIFICO.md). Essa avaliação orientou a
mudança; não constitui garantia de ordenação correta em todos os casos.
