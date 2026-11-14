// AI-assisted: OpenAI Codex
import { fetchJSON, validateFeatures } from "../data/features.js";
import { validateRegionalFeatures } from "../data/regions.js";
import { indexTimeline, combinedFrames } from "../data/combined.js";
import { soundKind, mapFrameSound } from "../engine/mapping.js";
import { describeReading } from "./readings.js";
import { regionDisplayName } from "./regions.js";

const LAYERS = [
  ["clima-temperatura", "temperature", "Temperature · organ"],
  ["clima-vento", "wind", "Wind · flute"],
  ["clima-chuva", "precipitation", "Precipitation · percussion"],
  ["clima-umidade", "humidity", "Humidity · strings"],
];

export function initCombined({ audio, getFrame, getRegion, onChange }) {
  const toggle = document.getElementById("combine-sounds"), status = document.getElementById("combined-status");
  const controls = document.getElementById("combined-layers"), scope = document.getElementById("combined-scope");
  let datasets = null, pending, generation = 0, destroyed = false, controller, legendActive = false;
  controls.innerHTML = LAYERS.map(([, kind, name]) => `<div class="combined-layer">
    <label class="checkbox-label"><input id="layer-${kind}" type="checkbox" checked> ${name}</label>
    <label class="sr-only" for="gain-${kind}">${name} volume</label>
    <input id="gain-${kind}" type="range" min="0" max="100" value="65" aria-label="${name} volume" aria-valuetext="65 percent">
    <span id="reading-${kind}" class="control-help">Unavailable</span></div>`).join("");
  function applyControls() {
    for (const [, kind] of LAYERS) {
      audio.setInstrumentMuted(kind, toggle.checked && !legendActive && !document.getElementById(`layer-${kind}`).checked);
      audio.setInstrumentGain(kind, toggle.checked && !legendActive ? Number(document.getElementById(`gain-${kind}`).value) / 100 : 1);
    }
  }
  async function load() {
    if (datasets) return datasets;
    if (pending) return pending;
    controller = new AbortController();
    pending = Promise.all(LAYERS.map(async ([id, kind]) => {
      const track = await fetchJSON(`tracks/${id}.json`, controller.signal);
      const directory = new URL(track.frames.endsWith("/") ? track.frames : `${track.frames}/`, document.baseURI);
      const data = validateFeatures(await fetchJSON(new URL("../features.json", directory), controller.signal), id, track.unit ?? track.colorbar?.unit);
      const activeTrack = { ...track, unit: data.unit, statistics: data.statistics, sonification: data.sonification };
      if (soundKind(activeTrack) !== kind) throw new Error(`Unexpected instrument for ${id}.`);
      const regional = validateRegionalFeatures(await fetchJSON(new URL("../regions.json", directory), controller.signal), activeTrack, data);
      return { track: activeTrack, timeline: indexTimeline(data.frames), regional, mock: data.mock, statistics: data.statistics, sonification: data.sonification };
    })).then((result) => { if (result.some(entry => JSON.stringify(entry.statistics) !== JSON.stringify(result[0].statistics))) throw new Error("Datasets have different mean methods. Finish regenerating all four tracks before combining."); if (!destroyed) datasets = result; return result; }).finally(() => { pending = null; });
    return pending;
  }
  function entries(frame = getFrame()) {
    return datasets && frame ? combinedFrames(datasets, frame.date, getRegion()) : [];
  }
  function render(frame = getFrame()) {
    if (!toggle.checked) return;
    const region = getRegion();
    scope.textContent = `${region ? regionDisplayName(region) : "Full-frame values"} · ${frame?.date ?? "No frame selected"}. The image and main reading show the selected visual experience.`;
    for (const { track, frame: value } of entries(frame)) {
      const reading = describeReading(value, track), kind = soundKind(track);
      document.getElementById(`reading-${kind}`).textContent = `${reading.mean} · ${reading.soundValue} · ${reading.coverageDetail}${!mapFrameSound(value, track) ? " · silent" : ""}`;
    }
  }
  toggle.addEventListener("change", async () => {
    const id = ++generation;
    audio.stop(); audio.setCombinedMode(toggle.checked); applyControls();
    controls.hidden = !toggle.checked; scope.hidden = !toggle.checked;
    if (!toggle.checked) { status.textContent = "Individual experience mode."; onChange(); return; }
    status.textContent = "Loading four aligned datasets…"; render(); onChange();
    try {
      await load();
      if (destroyed || id !== generation || !toggle.checked) return;
      status.textContent = "Experimental mix: exact supplied timestamp labels. Time zones and scientific interval alignment are not confirmed. Missing layer values are silent.";
      render(); onChange();
    } catch (error) {
      if (destroyed || id !== generation) return;
      controller?.abort();
      toggle.checked = false; controls.hidden = scope.hidden = true;
      audio.stop(); audio.setCombinedMode(false); applyControls();
      status.textContent = `Combined sound unavailable: ${error.message} Individual playback remains available. Toggle to retry.`;
      onChange();
    }
  });
  for (const [, kind] of LAYERS) {
    document.getElementById(`layer-${kind}`).addEventListener("change", () => { applyControls(); onChange(); });
    document.getElementById(`gain-${kind}`).addEventListener("input", (event) => {
      event.target.setAttribute("aria-valuetext", `${event.target.value} percent`); applyControls(); onChange();
    });
  }
  return {
    get enabled() { return toggle.checked; },
    get ready() { return datasets !== null; },
    render,
    setLegendMode(value) {
      legendActive = Boolean(value);
      audio.setCombinedMode(toggle.checked && !legendActive);
      applyControls();
    },
    play(frame, duration) { if (!datasets) { audio.stop(); return false; } return audio.playLayers(entries(frame), duration); },
    destroy() { destroyed = true; ++generation; controller?.abort(); },
  };
}
