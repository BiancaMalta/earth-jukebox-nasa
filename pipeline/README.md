# Pipeline (Dados)

Order: `download.py` → `extract_frames.py` → `calibrate_colorbar.py` → (mask.png) → `features.py`

Example after downloading SVS 5147:

```bash
python pipeline/download.py 5147
python pipeline/extract_frames.py raw/5147 clima-temperatura
```

For the near-surface wind visualization (SVS 5148), calibrate its own colorbar
and pass the track metadata and UTC start time to the feature extractor:

```bash
python pipeline/calibrate_colorbar.py --svs-id 5148
python pipeline/features.py --frames-dir public/data/clima-vento/frames --colorbar public/data/clima-vento/colorbar.json --output public/data/clima-vento/features.json --track clima-vento --svs-id 5148 --start-utc 2026-10-30T10:00:00Z
```

The wind legend fades into transparency at low speeds and becomes difficult to
distinguish from the basemap at its high end. Its `mean` and `p90` therefore
describe only accepted color-matched pixels; `coverage` records their share
of the analyzed frame.

For total precipitation (SVS 5149), calibrate its millimeter colorbar and extract
the same 3-hour frames:

```bash
python pipeline/calibrate_colorbar.py --svs-id 5149
python pipeline/features.py --frames-dir public/data/clima-chuva/frames --colorbar public/data/clima-chuva/colorbar.json --output public/data/clima-chuva/features.json --track clima-chuva --svs-id 5149 --start-utc 2026-10-30T10:00:00Z
```

The precipitation visualization overlays the color field on clouds and the
basemap. Its `mean` and `p90` therefore describe accepted color-matched
pixels, not a global-area average; `coverage` records the matched share.

The published precipitation statistics now use the original lossless
2048×1024 PNGs; the 1024×512 WebPs remain display previews. Regenerating this
track requires its verified source manifest and original files:

```bash
python pipeline/fetch_native_rain.py --output raw/5149/native --manifest raw/5149/analysis-source.json --tessdata-dir /path/to/tessdata
# Copy the successfully verified manifest to public/data/clima-chuva/analysis-source.json.
python pipeline/regions.py --update-features --track clima-chuva --analysis-frames-dir raw/5149/native --analysis-manifest public/data/clima-chuva/analysis-source.json
```

Acquisition needs Tesseract and English tessdata_fast in addition to the normal
pipeline requirements. Every source timestamp, including EDT/EST, is verified;
the generator rechecks labels, hashes and unchanged filters. Native datasets
refuse to regenerate from previews when the arguments are omitted. Select other
tracks explicitly when their original analysis inputs are not available.
See [rain recovery](../docs/estudo-cientifico/precipitacao-recuperacao.md) for
comparisons, gains, losses and reproduction. Missing color is still unknown
precipitation; neither a zero amount nor an accumulation interval is inferred.

For near-surface specific humidity (SVS 5150), calibrate the 0–22 g/kg colorbar
and calculate features on the 3-hour frames:

```bash
python pipeline/calibrate_colorbar.py --svs-id 5150
python pipeline/features.py --frames-dir public/data/clima-umidade/frames --colorbar public/data/clima-umidade/colorbar.json --output public/data/clima-umidade/features.json --track clima-umidade --svs-id 5150 --start-utc 2026-10-30T10:00:00Z
```

The mean and p90 use accepted color-matched humidity pixels; `coverage`
records their share of the analyzed frame.

The published PM2.5, ozone, and CO tracks use the same 124 timestamps as the
four climate tracks. Their NASA animations have hourly frames beginning one
hour earlier, so select source frames 2, 5, ..., 371 (1-based), renumber the
selected images consecutively, then calculate features and regions from those
124 images. This aligns every pollutant frame with its climate counterpart.

For PM2.5 (SVS 5151), extract the source frames, retain the aligned 3-hour
samples above, calibrate the logarithmic NASA colorbar, and calculate features:

```bash
python pipeline/download.py --kind mp4 5151
python pipeline/extract_frames.py raw/5151/MC01_stage4_GMAO_pm25_2048x1024_en.mp4 ar-pm25 --fps 12 --max-frames 0
python pipeline/calibrate_colorbar.py --svs-id 5151
python pipeline/features.py --frames-dir public/data/ar-pm25/frames --colorbar public/data/ar-pm25/colorbar.json --output public/data/ar-pm25/features.json --track ar-pm25 --svs-id 5151 --start-utc 2026-10-30T10:00:00Z --end-utc 2026-11-14T19:00:00Z
```

SVS 5151 estimates near-surface PM2.5 with NASA GMAO GEOS-CF. Its legend is
logarithmic from 0.4 to 409.6 µg/m³. Values are decoded estimates from rendered
pixels, not raw model-grid values; coverage is the matched share of image
pixels, not geographic area. Its sound uses the supplied dimensionless visual index described below;
concentration diagnostics do not provide a health assessment.

For near-surface ozone (SVS 5152), extract the source frames, retain the aligned
3-hour samples above, then calibrate NASA's 5–60 ppbv colorbar and calculate
their features:

```bash
python pipeline/download.py --kind mp4 5152
python pipeline/extract_frames.py raw/5152/MC02_stage4_GMAO_O3_2048x1024_en.mp4 clima-ozonio --fps 12 --max-frames 0
python pipeline/calibrate_colorbar.py --svs-id 5152
python pipeline/features.py --frames-dir public/data/clima-ozonio/frames --colorbar public/data/clima-ozonio/colorbar.json --output public/data/clima-ozonio/features.json --track clima-ozonio --svs-id 5152 --start-utc 2026-10-30T10:00:00Z --interval-hours 3
```

Ozone is currently visual-only; no sound mapping is assigned. Its mean and p90
use confidently color-matched pixels (saturation ≥ 40 and color distance ≤ 30),
and `coverage` records their share of the analyzed frame.

For near-surface carbon monoxide (SVS 5153), calibrate NASA's 40–500 ppbv
colorbar using its labeled 40, 100, 130, 200, and 500 ppbv ticks. Extract the
source frames, retain the aligned 3-hour samples above, and calculate features:

```bash
python pipeline/download.py --kind mp4 5153
python pipeline/extract_frames.py raw/5153/MC03_stage4_GMAO_CO_2048x1024_en.mp4 ar-co --fps 12 --max-frames 0
python pipeline/calibrate_colorbar.py --svs-id 5153
python pipeline/features.py --frames-dir public/data/ar-co/frames --colorbar public/data/ar-co/colorbar.json --output public/data/ar-co/features.json --track ar-co --svs-id 5153 --start-utc 2026-10-30T10:00:00Z --end-utc 2026-11-14T19:00:00Z
```

SVS 5153 estimates near-surface CO with NASA GMAO GEOS-CF. These values are
decoded estimates from rendered pixels, not the raw model-grid values. The
track is visual-only; its coverage reports confidently matched pixels.

`extract_frames.py` accepts an MP4 file or a directory of still frames. It writes
WebP files to `public/data/<track>/frames/`, keeps the aspect ratio, limits the
longer dimension to 1024 px, and samples at up to 4 fps. By default it caps the
output at 150 frames spread across the full source; use `--max-frames 0` to
remove that cap. MP4 input uses `imageio-ffmpeg` (included in the pipeline
requirements); still images use Pillow. A separate system installation of ffmpeg
is optional.

Outputs go to `public/data/<track>/`:
- `frames/*.webp` (1024 px)
- `colorbar.json`
- `mask.png` (excludes text, logos, dates)
- `features.json`

Raw downloads stay in `raw/` (git-ignored) and on the shared Drive.

## Regional statistics (countries and continents)

After generating `features.json`, run from the repository root:

```bash
python pipeline/regions.py --update-features
# Or select one or more tracks:
python pipeline/regions.py --update-features --track clima-temperatura --track clima-vento
```

The generator reuses `features.py` for pixel decoding, filtering, mean, p90 and
normalization, and writes compact `public/data/<track>/regions.json` files.
It reads existing local frames and `world-countries.geojson`; no downloads,
new dependencies or Python server are needed. Publish those JSONs with the site.
The browser loads a table on regional selection and reuses it while that track
is active, without recalculating statistics. Regenerate after changing any
input; the generator rejects stale full-frame features.

All frame times are copied from existing features. Regions with no valid pixels
have null statistics, not zero values. Country/group means use cosine-latitude area
weights over accepted pixels and retain image-derived limitations. See `docs/FEATURES_CONTRACT.md`
for the versioned regional schema and pixel-center mask definition.

Validation:

```bash
python -m unittest discover -s pipeline -p 'test_*.py'
node --test public/src/tests/*.test.mjs
```

Pixel inclusion (`coverage`) is a pixel-count ratio, not statistical confidence or geographic area. New outputs retain six decimal places; existing full-frame files may retain three.


Area-weighted means use the same positive cosine-latitude weights in the
full-frame and regional pipelines. P90 remains an unweighted pixel percentile;
coverage remains pixel inclusion. The statistics metadata versions this choice.
The regional generator preserves source dates; --update-features updates both
JSONs together. Existing data methods cannot be mixed silently in Combined Earth.
Group labels follow whole-country assignments (Europe includes all Russia), not
physical continental boundaries. A previous pre-area snapshot was preserved
locally under /tmp/earth-jukebox-before-area-weighting for comparison.

## Qualitative wind sonification and study reproduction

Wind now exports `visualSignal`, an area-weighted visible-color index combining
intensity and extent. Original mean/p90/norm remain diagnostic physical-value
statistics over accepted pixels. No accepted pixels yields null, never measured
zero wind. Only wind's regional table uses version 3 with a fifth column.

The [study](../docs/ESTUDO_CIENTIFICO.md) includes the archived reference samples,
figures, ordering/trend evaluation and limitations. Reproduce without network:

```bash
python pipeline/compare_reference.py --output /tmp/reference-comparison.csv
python pipeline/evaluate_wind_signal.py --output /tmp/wind-evaluation.json
```

NumPy and scikit-image are already pipeline dependencies. Regenerating figures
additionally needs Matplotlib, used only by the study plotting script.

## Pollutant evaluation

The [pollutant audit](../docs/estudo-cientifico/validacao-poluentes.md) compares
PM2.5, CO and ozone with five archived GEOS-CF v2 analysis samples. Reproduce
offline without writing production JSONs:

```bash
python pipeline/evaluate_pollutants.py --baseline-dir docs/estudo-cientifico/dados/poluentes/baseline --output-dir /tmp/pollutant-evaluation
```

To collect fresh reference subsets separately:

```bash
python pipeline/fetch_pollutant_reference.py --output-dir /tmp/pollutant-reference
python pipeline/evaluate_pollutants.py --reference-dir /tmp/pollutant-reference --output-dir /tmp/pollutant-evaluation-new
```

The evaluator audits the selected published or archived mean method and
calculates area-weighted alternatives. The initial PM2.5 tables are archived
under the baseline directory because that track now uses a visual index. It rejects changed
units, snapshot hashes, coordinates, timestamps and non-reproducible published
means. These comparisons do not establish independent observational accuracy;
the exact SVS source run and PM2.5 recipe remain unconfirmed.


## Qualitative PM2.5 sonification

For an inventory of unavailable sound mappings across all tracks, countries,
groups and timestamps, using the actual frontend validators and mappings:

```bash
node pipeline/audit_sound_availability.mjs --output-dir /tmp/sound-availability
```

The [availability audit](../docs/estudo-cientifico/disponibilidade-sons.md)
separates published pixel-data gaps from loading states and runtime silence.
The script does not modify production data. Its Git revision query spawns a
read-only Git subprocess, which can require permission in restricted sandboxes.

PM2.5 now exports `visualSignal`: area-weighted per-pixel log-legend positions
summed over accepted pixels and divided by all analyzed area weights. Its source
and regional metadata declare the dimensionless input; the regional schema is 3.
The physical mean uses cosine-latitude weights, while norm keeps its separate
log-normalized concentration-mean definition. No accepted pixels yields null.

The [follow-up study](../docs/estudo-cientifico/pm25-qualitativo.md) evaluates
29 timestamps, strong more/less contrasts, 24 three-hour transitions, opposite
regional trends and the fixed audio pitch curve. Reproduce offline:

```bash
python pipeline/evaluate_pm25_signal.py --output-dir /tmp/pm25-qualitative
```

Regenerate production PM2.5 without changing image dates:

```bash
python pipeline/regions.py --update-features --track ar-pm25
```
