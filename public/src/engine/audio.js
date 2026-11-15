// AI-assisted: OpenAI Codex
import { PENTATONIC_NOTES, mapFrameSound, mapWindSpeed, mapWindActivity, mapPrecipitation, mapHumidity, mapPm25 } from "./mapping.js";
import { createTemperatureSound } from "./temperatureSound.js";
import { createWindSound } from "./windSound.js";
import { createPrecipitationSound } from "./precipitationSound.js";
import { createHumiditySound } from "./humiditySound.js";
import { createPm25Sound } from "./pm25Sound.js";

// Shared context/master/limiter. Instrument resources are allocated once after
// explicit interaction. No audio module owns a frame timer or dataset position.
export function createAudioEngine(loadTone = () => import("tone")) {
  let tone, volume, limiter, duck, mix, pending;
  let enabled = false, muted = false, level = 25, disposed = false, ambience = true, ducking = false;
  let combined = false;
  const instruments = {}, channels = {};
  const calibration = { temperature: 0.65, wind: 1.2, precipitation: 1.5, humidity: 2, pm25: 1.2 };
  const layerGain = Object.fromEntries(Object.keys(calibration).map((kind) => [kind, 1]));
  const layerMuted = Object.fromEntries(Object.keys(calibration).map((kind) => [kind, false]));
  const decibels = () => level === 0 ? -Infinity : -30 + 20 * Math.log10(level / 25);
  function stop() { Object.values(instruments).forEach((instrument) => instrument.stop()); }
  function releaseNodes() {
    for (const kind of Object.keys(instruments)) { instruments[kind].dispose(); delete instruments[kind]; }
    for (const kind of Object.keys(channels)) { channels[kind].dispose(); delete channels[kind]; }
    mix?.dispose(); duck?.dispose(); volume?.dispose(); limiter?.dispose();
    mix = duck = volume = limiter = undefined;
  }
  async function enable() {
    if (disposed) throw new Error("Audio has been disposed.");
    if (pending) return pending;
    pending = (async () => {
      try {
        tone = await loadTone();
        await tone.start();
        if (disposed) return;
        tone.getContext().lookAhead = 0.02;
        if (!volume) {
          limiter = new tone.Limiter(-6).toDestination();
          volume = new tone.Volume(decibels());
          volume.mute = muted;
          duck = new tone.Gain(ducking ? 0.35 : 1);
          duck.chain(volume, limiter);
          mix = new tone.Gain(combined ? 0.5 : 1).connect(duck);
          for (const kind of Object.keys(calibration)) {
            channels[kind] = new tone.Gain(layerMuted[kind] ? 0 : calibration[kind] * layerGain[kind]);
            channels[kind].connect(mix);
          }
          instruments.temperature = createTemperatureSound(tone, channels.temperature);
          instruments.temperature.setAmbience(ambience);
          instruments.wind = createWindSound(tone, channels.wind);
          instruments.precipitation = createPrecipitationSound(tone, channels.precipitation);
          instruments.humidity = createHumiditySound(tone, channels.humidity);
          instruments.pm25 = createPm25Sound(tone, channels.pm25);
          await Promise.all(Object.values(instruments).map((instrument) => instrument.ready));
          if (disposed) return;
        }
        enabled = true;
      } catch (error) { enabled = false; releaseNodes(); throw error; }
      finally { pending = undefined; }
    })();
    return pending;
  }
  function updateInstrument(parameters, duration) {
    if (!parameters || !enabled || muted || level === 0 || disposed || layerMuted[parameters.kind] || layerGain[parameters.kind] === 0) return false;
    if (!instruments[parameters.kind] || tone.getContext().state !== "running") return false;
    if (duration !== undefined && (!Number.isFinite(duration) || duration <= 0)) return false;
    if (parameters.kind === "temperature" && !PENTATONIC_NOTES.includes(parameters.note)) return false;
    if (parameters.kind === "wind" && (!Number.isFinite(parameters.rate) || parameters.rate < 0.3 || parameters.rate > 4)) return false;
    if (parameters.kind === "precipitation" && (!Number.isFinite(parameters.rate) || parameters.rate < 0 || parameters.rate > 5)) return false;
    if (parameters.kind === "humidity" && (!Number.isFinite(parameters.bandwidth) || parameters.bandwidth < 160 || parameters.bandwidth > 1600)) return false;
    if (parameters.kind === "pm25" && (!Number.isFinite(parameters.waveRate) || parameters.waveRate < 0.07 || parameters.waveRate > 0.18 || !Number.isFinite(parameters.airRate) || parameters.airRate < 0.22 || parameters.airRate > 0.42 || !Number.isFinite(parameters.openness) || parameters.openness < 0 || parameters.openness > 1)) return false;
    instruments[parameters.kind].update(parameters, duration);
    return true;
  }
  function playMapped(parameters, duration) {
    for (const kind of Object.keys(instruments)) if (!parameters || kind !== parameters.kind) instruments[kind].stop();
    if (!parameters) return false;
    return updateInstrument(parameters, duration);
  }
  return {
    enable, stop, updateInstrument,
    setCombinedMode(value) { combined = Boolean(value); mix?.gain.rampTo(combined ? 0.5 : 1, 0.08); },
    playLayers(entries, duration) {
      const parameters = new Map(entries.map(({ frame, track }) => {
        const sound = mapFrameSound(frame, track);
        return [sound?.kind, sound];
      }).filter(([kind]) => kind));
      let played = false;
      for (const kind of Object.keys(instruments)) {
        const sound = parameters.get(kind);
        if (!sound || !updateInstrument(sound, duration)) instruments[kind].stop();
        else played = true;
      }
      return played;
    },
    playFrame(frame, track, duration) { return playMapped(mapFrameSound(frame, track), duration); },
    playNote(note, duration) { return playMapped({ kind: "temperature", note }, duration); },
    playWindActivity(value, duration) {
      const rate = mapWindActivity(value);
      return playMapped(rate === null ? null : { kind: "wind", rate }, duration);
    },
    playWind(speed, duration) {
      const rate = mapWindSpeed(speed);
      return playMapped(rate === null ? null : { kind: "wind", rate }, duration);
    },
    playPrecipitation(amount, duration) {
      const rate = mapPrecipitation(amount);
      return playMapped(rate === null ? null : { kind: "precipitation", rate }, duration);
    },
    playHumidity(value, duration) {
      const bandwidth = mapHumidity(value);
      return playMapped(bandwidth === null ? null : { kind: "humidity", bandwidth }, duration);
    },
    playPm25(position, duration) {
      const texture = mapPm25(position);
      return playMapped(texture === null ? null : { kind: "pm25", ...texture }, duration);
    },
    get enabled() { return enabled; }, get muted() { return muted; }, get volume() { return level; },
    setVolume(value) {
      if (!Number.isFinite(value) || typeof value !== "number" || value < 0 || value > 100) return;
      level = value;
      if (volume) { volume.volume.rampTo(decibels(), 0.03); if (level === 0) stop(); }
    },
    setMuted(value) { muted = Boolean(value); if (volume) volume.mute = muted; if (muted) stop(); },
    setAmbience(value) { ambience = Boolean(value); instruments.temperature?.setAmbience(ambience); },
    setDucking(value) { ducking = Boolean(value); duck?.gain.rampTo(ducking ? 0.35 : 1, 0.08); },
    setInstrumentGain(kind, value) {
      if (!(kind in calibration) || !Number.isFinite(value) || typeof value !== "number" || value < 0 || value > 1) return;
      layerGain[kind] = value;
      channels[kind]?.gain.rampTo(layerMuted[kind] ? 0 : calibration[kind] * value, 0.08);
      if (value === 0) instruments[kind]?.stop();
    },
    setInstrumentMuted(kind, value) {
      if (!(kind in calibration)) return;
      layerMuted[kind] = Boolean(value);
      channels[kind]?.gain.rampTo(layerMuted[kind] ? 0 : calibration[kind] * layerGain[kind], 0.08);
      if (layerMuted[kind]) instruments[kind]?.stop();
    },
    dispose() { disposed = true; enabled = false; stop(); releaseNodes(); },
  };
}
