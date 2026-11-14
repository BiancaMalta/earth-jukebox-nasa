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
