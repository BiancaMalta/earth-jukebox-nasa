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
| `frames[].mean` | number | Média em `unit` dos pixels válidos decodificados |
| `frames[].p90` | number | Percentil 90 em `unit` |
| `frames[].norm` | number | `mean` normalizado de 0 a 1 entre `vmin` e `vmax`. **É o valor que vira nota.** |
| `frames[].coverage` | number | Opcional: fração da área analisada representada por pixels válidos |

Para vento (SVS 5148), `mean` e `p90` usam apenas pixels coloridos que
correspondem com confiança à legenda. A escala deixa os ventos baixos
transparentes e seu extremo alto se confunde com o mapa-base; portanto, esses
valores não são uma média global completa. `coverage` informa a proporção
efetivamente usada em cada quadro.

Para precipitação (SVS 5149), a unidade da legenda é milímetros e os pixels
coloridos são sobrepostos a nuvens e ao mapa-base. `mean` e `p90` usam apenas
pixels que correspondem com confiança à legenda; não representam uma média
global da precipitação. `coverage` informa a proporção efetivamente usada em
cada quadro.

## Regras

- **Dados** é dono do arquivo: gera com `pipeline/features.py` e substitui o mock (mantendo os mesmos campos).
- **Front/Som** só lê. Não edita o arquivo; se precisar de campo novo, combina e atualiza este documento primeiro.
- O número de frames é `frames.length` (o player não precisa mais descobrir um a um).
- Campos novos podem ser adicionados; os existentes não mudam de nome nem de significado.

## Dados regionais pré-calculados (`regions.json`, versão 1)

Gerados por `python pipeline/regions.py` em `public/data/<faixa>/regions.json`.
O front só lê esses valores: não decodifica cores, calcula médias ou normaliza
valores regionais. `features.json` continua sendo o contrato do quadro completo.

O documento regional contém:

- `schemaVersion: 1`, `track`, `svsId`, `mock: false`, `unit`, `vmin`, `vmax`.
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
de cada país. Os campos são arredondados para três casas decimais.

Os contornos são rasterizados na resolução nativa de cada frame e na projeção
equiretangular: o centro do pixel determina sua inclusão. Buracos e múltiplos
polígonos são preservados; continentes são a união dos países do GeoJSON, sem
adicionar áreas oceânicas. O arquivo de origem já divide os polígonos na linha
de mudança de data. Logos e timestamps são excluídos com a mesma máscara do
quadro completo. Não há redimensionamento nem mistura de pixels na borda.

`coverage` é a fração dos pixels analisáveis **dentro da região** que passaram
nos filtros da faixa. Sem filtro, todos os pixels analisáveis são usados, como
no cálculo geral atual. Essa fração não é uma porcentagem da área da Terra.
Sem pixels válidos (inclusive regiões menores que um pixel), a linha é
`[null,null,null,0]`. Ausência não é zero medido e não produz som.

As médias continuam sendo estimativas extraídas de imagens, com pesos iguais
por pixel, sem ponderação por área terrestre. Padronizar os dois caminhos não
remove limitações da legenda, filtros e resolução da imagem. O gerador copia os
timestamps existentes; não determina novos fusos ou instantes científicos.

Após alterar frames, legenda, filtros, limites geográficos ou `features.json`,
regenere as tabelas antes de publicar. O navegador detecta incompatibilidade com
os registros fonte, mas não calcula hashes de todas as imagens ou calibrações.
Falhas no carregamento/validação mantêm o áudio regional silencioso e exibem
uma mensagem; limpar a seleção retorna aos valores originais do quadro completo.
