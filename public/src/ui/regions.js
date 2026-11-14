// AI-assisted: OpenAI Codex
const GEOJSON_URL = "data/world-countries.geojson";
const SVG_NS = "http://www.w3.org/2000/svg";
const WIDTH = 1024, HEIGHT = 512;
const EXCLUDED = (x, y) => (x < 176 && y < 42) || (x < 336 && y >= 462);

function polygons(geometry) {
  if (geometry?.type === "Polygon") return [geometry.coordinates];
  if (geometry?.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function xy([longitude, latitude]) {
  return [(longitude + 180) / 360 * WIDTH, (90 - latitude) / 180 * HEIGHT];
}

function appendRing(context, ring) {
  if (!ring.length) return;
  const [firstX, firstY] = xy(ring[0]);
  context.moveTo(firstX, firstY);
  let previousLongitude = ring[0][0];
  for (let index = 1; index < ring.length; index += 1) {
    const [longitude, latitude] = ring[index];
    const [x, y] = xy([longitude, latitude]);
    // Natural Earth polygons are already split at the antimeridian except for
    // occasional duplicate seam points. Avoid a spurious line across the map.
    if (Math.abs(longitude - previousLongitude) > 180) context.moveTo(x, y);
    else context.lineTo(x, y);
    previousLongitude = longitude;
  }
  context.closePath();
}

function drawSelection(context, features) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.beginPath();
  for (const feature of features) {
    for (const polygon of polygons(feature.geometry)) {
      context.beginPath();
      for (const ring of polygon) appendRing(context, ring);
      context.fill("evenodd");
    }
  }
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

function paletteMatcher(samples, filter) {
  const colors = samples.map((sample) => sample.rgb);
  const values = samples.map((sample) => sample.value);
  const cache = new Map();
  return (red, green, blue) => {
    const key = (red << 16) | (green << 8) | blue;
    if (cache.has(key)) return cache.get(key);
    let bestDistance = Infinity, bestValue = 0;
    for (let index = 0; index < colors.length; index += 1) {
      const dr = red - colors[index][0], dg = green - colors[index][1], db = blue - colors[index][2];
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);
      if (distance < bestDistance) { bestDistance = distance; bestValue = values[index]; }
    }
    const maximum = Math.max(red, green, blue), minimum = Math.min(red, green, blue);
    const saturation = maximum === 0 ? 0 : (maximum - minimum) * 255 / maximum;
    const result = saturation >= filter.minSaturation && bestDistance <= filter.maxColorDistance && bestValue <= filter.maxValue
      ? bestValue : null;
    cache.set(key, result);
    return result;
  };
}

function formatNumber(value, unit) {
  return value === null ? "No data" : `${value.toFixed(2)} ${unit}`;
}

export function initRegionalExplorer({ onSelection = () => {}, onValueChange = () => {} } = {}) {
  let root, level, continentSelect, countrySelect, countryLabel, status, currentText;
  let geojson, activeTrack, activeData, activeFrames, frameDirectory, colorbar;
  let selectedFeatures = [], series = [], currentIndex = 0, requestId = 0, controller;
  let selectionCanvas, selectionContext, outline, maskCutout, geoPromise;

  function selectedName() {
    return level.value === "continent" ? continentSelect.value : countrySelect.selectedOptions[0]?.textContent;
  }

  function updateFrame(index) {
    currentIndex = index;
    if (!selectedFeatures.length) return;
    const point = series[index];
    currentText.textContent = point?.value === null || !point
      ? `${selectedName()}: no confidently matched pixels in this frame. Regional audio is silent until the value is available.`
      : `${selectedName()}, ${activeData.frames[index]?.date ?? `frame ${index + 1}`}: ${formatNumber(point.value, activeData.unit)}. ${point.coverage.toFixed(1)}% of the region has valid colored pixels; playback sounds this regional value.`;
  }

  function setGeometry(features) {
    selectedFeatures = features;
    drawSelection(selectionContext, features);
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
    const point = series[index];
    const value = point?.value ?? null;
    const normalized = value === null ? null : Math.max(0, Math.min(1, (value - colorbar.vmin) / (colorbar.vmax - colorbar.vmin)));
    return {
      frame: { ...frame, mean: value, norm: normalized, coverage: point?.coverage ?? null },
      track: { ...activeTrack, measure: `${selectedName()} mean` },
      selected: true,
    };
  }

  async function calculate() {
    if (!selectedFeatures.length || !activeFrames?.length) return;
    const id = ++requestId;
    controller?.abort(); controller = new AbortController();
    const signal = controller.signal;
    status.textContent = `Calculating ${selectedName()} across ${activeFrames.length} frames…`;
    countrySelect.disabled = level.value === "country" && !continentSelect.value;
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = WIDTH; maskCanvas.height = HEIGHT;
    const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
    drawSelection(maskContext, selectedFeatures);
    const mask = maskContext.getImageData(0, 0, WIDTH, HEIGHT).data;
    const indices = [];
    for (let y = 0; y < HEIGHT; y += 1) for (let x = 0; x < WIDTH; x += 1) {
      const pixel = y * WIDTH + x;
      if (mask[pixel * 4 + 3] && !EXCLUDED(x, y)) indices.push(pixel * 4);
    }
    if (!indices.length) { status.textContent = "No map pixels fall inside this boundary."; return; }
    const matchColor = paletteMatcher(colorbar.samples, {
      minSaturation: 40,
      maxColorDistance: 30,
      maxValue: colorbar.visibleMax ?? colorbar.vmax,
      ...colorbar.pixelFilter,
    });
    const canvas = document.createElement("canvas"); canvas.width = WIDTH; canvas.height = HEIGHT;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const results = [];
    series = [];
    updateFrame(currentIndex);
    onValueChange();
    try {
      for (let index = 0; index < activeFrames.length; index += 1) {
        if (id !== requestId || signal.aborted) return;
        const response = await fetch(new URL(encodeURIComponent(activeFrames[index].file), frameDirectory), { signal });
        if (!response.ok) throw new Error(`Frame ${index + 1} failed to load (HTTP ${response.status}).`);
        const bitmap = await createImageBitmap(await response.blob());
        context.clearRect(0, 0, WIDTH, HEIGHT); context.drawImage(bitmap, 0, 0, WIDTH, HEIGHT); bitmap.close();
        const pixels = context.getImageData(0, 0, WIDTH, HEIGHT).data;
        let sum = 0, count = 0;
        for (const offset of indices) {
          const value = matchColor(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
          if (value !== null) { sum += value; count += 1; }
        }
        results.push({ value: count ? sum / count : null, coverage: count / indices.length, date: activeFrames[index].date });
        if (index % 8 === 7 || index === activeFrames.length - 1) {
          status.textContent = `Calculating ${selectedName()}… ${index + 1} of ${activeFrames.length} frames.`;
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
      }
      if (id !== requestId) return;
      series = results;
      status.textContent = `${selectedName()}: regional values are ready. Playback now uses this region.`;
      updateFrame(currentIndex);
      onValueChange();
    } catch (error) {
      if (id !== requestId || error.name === "AbortError") return;
      status.textContent = `Could not calculate this region. ${error.message}`;
    }
  }

  async function configure({ track, data, frames, frameDirectory: directory, colorbar: legend }) {
    const id = ++requestId; controller?.abort(); series = []; selectedFeatures = [];
    activeTrack = track; activeData = data; activeFrames = frames; frameDirectory = directory; colorbar = legend;
    if (!geojson && geoPromise) {
      try { geojson = await geoPromise; }
      catch (error) { status.textContent = `Regional boundaries could not be loaded. ${error.message}`; }
    }
    if (id !== requestId) return;
    root.hidden = !legend?.samples?.length || !geojson;
    status.textContent = root.hidden ? "Regional exploration is unavailable for this visualization." : "Choose a continent to focus and hear its regional values.";
    setGeometry([]);
    if (!root.hidden) {
      continentSelect.replaceChildren(new Option("Choose a continent", ""));
      const names = [...new Set(geojson.features.map((feature) => feature.properties.CONTINENT).filter(Boolean))].sort();
      for (const name of names) continentSelect.add(new Option(name, name));
      countrySelect.replaceChildren(new Option("Choose a country", ""));
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
      setGeometry(candidates); void calculate();
    } else setGeometry([]);
    currentText.textContent = continentSelect.value ? "Choose a country to focus its map area." : "No region selected. Playback uses the full-frame value.";
    onSelection();
  }

  function changeLevel() {
    ++requestId; controller?.abort(); series = [];
    const isCountry = level.value === "country";
    countrySelect.hidden = countryLabel.hidden = !isCountry;
    if (!isCountry && continentSelect.value) { setGeometry(continentFeatures(continentSelect.value)); void calculate(); }
    else setGeometry([]);
    if (isCountry && continentSelect.value) changeContinent();
    else currentText.textContent = "No region selected. Playback uses the full-frame value.";
    onSelection();
  }

  function changeCountry() {
    ++requestId; controller?.abort(); series = [];
    const feature = geojson.features[Number(countrySelect.value)];
    setGeometry(feature ? [feature] : []);
    if (feature) void calculate();
    else currentText.textContent = "Choose a country to focus its map area.";
    onSelection();
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
    selectionCanvas = document.createElement("canvas"); selectionCanvas.width = WIDTH; selectionCanvas.height = HEIGHT;
    selectionContext = selectionCanvas.getContext("2d", { willReadFrequently: true });
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
    destroy() { ++requestId; controller?.abort(); },
  };
}
