import { rankRegionSuggestions, filterRegionSuggestions } from "./regionSuggestions.js";
// AI-assisted: OpenAI Codex
import { describePixelCoverage } from "./readings.js";
import { fetchJSON } from "../data/features.js";
import { validateRegionalFeatures, regionalFrame } from "../data/regions.js";

const GEOJSON_URL = "data/world-countries.geojson";
const SVG_NS = "http://www.w3.org/2000/svg";
const WIDTH = 1024, HEIGHT = 512;

export function regionDisplayName(key) {
  if (key === "continent:Seven seas (open ocean)") return "Oceanic island territories";
  const name = key.slice(key.indexOf(":") + 1);
  return name;
}


function polygons(geometry) {
  if (geometry?.type === "Polygon") return [geometry.coordinates];
  if (geometry?.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function xy([longitude, latitude]) {
  return [(longitude + 180) / 360 * WIDTH, (90 - latitude) / 180 * HEIGHT];
}

function outlinePath(features) {
  let path = "";
  for (const feature of features) {
    for (const polygon of polygons(feature.geometry)) {
      for (const ring of polygon) {
        if (!ring.length) continue;
        const start = xy(ring[0]);
        path += `M${start[0].toFixed(2)},${start[1].toFixed(2)}`;
        let previousLongitude = ring[0][0];
        for (let index = 1; index < ring.length; index += 1) {
          const [longitude, latitude] = ring[index];
          const [x, y] = xy([longitude, latitude]);
          path += Math.abs(longitude - previousLongitude) > 180
            ? `M${x.toFixed(2)},${y.toFixed(2)}`
            : `L${x.toFixed(2)},${y.toFixed(2)}`;
          previousLongitude = longitude;
        }
        path += "Z";
      }
    }
  }
  return path;
}

function formatNumber(value, unit) {
  return value === null ? "No data" : `${value.toFixed(2)} ${unit}`;
}

export function initRegionalExplorer({ onSelection = () => {}, onValueChange = () => {}, onPreviewRequest = () => Promise.resolve(), onPreviewReady = () => {} } = {}) {
  let root, level, continentSelect, countrySelect, countryLabel, status, currentText;
  let geojson, activeTrack, activeData, activeFrames, frameDirectory, regionalData;
  let selectedFeatures = [], series = [], seriesState = "idle", currentIndex = 0, requestId = 0, controller;
  let outline, maskCutout, geoPromise;
  let scope = "world";
  let rankedSuggestions = [], suggestionVersion = 0;
  function renderSuggestions() {
    const container = document.getElementById("region-suggestions");
    if (!container) return;
    const countries = new Map(geojson?.features.map(feature => [feature.properties.NAME_EN || feature.properties.ADMIN || feature.properties.NAME, feature.properties.CONTINENT]) ?? []);
    const choices = filterRegionSuggestions(rankedSuggestions, scope, continentSelect.value, countries);
    container.replaceChildren();
    for (const item of choices) {
      const button = document.createElement("button"); button.type = "button";
      button.className = "place-track";
      button.setAttribute("data-spoken-description", "Select this place and start sound playback.");
      button.dataset.suggestionKey = item.key;
      const disc = document.createElement("span"); disc.className = "place-track-disc"; disc.setAttribute("aria-hidden", "true");
      const label = document.createElement("span"); label.className = "place-track-label";
      const name = document.createElement("strong"); name.textContent = regionDisplayName(item.key);
      const type = document.createElement("small"); type.textContent = item.kind === "country" ? "Country" : "Region";
      label.append(name, type);
      button.append(disc, label);
      button.addEventListener("click", async () => {
        const audioReady = Promise.resolve(onPreviewRequest()).then(() => true, () => false);
        let loading;
        if (item.kind === "continent") {
          level.value = "continent"; scope = "continent"; continentSelect.value = item.name; loading = changeLevel();
        } else {
          level.value = "country"; scope = "country";
          continentSelect.value = countries.get(item.name) ?? ""; changeLevel();
          const option = [...countrySelect.options].find(option => option.textContent === item.name);
          countrySelect.value = option?.value ?? ""; loading = changeCountry();
        }
        const selectionRequest = requestId;
        const [enabled] = await Promise.all([audioReady, loading]);
        if (selectionRequest !== requestId || seriesState !== "ready" || !enabled) return;
        const updatedButton = [...container.querySelectorAll("button")].find(candidate => candidate.dataset.suggestionKey === item.key);
        const focusTarget = updatedButton ?? (item.kind === "country" ? countrySelect : continentSelect);
        focusTarget.focus({ preventScroll: true });
        onPreviewReady();
      });
      container.append(button);
    }
    document.getElementById("region-suggestions-heading").textContent = scope === "world" ? "Suggested listening · Regions & countries" : scope === "country" ? `Suggested listening · Countries${continentSelect.value ? " in " + regionDisplayName("continent:" + continentSelect.value) : ""}` : "Suggested listening · Regions";
    document.getElementById("region-suggestions-help").textContent = rankedSuggestions.length ? (choices.length ? "Suggested for changing sounds in this record, with values available in at least 80% of frames. Same sound scale for every place." : "No places in this selection have enough available frames and sound changes to recommend.") : "No suggestions available for this record.";
  }

  function syncAreaControls() {
    renderSuggestions();
    if (continentSelect.options[0]) continentSelect.options[0].textContent = scope === "country" ? "All regions" : "Choose a region";
    document.querySelectorAll('input[name="region-scope"]').forEach(input => { input.checked = input.value === scope; });
    document.getElementById("region-group-field").hidden = scope === "world";
    document.getElementById("region-country-field").hidden = scope !== "country";
    document.getElementById("region-reset").hidden = scope === "world";
    document.getElementById("region-summary-place").textContent = selectedFeatures.length ? selectedDisplayName() : scope === "world" ? "Whole map" : scope === "country" ? "Choose a country" : "Choose a region";
    document.getElementById("region-selection-name").textContent = selectedFeatures.length ? selectedDisplayName() : "Whole map";
  }

  function selectedName() {
    return level.value === "continent" ? continentSelect.value : countrySelect.selectedOptions[0]?.textContent;
  }

  function selectedDisplayName() {
    return regionDisplayName(`${level.value}:${selectedName()}`);
  }

  function updateFrame(index) {
    currentIndex = index;
    if (!selectedFeatures.length) return;
    if (seriesState === "loading") {
      currentText.textContent = `${selectedDisplayName()}: loading regional values…`;
      return;
    }
    if (seriesState === "error") {
      currentText.textContent = `${selectedDisplayName()}: regional values could not be loaded. Retry selecting this place.`;
      return;
    }
    const point = series[index];
    currentText.textContent = !point || point[0] === null
      ? `${selectedDisplayName()}: this record has no regional value for this frame. Its instrument is silent; other combined layers or the time pulse may still sound.`
      : `${selectedDisplayName()}, ${activeData.frames[index]?.date ?? `frame ${index + 1}`}: ${formatNumber(point[0], activeData.unit)}. ${describePixelCoverage(point[3])} within this region; playback sounds this regional value.`;
  }

  function setGeometry(features) {
    selectedFeatures = features;
    syncAreaControls();
    series = [];
    seriesState = features.length ? "loading" : "idle";
    const path = outlinePath(features);
    outline.setAttribute("d", path);
    maskCutout.setAttribute("d", path);
    outline.hidden = !features.length;
    document.getElementById("region-overlay").hidden = !features.length;
  }

  function continentFeatures(name) {
    return geojson.features.filter((feature) => feature.properties.CONTINENT === name);
  }

  function getFrame(frame, index) {
    if (!selectedFeatures.length) return { frame, track: activeTrack, selected: false };
    return {
      frame: regionalFrame(frame, series[index]),
      track: { ...activeTrack, measure: `${selectedDisplayName()} · ${activeTrack.statistics?.mean === "area_weighted" ? "area-weighted image mean" : "image-pixel mean"}` },
      selected: true,
    };
  }

  async function loadRegionalValues() {
    if (!selectedFeatures.length || !activeFrames?.length) return;
    const id = ++requestId;
    controller?.abort(); controller = new AbortController();
    const signal = controller.signal;
    const name = selectedName();
    const key = `${level.value}:${name}`;
    const displayName = selectedDisplayName();
    status.textContent = `Loading Python-calculated values for ${displayName}…`;
    series = [];
    seriesState = "loading";
    updateFrame(currentIndex);
    onValueChange();
    try {
      const data = regionalData ?? validateRegionalFeatures(
        await fetchJSON(new URL("../regions.json", frameDirectory), signal), activeTrack, activeData,
      );
      if (id !== requestId || signal.aborted) return;
      regionalData = data;
      if (!Object.hasOwn(data.regions, key)) throw new Error("This region has no precomputed data.");
      series = data.regions[key].values;
      seriesState = "ready";
      status.textContent = `${displayName}: Python-calculated regional values are ready. Playback now uses this region.`;
      updateFrame(currentIndex);
      onValueChange();
    } catch (error) {
      if (id !== requestId || error.name === "AbortError") return;
      series = [];
      seriesState = "error";
      status.textContent = `Could not load this region. ${error.message} Regional audio remains silent.`;
      updateFrame(currentIndex);
      onValueChange();
    }
  }

  async function configure({ track, data, frames, frameDirectory: directory }) {
    const version = ++suggestionVersion; rankedSuggestions = [];
    const id = ++requestId; controller?.abort(); series = []; seriesState = "idle"; selectedFeatures = [];
    activeTrack = track; activeData = data; activeFrames = frames; frameDirectory = directory; regionalData = null; currentIndex = 0; root.hidden = true;
    if (!geojson && geoPromise) {
      try { geojson = await geoPromise; }
      catch (error) { status.textContent = `Regional boundaries could not be loaded. ${error.message}`; }
    }
    if (id !== requestId) return;
    root.hidden = !geojson || data.mock || data.vmin === null || data.vmax === null;
    document.getElementById("region-options").hidden = root.hidden;
    status.textContent = root.hidden ? "Regional exploration is unavailable for this visualization." : "Choose a region to focus and hear its regional values.";
    scope = "world";
    level.value = "continent";
    setGeometry([]);
    if (!root.hidden) {
      continentSelect.replaceChildren(new Option("Choose a region", ""));
      const names = [...new Set(geojson.features.map((feature) => feature.properties.CONTINENT).filter(Boolean))].sort();
      for (const name of names) continentSelect.add(new Option(regionDisplayName(`continent:${name}`), name));
      countrySelect.replaceChildren(new Option("Choose a country", ""));
      countrySelect.disabled = true;
      currentText.textContent = "No region selected. Playback uses the full-frame value.";
    }
    onSelection();
    if (!root.hidden) {
      document.getElementById("region-suggestions-help").textContent = "Finding places with varied sounds in this record…";
      try {
        const result = validateRegionalFeatures(await fetchJSON(new URL("../regions.json", directory)), track, data);
        if (version !== suggestionVersion) return;
        regionalData = result;
        rankedSuggestions = rankRegionSuggestions(result, track);
        renderSuggestions();
      } catch {
        if (version === suggestionVersion) document.getElementById("region-suggestions-help").textContent = "Suggestions could not load. You can still choose any region or country.";
      }
    }
  }

  function changeContinent() {
    ++requestId; controller?.abort(); series = [];
    countrySelect.replaceChildren(new Option("Choose a country", ""));
    const candidates = continentSelect.value ? continentFeatures(continentSelect.value) : level.value === "country" ? geojson.features : [];
    for (const feature of candidates) {
      const name = feature.properties.NAME_EN || feature.properties.ADMIN || feature.properties.NAME;
      countrySelect.add(new Option(name, String(geojson.features.indexOf(feature))));
    }
    [...countrySelect.options].slice(1).sort((a, b) => a.text.localeCompare(b.text)).forEach((option) => countrySelect.append(option));
    countrySelect.disabled = !candidates.length;
    if (level.value === "continent" && continentSelect.value) {
      setGeometry(candidates);
    } else setGeometry([]);
    status.textContent = selectedFeatures.length ? "Preparing regional values…" : "Choose a place. Until then, playback uses the whole map.";
    currentText.textContent = selectedFeatures.length ? "Loading the selected region…" : "Playback uses the full-frame value.";
    onSelection();
    if (selectedFeatures.length) return loadRegionalValues();
  }

  function changeLevel() {
    ++requestId; controller?.abort(); series = [];
    const isCountry = level.value === "country";
    scope = level.value;
    countrySelect.hidden = countryLabel.hidden = !isCountry;
    // Reset the country selector and choose the appropriate continent geometry.
    return changeContinent();
  }

  function changeCountry() {
    ++requestId; controller?.abort(); series = [];
    const feature = countrySelect.value === "" ? null : geojson.features[Number(countrySelect.value)];
    setGeometry(feature ? [feature] : []);
    currentText.textContent = "Choose a country to focus its map area.";
    onSelection();
    if (feature) return loadRegionalValues();
  }

  function chooseScope(value) {
    continentSelect.value = "";
    countrySelect.replaceChildren(new Option("Choose a country", ""));
    countrySelect.disabled = true;
    scope = value;
    if (value !== "world") {
      level.value = value;
      changeLevel();
    } else {
      ++requestId; controller?.abort();
      continentSelect.value = ""; countrySelect.value = "";
      setGeometry([]);
      currentText.textContent = "Playback uses the full-frame value.";
      status.textContent = "Listening to the whole map. Choose another place whenever you like.";
      onSelection();
    }
  }

  try {
    root = document.getElementById("regional-explorer");
    level = document.getElementById("region-level");
    continentSelect = document.getElementById("region-continent");
    countrySelect = document.getElementById("region-country");
    countryLabel = countrySelect.previousElementSibling;
    status = document.getElementById("region-status"); currentText = document.getElementById("region-current");
    const overlay = document.getElementById("region-overlay");
    const defs = document.createElementNS(SVG_NS, "defs");
    const mask = document.createElementNS(SVG_NS, "mask"); mask.id = "region-dim-mask";
    mask.setAttribute("maskUnits", "userSpaceOnUse"); mask.setAttribute("x", "0"); mask.setAttribute("y", "0"); mask.setAttribute("width", String(WIDTH)); mask.setAttribute("height", String(HEIGHT));
    const maskBackground = document.createElementNS(SVG_NS, "rect"); maskBackground.setAttribute("width", String(WIDTH)); maskBackground.setAttribute("height", String(HEIGHT)); maskBackground.setAttribute("fill", "white"); mask.append(maskBackground);
    maskCutout = document.createElementNS(SVG_NS, "path"); maskCutout.setAttribute("class", "region-mask-cutout"); maskCutout.setAttribute("fill", "black"); maskCutout.setAttribute("fill-rule", "evenodd"); mask.append(maskCutout);
    defs.append(mask); overlay.append(defs);
    const dim = document.createElementNS(SVG_NS, "rect"); dim.setAttribute("class", "region-dim"); dim.setAttribute("width", String(WIDTH)); dim.setAttribute("height", String(HEIGHT)); dim.setAttribute("mask", "url(#region-dim-mask)"); overlay.append(dim);
    outline = document.createElementNS(SVG_NS, "path"); outline.setAttribute("class", "region-outline"); overlay.append(outline);
    level.addEventListener("change", changeLevel);
    continentSelect.addEventListener("change", changeContinent);
    countrySelect.addEventListener("change", changeCountry);
    document.querySelectorAll('input[name="region-scope"]').forEach(input => input.addEventListener("change", () => { if (input.checked) chooseScope(input.value); }));
    document.getElementById("region-reset").addEventListener("click", () => {
      chooseScope("world");
      document.querySelector('input[name="region-scope"][value="world"]').focus();
    });
    geoPromise = fetch(GEOJSON_URL).then((response) => {
      if (!response.ok) throw new Error(`World boundaries failed to load (HTTP ${response.status}).`);
      return response.json();
    });
    geoPromise.catch((error) => {
      status.textContent = `Regional boundaries could not be loaded. ${error.message}`;
    });
  } catch (error) { console.error("Regional explorer initialization failed.", error); }

  return {
    configure,
    setFrame: updateFrame,
    getFrame,
    hasSelection: () => selectedFeatures.length > 0,
    selectionKey: () => selectedFeatures.length ? `${level.value}:${selectedName()}` : null,
    getTableData: () => selectedFeatures.length ? { name: selectedName(), values: series, state: seriesState } : null,
    destroy() { ++suggestionVersion; ++requestId; controller?.abort(); },
  };
}
