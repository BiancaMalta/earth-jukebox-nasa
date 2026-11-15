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
- PM2.5 (SVS 5151, µg/m³): use the supplied `norm` on the logarithmic
  0.4–409.6 µg/m³ legend. It controls two slow pink-noise swells and filter
  openness; the transfer is fixed and loudness does not change. The sound is a
  synthetic wave-and-air metaphor, not measured wind, ocean waves, particle
  motion or health risk. Missing values or zero pixel coverage mean silence.
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
PM2.5 uses two persistent filtered pink-noise streams: a low-pass rolling swell
and a band-pass airy current. Cubed, slow sine gates keep both layers rounded;
the supplied log-scale position changes their rates (0.07–0.18 and 0.22–0.42 Hz)
and filter openness, not amplitude. Fixed layer gains (0.50/0.30) and channel
calibration 2.0 make the noise texture audible beside tonal instruments without
letting concentration change loudness. A gentle 8% reverb joins the layers.
This is a soft, wave-like synthetic texture, distinct from the wind flute, and
does not claim to encode actual wind or ocean conditions.
All five instruments use smooth ramps/envelopes and are allocated once per audio
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
calibration balances the five sound identities independently of their data values.
`setInstrumentGain`, `setInstrumentMuted` and `updateInstrument` control the five
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

## Five-layer listening experiment

The optional Combined Earth panel enables the four climate instruments and the
PM2.5 texture after explicit user selection. `combinedFrames` joins by the exact
supplied timestamp label, not array index. These five sound datasets share 124 labels, from
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
and page suspension release every layer. This explicit five-layer experiment
extends the earlier planned three-layer first combination.


## Why scalar mappings retain physical means

For a fixed shared scale, norm = (mean - vmin) / (vmax - vmin) simply changes
coordinates. Substituting normalized input and transforming the mapping's
constants accordingly produces the same sound, apart from supplied rounding.
It does not amplify country/continent differences by itself. Wind, precipitation
and humidity therefore continue to use supplied mean values; temperature and
PM2.5 use their supplied normalized positions. Their fields remain visible and
unmodified. Greater perceptual contrast requires an explicit
change to the transfer curve, not silent per-region rescaling. No such curve
change accompanies this percussion timbre update.


Humidity channel calibration is now 2 (+6 dB), with string base gain .55 instead
of .38, to keep it audible alongside the other layers. Its spectral mapping,
fixed pitch and gain compensation remain unchanged. Percussion now emphasizes
a G3 skin and filtered white-noise crack with short, dry windows, rather than
the earlier low tom. These are synthesized approximations, not drum samples.


## Area-weighted data update

Mean values now use cosine-latitude weights over accepted image pixels; norm is
recomputed by Python from that mean with unchanged legend limits. The same
instrument mapping therefore follows the revised statistic without an extra
front-end normalization. P90 remains a pixel percentile, and pixel inclusion
remains a count ratio. General/regional method metadata must agree; Combined
Earth refuses to mix legacy equal-pixel and new area-weighted datasets. Whole-
country groups, including the entire Russia in Europe, are labeled explicitly.
This does not fix wind transparency bias or precipitation interval ambiguity.


The exploratory rank/direction study and graphs are archived in
[ESTUDO_CIENTIFICO.md](../../../docs/ESTUDO_CIENTIFICO.md). Three sampled instants
improved country-order Spearman correlation from 0.30–0.40 to 0.79–0.90; direction
agreed in 105/117 pairs with reference changes above 0.5 m/s, versus 77/117 for
the old conditional mean. Those samples informed adoption and are not an
independent test set or a universal quality guarantee. The app labels the index
accordingly. No numeric GEOS fields are injected into the playback datasets.
