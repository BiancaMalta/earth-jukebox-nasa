// AI-assisted: OpenAI Codex
import { fetchJSON, validateFeatures } from "../data/features.js";
import { validateRegionalFeatures } from "../data/regions.js";
import { indexTimeline, combinedFrames } from "../data/combined.js";
import { soundKind, mapFrameSound } from "../engine/mapping.js";
import { describeReading } from "./readings.js";
import { renderExperience } from "./experience.js";
import { describePixelFilters } from "./readings.js";

// Local copies keep this file independent of other modules being updated at the same time.
function describeNormalizationRange(data) {
  if (!data) return "Normalization limits are unavailable.";
  if (data.sonification?.input === "visualSignal") return `Pixel color legend: ${data.vmin} to ${data.vmax} ${data.unit}. The visible signal index is dimensionless (0–1), not a physical concentration or speed.`;
  if (data.vmin === null || data.vmin === undefined) return "Normalization limits are unavailable.";
  return `The supplied range is ${data.vmin} to ${data.vmax} ${data.unit}${data.mock ? " (demo values)" : ""}.`;
}
function describeMeanWeighting(data) {
  return data?.statistics?.mean === "area_weighted"
    ? "Mean = sum(decoded value × cosine latitude) ÷ sum(cosine latitude), using accepted pixels only. P90 remains an unweighted pixel percentile. Pixel inclusion remains a pixel-count ratio, not an area percentage."
    : "This dataset uses equal weights per decoded pixel. Its mean has not been area-weighted.";
}

const LAYERS = [
  ["clima-temperatura", "temperature", "Temperature · organ", "temperature"],
  ["clima-vento", "wind", "Wind · flute", "wind"],
  ["clima-chuva", "precipitation", "Precipitation · percussion", "precipitation"],
  ["clima-umidade", "humidity", "Humidity · strings", "humidity"],
  ["ar-pm25", "pm25", "PM2.5 · metallic shimmer", "pm25"],
  ["ar-co", "carbon-monoxide", "Carbon monoxide (CO) · brass lead", "carbonMonoxide"],
  ["clima-ozonio", "ozone", "Ozone (O₃) · plucked strings", "ozone"],
];

export function initCombined({ audio, getFrame, restoreSingle = () => {}, getRegion, onChange, onVisuals = () => {} }) {
  const toggle = document.getElementById("combine-sounds"), status = document.getElementById("combined-status");
  const controls = document.getElementById("combined-layers");
  const combinedGuide = document.getElementById("combined-sound-guide");
  const combinedGuideList = document.getElementById("combined-sound-guide-list");
  const combinedGuideLoading = document.getElementById("combined-sound-guide-loading");
  const soundGuide = document.querySelector(".guide-panel");
  const soundSettings = document.querySelector(".sound-settings");
  const listeningSidebar = document.querySelector(".listening-sidebar");
  const COMBINED_GAIN = 0.65;
  // Variable chooser: placed right after the guide title; the full single-visualization explanation follows its choice.
  const variableControls = [];
  function makeVariableControl(id, labelText) {
    const select = document.createElement("select");
    select.id = id;
    for (const [, key, name] of LAYERS) select.add(new Option(name.split(" · ")[0], key));
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = labelText;
    const control = document.createElement("div");
    control.className = "combined-variable-control";
    control.hidden = true;
    control.append(label, select);
    variableControls.push({ control, select });
    return { control, select };
  }
  const guideChooser = makeVariableControl("combined-variable", "Record to explain");
  const methodsChooser = makeVariableControl("combined-methods-variable", "Record details");
  const variableSelect = guideChooser.select;
  const guideHeading = document.getElementById("guide-heading");

  if (guideHeading) {
    guideHeading.parentNode?.insertBefore(
      guideChooser.control,
      guideHeading
    );
  } else {
    soundGuide?.prepend(guideChooser.control);
  }
  const methodsSummary = document.querySelector(".explanation-details > summary");
  if (methodsSummary) methodsSummary.after(methodsChooser.control);
  let datasets = null, pending, generation = 0, destroyed = false, controller, legendActive = false;
  function syncMode(combined) {
    const description = document.getElementById("mode-description");
    if (description) description.textContent = combined ? "Compare maps and hear their sounds together." : "Explore one map and its sound.";
    const individualTab = document.getElementById("individual-preview-tab");
    const combinedTab = document.getElementById("combined-preview-tab");
    const mapPanel = document.getElementById("frame-map-panel");

    if (individualTab && combinedTab && mapPanel) {
      individualTab.setAttribute("aria-selected", String(!combined));
      individualTab.tabIndex = 0;
      combinedTab.setAttribute("aria-selected", String(combined));
      combinedTab.tabIndex = 0;
      mapPanel.setAttribute(
        "aria-labelledby",
        combined ? combinedTab.id : individualTab.id
      );
    }

    const title = document.getElementById("track-title");

    if (title) {
      title.textContent = combined
        ? "Combine variables"
        : title.dataset.singleTitle ?? title.textContent;
    }

    const modeLabel = document.getElementById("mode-active");

    if (modeLabel) {
      modeLabel.textContent = combined
        ? "Active mode: Combine variables"
        : "Active mode: One variable";
    }

    variableControls.forEach(({ control }) => {
      control.hidden = !combined;
    });

    document.querySelector(".track-toolbar")?.toggleAttribute("hidden", combined);
    document.getElementById("time-series-panel")?.toggleAttribute("hidden", combined);
    document.getElementById("frame-readings")?.toggleAttribute("hidden", combined);
  }
  controls.innerHTML = LAYERS.map(([, key, name, instrument]) => `<div class="combined-layer" data-layer-key="${key}">
    <label class="checkbox-label"><input id="layer-${key}" type="checkbox" aria-describedby="reading-${key}" ${instrument || key !== "carbon-monoxide" && key !== "ozone" ? "checked" : ""}> ${name}</label><span id="layer-state-${key}" class="layer-state">On</span>
    ${instrument ? "" : `<span class="control-help">Visual layer only; a dedicated sound mapping is not available yet.</span>`}
    <span id="reading-${key}" class="control-help">Unavailable</span></div>`).join("");
  function layerKey(track) { return LAYERS.find(([id]) => id === track?.id)?.[1] ?? null; }
  function showVariableGuide() {
    const entry = datasets?.find((item) => item.layerKey === variableSelect.value);
    if (!entry) return;
    renderExperience(entry.track);
    const set = (id, text) => { const element = document.getElementById(id); if (element) element.textContent = text; };
    set("normalization-range", describeNormalizationRange(entry.data));
    set("mean-weighting-method", describeMeanWeighting(entry.data));
    set("pixel-filter-method", describePixelFilters(entry.colorbar));
  }
  function applyControls() {
    for (const [, key, , instrument] of LAYERS) {
      if (!instrument) continue;
      audio.setInstrumentMuted(instrument, toggle.checked && !legendActive && !document.getElementById(`layer-${key}`).checked);
      audio.setInstrumentGain(instrument, toggle.checked && !legendActive ? COMBINED_GAIN : 1);
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
      let colorbar = null;
      if (track.colorbar?.file) {
        try { colorbar = await fetchJSON(new URL("../colorbar.json", directory), controller.signal); }
        catch (error) { if (error.name === "AbortError") throw error; }
      }
      return { track: activeTrack, layerKey: key, instrument, timeline: indexTimeline(data.frames), regional, mock: data.mock, statistics: data.statistics, sonification: data.sonification, colorbar, data: { vmin: data.vmin, vmax: data.vmax, unit: data.unit, mock: data.mock, statistics: data.statistics, sonification: data.sonification } };
    })).then((result) => {     const soundLayers = result.filter((entry) => entry.instrument && entry.statistics?.mean); if (soundLayers.some((entry) => JSON.stringify(entry.statistics) !== JSON.stringify(soundLayers[0].statistics))) throw new Error("Sound datasets have different mean methods. Finish regenerating all sound tracks before combining."); if (!destroyed) datasets = result; return result; }).finally(() => { pending = null; });
    return pending;
  }
  function entries(frame = getFrame()) {
    return datasets && frame ? combinedFrames(datasets, frame.date, getRegion()) : [];
  }
  function render(frame = getFrame()) {
    if (!toggle.checked) return onVisuals(null);
    const aligned = entries(frame);
    const visualUpdate = onVisuals(aligned.map(entry => ({ ...entry, layerKey: layerKey(entry.track) })));
    for (const [, key] of LAYERS) {
      const checked = document.getElementById(`layer-${key}`).checked;
      const card = document.querySelector(`[data-layer-key="${key}"]`);
      card?.closest(".combined-frame")?.classList.toggle("combined-frame--off", !checked);
      document.getElementById(`layer-state-${key}`).textContent = checked ? "On" : "Off · muted";
    }
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
    syncMode(toggle.checked);
    controls.hidden = !toggle.checked;
    listeningSidebar.classList.toggle("combined-active", toggle.checked);
    soundGuide.hidden = toggle.checked;
    if (soundSettings) soundSettings.hidden = toggle.checked;
    if (combinedGuide) combinedGuide.hidden = true;
    if (!toggle.checked) {
      restoreSingle();
      status.textContent = " "; onChange(); return;
    }
    status.textContent = " "; render(); onChange();
    try {
      await load();
      if (destroyed || id !== generation || !toggle.checked) return;
      showVariableGuide();
      soundGuide.hidden = false;
      status.textContent = " ";
      render(); onChange();
    } catch (error) {
      if (destroyed || id !== generation) return;
      controller?.abort();
      toggle.checked = false; controls.hidden = true;
      syncMode(false);
      listeningSidebar.classList.remove("combined-active");
      soundGuide.hidden = false;
      if (soundSettings) soundSettings.hidden = false;
      restoreSingle();
      audio.stop(); audio.setCombinedMode(false); applyControls();
      status.textContent = `Combined sound unavailable: ${error.message} Individual playback remains available. Activate Combine variables to retry.`;
      onChange();
    }
  });
  for (const [, key] of LAYERS) {
    document.getElementById(`layer-${key}`).addEventListener("change", () => { applyControls(); onChange(); });
  }
  for (const { select } of variableControls) {
    select.addEventListener("change", () => {
      for (const other of variableControls) other.select.value = select.value;
      showVariableGuide(); onChange();
    });
  }
  return {
    get legendKind() {
      const key = variableSelect.value;
      const visual = datasets?.find((entry) => entry.layerKey === key)?.track.sonification?.input === "visualSignal";
      return key === "carbon-monoxide" ? "carbonMonoxide" : visual && (key === "wind" || key === "pm25") ? `${key}Visual` : key;
    },
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
