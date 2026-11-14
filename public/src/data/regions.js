// AI-assisted: OpenAI Codex
import { isFiniteNumber } from "./features.js";

export const REGIONAL_COLUMNS = Object.freeze(["mean", "p90", "norm", "coverage"]);

// Validate against the actual loaded source; filenames alone cannot detect stale data.
export function validateRegionalFeatures(data, track, source) {
  const invalid = () => { throw new Error("Regional data is invalid or outdated. Regenerate it with pipeline/regions.py."); };
  if (!data || data.schemaVersion !== 1 || data.track !== track.id || data.svsId !== track.svsId || data.mock !== false || source.mock !== false || data.unit !== source.unit || data.vmin !== source.vmin || data.vmax !== source.vmax || !isFiniteNumber(data.vmin) || !isFiniteNumber(data.vmax) || data.vmin >= data.vmax) invalid();
  if (!Array.isArray(data.columns) || data.columns.join(",") !== REGIONAL_COLUMNS.join(",") || !Array.isArray(data.frames) || data.frames.length !== source.frames.length) invalid();
  data.frames.forEach((frame, index) => {
    const expected = source.frames[index];
    for (const field of ["file", "date", ...REGIONAL_COLUMNS]) {
      if ((frame?.[field] ?? null) !== (expected[field] ?? null)) invalid();
    }
  });
  if (!data.regions || typeof data.regions !== "object" || Array.isArray(data.regions)) invalid();
  for (const [key, region] of Object.entries(data.regions)) {
    if (!region || !["country", "continent"].includes(region.kind) || typeof region.name !== "string" || !region.name || key !== `${region.kind}:${region.name}` || !Array.isArray(region.values) || region.values.length !== data.frames.length) invalid();
    for (const row of region.values) {
      if (!Array.isArray(row) || row.length !== 4) invalid();
      const [mean, p90, norm, coverage] = row;
      if (!isFiniteNumber(coverage) || coverage < 0 || coverage > 1) invalid();
      if (mean === null) {
        if (p90 !== null || norm !== null || coverage !== 0) invalid();
      } else if (!isFiniteNumber(mean) || !isFiniteNumber(p90) || !isFiniteNumber(norm) || norm < 0 || norm > 1) invalid();
    }
  }
  return data;
}

export function regionalFrame(frame, values) {
  // Values are produced by Python. No mean or normalization is computed here.
  return { ...frame, mean: values?.[0] ?? null, p90: values?.[1] ?? null, norm: values?.[2] ?? null, coverage: values?.[3] ?? null };
}
