// AI-assisted: OpenAI Codex
import { fetchJSON, validateFeatures } from "../data/features.js";
import { validateRegionalFeatures } from "../data/regions.js";
import { indexTimeline, combinedFrames } from "../data/combined.js";
import { soundKind, mapFrameSound } from "../engine/mapping.js";
import { describeReading } from "./readings.js";
import { regionDisplayName } from "./regions.js";

const LAYERS = [
  ["clima-temperatura", "temperature", "Temperature · organ", "temperature"],
  ["clima-vento", "wind", "Wind · flute", "wind"],
  ["clima-chuva", "precipitation", "Precipitation · percussion", "precipitation"],
  ["clima-umidade", "humidity", "Humidity · strings", "humidity"],
  ["ar-pm25", "pm25", "PM2.5 · map only", null],
  ["ar-co", "carbon-monoxide", "Carbon monoxide (CO) · map only", null],
  ["clima-ozonio", "ozone", "Ozone (O₃) · map only", null],
];

export function initCombined({ audio, getFrame, getRegion, onChange, onVisuals = () => {} }) {
  const toggle = document.getElementById("combine-sounds"), status = document.getElementById("combined-status");
  const controls = document.getElementById("combined-layers"), scope = document.getElementById("combined-scope");
  let datasets = null, pending, generation = 0, destroyed = false, controller, legendActive = false;
  controls.innerHTML = LAYERS.map(([, key, name, instrument]) => `<div class="combined-layer">
    <label class="checkbox-label"><input id="layer-${key}" type="checkbox" checked> ${name}</label>
    ${instrument ? `<label class="sr-only" for="gain-${key}">${name} volume</label><input id="gain-${key}" type="range" min="0" max="100" value="65" aria-label="${name} volume" aria-valuetext="65 percent">` : `<span class="control-help">Visual layer only; a dedicated sound mapping is not available yet.</span>`}
    <span id="reading-${key}" class="control-help">Unavailable</span></div>`).join("");
  function layerKey(track) { return LAYERS.find(([id]) => id === track?.id)?.[1] ?? null; }
  function applyControls() {
    for (const [, key, , instrument] of LAYERS) {
      if (!instrument) continue;
      audio.setInstrumentMuted(instrument, toggle.checked && !legendActive && !document.getElementById(`layer-${key}`).checked);
      audio.setInstrumentGain(instrument, toggle.checked && !legendActive ? Number(document.getElementById(`gain-${key}`).value) / 100 : 1);
    }
  }
  async function load() {
    if (datasets) return datasets;
    if (pending) return pending;
    controller = new AbortController();
    pending = Promise.all(LAYERS.map(async ([id, key, , instrument]) => {
      const track = await fetchJSON(`tracks/${id}.json`, controller.signal);
      const directory = new URL(track.frames.endsWith("/") ? track.frames : `${track.frames}/`, document.baseURI);
      const data = validateFeatures(await fetchJSON(new URL("../features.json", directory), controller.signal), id, track.unit ?? track.colorbar?.unit);
      const activeTrack = { ...track, unit: data.unit, statistics: data.statistics, sonification: data.sonification };
      if ((instrument && soundKind(activeTrack) !== instrument) || (!instrument && soundKind(activeTrack) !== null)) throw new Error(`Unexpected instrument for ${id}.`);
      const regional = validateRegionalFeatures(await fetchJSON(new URL("../regions.json", directory), controller.signal), activeTrack, data);
      return { track: activeTrack, layerKey: key, instrument, timeline: indexTimeline(data.frames), regional, mock: data.mock, statistics: data.statistics, sonification: data.sonification };
    })).then((result) => { const soundLayers = result.filter((entry) => entry.instrument); if (soundLayers.some((entry) => JSON.stringify(entry.statistics) !== JSON.stringify(soundLayers[0].statistics))) throw new Error("Sound datasets have different mean methods. Finish regenerating the four sound tracks before combining."); if (!destroyed) datasets = result; return result; }).finally(() => { pending = null; });
    return pending;
  }
  function entries(frame = getFrame()) {
    return datasets && frame ? combinedFrames(datasets, frame.date, getRegion()) : [];
  }
  function render(frame = getFrame()) {
    if (!toggle.checked) { onVisuals(null); return; }
    const region = getRegion();
    scope.textContent = `${region ? regionDisplayName(region) : "Full-frame values"} · ${frame?.date ?? "No frame selected"}. The image and main reading show the selected visual experience.`;
    const aligned = entries(frame);
    onVisuals(aligned.filter(({ track }) => document.getElementById(`layer-${layerKey(track)}`)?.checked));
    for (const { track, frame: value } of aligned) {
      const reading = describeReading(value, track), key = layerKey(track), visualOnly = soundKind(track) === null;
      const qualifier = visualOnly ? " · map only" : !mapFrameSound(value, track) ? " · silent" : "";
      document.getElementById(`reading-${key}`).textContent = `${reading.mean} · ${reading.soundValue} · ${reading.coverageDetail}${qualifier}`;
    }
  }
  toggle.addEventListener("change", async () => {
    const id = ++generation;
    audio.stop(); audio.setCombinedMode(toggle.checked); applyControls();
    controls.hidden = !toggle.checked; scope.hidden = !toggle.checked;
    if (!toggle.checked) { status.textContent = "Individual experience mode."; onChange(); return; }
    status.textContent = "Loading seven aligned datasets…"; render(); onChange();
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
  for (const [, key, , instrument] of LAYERS) {
    document.getElementById(`layer-${key}`).addEventListener("change", () => { applyControls(); onChange(); });
    if (!instrument) continue;
    document.getElementById(`gain-${key}`).addEventListener("input", (event) => {
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
