// AI-assisted: OpenAI Codex
// Transient UI states are separate from scientific missing values.
export function describeAvailability(frame) {
  const state = frame?.availability?.state;
  if (state === "loading") return { state, label: "Loading…", detail: "Loading regional values. Audio waits for this region." };
  if (state === "error") return { state, label: "Load failed", detail: "Regional values could not be loaded. Use Retry regional data." };
  if (state === "missing") return { state, label: "No regional data", detail: "This region has no precomputed row for this frame." };
  if (frame?.coverage === 0) return { state: "no_pixels", label: "No recognized pixels", detail: "No pixels matched the unchanged color filters. The physical value is unknown, not zero." };
  return { state: "ready", label: null, detail: null };
}
