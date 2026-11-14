// AI-assisted: OpenAI Codex
import { describeDate, isFiniteNumber } from "../data/features.js";
import { mapFrameSound, soundKind } from "../engine/mapping.js";

// Presentation only: preserve the provided speed, normalization and timestamps.
export function describeReading(frame, track) {
  const date = describeDate(frame?.date);
  const [dateLabel, timeLabel] = date ? date.split(" at ") : ["Unavailable", "No valid timestamp supplied"];
  const kind = soundKind(track), sound = mapFrameSound(frame, track), wind = kind === "wind";
  const visualOnly = kind === null, nonTemperature = kind !== "temperature";
  const unit = track?.unit ?? track?.colorbar?.unit ?? "°C";
  const quantity = typeof track?.quantity === "string" ? track.quantity : track?.quantity?.en ?? (wind ? "wind speed" : "temperature");
  const measure = typeof track?.measure === "string" ? track.measure : track?.measure?.en ?? (wind ? "Mean of confidently color-matched wind pixels" : "Mean temperature");
  const unitDescription = unit === "°C" ? "degrees Celsius" : unit === "m/s" ? "meters per second" : unit === "g/kg" ? "grams per kilogram" : unit === "mm" ? "millimeters" : unit;
  const validMean = isFiniteNumber(frame?.mean) && (!nonTemperature || (frame.mean >= 0 && frame.coverage !== 0));
  const meanNumber = validMean ? frame.mean.toFixed(nonTemperature ? 2 : 1) : null;
  const mean = meanNumber === null ? "Unavailable" : `${meanNumber} ${unit}`;
  const validCoverage = isFiniteNumber(frame?.coverage) && frame.coverage >= 0 && frame.coverage <= 1;
  const coverageDetail = nonTemperature ? validCoverage ? `${(frame.coverage * 100).toFixed(1)}% of analyzed pixels confidently matched` : "Pixel coverage unavailable" : "";
  const validNorm = isFiniteNumber(frame?.norm) && frame.norm >= 0 && frame.norm <= 1;
  const soundLabel = visualOnly ? "Sound mapping" : wind ? "Wind pulse rate" : kind === "precipitation" ? "Pluck density" : kind === "humidity" ? "Pad spectral width" : "Mapped musical note";
  const soundValue = visualOnly ? "Not implemented" : !sound ? "Unavailable" : kind === "humidity" ? `${Math.round(sound.bandwidth)} Hz` : kind === "temperature" ? sound.note : `${sound.rate.toFixed(2)} Hz`;
  const soundSummary = !sound ? visualOnly ? "Visual-only experience; no sound mapping assigned." : "Sound data unavailable or no valid pixels; no note or texture."
    : kind === "temperature" ? `Mapped note ${sound.note}.`
      : wind ? `Wind rhythm ${sound.rate.toFixed(2)} pulses per second; fixed C3 pitch, not measured gusts.`
        : kind === "precipitation" ? `Musical density ${sound.rate.toFixed(2)} plucks per second; fixed G4 carrier, not measured rainfall intensity.`
          : `Nominal pad bandwidth ${Math.round(sound.bandwidth)} hertz; fixed C4 background, not rainfall.`;
  return {
    date, dateLabel, timeLabel, mean, measure, sound, soundLabel, soundValue,
    note: sound?.kind === "temperature" ? sound.note : null,
    measureDetail: `${quantity} (${unit})`, coverageDetail,
    normalized: validNorm ? `${frame.norm.toFixed(2)} / 1.00` : "Unavailable",
    summary: `${date ?? "Date unavailable"}. ${measure}: ${meanNumber === null ? "unavailable" : `${meanNumber} ${unitDescription}`}. ${coverageDetail ? `${coverageDetail}. ` : ""}${soundSummary}`,

  };
}

export function renderReading(root, frame, track) {
  const reading = describeReading(frame, track), kind = soundKind(track), wind = kind === "wind";
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
  find("normalized-label").textContent = wind ? "Supplied normalized speed" : kind === "temperature" ? "Normalized temperature" : "Supplied normalized value";
  find("normalized-value").textContent = reading.normalized;
  find("scale-low").textContent = wind ? "Lower speed" : kind === "temperature" ? "Lower · C3" : "Lower value";
  find("scale-high").textContent = wind ? "Higher speed" : kind === "temperature" ? "Higher · C5" : "Higher value";
  const meter = find("temperature-position");
  meter.hidden = reading.normalized === "Unavailable";
  if (!meter.hidden) {
    meter.value = frame.norm;
    meter.setAttribute("aria-valuetext", `${reading.normalized}; ${reading.soundLabel}: ${reading.soundValue}`);
  } else { meter.removeAttribute("value"); meter.removeAttribute("aria-valuetext"); }
  return reading;
}
