# Contraste sonoro da precipitação

## Diagnóstico no conjunto atual

A análise de `public/data/clima-chuva/regions.json` encontrou 11.071 valores
regionais válidos: P10 = 0,530 mm, mediana = 0,667 mm, P90 = 0,885 mm.
A média mundial varia de 0,701 a 0,786 mm. São médias apenas dos pixels
aceitos pelo extrator, com as limitações descritas no estudo científico.
Um país sem pixels aceitos não vira um país com precipitação zero.

A curva anterior `0.5 + 4.5 * (1 - exp(-amount / 5))` destinava quase toda a
faixa audível a quantidades maiores que as médias fornecidas. O intervalo
P10–P90 produzia só 0,953–1,230 golpes/s. O corpo fixo em G3 também tornava
comparações curtas pouco informativas, mesmo depois de aumentar o volume.

## Calibração compartilhada

A nova curva interpola linearmente estes pares [mm, golpes/s]:
[0, 0.5], [0.25, 0.8], [0.5, 1.5], [0.75, 3], [1, 4], [2, 4.7].
Acima de 2 mm usa `4.7 + 0.3 * (1 - exp(-(amount - 2) / 5))`.
Zero continua silencioso. A taxa permanece limitada a 5 golpes/s.

O corpo do tambor também sobe em uma escala pentatônica de C3 a C5,
selecionada por `round(clamp((rate - .5) / 4.5) * 10)`.
Os dois sinais codificam a mesma quantidade. O volume do golpe não varia.

| Quantidade fornecida | Taxa anterior | Nova taxa | Corpo do tambor |
| --- | --- | --- | --- |
| 0,530 mm | 0,953/s | 1,680/s | G3 |
| 0,600 mm | 1,009/s | 2,100/s | A3 |
| 0,750 mm | 1,127/s | 3,000/s | D4 |
| 0,885 mm | 1,230/s | 3,540/s | E4 |
| 1,000 mm | 1,316/s | 4,000/s | G4 |

A calibração foi escolhida considerando a distribuição observada, mas os
mesmos pontos fixos se aplicam a todos os lugares, horários e modos. A curva
não se recalcula com os extremos de cada seleção. Não alteramos extração,
filtros, cobertura, valores físicos ou dados ausentes. Diferenças pequenas
continuam sendo diferenças pequenas nos dados: sua ampliação musical está
declarada. Os golpes não representam eventos reais de chuva nem mm/h.

## Verificação e limites

`precipitation-contrast.test.mjs` verifica monotonicidade, limites, silêncio,
a mesma transferência para diferentes coberturas e uma separação P10–P90
mais de cinco vezes maior usando os valores regionais reais do repositório.
Os testes do motor verificam que uma mudança altera o próximo golpe sem
criar novos instrumentos. A legenda compara 0,5 e 1 mm por 2,4 segundos.

Esses testes verificam os parâmetros e o comportamento do motor; não
substituem uma avaliação de escuta. Conferir no navegador países com séries
válidas, como Chile, Índia e Noruega, e ouvir também o modo combinado.
Países com muitos quadros indisponíveis continuam sujeitos às limitações
de cobertura. Não há preenchimento artificial para fazê-los tocar.
