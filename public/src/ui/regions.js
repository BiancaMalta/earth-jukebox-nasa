// AI-assisted: OpenAI Codex
import { fetchJSON } from "../data/features.js";
import { validateRegionalFeatures, regionalFrame } from "../data/regions.js";

const GEOJSON_URL = "data/world-countries.geojson";
const SVG_NS = "http://www.w3.org/2000/svg";
const WIDTH = 1024, HEIGHT = 512;

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

export function initRegionalExplorer({ onSelection = () => {}, onValueChange = () => {} } = {}) {
  let root, level, continentSelect, countrySelect, countryLabel, status, currentText;
  let geojson, activeTrack, activeData, activeFrames, frameDirectory, regionalData;
  let selectedFeatures = [], series = [], seriesState = "idle", currentIndex = 0, requestId = 0, controller;
  let outline, maskCutout, geoPromise;

  function selectedName() {
    return level.value === "continent" ? continentSelect.value : countrySelect.selectedOptions[0]?.textContent;
  }

  function updateFrame(index) {
    currentIndex = index;
    if (!selectedFeatures.length) return;
    const point = series[index];
    currentText.textContent = !point || point[0] === null
      ? `${selectedName()}: no regional value is available for this frame. Regional audio is silent.`
      : `${selectedName()}, ${activeData.frames[index]?.date ?? `frame ${index + 1}`}: ${formatNumber(point[0], activeData.unit)}. ${(point[3] * 100).toFixed(1)}% of the region has valid decoded pixels; playback sounds this regional value.`;
  }

  function setGeometry(features) {
    selectedFeatures = features;
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
      track: { ...activeTrack, measure: `${selectedName()} mean` },
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
    status.textContent = `Loading Python-calculated values for ${name}…`;
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
      status.textContent = `${name}: Python-calculated regional values are ready. Playback now uses this region.`;
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
    const id = ++requestId; controller?.abort(); series = []; seriesState = "idle"; selectedFeatures = [];
    activeTrack = track; activeData = data; activeFrames = frames; frameDirectory = directory; regionalData = null; currentIndex = 0; root.hidden = true;
    if (!geojson && geoPromise) {
      try { geojson = await geoPromise; }
      catch (error) { status.textContent = `Regional boundaries could not be loaded. ${error.message}`; }
    }
    if (id !== requestId) return;
    root.hidden = !geojson || data.mock || data.vmin === null || data.vmax === null;
    status.textContent = root.hidden ? "Regional exploration is unavailable for this visualization." : "Choose a continent to focus and hear its regional values.";
    setGeometry([]);
    if (!root.hidden) {
      continentSelect.replaceChildren(new Option("Choose a continent", ""));
      const names = [...new Set(geojson.features.map((feature) => feature.properties.CONTINENT).filter(Boolean))].sort();
      for (const name of names) continentSelect.add(new Option(name, name));
      countrySelect.replaceChildren(new Option("Choose a country", ""));
      countrySelect.disabled = true;
      currentText.textContent = "No region selected. Playback uses the full-frame value.";
    }
    onSelection();
  }

  function changeContinent() {
    ++requestId; controller?.abort(); series = [];
    countrySelect.replaceChildren(new Option("Choose a country", ""));
    const candidates = continentSelect.value ? continentFeatures(continentSelect.value) : [];
    for (const feature of candidates) {
      const name = feature.properties.NAME_EN || feature.properties.ADMIN || feature.properties.NAME;
      countrySelect.add(new Option(name, String(geojson.features.indexOf(feature))));
    }
    [...countrySelect.options].slice(1).sort((a, b) => a.text.localeCompare(b.text)).forEach((option) => countrySelect.append(option));
    countrySelect.disabled = !continentSelect.value;
    if (level.value === "continent" && continentSelect.value) {
      setGeometry(candidates);
    } else setGeometry([]);
    currentText.textContent = continentSelect.value ? "Choose a country to focus its map area." : "No region selected. Playback uses the full-frame value.";
    onSelection();
    if (selectedFeatures.length) void loadRegionalValues();
  }

  function changeLevel() {
    ++requestId; controller?.abort(); series = [];
    const isCountry = level.value === "country";
    countrySelect.hidden = countryLabel.hidden = !isCountry;
    // Reset the country selector and choose the appropriate continent geometry.
    changeContinent();
  }

  function changeCountry() {
    ++requestId; controller?.abort(); series = [];
    const feature = countrySelect.value === "" ? null : geojson.features[Number(countrySelect.value)];
    setGeometry(feature ? [feature] : []);
    currentText.textContent = "Choose a country to focus its map area.";
    onSelection();
    if (feature) void loadRegionalValues();
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
    destroy() { ++requestId; controller?.abort(); },
  };
}
