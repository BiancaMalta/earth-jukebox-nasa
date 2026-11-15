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
