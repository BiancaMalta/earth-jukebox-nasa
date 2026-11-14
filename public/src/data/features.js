// AI-assisted: OpenAI Codex
export const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

export async function fetchJSON(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Could not load ${new URL(url, document.baseURI).pathname} (HTTP ${response.status}).`);
  return response.json();
}

export function validateFeatures(data, trackId, expectedUnit) {
  if (!data || data.track !== trackId || typeof data.mock !== "boolean" || typeof data.unit !== "string" || !data.unit.trim() || (expectedUnit && data.unit !== expectedUnit) || !Array.isArray(data.frames)) {
    throw new Error("Invalid features.json: expected the track, mock flag, matching unit and a frames array.");
  }
  if (!data.frames.length) throw new Error("No frames are available for this track yet.");
  const names = new Set();
  const frames = data.frames.map((frame) => {
    if (!frame || typeof frame.file !== "string" || !/^[a-zA-Z0-9_-]+\.(webp|png|jpe?g)$/i.test(frame.file) || names.has(frame.file)) {
      throw new Error("Invalid features.json: frame filenames must be unique image basenames.");
    }
    names.add(frame.file);
    return {
      file: frame.file,
      date: typeof frame.date === "string" ? frame.date : null,
      mean: isFiniteNumber(frame.mean) ? frame.mean : null,
      p90: isFiniteNumber(frame.p90) ? frame.p90 : null,
      norm: isFiniteNumber(frame.norm) && frame.norm >= 0 && frame.norm <= 1 ? frame.norm : null,
      visualSignal: isFiniteNumber(frame.visualSignal) && frame.visualSignal >= 0 && frame.visualSignal <= 1 ? frame.visualSignal : null,
      coverage: isFiniteNumber(frame.coverage) && frame.coverage >= 0 && frame.coverage <= 1 ? frame.coverage : null,
    };
  });
  const sonification = data.sonification ?? null;
  if (sonification && (trackId !== "clima-vento" || sonification.input !== "visualSignal" || sonification.unit !== "1")) throw new Error("Unsupported sonification input in features.json.");
  const statistics = data.statistics ?? null;
  if (statistics && (statistics.mean !== "area_weighted" || statistics.weighting !== "cos_latitude" || statistics.p90 !== "unweighted_pixel_percentile" || statistics.coverage !== "accepted_pixel_fraction")) {
    throw new Error("Unsupported statistics method in features.json.");
  }
  const validRange = isFiniteNumber(data.vmin) && isFiniteNumber(data.vmax) && data.vmin < data.vmax;
  return { mock: data.mock, unit: data.unit, statistics, sonification, frames, vmin: validRange ? data.vmin : null, vmax: validRange ? data.vmax : null };
}

// Keep the producer's wall time and explicit offset. Never apply the browser's zone.
export function describeDate(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, zone] = match;
  const y = Number(year), m = Number(month), d = Number(day);
  const days = [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > days[m - 1] || Number(hour) > 23 || Number(minute) > 59 || Number(second ?? 0) > 59) return null;
  if (zone && zone !== "Z" && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59)) return null;
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const zoneLabel = !zone ? "time zone not specified" : zone === "Z" ? "UTC" : `UTC${zone}`;
  return `${months[m - 1]} ${d}, ${year} at ${hour}:${minute}${second ? `:${second}` : ""} (${zoneLabel})`;
}
