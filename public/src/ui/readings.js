// AI-assisted: OpenAI Codex
import { describeDate, isFiniteNumber } from "../data/features.js";
import { mapFrameSound, soundKind } from "../engine/mapping.js";

// Presentation only: preserve the provided speed, normalization and timestamps.
export function describePixelCoverage(value) {
  if (!isFiniteNumber(value) || value < 0 || value > 1) return "Pixel inclusion unavailable";
  const percent = value * 100;
  const text = value > 0 && percent < 0.1 ? "<0.1%" : value < 1 && percent > 99.9 ? ">99.9%" : `${percent.toFixed(1)}%`;
  return `${text} of analyzed image pixels used`;
}

export function describePixelFilters(colorbar) {
  if (!colorbar) return "Color-filter settings unavailable; pixel inclusion does not establish measurement accuracy.";
  const filter = colorbar.pixelFilter;
  if (!filter) return "No color acceptance filter is configured: each analyzed pixel is assigned its nearest legend color. 100% inclusion does not mean 100% accuracy.";
  if (!isFiniteNumber(filter.maxColorDistance) || filter.maxColorDistance < 0 || !isFiniteNumber(filter.minSaturation) || filter.minSaturation < 0 || filter.minSaturation > 255) return "Color-filter settings unavailable; pixel inclusion does not establish measurement accuracy.";
  return `Pixels are assigned the nearest legend color and kept when RGB distance is at most ${filter.maxColorDistance} and saturation is at least ${filter.minSaturation} on a 0–255 scale.${isFiniteNumber(filter.maxValue) ? ` Decoded values must also be at most ${filter.maxValue} ${colorbar.unit}.` : ""} These are processing thresholds, not confidence probabilities.`;
}

export function describeReading(frame, track) {
  const date = describeDate(frame?.date);
  const [dateLabel, timeLabel] = date ? date.split(" at ") : ["Unavailable", "No valid timestamp supplied"];
  const visualIndex = track?.sonification?.input === "visualSignal";
  const visualWind = visualIndex && soundKind(track) === "wind";
  const visualPm25 = visualIndex && soundKind(track) === "pm25";
  const kind = soundKind(track), sound = mapFrameSound(frame, track), wind = kind === "wind";
  const visualOnly = kind === null, nonTemperature = kind !== "temperature";
  const unit = track?.unit ?? track?.colorbar?.unit ?? "°C";
  const quantity = typeof track?.quantity === "string" ? track.quantity : track?.quantity?.en ?? (wind ? "wind speed" : "temperature");
  const sourceMeasure = typeof track?.measure === "string" ? track.measure : track?.measure?.en ?? (wind ? "Mean of color-filtered wind pixels" : "Mean temperature");
  const neutralMeasure = sourceMeasure.replace(/confidently color-matched|confidently matched/g, "color-filtered");
  const measure = track?.statistics?.mean === "area_weighted" && !neutralMeasure.includes("area-weighted") ? `Area-weighted ${neutralMeasure.charAt(0).toLowerCase()}${neutralMeasure.slice(1)}` : neutralMeasure;
  const weightingDetail = track?.statistics?.mean === "area_weighted" ? "Mean weighted by pixel area (cosine latitude), over decoded pixels used" : "Mean uses equal weights per decoded pixel";
  const unitDescription = unit === "°C" ? "degrees Celsius" : unit === "m/s" ? "meters per second" : unit === "g/kg" ? "grams per kilogram" : unit === "mm" ? "millimeters" : unit;
  const validMean = isFiniteNumber(frame?.mean) && frame.coverage !== 0 && (!nonTemperature || frame.mean >= 0);
  const meanNumber = validMean ? frame.mean.toFixed(nonTemperature ? 2 : 1) : null;
  const mean = visualIndex ? isFiniteNumber(frame?.visualSignal) ? `${frame.visualSignal.toFixed(4)} / 1` : "Unavailable" : meanNumber === null ? "Unavailable" : `${meanNumber} ${unit}`;
  const coverageDetail = describePixelCoverage(frame?.coverage);
  const validNorm = isFiniteNumber(frame?.norm) && frame.norm >= 0 && frame.norm <= 1;
  const melodic = kind === "temperature" || kind === "carbonMonoxide" || kind === "ozone";
  const soundLabel = visualOnly ? "Sound mapping" : wind ? "Wind pulse rate" : kind === "precipitation" ? "Drum stroke rate" : kind === "humidity" ? "Pad spectral width" : kind === "pm25" ? "Tone / filter brightness" : "Mapped musical note";
  const soundValue = visualOnly ? "Not implemented" : !sound ? "Unavailable" : kind === "humidity" ? `${Math.round(sound.bandwidth)} Hz` : melodic ? sound.note : kind === "pm25" ? `${sound.frequency.toFixed(0)} Hz · ${sound.brightness.toFixed(2)} / 1` : `${sound.rate.toFixed(2)} Hz`;
  const soundSummary = !sound ? visualOnly ? "Visual-only experience; no sound mapping assigned." : "Sound data unavailable or no valid pixels; no note or texture."
    : kind === "temperature" ? `Mapped note ${sound.note}.`
      : kind === "carbonMonoxide" ? `Brass-like mapped note ${sound.note}; higher image-derived concentration means higher pitch, not higher health risk.`
        : kind === "ozone" ? `Plucked mapped note ${sound.note}; higher image-derived concentration means higher pitch, not higher health risk.`
      : wind ? `Wind rhythm ${sound.rate.toFixed(2)} pulses per second; fixed C5 pitch, not measured gusts.`
        : kind === "precipitation" ? `Musical density ${sound.rate.toFixed(2)} drum strokes per second; fixed G3 carrier, not measured rainfall intensity.`
          : kind === "humidity" ? `Nominal pad bandwidth ${Math.round(sound.bandwidth)} hertz; fixed C3 string ensemble, not rainfall.`
            : kind === "pm25" ? `Sustained metallic tone at ${sound.frequency.toFixed(0)} Hz; brightness ${sound.brightness.toFixed(2)} / 1. It glides with the frame, adds no beat and is not a health-risk reading.`
              : `Mapped musical value ${sound.rate.toFixed(2)}.`;
  return {
    date, dateLabel, timeLabel, mean, measure: visualPm25 ? "Visible PM2.5 signal (index)" : visualWind ? "Visible wind signal (index)" : kind === "precipitation" ? "Estimated precipitation · image-derived" : measure, sound, soundLabel, soundValue,
    note: melodic && sound ? sound.note : null,
    measureDetail: visualIndex ? `Accepted-pixel mean: ${meanNumber ?? "unavailable"} ${unit}; supplied normalized mean: ${isFiniteNumber(frame?.norm) ? frame.norm.toFixed(3) : "unavailable"}. These are diagnostics, not a complete regional physical mean.` : `${quantity} (${unit}). ${weightingDetail}`, coverageDetail,
    normalized: visualIndex ? isFiniteNumber(frame?.visualSignal) ? `${frame.visualSignal.toFixed(4)} / 1` : "Unavailable" : validNorm ? `${frame.norm.toFixed(3)} / 1.000` : "Unavailable",
    summary: visualIndex ? `${date ?? "Date unavailable"}. Visible ${visualPm25 ? "PM2.5" : "wind"} signal index ${isFiniteNumber(frame?.visualSignal) ? frame.visualSignal.toFixed(4) : "unavailable"}. ${coverageDetail}. ${soundSummary}` : `${date ?? "Date unavailable"}. ${measure}: ${meanNumber === null ? "unavailable" : `${meanNumber} ${unitDescription}`}. ${coverageDetail ? `${coverageDetail}. ` : ""}${soundSummary}`,

  };
}

export function renderReading(root, frame, track) {
  const reading = describeReading(frame, track);
  const find = (id) => root.querySelector(`#${id}`);
  find("frame-date").textContent = reading.dateLabel;
  if (reading.date) find("frame-date").setAttribute("datetime", frame.date);
  else find("frame-date").removeAttribute("datetime");
  find("frame-time").textContent = reading.timeLabel;
  find("measure-label").textContent = reading.measure;
  find("frame-mean").textContent = reading.mean;
  find("measure-detail").textContent = reading.measureDetail;
  find("coverage-detail").textContent = reading.coverageDetail;
  find("coverage-detail").hidden = !reading.coverageDetail;
  find("sound-label").textContent = reading.soundLabel;
  find("current-note").textContent = reading.soundValue;
  return reading;
}