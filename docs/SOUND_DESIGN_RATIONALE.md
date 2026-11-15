# Sound design rationale

This document records the reasoning behind the sound mappings implemented by
the Earth Jukebox team. It connects the design choices in the player to
published sonification research. The references support the use of sound
parameters as information channels; they do not validate this project's exact
mappings or establish that blind listeners can interpret them accurately.

The mapping formulas and implementation details are maintained separately in
[`MAPPINGS.md`](MAPPINGS.md) and
[`SOUND_DESIGN.md`](../public/src/engine/SOUND_DESIGN.md).

## Design goals

1. **Keep the data relationship learnable.** A stable direction is used within
   each mapping: higher supplied values generally produce a higher note,
   brighter tone, or faster pulse. Published work describes pitch, loudness,
   timbre, and temporal patterns as useful auditory dimensions for conveying
   data. A study with blind and low-vision participants found pitch intuitive,
   while the most accurate channel depended on the task and representation.
   There is no single universally best mapping, so the project uses simple,
   explicit rules and explains them in the in-app sound guide.
2. **Give each variable a recognizable sound identity.** Temperature, wind,
   precipitation, humidity, PM2.5, ozone, and carbon monoxide use distinct
   timbres or temporal patterns. Timbre is commonly used to communicate
   identity, while pitch and other changing parameters can communicate
   magnitude. The sound identity names the data layer; it does not claim that
   the NASA variable literally sounds like that instrument.
3. **Keep mappings deterministic and comparable.** The same declared input
   produces the same sound across frames and regions. Regional playback does
   not stretch its own minimum and maximum to exaggerate changes. This keeps
   the mapping rule stable when a listener moves between places.
4. **Avoid misleading physical or health interpretations.** A synthesized
   flute is not wind recorded in the atmosphere, drum strokes are not raindrops,
   and a rising pollutant note is not a health-risk scale. The interface and
   mappings document these distinctions.
5. **Make missing image evidence audible as missing.** Invalid inputs and
   frames with no accepted pixels are silent rather than encoded as measured
   zero. For wind and PM2.5, the sound uses an explicitly declared qualitative
   visual-signal index, not an unsupported physical measurement.
6. **Keep playback under one timeline.** The player advances frames and updates
   the sounds. Individual instruments do not create their own frame clocks;
   this keeps audio changes aligned with the displayed date and selected map.

## Why each mapping uses its sound parameters

| Variable | Implemented sound relationship | Design rationale and boundary |
|---|---|---|
| Temperature | A supplied normalized legend position selects one of eleven notes in a fixed C-major pentatonic scale. | A rising pitch provides a direct, learnable ordering cue. The bounded scale avoids an unrestricted frequency range, while the fixed notes make the same legend position comparable between regions. A higher note describes a higher position in this visualization's legend; it is not a climate anomaly or danger judgment. |
| Wind | The declared visual-signal index controls the pulse rate of a fixed-pitch, flute-like sound. | Pulse rate represents changes in the visible signal while pitch remains a stable timbral reference. This keeps pitch from implying a physical wind speed when transparent or unrecognized image areas prevent that inference. |
| Precipitation | The supplied image-derived amount controls the rate of dry, drum-like strokes; the carrier pitch is fixed. | Repetition rate gives the amount a temporal pattern, and a percussive timbre distinguishes this layer. The source does not establish an accumulation interval, so the mapping is not a rainfall rate or a recording of rain. |
| Specific humidity | The supplied mean opens the bandwidth and harmonics of a sustained, string-like pad; pitch stays fixed. | Spectral brightness and richness provide a continuous change without assigning the quantity to pitch. It encodes specific humidity in g/kg, not relative humidity or rainfall. |
| PM2.5 | The qualitative visual-signal index controls a sustained metallic tone that rises and brightens; loudness is fixed. | Continuous movement preserves small index changes without introducing a beat. The input combines log-scaled color intensity and detected extent; it is not a concentration, polluted-area percentage, or health-risk rating. |
| Ozone | A supplied normalized legend position selects one of eleven plucked notes in a higher register. | The fixed pentatonic sequence gives an ordered pitch cue and the plucked timbre differentiates this layer. The higher register is an identity choice, not a claim that ozone is intrinsically higher or more hazardous. |
| Carbon monoxide | A supplied normalized legend position selects one of eleven brass-like notes in a lower register. | The note sequence conveys the supplied ordering; its timbre and register distinguish it from ozone. It is an image-derived estimate and not a health-risk scale. |

The shared use of pitch for temperature, ozone, and carbon monoxide is paired
with different registers and timbres to help distinguish layers. The combined
view remains an experiment: simultaneous sounds may mask one another, and the
project has not established reliable identification or decoding accuracy for
the seven-layer mix in a participant study.

## What the research supports—and what it does not

Research on auditory displays identifies pitch, loudness, timbre, and temporal
patterns as established ways to encode information. User studies with people
with visual impairments also show that intuitiveness and decoding accuracy can
depend on the data type, chart, and auditory channel. These findings motivate
our use of a small vocabulary of explicit, repeatable sound relationships.
They do not prove that our particular instrument choices, scales, or multi-track
mix are optimal. That would require direct evaluation with blind and low-vision
listeners, including learning, comprehension, fatigue, and device conditions.

We therefore describe this as a documented design rationale, not a completed
human-subjects validation. Scientific comparisons of image-derived values are
reported separately in the team's [scientific studies](ESTUDO_CIENTIFICO.md).

## Research references

- Walker, B. N., & Nees, M. A. (2011). *Theory of Sonification*. In T.
  Hermann, A. Hunt, & J. G. Neuhoff (Eds.), chapter 2, pp. 9–39, [The
  Sonification Handbook](https://sonification.de/handbook/).
  Introduces sonification concepts and discusses auditory dimensions and
  mappings such as pitch, loudness, and timbre.
- Walker, B. N., & Mauney, L. M. (2010). *Universal Design of Auditory Graphs:
  A Comparison of Sonification Mappings for Visually Impaired and Sighted
  Listeners*. [Georgia Tech research record](https://wirelessrerc.gatech.edu/universal-design-auditory-graphs-comparison-sonification-mappings-visually-impaired-and-sighted.html).
  Compares data-to-sound mappings and scaling with blind and low-vision and
  sighted listeners.
- Wang, R., Jung, C., & Kim, Y. (2022). *Seeing Through Sounds: Mapping
  Auditory Dimensions to Data and Charts for People with Visual Impairments*.
  [Computer Graphics Forum, 41(3), 71–83](https://doi.org/10.1111/cgf.14523).
  Reports that perceived intuitiveness and accuracy vary by auditory channel,
  data type, and chart task.
- Enge, K., Rind, A., Iber, M., Höldrich, R., & Aigner, W. (2023). *Towards
  a unified terminology for sonification and visualization*. [Personal and
  Ubiquitous Computing, 27, 1949–1963](https://doi.org/10.1007/s00779-023-01720-5).
  Discusses auditory channels, including pitch and loudness as magnitude cues
  and timbre as an identity cue.
