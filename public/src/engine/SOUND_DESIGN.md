# Earth Jukebox sound mappings

AI-assisted: OpenAI Codex. Front-end engineering notes; the data contract remains
[FEATURES_CONTRACT.md](../../../docs/FEATURES_CONTRACT.md). The audio engine only reads inputs; Python produces their scientific and visual-signal fields.

## Scientific mappings

- Temperature: consume the supplied `norm`, not a locally computed normalization.
  `round(norm * 10)` indexes C3, D3, E3, G3, A3, C4, D4, E4, G4, A4, C5.
  Missing/nonfinite/out-of-range `norm` means silence. No climate anomaly or
  danger interpretation is attached to pitch.
- Wind (SVS 5148) now consumes the explicitly supplied dimensionless visualSignal
  field. Python combines decoded color intensity and detected extent with area
  weights, without interpreting transparent pixels as measured calm. The rate is
  `0.3 + 3.7 * (1 - exp(-visualSignal / 0.04))` Hz, fixed across every region/time.
  No accepted pixels means unavailable and silent. This is a qualitative visual
  signal code, not a physical-speed estimate. Mean/p90/norm retain their existing
  diagnostic meanings. The old mean-speed mapping remains for legacy data that
  do not declare this new mode; it is never a missing-index fallback.
- Precipitation (SVS 5149, mm): use supplied mean amount `a`, never infer mm/h.
  At `a = 0` the instrument is silent. Positive amounts map to
  `0.5 + 4.5 * (1 - exp(-a / 5))` coded drum strokes/s, bounded by 5.
  Fixed G3 is a timbral carrier, not an amount-to-pitch mapping. Missing,
  negative, nonfinite amounts or zero pixel coverage mean silence. The JSON
  does not specify the accumulation interval, so no rainfall-rate conversion
  or claim of observed drops/events is made.
- Specific humidity (SVS 5150, g/kg): supplied mean `q >= 0` maps to nominal
  spectral bandwidth `160 + 1440 * (1 - exp(-q / 12))` Hz, bounded at 1600 Hz.
  A bandpass centered at 650 Hz uses `Q = 650 / bandwidth`; widening its band
  adds body to a sustained string-like pad with a fixed C3 ensemble. There are no
  rain events, relative-humidity percentages or data-driven pitch changes.
  Missing, negative, nonfinite values or zero coverage mean silence. Zero
  specific humidity is a valid thin-pad reference, not a missing value.
- PM2.5 (SVS 5151): use supplied dimensionless `visualSignal`, the area-weighted
  log-color intensity times detected extent. Python averages per-pixel positions
  `clip(log(decoded / 0.4) / log(409.6 / 0.4), 0, 1)` with the entire analyzed
  area in the denominator. This limits extreme pixel influence and retains
  detected extent; unknown pixels are not measured zero concentration.
  The fixed curve `brightness = visualSignal + 0.3 * sin(π * visualSignal)`
  controls cutoff `1400 + 4800 * brightness` Hz and continuous C3–C7 pitch
  `130.8127825 * 16 ** brightness` Hz. Both strictly increase with the index.
  Pitch intervals in cents are twice those of the historical C4–C6 curve;
  the index, filter and gain curves retain their previous definitions.
  One metallic FM voice glides between frames at fixed loudness. Mean/p90/norm
  remain separate diagnostics; the concentration mean now uses cosine-latitude
  weights. Missing index or zero pixel coverage means silence, without fallback
  to concentration. The legacy norm path exists only for undeclared old sources.
  The [qualitative study](../../../docs/estudo-cientifico/pm25-qualitativo.md)
  checks regional ordering, three-hour directions and nominal pitch separation.
  It does not establish exact concentrations or individual auditory perception.
- Carbon monoxide (SVS 5153, ppbv): use the supplied linear-legend `norm` to
  select one of 29 natural C-major notes from C2 to C6. Fixed scale-index
  anchors are 40→0, 60→3, 200→24, 500→28; round to the nearest step.
  Steps span about 6.67 ppbv through 200 and 75 ppbv above it. A filtered,
  brass-like single voice follows the frame; rising concentration means higher
  pitch, not a health-risk rating. The image-derived global mean changes very
  little in this interval, while the regional estimates vary more. Regional
  tables currently use equal weights per accepted pixel.
- Ozone (SVS 5152, ppbv): use the supplied linear-legend `norm` to select the
  29 natural notes of C major, C3 to C7, with fixed concentration-to-step
  anchors 5→0, 30→4, 50→24, 60→28. The 30–50 ppbv band has 1 ppbv per
  diatonic step; the lower and upper bands use 6.25 and 2.5 ppbv per step.
  Round to the nearest step. The supplied norm is unchanged; the same musical
  transfer applies to every region/time. The legend compares 40 ppbv (C5)
  with 41 ppbv (D5). One short plucked-string
  note follows each frame; rising concentration means higher pitch, not a
  health-risk rating. Around 43–46% of analyzed pixels are used in these frames;
  that is image-pixel coverage, not accuracy or geographic area. Regional tables
  currently use equal weights per accepted pixel.
- The four climate datasets are image-derived (`mock: false`), not raw
  numerical GEOS-FP grids. `mean` and `norm` are consumed exactly as supplied.
  Temperature retains its original pentatonic scale; small normalized changes
  can stay on one step. All musical curves are fixed across regions and times.

## Expressive layer

Temperature retains one additive, rounded organ voice; a 100 ms attack, smooth
release, short pitch transition and optional 16% reverb change presentation only.
Wind uses one fixed C5 flute-like oscillator with quiet, filtered pink-noise
breath. A 0..1 sine LFO raised to the third power shapes rounded musical pulses
with quiet gaps; only its frequency follows the explicitly declared wind input mapping. C5 is
an expressive reference, not a second wind-speed mapping or a competing melody.
A 2600 Hz lowpass and 12% reverb soften the presentation. No geographic stereo
direction is implied. The LFO never advances dataset frames.
Precipitation uses a fixed G3 custom body with partials [.45, 1, .75, .35, .15]
and a white-noise stick-like stroke filtered around 2300 Hz. The harmonic body
has fixed gain .4 and the stroke .6; neither gain varies with precipitation.
A nonnegative sine LFO raised to the thirty-second power gives short, rounded drum
windows; no new note or noise source is created for each stroke. An 8 ms gate
attack, 3200 Hz lowpass, 350 ms reverb and 2.5% wet level give a present, fairly dry
tamborim/snare-like sound. The channel calibration is 1.5 (about +3.5 dB), retaining the
shared master/limiter and the combined mix headroom. Presence comes from both
midrange harmonics and the filtered strike rather than only sub-bass volume.
These are synthesized percussion strokes, not recorded rainfall, literal
raindrops or inferred weather events. The amount-to-rate curve is unchanged
from the earlier glass-like and soft-drum versions.
Humidity uses a three-oscillator C3 sawtooth ensemble with fixed 8-cent spread,
quiet filtered pink noise, a 220 ms onset and 14% reverb. The existing mapped
bandwidth b also opens the string lowpass with cutoff
`180 * 20 ** ((b - 160) / 1440)` Hz (180..3600 Hz). This is a fixed expressive
transfer shared by frame playback and reference examples, independent of observed
track or region ranges. More harmonics become audible as humidity rises; the
pitch and detuning do not change. Gain compensation
`0.55 / (1 + 0.8 * ((b - 160) / 1440))` moderates the added spectral energy.
This replaces the earlier near-sine pad whose constant fundamental masked the
noise bandwidth difference. The sound is synthesized and string-like, not a
recording of a real bowed instrument.
PM2.5 uses one persistent `FMSynth` through a low-pass filter and light reverb.
During playback, the first valid frame starts a sustained metallic voice; later
frames use portamento to move its pitch and ramp the filter without retriggering
the envelope. Pause, missing data, mute and experience changes release it. The
player remains the only clock. Manual frame selection and the sound legend use
bounded notes. Its synth level is -3 dB and its channel calibration is 2.5,
about 8 dB above the previous setting; the shared limiter still caps the mixed
output at -6 dBFS. The timbre suggests a fine metallic shimmer, not literal
particles, wind, ocean or health risk.
CO uses a bright trumpet-like pulse through a low-pass filter with a quick,
soft attack and mild portamento. The supplied norm selects its C2–C6
note on the fixed C-major curve above. The legend compares 100 ppbv (E3)
with 107 ppbv (F3). It is a synthesized timbre, not a trumpet sample. Ozone uses
one soft harp-like `PluckSynth` voice, with a gentle attack, resonant decay and
light reverb. Its supplied norm selects a note on the fixed C3–C7 C-major curve, with
more sensitivity in the central concentration band. These
are distinct sound identities; neither instrument owns a clock or adds notes.
Ozone's initial channel calibration is 2.8 (up from 0.75) to keep its pluck
present in the mix; the shared limiter remains active.
All seven instruments use smooth ramps/envelopes and are allocated once per audio
initialization, behind a silent gate until explicitly played.

The visual player owns time. No instrument has a JavaScript frame timer.
Legend timers compare explicitly labeled reference values only: temperature
norm 0/1, wind visual indices 0.01/0.10 (legacy speed data: 5/25 m/s),
precipitation 0.5/10 mm, humidity 0/22 g/kg, or PM2.5 log positions 0/1
(0.4/409.6 µg/m³). Manual previews and the last frame have bounded envelopes;
pause, missing data, mute and switching experiences stop the old sound.

## Mixer and future combination

`audio.js` owns one context, calibrated independent layer gains, a speech-ducking
gain, master volume and a shared -6 dB limiter. Initial master volume is -30 dB;
calibration balances the seven sound identities independently of their data values.
`setInstrumentGain`, `setInstrumentMuted` and `updateInstrument` control the seven
real instruments independently. Current `playFrame` deliberately selects only one.
Own browser speech ducks instrument gain to 35%; it does not route through Tone
or guarantee a bound on device/speech loudness.

Each instrument implements `update / stop / dispose` and can be selected for
individual playback or the optional time-aligned Combined Earth experiment.
That experiment keeps each layer's channel controls and distinct information
mapping rather than merging their data into one value.

Before combination, the data producer must provide explicit UTC/offset-bearing
scientific timestamps, provenance, sampling/averaging semantics and missing-value
rules for every series. Join compatible times, never equal image indices. Current
dataset dates have no offsets. The newly integrated temperature, wind, rainfall
and humidity values are image-derived and no longer mock; matching timestamp
strings are not by themselves proof of scientific temporal equivalence. Model-field comparison and area weighting remain data-team work.

## Seven-layer listening experiment

The optional Combined Earth panel enables the four climate instruments, PM2.5,
CO and ozone after explicit user selection. `combinedFrames` joins by the exact
supplied timestamp label, not array index. These seven sound datasets share 124 labels, from
2026-10-30T06:00 through 2026-11-14T14:00. These labels omit timezone offsets;
this is an experimental label-aligned mix, not a confirmation of physical UTC
alignment, accumulation intervals or common scientific provenance.

The visual player remains the only frame clock. The selected visual experience
provides the reference timestamp and image; each layer resolves its own frame
for that timestamp and its own Python region row if a region is selected.
There is no interpolation, timestamp invention, resampling or index pairing.
Missing timestamps/region rows silence only the affected layer. Duplicate or
invalid timestamps reject that dataset. The individual legend still pauses the
player and demonstrates only the selected visual instrument.

The panel provides per-instrument mute and gain (initially 65%). Combined mode
adds a 0.5 shared mix gain before speech ducking, master gain and the existing
single limiter; individual mode restores mix and instrument gains to 1 and
clears instrument mutes. Controls update existing instruments; there are no new
voices per frame or independent advancing transports. Disabling sound, pausing
and page suspension release every layer. This explicit seven-layer experiment
extends the earlier planned three-layer first combination.


## Fixed scales and separate diagnostics

For a fixed shared scale, normalizing a mean only changes coordinates; it does
not repair an ordering inversion in the underlying mean. Wind and PM2.5 therefore
use explicitly supplied visual indices, while precipitation/humidity use means
and temperature/CO/ozone use supplied normalized means. PM2.5 aggregates logarithmic
pixel positions before the regional average, instead of taking the logarithm
of the concentration mean. No region or period receives its own min/max stretch.
Mean, p90, norm and pixel inclusion retain their diagnostic definitions separately.
