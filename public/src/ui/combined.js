// AI-assisted: OpenAI Codex
import { fetchJSON, validateFeatures } from "../data/features.js";
import { validateRegionalFeatures } from "../data/regions.js";
import { indexTimeline, combinedFrames } from "../data/combined.js";
import { soundKind, mapFrameSound } from "../engine/mapping.js";
import { describeReading } from "./readings.js";
import { describeExperience } from "./experience.js";

const LAYERS = [
  ["clima-temperatura", "temperature", "Temperature · organ", "temperature"],
  ["clima-vento", "wind", "Wind · flute", "wind"],
  ["clima-chuva", "precipitation", "Precipitation · percussion", "precipitation"],
  ["clima-umidade", "humidity", "Humidity · strings", "humidity"],
  ["ar-pm25", "pm25", "PM2.5 · metallic shimmer", "pm25"],
  ["ar-co", "carbon-monoxide", "Carbon monoxide (CO) · brass lead", "carbonMonoxide"],
  ["clima-ozonio", "ozone", "Ozone (O₃) · plucked strings", "ozone"],
];

export function initCombined({ audio, getFrame, getRegion, onChange, onVisuals = () => {} }) {
  const toggle = document.getElementById("combine-sounds"), status = document.getElementById("combined-status");
  const controls = document.getElementById("combined-layers");
  const combinedGuide = document.getElementById("combined-sound-guide");
  const combinedGuideList = document.getElementById("combined-sound-guide-list");
  const combinedGuideLoading = document.getElementById("combined-sound-guide-loading");
  const soundGuide = document.querySelector(".guide-panel");
  const soundSettings = document.querySelector(".sound-settings");
  const listeningSidebar = document.querySelector(".listening-sidebar");
  let datasets = null, pending, generation = 0, destroyed = false, controller, legendActive = false;
  function syncPreviewTabs(combined) {
    const individualTab = document.getElementById("individual-preview-tab");
    const combinedTab = document.getElementById("combined-preview-tab");
    const mapPanel = document.getElementById("frame-map-panel");
    if (!individualTab || !combinedTab || !mapPanel) return;
    individualTab.setAttribute("aria-selected", String(!combined));
    individualTab.tabIndex = combined ? -1 : 0;
    combinedTab.setAttribute("aria-selected", String(combined));
    combinedTab.tabIndex = combined ? 0 : -1;
    mapPanel.setAttribute("aria-labelledby", combined ? combinedTab.id : individualTab.id);
  }
  controls.innerHTML = LAYERS.map(([, key, name, instrument]) => `<div class="combined-layer">
    <label class="checkbox-label"><input id="layer-${key}" type="checkbox" ${instrument || key !== "carbon-monoxide" && key !== "ozone" ? "checked" : ""}> ${name}</label>
    ${instrument ? `<label class="sr-only" for="gain-${key}">${name} volume</label><input id="gain-${key}" type="range" min="0" max="100" value="65" aria-label="${name} volume" aria-valuetext="65 percent">` : `<span class="control-help">Visual layer only; a dedicated sound mapping is not available yet.</span>`}
    <span id="reading-${key}" class="control-help">Unavailable</span></div>`).join("");
  function layerKey(track) { return LAYERS.find(([id]) => id === track?.id)?.[1] ?? null; }
  function renderCombinedGuide(entries) {
    const summaries = {
      temperature: "warmer → higher pitch",
      wind: "more visible signal → faster pulses",
      precipitation: "larger amount → faster drum",
      humidity: "higher → brighter strings",
      pm25: "higher → brighter metallic tone",
      carbonMonoxide: "higher → higher note",
      ozone: "higher → higher pluck",
    };
    combinedGuideList.replaceChildren(...entries.map(({ track }) => {
      const description = describeExperience(track);
      const item = document.createElement("li");
      const name = document.createElement("strong");
      name.textContent = `${description.name}: `;
      const mapping = document.createElement("span");
      mapping.textContent = summaries[description.kind] ?? description.heading;
      if (description.kind === "wind" && track.sonification?.input !== "visualSignal") {
        mapping.textContent = "higher speed → faster pulses";
      }
      item.append(name, mapping);
      return item;
    }));
    combinedGuideLoading.hidden = true;
  }
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
    })).then((result) => {     const soundLayers = result.filter((entry) => entry.instrument && entry.statistics?.mean); if (soundLayers.some((entry) => JSON.stringify(entry.statistics) !== JSON.stringify(soundLayers[0].statistics))) throw new Error("Sound datasets have different mean methods. Finish regenerating all sound tracks before combining."); if (!destroyed) datasets = result; return result; }).finally(() => { pending = null; });
    return pending;
  }
  function entries(frame = getFrame()) {
    return datasets && frame ? combinedFrames(datasets, frame.date, getRegion()) : [];
  }
  function render(frame = getFrame()) {
    if (!toggle.checked) return onVisuals(null);
    const aligned = entries(frame);
    const visualUpdate = onVisuals(aligned.filter(({ track }) => document.getElementById(`layer-${layerKey(track)}`)?.checked));
    for (const { track, frame: value } of aligned) {
      const reading = describeReading(value, track), key = layerKey(track), visualOnly = soundKind(track) === null;
      const qualifier = visualOnly ? " · map only" : !mapFrameSound(value, track) ? " · silent" : "";
      document.getElementById(`reading-${key}`).textContent = `${reading.mean} · ${reading.soundValue} · ${reading.coverageDetail}${qualifier}`;
    }
    return visualUpdate;
  }
  toggle.addEventListener("change", async () => {
    const id = ++generation;
    audio.stop(); audio.setCombinedMode(toggle.checked); applyControls();
    syncPreviewTabs(toggle.checked);
    controls.hidden = !toggle.checked;
    listeningSidebar.classList.toggle("combined-active", toggle.checked);
    soundGuide.hidden = toggle.checked;
    soundSettings.hidden = toggle.checked;
    combinedGuide.hidden = true;
    combinedGuideLoading.hidden = false;
    const frameReadings = document.getElementById("frame-readings");
    if (frameReadings) frameReadings.hidden = toggle.checked;
    if (!toggle.checked) { status.textContent = "Individual experience mode."; onChange(); return; }
    status.textContent = "Loading seven aligned datasets…"; render(); onChange();
    try {
      await load();
      if (destroyed || id !== generation || !toggle.checked) return;
      renderCombinedGuide(datasets);
      combinedGuide.hidden = false;
      status.textContent = "Experimental mix: exact supplied timestamp labels. Time zones and scientific interval alignment are not confirmed. Missing layer values are silent.";
      render(); onChange();
    } catch (error) {
      if (destroyed || id !== generation) return;
      controller?.abort();
      toggle.checked = false; controls.hidden = true;
      syncPreviewTabs(false);
      listeningSidebar.classList.remove("combined-active");
      soundGuide.hidden = false;
      soundSettings.hidden = false;
      combinedGuide.hidden = true;
      if (frameReadings) frameReadings.hidden = false;
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
