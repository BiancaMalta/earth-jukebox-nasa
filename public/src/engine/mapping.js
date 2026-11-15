// AI-assisted: OpenAI Codex
export const PENTATONIC_NOTES = Object.freeze(["C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4", "G4", "A4", "C5"]);
export const CO_NOTES = Object.freeze([
  "C2", "D2", "E2", "F2", "G2", "A2", "B2",
  "C3", "D3", "E3", "F3", "G3", "A3", "B3",
  "C4", "D4", "E4", "F4", "G4", "A4", "B4",
  "C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6",
]);
export const PM25_PITCH_RANGE = Object.freeze({ min: 130.8127825, max: 2093.00452 });
export const OZONE_NOTES = Object.freeze([
  "C3", "D3", "E3", "F3", "G3", "A3", "B3",
  "C4", "D4", "E4", "F4", "G4", "A4", "B4",
  "C5", "D5", "E5", "F5", "G5", "A5", "B5",
  "C6", "D6", "E6", "F6", "G6", "A6", "B6", "C7",
]);

// Eleven pitches: round(norm * 10) selects the nearest scale step.
// Reject invalid input rather than silently turning missing values into cold notes.
export function mapValue(norm) {
  if (typeof norm !== "number" || !Number.isFinite(norm) || norm < 0 || norm > 1) return null;
  return PENTATONIC_NOTES[Math.round(norm * (PENTATONIC_NOTES.length - 1))];
}

// Fixed C-major anchors: 40→0, 60→3, 200→24, 500→28.
// About 6.67 ppbv/step through 200, then 75 ppbv/step; never rescale per region.
export function mapCarbonMonoxide(position) {
  if (typeof position !== "number" || !Number.isFinite(position) || position < 0 || position > 1) return null;
  const ppbv = 40 + 460 * position;
  const step = ppbv <= 200 ? 24 * (ppbv - 40) / 160 : 24 + 4 * (ppbv - 200) / 300;
  return CO_NOTES[Math.round(step)];
}

// Fixed C-major curve shared by every region/time. Legend 5..60 ppbv remains
// unchanged. Scale-index anchors: 5→0, 30→4, 50→24, 60→28.
// The central band has one diatonic step per ppbv; endpoints remain represented.
export function mapOzone(position) {
  if (typeof position !== "number" || !Number.isFinite(position) || position < 0 || position > 1) return null;
  const ppbv = 5 + 55 * position;
  const step = ppbv < 30 ? 4 * (ppbv - 5) / 25
    : ppbv <= 50 ? 4 + ppbv - 30
      : 24 + 4 * (ppbv - 50) / 10;
  return OZONE_NOTES[Math.round(step)];
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
// The input is the producer's visual index (or legacy norm); no regional rescaling occurs.
export function mapPm25(position) {
  if (typeof position !== "number" || !Number.isFinite(position) || position < 0 || position > 1) return null;
  const brightness = position + 0.3 * Math.sin(Math.PI * position);
  const boundedBrightness = Math.min(1, Math.max(0, brightness));
  return {
    brightness: boundedBrightness,
    frequency: PM25_PITCH_RANGE.min * Math.pow(16, boundedBrightness),
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
  if (["loading", "error", "missing"].includes(frame?.availability?.state)) return null;
  if (frame?.coverage === 0) return null;
  const kind = soundKind(track);
  if (kind === "temperature") {
    const note = mapValue(frame?.norm);
    return note ? { kind, note } : null;
  }
  if (kind === "pm25") {
    const texture = mapPm25(track?.sonification?.input === "visualSignal" ? frame?.visualSignal : frame?.norm);
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
