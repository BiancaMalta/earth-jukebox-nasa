# Earth Jukebox 🎵🌍

> NASA Space Apps Challenge 2026 — *The Earth Information Jukebox*

**Earth Jukebox** turns the visual frames of NASA's Earth Information Center (EIC) visualizations into sound, so that anyone — including blind and low-vision people — can *hear* our planet change.

- Reads the pixels of EIC/SVS frames, converts color to physical value through the colorbar, and maps that value to sound with fixed, documented rules.
- Sound legend, spoken time markers and a tactile explorer (touch the map, hear the value).
- New visualizations can be added through a preset file (`public/tracks/<id>.json`).

> 🚧 Work in progress during the hackathon (Nov 14–15, 2026).

## Live demo

- Site: _coming soon (GitHub Pages)_
- Video (≤ 30 s): _coming soon_

## Repository layout

```
earth-jukebox/
├── pipeline/            # Python offline pipeline (Data role)
│   ├── download.py          # download frames/MP4 by SVS ID
│   ├── extract_frames.py    # resize + convert to webp (ffmpeg/Pillow)
│   ├── calibrate_colorbar.py# colorbar -> color→value table (colorbar.json)
│   ├── features.py          # per-frame variables -> features.json
│   └── add_viz.py           # scaffold a new visualization (scalability)
├── public/              # Static site served by GitHub Pages
│   ├── index.html
│   ├── tracks/          # one preset file per track + index.json
│   ├── data/<track>/    # frames/*.webp, features.json, colorbar.json, mask.png
│   ├── sounds/          # sound legend + CC0 samples (Sound role)
│   └── src/
│       ├── engine/      # audio.js, mapping.js, mood.js, presets.js, speech.js
│       ├── ui/          # player.js, explorer.js, legend.js, a11y.js
│       └── i18n/        # pt.json, en.json
├── docs/                # tasks, mapping table, tests, pitch
├── CREDITS.md           # every data source, library, sound, paper and AI use
└── DECISIONS.md         # who decided what and why
```

## Running locally

```bash
# site (no build step)
python -m http.server 8000 -d public
# open http://localhost:8000

# pipeline
python -m venv .venv
.venv\Scripts\activate        # Windows  (source .venv/bin/activate on macOS/Linux)
pip install -r pipeline/requirements.txt
python pipeline/download.py 5147
```

Requirements: Python 3.11+, Git and a modern browser. The pipeline installs its ffmpeg runtime through `pipeline/requirements.txt`; Node is optional.

## Team workflow

See [CONTRIBUTING.md](CONTRIBUTING.md) (in Portuguese) and the task board in [docs/TASKS.md](docs/TASKS.md) / GitHub Issues.

## NASA data

See [CREDITS.md](CREDITS.md). Visualizations courtesy of **NASA's Scientific Visualization Studio**.

## Use of AI

AI tools were used for research, planning and to generate the initial repository scaffold. Every AI-generated file or code block is marked with a comment. Details in [CREDITS.md](CREDITS.md#use-of-ai).

## License

[Apache-2.0](LICENSE)
