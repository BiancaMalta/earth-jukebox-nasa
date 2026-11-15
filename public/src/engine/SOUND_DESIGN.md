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
  a piecewise-linear curve through [mm, strokes/s] anchors
  [0, .5], [.25, .8], [.5, 1.5], [.75, 3], [1, 4], [2, 4.7],
  followed by 4.7 + .3 * (1 - exp(-(a - 2) / 5)), bounded by 5.
  The drum pitch redundantly follows round(clamp((rate - .5) / 4.5) * 10)
  in the shared C3–C5 pentatonic scale. Missing,
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
  controls cutoff `1400 + 4800 * brightness` Hz and continuous C4–C6 pitch
  `261.625565 * 4 ** brightness` Hz. Both strictly increase with the index.
  One metallic FM voice glides between frames at fixed loudness. Mean/p90/norm
  remain separate diagnostics; the concentration mean now uses cosine-latitude
  weights. Missing index or zero pixel coverage means silence, without fallback
  to concentration. The legacy norm path exists only for undeclared old sources.
  The [qualitative study](../../../docs/estudo-cientifico/pm25-qualitativo.md)
  checks regional ordering, three-hour directions and nominal pitch separation.
  It does not establish exact concentrations or individual auditory perception.
- Carbon monoxide (SVS 5153, ppbv): use the supplied linear-legend `norm` to
  select one of 11 C major pentatonic notes from C3 to C5. A filtered,
  brass-like single voice follows the frame; rising concentration means higher
  pitch, not a health-risk rating. The image-derived global mean changes very
  little in this interval, while the regional estimates vary more. Regional
  tables currently use equal weights per accepted pixel.
- Ozone (SVS 5152, ppbv): use the supplied linear-legend `norm` to select the
  same pentatonic steps one octave higher, C4 to C6. One short plucked-string
  note follows each frame; rising concentration means higher pitch, not a
  health-risk rating. Around 43–46% of analyzed pixels are used in these frames;
  that is image-pixel coverage, not accuracy or geographic area. Regional tables
  currently use equal weights per accepted pixel.
- The four climate datasets are image-derived (`mock: false`), not raw
  numerical GEOS-FP grids. `mean` and `norm` are consumed exactly as supplied.
  Small normalized changes may stay on one pentatonic step;
  that is preserved rather than artificially stretching the melody.

## Expressive layer

Temperature retains one additive, rounded organ voice; a 100 ms attack, smooth
release, short pitch transition and optional 16% reverb change presentation only.
Wind uses one fixed C5 flute-like oscillator with quiet, filtered pink-noise
breath. A 0..1 sine LFO raised to the third power shapes rounded musical pulses
with quiet gaps; only its frequency follows the explicitly declared wind input mapping. C5 is
an expressive reference, not a second wind-speed mapping or a competing melody.
A 2600 Hz lowpass and 12% reverb soften the presentation. No geographic stereo
direction is implied. The LFO never advances dataset frames.
Precipitation uses discrete tuned membrane strikes scheduled by a Tone.Clock at
the shared amount-to-rate mapping (0.5–5 strokes/s for positive amounts). Pitch
also follows the same amount, making short comparisons easier to distinguish.
Neither pitch nor rhythm is normalized independently for a region or country. The body
has a fixed 0.7-octave pitch drop over 18 ms, a 3 ms attack and 90 ms decay.
A separate bandpassed white-noise stick attack lasts about 20 ms at low fixed
velocity. Body velocity .55 and stick velocity .09 remain constant. Zero and
missing values stop the clock and release both voices. Finite legend examples
schedule a clock stop; subsequent examples and playback reset that stop.
The precipitation channel gain is 4.75, lowered from 5.25 by about 0.87 dB to reduce listening fatigue.
All nodes are reused and disposed with the shared audio engine. These settings
replace the continuous noise and LFO gate that could sound like sweeping.

The optional Time pulse replaces recurring spoken dates. An A6 click at fixed velocity .64 (four times the previous .16, about +12 dB)
marks the first observed frame of a new calendar day or Monday-based week.
It uses supplied date labels, preserving their calendar without adding a timezone.
It follows frame playback, including playback speed; manual navigation and initial
loading establish a baseline silently. Skipped days produce one marker, not a
burst of reconstructed events. The default is off. It shares master volume,
mute, limiter and speech ducking, with a separate bus from the combined mix.
It never encodes precipitation amount. Exact dates remain in the UI/table.

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
bounded notes. Its synth level is -3 dB and its channel calibration is 3.5,
about 8 dB above the previous setting; the shared limiter still caps the mixed
output at -6 dBFS. The timbre suggests a fine metallic shimmer, not literal
particles, wind, ocean or health risk.
CO uses a bright trumpet-like pulse through a low-pass filter with a quick,
soft attack and mild portamento. The supplied norm still selects its C3–C5
pentatonic note. It is a synthesized timbre, not a trumpet sample. Ozone uses
one soft harp-like `PluckSynth` voice, with a gentle attack, resonant decay and
light reverb. Its supplied norm still selects its C4–C6 pentatonic note. These
are distinct sound identities; neither instrument owns a clock or adds notes.
Ozone's channel calibration is 2.3, reduced from 2.8 for a softer mix;
the shared limiter remains active.
All seven instruments use smooth ramps/envelopes and are allocated once per audio
initialization, behind a silent gate until explicitly played.

The visual player owns time. No instrument has a JavaScript frame timer.
Legend timers compare explicitly labeled reference values only: temperature
norm 0/1, wind visual indices 0.01/0.10 (legacy speed data: 5/25 m/s),
precipitation 0.5/1 mm, humidity 0/22 g/kg, or PM2.5 log positions 0/1
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

## Suggested places

The place selector appears immediately after record selection, before the map
and transport. Suggestions rank the active record's regional sonification over
its supplied frames, using the same mapping functions as playback. A candidate
needs at least 80% available frames and two audible parameter changes. The
score combines the 10th–90th percentile span and average adjacent movement of
mapped pitch, rhythm or bandwidth. Missing frames break adjacency. Scores do
not alter data filters, mappings or playback ranges and do not claim accuracy.
Whole-map mode offers countries and regions; Region offers regions; Country
offers countries, restricted to the selected region when present. This ranking
is for the active record, including when a combined preview is visible, rather
than a claim about the complete mix. No static preferred-country list is used.

## Ozone volume

Ozone retains its original per-frame plucked voice and pitch mapping, without
threshold gating or concentration-dependent volume. The channel calibration is
2.3, reduced from 2.8 by about 1.7 dB. Missing data remains silent. The threshold
and volume-dynamics experiments were discarded after listening feedback.

PM2.5 channel calibration is 3.5, raised from 2.5 by about 2.9 dB to balance
it against the other instruments. Its data-to-pitch and brightness mappings stay intact.

Sound-example labels are spoken only when spoken navigation is enabled. Without
it, the low/high examples play directly with visible text labels. With it, each
spoken label finishes before the instrument starts; instruments stop before the
next label. Page narration remains suspended throughout the sequence. Legend
status text is not an automatic live announcement over the demonstration.
