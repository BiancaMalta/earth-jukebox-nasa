# Earth Jukebox 🎵🌍

> NASA Space Apps Challenge 2026 — *The Earth Information Jukebox*

**Selected challenge:** [The Earth Information Jukebox](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/)

**Earth Jukebox** turns the visual frames of NASA's Earth Information Center (EIC) visualizations into sound, so that anyone — including blind and low-vision people — can *hear* our planet change.

- Reads the pixels of EIC/SVS frames, converts color to physical value through the colorbar, and maps that value to sound with fixed, documented rules.
- Sound legend, spoken time markers and a tactile explorer (touch the map, hear the value).
- New visualizations can be added through a preset file (`public/tracks/<id>.json`).

> 🚧 Work in progress during the hackathon (Nov 14–15, 2026).

## Live demo

- Site: https://nasaearthjukebox.netlify.app/
- Video (≤ 30 s): _coming soon_

## Project article and technical documentation

The team-produced project article and scientific reports document the project's methods, evidence, limitations, and reproduction steps. Evidence is variable-specific and does not establish exact values across every frame:

- [Seven-variable evidence summary and project article](docs/PROJECT_ARTICLE.md#evidence-for-each-of-the-seven-variables)
- [GEOS-FP and wind study](docs/ESTUDO_CIENTIFICO.md)
- [Pollutant audit](docs/estudo-cientifico/validacao-poluentes.md)
- [PM2.5 qualitative follow-up](docs/estudo-cientifico/pm25-qualitativo.md)

The team also documented the rationale and implementation of the seven sound mappings. Published sonification research informs the general design principles, but the particular mappings have not been validated in a user study:

- [Sound design rationale](docs/SOUND_DESIGN_RATIONALE.md)
- [Mapping reference](docs/MAPPINGS.md)
- [Sound implementation notes](public/src/engine/SOUND_DESIGN.md)

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
