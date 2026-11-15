<!-- AI-assisted editorial draft. Check team details, submission links and eligibility status before external submission. -->

# Earth Jukebox: Hearing a Changing Planet

*An accessible, browser-based sonification of NASA Earth visualizations*

> Earth Jukebox turns NASA Earth visualization frames into a listening experience. A visitor chooses a dataset, follows its changing frames, and hears a repeatable sound mapping alongside the map and its image-derived readings. The project is designed so that blind and low-vision visitors can navigate the experience with a keyboard and screen reader, while sighted visitors can explore the same data visually and by ear.

**Project:** Earth Jukebox
**Challenge:** [The Earth Information Jukebox — NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/)
**Live experience:** [nasaearthjukebox.netlify.app](https://nasaearthjukebox.netlify.app/)
**Source code:** [BiancaMalta/earth-jukebox-nasa](https://github.com/BiancaMalta/earth-jukebox-nasa)

## The challenge and the question

The challenge asks teams to pair Earth Information Center (EIC) visual frames with dynamic sonification. It points to a simple access problem: a scientific story shown only as a map or animation is out of reach for people who cannot see it, and can be difficult to interpret for anyone unfamiliar with the visualization. NASA's [Daily Visualizations gallery](https://svs.gsfc.nasa.gov/gallery/daily-visualizations/) says it collects visualizations updated for EIC; it includes all seven active source IDs used here, SVS 5147â€“5153.

Our design question was: **Can a visitor hear how a NASA Earth visualization changes over time without needing someone else to interpret the map?** We chose a browser experience rather than a fixed playlist. The visitor controls the dataset, playback, time, region, andâ€”experimentallyâ€”the mix of multiple variables.

The sound is an additional way to inspect the visualization. It does not replace the visual evidence, a NASA numerical product, or a scientific interpretation. It follows explicit, documented rules so that a given input produces the same sound wherever it is heard.

## What a visitor can do

1. **Choose a record.** Seven NASA SVS visualizations cover near-surface temperature, wind, precipitation, specific humidity, PM2.5, ozone, and carbon monoxide.
2. **Follow the sequence.** Play, pause, step to the previous or next frame, move the timeline, and change playback speed. The map, date, image-derived readings, and sound refer to the displayed frame.
3. **Inspect a place.** Keep the whole map, choose a region, or choose a country. A region selection changes the highlighted map area and the regional readings and sound. Preset regions offer a quicker route into the map. Returning to the whole map restores the global image reading.
4. **Compare records.** The optional combination view aligns each layer by its supplied timestamp label, shows the selected maps together, and mixes the selected sounds. This is an exploratory comparison; matching labels do not prove that the underlying products share an exact scientific time basis.
5. **Learn the sound.** The sound guide explains what each mapping means and provides short sound examples. Values over time and the current-frame reading give non-audio ways to inspect the same sequence.

The app includes keyboard shortcuts, visible focus, labeled controls, a guided introduction, screen-reader announcements, optional spoken navigation, and an optional non-speech time cue. The metronome can make one high click at each new day or week while audio playback runs; the interval is selectable, the weekly boundary starts on Monday, and the cue follows playback speed. It is off by default and has a preview button. Its checkbox, interval selector, and preview use native keyboard-operable controls with labels and help text. This gives a listener an audio landmark for the sequence without adding another spoken announcement. Spoken navigation is separate from a screen reader: a visitor whose screen reader already reads the page can leave the extra voice off to avoid overlapping speech. See the [keyboard and accessibility notes](JUKEBOX_DESIGN.md) and the [navigation test record](TESTS.md).

## From a NASA frame to a sound

The data pipeline runs before the browser experience. It obtains the selected NASA SVS media, extracts frames, calibrates the visualization's color legend, applies masks and color filters, and produces frame features and regional tables. The browser loads these prepared assets and uses the selected frame's values to generate sound through the audio engine. The playerâ€”not an individual instrumentâ€”owns the playback clock.

In broad terms, the processing path is:

```text
NASA SVS visualization
  â†’ extracted image frames and color legend
  â†’ filtered, color-decoded pixel features
  â†’ frame and regional data files
  â†’ fixed sonification mapping
  â†’ browser-generated audio synchronized with playback
```

The image-decoding step is an estimate. It is not a download of the original GEOS-FP or GEOS-CF numerical grid. A color can be decoded only where the pipeline accepts it; text, borders, transparent areas, overlapping map details, and the chosen color filters affect which pixels contribute. The app reports pixel coverage separately so that a partial image estimate is not mistaken for a complete measurement.

For equirectangular images, a pixel row does not represent the same ground area at every latitude. The image-derived means for temperature, wind, precipitation, humidity, and PM2.5 therefore use a cosine-of-latitude weight for each row (`weight = cos(latitude)`), based on the pixel row's center. The current CO and ozone regional tables still use equal weights per accepted pixel. Wind and PM2.5 also have their own area-weighted visual-signal inputs for sound; those inputs combine decoded intensity with detected extent. P90 remains an unweighted pixel percentile, while coverage remains a count fraction of analyzed image pixels. Weighting reduces the map's high-latitude area bias; it cannot restore pixels rejected by the filters or turn an image estimate into the underlying model field. See the [area-weighting record](AREA_WEIGHTING.md) and [scientific study](ESTUDO_CIENTIFICO.md) for implementation details and comparisons.

## The seven sound mappings

The team designed the mapping and sound identity for each supported variable. The rationale, including the research that informed the choices and the limits of that evidence, is documented in the [sound design rationale](SOUND_DESIGN_RATIONALE.md). Exact rules and instrument timbres are in [Sound design](../public/src/engine/SOUND_DESIGN.md) and the [mapping reference](MAPPINGS.md).

| NASA SVS visualization | What changes in the sound | What the sound represents |
|---|---|---|
| Near-surface temperature (5147) | A supplied normalized value selects one of eleven notes in a C-major pentatonic scale. | Higher supplied legend positions sound higher. The note is not a danger or climate-anomaly rating. |
| Near-surface wind speed (5148) | A qualitative visual-signal index controls the pulse rate of a flute-like tone. | More detected wind-colored signal produces faster pulses. This sound input is not a wind speed in m/s; transparent pixels are not treated as measured calm. |
| Precipitation and clouds (5149) | The supplied amount in millimeters controls the rate of dry, drum-like strokes; the carrier pitch stays fixed. | More supplied amount produces denser strokes. The visualization metadata does not establish an accumulation interval, so the sound is not labeled mm/hour or as literal rainfall. |
| Near-surface specific humidity (5150) | The supplied mean in g/kg changes the bandwidth and brightness of a sustained, string-like sound. | More specific humidity opens the sound's spectrum. It is not relative humidity in percent. |
| PM2.5 (5151) | A fixed qualitative visual index moves a sustained metallic tone higher and brighter. | The index combines log-scaled color intensity and detected extent. It is not a concentration, a fraction of polluted area, or a health-risk score. |
| Near-surface ozone (5152) | The supplied normalized legend position selects a note from a fixed pentatonic scale in a higher register. | Higher supplied positions sound higher. The melody is not a health-risk assessment. |
| Carbon monoxide (5153) | The supplied normalized legend position selects a note from a fixed pentatonic scale in a lower register. | Higher supplied positions sound higher. The melody is not a health-risk assessment. |

Instrument loudness and timbre help distinguish the layers; the data mapping itself is separately defined. Missing or invalid input is unavailable and silent, rather than being silently converted to zero. The same fixed mapping is used across the globe and selected regions, so the app does not stretch each region's observed range to manufacture extra contrast.

## How the team developed the method

The project began with the challenge's central pairingâ€”visual frames plus soundâ€”and a user priority: make the experience usable without requiring sight or a guide. The implementation then grew in three connected tracks:

1. **Build a repeatable data path.** The Python pipeline produces a declared set of frame features from the NASA visualization, while the browser remains a static web app. Per-dataset track metadata describes the source, units, legend, and selected sound input.
2. **Make each translation explainable.** Before adding a sound, the team documented which field drives it, its units or dimensionless status, the direction of change, its reference range, and what it must not imply. The user can hear a reference example and read the mapping in the interface.
3. **Check whether the image-derived summaries preserve useful comparisons.** A small comparison with NASA GEOS-family numerical fields exposed weaknesses in some pixel averages. The team retained the limits of that comparison and improved two qualitative sound inputs rather than claiming the images had become exact numerical data.

For wind, transparent and unrecognized parts of the image made a mean over accepted colored pixels a poor proxy for the extent of the visible signal. Wind sonification therefore uses an area-weighted visual index that treats undetected pixels as unknown in the physical data, not as observed zero wind.

For PM2.5, a few extreme decoded pixels could reverse some regional rankings. The team tested alternatives against an archived GEOS-CF reference and adopted an area-weighted, log-scaled intensity-and-extent index for sound. Across 24 additional three-hour transitions, the report found improved directional agreement in that sample. For example, for country changes greater than 1 Âµg/mÂ³, the reported direction agreed in 95.5% of comparisons with the new index, versus 90.2% for the earlier sound input. This is evidence about those selected comparisonsâ€”not a general accuracy rate. Some inversions remain, the reference is a model field rather than independent ground observations, and the exact recipe used to render the source visualization has not been confirmed. The full methods, criteria, raw snapshots, and remaining errors are in the [PM2.5 qualitative evaluation](estudo-cientifico/pm25-qualitativo.md) and [broader scientific study](ESTUDO_CIENTIFICO.md).

### Evidence for each of the seven variables

The repository documents a scientific investigation for each of the seven tracks, but not all investigations establish comparable agreement. These checks compare image-derived estimates with NASA model fields, not independent ground instruments. They cover samples, not every region and all 124 frames.

| Variable | What was checked | What the evidence supportsâ€”and what it does not |
|---|---|---|
| **Temperature** | Regional image estimates for one frame were compared with a nearby GEOS-FP numerical field on an approximately 1.25Â° grid. | Regional patterns and magnitudes were broadly plausible in that snapshot; country/continent differences ranged about 0.12â€“2.64 Â°C. Time alignment is approximate, and NASA's SVS page gives both 2 m and 3 m descriptions. This is not validation of the full sequence. |
| **Specific humidity** | The same one-frame GEOS-FP comparison checked regional estimates in g/kg. | The broad contrast of humid South America and dry Antarctica appeared in both sources; tropical and mid-latitude differences were usually under 1 g/kg. Antarctica was notably low in the image estimate (0.144 vs 0.368 g/kg). Spatial weighting does not remove this discrepancy. |
| **Wind** | Three sampled frames were compared with GEOS-FP; regional ordering and sampled temporal directions were evaluated. | The adopted area-weighted visual signal improved regional ordering over the earlier mean of accepted pixels (Spearman 0.876, 0.899, and 0.788 vs 0.302, 0.369, and 0.401 in the three frames). For sampled transitions with reference changes over 1 m/s, direction agreed in 94.6% of comparisons. This validates neither complete m/s values nor every location: the sound deliberately represents a qualitative image signal, and transparent pixels remain unknown. |
| **Precipitation** | First-frame image estimates were inspected alongside GEOS-FP regional precipitation, but the quantities could not be compared directly. | The image is labeled in mm with no confirmed accumulation interval; the reference is a flux converted to mm/h. Because the units do not describe a confirmed common period, no error, correlation, or agreement claim was calculated. Color coverage is sparse in some regions (0.42% of analyzed Antarctic pixels in the sample). The physical estimate and its sound interpretation need more source and interval evidence. |
| **PM2.5** | The original image-derived concentration was compared at five frames with a GEOS-CF reference; a follow-up tested a separate visual-signal index at 29 frames, including 24 additional three-hour transitions. | The original concentration showed poor absolute agreement and regional reversals. The new sound index substantially improved relative ordering in the selected follow-up sample: for country changes over 1 Âµg/mÂ³, direction agreed in 95.5% vs 90.2% for the previous input. This supports a qualitative comparison of visible signal, not accuracy of Âµg/mÂ³ values, the exact aerosol recipe, or all future transitions. |
| **Carbon monoxide (CO)** | Five sampled frames and regional trends were compared with GEOS-CF fields for 98 countries/territories. | Regional rank correlations were high (Spearman 0.969â€“0.985), and 92.6% of non-zero sampled changes followed the reference direction. The image estimates had an average positive bias of 17.32 ppbv. This supports qualitative ordering in that sample, not exact concentrations or health interpretation. |
| **Ozone (Oâ‚ƒ)** | Five sampled frames and regional trends were compared with GEOS-CF fields; some regions lacked sufficient accepted image pixels. | Rank correlations were 0.893â€“0.968; 86.7% of non-zero sampled changes followed the reference direction. The aggregate bias was +3.12 ppbv. Low-concentration colors can be near white and are lost by the saturation filter, leaving very low coverage in some places. These samples do not validate low values or the full sequence. |

In short, temperature and humidity have a one-frame plausibility check; wind has a small multi-frame comparison of a qualitative index; precipitation has no commensurate numerical validation yet; and the three air-quality tracks have five-frame GEOS-CF comparisons, with the more extensive PM2.5 follow-up focused on its new qualitative sound input. The team-authored studies report evidence and uncertainty separately instead of labeling a track simply â€œscientifically validated.â€ Detailed tables, time assumptions, data snapshots, and reproduction steps are in [the GEOS-FP and wind study](ESTUDO_CIENTIFICO.md), [the pollutant audit](estudo-cientifico/validacao-poluentes.md), and [the PM2.5 follow-up](estudo-cientifico/pm25-qualitativo.md). The [seven-variable evidence summary](#evidence-for-each-of-the-seven-variables) brings their conclusions together.

The visual design uses the user's record-collection metaphor. The article is organized around the visitor's pathâ€”from the challenge and the experience, through data selection and sound design, to evidence, limitations, and reproducibility. This keeps the narrative useful to both a first-time visitor and a technical reviewer.

## Technical structure and reproducibility

- `pipeline/` contains the offline Python processing and evaluation tools.
- `public/tracks/` records per-visualization metadata; `public/data/` contains the prepared frame and feature assets.
- `public/src/data/` validates and loads the data contract.
- `public/src/engine/` contains the sound mappings, audio engine, and speech support.
- `public/src/ui/` contains the player, regions, combined mode, sound examples, and accessibility interactions.
- `docs/` holds the mapping, design decisions, scientific audits, and test records.

The repository runs as a static site; it does not need a project API server for playback. Setup instructions are in the [README](../README.md). Data sources, libraries, licenses, references, and AI use are recorded in [CREDITS.md](../CREDITS.md).

The repository documents automated pipeline and browser-code checks, plus viewport and keyboard review for the retro interface. These checks are not a substitute for testing with blind and low-vision participants. We do not claim a completed user study, WCAG certification, or that every sound can be distinguished in every device or seven-layer mix. The [test record](TESTS.md) keeps those limits explicit.

## What the estimates doâ€”and do notâ€”say

- The displayed regional and global figures are image-derived estimates from accepted pixels, not direct reads from the underlying numerical model grid.
- Pixel coverage is the fraction of analyzed image pixels accepted by the pipeline. It is neither geographic area nor confidence, scientific accuracy, or instrument reliability.
- The regional boundaries use whole-country assignments. Europe includes all of Russia; Asia excludes Russia. Oceanic island territories describe land, not an ocean average.
- Wind sound uses a visual index, not the physical wind mean. PM2.5 sound uses a qualitative visual index, not a concentration. Neither index is a health or hazard rating.
- Precipitation is labeled in mm because the source does not establish the accumulation interval. It is not converted to a rate.
- The combined mode matches supplied timestamp labels. The labels do not carry offsets for every series, and equal labels alone cannot establish temporal or scientific equivalence among products.
- The scientific comparisons are bounded evaluations with remaining mismatches. Their archived reports describe the source fields, time assumptions, sample rules, and unresolved inversions.

These limits are part of the experience, not fine print: a sound can make a pattern easier to notice, but it cannot make uncertain pixels certain.

## Challenge alignment and submission check

The product directly implements the challenge's central idea: pairing NASA SVS visual frames from the EIC Daily Visualizations collection with sound generated in the browser as the visitor moves through frames. Its contribution is an accessible player, seven documented mappings, regional exploration, an experimental multi-variable mix, and an auditable image-processing workflow.

The 2026 Global Organizing Team's [judging clarification](https://github.com/nasa/spaceapps/discussions/2130) describes five evaluation criteria. This article is structured to answer each one:

| Criterion | Evidence in this project |
|---|---|
| Impact | An alternate route into Earth science for blind and low-vision visitors, with keyboard and screen-reader interaction. |
| Creativity | Seven deterministic mappings and a multi-layer listening experiment pair scientific frames with distinct sound identities. |
| Validity | Source attribution, reproducible image processing, documented mappings, scoped comparisons, and explicit uncertainty and limitations. |
| Relevance | NASA SVS imagery in the EIC Daily Visualizations gallery is paired with dynamic, frame-synchronized sound. |
| Presentation | A public interactive demo, an onboarding guide, and this article explain the problem, interaction, data, method, and limits. |

These are descriptions of the work and evidence in the repository, not claims of impact measured in a user study or a guarantee of judging results.

The active tracks use SVS IDs 5147â€“5153, which NASA includes in its [Daily Visualizations gallery for the Earth Information Center](https://svs.gsfc.nasa.gov/gallery/daily-visualizations/). The challenge Resources include the broader **EIC Content Database** as a source of visuals for processing. The project therefore uses the challenge's EIC data resource. Frame copies from SVS 5011, 5046, 5113, and 5313 also remain in the repository from earlier exploration, but they have no player tracks and were not included in the scientific evaluations. NASA Space Apps' [2026 judging clarification](https://github.com/nasa/spaceapps/discussions/2130) says Global Awards eligibility requires at least one NASA source from the selected challenge's Resources; Earth Jukebox's active EIC tracks satisfy that data-source condition. This addresses the source requirement only; team registration and the official submission requirements remain separate.

## References and project links

- [Official challenge: The Earth Information Jukebox](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/)
- [NASA SVS Daily Visualizations for EIC](https://svs.gsfc.nasa.gov/gallery/daily-visualizations/)
- [NASA SVS visualization inventory and attribution](../CREDITS.md)

---

*Earth Jukebox is an independent Space Apps project and is not an official NASA product.*
