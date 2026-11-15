# CO e PM2.5: revisão da variabilidade musical

Análise solicitada em 15/11/2026. Foram avaliados os 124 frames globais e
todas as 185 séries regionais de cada variável. **As curvas aprovadas foram
implementadas: CO em Dó maior C2–C6 e PM2.5 contínuo C3–C7.** Os dados,
filtros de extração, índices e critérios de ausência permanecem iguais.

A comparação abaixo preserva o estado anterior à implementação. No JSON,
`current` e `currentC4C6` identificam esse baseline histórico; `candidate` e
`candidateC3C7` são as curvas agora adotadas. O gerador mantém as fórmulas
anteriores congeladas e pode verificar as funções reais do player em todas
as séries, sem reescrever dados de produção.

## Monóxido de carbono

O CO usava 11 notas pentatônicas entre C3 e C5 para 40–500 ppbv. Isso correspondia
a aproximadamente **46 ppbv por degrau**. O trompete sintetizado sustenta a nota
durante a reprodução e só muda de altura quando cruza um desses degraus.

Há variação nos dados que não chega à melodia:

| Série | Concentração mínima–máxima, ppbv | Notas distintas anteriores | Trocas anteriores |
|---|---|---:|---:|
| Global | 78,562–83,751 | 1 | 0 |
| América do Norte | 89,185–105,264 | 1 | 0 |
| Europa | 88,572–104,643 | 1 | 0 |
| África | 118,530–141,609 | 1 | 0 |
| América do Sul | 131,000–157,682 | 2 | 8 |
| Ásia | 133,511–189,976 | 2 | 25 |

### Curva adotada

São 29 notas de Dó maior entre **C2 e C6**, com interpolação linear entre
âncoras fixas de concentração e índice de nota: **40→0, 60→3, 200→24,
500→28**. Na faixa central, são aproximadamente **6,67 ppbv por degrau**.
Os extremos continuam representados, com degraus de 6,67 ppbv abaixo de 60
e 75 ppbv acima de 200. O arredondamento escolhe o degrau mais próximo.
Não há normalização por região ou adaptação ao período.

| Série | Notas distintas anteriores → adotadas | Trocas anteriores → adotadas |
|---|---:|---:|
| Global | 1 → 2 | 0 → 4 |
| América do Norte | 1 → 4 | 0 → 39 |
| Europa | 1 → 4 | 0 → 14 |
| África | 1 → 4 | 0 → 56 |
| América do Sul | 2 → 5 | 8 → 37 |
| Ásia | 2 → 9 | 25 → 78 |

A curva usa o mesmo `norm` publicado, interpretado na escala fixa
40–500 ppbv; o passo efetivo tem também o arredondamento de entrada de
0,001 em norm (aproximadamente 0,46 ppbv). Nenhuma direção de troca foi
invertida frente à direção da média nas séries examinadas. Ausências mantêm
a contagem anterior. Concentrações acima de 200 ppbv ficam com menor
sensibilidade que na faixa central: esse é um compromisso explícito para
evitar uma extensão de registro musical excessiva. Notas no extremo inferior
também podem ficar pouco presentes em alto-falantes pequenos.

## Material particulado PM2.5

PM2.5 já tem **afinação contínua**, não notas discretas. Usa o índice visual
validado anteriormente e a curva `b = p + 0,3 × sin(πp)`. A frequência anterior
era `C4 × 4^b`, cobrindo duas oitavas. Logo, a limitação principal era o tamanho
dos deslocamentos de altura.

Na série global, o índice varia de **0,120339 a 0,128871**. O deslocamento
total anterior era de apenas **38,3 cents**, com mudança mediana de **3,3 cents**
entre frames consecutivos. Um semitom tem 100 cents; esses números descrevem
parâmetros musicais, não garantem limiares auditivos universais.

### Propostas avaliadas

Manter o índice visual e o brilho/filtro atuais, ampliando somente o registro:

- **C3–C6**, `C3 × 8^b`: diferenças de altura 1,5 vez maiores.
- **C3–C7**, `C3 × 16^b`: diferenças de altura 2 vezes maiores; opção adotada.

Essa ampliação multiplica igualmente os intervalos em cents de todas as
regiões, incluindo pares de lugares distintos. Não concentra sensibilidade
na média global em detrimento de regiões mais carregadas, não cria batidas
novas e não quantiza o índice em degraus que eliminariam pequenas variações.

| Série | Mudança mediana por frame anterior → C3–C7, cents | Transições de pelo menos 1 semitom anteriores → C3–C7 |
|---|---:|---:|
| Global | 3,3 → 6,6 | 0 → 0 |
| América do Norte | 26,3 → 52,6 | 0 → 20 |
| Europa | 15,7 → 31,3 | 0 → 3 |
| África | 20,5 → 41,0 | 0 → 4 |
| América do Sul | 26,4 → 52,8 | 1 → 23 |
| Ásia | 50,1 → 100,2 | 11 → 62 |

Cada linha dessas regiões tem 123 transições consecutivas disponíveis. A
amplitude total global passa de **38,3 para 76,6 cents**, ainda discreta.
A média global tem pouca variação no próprio índice. A curva aumenta o
contraste regional de maneira uniforme; não garante movimento global intenso.

Os limites aceitos pelo motor e pelo instrumento de PM2.5 foram atualizados
juntos: o registro é aproximadamente 130,8 a 2093,0 Hz, em vez de 261,6 a
1046,5 Hz. Os testes percorrem as duas camadas para garantir que os extremos
sejam aceitos. Ganho, envelope, filtro e reverb mantêm suas curvas anteriores.
O timbre FM pode ficar mais agudo no extremo alto; a avaliação no mix ainda
depende de escuta.

## Implementação e validação

As duas curvas foram aplicadas ao player, às legendas sonoras e às descrições.
A legenda de CO compara 100 ppbv (E3) com 107 ppbv (F3); a de PM2.5 mantém
índices 0/1, agora C3/C7. Os testes verificam âncoras e monotonicidade do CO,
duplicação dos intervalos em cents do PM2.5, brilho preservado, entradas
regionais publicadas e ausências silenciosas. A temperatura mantém sua escala
pentatônica anterior. São decisões musicais e não aumentam a precisão dos
dados. Não foi realizado teste perceptivo com participantes.

Resultados completos: [co-pm25-variabilidade.json](dados/co-pm25-variabilidade.json).
Para reproduzir sem rede e sem alterar produção:

```bash
node pipeline/review_co_pm25_variability.mjs --verify-implemented --output /tmp/co-pm25-review.json
node --test public/src/tests/*.test.mjs
```

Análise e documentação assistidas por OpenAI Codex. Dados de imagem e seus
limites continuam os já documentados para NASA SVS 5151 e 5153.
