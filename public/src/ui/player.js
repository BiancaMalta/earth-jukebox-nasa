// AI-assisted: OpenAI Codex
import { describeDate, fetchJSON, validateFeatures } from "../data/features.js";
import { renderReading } from "./readings.js";
import { describeExperience } from "./experience.js";
import { soundKind } from "../engine/mapping.js";
const FRAME_INTERVAL_MS = 250;

const byId = (id) => document.getElementById(id) ?? { textContent: "" };

function localizedText(value, fallback) {
  if (typeof value === "string") return value;
  return value?.en ?? value?.pt ?? fallback;
}

export function initPlayer(index, hooks = {}) {
  const root = document.getElementById("player");
  root.innerHTML = `
    <div class="player-preview-tabs" role="tablist" aria-label="Visualization preview">
      <button id="individual-preview-tab" type="button" role="tab" aria-selected="true" aria-controls="frame-map-panel" aria-describedby="single-mode-help" tabindex="0">One variable</button>
      <button id="combined-preview-tab" type="button" role="tab" aria-selected="false" aria-controls="frame-map-panel" aria-describedby="combined-mode-help" tabindex="0">Combine variables</button>
    </div>
    <p id="single-mode-help" class="sr-only">Explore one map and its sound.</p>
    <p id="combined-mode-help" class="sr-only">Compare maps and hear their sounds together.</p>
    <p id="mode-description" class="mode-description control-help">Explore one map and its sound.</p>
    <div class="player-heading">
      <div><p class="eyebrow">Now on the turntable</p><h2 id="track-title">Earth player</h2></div>
      <span id="playback-state" class="playback-state">Paused</span>
    </div>
    <div class="track-toolbar"><label class="sr-only" for="track-select">Experience</label><select id="track-select" hidden></select><fieldset class="record-collection"><legend>Choose your record <span>Seven ways to hear our planet</span></legend><p class="record-browse-help">Swipe to browse all seven records. Use arrow keys when a record is focused.</p><div id="record-sleeves" class="record-sleeves"></div></fieldset><span id="demo-data" class="badge" hidden>Demo data</span></div>
    <section id="region-options" class="region-options" aria-labelledby="regional-heading" hidden>
      <details id="regional-explorer" class="regional-explorer" hidden open>
      <summary class="region-intro" data-spoken-description="Choose a place or play a suggested one. The selection stays visible above Play."><span><span class="eyebrow">A different place. A different sound.</span><span id="regional-heading">Where do you want to listen?</span></span><span class="region-badge" id="region-summary-place">Whole map</span><span class="region-chevron" aria-hidden="true">⌄</span></summary>
      <p id="region-help" class="control-help">Keep the same moment. Change the place. The highlighted area shapes both your readings and your sound.</p>
      <fieldset class="region-scopes"><legend class="sr-only">Listening area</legend>
        <label class="region-scope"><input type="radio" name="region-scope" value="world" checked><span><strong>Whole map</strong><small>The big picture</small></span></label>
        <label class="region-scope"><input type="radio" name="region-scope" value="continent"><span><strong>Region</strong><small>Compare larger regions</small></span></label>
        <label class="region-scope"><input type="radio" name="region-scope" value="country"><span><strong>Country</strong><small>Listen a little closer</small></span></label>
      </fieldset>
      <select id="region-level" hidden aria-label="Regional level"><option value="continent">Region</option><option value="country">Country</option></select>
      <div class="region-controls">
        <div id="region-group-field" class="region-field" hidden><label for="region-continent">Region</label><select id="region-continent"><option value="">Choose a region</option></select></div>
        <div id="region-country-field" class="region-field" hidden><label for="region-country">Country</label><select id="region-country" disabled><option value="">Choose a country</option></select></div>
      </div>
      <div class="region-discover"><span id="region-suggestions-heading">Suggested listening</span><p class="region-suggestions-intro">A few places to try. Choose Region or Country above to browse every available place.</p><div id="region-suggestions" class="region-suggestion-buttons" aria-labelledby="region-suggestions-heading"></div></div>
      <p id="region-suggestions-help" class="control-help">Finding places with varied sounds in this record…</p>
      <p id="region-status" class="status-text" role="status" aria-live="polite">Explore a place to hear its regional values.</p>
      <p id="region-current" class="regional-reading">Playback uses the full-frame value.</p>
      <details class="region-boundaries"><summary>About these boundaries</summary><p class="control-help">Groups follow whole-country assignments, not physical continental boundaries. Europe includes all of Russia; Asia excludes Russia. Oceanic island territories cover land only. Whole-map readings summarize accepted image pixels.</p></details>
      </details>
    </section>
    <div class="region-selection listening-now"><div><span class="region-selection-label">Listening to</span><strong id="region-selection-name">Whole map</strong></div><button id="region-reset" type="button" hidden>Back to whole map</button></div>
    <div id="transport-controls" class="player-controls transport" role="group" aria-label="Playback controls" tabindex="-1">
      <button id="previous-frame" type="button" aria-label="Previous frame" disabled><span aria-hidden="true">←</span> Previous</button>
      <button id="play-pause" class="primary-button" type="button" aria-pressed="false" disabled>Play</button>
      <button id="next-frame" type="button" aria-label="Next frame" disabled>Next <span aria-hidden="true">→</span></button>
    </div>
    <div class="frame-progress"><label for="frame-position">Timeline</label><span id="frame-count">0 / 0</span><input id="frame-position" type="range" min="0" max="0" value="0" aria-describedby="frame-position-help" disabled></div>
    <p id="frame-position-help" class="control-help">Use the arrow keys on this slider to select a frame. Selecting a frame pauses playback.</p>
    <details class="jukebox-tuning">
      <summary class="tuning-plaque" data-spoken-label="Rhythm and time control" data-spoken-description="Playback speed and optional day or week metronome."><span class="tuning-brand" aria-hidden="true">EARTH JUKEBOX</span><span>Rhythm &amp; time control</span><span class="tuning-chevron" aria-hidden="true">⌄</span></summary>
      <div class="tuning-controls">
        <div class="tuning-card speed-control">
          <div class="tuning-heading"><span class="tuning-number" aria-hidden="true">01</span><label for="playback-speed">Playback speed</label></div>
          <div class="speed-selector"><span class="tuning-dial" aria-hidden="true"></span><select id="playback-speed" aria-describedby="playback-speed-help"><option value="0.25">0.25× · Slowest</option><option value="0.5">0.5× · Slower</option><option value="1" selected>1× · Normal</option><option value="1.5">1.5× · Faster</option><option value="2">2× · Fastest</option></select></div>
          <p id="playback-speed-help" class="control-help">Set the pace of your listening journey. Values and sound mappings stay the same.</p>
        </div>
        <div id="metronome-slot"></div>

      </div>
    </details>
    <p id="demo-notice" class="demo-notice" hidden><strong>Demonstration values.</strong> Dataset values and dates are simulated, not scientific measurements.</p>
    <p id="data-caveat" class="data-caveat" hidden></p>
    <figure id="frame-map-panel" class="player-visualization" role="tabpanel" aria-labelledby="individual-preview-tab" tabindex="0"><div class="frame-map"><img id="frame-image" alt="Global map of near-surface air temperature from NASA GEOS-FP." hidden width="1024" height="512"><svg id="region-overlay" viewBox="0 0 1024 512" aria-hidden="true" hidden></svg><div id="combined-frame-grid" class="combined-frame-grid" role="group" aria-label="Selected combined map frames" hidden></div></div><figcaption id="frame-description">Select a visualization to begin.</figcaption></figure>
    <p id="player-status" role="status" aria-atomic="true">Loading visualizations…</p>
    <p id="readings-help" class="sr-only">Frame readings summarize image-derived pixels. Coverage is the share of analyzed image pixels used, not geographic area or accuracy. Choosing a region changes the reading and sound.</p>
    <dl id="frame-readings" class="frame-readings" role="group" aria-label="Current frame readings" tabindex="-1" aria-describedby="readings-help">
      <div class="reading reading--date"><dt>Dataset time</dt><dd><time id="frame-date">Unavailable</time><span id="frame-time" class="reading-detail">No frame selected</span></dd></div>
      <div class="reading"><dt id="measure-label">Dataset measure</dt><dd><span id="frame-mean">Unavailable</span><span id="measure-detail" class="reading-detail">Value and unit for this dataset</span><span id="coverage-detail" class="reading-detail" hidden></span></dd></div>
      <div class="reading"><dt id="sound-label">Mapped musical note</dt><dd><span id="current-note">Unavailable</span><span id="note-status" class="reading-detail">Enable sound to listen.</span></dd></div>
    </dl>
    <details id="time-series-panel" class="time-series-panel">
      <summary aria-describedby="time-series-scope">Values over time</summary>
      <p id="time-series-scope" class="control-help">Full-frame estimates for this experience.</p>
      <p id="time-series-help" class="control-help">Use your screen reader’s table commands to explore cells. With spoken navigation, use Read this frame to hear only the highlighted frame.</p>
      <button id="read-current-row" type="button" data-spoken-only hidden>Read this frame</button>
      <div class="time-series-scroll" role="region" tabindex="0" aria-label="Values by time" aria-describedby="time-series-help">
        <table class="time-series-table">
          <caption id="time-series-caption">Values by frame</caption>
          <thead><tr><th scope="col">Date and time</th><th scope="col">Mean</th><th scope="col">P90</th><th scope="col">Coverage</th></tr></thead>
          <tbody id="time-series-body"></tbody>
        </table>
      </div>
      <a href="#play-pause">Back to playback</a>
    </details>
    `;
  const metronome = document.getElementById("metronome-controls");
  if (metronome) root.querySelector("#metronome-slot").replaceWith(metronome);
  const speedSelect = root.querySelector("#playback-speed");
  const syncDial = () => { root.querySelector(".speed-control").dataset.speed = speedSelect.value; };
  speedSelect.addEventListener("change", syncDial);
  syncDial();
  const combinedLayers = document.getElementById("combined-layers");
  root.querySelector("#frame-readings").after(combinedLayers);
  const find = (id) => root.querySelector(`#${id}`);
  const combineToggle = document.getElementById("combine-sounds");
  find("frame-readings").hidden = combineToggle.checked;
  let singleTitle = "Earth player";
  const setTitle = (text) => { singleTitle = text; const el = find("track-title"); el.dataset.singleTitle = text; el.textContent = combineToggle.checked ? "Combine variables" : text; };
  const individualTab = find("individual-preview-tab"), combinedTab = find("combined-preview-tab");
  const frameMapPanel = find("frame-map-panel"), tabList = root.querySelector("[role='tablist']");
  function syncPreviewTabs(combined) {
    find("mode-description").textContent = combined ? "Compare maps and hear their sounds together." : "Explore one map and its sound.";
    individualTab.setAttribute("aria-selected", String(!combined));
    individualTab.tabIndex = 0;
    combinedTab.setAttribute("aria-selected", String(combined));
    combinedTab.tabIndex = 0;
    frameMapPanel.setAttribute("aria-labelledby", combined ? combinedTab.id : individualTab.id);
  }
  function selectPreview(combined) {
    if (combineToggle.checked !== combined) {
      combineToggle.checked = combined;
      combineToggle.dispatchEvent(new Event("change", { bubbles: true }));
    }
    syncPreviewTabs(combined);
  }
  individualTab.addEventListener("click", () => selectPreview(false));
  combinedTab.addEventListener("click", () => selectPreview(true));
  combineToggle.addEventListener("change", () => syncPreviewTabs(combineToggle.checked));
  tabList.addEventListener("keydown", (event) => {
    const currentIndex = [individualTab, combinedTab].indexOf(document.activeElement);
    if (currentIndex < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - currentIndex;
    const nextTab = [individualTab, combinedTab][nextIndex];
    nextTab.focus();
    nextTab.click();
  });
  syncPreviewTabs(combineToggle.checked);
  const select = find("track-select"), image = find("frame-image"), slider = find("frame-position"), combinedGrid = find("combined-frame-grid");
  const playButton = find("play-pause"), previous = find("previous-frame"), next = find("next-frame");
  const status = find("player-status"), count = find("frame-count"), description = find("frame-description");
  let frames = [], frameIndex = -1, frameDirectory, activeTrack, playing = false, timer;
  let playbackSpeed = 1;
  let requestId = 0, trackRequestId = 0, imageController, trackController, currentObjectURL;
  let destroyed = false;
  let combinedVisualRequest = 0, combinedSelectionKey = null, combinedFrameKey = null;
  let combinedVisualPromise = Promise.resolve();
  const combinedTiles = new Map();
  let regionalTable = null, currentTableRow = null;
  const timeSeriesBody = find("time-series-body");
  const timeSeriesScope = find("time-series-scope");
  const timeSeriesCaption = find("time-series-caption");

  function renderTimeSeries() {
    timeSeriesBody.replaceChildren();
    currentTableRow = null;
    const regionalReady = !regionalTable || regionalTable.state === "ready";
    timeSeriesScope.textContent = !regionalTable
      ? "Full-frame estimates for this experience."
      : regionalTable.state === "loading"
        ? "Loading regional estimates for " + regionalTable.name + "."
        : regionalTable.state === "error"
          ? "Regional estimates for " + regionalTable.name + " could not be loaded."
          : "Image-derived estimates for " + regionalTable.name + ".";
    timeSeriesCaption.textContent = (regionalTable ? regionalTable.name : "Full-frame") + " values by frame";
    if (!regionalReady) return;
    frames.forEach((frame, index) => {
      const regional = regionalTable?.values?.[index];
      const values = regionalTable ? regional : [frame.mean, frame.p90, frame.norm, frame.coverage];
      const row = document.createElement("tr");
      row.dataset.frameIndex = String(index);
      const dateCell = document.createElement("td");
      const time = document.createElement("time");
      time.textContent = frame.date ? describeDate(frame.date) || frame.date : "Time unavailable";
      if (frame.date) time.setAttribute("datetime", frame.date);
      dateCell.append(time);
      row.append(dateCell);
      for (const value of [values?.[0], values?.[1]]) {
        const cell = document.createElement("td");
        cell.textContent = typeof value === "number" ? value.toFixed(2) + " " + activeTrack.unit : "No data";
        row.append(cell);
      }
      const coverageCell = document.createElement("td");
      const coverage = values?.[3];
      coverageCell.textContent = typeof coverage === "number" ? (coverage * 100).toFixed(1) + "%" : "Unavailable";
      row.append(coverageCell);
      timeSeriesBody.append(row);
    });
    setCurrentTableRow(frameIndex);
  }

  function setCurrentTableRow(index) {
    currentTableRow?.removeAttribute("aria-current");
    currentTableRow = Number.isInteger(index) ? timeSeriesBody.rows[index] ?? null : null;
    currentTableRow?.setAttribute("aria-current", "true");
  }

  function restoreLayerControls() {
    combinedGrid.querySelectorAll(".combined-layer").forEach(card => combinedLayers.append(card));
  }
  function clearCombinedFrames() {
    restoreLayerControls();
    ++combinedVisualRequest;
    combinedSelectionKey = combinedFrameKey = null;
    combinedVisualPromise = Promise.resolve();
    combinedTiles.clear();
    combinedGrid.replaceChildren();
    combinedGrid.hidden = true;
    combinedGrid.className = "combined-frame-grid";
    combinedGrid.removeAttribute("aria-busy");
    root.querySelector(".frame-map").classList.remove("frame-map--combined-multiple");
    image.hidden = !image.getAttribute("src");
    return combinedVisualPromise;
  }

  function preloadCombinedImage(source) {
    const prepared = new Image();
    prepared.src = source;
    if (typeof prepared.decode === "function") return prepared.decode().then(() => prepared);
    return new Promise((resolve, reject) => {
      if (prepared.complete) return prepared.naturalWidth ? resolve(prepared) : reject(new Error("Image decode failed."));
      prepared.onload = () => resolve(prepared);
      prepared.onerror = () => reject(new Error("Image download failed."));
    });
  }

  function setCombinedFrames(entries) {
    if (!Array.isArray(entries)) return clearCombinedFrames();
    const selected = entries.filter((entry) => entry?.track);
    if (!selected.length) return clearCombinedFrames();

    const multiple = selected.length > 1;
    const selectionKey = selected.map(({ track }) => track.id).join("|");
    if (selectionKey !== combinedSelectionKey) {
      ++combinedVisualRequest;
      combinedFrameKey = null;
      combinedSelectionKey = selectionKey;
      restoreLayerControls();
      combinedTiles.clear();
      combinedGrid.replaceChildren();
      for (const { track, layerKey } of selected) {
        const title = track.title?.en ?? track.title?.pt ?? localizedText(track.quantity, track.id ?? "Dataset");
        const tile = document.createElement("figure");
        tile.className = "combined-frame";
        const media = document.createElement("div");
        media.className = "combined-frame-media";
        const placeholder = document.createElement("p");
        placeholder.className = "combined-frame-missing";
        placeholder.textContent = "Preparing aligned maps…";
        media.append(placeholder);
        const caption = document.createElement("figcaption");
        caption.textContent = title;
        const layerCard = [...combinedLayers.querySelectorAll("[data-layer-key]")].find(card => card.dataset.layerKey === layerKey);
        if (layerCard) tile.append(layerCard, media);
        else tile.append(media, caption);
        combinedGrid.append(tile);
        combinedTiles.set(track.id, { media, placeholder, title });
      }
    }

    combinedGrid.className = "combined-frame-grid" + (multiple ? " combined-frame-grid--multiple" : " combined-frame-grid--single");
    root.querySelector(".frame-map").classList.toggle("frame-map--combined-multiple", multiple);
    combinedGrid.hidden = false;
    image.hidden = true;

    const frameKey = selected.map(({ track, frame }) => `${track.id}:${frame?.file ?? "missing"}`).join("|");
    if (frameKey === combinedFrameKey) return combinedVisualPromise;
    combinedFrameKey = frameKey;
    const request = ++combinedVisualRequest;
    combinedGrid.setAttribute("aria-busy", "true");

    const pending = Promise.all(selected.map(async ({ track, frame }) => {
      const tile = combinedTiles.get(track.id);
      if (!frame?.file || !track.frames) return { track, frame, tile, image: null, error: null };
      const directory = new URL(track.frames.endsWith("/") ? track.frames : `${track.frames}/`, document.baseURI);
      const source = new URL(encodeURIComponent(frame.file), directory).href;
      try {
        const prepared = await preloadCombinedImage(source);
        return { track, frame, tile, image: prepared, error: null };
      } catch (error) {
        return { track, frame, tile, image: null, error };
      }
    })).then((prepared) => {
      if (request !== combinedVisualRequest || destroyed) return;
      for (const { track, frame, tile, image: preparedImage, error } of prepared) {
        if (preparedImage) {
          const model = track.model ?? "NASA GEOS-FP";
          preparedImage.alt = `${localizedText(track.quantity, tile.title)} visualization from ${model}; ${frame.date ?? "time unavailable"}.`;
          preparedImage.className = "combined-frame-image";
          tile.media.replaceChildren(preparedImage);
        } else {
          tile.placeholder.textContent = error
            ? `Could not load the map for ${frame?.date ?? "this time"}.`
            : `No frame available for ${frame?.date ?? "this time"}.`;
          tile.media.replaceChildren(tile.placeholder);
        }
      }
    }).finally(() => {
      if (request === combinedVisualRequest) combinedGrid.removeAttribute("aria-busy");
    });
    combinedVisualPromise = pending;
    return pending;
  }
  function updateControls() {
    slider.disabled = !frames.length;
    slider.max = String(Math.max(0, frames.length - 1));
    slider.value = String(Math.max(0, frameIndex));
    if (playing) {
      slider.removeAttribute("aria-valuetext");
    } else if (frameIndex < 0) {
      slider.setAttribute("aria-valuetext", "No frame displayed; " + frames.length + " available");
    } else {
      const frame = frames[frameIndex];
      const regional = regionalTable?.values?.[frameIndex];
      const mean = regionalTable ? regional?.[0] : frame.mean;
      const coverage = regionalTable ? regional?.[3] : frame.coverage;
      const scope = regionalTable ? regionalTable.name + "; " : "Full-frame; ";
      const date = describeDate(frame.date) || frame.date || "time unavailable";
      const value = typeof mean === "number" ? mean.toFixed(2) + " " + activeTrack.unit : "value unavailable";
      const coverageText = typeof coverage === "number" ? (coverage * 100).toFixed(1) + "% valid pixel coverage" : "coverage unavailable";
      slider.setAttribute("aria-valuetext", scope + "frame " + (frameIndex + 1) + " of " + frames.length + "; " + date + "; mean " + value + "; " + coverageText);
    }
    setCurrentTableRow(frameIndex);
    count.textContent = `${frameIndex + 1} / ${frames.length}`;
    find("playback-state").textContent = playing ? "Playing" : "Paused";
    previous.disabled = frameIndex <= 0;
    next.disabled = !frames.length || frameIndex >= frames.length - 1;
    playButton.disabled = !frames.length;
    playButton.textContent = playing ? "Pause" : "Play";
    playButton.setAttribute("aria-pressed", String(playing));
  }

  function pause(message = "Playback paused.", release = true) {
    playing = false;
    window.clearTimeout(timer);
    timer = undefined;
    ++requestId;
    imageController?.abort();
    if (release) hooks.onPause?.();
    updateControls();
    hooks.onPlaybackState?.(playing);
    if (message) status.textContent = message;
  }

  async function showFrame(nextIndex, reason = "manual") {
    if (destroyed || !Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= frames.length) return false;
    const id = ++requestId;
    imageController?.abort();
    imageController = new AbortController();
    let objectURL;
    try {
      const frame = frames[nextIndex];
      const response = await fetch(new URL(encodeURIComponent(frame.file), frameDirectory), { signal: imageController.signal });
      if (!response.ok) throw new Error(`Image ${frame.file} failed to load (HTTP ${response.status}).`);
      objectURL = URL.createObjectURL(await response.blob());
      const decoded = new Image();
      decoded.src = objectURL;
      await decoded.decode();
      if (id !== requestId || destroyed) return false;
      renderReading(root, frame, activeTrack);
      image.src = objectURL;
      image.hidden = false;
      const model = activeTrack?.model ?? "NASA GEOS-FP";
      image.alt = `${localizedText(activeTrack?.quantity, "temperature")} visualization from ${model}. Frame values and dataset time are listed below.`;
      if (currentObjectURL) URL.revokeObjectURL(currentObjectURL);
      currentObjectURL = objectURL;
      objectURL = undefined;
      frameIndex = nextIndex;
      description.textContent = `${model} visualization. Pause to inspect the readings and their data limitations below.`;
      updateControls();
      // The primary image and the synchronized combined map frames are ready before playback advances.
      const frameUpdate = hooks.onFrame?.(frame, frameIndex, frames.length, reason === "playback" && !playing ? "paused" : reason, activeTrack, () => id === requestId && !destroyed);
      if (frameUpdate && typeof frameUpdate.then === "function") await frameUpdate;
      if (id !== requestId || destroyed) return false;
      return true;
    } catch (error) {
      if (id !== requestId || destroyed || error.name === "AbortError") return false;
      pause(`Could not display the frame. ${error.message} Try another frame or reload the track.`);
      return false;
    } finally {
      if (objectURL) URL.revokeObjectURL(objectURL);
    }
  }

  function schedule() {
    window.clearTimeout(timer);
    if (!playing) return;
    timer = window.setTimeout(async () => {
      timer = undefined;
      if (!playing) return;
      if (frameIndex >= frames.length - 1) return pause("End of track.");
      const displayed = await showFrame(frameIndex + 1, "playback");
      if (displayed && playing) {
        if (frameIndex === frames.length - 1) pause("End of track.", false);
        else schedule();
      }
    }, FRAME_INTERVAL_MS / playbackSpeed);
  }

  async function loadTrack(trackId) {
    const id = ++trackRequestId;
    hooks.onInteraction?.();
    pause("");
    trackController?.abort();
    trackController = new AbortController();
    frames = [];
    frameIndex = -1;
    regionalTable = null;
    renderTimeSeries();
    activeTrack = undefined;
    hooks.onTrackLoading?.();
    image.hidden = true;
    image.removeAttribute("src");
    if (currentObjectURL) URL.revokeObjectURL(currentObjectURL);
    currentObjectURL = undefined;
    find("demo-data").hidden = true;
    find("demo-notice").hidden = true;
    find("data-caveat").hidden = true;
    find("frame-readings").setAttribute("aria-describedby", "readings-help");
    renderReading(root, null);
    byId("normalization-range").textContent = "Normalization limits are unavailable.";
    find("note-status").textContent = "No frame selected.";
    description.textContent = "Loading frame data…";
    setTitle(trackId);
    updateControls();
    status.textContent = "Loading track…";
    byId("pixel-filter-method").textContent = "Loading color-filter settings…";
    try {
      const signal = trackController.signal;
      const track = await fetchJSON(`tracks/${encodeURIComponent(trackId)}.json`, signal);
      if (typeof track.frames !== "string" || !track.frames) throw new Error("Track metadata has no frames directory.");
      const directory = new URL(track.frames.endsWith("/") ? track.frames : `${track.frames}/`, document.baseURI);
      const expectedUnit = track.unit ?? track.colorbar?.unit;
      const data = validateFeatures(await fetchJSON(new URL("../features.json", directory), signal), trackId, expectedUnit);
      let colorbar = null;
      if (track.colorbar?.file) {
        try { colorbar = await fetchJSON(new URL("../colorbar.json", directory), signal); }
        catch (error) { if (error.name === "AbortError") throw error; }
      }
      if (id !== trackRequestId || destroyed) return;
      frameDirectory = directory;
      activeTrack = { ...track, unit: data.unit, statistics: data.statistics, sonification: data.sonification };
      frames = data.frames;
      regionalTable = null;
      renderTimeSeries();
      const experience = describeExperience(activeTrack);
      find("data-caveat").textContent = experience.caveat;
      find("data-caveat").hidden = data.mock || !experience.caveat;
      hooks.onTrack?.(activeTrack);
      hooks.onTrackData?.({ track: activeTrack, data, frames, frameDirectory, colorbar });
      byId("normalization-range").textContent = data.sonification?.input === "visualSignal" ? `Pixel color legend: ${data.vmin} to ${data.vmax} ${data.unit}. The visible signal index is dimensionless (0–1), not a physical concentration or speed.` : data.vmin === null ? "Normalization limits are unavailable." : `The supplied range is ${data.vmin} to ${data.vmax} ${data.unit}${data.mock ? " (demo values)" : ""}.`;
      setTitle(track.title?.en ?? trackId);
      select.selectedOptions[0].textContent = experience.name;
      find("demo-data").hidden = !data.mock;
      find("demo-notice").hidden = !data.mock;
      find("frame-readings").setAttribute("aria-describedby", `readings-help${data.mock ? " demo-notice" : ""}${!data.mock && experience.caveat ? " data-caveat" : ""}`);
      find("demo-data").title = "Simulated dataset values and dates for demonstration; not scientific measurements.";
      updateControls();
      status.textContent = `${frames.length} frames loaded.${data.mock ? " Demo data: simulated values and dates." : soundKind(activeTrack) === "wind" ? " Image-derived wind estimates with partial pixel coverage." : ""}`;
      await showFrame(0, "initial");
    } catch (error) {
      if (id === trackRequestId && !destroyed && error.name !== "AbortError") {
        description.textContent = "Track unavailable.";
        status.textContent = `Could not load the track. ${error.message}`;
      }
    }
  }

  function toggle() {
    if (!frames.length || destroyed) return;
    hooks.onInteraction?.();
    if (playing) return pause();
    playing = true;
    updateControls();
    hooks.onPlaybackState?.(playing);
    status.textContent = "Playback started.";
    if (frameIndex === frames.length - 1 || frameIndex < 0) {
      void showFrame(0, "playback").then((ok) => { if (ok && playing) schedule(); });
    } else {
      hooks.onFrame?.(frames[frameIndex], frameIndex, frames.length, "playback", activeTrack);
      schedule();
    }
  }

  function seek(position) {
    if (!Number.isInteger(position) || position < 0 || position >= frames.length) {
      updateControls();
      return;
    }
    hooks.onInteraction?.();
    pause("");
    status.textContent = "";
    if (position === frameIndex) return;
    void showFrame(position);
  }
  const step = (delta) => seek(Math.min(frames.length - 1, Math.max(0, frameIndex + delta)));
  playButton.addEventListener("click", toggle);
  previous.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  slider.addEventListener("input", () => seek(Number(slider.value)));
  find("playback-speed").addEventListener("change", event => {
    const speed = Number(event.target.value);
    if (![0.25, 0.5, 1, 1.5, 2].includes(speed)) return;
    playbackSpeed = speed;
    // A frame already loading finishes normally; its next timer uses the new pace.
    if (playing && timer !== undefined) schedule();
    status.textContent = `Playback speed: ${speed} times normal.`;
  });
  select.addEventListener("change", () => {
    root.querySelectorAll('input[name="earth-record"]').forEach(input => { input.checked = input.value === select.value; });
    void loadTrack(select.value);
  });
  const trackIds = Array.isArray(index?.tracks) ? index.tracks.filter((id) => typeof id === "string" && /^[\w-]+$/.test(id)) : [];
  for (const id of trackIds) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = ({ "clima-temperatura": "Temperature", "clima-vento": "Wind", "clima-chuva": "Precipitation", "clima-umidade": "Humidity", "ar-pm25": "Particulate matter (PM2.5)", "ar-co": "Carbon monoxide (CO)", "clima-ozonio": "Ozone" })[id] ?? id;
    select.append(option);
    const catalog = {
      "clima-temperatura": ["Temperature", "Organ", "#e68e65"],
      "clima-vento": ["Wind", "Flute", "#a7c8bb"],
      "clima-chuva": ["Precipitation", "Percussion", "#83b9d4"],
      "clima-umidade": ["Humidity", "Strings", "#c0b0d0"],
      "ar-pm25": ["PM2.5", "Metallic shimmer", "#dcba6b"],
      "ar-co": ["Carbon monoxide", "Brass", "#d59896"],
      "clima-ozonio": ["Ozone", "Plucked strings", "#9dc4a2"],
    };
    const [name, instrument, color] = catalog[id] ?? [option.textContent, "Earth sounds", "#a7c8bb"];
    const sleeve = document.createElement("label");
    sleeve.className = "record-sleeve";
    sleeve.style.setProperty("--record-color", color);
    const input = document.createElement("input");
    input.type = "radio"; input.name = "earth-record"; input.value = id;
    input.checked = id === trackIds[0];
    input.setAttribute("aria-label", `${option.textContent}, ${instrument}`);
    const cover = document.createElement("span"); cover.className = "record-cover"; cover.setAttribute("aria-hidden", "true");
    const number = document.createElement("span"); number.className = "record-number"; number.textContent = `0${trackIds.indexOf(id) + 1}`;
    const vinyl = document.createElement("span"); vinyl.className = "vinyl";
    const title = document.createElement("strong"); title.textContent = name;
    const subtitle = document.createElement("small"); subtitle.textContent = instrument;
    cover.append(number, vinyl); sleeve.append(input, cover, title, subtitle);
    input.addEventListener("focus", () => {
      const shelf = find("record-sleeves");
      if (shelf.scrollWidth <= shelf.clientWidth) return;
      const bounds = shelf.getBoundingClientRect(), record = sleeve.getBoundingClientRect();
      // Scroll only the record shelf, preserving the page's vertical position.
      if (record.left < bounds.left + 6) shelf.scrollLeft += record.left - bounds.left - 6;
      else if (record.right > bounds.right - 6) shelf.scrollLeft += record.right - bounds.right + 6;
    });
    input.addEventListener("change", () => {
      if (!input.checked) return;
      select.value = id;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    find("record-sleeves").append(sleeve);
  }
  if (trackIds.length) void loadTrack(trackIds[0]);
  else { select.disabled = true; status.textContent = "No tracks are available."; }

  return {
    toggle, step, pause, setCombinedFrames,
    setRegionalTable(value) {
      regionalTable = value;
      renderTimeSeries();
      updateControls();
    },
    get currentFrame() { return frames[frameIndex] ?? null; },
    get currentTrack() { return activeTrack; },
    get currentIndex() { return frameIndex; },
    get isPlaying() { return playing; },
    destroy() {
      destroyed = true;
      ++requestId;
      ++trackRequestId;
      pause("");
      imageController?.abort();
      trackController?.abort();
      if (currentObjectURL) URL.revokeObjectURL(currentObjectURL);
      root.replaceChildren();
    },
  };
}
