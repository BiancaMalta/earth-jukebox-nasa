// AI-assisted: OpenAI Codex
import { describeDate, fetchJSON, validateFeatures } from "../data/features.js";
import { renderReading } from "./readings.js";
import { describeExperience } from "./experience.js";
import { soundKind } from "../engine/mapping.js";
const FRAME_INTERVAL_MS = 250;

function localizedText(value, fallback) {
  if (typeof value === "string") return value;
  return value?.en ?? value?.pt ?? fallback;
}

export function initPlayer(index, hooks = {}) {
  const root = document.getElementById("player");
  root.innerHTML = `
    <div class="player-heading">
      <div><p class="eyebrow">Explore the Earth</p><h2 id="track-title">Earth player</h2></div>
      <span id="playback-state" class="playback-state">Paused</span>
    </div>
    <div class="track-toolbar"><label for="track-select">Experience</label><select id="track-select"></select><span id="demo-data" class="badge" hidden>Demo data</span></div>
    <p id="demo-notice" class="demo-notice" hidden><strong>Demonstration values.</strong> Dataset values and dates are simulated, not scientific measurements.</p>
    <p id="data-caveat" class="data-caveat" hidden></p>
    <figure class="player-visualization"><div class="frame-map"><img id="frame-image" alt="Global map of near-surface air temperature from NASA GEOS-FP." hidden width="1024" height="512"><svg id="region-overlay" viewBox="0 0 1024 512" aria-hidden="true" hidden></svg><div id="combined-frame-grid" class="combined-frame-grid" role="group" aria-label="Selected combined map frames" hidden></div></div><figcaption id="frame-description">Select a visualization to begin.</figcaption></figure>
    <section id="regional-explorer" class="regional-explorer" aria-labelledby="regional-heading" hidden>
      <div><p class="eyebrow">Explore a place</p><h3 id="regional-heading">Focus the map and listen to a region</h3><p class="control-help">Choose a country group or country. The area stays highlighted as the video plays, and Python-calculated regional values determine the reading and sound. Groups follow whole-country assignments, not physical continental boundaries.</p></div>
      <div class="region-controls">
        <label for="region-level">Explore by</label><select id="region-level"><option value="continent">Country group</option><option value="country">Country</option></select>
        <label for="region-continent">Country group</label><select id="region-continent"><option value="">Choose a country group</option></select>
        <label for="region-country" hidden>Country</label><select id="region-country" hidden disabled><option value="">Choose a country</option></select>
      </div>
      <p class="control-help">The Europe group includes all of Russia, including its Asian territory; the Asia group excludes Russia. Oceans are not included in these land groups.</p>
      <p id="region-status" class="status-text" role="status" aria-live="polite">Choose a country group to focus and hear its regional values.</p>
      <p id="region-current" class="regional-reading">No region selected. Playback uses the full-frame value.</p>
    </section>
    <dl id="frame-readings" class="frame-readings" aria-describedby="readings-help">
      <div class="reading reading--date"><dt>Dataset time</dt><dd><time id="frame-date">Unavailable</time><span id="frame-time" class="reading-detail">No frame selected</span></dd></div>
      <div class="reading"><dt id="measure-label">Dataset measure</dt><dd><span id="frame-mean">Unavailable</span><span id="measure-detail" class="reading-detail">Value and unit for this dataset</span><span id="coverage-detail" class="reading-detail" hidden></span></dd></div>
      <div class="reading"><dt id="sound-label">Mapped musical note</dt><dd><span id="current-note">Unavailable</span><span id="note-status" class="reading-detail">Enable sound to listen.</span></dd></div>
    </dl>
    <details id="time-series-panel" class="time-series-panel">
      <summary>View values by time</summary>
      <p id="time-series-scope" class="control-help">Full-frame estimates for this experience.</p>
      <div class="time-series-scroll" role="region" tabindex="0" aria-label="Time-series data table; scroll horizontally if needed">
        <table class="time-series-table">
          <caption id="time-series-caption">Values by frame</caption>
          <thead><tr><th scope="col">Date and time</th><th scope="col">Mean</th><th scope="col">P90</th><th scope="col">Coverage</th></tr></thead>
          <tbody id="time-series-body"></tbody>
        </table>
      </div>
    </details>
    <div class="normalized-reading">
      <div class="scale-heading"><label id="normalized-label" for="temperature-position">Normalized value</label><span id="normalized-value">Unavailable</span></div>
      <meter id="temperature-position" min="0" max="1" aria-describedby="normalization-help" hidden></meter>
      <div class="scale-endpoints" aria-hidden="true"><span id="scale-low">Lower · C3</span><span id="scale-high">Higher · C5</span></div>
    </div>
    <div class="player-controls transport" role="group" aria-label="Playback controls">
      <button id="previous-frame" type="button" aria-label="Previous frame" disabled><span aria-hidden="true">←</span> Previous</button>
      <button id="play-pause" class="primary-button" type="button" aria-pressed="false" disabled>Play</button>
      <button id="next-frame" type="button" aria-label="Next frame" disabled>Next <span aria-hidden="true">→</span></button>
    </div>
    <div class="frame-progress"><label for="frame-position">Frame position</label><span id="frame-count">0 / 0</span><input id="frame-position" type="range" min="0" max="0" value="0" aria-describedby="frame-position-help" disabled></div>
    <p id="frame-position-help" class="control-help">Use the arrow keys on this slider to select a frame. Selecting a frame pauses playback.</p>
    <p id="player-status" role="status" aria-atomic="true">Loading visualizations…</p>`;
  const find = (id) => root.querySelector(`#${id}`);
  const select = find("track-select"), image = find("frame-image"), slider = find("frame-position"), combinedGrid = find("combined-frame-grid");
  const playButton = find("play-pause"), previous = find("previous-frame"), next = find("next-frame");
  const status = find("player-status"), count = find("frame-count"), description = find("frame-description");
  let frames = [], frameIndex = -1, frameDirectory, activeTrack, playing = false, timer;
  let requestId = 0, trackRequestId = 0, imageController, trackController, currentObjectURL;
  let destroyed = false;
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

  function setCombinedFrames(entries) {
    if (!Array.isArray(entries)) {
      combinedGrid.replaceChildren();
      combinedGrid.hidden = true;
      combinedGrid.className = "combined-frame-grid";
      root.querySelector(".frame-map").classList.remove("frame-map--combined-multiple");
      image.hidden = !image.getAttribute("src");
      return;
    }
    const selected = entries.filter((entry) => entry?.track);
    if (!selected.length) {
      combinedGrid.replaceChildren();
      combinedGrid.hidden = true;
      combinedGrid.className = "combined-frame-grid";
      root.querySelector(".frame-map").classList.remove("frame-map--combined-multiple");
      image.hidden = !image.getAttribute("src");
      return;
    }
    const multiple = selected.length > 1;
    combinedGrid.replaceChildren();
    combinedGrid.className = "combined-frame-grid" + (multiple ? " combined-frame-grid--multiple" : " combined-frame-grid--single");
    root.querySelector(".frame-map").classList.toggle("frame-map--combined-multiple", multiple);
    combinedGrid.style.setProperty("--combined-count", String(selected.length));
    for (const { track, frame } of selected) {
      const title = track.title?.en ?? track.title?.pt ?? localizedText(track.quantity, track.id ?? "Dataset");
      const tile = document.createElement("figure");
      tile.className = "combined-frame";
      if (frame?.file && track.frames) {
        const directory = new URL(track.frames.endsWith("/") ? track.frames : `${track.frames}/`, document.baseURI);
        const tileImage = document.createElement("img");
        tileImage.src = new URL(encodeURIComponent(frame.file), directory).href;
        const model = track.model ?? "NASA GEOS-FP";
        tileImage.alt = `${localizedText(track.quantity, title)} visualization from ${model}; ${frame.date ?? "time unavailable"}.`;
        tileImage.loading = "eager";
        tile.append(tileImage);
      } else {
        const missing = document.createElement("p");
        missing.className = "combined-frame-missing";
        missing.textContent = `No frame available for ${frame?.date ?? "this time"}.`;
        tile.append(missing);
      }
      const caption = document.createElement("figcaption");
      caption.textContent = title;
      tile.append(caption);
      combinedGrid.append(tile);
    }
    combinedGrid.hidden = false;
    image.hidden = true;
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
      // Image decoding completes before the frame event; audio has no frame clock.
      hooks.onFrame?.(frame, frameIndex, frames.length, reason === "playback" && !playing ? "paused" : reason, activeTrack);
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
    }, FRAME_INTERVAL_MS);
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
    document.getElementById("normalization-range").textContent = "Normalization limits are unavailable.";
    find("note-status").textContent = "No frame selected.";
    description.textContent = "Loading frame data…";
    find("track-title").textContent = trackId;
    updateControls();
    status.textContent = "Loading track…";
    document.getElementById("pixel-filter-method").textContent = "Loading color-filter settings…";
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
      document.getElementById("normalization-range").textContent = data.sonification?.input === "visualSignal" ? `Pixel color legend: ${data.vmin} to ${data.vmax} ${data.unit}. The visible signal index is dimensionless (0–1), not wind speed.` : data.vmin === null ? "Normalization limits are unavailable." : `The supplied range is ${data.vmin} to ${data.vmax} ${data.unit}${data.mock ? " (demo values)" : ""}.`;
      find("track-title").textContent = track.title?.en ?? trackId;
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
  select.addEventListener("change", () => { void loadTrack(select.value); });
  const trackIds = Array.isArray(index?.tracks) ? index.tracks.filter((id) => typeof id === "string" && /^[\w-]+$/.test(id)) : [];
  for (const id of trackIds) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = ({ "clima-temperatura": "Temperature", "clima-vento": "Wind", "clima-chuva": "Precipitation", "clima-umidade": "Humidity", "ar-pm25": "Particulate matter (PM2.5)", "ar-co": "Carbon monoxide (CO)", "clima-ozonio": "Ozone" })[id] ?? id;
    select.append(option);
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
