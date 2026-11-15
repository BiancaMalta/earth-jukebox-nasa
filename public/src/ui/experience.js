// AI-assisted: OpenAI Codex
import { soundKind } from "../engine/mapping.js";

export function describeExperience(track) {
  const kind = soundKind(track);
  if (kind === "carbonMonoxide") return {
    kind, name: "Carbon monoxide (CO)", instrument: "Bright trumpet-like lead",
    character: "Synthesized pulse · filtered single voice · lower register",
    heading: "Carbon monoxide becomes a trumpet-like melody",
    mapping: "The supplied normalized concentration selects one note from a fixed C major pentatonic scale. Lower values sound lower; higher values sound higher. This synthetic trumpet-like tone is a data cue, not a risk alarm.",
    low: "Lower concentration", lowDetail: "Lower pitch · C3 · 40 ppbv reference",
    high: "Higher concentration", highDetail: "Higher pitch · C5 · 500 ppbv reference",
    scale: "Each frame uses the supplied 0–1 position on the fixed 40–500 ppbv legend. The selected note is not stretched to the values observed in the current frames or region.",
    readings: "Carbon monoxide is an image-derived near-surface concentration estimate in ppbv, decoded from NASA SVS 5153 colors. It is not the raw numerical GEOS-CF grid. Global means change little in this interval; country and continent estimates vary more. Regional means currently use equal weights per accepted image pixel.",
    normalization: "The supplied norm selects one of 11 C major pentatonic notes from C3 to C5. The front end does not recompute norm. Missing norm or zero pixel coverage means silence.",
    caveat: "CO values are image-derived estimates, not a direct numerical GEOS-CF field. Coverage is the share of analyzed image pixels used, not accuracy or geographic area. The synthetic voice does not assess health risk.",
    legend: "A five-second comparison of 40 and 500 ppbv legend endpoints, not the current measurements. Higher supplied concentration maps to higher pitch. The legend pauses the player.",
    exampleSpeech: "Lower carbon monoxide concentration means a lower trumpet-like note. Higher concentration means a higher note. This sound is not a health-risk rating.",
  };
  if (kind === "ozone") return {
    kind, name: "Ozone (O₃)", instrument: "Soft harp-like pluck",
    character: "Gentle Karplus–Strong string · short pentatonic note per frame",
    heading: "Ozone becomes a soft harp-like melody",
    mapping: "The supplied normalized concentration selects one note from a fixed C major pentatonic scale. Ozone uses a higher register than the other melodic voices; higher values sound higher.",
    low: "Lower concentration", lowDetail: "Lower plucked note · C4 · 5 ppbv reference",
    high: "Higher concentration", highDetail: "Higher plucked note · C6 · 60 ppbv reference",
    scale: "Each frame uses the supplied 0–1 position on the fixed 5–60 ppbv legend. The selected note is not stretched to the values observed in the current frames or region.",
    readings: "Ozone is an image-derived near-surface concentration estimate in ppbv, decoded from NASA SVS 5152 colors. It is not the raw numerical GEOS-CF grid. The global mean changes little in this interval; regional estimates vary more. Regional means currently use equal weights per accepted image pixel.",
    normalization: "The supplied norm selects one of 11 C major pentatonic notes from C4 to C6. The front end does not recompute norm. Missing norm or zero pixel coverage means silence.",
    caveat: "Ozone values are image-derived estimates, not a direct numerical GEOS-CF field. About 43–46% of analyzed pixels are used in the current frames; this is image-pixel coverage, not accuracy or geographic area. The sound is not a health-risk rating.",
    legend: "A five-second comparison of 5 and 60 ppbv legend endpoints, not the current measurements. Higher supplied concentration maps to higher pitch. The legend pauses the player.",
    exampleSpeech: "Lower ozone concentration means a lower plucked note. Higher concentration means a higher note. This sound is not a health-risk rating.",
  };
  if (track && kind === null) {
    const name = typeof track.title === "string" ? track.title : track.title?.en ?? track.id ?? "Dataset";
    return {
      kind: null, name, instrument: "Visual-only experience",
      character: "Data and frames available · sound mapping not implemented",
      heading: "Explore the dataset visually",
      mapping: "This dataset is available for visual playback. A dedicated sound identity has not been assigned yet; it does not use the temperature instrument.",
      low: "Lower value", lowDetail: "See the dataset readings", high: "Higher value", highDetail: "See the dataset readings",
      scale: "The normalized value is shown as supplied. No note or pulse rate is inferred for this experience.",
      readings: "Read the selected dataset's measure, unit and timestamp below the image. Values are derived from visualization pixels and are not automatically whole-Earth averages. Coverage describes color-filtered image pixels.",
      normalization: "The normalized value and its limits come from the dataset. No sonification has been implemented for this quantity yet.",
      caveat: "Image-derived values. Use the stated dataset measure and pixel coverage; no whole-Earth average or new sound mapping is assumed.",
      legend: "A sound legend is not available for this experience yet.",
      exampleSpeech: "This experience is visual only. Its dedicated sound mapping is not implemented yet.",
    };
  }
  if (kind === "pm25") return {
    kind, name: "PM2.5", instrument: "Soft metallic dust shimmer",
    character: "Sustained metallic FM tone · gentle pitch glide · variable spectral brightness",
    heading: "PM2.5 shapes a metallic shimmer",
    mapping: "The supplied log-scaled position moves a soft metallic tone higher and brighter as PM2.5 concentration rises. The note glides with the player instead of striking on every frame. Loudness stays fixed. This is a sound code, not a health assessment or a literal sound of particles.",
    low: "Lower, darker metallic tone", lowDetail: "C4 · 0.4 µg/m³ reference",
    high: "Higher, brighter metallic tone", highDetail: "C6 · 409.6 µg/m³ reference",
    scale: "The supplied 0–1 log-scale position controls a fixed, monotonic pitch-and-brightness curve. During playback one sustained voice glides between frames; it adds no beat and does not retrigger on each frame.",
    readings: "PM2.5 is an image-derived near-surface concentration estimate in µg/m³. The sound uses the supplied logarithmic legend position. Its metallic shimmer is a metaphor, not a measurement of particle size, wind or health risk.",
    normalization: "The provided norm follows the logarithmic 0.4–409.6 µg/m³ legend. A fixed curve, brightness = norm + 0.3 × sin(π × norm), sets a low-pass cutoff from 1400 to 6200 Hz and a continuous tone from C4 to C6. The curve is shared by the global image and every region; the front end does not recompute norm. Loudness stays fixed. Missing values or zero pixel coverage release the voice.",
    caveat: "Image-derived PM2.5 estimate, not a direct numerical GEOS-CF grid or health assessment. A higher, brighter tone means a higher supplied concentration position, not a danger rating.",
    legend: "A five-second comparison of 0.4 and 409.6 µg/m³ reference values, not the current frame. Higher log-scaled PM2.5 position means a higher, brighter metallic tone at the same loudness. The legend pauses the player.",
    exampleSpeech: "Lower PM2.5 legend position means a lower, darker metallic tone. Higher position means a higher, brighter tone at the same loudness. This is not a health-risk rating.",
  };
  if (kind === "precipitation") return {
    kind, name: "Precipitation", instrument: "Dry tamborim-style percussion",
    character: "Fixed G3 · bright drum skin · dry snare-like attack",
    heading: "Precipitation becomes drum rhythm",
    mapping: "More supplied precipitation in millimeters produces more crisp drum strokes per second. The carrier stays at G3; pulse density, not pitch or loudness, carries the amount.",
    low: "Slower strokes", lowDetail: "0.5 mm example", high: "Faster strokes", highDetail: "10 mm example",
    scale: "Zero amount is silent. Positive amounts map to 0.5–5 coded drum strokes per second. These are musical symbols, not recorded raindrops or measured rainfall intensity.",
    readings: "The supplied amount is in millimeters, not millimeters per hour. Its accumulation interval is not stated in this JSON. The visualization includes total precipitation, including rain and snow. The mean uses color-filtered pixels only, not the whole Earth.",
    normalization: "Sound uses mean amount a in mm directly: zero is silent; positive amounts use 0.5 + 4.5 × (1 − exp(−a / 5)) strokes/s. The normalized value remains as supplied. Missing amount or zero pixel coverage produces silence.",
    caveat: "Image-derived precipitation estimate. Colored precipitation overlays clouds and the basemap; only color-filtered pixels contribute. Coverage is the analyzed image-pixel share, not the land area receiving rain. No whole-Earth average or mm/hour conversion is assumed.",
    legend: "A five-second comparison of 0.5 mm and 10 mm reference amounts, not the current frame. Higher amount means faster drum strokes. The legend pauses playback.",
    exampleSpeech: "Lower precipitation amount means slower drum strokes. Higher amount means faster drum strokes. These are millimeters, not millimeters per hour.",
  };
  if (kind === "humidity") return {
    kind, name: "Humidity", instrument: "Bowed string pad",
    character: "Fixed C3 ensemble · sustained strings · variable harmonics",
    heading: "Specific humidity becomes sound body",
    mapping: "Higher supplied specific humidity opens the harmonics of a sustained string-like pad, from dark and thin to bright and rich. Its C3 pitch and gentle detuning stay fixed.",
    low: "Dark, thin strings", lowDetail: "0 g/kg reference", high: "Bright, rich strings", highDetail: "22 g/kg reference",
    scale: "Specific humidity controls nominal filter bandwidth from 160 to 1600 Hz. This is a sound parameter, not a second humidity unit or a pitch mapping.",
    readings: "Specific humidity is supplied in grams of water vapor per kilogram of air, not relative humidity in percent. Values are estimated from color-filtered pixels. Image-pixel coverage is not the proportion of Earth's area with high humidity.",
    normalization: "For supplied mean specific humidity q in g/kg, nominal bandwidth = 160 + 1440 × (1 − exp(−q / 12)) Hz. The pad also opens a low-pass filter with cutoff 180 × 20^((bandwidth − 160) / 1440) Hz to reveal string harmonics, with gain compensation. This fixed expressive transfer is shared by frames and the legend. The provided norm is not recalculated. Missing values or zero pixel coverage produce silence.",
    caveat: "Image-derived specific-humidity estimate in g/kg. This is not a direct GEOS-FP numerical field or a relative-humidity percentage. High specific humidity does not by itself imply precipitation.",
    legend: "A five-second comparison of 0 g/kg and 22 g/kg reference values at the visualization scale endpoints, not the current frame. Higher specific humidity means richer string harmonics. The legend pauses playback.",
    exampleSpeech: "Lower specific humidity means dark, thin strings. Higher specific humidity means brighter, richer strings, not rainfall.",
  };
  if (kind === "wind" && track?.sonification?.input === "visualSignal") return {
    kind, name: "Wind", instrument: "Airy pulsed flute",
    character: "Fixed C5 · intensity and extent of visible wind colors",
    heading: "Visible wind patterns become rhythm",
    mapping: "Stronger and more extensive detected wind colors produce faster pulses. The visual signal index is a qualitative image measure, not average wind speed in m/s.",
    low: "Less visible signal", lowDetail: "Index 0.01 reference", high: "More visible signal", highDetail: "Index 0.10 reference",
    scale: "The same fixed visual index and 0.3–4 Hz transfer apply to every country, group and frame. Values are not stretched separately per region.",
    readings: "The visual index combines the intensity of accepted colors with their latitude-weighted extent. The conditional mean in m/s is shown only as a diagnostic. Transparent areas are unknown wind, not measured calm. No accepted pixels means unavailable, not zero wind.",
    normalization: "Python computes visualSignal = sum(area weight × accepted pixel's position on the wind legend) / sum(analyzed area weights). Mean and norm retain their original meanings separately. Pulse rate = 0.3 + 3.7 × (1 − exp(−visualSignal / 0.04)) Hz.",
    caveat: "Qualitative image-derived wind signal. Transparency and the basemap still hide some winds. A three-instant comparison improved country ordering versus the old conditional mean; it does not validate every country or time. Silence for missing values does not mean no wind.",
    legend: "A five-second comparison of visual indices 0.01 and 0.10, not current measurements or m/s. The legend pauses playback.",
    exampleSpeech: "More intense and extensive visible wind colors mean faster pulses. This index is not physical wind speed. Missing colors do not prove calm wind.",
  };
  const wind = kind === "wind";
  return wind ? {
    kind: "wind", name: "Wind", instrument: "Airy pulsed flute",
    character: "Fixed C5 · soft breath · rounded musical pulses",
    heading: "Wind speed becomes rhythm",
    mapping: "Higher supplied mean wind speed makes an airy flute-like tone pulse faster. Pitch stays at C5; pulse rate, not melody or loudness, carries wind speed.",
    low: "Slower pulse", lowDetail: "5 m/s example", high: "Faster pulse", highDetail: "25 m/s example",
    scale: "Speed maps monotonically to 0.3–4 musical pulses per second (Hz). A fixed C5 carrier adds tone; it does not encode wind speed. These pulses are a sound code, not measured gusts.",
    readings: "This is an image-derived estimate of near-surface wind speed at about 10 meters. The mean uses only color-filtered pixels, not the whole Earth. Coverage is a fraction of analyzed image pixels, not a fraction of Earth's surface area. No wind direction is encoded.",
    normalization: "The supplied normalized value is shown for reference. The sound uses mean speed in m/s directly: rate = 0.3 + 3.7 × (1 − exp(−speed / 12)) Hz. Missing speed or zero valid-pixel coverage produces silence. Small speed changes can sound very similar.",
    caveat: "Image-derived wind estimate. Transparent low speeds and overlap with the basemap exclude many pixels. This is not a full global mean or a direct numerical GEOS-FP field. Comparison with GEOS-FP remains pending.",
    legend: "A five-second comparison of 5 m/s and 25 m/s examples, not the current frame. Higher speed means faster musical pulses. The legend pauses the player.",
    exampleSpeech: "Lower wind speed means slower musical pulses. Higher wind speed means faster musical pulses.",
  } : {
    kind: "temperature", name: "Temperature", instrument: "Soft dark organ",
    character: "Rounded harmonics · one voice · optional light ambience",
    heading: "Temperature becomes pitch",
    mapping: "Lower normalized temperatures become lower notes. Higher values become higher notes. The melody follows the supplied values without adding dramatic events.",
    low: "Lower value", lowDetail: "Lower pitch · C3", high: "Higher value", highDetail: "Higher pitch · C5",
    scale: "The 11 notes follow a C major pentatonic scale across two octaves. Different values can share a note; no artificial melody is added. One temperature voice plays at a time.",
    readings: "The image-pixel mean temperature sets one note for the selected frame and region. The current mean method is explained below; area weighting still applies only to decoded pixels used. These weather values are not historical climate anomalies; a higher note is not a danger rating.",
    normalization: "The supplied normalized value ranges from 0 to 1. Zero maps to C3; one maps to C5. Intermediate values select the nearest step in the 11-note scale. The front end does not recalculate this value. It is not a percentage of the Earth.",
    caveat: "Image-derived temperature estimate decoded from visualization pixels. This is not a direct numerical GEOS-FP field or a complete global field. Small variations can remain on the same pentatonic note.", legend: "A five-second low-to-high pitch comparison using reference values 0 and 1, not the current frame. The legend pauses the player.",
    exampleSpeech: "Lower temperature values mean lower pitch. Higher temperature values mean higher pitch.",
  };
}

export function renderExperience(track) {
  const experience = describeExperience(track);
  const set = (id, text) => { document.getElementById(id).textContent = text; };
  set("guide-heading", experience.heading);
  set("mapping-help", experience.mapping);
  set("instrument-name", experience.instrument);
  set("instrument-character", experience.character);
  set("guide-low", experience.low); set("guide-low-detail", experience.lowDetail);
  set("guide-high", experience.high); set("guide-high-detail", experience.highDetail);
  set("scale-description", experience.scale);
  set("readings-help", experience.readings);
  set("sound-mapping-detail", experience.normalization);
  set("legend-help", `${experience.legend} Disable sound or navigate to stop it.`);
  const ambience = document.getElementById("temperature-ambience");
  ambience.disabled = experience.kind !== "temperature";
  return experience;
}
