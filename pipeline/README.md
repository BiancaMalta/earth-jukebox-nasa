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
describe only confidently color-matched pixels; `coverage` records their share
of the analyzed frame.

For total precipitation (SVS 5149), calibrate its millimeter colorbar and extract
the same 3-hour frames:

```bash
python pipeline/calibrate_colorbar.py --svs-id 5149
python pipeline/features.py --frames-dir public/data/clima-chuva/frames --colorbar public/data/clima-chuva/colorbar.json --output public/data/clima-chuva/features.json --track clima-chuva --svs-id 5149 --start-utc 2026-10-30T10:00:00Z
```

The precipitation visualization overlays the color field on clouds and the
basemap. Its `mean` and `p90` therefore describe confidently color-matched
pixels, not a global-area average; `coverage` records the matched share.

For near-surface specific humidity (SVS 5150), calibrate the 0–22 g/kg colorbar
and calculate features on the 3-hour frames:

```bash
python pipeline/calibrate_colorbar.py --svs-id 5150
python pipeline/features.py --frames-dir public/data/clima-umidade/frames --colorbar public/data/clima-umidade/colorbar.json --output public/data/clima-umidade/features.json --track clima-umidade --svs-id 5150 --start-utc 2026-10-30T10:00:00Z
```

The mean and p90 use confidently color-matched humidity pixels; `coverage`
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
pixels, not geographic area. This visual-only track has no sound mapping and
does not provide a health assessment.

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
python pipeline/regions.py
# Or select one or more tracks:
python pipeline/regions.py --track clima-temperatura --track clima-vento
```

The generator reuses `features.py` for pixel decoding, filtering, mean, p90 and
normalization, and writes compact `public/data/<track>/regions.json` files.
It reads existing local frames and `world-countries.geojson`; no downloads,
new dependencies or Python server are needed. Publish those JSONs with the site.
The browser loads a table on regional selection and reuses it while that track
is active, without recalculating statistics. Regenerate after changing any
input; the generator rejects stale full-frame features.

All frame times are copied from existing features. Regions with no valid pixels
have null statistics, not zero values. Country/continent means use equal pixel
weights and retain image-derived limitations. See `docs/FEATURES_CONTRACT.md`
for the versioned regional schema and pixel-center mask definition.

Validation:

```bash
python -m unittest discover -s pipeline -p 'test_*.py'
node --test public/src/tests/*.test.mjs
```
