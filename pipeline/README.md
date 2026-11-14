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
