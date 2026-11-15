# PM2.5, CO, and ozone — audit of image-derived estimates

Research conducted on 2026-11-15. Published data audited at commit `80cee4e`.

**Later update:** This document preserves the initial audit. The [qualitative PM2.5 evaluation](pm25-qualitativo.md) expanded the sample and replaced that track's sound input with a visual index. The “published” values below refer to the earlier state, preserved in `dados/poluentes/baseline/ar-pm25/`; the statement that all three tables are unweighted also describes that earlier state. PM2.5 now uses area weighting and the visual index; CO/O3 remain as audited here.

## Was validation already available?

No numerical study of these three variables was found in the available files or Git history (`git log --all`). Commit `f0976a4`, which added the scientific validation, includes only temperature, humidity, wind, and precipitation in `compare_reference.py`; trend evaluation is specific to wind. The PM2.5, CO, and O3 additions include calibration, extraction, frame alignment, and software tests. Those tests check code behavior, including with synthetic legends; they do not compare against numerical reference concentrations. This documents the lack of evidence in the repository without ruling out unarchived external work.

The three published regional tables still have `schemaVersion: 1`, `equal pixel weights`, and no `statistics` declaration. Therefore, the area weighting from the meteorological study had not been applied to those tables. This investigation also calculates a weighted alternative for diagnosis only, without changing production data or sound.

## Reference and correspondence

The official [SVS 5151](https://svs.gsfc.nasa.gov/5151/), [5152](https://svs.gsfc.nasa.gov/5152/), and [5153](https://svs.gsfc.nasa.gov/5153/) pages identify near-surface concentrations estimated by GEOS-CF. GEOS-FP from the earlier study is not the appropriate chemical reference.

We used the analysis collection `GEOS-CF v2/ana/aqc_tavg_1hr_glo_L1440x721_slv`, available from [NASA OPeNDAP](https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/v2/ana/aqc_tavg_1hr_glo_L1440x721_slv.info). The [v2 draft specification, printed p. 10 / PDF p. 16](https://portal.nccs.nasa.gov/datashare/gmao/geos-cf/v2/GEOS-CF_FileSpecv2.0_Draft2.pdf) and archived DAS identify:

| Field | Reference definition | Conversion |
|---|---|---|
| `pm25_rh35` | PM2.5 at 35% relative humidity, includes water, µg/m³ | None |
| `co` | Dry-air mole fraction, mol/mol | × 10⁹ to ppbv |
| `o3` | Dry-air mole fraction, mol/mol | × 10⁹ to ppbv |

These are hourly means in the model's lowest layer, level 72; this number is not an altitude of 72 hPa. They are not station measurements. The SVS catalog points to v2, but does not publish the collection, analysis/forecast run, or exact PM2.5 recipe used by the renderer. This is therefore a comparison against a plausible reference field from the same model family, not confirmation of the exact values behind each pixel.

Five timestamps across the period were selected before calculating metrics. Printed labels on all 15 images were inspected and match the JSON, including EDT/EST:

| Local frame (1-based) | Image label, Eastern | Reference hourly center UTC |
|---|---|---|
| 1 | 2026-10-30 06:00 EDT | 2026-10-30 10:30 |
| 32 | 2026-11-03 02:00 EST | 2026-11-03 07:30 |
| 63 | 2026-11-06 23:00 EST | 2026-11-07 04:30 |
| 100 | 2026-11-11 14:00 EST | 2026-11-11 19:30 |
| 120 | 2026-11-14 02:00 EST | 2026-11-14 07:30 |

Choosing the center 30 minutes after the label follows the earlier study: it hypothesizes that a 10:00 label matches the 10:00–11:00 UTC mean. The renderer's exact interval has not been confirmed. Equivalence to an instantaneous mean or another window was not established. Frame 124 is after the end of the analysis available in the query, 2026-11-14 08:30 UTC; we did not extrapolate it.

## Method

- Each query uses a 145 × 288 point subsampled grid (~1.25°), extracted from the native 0.25° grid. The five snapshots, units, coordinates, timestamps, URLs, and hashes are archived in [dados/poluentes](dados/poluentes/). The full global series was not downloaded.
- The same GeoJSON polygons and project groupings are used on both sides. Europe includes all of Russia. Reference means use cos(latitude) weighting. Resolution differences, boundaries, and logo/text masks remain.
- The current decoder was rerun on all 15 images. All published regional means were reproduced within a tolerance of 0.002 units, including null values. This confirms reproducibility of the calculation, not its physical accuracy.
- Country comparisons require at least 8 valid reference points and 100 analyzable image pixels, as in the wind study. There are 98 eligible countries/territories; `country:Antarctica` comes from the GeoJSON. Countries without accepted pixels remain missing and are never assigned zero.
- Image means use accepted pixels only. We calculate both the published unweighted mean and a weighted version over the same selection. `pixel_inclusion` is a pixel fraction; `accepted_area_fraction` is the weighted geometric fraction accepted, not scientific confidence.
- The officially labeled legends were inspected: PM2.5 logarithmic, 0.4–409.6 µg/m³; O3 linear, 5–60 ppbv; CO with anchors at 40, 100, 130, 200, and 500 ppbv, spaced non-proportionally to concentration. CO's scale is interpolated segment by segment in code. Checking the legend does not resolve compression, boundaries, or blending with the basemap.

## Results for currently published data

Spearman measures country ranking at each timestamp, not a percentage of accuracy. MAE is the mean absolute difference between image-derived and reference country means; each country has equal weight in this metric. It is not pixel error or a global mean weighted by country area.

| Variable | Countries with data per timestamp | Spearman at five timestamps | MAE per timestamp | Mean image − reference bias across samples |
|---|---|---|---|---|
| PM2.5 | 98 at all timestamps | 0.566 / 0.539 / 0.549 / 0.719 / 0.653 | 11.47 / 10.99 / 12.24 / 12.75 / 10.00 µg/m³ | −9.78 µg/m³ |
| CO | 98 at all timestamps | 0.984 / 0.985 / 0.983 / 0.978 / 0.969 | 16.13 / 17.72 / 18.84 / 20.38 / 19.89 ppbv | +17.32 ppbv |
| O3 | 96 / 96 / 94 / 97 / 95 | 0.968 / 0.960 / 0.893 / 0.931 / 0.933 | 2.78 / 3.34 / 3.85 / 3.66 / 3.03 ppbv | +3.12 ppbv |

Overall MAE across countries and timestamps is 11.49 µg/m³ for PM2.5, 18.59 ppbv for CO, and 3.33 ppbv for O3. O3 countries missing at each timestamp are listed in the [results JSON](dados/poluentes/validacao-poluentes.json).

Continent examples at frame 1; **published image / weighted reference**, with units for each variable:

| Group | PM2.5 µg/m³ | CO ppbv | O3 ppbv |
|---|---|---|---|
| Africa | 3.47 / 14.56 | 122.13 / 109.33 | 43.06 / 40.81 |
| South America | 3.51 / 10.43 | 136.67 / 122.16 | 34.59 / 24.47 |
| North America | 2.69 / 6.17 | 98.15 / 98.24 | 43.44 / 40.86 |
| Europe, project group | 3.82 / 8.24 | 90.87 / 91.35 | 38.42 / 36.51 |
| Asia, project group | 5.64 / 21.95 | 143.21 / 138.31 | 48.01 / 46.09 |
| Oceania | 1.95 / 5.88 | 89.80 / 85.80 | 38.87 / 34.84 |
| Antarctica | 0.47 / 0.85 | 56.99 / 52.01 | 27.61 / 23.11 |

**Trends:** We compare direction of change only between consecutive sampled timestamps, for countries with data at both. These changes are separated by multiple days, not all three-hour transitions. Pairs are dependent and are not independent trials.

| Variable | Any non-zero reference change | Change above a descriptive threshold |
|---|---|---|
| PM2.5 | 348/392 (88.8%) | >1 µg/m³: 297/318 (93.4%) |
| CO | 363/392 (92.6%) | >5 ppbv: 260/269 (96.7%) |
| O3 | 327/377 (86.7%) | >2 ppbv: 257/275 (93.5%) |

Thresholds are a sensitivity analysis that removes small changes; they are not accuracy, health, or pass/fail limits. For O3, 15 pairs were excluded for missing data; transitions from missing to available were not evaluated.

## Interpretation and concrete open questions

1. **CO preserves ranking and change direction very well in the samples**, but has a positive bias. Strong correlation does not justify treating image-derived ppbv as exact concentration. The mapping between anchors, image composition, and equivalence of the model run should be investigated.
2. **O3 also preserves contrasts but loses low concentrations.** The legend is nearly white at its low end; the filter requires saturation ≥40. In frame 1, only 43.45% of analyzable South American pixels and 1.84% of Antarctic pixels are accepted. The mean represents that selection; for example, 34.59 versus 24.47 ppbv in South America. This is evidence of limited coverage and possible selection bias, not isolated proof of the cause of every difference.
3. **PM2.5 has not been shown to be sufficiently close in absolute value.** Ranking is only moderate, with a strong negative difference against `pm25_rh35`; Africa and Asia are several times below the reference in the first frame. Temporal direction is more consistent than absolute values. Do not multiply the data by an empirical factor to hide this.
4. **The exact PM2.5 recipe remains a significant uncertainty.** The [official system description](https://gmao.gsfc.nasa.gov/gmao-products/geos-cf/system-description_geos-cf/) identifies GEOS-Chem and GOCART modules; the [v1 specification](https://gmao.gsfc.nasa.gov/pubs/docs/Knowland1446.pdf) distinguishes PM2.5 from these schemes, including differences in units. We also queried the v2 `chm` and `xgc` collections; we did not find a second GOCART variant directly identified for this comparison. SVS describes PM2.5 as calculated from aerosol and meteorological fields but does not publish the expression. Therefore, the detected discrepancy cannot be attributed entirely to the color converter. The SVS variable/formula and run must be identified and the comparison repeated.
5. **Spatial weighting is a real open issue for the three tracks**, but it does not explain the main observed deviations. The weighted alternative does not consistently improve MAE or country ranking. In frame 1, weighted African PM2.5 changes from 3.47 to 3.54 µg/m³, still far from 14.56. North American CO changes from 98.15 to 106.32 ppbv, while the reference is 98.24: reducing one point error is not the criterion for choosing physically appropriate weights.

No quantitative acceptance threshold had been defined for these variables. Therefore, there is no formal “pass/fail” result. The evidence supports qualitative use of CO and O3 within the stated limitations; PM2.5 needs further investigation before claiming concentration fidelity or spatial ranking. Validation against independent observations, accuracy across all 124 timestamps, and performance for small countries or local events were not established. Successfully reproducing current statistics does not turn coverage into quality.

## Artifacts and reproduction

- [Complete CSV comparisons](dados/poluentes/comparacao-poluentes.csv): all regions and five timestamps, including missing data, counts, and weighted/unweighted results.
- [Metrics and input hashes](dados/poluentes/validacao-poluentes.json).
- `dados/poluentes/frame-*.npz` and `.json`: numerical fields and metadata for each query; `geos-cf.das`, `geos-cf.dds`, and `time-origin.ascii`: server metadata. The time origin is checked against the server calendar using relative differences, without assuming equivalence to Python's proleptic calendar.

From the repository root, with `pipeline/requirements.txt` installed (SciPy is included with scikit-image):

```bash
# Offline; reads archived snapshots and local images, writes only to the specified destination.
python pipeline/evaluate_pollutants.py --baseline-dir docs/estudo-cientifico/dados/poluentes/baseline --output-dir /tmp/validacao-poluentes

# Optional: repeat the queries; the remote archive changes over time.
python pipeline/fetch_pollutant_reference.py --output-dir /tmp/referencia-poluentes
python pipeline/evaluate_pollutants.py --reference-dir /tmp/referencia-poluentes --output-dir /tmp/nova-validacao-poluentes

python -m unittest discover -s pipeline -p 'test_*.py'
```

The evaluator rejects changed units, snapshots with mismatching hashes, incompatible grids, incompatible dates, and published means that do not reproduce the audited method. Frame, legend, and JSON hashes make later changes identifiable. This investigation does not alter the published tracks.

Research and scripts assisted by OpenAI Codex. Numerical references: NASA GMAO; visualizations: NASA SVS.
