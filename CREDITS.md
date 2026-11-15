# Credits & References

Keep this file updated in every PR that adds data, a library, a sound or a reference.

## NASA data (EIC / SVS)

Visualizations courtesy of **NASA's Scientific Visualization Studio**.

| SVS ID | Title | Link | Listed in challenge Resources? | Used in track |
|---|---|---|---|---|
| 5011 | Lightning from ISS 2017–2023 | https://svs.gsfc.nasa.gov/5011/ | ✅ | |
| 5313 | Change in Night Lights 2012–2023 | https://svs.gsfc.nasa.gov/5313/ | ✅ | |
| 5147 | GEOS-FP Near-Surface Temperature | https://svs.gsfc.nasa.gov/5147/ | | clima-temperatura |
| 5148 | GEOS-FP Near-Surface Wind Speed | https://svs.gsfc.nasa.gov/5148/ | | clima-vento |
| 5149 | GEOS-FP Precipitation and Clouds | https://svs.gsfc.nasa.gov/5149/ | | clima-chuva |
| 5150 | GEOS-FP Near-Surface Humidity (Q2M) | https://svs.gsfc.nasa.gov/5150/ | | clima-umidade |
| 5151 | Particulate Matter (PM) 2.5 | https://svs.gsfc.nasa.gov/5151/ | | ar-pm25 |
| 5152 | Near surface Ozone (O3) | https://svs.gsfc.nasa.gov/5152/ | | clima-ozonio |
| 5153 | Carbon Monoxide (CO) | https://svs.gsfc.nasa.gov/5153/ | | ar-co |

## Other data / APIs

| Source | Use | License | Link |
|---|---|---|---|
| Natural Earth, Admin 0 Countries (1:110m) | Country and continent boundaries for regional map summaries | Public domain | https://github.com/nvkelso/natural-earth-vector |
| NASA GMAO GEOS-CF v2 AQC | Archived near-surface PM2.5, CO and O3 numerical subsets for the scientific audit; reference data are not inserted into playback | NASA open data; credit NASA GMAO | https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/v2/ana/aqc_tavg_1hr_glo_L1440x721_slv.info |

## Libraries

| Name | Version | License | Link |
|---|---|---|---|
| Tone.js | | MIT | https://github.com/Tonejs/Tone.js |
| NumPy | Pipeline dependency | BSD-3-Clause | https://numpy.org/ |
| Pillow | Pipeline dependency | MIT-CMU | https://python-pillow.github.io/ |
| Requests / urllib3 | Pipeline dependency / transitive dependency | Apache-2.0 / MIT | https://requests.readthedocs.io/ / https://urllib3.readthedocs.io/ |
| scikit-image / SciPy | Pipeline dependency / transitive dependency; geographic masks and scientific evaluation | BSD-3-Clause | https://scikit-image.org/ / https://scipy.org/ |

## Sounds

| File | Source | License |
|---|---|---|

## References (papers, articles)

| Reference | Link |
|---|---|
| File Specification for GEOS-CF Products v2, draft; AQC fields, units and averaging intervals | https://portal.nccs.nasa.gov/datashare/gmao/geos-cf/v2/GEOS-CF_FileSpecv2.0_Draft2.pdf |
| File Specification for GEOS-CF Products v1.3; distinct particulate-matter definitions | https://gmao.gsfc.nasa.gov/pubs/docs/Knowland1446.pdf |
| GEOS-CF system description | https://gmao.gsfc.nasa.gov/gmao-products/geos-cf/system-description_geos-cf/ |

## Inspiration (no code copied)

## Use of AI

| Where | Tool | What it did |
|---|---|---|
| Planning document | Claude | Research of references and organization of the plan (the solution idea and mappings were decided by the team) |
| Repository scaffold | Claude | Initial folder structure, empty stubs, contribution guide and issue list |
| Wind pixel pipeline and player integration | Copilot SDK in VS Code | Adapted pixel-feature extraction for SVS 5148 and generalized the player to support wind units and coverage. |
| Carbon monoxide track and calibration | Copilot SDK in VS Code | Added the SVS 5153 colorbar calibration, image-derived features, and visual-only track integration. |
| Pollutant scientific audit and qualitative PM2.5 follow-up | OpenAI Codex | Investigated prior validation, archived NASA reference subsets, compared regional ordering and temporal directions, implemented and tested the PM2.5 visual index and player integration, and documented results and remaining errors. The user set preservation of relative contrasts and trends as the priority. |
