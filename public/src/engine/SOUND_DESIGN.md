# Earth Jukebox sound mappings

AI-assisted: OpenAI Codex. Front-end engineering notes; the data contract remains
[FEATURES_CONTRACT.md](../../../docs/FEATURES_CONTRACT.md). No scientific JSON is modified.

## Scientific mappings

- Temperature: consume the supplied `norm`, not a locally computed normalization.
  `round(norm * 10)` indexes C3, D3, E3, G3, A3, C4, D4, E4, G4, A4, C5.
  Missing/nonfinite/out-of-range `norm` means silence. No climate anomaly or
  danger interpretation is attached to pitch.
- Wind (SVS 5148, m/s): consume the supplied `mean` speed `v >= 0` directly.
  Amplitude-modulation rate is `0.3 + 3.7 * (1 - exp(-v / 12))` Hz. This fixed,
  monotonic, saturating mapping does not stretch the observed range per track.
  Zero speed is a valid calm reference; a missing/negative/nonfinite speed or
  zero valid-pixel coverage means silence, never zero speed.
  `norm` remains visible as supplied but is not recomputed or used to add notes.
  Modulation pulses are a sonification code, not measured gusts. Pink-noise
  waveform randomness does not create additional meteorological events.
- Wind speed is an image-derived mean over confidently color-matched pixels,
  with transparency and basemap ambiguities. Coverage is an image-pixel share,
  not Earth surface area. Neither the mean nor coverage is a whole-Earth field.

- Precipitation (SVS 5149, mm): use supplied mean amount `a`, never infer mm/h.
  At `a = 0` the instrument is silent. Positive amounts map to
  `0.5 + 4.5 * (1 - exp(-a / 5))` coded glass plucks/s, bounded by 5.
  Fixed G4 is a timbral carrier, not an amount-to-pitch mapping. Missing,
  negative, nonfinite amounts or zero pixel coverage mean silence. The JSON
  does not specify the accumulation interval, so no rainfall-rate conversion
  or claim of observed drops/events is made.
- Specific humidity (SVS 5150, g/kg): supplied mean `q >= 0` maps to nominal
  spectral bandwidth `160 + 1440 * (1 - exp(-q / 12))` Hz, bounded at 1600 Hz.
  A bandpass centered at 650 Hz uses `Q = 650 / bandwidth`; widening its band
  adds body to a steady airy pad with a quiet fixed C4 carrier. There are no
  rain events, relative-humidity percentages or data-driven pitch changes.
  Missing, negative, nonfinite values or zero coverage mean silence. Zero
  specific humidity is a valid thin-pad reference, not a missing value.
- All four current datasets are image-derived (`mock: false`), not raw
  numerical GEOS-FP grids. `mean` and `norm` are consumed exactly as supplied.
  Temperature's current normalized range fits a single pentatonic step (D4);
  that is preserved rather than artificially stretching the melody.

## Expressive layer

Temperature retains one additive, rounded organ voice; a 100 ms attack, smooth
release, short pitch transition and optional 16% reverb change presentation only.
Wind uses one fixed C3 flute-like oscillator with quiet, filtered pink-noise
breath. A 0..1 sine LFO raised to the third power shapes rounded musical pulses
with quiet gaps; only its frequency follows the unchanged speed mapping. C3 is
an expressive reference, not a second wind-speed mapping or a competing melody.
A 1400 Hz lowpass and 12% reverb soften the presentation. No geographic stereo
direction is implied. The LFO never advances dataset frames.
Precipitation uses a sine FM carrier with soft harmonics, an eighth-power
nonnegative sine LFO for narrow rounded plucks, a 1800 Hz lowpass and 12% reverb.
Humidity combines filtered pink noise and a low-level C4 carrier; its continuous
300 ms onset and 18% reverb contrast with the two pulsed instruments.
All four instruments use smooth ramps/envelopes and are allocated once per audio
initialization, behind a silent gate until explicitly played.

The visual player owns time. No instrument has a JavaScript frame timer.
Legend timers compare explicitly labeled reference values only: temperature
norm 0/1, wind 5/25 m/s, precipitation 0.5/10 mm, or humidity 2/18 g/kg. Manual previews and the last frame have bounded
envelopes; pause, missing data, mute and switching experiences stop the old sound.

## Mixer and future combination

`audio.js` owns one context, calibrated independent layer gains, a speech-ducking
gain, master volume and a shared -6 dB limiter. Initial master volume is -30 dB;
calibration balances the four sound identities independently of their data values.
`setInstrumentGain`, `setInstrumentMuted` and `updateInstrument` control the four
real instruments independently. Current `playFrame` deliberately selects only one.
Own browser speech ducks instrument gain to 35%; it does not route through Tone
or guarantee a bound on device/speech loudness.

Each instrument implements `update / stop / dispose` and can later be selected
for a time-aligned mix. The current UI plays one experience at a time; there is
no automatic four-layer combination. A first combined mode should select at
most three meteorological layers and keep their distinct information channels.

Before combination, the data producer must provide explicit UTC/offset-bearing
scientific timestamps, provenance, sampling/averaging semantics and missing-value
rules for every series. Join compatible times, never equal image indices. Current
dataset dates have no offsets. The newly integrated temperature, wind, rainfall
and humidity values are image-derived and no longer mock; matching timestamp
strings are not by themselves proof of scientific temporal equivalence. Model-field comparison and area weighting remain data-team work.
