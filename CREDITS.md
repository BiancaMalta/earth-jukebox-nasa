# Credits & References

Keep this file updated in every PR that adds data, a library, a sound or a reference.

## NASA data (EIC / SVS)

Visualizations courtesy of **NASA's Scientific Visualization Studio**.
The active track IDs 5147–5153 are included in NASA SVS's [Daily Visualizations gallery for the Earth Information Center](https://svs.gsfc.nasa.gov/gallery/daily-visualizations/). The selected Space Apps challenge lists the broader EIC Content Database as a resource; these seven tracks use visualizations from that collection. The repository also retains extracted frames from four other planned datasets; their status is marked below and described in the [data inventory](docs/DATA_INVENTORY.md).

| SVS ID | Title | Link | Challenge resource / source context | Status in this repository |
|---|---|---|---|---|
| 5147 | GEOS-FP Near-Surface Temperature | https://svs.gsfc.nasa.gov/5147/ | ✅ EIC Content Database | Active player track: `clima-temperatura` |
| 5148 | GEOS-FP Near-Surface Wind Speed | https://svs.gsfc.nasa.gov/5148/ | ✅ EIC Content Database | Active player track: `clima-vento` |
| 5149 | GEOS-FP Precipitation and Clouds | https://svs.gsfc.nasa.gov/5149/ | ✅ EIC Content Database | Active player track: `clima-chuva` |
| 5150 | GEOS-FP Near-Surface Humidity (Q2M) | https://svs.gsfc.nasa.gov/5150/ | ✅ EIC Content Database | Active player track: `clima-umidade` |
| 5151 | Particulate Matter (PM) 2.5 | https://svs.gsfc.nasa.gov/5151/ | ✅ EIC Content Database | Active player track: `ar-pm25` |
| 5152 | Near surface Ozone (O3) | https://svs.gsfc.nasa.gov/5152/ | ✅ EIC Content Database | Active player track: `clima-ozonio` |
| 5153 | Carbon Monoxide (CO) | https://svs.gsfc.nasa.gov/5153/ | ✅ EIC Content Database | Active player track: `ar-co` |
| 5011 | Lightning Events Detected from the ISS, 2017–2023 | https://svs.gsfc.nasa.gov/5011/ | ✅ Individually listed resource | 150 frame images retained under `public/data/fogo-raios/`; no player track or sonification |
| 5113 | Active Fires As Observed by VIIRS, 2024–Present | https://svs.gsfc.nasa.gov/5113/ | EIC Daily Visualizations gallery; not individually named in the challenge list | 120 frame images retained under `public/data/fogo-raios-viirs/`; no player track or sonification |
| 5046 | Daily Arctic Sea Ice, By Year | https://svs.gsfc.nasa.gov/5046/ | EIC Daily Visualizations gallery; not individually named in the challenge list | 49 frame images retained under `public/data/gelo/`; no player track or sonification |
| 5313 | Change in Night Lights between 2012 and 2023 | https://svs.gsfc.nasa.gov/5313/ | ✅ Individually listed resource | 150 frame images retained under `public/data/luzes-noturnas/`; no player track or sonification |

The frame-only folders above hold project copies of NASA visualization frames, but those datasets were not integrated into the player or the scientific evaluations. See the [data inventory](docs/DATA_INVENTORY.md) for the distinction between active tracks, retained downloads and empty placeholders.

## Other data / APIs

| Source | Use | License | Link |
|---|---|---|---|
| Natural Earth, Admin 0 Countries (1:110m) | Bundled as `public/data/world-countries.geojson`; supplies country outlines and continent assignments for regional selection, summaries and spatial masks | Public domain | https://github.com/nvkelso/natural-earth-vector |
| NASA GMAO GEOS-CF v2 AQC | Archived near-surface PM2.5, CO and O3 numerical subsets for the scientific audit; reference data are not inserted into playback | NASA open data; credit NASA GMAO | https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/v2/ana/aqc_tavg_1hr_glo_L1440x721_slv.info |

## Libraries

Versions for the Python packages are not pinned in `pipeline/requirements.txt`; the table names the dependencies actually imported by the app's processing and analysis scripts. Tone.js is loaded in the browser through the import map at version 15.0.4.

| Name | Version in this project | License | Use | Link |
|---|---|---|---|
| Tone.js | 15.0.4 | MIT | Browser audio synthesis, scheduling, filters and effects for all seven sound mappings; no recorded samples are loaded | https://github.com/Tonejs/Tone.js |
| NumPy | Unpinned | BSD-3-Clause | Array and numerical operations in the Python image-processing and evaluation pipeline | https://numpy.org/ |
| Pillow | Unpinned | HPND (PIL license) | Reading, resizing and analyzing source frames and masks | https://python-pillow.github.io/ |
| Requests | Unpinned | Apache-2.0 | Downloading NASA visualization frames and archived reference data | https://requests.readthedocs.io/ |
| scikit-image | Unpinned | BSD-3-Clause | Polygon rasterization and spatial mask operations | https://scikit-image.org/ |
| SciPy | Unpinned | BSD-3-Clause | Spearman rank-correlation calculation in the pollutant audit | https://scipy.org/ |
| imageio-ffmpeg | Unpinned | BSD-2-Clause | Bundled FFmpeg executable and video-frame reading when processing MP4s | https://github.com/imageio/imageio-ffmpeg |
| Matplotlib | Unpinned | PSF-based license | Plot generation for the scientific study (`docs/estudo-cientifico/gerar_graficos.py`) | https://matplotlib.org/ |
| urllib3 | Unpinned; used through Requests | MIT | Retry policy for downloading archived NASA reference data | https://urllib3.readthedocs.io/ |

## Sounds

There are no sound files, recordings, or third-party samples in the repository; that is why no audio files appear in this table. The seven instruments and the sound examples are synthesized live in the browser by the project's JavaScript sound modules using Tone.js. The synthesis rules and how each data value controls pitch, timbre, and loudness are documented in [MAPPINGS.md](docs/MAPPINGS.md) and in each track's in-app sound guide. Since these sounds are generated by our code rather than copied from audio assets, there is no separate audio-file source or sample license to list.

## References (papers, articles)

| Reference | Link |
|---|---|
| File Specification for GEOS-CF Products v2, draft; AQC fields, units and averaging intervals | https://portal.nccs.nasa.gov/datashare/gmao/geos-cf/v2/GEOS-CF_FileSpecv2.0_Draft2.pdf |
| File Specification for GEOS-CF Products v1.3; distinct particulate-matter definitions | https://gmao.gsfc.nasa.gov/pubs/docs/Knowland1446.pdf |
| GEOS-CF system description | https://gmao.gsfc.nasa.gov/gmao-products/geos-cf/system-description_geos-cf/ |
| Walker & Nees (2011), *Theory of Sonification*, The Sonification Handbook | https://sonification.de/handbook/ |
| Walker & Mauney (2010), *Universal Design of Auditory Graphs: A Comparison of Sonification Mappings for Visually Impaired and Sighted Listeners* | https://wirelessrerc.gatech.edu/universal-design-auditory-graphs-comparison-sonification-mappings-visually-impaired-and-sighted.html |
| Wang, Jung & Kim (2022), *Seeing Through Sounds: Mapping Auditory Dimensions to Data and Charts for People with Visual Impairments* | https://doi.org/10.1111/cgf.14523 |
| Enge et al. (2023), *Towards a unified terminology for sonification and visualization* | https://doi.org/10.1007/s00779-023-01720-5 |

## Use of AI

The retro jukebox visual direction was proposed by the user. OpenAI Codex
implemented the CSS cabinet, record collection and native radio interaction,
and checked desktop/mobile layout and keyboard selection. No external artwork
or fonts were added; see docs/JUKEBOX_DESIGN.md.

| Where | Tool | What it did |
|---|---|---|
| Planning document | Claude | Research of references and organization of the plan (the solution idea and mappings were decided by the team) |
| Repository scaffold | Claude | Initial folder structure, empty stubs, contribution guide and issue list |
| Wind pixel pipeline and player integration | Copilot SDK in VS Code | Adapted pixel-feature extraction for SVS 5148 and generalized the player to support wind units and coverage. |
| Carbon monoxide track and calibration | Copilot SDK in VS Code | Added the SVS 5153 colorbar calibration, image-derived features, and visual-only track integration. |
| Pollutant scientific audit and qualitative PM2.5 follow-up | OpenAI Codex | Investigated prior validation, archived NASA reference subsets, compared regional ordering and temporal directions, implemented and tested the PM2.5 visual index and player integration, and documented results and remaining errors. The user set preservation of relative contrasts and trends as the priority. |
| Project article and submission narrative | OpenAI Codex | Drafted `docs/PROJECT_ARTICLE.md` and completed `docs/PITCH.md` from the repository's implementation, scientific reports, credits, and comparative review notes. The article documents the EIC source and distinguishes it from the challenge's individually named example visualizations. |
| Sound design rationale | OpenAI Codex | Documented the reasoning behind the seven sound mappings already implemented by the team, based on the source code, project records, and cited sonification research. This is not user-study validation of the mappings. |
