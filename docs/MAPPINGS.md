# Data-to-sound mappings

This reference summarizes the seven sound mappings implemented by the player. The same inputs and fixed scales are used for global and selected-region playback; regional values are not stretched to create extra contrast. The sound mappings are cues for patterns in NASA's visualizations, not substitutes for the source's numerical fields or health and hazard assessments.

| Variable (NASA SVS) | Data input to sound | Sound and encoded change | Limits |
|---|---|---|---|
| Near-surface temperature (5147) | Supplied normalized legend position (`norm`, 0–1) | One of 11 C-major pentatonic notes from C3 to C5; a higher legend position selects a higher note. | The note is not a climate anomaly or danger rating. |
| Near-surface wind (5148) | Dimensionless `visualSignal` (0–1), an area-weighted visual intensity-and-extent index | Flute-like tone; more detected wind-colored signal increases the pulse rate. | It is not wind speed in m/s. Unrecognized pixels are unknown in the physical data, not measured calm. |
| Precipitation and clouds (5149) | Supplied mean image-derived amount in mm | Dry, drum-like strokes become denser as the amount rises; the G3 carrier pitch stays fixed. | The accumulation interval is not specified, so the sound is not a rainfall rate or a recording of rain. |
| Specific humidity (5150) | Supplied mean specific humidity in g/kg | A sustained C3 string-like pad becomes brighter and richer in harmonics as bandwidth increases. | It is not relative humidity in percent; pitch and detuning do not encode the value. |
| PM2.5 (5151) | Dimensionless `visualSignal` (0–1), combining area-weighted log-color intensity and detected extent | A sustained metallic FM tone rises and brightens on one fixed C4–C6 curve; loudness stays fixed. | It is a qualitative visual index, not concentration, polluted-area percentage, or health risk. |
| Near-surface ozone (5152) | Supplied normalized concentration position (`norm`, 0–1) | One of 11 C-major pentatonic notes from C4 to C6; higher positions select higher, softly plucked notes. | Image-derived ppbv estimate, not the original GEOS-CF field or a health-risk rating. |
| Carbon monoxide (5153) | Supplied normalized concentration position (`norm`, 0–1) | One of 11 C-major pentatonic notes from C3 to C5; higher positions select higher, trumpet-like notes. | Image-derived ppbv estimate, not the original GEOS-CF field or a health-risk rating. |

The browser consumes the prepared values; it does not calculate a new scale from the current region. Missing or invalid sound input, or zero accepted-pixel coverage, is silent rather than silently treated as a measured zero. On the active wind and PM2.5 tracks, `visualSignal` is an explicitly declared field; if it is missing, playback does not fall back to speed or concentration.

## Area weighting

The per-track data files declare their summary method. Temperature, wind, precipitation, humidity and PM2.5 image-derived means use cosine-of-latitude row weights for the equirectangular image; the current CO and ozone regional tables retain equal weights per accepted pixel. PM2.5 and wind sonification use their separate area-weighted visual indexes. P90 remains an unweighted pixel percentile, and coverage remains a fraction of analyzed image pixels, not a geographic-area percentage.

See [the area-weighting record](AREA_WEIGHTING.md), [the scientific study](ESTUDO_CIENTIFICO.md), and [sound-design implementation notes](../public/src/engine/SOUND_DESIGN.md) for formulas, trade-offs, and instrument details.
