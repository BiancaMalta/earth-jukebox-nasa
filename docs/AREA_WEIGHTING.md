# Area-weighted means and country groups

The current method is versioned as `statistics.mean=area_weighted` and
`statistics.weighting=cos_latitude`. The mean uses the accepted pixels after
the same filters as before:

```text
sum(value * cos(latitude)) / sum(cos(latitude))
```

Each latitude is the center of a row in the equirectangular image. Color
filters, units, frame names, and timestamps are preserved. `norm` uses the
new mean with the same colorbar bounds. `p90` remains an unweighted pixel
percentile; `coverage` remains the fraction of accepted pixels.

This corrects the excessive weight given to the poles, but it does not restore
regions rejected by the filter. Wind means remain conditional on the colored
part of the field, and precipitation still has no confirmed accumulation
interval.

## Regions

The outlines remain unchanged. The interface now labels `continent:` groups as
**Region**. Europe includes all of Russia; Asia excludes Russia. Existing IDs
are preserved for compatibility. No arbitrary physical boundary between
Europe and Asia was introduced. The island-territory group is not an ocean
average.

## Preservation and generation

The eight JSON files from before the change were copied to
`/tmp/earth-jukebox-before-area-weighting`. That directory is temporary; Git
also preserves the previously published version. The comparison report is
generated separately for review.

Command run: `python pipeline/regions.py --update-features`

This command updates the global and regional files in the same pass through
the frames, preserving existing dates. The regional table uses
`schemaVersion: 2`. The front end compares the method and source values to
reject old tables; the mixer also rejects sources with different mean methods.

## Wind: temporal coverage checked

The query to the `tavg1_2d_slv_Nx` assimilation endpoint returned the time axis
from 2017-12-01 00:30 UTC through 2026-11-14 14:30 UTC. Interpreting frame
timestamps as `America/New_York` and choosing the hourly mean centered 30
minutes after each printed time puts 122 of 124 timestamps within the
published range. Frames 123 and 124 (Nov. 14 at 11:00 and 14:00 EST) would
correspond to centers at 16:30 and 19:30 UTC, after the last time then
available.

Coverage of the time axis does not prove that valid values exist for every
cell/time or that an instantaneous frame equals an hourly mean. The last wind
frame was inspected; its image shows Nov. 14, 2026 at 14:00 EST. The earlier
numerical extraction confirmed U10M/V10M at the start of the period. An
additional query for both endpoints returned an HTML error with HTTP 200; a
second attempt with corrected syntax timed out. Therefore, wind replacement
was not implemented and a complete validation of all 124 timestamps was not
claimed.

For future migration: confirm whether the final images represent forecasts,
query the matching collection/cycle without silently mixing forecast and
assimilation data, or choose a verified common period. Color extraction cannot
uniquely reconstruct transparent winds over an arbitrary basemap. If it is
retained, the sound must continue to be labeled as an estimate of the colored
portion, not a full-region mean.

## Precipitation

NASA SVS 5149 shows total precipitation (rain and snow) over clouds. The image
pipeline extracts approximate values on a 0–20 mm scale from accepted pixels.
The accumulation interval is not specified in the legend or JSON, so the
number must not be interpreted as mm/hour, mm/day, or an accumulation per
frame. Three hours between frames do not establish that each image represents
a three-hour accumulation. The mean uses accepted pixels only, not
necessarily the whole region. Uncolored pixels may be transparent or hidden
and cannot be converted to zero without support from the renderer or source
data.

References:
- https://docs.xarray.dev/en/stable/examples/area_weighted_temperature.html
- https://svs.gsfc.nasa.gov/5148/
- https://svs.gsfc.nasa.gov/5149/
- https://opendap.nccs.nasa.gov/dods/GEOS-5/fp/0.25_deg/assim/tavg1_2d_slv_Nx.info
- https://gmao.gsfc.nasa.gov/pubs/docs/Lucchesi1203.pdf

## Later qualitative update

Wind sonification now uses `visualSignal`, while conditional means remain as
diagnostics. See [ESTUDO_CIENTIFICO.md](ESTUDO_CIENTIFICO.md) for the three
evaluation timestamps, charts, and limitations. This is not a migration to
numerical wind data and does not recover transparent winds.
