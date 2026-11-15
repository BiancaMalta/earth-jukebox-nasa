# Earth Jukebox 🎵🌍

> NASA Space Apps Challenge 2026 — *The Earth Information Jukebox*

**Selected challenge:** [The Earth Information Jukebox](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/)

**Earth Jukebox** turns the visual frames of NASA's Earth Information Center (EIC) visualizations into sound, so that anyone — including blind and low-vision people — can *hear* our planet change.

- Reads the pixels of EIC/SVS frames, converts color to physical value through the colorbar, and maps that value to sound with fixed, documented rules.
- Sound legend, spoken time markers and a tactile explorer (touch the map, hear the value).
- New visualizations can be added through a preset file (`public/tracks/<id>.json`).

> 🚧 Work in progress during the hackathon (Nov 14–15, 2026).

## Live demo

- Site: https://biancamalta.github.io/earth-jukebox-nasa/
- Video (≤ 30 s): _coming soon_

## Project documentation

The following project article and technical documents were produced by the Earth Jukebox team. They describe our methods, scientific evaluations, and sound mappings:

- [Earth Jukebox: Hearing a Changing Planet](docs/PROJECT_ARTICLE.md) — project story, visitor experience, methods, accessibility, and evidence for all seven variables.
- [GEOS-FP and wind study](docs/ESTUDO_CIENTIFICO.md) — image-derived climate estimates, area weighting, and qualitative wind-signal evaluation.
- [Pollutant audit](docs/estudo-cientifico/validacao-poluentes.md) — five-timestamp comparison of image-derived PM2.5, carbon monoxide, and ozone with GEOS-CF.
- [PM2.5 qualitative follow-up](docs/estudo-cientifico/pm25-qualitativo.md) — 29-timestamp evaluation of the qualitative PM2.5 sound index and its temporal trends.

The sound documentation explains the rationale, data mappings, and implementation:

- [Sound design rationale](docs/SOUND_DESIGN_RATIONALE.md) — reasons behind the seven sound choices and the research informing their design.
- [Mapping reference](docs/MAPPINGS.md) — data inputs, sound relationships, scales, and limits for each variable.
- [Sound implementation notes](public/src/engine/SOUND_DESIGN.md) — synthesis details for the instruments and audio engine.

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
│   └── src/
│       ├── engine/      # audio.js, sound mappings and Tone.js synthesis (no audio sample files)
│       ├── ui/          # player.js, explorer.js, legend.js, a11y.js
│       └── i18n/        # pt.json, en.json
├── docs/                # tasks, mapping table, tests, pitch
├── CREDITS.md           # data sources, libraries, sounds and paper references
└── DECISIONS.md         # who decided what and why
```

Only the seven tracks listed in `public/tracks/index.json` are playable. The data directory also retains some frame-only experiments and empty placeholders; the [data inventory](docs/DATA_INVENTORY.md) distinguishes these from implemented features.

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

See [CONTRIBUTING.md](CONTRIBUTING.md) and the task board in [docs/TASKS.md](docs/TASKS.md) / GitHub Issues.

## NASA data

See [CREDITS.md](CREDITS.md). Visualizations courtesy of **NASA's Scientific Visualization Studio**.

## License

[Apache-2.0](LICENSE)

## Contributors

Contributors recorded in the repository's Git history: [Bianca Malta](https://www.linkedin.com/in/bianca-malta/) and [Breno Palma](https://www.linkedin.com/in/breno-palma/).
