// AI-assisted: OpenAI Codex
import { describeDate } from "./features.js";
import { regionalFrame } from "./regions.js";

export function indexTimeline(frames) {
  const timeline = new Map();
  frames.forEach((frame, index) => {
    if (!describeDate(frame.date) || timeline.has(frame.date)) throw new Error("Combined playback requires valid, unique supplied timestamps.");
    timeline.set(frame.date, { frame, index });
  });
  return timeline;
}

// Exact supplied timestamp labels are the experimental join key. No timezone
// inference, nearest-neighbor interpolation, index pairing or invented values.
export function combinedFrames(datasets, date, regionKey = null) {
  return datasets.map(({ track, timeline, regional }) => {
    const match = timeline.get(date);
    const row = regionKey && match ? regional.regions[regionKey]?.values[match.index] : null;
    return { track, frame: !match ? null : regionKey ? regionalFrame(match.frame, row) : match.frame };
  });
}
