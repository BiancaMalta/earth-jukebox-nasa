# Data inventory and implementation status

This is a repository-maintenance note, not a list of promised features. The app exposes only the seven tracks in [`public/tracks/index.json`](../public/tracks/index.json). A folder or downloaded frame by itself does not mean a dataset was implemented as a playable or sonified feature.

## Implemented in the player

Each active track has a track definition and processed data (frames, feature readings, colorbar information, and, where applicable, regional summaries). The player loads these seven tracks:

| Track | NASA SVS ID | Data folder |
|---|---:|---|
| Near-surface temperature | 5147 | `public/data/clima-temperatura/` |
| Near-surface wind | 5148 | `public/data/clima-vento/` |
| Precipitation and clouds | 5149 | `public/data/clima-chuva/` |
| Near-surface humidity | 5150 | `public/data/clima-umidade/` |
| PM2.5 | 5151 | `public/data/ar-pm25/` |
| Ozone | 5152 | `public/data/clima-ozonio/` |
| Carbon monoxide | 5153 | `public/data/ar-co/` |

[`public/data/world-countries.geojson`](../public/data/world-countries.geojson) is also active: the app uses it to offer country and continent selections and compute regional summaries.

## Downloaded frames not integrated into the player

These directories contain image frames but have no track definition in `public/tracks/index.json`, no completed feature/calibration data for player use, and no sound mapping. The images are not loaded by the app and are not part of the seven-track experience.

| Directory | Source identified in the project plan | Files retained | Implementation status |
|---|---|---:|---|
| `public/data/fogo-raios/` | NASA SVS 5011, lightning from the ISS | 150 WebP frames | Downloaded/extracted only; event detection and sonification were not completed |
| `public/data/fogo-raios-viirs/` | NASA SVS 5113, active fires | 120 WebP frames | Downloaded/extracted only; fire analysis and sonification were not completed |
| `public/data/gelo/` | NASA SVS 5046, Arctic sea ice | 49 WebP frames | Downloaded/extracted only; ice measurement and sonification were not completed |
| `public/data/luzes-noturnas/` | NASA SVS 5313, night-light change | 150 WebP frames | Downloaded/extracted only; change analysis and sonification were not completed |

These NASA sources are credited in [`CREDITS.md`](../CREDITS.md) because their frame files remain in the repository. Their presence does not mean the app implements the corresponding tracks.

## Empty placeholders

`public/data/quando-voce-nasceu/` and `public/data/terra-respirando/` contain only `.gitkeep` files. They have no downloaded data, track definitions, or app features. They are not part of the implemented experience.

## Scope for project descriptions

Public-facing descriptions and demonstrations should focus on the seven active tracks and the shared regional explorer. Mention the frame-only experiments only when explaining repository contents or project scope; do not present them as implemented features or evaluated results.
