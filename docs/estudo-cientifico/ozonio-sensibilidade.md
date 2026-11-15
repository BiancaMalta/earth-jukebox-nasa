# Ozônio: escala de Dó maior com maior sensibilidade

Mudança solicitada pelo usuário em 15/11/2026. A extração, os JSONs de ozônio,
os filtros, os valores em ppbv e o `norm` publicado permanecem iguais. A
alteração é no mapeamento musical compartilhado entre modo individual e combinado.

## Curva fixa

São **29 notas naturais de Dó maior entre C3 e C7**, incluindo Fá e Si. O
`norm` continua sendo a posição linear na legenda de 5–60 ppbv. A função
sonora interpreta essa posição e seleciona o degrau mais próximo:

| Concentração interpretada | Índice da nota |
|---|---:|
| 5 ppbv | 0 (C3) |
| 30 ppbv | 4 (G3) |
| 50 ppbv | 24 (F6) |
| 60 ppbv | 28 (C7) |

Entre essas âncoras, a interpolação é linear no **índice da escala**. Na faixa
30–50 ppbv, cada 1 ppbv avança um degrau diatônico. Abaixo dela são 6,25 ppbv
por degrau; acima, 2,5 ppbv. A seleção é arredondada para a nota mais próxima.
Não se ajusta a curva à região, ao período ou à faixa observada de cada país.

Exemplos centrais: 40 ppbv → C5; 41 → D5; 42 → E5; 43 → F5; 44 → G5;
45 → A5. Uma mudança pequena pode continuar na mesma nota. O `norm` publicado
tem resolução de 0,001 (cerca de 0,055 ppbv nesta legenda), então os pontos
exatos de troca também estão sujeitos a esse arredondamento de entrada.

A curva é monotônica: concentrações maiores não produzem notas menores. A
ausência de dados, cobertura zero e os estados de carregamento/erro continuam
silenciosos. Nenhuma nota é inventada para preencher lacunas. Volume, envelope,
reverb e timbre de corda dedilhada permanecem iguais. A legenda sonora agora
compara **40 ppbv (C5) e 41 ppbv (D5)**, mostrando a sensibilidade central.

## Resultado nos dados publicados

A curva anterior dividia toda a legenda em 10 intervalos de aproximadamente
5,5 ppbv, com 11 notas pentatônicas de C4 a C6. Isso fazia regiões com vários
ppbv de variação permanecerem na mesma nota.

| Série de 124 frames | Notas distintas antes → depois | Trocas entre frames consecutivos antes → depois |
|---|---:|---:|
| Global | 1 → 3 | 0 → 18 |
| América do Norte | 1 → 5 | 0 → 52 |
| América do Sul | 3 → 8 | 20 → 102 |
| Europa | 2 → 4 | 6 → 19 |
| Ásia | 2 → 7 | 23 → 102 |

A América do Norte varia de 41,467 a 44,751 ppbv e agora usa D5, E5, F5, G5
e A5, em vez de E5 durante toda a série. Não houve inversão entre direção de
mudança da média e direção de troca de nota nas séries auditadas; empates
continuam possíveis. Casos ausentes mantiveram exatamente a mesma contagem.
Os [resultados por região](dados/ozonio-sensibilidade.json) incluem todas as
entidades do GeoJSON e os grupos, não somente os exemplos da tabela.

## Limites e validação

Mais sensibilidade musical não aumenta a precisão física da concentração
extraída da imagem. A curva torna pequenas mudanças mais perceptíveis nos
parâmetros musicais, podendo também evidenciar pequenas oscilações da extração.
Não foi feito novo teste perceptivo com participantes nem foram recalculados
campos de ozônio. As limitações de cobertura de pixels do estudo anterior
continuam válidas.

Os testes verificam âncoras, Fá/Si, limites, progressão a cada ppbv inteiro na
faixa central, arredondamento, monotonicidade, ausência de dados e preservação
dos mapeamentos pentatônicos de temperatura e CO. A legenda tem seus exemplos
testados pelo mesmo caminho do motor de áudio. Os testes regionais e do modo
combinado também passaram.

```bash
node --test public/src/tests/*.test.mjs
node pipeline/evaluate_ozone_sensitivity.mjs --output /tmp/ozone-sensitivity.json
```

Implementação e documentação assistidas por OpenAI Codex, conforme a proposta
musical aprovada pelo usuário. Dados de imagem: NASA SVS 5152 / GMAO GEOS-CF.
