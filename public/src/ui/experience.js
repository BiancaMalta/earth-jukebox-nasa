// AI-assisted: OpenAI Codex
import { soundKind } from "../engine/mapping.js";

export function describeExperience(track) {
  const kind = soundKind(track);
  if (track && kind === null) {
    const name = typeof track.title === "string" ? track.title : track.title?.en ?? track.id ?? "Dataset";
    return {
      kind: null, name, instrument: "Visual-only experience",
      character: "Data and frames available · sound mapping not implemented",
      heading: "Explore the dataset visually",
      mapping: "This dataset is available for visual playback. A dedicated sound identity has not been assigned yet; it does not use the temperature instrument.",
      low: "Lower value", lowDetail: "See the dataset readings", high: "Higher value", highDetail: "See the dataset readings",
      scale: "The normalized value is shown as supplied. No note or pulse rate is inferred for this experience.",
      readings: "Read the selected dataset's measure, unit and timestamp below the image. Values are derived from visualization pixels and are not automatically whole-Earth averages. Coverage describes confidently matched image pixels.",
      normalization: "The normalized value and its limits come from the dataset. No sonification has been implemented for this quantity yet.",
      caveat: "Image-derived values. Use the stated dataset measure and pixel coverage; no whole-Earth average or new sound mapping is assumed.",
      legend: "A sound legend is not available for this experience yet.",
      exampleSpeech: "This experience is visual only. Its dedicated sound mapping is not implemented yet.",
    };
  }
  if (kind === "precipitation") return {
    kind, name: "Precipitation", instrument: "Dry tamborim-style percussion",
    character: "Fixed G3 · bright drum skin · dry snare-like attack",
    heading: "Precipitation becomes drum rhythm",
    mapping: "More supplied precipitation in millimeters produces more crisp drum strokes per second. The carrier stays at G3; pulse density, not pitch or loudness, carries the amount.",
    low: "Slower strokes", lowDetail: "0.5 mm example", high: "Faster strokes", highDetail: "10 mm example",
    scale: "Zero amount is silent. Positive amounts map to 0.5–5 coded drum strokes per second. These are musical symbols, not recorded raindrops or measured rainfall intensity.",
    readings: "The supplied amount is in millimeters, not millimeters per hour. Its accumulation interval is not stated in this JSON. The visualization includes total precipitation, including rain and snow. The mean uses confidently color-matched pixels only, not the whole Earth.",
    normalization: "Sound uses mean amount a in mm directly: zero is silent; positive amounts use 0.5 + 4.5 × (1 − exp(−a / 5)) strokes/s. The normalized value remains as supplied. Missing amount or zero pixel coverage produces silence.",
    caveat: "Image-derived precipitation estimate. Colored precipitation overlays clouds and the basemap; only confidently matched pixels contribute. Coverage is the analyzed image-pixel share, not the land area receiving rain. No whole-Earth average or mm/hour conversion is assumed.",
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
    readings: "Specific humidity is supplied in grams of water vapor per kilogram of air, not relative humidity in percent. Values are estimated from confidently color-matched pixels. Image-pixel coverage is not the proportion of Earth's area with high humidity.",
    normalization: "For supplied mean specific humidity q in g/kg, nominal bandwidth = 160 + 1440 × (1 − exp(−q / 12)) Hz. The pad also opens a low-pass filter with cutoff 180 × 20^((bandwidth − 160) / 1440) Hz to reveal string harmonics, with gain compensation. This fixed expressive transfer is shared by frames and the legend. The provided norm is not recalculated. Missing values or zero pixel coverage produce silence.",
    caveat: "Image-derived specific-humidity estimate in g/kg. This is not a direct GEOS-FP numerical field or a relative-humidity percentage. High specific humidity does not by itself imply precipitation.",
    legend: "A five-second comparison of 0 g/kg and 22 g/kg reference values at the visualization scale endpoints, not the current frame. Higher specific humidity means richer string harmonics. The legend pauses playback.",
    exampleSpeech: "Lower specific humidity means dark, thin strings. Higher specific humidity means brighter, richer strings, not rainfall.",
  };
  const wind = kind === "wind";
  return wind ? {
    kind: "wind", name: "Wind", instrument: "Airy pulsed flute",
    character: "Fixed C5 · soft breath · rounded musical pulses",
    heading: "Wind speed becomes rhythm",
    mapping: "Higher supplied mean wind speed makes an airy flute-like tone pulse faster. Pitch stays at C5; pulse rate, not melody or loudness, carries wind speed.",
    low: "Slower pulse", lowDetail: "5 m/s example", high: "Faster pulse", highDetail: "25 m/s example",
    scale: "Speed maps monotonically to 0.3–4 musical pulses per second (Hz). A fixed C5 carrier adds tone; it does not encode wind speed. These pulses are a sound code, not measured gusts.",
    readings: "This is an image-derived estimate of near-surface wind speed at about 10 meters. The mean uses only confidently color-matched pixels, not the whole Earth. Coverage is a fraction of analyzed image pixels, not a fraction of Earth's surface area. No wind direction is encoded.",
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
    readings: "The supplied mean temperature sets one note for the dataset time, not a temperature at one location. These weather values are not historical climate anomalies; a higher note is not a danger rating.",
    normalization: "The supplied normalized value ranges from 0 to 1. Zero maps to C3; one maps to C5. Intermediate values select the nearest step in the 11-note scale. The front end does not recalculate this value. It is not a percentage of the Earth.",
    caveat: "Image-derived temperature estimate decoded from visualization pixels. This is not a direct numerical GEOS-FP field or an area-weighted global average. Small variations can remain on the same pentatonic note.", legend: "A five-second low-to-high pitch comparison using reference values 0 and 1, not the current frame. The legend pauses the player.",
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
