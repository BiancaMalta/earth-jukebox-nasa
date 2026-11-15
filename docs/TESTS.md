# User tests (Owner: Narr.)

## Eyes-closed test (5 min/person) — target ≥ 70 % correct
| # | Task 1 (warmer year?) | Task 2 (ice up/down?) | Task 3 (more fire?) | Extra questions | Comment |
|---|---|---|---|---|---|

## Test with blind / low-vision user
- Date, screen reader, consent to quote:
- 3 problems found:
- 3 changes made:

## Verificação automatizada e científica — 15/11/2026

A auditoria inicial de PM2.5, CO e O3 e a avaliação qualitativa ampliada estão
documentadas em [validação de poluentes](estudo-cientifico/validacao-poluentes.md)
e [PM2.5 qualitativo](estudo-cientifico/pm25-qualitativo.md). Incluem snapshots,
URLs, unidades, hashes, critérios de seleção, alternativas e inversões restantes.

Verificações realizadas:

- 27 testes Python do pipeline e 63 testes JavaScript passaram.
- A reprodução offline gerou CSV e métricas idênticos para a avaliação de PM2.5;
  a auditoria inicial também foi reproduzida com o baseline arquivado.
- O avaliador confrontou o índice publicado com o índice recalculado nas 29
  amostras; testes JavaScript verificaram a leitura e o mapeamento de todas as
  185 séries regionais de PM2.5 ao longo dos 124 frames.
- A fórmula de separação musical usada na pesquisa coincidiu com o mapeamento
  JavaScript real em 1.001 posições da escala. A curva de altura e brilho foi
  testada como estritamente crescente, com a mesma escala entre regiões.
- Datas e nomes dos 124 frames foram preservados; `git diff --check` passou.

Comandos, a partir da raiz e com as dependências instaladas:

```bash
python -m unittest discover -s pipeline -p 'test_*.py'
node --test public/src/tests/*.test.mjs
python pipeline/evaluate_pm25_signal.py --output-dir /tmp/pm25-qualitativo
python pipeline/evaluate_pollutants.py --baseline-dir docs/estudo-cientifico/dados/poluentes/baseline --output-dir /tmp/auditoria-inicial
```

Essas verificações não substituem testes perceptivos com participantes. Não foi
realizado novo teste de audição ou de acessibilidade com usuários nesta etapa.

## Estados regionais e precipitação nativa

A [recuperação de precipitação](estudo-cientifico/precipitacao-recuperacao.md)
adiciona testes para espera/erro separados de ausência científica, silêncio por
zero verdadeiro, datas e fuso EDT/EST, hashes dos originais e coerência de
`analysisSource` entre tabela geral e regional. A suíte Python passou com 29
testes. Os 7 arquivos de testes JavaScript passaram após regenerar a faixa.

O teste `pipeline/test_regional_availability_browser.mjs` usa um Firefox BiDi
exclusivo e servidor local para simular HTTP 503, repetir o pedido, verificar
ausência real de pixels, atrasar uma resposta durante a troca de faixa e
verificar timeout. Os dados anteriores e a comparação completa de 124 horários
foram preservados para contabilizar tanto recuperações quanto perdas. O arquivo
de legenda/filtros permanece byte a byte igual ao baseline.

## Sensibilidade de CO e PM2.5

`co-pm25-sensitivity.test.mjs` verifica as âncoras fixas e a monotonicidade de
CO, a duplicação dos intervalos de PM2.5 em cents com brilho preservado, e
todas as séries regionais publicadas, incluindo ausência de dados. Os testes
do motor percorrem o instrumento de PM2.5 nos extremos C3/C7 e aceitam as
notas C2/C6 de CO. As legendas comparam as novas referências.

O gerador da revisão mantém congeladas as curvas históricas e aceita
`--verify-implemented` para confrontar as curvas adotadas com o player em
todos os frames globais e regionais. O JSON histórico é reproduzido sem
alterar os dados publicados. Os 9 arquivos de testes JavaScript passaram.
Não houve novo teste perceptivo com participantes.
