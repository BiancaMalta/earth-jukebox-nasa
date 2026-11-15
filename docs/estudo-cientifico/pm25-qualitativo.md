# PM2.5: preservar mais/menos e aumentou/diminuiu

## Decisão e critério

O requisito da sonificação é preservar os contrastes e a direção das mudanças, com uma escala compartilhada entre regiões e instantes. A proximidade dos valores absolutos em µg/m³ não é o critério principal. A [auditoria inicial](validacao-poluentes.md) encontrou boa parte das tendências de vários dias, mas também inversões importantes de ordenação entre países. Esta etapa, em 15/11/2026, investigou e implementou um índice visual semelhante ao adotado para vento.

**Resultado:** o áudio de PM2.5 passou a usar `visualSignal`, um índice adimensional de intensidade logarítmica e extensão das cores detectadas. A curva musical, o instrumento, o volume e a escala compartilhada foram mantidos. As verificações ampliadas mostram melhora forte de mais/menos e melhora de aumentou/diminuiu. Ainda existem inversões individuais; os dados numéricos de referência continuam sendo GEOS-CF, não observações independentes.

**Atualização musical posterior:** após esta avaliação, foi adotado o registro
contínuo C3–C7, que dobra todos os intervalos em cents da curva C4–C6 usada
aqui. O índice visual, seu ordenamento, o brilho e os dados permanecem iguais.
As métricas e o avaliador deste estudo mantêm a curva histórica para permitir
reprodução. Veja a [revisão de variabilidade](co-pm25-variabilidade.md).

## Por que a média anterior invertia alguns contrastes

A média aritmética de concentrações decodificadas pode ser dominada por poucos pixels escuros atribuídos ao extremo alto da legenda. Isso é especialmente problemático quando há linhas e detalhes do mapa ou mistura de cores. A auditoria não identificou a origem de cada pixel extremo; por isso não afirmamos que todos sejam artefatos. Entretanto, o comportamento da agregação é verificável: poucos valores de centenas de µg/m³ podem superar uma região com sinal moderado espalhado.

Exemplo real no frame 1:

| País | Referência GEOS-CF µg/m³ | Média da imagem anterior µg/m³ | Novo índice visual |
|---|---:|---:|---:|
| Noruega | 5,13 | 51,78 | 0,131522 |
| Índia | 36,96 | 6,98 | 0,356917 |

Antes, a Noruega recebia um tom mais alto, invertendo um contraste forte. Agora a Índia recebe um tom mais alto e brilhante. A correção vem da agregação visual, sem inserir os valores de referência no player ou ajustar uma escala para cada país.

## Índice adotado

Cada pixel aceito recebe sua posição na legenda logarítmica fixa:

```text
p = clip(log(valor / 0,4) / log(409,6 / 0,4), 0, 1)

visualSignal = Σ(peso de área × p dos pixels aceitos)
               ÷ Σ(pesos de área de todos os pixels analisáveis)
```

O peso é cos(latitude). Assim, o logaritmo é aplicado **antes** da agregação; calcular o logaritmo da média física, como em `norm`, não produz o mesmo resultado. Os filtros e a legenda de cores não foram ajustados para os dados de referência.

O denominador inclui a região inteira analisável, como no vento. Pixels rejeitados não contribuem sinal visual detectado; sua concentração física permanece desconhecida. Nenhum pixel aceito resulta em `null`, não em ar sem poluição. O índice não é µg/m³, proporção da área poluída nem confiança estatística.

`mean`, `p90`, `norm` e `coverage` continuam diagnósticos separados. Nesta regeneração, a média física de PM2.5 também passou a receber ponderação por latitude, usando o método já existente no pipeline. `norm` continua sendo o logaritmo normalizado dessa média; não foi substituído pelo índice. A tabela regional passa a schema 3, com `visualSignal` na quinta coluna e declaração `sonification.input=visualSignal`.

## Escolha e verificação posterior

Nos frames **1, 32 e 63**, comparamos seis alternativas. Abaixo, Spearman entre países; a métrica avalia a ordenação, não porcentagem de precisão:

| Agregação | Frame 1 | Frame 32 | Frame 63 |
|---|---:|---:|---:|
| Média anterior normalizada, efetivamente usada pelo áudio | 0,565 | 0,539 | 0,549 |
| Posições logarítmicas, média ponderada apenas nos pixels aceitos | 0,945 | 0,961 | 0,960 |
| **Posições logarítmicas × extensão, índice adotado** | **0,977** | **0,975** | **0,980** |
| Mediana dos valores aceitos | 0,968 | 0,970 | 0,964 |
| Média descartando valores acima do percentil 95 | 0,854 | 0,942 | 0,901 |

A média física ponderada também foi avaliada e está no JSON; ponderação sozinha não resolve as inversões. O índice com extensão teve o melhor resultado nos três instantes de escolha, sem introduzir cortes ajustados aos países.

Após essa escolha, verificamos os frames **100 e 120**, já presentes na auditoria anterior, e consultamos **24 instantes adicionais**, ainda não usados na escolha: **2–9, 64–71 e 112–119**. São 29 instantes no total. Os três trechos **1–9, 63–71 e 112–120** fornecem **24 transições consecutivas de três horas**, distribuídas em diferentes partes do período. Não são 29 instantes independentes: há autocorrelação temporal e espacial. Os frames 100/120 já haviam sido inspecionados para a média antiga; os 24 novos constituem a verificação adicional do índice escolhido.

As mesmas regras de suporte do estudo anterior foram aplicadas a todas as alternativas: pelo menos **8 pontos válidos** da grade de referência (~1,25°) e **100 pixels analisáveis** da imagem. Entram **98 países/territórios** e **7 grupos continentais** por instante. Países menores e o grupo de territórios em mar aberto ficam fora dessa avaliação. A definição de Europa inclui toda a Rússia. A Antártida também aparece como entidade territorial do GeoJSON, sem implicar que seja um país.

Os snapshots e suas URLs, unidades e hashes foram arquivados. O nível inferior do modelo e a hipótese de centro horário 30 minutos após o rótulo Eastern seguem a auditoria inicial. A fórmula e a execução exatas do renderizador SVS não foram confirmadas; a avaliação mede concordância com o campo `pm25_rh35` escolhido como referência.

## Mais versus menos entre regiões

Nos **24 instantes novos**, a correlação de ordenação entre países foi de **0,966 a 0,985**, contra **0,539 a 0,733** no som anterior. Nos dois instantes anteriores reservados para checagem, o novo índice obteve **0,980 e 0,959**. Entre os 7 grupos continentais, nos 24 instantes novos, a faixa foi **0,929–1,000**.

Para avaliar especificamente “muito versus pouco”, contamos pares do mesmo tipo de região no mesmo instante com concentração de referência **pelo menos 2 vezes maior e diferença de pelo menos 5 µg/m³**. Esses critérios descritivos foram fixados antes de consultar os 24 novos instantes; não são limites de saúde ou de erro de medição.

| Comparação forte nos 24 instantes novos | Som anterior: ordem correta | Índice adotado: ordem correta |
|---|---:|---:|
| Países/territórios | 46.336/55.378 (**83,67%**) | 55.349/55.378 (**99,95%**) |
| Grupos continentais | 282/282 (100%) | 282/282 (100%) |

Na comparação entre países, o método anterior teve **8.980 inversões e 62 empates**; o índice teve **29 inversões e nenhum empate**. O ganho continental aparece principalmente na ordenação dos contrastes menores: os contrastes continentais fortes já eram preservados.

Esses milhares de pares reutilizam os mesmos países e horários. As frações descrevem esta amostra e este critério; não são probabilidade de acerto em uma região futura nem tamanho de amostra independente.

## Aumentou versus diminuiu a cada três horas

As métricas abaixo comparam somente as 24 transições consecutivas dos três trechos, sem usar saltos de vários dias:

| Países/territórios: mudança na referência | Som anterior: direção correta | Índice adotado: direção correta |
|---|---:|---:|
| Qualquer mudança não nula | 1.828/2.352 (**77,7%**) | 2.020/2.352 (**85,9%**) |
| Mudança absoluta >1 µg/m³ | 925/1.026 (**90,2%**) | 980/1.026 (**95,5%**) |
| Mudança absoluta >2 µg/m³ | 510/548 (**93,1%**) | 536/548 (**97,8%**) |
| Mudança absoluta >5 µg/m³ | 151/158 (**95,6%**) | 157/158 (**99,4%**) |

Os cortes >2 e >5 são uma análise adicional de sensibilidade, realizada após a primeira avaliação >0/>1; não foram usados para escolher ou alterar o índice. Empates contam como ausência de direção correta, não são descartados. Com mudança >1, o método anterior teve 86 inversões e 15 empates; o novo teve 46 inversões e nenhum empate. Nos grupos continentais, o índice acertou **147/168** mudanças não nulas e **40/41** acima de 1 µg/m³.

Também verificamos o cenário explícito **“uma região aumenta enquanto outra diminui”**, na mesma transição. Exigindo que ambas mudem mais de 1 µg/m³, ambas as direções foram preservadas em **7.097/7.804 pares de países (90,9%)**, contra **6.185/7.804 (79,3%)** antes. Nos continentes, foram **7/8** pares contra **8/8** antes: a amostra é pequena e há uma regressão nesse subconjunto, que não foi ocultada.

Há falhas relevantes individuais: por exemplo, na transição **117→118**, a referência da Coreia do Norte aumenta **6,68 µg/m³**, enquanto o índice cai **0,008715**. Essa é a única inversão entre as 158 mudanças nacionais acima de 5 µg/m³ avaliadas. Mudanças muito pequenas continuam menos confiáveis; não há garantia de direção em cada frame.

## O contraste chega ao áudio?

O player usa o índice fornecido pelo Python, sem derivá-lo de média, cobertura ou `norm`. A curva permanece fixa:

```text
brilho = índice + 0,3 × sin(π × índice)
frequência = 261,625565 × 4^brilho Hz
filtro = 1400 + 4800 × brilho Hz
```

Ela é estritamente crescente de 0 a 1: um índice maior sempre dá um tom mais alto e brilhante. O mesmo índice produz o mesmo som em qualquer país, grupo e instante, inclusive no modo combinado. Não há normalização por região, compensação para esconder inversões ou troca de instrumento.

Além do sinal da diferença, avaliamos a separação nominal das alturas: **55.257/55.378 contrastes nacionais fortes nos 24 instantes novos (99,78%)** receberam a ordem correta **e pelo menos 100 cents de separação** — um semitom. Nos continentes, foram 282/282. Entre os 55.349 pares nacionais com ordem correta, 92 ficaram abaixo desse piso; outros 29 estavam invertidos. Isso verifica os parâmetros musicais, não constitui teste de audição: não se demonstrou que toda pessoa distinguirá esse contraste em uma mistura de sete instrumentos. Mudanças pequenas no tempo podem continuar pouco perceptíveis mesmo quando a direção numérica está correta.

A interface e a legenda sonora agora identificam o sinal visual como índice, com média física separada para diagnóstico. Sem índice válido ou sem pixels aceitos, o instrumento fica silencioso; ele não recorre à média antiga para inventar um substituto.

## Reprodução e artefatos

- [Resultados completos, seleção, contagens e hashes](dados/pm25-qualitativo/pm25-qualitativo.json).
- [CSV por região e instante, com todas as alternativas](dados/pm25-qualitativo/pm25-qualitativo.csv).
- Novos snapshots: `dados/pm25-qualitativo/frame-*.npz` e `.json`; os cinco originais ficam em `dados/poluentes/`.
- Para reproduzir a auditoria histórica após a atualização de produção, os JSONs anteriores de PM2.5 foram preservados em `dados/poluentes/baseline/ar-pm25/*.json.gz`. Os hashes correspondem aos registrados na auditoria inicial.

Com as dependências do pipeline instaladas, na raiz:

```bash
# Offline: refaz todas as comparações e confere os índices publicados amostrados.
python pipeline/evaluate_pm25_signal.py --output-dir /tmp/pm25-qualitativo

# Auditoria histórica, mantendo o estado anterior de PM2.5.
python pipeline/evaluate_pollutants.py --baseline-dir docs/estudo-cientifico/dados/poluentes/baseline --output-dir /tmp/auditoria-inicial

# Regenera a faixa inteira a partir das mesmas imagens (altera produção).
python pipeline/regions.py --update-features --track ar-pm25

python -m unittest discover -s pipeline -p 'test_*.py'
node --test public/src/tests/*.test.mjs
```

Para refazer apenas as consultas adicionais, sem substituir snapshots arquivados:

```bash
python pipeline/fetch_pollutant_reference.py --output-dir /tmp/pm25-reference --variables pm25_rh35 --frames 2 3 4 5 6 7 8 9 64 65 66 67 68 69 70 71 112 113 114 115 116 117 118 119
```

As referências são as mesmas fontes oficiais detalhadas na auditoria inicial, em particular [NASA SVS 5151](https://svs.gsfc.nasa.gov/5151/) e [GEOS-CF v2 AQC](https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/v2/ana/aqc_tavg_1hr_glo_L1440x721_slv.info). A melhoria observada sustenta a proposta qualitativa nessas amostras; não resolve a equivalência da receita de PM2.5, os valores absolutos, a série completa de 124 referências ou a validação por estações independentes.

Pesquisa e implementação assistidas por OpenAI Codex. Dados de referência: NASA GMAO; visualizações: NASA SVS.
