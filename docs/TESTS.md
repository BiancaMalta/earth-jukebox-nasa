# Test record

## Tests with participants

No participant testing is documented in this repository. The planned eyes-closed comparison and testing with blind or low-vision participants have no recorded results here, so their completion cannot be confirmed. The earlier empty response table and interview prompts have been removed so they cannot be mistaken for results. Do not describe accessibility or sound comprehension as user-validated.

Automated code checks and scientific comparisons below are separate evidence; they do not replace participant testing.

## Automated and scientific verification — 2026-11-15

The initial PM2.5, CO, and O3 audit and the expanded qualitative evaluation
are documented in the [pollutant audit](estudo-cientifico/validacao-poluentes.md)
and [qualitative PM2.5 study](estudo-cientifico/pm25-qualitativo.md). They
include snapshots, URLs, units, hashes, selection criteria, alternatives, and
remaining ranking reversals.

Checks performed:

- All 27 Python pipeline tests and 63 JavaScript tests passed.
- Offline reproduction generated identical CSV files and metrics for the
  PM2.5 evaluation; the initial audit was also reproduced with the archived
  baseline.
- The evaluator compared the published index with the recalculated index for
  all 29 samples. JavaScript tests checked reading and mapping all 185 PM2.5
  regional series across the 124 frames.
- The musical interval formula used in the study matched the actual JavaScript
  mapping at 1,001 points on the scale. The pitch and brightness curve was
  verified to be strictly increasing, with the same scale across regions.
- The dates and filenames of all 124 frames were preserved; `git diff --check`
  passed.

Commands, from the repository root with dependencies installed:

```bash
python -m unittest discover -s pipeline -p 'test_*.py'
node --test public/src/tests/*.test.mjs
python pipeline/evaluate_pm25_signal.py --output-dir /tmp/pm25-qualitativo
python pipeline/evaluate_pollutants.py --baseline-dir docs/estudo-cientifico/dados/poluentes/baseline --output-dir /tmp/auditoria-inicial
```

These checks do not replace perceptual tests with participants. No new
listening or accessibility tests with users were conducted in this stage.
