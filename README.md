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
├── CREDITS.md           # every data source, library, sound, paper and AI use
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

See [CONTRIBUTING.md](CONTRIBUTING.md) (in Portuguese) and the task board in [docs/TASKS.md](docs/TASKS.md) / GitHub Issues.

## NASA data

See [CREDITS.md](CREDITS.md). Visualizations courtesy of **NASA's Scientific Visualization Studio**.

## Project story and method

Read the [Earth Jukebox project article](docs/PROJECT_ARTICLE.md) for the challenge rationale, visitor journey, image-processing workflow, seven sound mappings, accessibility approach, scientific evidence and limits, and how the app uses the challenge's EIC data resource. The concise submission summary and 30-second script are in [docs/PITCH.md](docs/PITCH.md).

## Use of AI

AI tools assisted research, planning, implementation, scientific evaluation, and documentation. [CREDITS.md](CREDITS.md#use-of-ai) lists the tools and work areas. Sound is synthesized by the project's code; no AI-generated audio files are used.

## License

[Apache-2.0](LICENSE)

## Scientific study and qualitative validation

The repository investigates all seven variables, but the evidence is not equally strong and does not establish exact values across every frame:

- **Temperature and specific humidity:** the [one-frame GEOS-FP comparison](docs/ESTUDO_CIENTIFICO.md) found plausible broad regional patterns, with notable humidity differences in Antarctica.
- **Wind:** [three sampled frames and temporal transitions](docs/ESTUDO_CIENTIFICO.md) were compared. The sound uses a qualitative visual-signal index, not a full-region wind-speed estimate.
- **Precipitation:** the [scientific study](docs/ESTUDO_CIENTIFICO.md) explains why no direct numerical validation is claimed: the image's accumulation interval is unknown, so its millimeter values cannot be compared directly with the reference flux in mm/hour.
- **PM2.5, carbon monoxide, and ozone:** [five sampled timestamps were compared with GEOS-CF](docs/estudo-cientifico/validacao-poluentes.md). CO and ozone showed useful regional ordering with bias and pixel-coverage limits; the original PM2.5 concentration estimates had substantial discrepancies.
- **PM2.5 follow-up:** [the 29-timestamp study](docs/estudo-cientifico/pm25-qualitativo.md), including 24 consecutive three-hour transitions, found improved regional ordering and trend directions for the qualitative log-color intensity-and-extent index now used for sound. It does not validate absolute concentration values.

### Technical studies and reports written by the team

The four documents below are technical reports produced by our team from project data processing, comparisons, and evaluation. They include methods, graphs, archived source snapshots, limitations, and reproduction commands. AI assistance with research and drafting is disclosed in [CREDITS.md](CREDITS.md#use-of-ai).

- [Seven-variable evidence summary](docs/PROJECT_ARTICLE.md#evidence-for-each-of-the-seven-variables)
- [GEOS-FP and wind study](docs/ESTUDO_CIENTIFICO.md)
- [Pollutant audit](docs/estudo-cientifico/validacao-poluentes.md)
- [PM2.5 qualitative follow-up](docs/estudo-cientifico/pm25-qualitativo.md)

The team also developed and documented the rationale for the app's seven sound mappings. See the [sound design rationale](docs/SOUND_DESIGN_RATIONALE.md), the [mapping reference](docs/MAPPINGS.md), and the [implementation notes](public/src/engine/SOUND_DESIGN.md). The rationale draws on published sonification research; it is not a user study validating our particular mappings.

## Contributors

Contributors recorded in the repository's Git history: [Bianca Malta](https://www.linkedin.com/in/bianca-malta/) and [Breno Palma](https://www.linkedin.com/in/breno-palma/).
