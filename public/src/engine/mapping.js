// AI-assisted: OpenAI Codex
export const PENTATONIC_NOTES = Object.freeze(["C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4", "G4", "A4", "C5"]);
export const CO_NOTES = PENTATONIC_NOTES;
export const OZONE_NOTES = Object.freeze(["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5", "G5", "A5", "C6"]);

// Eleven pitches: round(norm * 10) selects the nearest scale step.
// Reject invalid input rather than silently turning missing values into cold notes.
export function mapValue(norm) {
  if (typeof norm !== "number" || !Number.isFinite(norm) || norm < 0 || norm > 1) return null;
  return PENTATONIC_NOTES[Math.round(norm * (PENTATONIC_NOTES.length - 1))];
}

function mapNotePosition(position, notes) {
  if (typeof position !== "number" || !Number.isFinite(position) || position < 0 || position > 1) return null;
  return notes[Math.round(position * (notes.length - 1))];
}

// CO uses the supplied concentration position and a lower brass-like register.
export function mapCarbonMonoxide(position) {
  return mapNotePosition(position, CO_NOTES);
}

// Ozone uses the same fixed pentatonic intervals one octave higher.
export function mapOzone(position) {
  return mapNotePosition(position, OZONE_NOTES);
}

// Fixed visual-signal transfer: both intensity and detected color extent count.
// Not a wind-speed conversion; unknown/transparent areas are not measured zero.
export function mapWindActivity(activity) {
  if (typeof activity !== "number" || !Number.isFinite(activity) || activity < 0 || activity > 1) return null;
  return 0.3 + 3.7 * (1 - Math.exp(-activity / 0.04));
}

// Fixed physical mapping, independent of the dataset's observed min/max:
// rate = 0.3 + 3.7 * (1 - exp(-speed_m_s / 12)).
// Monotonic, deterministic and bounded in [0.3, 4] Hz; no invented gusts,
// direction, or loudness curve. A small change in speed stays a small change.
export function mapWindSpeed(speed) {
  if (typeof speed !== "number" || !Number.isFinite(speed) || speed < 0) return null;
  return 0.3 + 3.7 * (1 - Math.exp(-speed / 12));
}

// Fixed physical scales; do not stretch each dataset's observed variation.
// Precipitation amount (mm), not a rate: zero is silent; positive amounts map
// to 0.5..5 coded plucks/s. Humidity is specific humidity (g/kg), not %RH.
export function mapPrecipitation(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) return null;
  return amount === 0 ? 0 : 0.5 + 4.5 * (1 - Math.exp(-amount / 5));
}
export function mapHumidity(specificHumidity) {
  if (typeof specificHumidity !== "number" || !Number.isFinite(specificHumidity) || specificHumidity < 0) return null;
  return 160 + 1440 * (1 - Math.exp(-specificHumidity / 12));
}
// Keep one fixed monotonic perceptual curve across the whole globe and all regions.
// The input remains the producer's log-scale norm; no regional rescaling occurs.
export function mapPm25(position) {
  if (typeof position !== "number" || !Number.isFinite(position) || position < 0 || position > 1) return null;
  const brightness = position + 0.3 * Math.sin(Math.PI * position);
  const boundedBrightness = Math.min(1, Math.max(0, brightness));
  return {
    brightness: boundedBrightness,
    frequency: 261.625565 * Math.pow(4, boundedBrightness),
  };
}

const identities = [
  ["clima-temperatura", 5147, "°C", "temperature"],
  ["clima-vento", 5148, "m/s", "wind"],
  ["clima-chuva", 5149, "mm", "precipitation"],
  ["clima-umidade", 5150, "g/kg", "humidity"],
  ["ar-pm25", 5151, "µg/m³", "pm25"],
  ["clima-ozonio", 5152, "ppbv", "ozone"],
  ["ar-co", 5153, "ppbv", "carbonMonoxide"],
];
export function soundKind(track) {
  if (!track) return "temperature";
  const unit = track.unit ?? track.colorbar?.unit;
  return identities.find(([id, svsId, expectedUnit]) => (track.id === id || (!track.id && track.svsId === svsId)) && (track.svsId === undefined || track.svsId === svsId) && unit === expectedUnit)?.[3] ?? null;
}

export function mapFrameSound(frame, track) {
  if (frame?.coverage === 0) return null;
  const kind = soundKind(track);
  if (kind === "temperature") {
    const note = mapValue(frame?.norm);
    return note ? { kind, note } : null;
  }
  if (kind === "pm25") {
    const texture = mapPm25(frame?.norm);
    return texture ? { kind, ...texture } : null;
  }
  if (kind === "carbonMonoxide") {
    const note = mapCarbonMonoxide(frame?.norm);
    return note ? { kind, note } : null;
  }
  if (kind === "ozone") {
    const note = mapOzone(frame?.norm);
    return note ? { kind, note } : null;
  }
  if (kind === "wind") {
    const rate = track?.sonification?.input === "visualSignal" ? mapWindActivity(frame?.visualSignal) : mapWindSpeed(frame?.mean);
    return rate === null ? null : { kind, rate };
  }
  if (kind === "precipitation") {
    const rate = mapPrecipitation(frame?.mean);
    return rate === null ? null : { kind, rate };
  }
  if (kind === "humidity") {
    const bandwidth = mapHumidity(frame?.mean);
    return bandwidth === null ? null : { kind, bandwidth };
  }
  return null;
}
