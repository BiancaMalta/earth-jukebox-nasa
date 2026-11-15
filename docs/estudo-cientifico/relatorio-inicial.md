> Historical report from before adopting the wind visual index. For the current state, charts, and portable reproduction steps, see [ESTUDO_CIENTIFICO.md](../ESTUDO_CIENTIFICO.md).

# Preliminary audit — Earth Jukebox

Research into official sources and numerical comparison. No project files were changed during this investigation.

## Scope and method

- Images: first local frame, `2026-10-30T06:00`, interpreted by the pipeline as Eastern Time (-04:00 on that date), therefore 10:00 UTC. This is a pipeline assumption, not a new verification of the scientific timestamp.
- Reference: GEOS-FP assimilation, hourly mean centered at 2026-10-30 10:30 UTC (10:00–11:00 UTC window), time index 78130 from 2017-12-01 00:30 UTC. This is not exactly the timestamp printed on the image.
- Only one time slice and a spatial subsample were queried: lat[0:5:720], lon[0:4:1151], a 145 × 288 grid (~1.25°). About 2.5 MB of ASCII data; the complete dataset was not downloaded.
- T2M in K was converted to °C by subtracting 273.15; QV2M in kg/kg was multiplied by 1000 to get g/kg. Units were confirmed in the GEOS-FP File Specification, pp. 29–31; the served DAS does not include units for these variables.
- Wind: sqrt(U10M²+V10M²), the speed of the hourly mean vector. This is not necessarily the mean of instantaneous speeds.
- Boundaries: the same project GeoJSON on both sides, using image pixel-center masks and model-grid points; coarse sampling implies edge differences. The Europe group includes all of Russia. These are not physical-continent boundaries rigorously comparable to those in other products.
- The primary comparison used no weights to separate color conversion from area effects. Weighting was tested separately with cos(latitude), over accepted pixels/cells. It does not recover rejected pixels.
- References are fields from the source model itself, not independent observations. One subset does not validate all 124 frames or establish global scientific accuracy.

## First frame — image / numerical field (unweighted)

| Group | Temperature °C | Specific humidity g/kg | Wind m/s |
|---|---:|---:|---:|
| Africa | 29.18 / 30.59 | 9.27 / 9.33 | 5.13 / 3.04 |
| South America | 18.31 / 19.04 | 13.90 / 13.19 | 5.33 / 1.69 |
| North America | -3.21 / -3.44 | 3.39 / 3.79 | 7.87 / 3.70 |
| Europe (current group) | -5.11 / -4.99 | 2.40 / 2.87 | 5.86 / 2.61 |
| Asia (current group) | 16.90 / 16.46 | 7.01 / 7.46 | 5.53 / 2.83 |
| Oceania | 27.33 / 25.57 | 9.20 / 9.64 | 5.20 / 3.20 |
| Antarctica | -32.25 / -29.62 | 0.14 / 0.37 | 8.43 / 7.56 |

## Effect of weighting on the image (not applied to the product)

| Group | Current → weighted temperature °C | Current → weighted humidity g/kg |
|---|---:|---:|
| Africa | 29.18 → 29.27 | 9.27 → 9.44 |
| South America | 18.31 → 18.82 | 13.90 → 14.29 |
| North America | -3.21 → 1.41 | 3.39 → 4.59 |
| Europe (current group) | -5.11 → -3.19 | 2.40 → 2.67 |
| Asia (current group) | 16.90 → 18.08 | 7.01 → 7.63 |
| Oceania | 27.33 → 27.65 | 9.20 → 9.43 |
| Antarctica | -32.25 → -31.99 | 0.14 → 0.15 |

Russia occupies 78.02% of analyzable pixels in the Europe group; with cos(latitude) weighting, its share of that same group would be 73.70%. Latitude weighting reduces projection distortion but does not change the grouping.

## Precipitation — quantities with different meanings

The image JSON reports mm without specifying an accumulation interval. The PRECTOT reference is a flux in kg/m²/s, converted here to mm/h by multiplying by 3600 (1 kg/m² of water equals 1 mm). The mm/h column has NOT been reinterpreted as the image's mm; do not calculate error or a conversion ratio between the columns.

| Group | Image mm | Accepted pixels % | GEOS-FP mm/h (unweighted) |
|---|---:|---:|---:|
| Africa | 0.630 | 6.16 | 0.0754 |
| South America | 0.645 | 11.98 | 0.1139 |
| North America | 0.745 | 5.19 | 0.0852 |
| Europe (current group) | 0.609 | 3.42 | 0.0515 |
| Asia (current group) | 0.705 | 8.49 | 0.1171 |
| Oceania | 0.841 | 9.79 | 0.1713 |
| Antarctica | 0.521 | 0.42 | 0.0237 |

## Interpretation and priorities

1. **Temperature:** Reasonable regional signals and order of magnitude in this subset. Approximate differences between the image and model range from 0.12 to 2.64 °C. These are not isolated conversion errors; they include time, grid, boundary, and field-height/definition differences. SVS 5147 mentions both 3 m in the summary and 2 m in the description, an inconsistency to clarify.
2. **Humidity:** The contrast between humid South America and dry Antarctica also appears in GEOS-FP. In the tropics and mid-latitudes, differences in this subset are generally less than 1 g/kg. For Antarctica, 0.144 versus 0.368 g/kg indicates a substantial relative underestimate despite the small absolute difference. Latitude weighting alone does not resolve it.
3. **Wind:** Image means are systematically high. The calibrator only uses visible colors from about 3.5 m/s; this excludes many weak winds, and continental acceptance in the first frame ranges from ~5% to ~73%. For example, South America is 5.33 m/s in the image versus 1.69 m/s in the full field. Latitude weighting cannot recover the excluded range or undo color transparency.
4. **Precipitation:** Means are conditioned on a small colored sample (0.42% of Antarctic pixels; 3.42% of Europe). They do not represent mean precipitation over the whole region, and missing color does not necessarily mean zero. We need to confirm the time interval and mapping used by the renderer. The official labeled scale was inspected and is linear from 0 to 20 mm.
5. **Recommended priority:** Preserve current results; add an explicitly versioned area-weighted mean method; resolve continent groupings; obtain wind and precipitation from numerical fields; confirm timestamps/intervals and repeat comparisons at multiple timestamps. Do not recalibrate the music to hide discrepancies.

## Official sources consulted

- Temperature SVS 5147: https://svs.gsfc.nasa.gov/5147/
- Wind SVS 5148: https://svs.gsfc.nasa.gov/5148/
- Precipitation SVS 5149: https://svs.gsfc.nasa.gov/5149/
- Specific humidity Q2M SVS 5150: https://svs.gsfc.nasa.gov/5150/
- SLV metadata: https://opendap.nccs.nasa.gov/dods/GEOS-5/fp/0.25_deg/assim/tavg1_2d_slv_Nx.info
- FLX metadata: https://opendap.nccs.nasa.gov/dods/GEOS-5/fp/0.25_deg/assim/tavg1_2d_flx_Nx.info
- GMAO File Specification for GEOS FP: https://gmao.gsfc.nasa.gov/pubs/docs/Lucchesi1203.pdf
- Area weighting on a latitude/longitude grid (official Xarray documentation): https://docs.xarray.dev/en/stable/examples/area_weighted_temperature.html
- UN M49: statistical country groupings are not automatically physical continent boundaries: https://unstats.un.org/unsd/methodology/m49/
- Berkeley Earth Europe archive (spatial-definition/historical-climatology context only; not validation of October/November 2026): https://berkeley-earth-temperature.s3.us-west-1.amazonaws.com/Regional/TAVG/europe-TAVG-Trend.txt

## Reproduction

Queries and scripts from this investigation were saved to `/tmp/earth-jukebox-fetch-reference.py`, `/tmp/earth-jukebox-compare-reference.py`, and `/tmp/earth-jukebox-precip-reference.py`. The CSV at `/tmp/earth-jukebox-reference-comparison.csv` contains weighted and unweighted means; ASCII and DAS files preserve the responses obtained. All use local files from the `calculo-regiao` branch without modifying them.
