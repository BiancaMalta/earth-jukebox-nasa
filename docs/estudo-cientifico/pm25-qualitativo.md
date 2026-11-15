# PM2.5: preserving more/less and rising/falling patterns

## Decision and criterion

The sonification requirement is to preserve contrasts and direction of change, using one shared scale across regions and timestamps. Closeness of absolute values in µg/m³ is not the primary criterion. The [initial audit](validacao-poluentes.md) found many multi-day trends but also important ranking reversals among countries. On 2026-11-15, this stage investigated and implemented a visual index similar to the one adopted for wind.

**Result:** PM2.5 audio now uses `visualSignal`, a dimensionless index of log intensity and extent of detected colors. The musical curve, instrument, volume, and shared scale were kept. Expanded checks show a strong improvement in more/less comparisons and an improvement in rising/falling comparisons. Individual reversals remain; numerical reference data are still GEOS-CF, not independent observations.

## Why the previous mean reversed some contrasts

The arithmetic mean of decoded concentrations can be dominated by a few dark pixels assigned to the high end of the legend. This is especially problematic around lines and map details or where colors are mixed. The audit did not identify the origin of every extreme pixel, so we do not claim they are all artifacts. However, the aggregation behavior is verifiable: a few values in the hundreds of µg/m³ can outweigh a region with a widespread moderate signal.

Real example from frame 1:

| Country | GEOS-CF reference µg/m³ | Previous image mean µg/m³ | New visual index |
|---|---:|---:|---:|
| Norway | 5.13 | 51.78 | 0.131522 |
| India | 36.96 | 6.98 | 0.356917 |

Previously, Norway received a higher note, reversing a strong contrast. Now India receives a higher, brighter note. The correction comes from visual aggregation; reference values are not inserted into the player, and the scale is not adjusted for each country.

## Adopted index

Each accepted pixel receives its position on the fixed logarithmic legend:

```text
p = clip(log(value / 0.4) / log(409.6 / 0.4), 0, 1)

visualSignal = Σ(area weight × p for accepted pixels)
               ÷ Σ(area weights for all analyzable pixels)
```

The weight is cos(latitude). The logarithm is applied **before** aggregation; taking the logarithm of the physical mean, as in `norm`, does not produce the same result. Filters and colorbar were not tuned to the reference data.

The denominator includes the entire analyzable region, as it does for wind. Rejected pixels add no detected visual signal; their physical concentration remains unknown. If no pixel is accepted, the result is `null`, not air without pollution. The index is not µg/m³, a fraction of polluted area, or statistical confidence.

`mean`, `p90`, `norm`, and `coverage` remain separate diagnostics. In this regeneration, the physical PM2.5 mean also gained latitude weighting, using the method already present in the pipeline. `norm` remains the logarithmically normalized physical mean; it was not replaced by the index. The regional table is now schema version 3, with `visualSignal` as the fifth column and declaration `sonification.input=visualSignal`.

## Choice and follow-up evaluation

At frames **1, 32, and 63**, we compared six alternatives. The values below are Spearman correlations among countries; this metric evaluates ranking, not a percentage of accuracy:

| Aggregation | Frame 1 | Frame 32 | Frame 63 |
|---|---:|---:|---:|
| Previous normalized mean, effectively used by the audio | 0.565 | 0.539 | 0.549 |
| Log positions, weighted mean over accepted pixels only | 0.945 | 0.961 | 0.960 |
| **Log positions × extent, adopted index** | **0.977** | **0.975** | **0.980** |
| Median of accepted values | 0.968 | 0.970 | 0.964 |
| Mean after dropping values above the 95th percentile | 0.854 | 0.942 | 0.901 |

The weighted physical mean was also evaluated and is in the JSON; weighting alone does not resolve reversals. The index including extent performed best at all three selection timestamps without introducing country-specific thresholds.

After selecting the index, we checked frames **100 and 120**, already included in the previous audit, and queried **24 additional timestamps** not used in the selection: **2–9, 64–71, and 112–119**. There are 29 timestamps total. The three segments **1–9, 63–71, and 112–120** provide **24 consecutive three-hour transitions** across different parts of the period. These are not 29 independent timestamps: temporal and spatial autocorrelation exist. Frames 100/120 had already been inspected for the old mean; the 24 new timestamps provide the additional evaluation of the selected index.

The same support rules from the earlier study were applied to all alternatives: at least **8 valid points** on the reference grid (~1.25°) and **100 analyzable image pixels**. The evaluation includes **98 countries/territories** and **7 continent groups** at each timestamp. Smaller countries and the open-ocean territory group are excluded. Europe includes all of Russia. Antarctica also appears as a territorial entity in the GeoJSON; this does not imply it is a country.

Snapshots, their URLs, units, and hashes were archived. The model's lower level and the assumption of an hourly center 30 minutes after the Eastern label follow the initial audit. The exact recipe and execution used by the SVS renderer have not been confirmed; the evaluation measures agreement with the selected `pm25_rh35` reference field.

## More versus less across regions

At the **24 new timestamps**, country ranking correlation ranged from **0.966 to 0.985**, compared with **0.539 to 0.733** for the previous sound input. At the two earlier timestamps reserved for checking, the new index scored **0.980 and 0.959**. Across the 7 continent groups, the range at the 24 new timestamps was **0.929–1.000**.

To specifically evaluate “much more versus much less,” we counted pairs of the same region type at the same timestamp where the reference concentration was **at least twice as high and differed by at least 5 µg/m³**. These descriptive criteria were set before checking the 24 new timestamps; they are not health or measurement-error thresholds.

| Strong contrast across the 24 new timestamps | Previous sound: correct order | Adopted index: correct order |
|---|---:|---:|
| Countries/territories | 46,336/55,378 (**83.67%**) | 55,349/55,378 (**99.95%**) |
| Continent groups | 282/282 (100%) | 282/282 (100%) |

For the country comparisons, the previous method had **8,980 reversals and 62 ties**; the index had **29 reversals and no ties**. The improvement for continent groups is most visible in the ranking of smaller contrasts; strong continent contrasts were already preserved.

These thousands of pairs reuse the same countries and timestamps. The fractions describe this sample and criterion; they are not the probability of success in a future region or an independent sample size.

## Rising versus falling every three hours

The metrics below compare only the 24 consecutive transitions in the three segments, with no multi-day jumps:

| Countries/territories: reference change | Previous sound: correct direction | Adopted index: correct direction |
|---|---:|---:|
| Any non-zero change | 1,828/2,352 (**77.7%**) | 2,020/2,352 (**85.9%**) |
| Absolute change >1 µg/m³ | 925/1,026 (**90.2%**) | 980/1,026 (**95.5%**) |
| Absolute change >2 µg/m³ | 510/548 (**93.1%**) | 536/548 (**97.8%**) |
| Absolute change >5 µg/m³ | 151/158 (**95.6%**) | 157/158 (**99.4%**) |

The >2 and >5 thresholds are an additional sensitivity analysis performed after the first >0/>1 evaluation; they were not used to select or alter the index. Ties count as an incorrect direction rather than being discarded. For changes >1, the previous method had 86 reversals and 15 ties; the new method had 46 reversals and no ties. For continent groups, the index got **147/168** non-zero changes and **40/41** changes above 1 µg/m³ correct.

We also checked the explicit scenario **“one region increases while another decreases”** within the same transition. Requiring both to change by more than 1 µg/m³, both directions were preserved in **7,097/7,804 country pairs (90.9%)**, compared with **6,185/7,804 (79.3%)** previously. For continents, the result was **7/8** pairs versus **8/8** previously: the sample is small, and this subset contains a regression, which is reported rather than hidden.

Important individual failures remain. For example, from transition **117→118**, the North Korea reference increases **6.68 µg/m³**, while the index falls by **0.008715**. This is the only reversal among the 158 evaluated country changes above 5 µg/m³. Very small changes remain less reliable; direction is not guaranteed for every frame.

## Does the contrast reach the audio?

The player uses the value supplied by Python, without deriving it from the mean, coverage, or `norm`. The curve remains fixed:

```text
brightness = index + 0.3 × sin(π × index)
frequency = 261.625565 × 4^brightness Hz
filter = 1400 + 4800 × brightness Hz
```

It is strictly increasing from 0 to 1: a higher index always produces a higher, brighter tone. The same index produces the same sound for any country, group, or timestamp, including in combined mode. There is no regional normalization, compensation to hide reversals, or instrument switch.

In addition to difference direction, we evaluated nominal pitch separation: **55,257/55,378 strong country contrasts across the 24 new timestamps (99.78%)** had the correct order **and at least 100 cents of separation**—one semitone. For continents, the result was 282/282. Of the 55,349 country pairs with correct order, 92 were below this floor; another 29 were reversed. This checks musical parameters, not listening perception: it has not been shown that everyone can distinguish this contrast in a seven-instrument mix. Small changes over time may remain hard to hear even when their numerical direction is correct.

The interface and sound guide now identify the visual signal as an index, with the physical mean shown separately for diagnostics. Without a valid index or accepted pixels, the instrument is silent; it does not fall back to the old mean to invent a substitute.

## Reproduction and artifacts

- [Complete results, selection, counts, and hashes](dados/pm25-qualitativo/pm25-qualitativo.json).
- [Region-by-timestamp CSV with all alternatives](dados/pm25-qualitativo/pm25-qualitativo.csv).
- New snapshots: `dados/pm25-qualitativo/frame-*.npz` and `.json`; the five original snapshots are in `dados/poluentes/`.
- To reproduce the historical audit after updating production, the earlier PM2.5 JSON files were preserved in `dados/poluentes/baseline/ar-pm25/*.json.gz`. Their hashes match those recorded in the initial audit.

With pipeline dependencies installed, from the repository root:

```bash
# Offline: reruns all comparisons and checks sampled published indices.
python pipeline/evaluate_pm25_signal.py --output-dir /tmp/pm25-qualitativo

# Historical audit using the preserved PM2.5 state.
python pipeline/evaluate_pollutants.py --baseline-dir docs/estudo-cientifico/dados/poluentes/baseline --output-dir /tmp/auditoria-inicial

# Regenerate the full track from the same images (changes production data).
python pipeline/regions.py --update-features --track ar-pm25

python -m unittest discover -s pipeline -p 'test_*.py'
node --test public/src/tests/*.test.mjs
```

To rerun only the additional queries without replacing archived snapshots:

```bash
python pipeline/fetch_pollutant_reference.py --output-dir /tmp/pm25-reference --variables pm25_rh35 --frames 2 3 4 5 6 7 8 9 64 65 66 67 68 69 70 71 112 113 114 115 116 117 118 119
```

The references are the same official sources detailed in the initial audit, especially [NASA SVS 5151](https://svs.gsfc.nasa.gov/5151/) and [GEOS-CF v2 AQC](https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/v2/ana/aqc_tavg_1hr_glo_L1440x721_slv.info). The observed improvement supports the qualitative goal in these samples; it does not resolve recipe equivalence for PM2.5, absolute values, the full series of 124 reference timestamps, or validation against independent stations.

Research and implementation assisted by OpenAI Codex. Reference data: NASA GMAO; visualizations: NASA SVS.
