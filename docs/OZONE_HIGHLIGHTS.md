# Experimentos de destaque do ozônio — descartados

Estado atual: o ozônio voltou ao comportamento original, sem limiar e sem
volume dependente da concentração. O ganho fixo do canal foi reduzido de
2,8 para 2,3 (cerca de −1,7 dB). As opções experimentais foram removidas da
interface. A análise JSON e o script registram o experimento, não uma regra
usada no playback.

## Análise anterior: experimento com corte (substituído)

A análise reproduzível está em `scripts/analyze-ozone-threshold.mjs`:

```sh
node scripts/analyze-ozone-threshold.mjs
```

O relatório `ozone-threshold-analysis.json` avalia os valores válidos de cada
série separadamente e reinicia o estado após um quadro ausente. Há 20.307
valores regionais válidos: P25 = 35,001, mediana = 40,087 e P75 = 45,104 ppbv.
Os percentuais contam pares lugar/quadro, com países e regiões sobrepostos;
não representam área da Terra nem medições independentes.

| Entrada / saída (ppbv) | Quadros válidos destacados | Lugares com ambos os estados |
| --- | --- | --- |
| 40 / 38 | 56,2% | 123 |
| 42 / 40 | 45,6% | 126 |
| 44 / 42 | 35,7% | 130 |
| 45 / 43 | 30,5% | 118 |
| 46 / 44 | 25,6% | 110 |
| 48 / 46 | 17,2% | 88 |

Escolha inicial: entrar com concentração >= 42 ppbv e sair com <= 40 ppbv.
Dentro da faixa intermediária, manter o estado anterior. A escolha oferece
entradas e pausas sem restringir o instrumento apenas à cauda superior.
São critérios de composição musical, não limites de saúde ou concentração
fisicamente perigosa. O estudo não estabelece um ciclo diário: valores baixos
e dados ausentes são contados e tratados separadamente.

O experimento anterior demonstrou pausas, mas prejudicou a escuta individual.
Por isso, os limites 42/40 não controlam mais o áudio. O relatório JSON e o
script ficam como registro reproduzível da análise anterior. Os testes atuais
verificam a curva contínua, o piso audível, a opção de ganho constante e o
tratamento distinto de valores ausentes.
