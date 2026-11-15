// AI-assisted: OpenAI Codex. Run: node --test public/src/tests/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateFeatures, describeDate } from "../data/features.js";
import { mapValue, PENTATONIC_NOTES, CO_NOTES, OZONE_NOTES, mapWindSpeed, mapFrameSound, soundKind, mapPrecipitation, mapHumidity, mapPm25, mapCarbonMonoxide, mapOzone } from "../engine/mapping.js";
import { createAudioEngine } from "../engine/audio.js";
import { createSpeechEngine } from "../engine/speech.js";
import { initKeyboard } from "../ui/a11y.js";
import { createLegend } from "../ui/legend.js";
import { describeReading } from "../ui/readings.js";
import { describeExperience } from "../ui/experience.js";

const sample = () => ({
  track: "test", mock: true, unit: "°C", vmin: -40, vmax: 40,
  frames: [{ file: "frame_000001.webp", date: "2026-10-30T06:00", mean: 0, norm: 0.5 }],
});

test("pentatonic endpoints, monotonic quantization and determinism", () => {
  assert.equal(mapValue(0), "C3");
  assert.equal(mapValue(1), "C5");
  let last = -1;
  for (let i = 0; i <= 10000; i++) {
    const note = mapValue(i / 10000);
    const position = PENTATONIC_NOTES.indexOf(note);
    assert.ok(position >= last);
    assert.equal(mapValue(i / 10000), note);
    last = position;
  }
});

test("missing, nonnumeric and out-of-range normalized values never create a note", () => {
  for (const value of [null, undefined, "0", false, NaN, Infinity, -Infinity, -0.01, 1.01, {}, []]) {
    assert.equal(mapValue(value), null);
    const data = sample();
    data.frames[0].norm = value;
    assert.equal(validateFeatures(data, "test").frames[0].norm, null);
  }
});

test("features follow producer count and preserve mock/real values without recomputing norm", async () => {
  const json = JSON.parse(await readFile(new URL("../../data/clima-temperatura/features.json", import.meta.url)));
  assert.equal(validateFeatures(json, json.track).frames.length, json.frames.length);
  const data = sample();
  data.mock = false;
  data.frames[0].mean = 38;
  data.frames[0].norm = 0;
  let result = validateFeatures(data, "test");
  assert.equal(result.mock, false);
  assert.equal(result.frames[0].norm, 0);
  data.frames[0].mean = null;
  result = validateFeatures(data, "test");
  assert.equal(result.frames[0].mean, null);
  assert.equal(result.frames[0].norm, 0);
});

test("features accept track-specific units and expose partial pixel coverage", () => {
  const data = sample();
  data.track = "clima-vento";
  data.unit = "m/s";
  data.frames[0].coverage = 0.483;

  const result = validateFeatures(data, "clima-vento", "m/s");
  assert.equal(result.unit, "m/s");
  assert.equal(result.frames[0].coverage, 0.483);
  assert.throws(() => validateFeatures(data, "clima-vento", "°C"));
});

test("the wind track's generated features satisfy the front-end contract", async () => {
  const [track, features] = await Promise.all([
    readFile(new URL("../../tracks/clima-vento.json", import.meta.url)).then(JSON.parse),
    readFile(new URL("../../data/clima-vento/features.json", import.meta.url)).then(JSON.parse),
  ]);
  const result = validateFeatures(features, track.id, track.unit);

  assert.equal(result.unit, "m/s");
  assert.equal(result.frames.length, features.frames.length);
  assert.ok(result.frames.every((frame) => frame.norm !== null && frame.coverage !== null));
});

test("the precipitation track's generated features satisfy the front-end contract", async () => {
  const [track, features] = await Promise.all([
    readFile(new URL("../../tracks/clima-chuva.json", import.meta.url)).then(JSON.parse),
    readFile(new URL("../../data/clima-chuva/features.json", import.meta.url)).then(JSON.parse),
  ]);
  const result = validateFeatures(features, track.id, track.unit);

  assert.equal(result.unit, "mm");
  assert.equal(result.frames.length, 124);
  assert.ok(result.frames.every((frame) => frame.norm !== null && frame.coverage !== null));
});

test("ozone keeps the supplied ppbv norm and maps it to the upper pentatonic plucked voice", async () => {
  const [index, track, data] = await Promise.all([
    readFile(new URL("../../tracks/index.json", import.meta.url)).then(JSON.parse),
    readFile(new URL("../../tracks/clima-ozonio.json", import.meta.url)).then(JSON.parse),
    readFile(new URL("../../data/clima-ozonio/features.json", import.meta.url)).then(JSON.parse),
  ]);
  const result = validateFeatures(data, track.id, track.unit);

  assert.ok(index.tracks.includes("clima-ozonio"));
  assert.equal(track.svsId, 5152);
  assert.equal(result.unit, "ppbv");
  assert.equal(result.vmin, 5);
  assert.equal(result.vmax, 60);
  assert.equal(result.frames.length, 124);
  assert.equal(result.frames[0].date, "2026-10-30T06:00");
  assert.equal(result.frames.at(-1).date, "2026-11-14T14:00");
  assert.ok(result.frames.every((frame) => frame.coverage > 0 && frame.coverage < 1));
  assert.equal(soundKind(track), "ozone");
  assert.deepEqual(mapFrameSound(result.frames[0], track), { kind: "ozone", note: mapOzone(result.frames[0].norm) });
  assert.equal(mapFrameSound({ ...result.frames[0], norm: null }, track), null);
  assert.equal(mapFrameSound({ ...result.frames[0], coverage: 0 }, track), null);
  assert.equal(describeExperience(track).kind, "ozone");
  assert.equal(describeReading(result.frames[0], track).soundValue, mapOzone(result.frames[0].norm));
});

test("the PM2.5 track retains log concentration diagnostics and supplies its visual sound index", async () => {
  const [index, track, data] = await Promise.all([
    readFile(new URL("../../tracks/index.json", import.meta.url)).then(JSON.parse),
    readFile(new URL("../../tracks/ar-pm25.json", import.meta.url)).then(JSON.parse),
    readFile(new URL("../../data/ar-pm25/features.json", import.meta.url)).then(JSON.parse),
  ]);
  const result = validateFeatures(data, track.id, track.unit);

  assert.ok(index.tracks.includes("ar-pm25"));
  assert.equal(track.svsId, 5151);
  assert.equal(result.unit, "µg/m³");
  assert.equal(result.vmin, 0.4);
  assert.equal(result.vmax, 409.6);
  assert.equal(result.frames.length, 124);
  assert.equal(result.frames[0].date, "2026-10-30T06:00");
  assert.equal(result.frames.at(-1).date, "2026-11-14T14:00");
  assert.ok(result.frames.every((frame) => frame.coverage > 0 && frame.coverage < 1));
  const firstFrame = result.frames[0];
  assert.equal(firstFrame.norm, Number(((Math.log(firstFrame.mean) - Math.log(0.4)) / (Math.log(409.6) - Math.log(0.4))).toFixed(3)));
  assert.equal(soundKind(track), "pm25");
  const activeTrack = { ...track, sonification: result.sonification };
  assert.equal(result.sonification.input, "visualSignal");
  assert.deepEqual(mapFrameSound(firstFrame, activeTrack), { kind: "pm25", ...mapPm25(firstFrame.visualSignal) });
  assert.equal(mapFrameSound({ ...firstFrame, visualSignal: null }, activeTrack), null);
  assert.equal(mapFrameSound({ ...firstFrame, coverage: 0 }, activeTrack), null);
  assert.equal(soundKind({ ...track, unit: "ppbv" }), null);
  assert.equal(describeExperience(track).kind, "pm25");
  assert.equal(describeReading(firstFrame, track).soundLabel, "Tone / filter brightness");
});

test("carbon monoxide keeps the supplied ppbv norm and maps it to the lower brass-like voice", async () => {
  const [index, track, data] = await Promise.all([
    readFile(new URL("../../tracks/index.json", import.meta.url)).then(JSON.parse),
    readFile(new URL("../../tracks/ar-co.json", import.meta.url)).then(JSON.parse),
    readFile(new URL("../../data/ar-co/features.json", import.meta.url)).then(JSON.parse),
  ]);
  const result = validateFeatures(data, track.id, track.unit);

  assert.ok(index.tracks.includes("ar-co"));
  assert.equal(track.svsId, 5153);
  assert.equal(result.unit, "ppbv");
  assert.equal(result.vmin, 40);
  assert.equal(result.vmax, 500);
  assert.equal(result.frames.length, 124);
  assert.equal(result.frames[0].date, "2026-10-30T06:00");
  assert.equal(result.frames.at(-1).date, "2026-11-14T14:00");
  assert.ok(result.frames.every((frame) => frame.coverage > 0 && frame.coverage < 1));
  assert.equal(soundKind(track), "carbonMonoxide");
  assert.deepEqual(mapFrameSound(result.frames[0], track), { kind: "carbonMonoxide", note: mapCarbonMonoxide(result.frames[0].norm) });
  assert.equal(mapFrameSound({ ...result.frames[0], norm: null }, track), null);
  assert.equal(mapFrameSound({ ...result.frames[0], coverage: 0 }, track), null);
  assert.equal(describeExperience(track).kind, "carbonMonoxide");
  assert.equal(describeReading(result.frames[0], track).soundValue, mapCarbonMonoxide(result.frames[0].norm));
});

test("CO and ozone pitch mappings are bounded, deterministic and monotonic on fixed registers", () => {
  assert.equal(mapCarbonMonoxide(0), CO_NOTES[0]);
  assert.equal(mapCarbonMonoxide(1), CO_NOTES.at(-1));
  assert.equal(mapOzone(0), OZONE_NOTES[0]);
  assert.equal(mapOzone(1), OZONE_NOTES.at(-1));
  for (const map of [mapCarbonMonoxide, mapOzone]) {
    let previous = -1;
    for (let i = 0; i <= 1000; i++) {
      const note = map(i / 1000);
      const index = (map === mapCarbonMonoxide ? CO_NOTES : OZONE_NOTES).indexOf(note);
      assert.ok(index >= previous);
      assert.equal(map(i / 1000), note);
      previous = index;
    }
    for (const value of [null, undefined, "0.5", false, NaN, Infinity, -0.1, 1.1]) assert.equal(map(value), null);
  }
});

test("CO, PM2.5 and ozone use the climate tracks' shared timestamps", async () => {
  const reference = JSON.parse(await readFile(
    new URL("../../data/clima-temperatura/features.json", import.meta.url),
  ));
  const expectedDates = reference.frames.map(({ date }) => date);
  for (const id of ["ar-co", "ar-pm25", "clima-ozonio"]) {
    const data = JSON.parse(await readFile(
      new URL(`../../data/${id}/features.json`, import.meta.url),
    ));
    assert.deepEqual(data.frames.map(({ date }) => date), expectedDates, id);
  }
});

test("invalid structure and unsafe or duplicate frame filenames fail explicitly", () => {
  for (const data of [null, {}, { ...sample(), mock: undefined }, { ...sample(), unit: "" }, { ...sample(), frames: [] }]) {
    assert.throws(() => validateFeatures(data, "test"));
  }
  assert.throws(() => validateFeatures(sample(), "other-track"));
  for (const file of ["../frame.webp", "https://example.com/frame.webp", "frame.webp?x=1", "frame.svg"]) {
    const data = sample();
    data.frames[0].file = file;
    assert.throws(() => validateFeatures(data, "test"));
  }
  const data = sample();
  data.frames.push({ ...data.frames[0] });
  assert.throws(() => validateFeatures(data, "test"));
});

test("dates retain wall time and timezone; invalid or missing dates are not invented", () => {
  assert.equal(describeDate("2026-10-30T06:00"), "October 30, 2026 at 06:00 (time zone not specified)");
  assert.equal(describeDate("2026-11-01T02:00-05:00"), "November 1, 2026 at 02:00 (UTC-05:00)");
  assert.equal(describeDate("2026-11-01T07:00:00Z"), "November 1, 2026 at 07:00:00 (UTC)");
  assert.ok(describeDate("2028-02-29T01:00"));
  for (const value of [null, undefined, "", "not a date", "2026-02-29T01:00", "2026-11-31T01:00", "2026-11-01T24:00", "2026-11-01T00:00+25:00"]) assert.equal(describeDate(value), null);
});

function fakeTone() {
  const calls = { starts: 0, synths: 0, cancels: 0, notes: [], disposals: 0, created: [], rates: [], windAttacks: 0, windReleases: 0, noiseStarts: 0, brassAttacks: 0, plucks: 0, pmAttacks: 0, pmReleases: 0, pmVelocities: [], pmNoteChanges: [], pm25Cutoffs: [] };
  const context = { state: "running" };
  let output;
  const signal = (value, updates) => ({ value, rampTo(v) { this.value = v; updates?.push(v); } });
  class Node {
    constructor() { calls.created.push(this); }
    chain(...nodes) { this.connections = nodes; return this; }
    connect(node) { this.connections = [node]; return this; }
    dispose() { assert.ok(!this.disposed, "Resource disposed only once"); this.disposed = true; calls.disposals++; }
  }
  class Volume extends Node { constructor(value) { super(); output = this; this.value = value; this.volume = signal(value); } }
  class Gain extends Node { constructor(value) { super(); this.gain = signal(value); } }
  class Limiter extends Node { constructor(value) { super(); assert.equal(value, -6); } toDestination() { return this; } }
  class Reverb extends Node {
    constructor(options) { super(); assert.ok(options.decay > 0 && options.decay <= 2); this.wet = signal(options.wet); this.ready = Promise.resolve(); }
  }
  class Filter extends Node { constructor(options) { super(); assert.ok(["lowpass", "bandpass"].includes(options.type)); this.options = options; this.Q = signal(options.Q); this.frequency = signal(options.frequency, options.frequency === 3100 ? calls.pm25Cutoffs : undefined); } }
  class Synth extends Node {
    constructor(options) { super(); calls.synths++; assert.ok(["custom", "sine"].includes(options.oscillator.type)); this.envelope = { cancel: () => { calls.cancels++; } }; }
    triggerAttack(note) { calls.notes.push(note); }
    setNote(note) { calls.notes.push(note); }
    triggerRelease() {}
    triggerAttackRelease(note) { calls.notes.push(note); }
  }
  class MembraneSynth extends Node {
    constructor(options) { super(); this.options = options; }
    triggerAttackRelease(note) { calls.notes.push(note); }
    triggerRelease() { this.released = true; calls.windReleases++; }
  }
  class NoiseSynth extends Node {
    triggerAttackRelease() {}
    triggerRelease() {}
  }
  class Clock extends Node {
    constructor(callback, rate) { super(); this.callback = callback; this.frequency = { setValueAtTime(v) { calls.rates.push(v); } }; this.state = 'stopped'; }
    start() { this.state = 'started'; }
    stop(at) { if (at === undefined) this.state = 'stopped'; }
  }
  class MonoSynth extends Node {
    constructor(options) { super(); assert.ok(["sawtooth", "pulse"].includes(options.oscillator.type)); assert.equal(options.filter.type, "lowpass"); this.options = options; }
    triggerAttack(note) { calls.brassAttacks++; calls.notes.push(note); }
    setNote(note) { calls.notes.push(note); }
    triggerRelease() {}
    triggerAttackRelease(note) { calls.brassAttacks++; calls.notes.push(note); }
  }
  class PluckSynth extends Node {
    constructor(options) { super(); assert.ok(options.resonance > 0 && options.resonance < 1); this.options = options; }
    triggerAttack() { calls.plucks++; }
    triggerRelease() {}
    triggerAttackRelease(note) { calls.plucks++; calls.notes.push(note); }
  }
  class FMSynth extends Node {
    constructor(options) { super(); assert.equal(options.oscillator.type, "sine"); assert.equal(options.modulation.type, "sine"); assert.ok(options.portamento > 0); this.options = options; this.volume = signal(0); }
    triggerAttack(note, time, velocity) { calls.pmAttacks++; calls.pmVelocities.push(velocity); calls.notes.push(note); }
    setNote(note) { calls.pmNoteChanges.push(note); }
    triggerAttackRelease(note, duration, time, velocity) { calls.pmAttacks++; calls.pmVelocities.push(velocity); calls.notes.push(note); }
    triggerRelease() { calls.pmReleases++; }
  }
  class Noise extends Node {
    constructor(options) { super(); assert.ok(["pink", "white"].includes(options.type)); }
    start() { calls.noiseStarts++; return this; }
  }
  class Oscillator extends Node {
    constructor(options) { super(); assert.ok(["G3", "C3", "C4", "C5"].includes(options.frequency), "Fixed instrument carriers"); this.options = options; }
    start() { return this; }
  }
  class FatOscillator extends Oscillator {
    constructor(options) { super(options); assert.equal(options.count, 3); assert.equal(options.type, "sawtooth"); }
  }
  class FMOscillator extends Node {
    constructor(options) { super(); assert.equal(options.frequency, "G4"); }
    start() { return this; }
  }
  class LFO extends Node {
    constructor(options) { super(); assert.equal(options.min, 0); assert.equal(options.max, 1); this.frequency = signal(options.frequency, calls.rates); }
    start() { return this; }
  }
  class Pow extends Node { constructor(exponent) { super(); assert.ok([3, 32].includes(exponent)); } }
  class AmplitudeEnvelope extends Node {
    cancel() {}
    triggerAttack() { calls.windAttacks++; this.active = true; }
    triggerRelease() { calls.windReleases++; this.active = false; }
    triggerAttackRelease() { calls.windAttacks++; }
  }
  return {
    calls, context, get output() { return output; },
    module: { Clock, MembraneSynth, NoiseSynth, Volume, Gain, Limiter, Filter, Reverb, Synth, MonoSynth, PluckSynth, FMSynth, Noise, Oscillator, FatOscillator, FMOscillator, LFO, Pow, AmplitudeEnvelope, start: async () => { calls.starts++; }, now: () => 1, getContext: () => context },
  };
}

test("audio starts only explicitly, reuses one voice, cancels previous envelopes and disposes nodes", async () => {
  const fake = fakeTone();
  const engine = createAudioEngine(async () => fake.module);
  assert.equal(engine.enabled, false);
  assert.equal(engine.playNote("C3"), false);
  assert.equal(fake.calls.starts, 0);
  await Promise.all([engine.enable(), engine.enable()]);
  assert.equal(fake.calls.starts, 1);
  assert.equal(fake.calls.synths, 2);
  assert.equal(fake.output.value, -30);
  engine.playNote("C3");
  engine.playNote("C5");
  assert.deepEqual(fake.calls.notes, ["C3", "C5"]);
  assert.equal(fake.calls.cancels, 1);
  engine.playNote("C5");
  assert.deepEqual(fake.calls.notes, ["C3", "C5"], "Repeated notes stay sustained without a new attack");
  engine.setMuted(true);
  assert.equal(engine.playNote("C4"), false);
  engine.setMuted(false);
  engine.setVolume(0);
  assert.equal(engine.playNote("C4"), false);
  engine.setVolume(25);
  fake.context.state = "suspended";
  assert.equal(engine.playNote("C4"), false);
  engine.dispose();
  assert.equal(fake.calls.disposals, fake.calls.created.length);
  await assert.rejects(engine.enable());
});

test("CDN/init failures remain retryable at the engine boundary", async () => {
  const fake = fakeTone();
  let fail = true;
  const engine = createAudioEngine(async () => { if (fail) throw new Error("offline"); return fake.module; });
  await assert.rejects(engine.enable());
  assert.equal(engine.enabled, false);
  fail = false;
  await engine.enable();
  assert.equal(engine.enabled, true);
  engine.dispose();
});

test("legend waits for each spoken label before playing and cancels stale speech completions", async () => {
  const originalWindow = globalThis.window;
  const tasks = [], notes = [], finishes = [];
  globalThis.window = { setTimeout(fn) { tasks.push(fn); return tasks.length; }, clearTimeout() {} };
  try {
    const legend = createLegend({
      audio: { stop() {}, playNote(note) { notes.push(note); return true; } },
      speech: { cancel() {}, speak(text, interrupt, done) { finishes.push(done); return true; } },
      enableAudio: async () => {}, onBeforeStart() {}, onState() {}, onError(message) { assert.fail(message); },
    });
    await legend.toggle();
    assert.deepEqual(notes, []);
    finishes[0]();
    assert.deepEqual(notes, ['C3']);
    tasks[0]();
    assert.deepEqual(notes, ['C3'], 'High example waits for its own spoken label');
    finishes[1]();
    assert.deepEqual(notes, ['C3', 'C5']);
    tasks[1]();
    assert.equal(legend.active, false);
    await legend.toggle();
    legend.cancel();
    finishes[2]();
    assert.deepEqual(notes, ['C3', 'C5']);
  } finally { globalThis.window = originalWindow; }
});

test("speech skips a busy voice, replaces legend speech and cancels owned utterances", () => {
  const spoken = [];
  let cancellations = 0;
  const scope = {
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    speechSynthesis: { getVoices: () => [{ name: "Test English", lang: "en-US" }], resume() {}, speaking: false, pending: false, speak: (u) => spoken.push(u), cancel: () => { cancellations++; } },
  };
  const speech = createSpeechEngine(scope);
  assert.equal(speech.speak("First date"), true);
  assert.equal(speech.speak("Another date"), false);
  spoken[0].onend();
  assert.equal(speech.speak("Next date"), true);
  speech.speak("Cold", true);
  assert.equal(cancellations, 1);
  speech.cancel();
  assert.equal(cancellations, 2);
  assert.equal(createSpeechEngine({}).speak("Unsupported"), false);
});

test("shortcuts preserve interactive controls, modifiers and typing; listener is removable", () => {
  let handler, toggles = 0;
  const steps = [];
  const target = { addEventListener: (_, fn) => { handler = fn; }, removeEventListener: (_, fn) => assert.equal(fn, handler) };
  const cleanup = initKeyboard({ toggle: () => { toggles++; }, step: (d) => steps.push(d) }, target);
  const key = (value, interactive = false, extra = {}) => {
    let prevented = false;
    handler({ key: value, target: { closest: () => interactive }, preventDefault: () => { prevented = true; }, ...extra });
    return prevented;
  };
  assert.equal(key(" "), true);
  key("ArrowRight"); key("ArrowLeft");
  assert.equal(toggles, 1);
  assert.deepEqual(steps, [1, -1]);
  for (const value of [" ", "ArrowRight", "ArrowLeft"]) assert.equal(key(value, true), false);
  for (const extra of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { isComposing: true }, { defaultPrevented: true }]) assert.equal(key("ArrowRight", false, extra), false);
  assert.equal(key(" ", false, { repeat: true }), false);
  cleanup();
});

test("legend cancellation during async initialization cannot start stale notes", async () => {
  const originalWindow = globalThis.window;
  globalThis.window = { setTimeout, clearTimeout };
  try {
    let resolve, notes = 0;
    const legend = createLegend({
      audio: { stop() {}, playNote() { notes++; } }, speech: { cancel() {} },
      enableAudio: () => new Promise((done) => { resolve = done; }),
      onBeforeStart() {}, onState() {}, onError() { assert.fail("Unexpected legend error"); },
    });
    const starting = legend.toggle();
    assert.equal(legend.active, true);
    legend.cancel();
    resolve();
    await starting;
    assert.equal(legend.active, false);
    assert.equal(notes, 0);
  } finally { globalThis.window = originalWindow; }
});

test("speech reports zero voices and recovers when an English voice appears", () => {
  let voices = [], spoken = 0, status;
  const speech = createSpeechEngine({
    SpeechSynthesisUtterance: class {},
    speechSynthesis: { getVoices: () => voices, resume() {}, speak(u) { spoken++; u.onstart(); }, cancel() {} },
  }, (message) => { status = message; });
  assert.equal(speech.speak("Test", true), false);
  assert.equal(spoken, 0);
  assert.match(status, /No English speech voice/);
  voices = [{ name: "English voice", lang: "en-GB" }];
  assert.equal(speech.speak("Test", true), true);
  assert.equal(spoken, 1);
  assert.match(status, /English voice ready/);
  speech.dispose();
});

test("speech exposes synthesis errors instead of failing silently", () => {
  let status;
  const speech = createSpeechEngine({
    SpeechSynthesisUtterance: class {},
    speechSynthesis: {
      getVoices: () => [{ name: "English", lang: "en-US" }], resume() {}, cancel() {},
      speak(u) { u.onerror({ error: "synthesis-unavailable" }); },
    },
  }, (message) => { status = message; });
  speech.speak("Test", true);
  assert.match(status, /synthesis-unavailable/);
  speech.dispose();
});

test("sound legend uses held comparison notes and visible steps without speech voices", async () => {
  const originalWindow = globalThis.window;
  const tasks = [], notes = [], steps = [];
  globalThis.window = { setTimeout(fn, delay) { tasks.push({ fn, delay }); return tasks.length; }, clearTimeout() {} };
  try {
    const legend = createLegend({
      audio: { stop() {}, playNote(note, duration) { notes.push([note, duration]); return true; } },
      speech: { cancel() {}, speak() { return false; } },
      enableAudio: async () => {}, onBeforeStart() {}, onState() {},
      onStep(text) { steps.push(text); }, onError() { assert.fail("Unexpected legend error"); },
    });
    await legend.toggle();
    assert.deepEqual(notes, [["C3", 1.8]]);
    tasks.find((task) => task.delay === 2500).fn();
    assert.deepEqual(notes, [["C3", 1.8], ["C5", 1.8]]);
    tasks.at(-1).fn();
    assert.equal(legend.active, false);
    assert.match(steps[0], /Low values/);
    assert.match(steps[1], /High values/);
    assert.match(steps[2], /complete/);
  } finally { globalThis.window = originalWindow; }
});


test("frame presentation preserves zero values and explains missing values without inventing data", () => {
  const frame = { date: "2026-10-30T06:00", mean: 0, norm: 0 };
  const reading = describeReading(frame);
  assert.equal(reading.mean, "0.0 °C");
  assert.equal(reading.note, "C3");
  assert.equal(reading.normalized, "0.000 / 1.000");
  assert.match(reading.timeLabel, /time zone not specified/);
  assert.equal(describeReading({ ...frame, norm: 1 }).note, "C5");
  for (const value of [null, undefined, "0", NaN, Infinity]) {
    const missing = describeReading({ date: "invalid", mean: value, norm: value });
    assert.equal(missing.mean, "Unavailable");
    assert.equal(missing.note, null);
    assert.equal(missing.normalized, "Unavailable");
    assert.equal(missing.dateLabel, "Unavailable");
    assert.match(missing.summary, /no note/);
  }
  assert.equal(describeReading(null).date, null);
});

test("presentation keeps explicit offsets and does not derive musical values from the mean", () => {
  const reading = describeReading({ date: "2026-11-01T02:00-05:00", mean: 39, norm: 0 });
  assert.equal(reading.dateLabel, "November 1, 2026");
  assert.equal(reading.timeLabel, "02:00 (UTC-05:00)");
  assert.equal(reading.mean, "39.0 °C");
  assert.equal(reading.note, "C3");
});

test("wind readings use their own measure, unit and visible-pixel coverage", () => {
  const reading = describeReading(
    { date: "2026-10-30T06:00", mean: 9.289, norm: 0.232, coverage: 0.483 },
    {
      id: "clima-vento", svsId: 5148,
      quantity: { en: "wind speed" },
      measure: { en: "Mean of confidently color-matched wind pixels" },
      unit: "m/s",
    },
  );
  assert.equal(reading.mean, "9.29 m/s");
  assert.equal(reading.measure, "Mean of color-filtered wind pixels");
  assert.match(reading.summary, /9\.29 meters per second/);
  assert.match(reading.summary, /48\.3% of analyzed image pixels/);
});

test("normalization limits are displayed only when both supplied limits form a valid range", () => {
  assert.equal(validateFeatures(sample(), "test").vmin, -40);
  assert.equal(validateFeatures(sample(), "test").vmax, 40);
  for (const [vmin, vmax] of [[null, 40], [-40, undefined], ["-40", 40], [40, -40], [10, 10], [0, Infinity]]) {
    const result = validateFeatures({ ...sample(), vmin, vmax }, "test");
    assert.equal(result.vmin, null);
    assert.equal(result.vmax, null);
    assert.equal(result.frames[0].norm, 0.5);
  }
});

const windTrack = { id: "clima-vento", svsId: 5148, unit: "m/s" };
const temperatureTrack = { id: "clima-temperatura", svsId: 5147, unit: "°C" };

test("wind modulation is deterministic, monotonic, bounded and rejects missing speed", () => {
  assert.equal(mapWindSpeed(0), 0.3);
  let previous = -1;
  for (let i = 0; i <= 10000; i++) {
    const rate = mapWindSpeed(i / 100);
    assert.ok(rate >= previous && rate >= 0.3 && rate <= 4);
    assert.equal(rate, mapWindSpeed(i / 100));
    previous = rate;
  }
  assert.ok(mapWindSpeed(25) > mapWindSpeed(5));
  for (const speed of [null, undefined, "5", false, NaN, Infinity, -Infinity, -1]) assert.equal(mapWindSpeed(speed), null);
});

test("wind maps the supplied speed, never norm, and distinguishes absent coverage from zero coverage", () => {
  const frame = { mean: 10, norm: 0.99, coverage: 0.5 };
  assert.deepEqual(mapFrameSound(frame, windTrack), { kind: "wind", rate: mapWindSpeed(10) });
  assert.equal(mapFrameSound({ ...frame, mean: null }, windTrack), null);
  assert.equal(mapFrameSound({ ...frame, coverage: 0 }, windTrack), null);
  assert.equal(mapFrameSound({ ...frame, mean: -1 }, windTrack), null);
  assert.ok(mapFrameSound({ mean: 0 }, windTrack));
  assert.ok(mapFrameSound({ mean: 10 }, windTrack));
  assert.equal(mapFrameSound({ mean: null, norm: 0 }, temperatureTrack).note, "C3");
  assert.equal(soundKind({ ...windTrack, unit: "°C" }), null);
  assert.equal(soundKind({ ...windTrack, svsId: 5147 }), null);
  assert.equal(mapFrameSound(frame, { id: "unknown-experience", svsId: 9999, unit: "g/kg" }), null);
});

test("wind updates one existing flute-and-breath instrument; switching experiences stops the previous layer", async () => {
  const fake = fakeTone(), engine = createAudioEngine(async () => fake.module);
  assert.equal(fake.calls.noiseStarts, 0);
  assert.equal(engine.playFrame({ mean: 10 }, windTrack), false);
  await engine.enable();
  engine.playFrame({ norm: 0 }, temperatureTrack);
  assert.deepEqual(fake.calls.notes, ["C3"]);
  const before = fake.calls.cancels, sources = fake.calls.noiseStarts;
  engine.playFrame({ mean: 5 }, windTrack);
  engine.playFrame({ mean: 25 }, windTrack);
  assert.ok(fake.calls.cancels > before);
  assert.equal(fake.calls.noiseStarts, sources, "Frame updates do not allocate new noise sources");
  assert.equal(fake.calls.windAttacks, 1, "Continuous frames update rate without retriggering the breath");
  assert.deepEqual(fake.calls.rates, [mapWindSpeed(5), mapWindSpeed(25)]);
  const releases = fake.calls.windReleases;
  assert.equal(engine.playFrame({ mean: null, norm: 0 }, windTrack), false);
  assert.ok(fake.calls.windReleases > releases);
  assert.equal(fake.calls.rates.length, 2, "Missing speed does not map to zero wind");
  engine.dispose();
  assert.equal(fake.calls.disposals, fake.calls.created.length);
});

test("shared limiter, independent layer controls, optional ambience and speech ducking preserve mapping", async () => {
  const fake = fakeTone(), engine = createAudioEngine(async () => fake.module);
  await engine.enable();
  assert.equal(fake.calls.created.filter((node) => node instanceof fake.module.Limiter).length, 1);
  engine.playFrame({ norm: 0.8 }, temperatureTrack);
  const notes = [...fake.calls.notes];
  engine.setAmbience(false);
  assert.equal(fake.calls.created.find((node) => node instanceof fake.module.Reverb).wet.value, 0);
  assert.deepEqual(fake.calls.notes, notes);
  engine.setInstrumentMuted("wind", true);
  assert.equal(engine.updateInstrument({ kind: "wind", rate: 2 }), false);
  assert.equal(engine.updateInstrument({ kind: "temperature", note: "C4" }), true);
  engine.setInstrumentMuted("wind", false);
  engine.setInstrumentGain("wind", 0);
  assert.equal(engine.updateInstrument({ kind: "wind", rate: 2 }), false);
  engine.setInstrumentGain("wind", 0.5);
  assert.equal(engine.updateInstrument({ kind: "wind", rate: 2 }), true);
  const duck = fake.calls.created.find((node) => node instanceof fake.module.Gain && node.connections?.[0] === fake.output);
  engine.setDucking(true); assert.equal(duck.gain.value, 0.35);
  engine.setDucking(false); assert.equal(duck.gain.value, 1);
  assert.equal(fake.output.volume.value, -30);
  engine.dispose();
});

test("speech activity restores instrument gain on completion, cancellation and error", () => {
  const activity = [], spoken = [];
  const speech = createSpeechEngine({
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    speechSynthesis: { getVoices: () => [{ name: "English", lang: "en-US" }], resume() {}, speak(u) { spoken.push(u); }, cancel() {} },
  }, () => {}, (active) => activity.push(active));
  speech.speak("First"); spoken[0].onstart(); spoken[0].onend();
  speech.speak("Next"); spoken[1].onstart(); speech.cancel();
  speech.speak("Error"); spoken[2].onstart(); spoken[2].onerror({ error: "failed" });
  assert.deepEqual(activity, [true, false, true, false, true, false]);
  speech.dispose();
});

test("wind legend compares labeled speed examples, not musical pitches or dataset events", async () => {
  const originalWindow = globalThis.window, tasks = [], speeds = [], steps = [];
  globalThis.window = { setTimeout(fn, delay) { tasks.push({ fn, delay }); return tasks.length; }, clearTimeout() {} };
  try {
    const legend = createLegend({
      audio: { stop() {}, playNote() { assert.fail("Wind must not use a temperature note"); }, playWind(speed) { speeds.push(speed); return true; } },
      speech: { cancel() {}, speak() {} }, enableAudio: async () => {}, getKind: () => "wind",
      onBeforeStart() {}, onState() {}, onStep(text) { steps.push(text); }, onError() { assert.fail("Unexpected error"); },
    });
    await legend.toggle(); tasks.find((task) => task.delay === 2500).fn(); tasks.at(-1).fn();
    assert.deepEqual(speeds, [5, 25]);
    assert.match(steps[0], /Example 5 m\/s/); assert.match(steps[1], /Example 25 m\/s/);
    assert.match(steps[2], /not current measurements/);
    assert.equal(legend.active, false);
  } finally { globalThis.window = originalWindow; }
});


test("rainfall and humidity datasets use their own mappings, units and partial coverage", async () => {
  for (const [id, kind, label] of [["clima-chuva", "precipitation", "Drum stroke rate"], ["clima-umidade", "humidity", "Pad spectral width"]]) {
    const track = JSON.parse(await readFile(new URL(`../../tracks/${id}.json`, import.meta.url)));
    const data = JSON.parse(await readFile(new URL(`../../data/${id}/features.json`, import.meta.url)));
    const experience = describeExperience(track), reading = describeReading(data.frames[0], track);
    assert.equal(soundKind(track), kind); assert.equal(experience.kind, kind);
    assert.equal(reading.sound.kind, kind); assert.equal(reading.soundLabel, label);
    assert.ok(reading.mean.endsWith(track.unit)); assert.match(reading.coverageDetail, /analyzed image pixels/);
    assert.equal(reading.note, null, "Neither quantity reuses temperature pitch mapping");
    assert.equal(mapFrameSound({ ...data.frames[0], mean: null }, track), null);
    assert.equal(mapFrameSound({ ...data.frames[0], coverage: 0 }, track), null);
    assert.equal(soundKind({ ...track, unit: "%" }), null);
  }
});

test("precipitation amount maps to bounded pluck density; zero is silent, absence is not zero", () => {
  assert.equal(mapPrecipitation(0), 0);
  let previous = -1;
  for (let i = 0; i <= 10000; i++) {
    const value = i / 100;
    const rate = mapPrecipitation(value);
    assert.ok(rate >= previous && rate >= 0 && rate <= 5);
    assert.equal(rate, mapPrecipitation(value)); previous = rate;
  }
  for (const value of [null, undefined, "0", false, NaN, Infinity, -Infinity, -1]) assert.equal(mapPrecipitation(value), null);
  assert.ok(mapPrecipitation(10) > mapPrecipitation(0.5));
});

test("specific humidity maps to monotonic nominal bandwidth without generating rain", () => {
  assert.equal(mapHumidity(0), 160);
  let previous = -1;
  for (let i = 0; i <= 10000; i++) {
    const value = i / 100, bandwidth = mapHumidity(value);
    assert.ok(bandwidth >= previous && bandwidth >= 160 && bandwidth <= 1600);
    assert.equal(bandwidth, mapHumidity(value)); previous = bandwidth;
  }
  for (const value of [null, undefined, "0", false, NaN, Infinity, -Infinity, -1]) assert.equal(mapHumidity(value), null);
  assert.ok(mapHumidity(18) > mapHumidity(2));
  assert.equal(mapFrameSound({ mean: 7.9, norm: 0.01 }, { id: "clima-umidade", unit: "g/kg" }).bandwidth, mapHumidity(7.9));
});

test("PM2.5 maps its supplied log position to bounded, monotonic metallic brightness", () => {
  assert.deepEqual(mapPm25(0), { brightness: 0, frequency: 261.625565 });
  assert.deepEqual(mapPm25(1), { brightness: 1, frequency: 1046.50226 });
  let previous = 0;
  let previousFrequency = 0;
  for (let i = 0; i <= 10000; i++) {
    const mapped = mapPm25(i / 10000);
    assert.ok(mapped.brightness >= previous && mapped.brightness <= 1);
    assert.ok(mapped.frequency >= previousFrequency && mapped.frequency <= 1046.6);
    previous = mapped.brightness;
    previousFrequency = mapped.frequency;
  }
  assert.ok(mapPm25(0.233).brightness - mapPm25(0.19).brightness > 0.07, "Fixed curve makes the narrow global range more audible without regional rescaling");
  assert.ok(mapPm25(0.233).frequency - mapPm25(0.19).frequency > 40, "The same fixed curve makes global concentration changes audible as a gentle pitch glide");
  for (const value of [null, undefined, "0.5", false, NaN, Infinity, -Infinity, -0.01, 1.01]) {
    assert.equal(mapPm25(value), null);
  }
});

test("PM2.5 sustains one metallic voice and glides pitch and brightness with supplied log position", async () => {
  const fake = fakeTone(), engine = createAudioEngine(async () => fake.module);
  const track = { id: "ar-pm25", svsId: 5151, unit: "µg/m³" };
  await engine.enable();
  const count = fake.calls.created.length;
  const synth = fake.calls.created.find(node => node instanceof fake.module.FMSynth);
  const filter = fake.calls.created.find(node => node instanceof fake.module.Filter && node.options.frequency === 3100);
  assert.ok(synth && filter);
  assert.equal(synth.volume.value, -3);
  assert.ok(fake.calls.created.some(node => node instanceof fake.module.Gain && node.gain.value === 3.5), "PM2.5 keeps its raised independent channel calibration");
  const initialAttacks = fake.calls.pmAttacks;
  assert.equal(engine.playFrame({ norm: 0 }, track), true);
  const darkCutoff = fake.calls.pm25Cutoffs.at(-1);
  assert.equal(fake.calls.pmAttacks, initialAttacks + 1);
  assert.equal(engine.playFrame({ norm: 1 }, track), true);
  const brightCutoff = fake.calls.pm25Cutoffs.at(-1);
  assert.ok(brightCutoff > darkCutoff);
  assert.equal(fake.calls.pmAttacks, initialAttacks + 1, "Regular frame updates glide the voice instead of retriggering a hit");
  assert.ok(fake.calls.pmNoteChanges.at(-1) > fake.calls.notes.at(-1), "Higher concentration raises the sustained note");
  assert.deepEqual(fake.calls.pmVelocities, [0.32], "Concentration changes pitch and spectral color, not loudness");
  assert.equal(fake.calls.created.length, count, "Frame updates reuse the same FM synth, filter and reverb");
  const releases = fake.calls.pmReleases;
  assert.equal(engine.playFrame({ norm: null }, track), false);
  assert.ok(fake.calls.pmReleases > releases);
  engine.dispose();
  assert.equal(fake.calls.disposals, count);
});

test("the seven instruments share resources, silence zero precipitation and dispose completely", async () => {
  const fake = fakeTone(), engine = createAudioEngine(async () => fake.module);
  assert.equal(engine.playPrecipitation(1), false); assert.equal(engine.playHumidity(8), false);
  await engine.enable(); const allocated = fake.calls.created.length;
  assert.equal(engine.playPrecipitation(0.5), true); assert.equal(engine.playPrecipitation(10), true);
  const rainReleases = fake.calls.windReleases;
  assert.equal(engine.playPrecipitation(0), true);
  assert.ok(fake.calls.windReleases > rainReleases);
  assert.equal(engine.playHumidity(2), true); assert.equal(engine.playHumidity(18), true);
  assert.equal(engine.playCarbonMonoxide(0.2), true); assert.equal(engine.playCarbonMonoxide(0.8), true);
  assert.equal(engine.playOzone(0.2), true); assert.equal(engine.playOzone(0.8), true);
  assert.ok(fake.calls.brassAttacks > 0); assert.ok(fake.calls.plucks > 0);
  assert.equal(fake.calls.created.length, allocated);
  assert.equal(fake.calls.created.filter((node) => node instanceof fake.module.Limiter).length, 1);
  engine.setMuted(true); assert.equal(engine.playHumidity(8), false); assert.equal(engine.playPrecipitation(1), false);
  engine.dispose(); assert.equal(fake.calls.disposals, allocated);
});

test("new legends compare stated amount, humidity and pollutant reference endpoints", async () => {
  const originalWindow = globalThis.window;
  try {
    for (const [kind, method, expected] of [["precipitation", "playPrecipitation", [0.5, 1]], ["humidity", "playHumidity", [0, 22]], ["pm25", "playPm25", [0, 1]], ["carbonMonoxide", "playCarbonMonoxide", [0, 1]], ["ozone", "playOzone", [0, 1]]]) {
      const tasks = [], values = [], steps = [];
      globalThis.window = { setTimeout(fn, delay) { tasks.push({ fn, delay }); return tasks.length; }, clearTimeout() {} };
      const legend = createLegend({ audio: { stop() {}, [method](value) { values.push(value); return true; } }, speech: { cancel() {}, speak() {} }, enableAudio: async () => {}, getKind: () => kind, onBeforeStart() {}, onState() {}, onStep(text) { steps.push(text); }, onError() { assert.fail("Unexpected error"); } });
      await legend.toggle(); tasks.find((t) => t.delay === 2500).fn(); tasks.at(-1).fn();
      assert.deepEqual(values, expected); assert.match(steps.at(-1), /not current measurements/); assert.equal(legend.active, false);
      if (kind === "pm25") {
        assert.match(steps[0], /0\.4 µg\/m³/);
        assert.match(steps[1], /409\.6 µg\/m³/);
        assert.match(steps.at(-1), /not a health-risk rating/);
      }
      if (kind === "carbonMonoxide") { assert.match(steps[0], /40 ppbv/); assert.match(steps[1], /500 ppbv/); }
      if (kind === "ozone") { assert.match(steps[0], /5 ppbv/); assert.match(steps[1], /60 ppbv/); }
    }
  } finally { globalThis.window = originalWindow; }
});


test("humidity reference extremes reveal harmonics with fixed pitch and no new voices", async () => {
  const fake = fakeTone(), engine = createAudioEngine(async () => fake.module);
  await engine.enable();
  const count = fake.calls.created.length;
  const strings = fake.calls.created.find(node => node instanceof fake.module.FatOscillator);
  const color = strings.connections[0], level = strings.connections[1];
  engine.playHumidity(0);
  const low = color.frequency.value, lowGain = level.gain.value;
  engine.playHumidity(22);
  assert.ok(color.frequency.value / low > 10, "Legend should span a substantial spectral opening");
  assert.ok(level.gain.value < lowGain, "Compensate added harmonic energy instead of using loudness as the cue");
  assert.equal(fake.calls.created.length, count, "Reference changes reuse the ensemble");
  engine.dispose();
  assert.equal(fake.calls.disposals, count);
});


test("combined audio updates seven persistent instruments and stops missing layers", async () => {
  const fake=fakeTone(),engine=createAudioEngine(async()=>fake.module);
  engine.setCombinedMode(true);
  await engine.enable();
  const count=fake.calls.created.length;
  const layers=[
    {frame:{norm:.6},track:temperatureTrack},
    {frame:{mean:10},track:windTrack},
    {frame:{mean:1},track:{id:'clima-chuva',svsId:5149,unit:'mm'}},
    {frame:{mean:8},track:{id:'clima-umidade',svsId:5150,unit:'g/kg'}},
    {frame:{norm:.4},track:{id:'ar-pm25',svsId:5151,unit:'µg/m³'}},
    {frame:{norm:.3},track:{id:'ar-co',svsId:5153,unit:'ppbv'}},
    {frame:{norm:.7},track:{id:'clima-ozonio',svsId:5152,unit:'ppbv'}},
  ];
  assert.equal(engine.playLayers(layers),true);
  const envelopes=fake.calls.created.filter(n=>n instanceof fake.module.AmplitudeEnvelope);
  assert.ok(envelopes.every(n=>n.active));
  engine.playLayers(layers.filter(e=>e.track.id!=='clima-vento'));
  assert.equal(envelopes[0].active,false,'Missing wind timestamp must release the old wind');
  assert.equal(envelopes[1].active,true);
  assert.equal(fake.calls.created.length,count);
  assert.equal(fake.calls.created.filter(n=>n instanceof fake.module.Limiter).length,1);
  engine.setInstrumentMuted('humidity',true);
  engine.playLayers(layers);assert.equal(envelopes[1].active,false);
  engine.setMuted(true);assert.equal(engine.playLayers(layers),false);
  engine.dispose();assert.equal(fake.calls.disposals,count);
});


test("precipitation keeps rate mapping, schedules discrete strikes and stops at zero", async () => {
  const fake = fakeTone(), engine = createAudioEngine(async () => fake.module);
  await engine.enable();
  const clock = fake.calls.created.find(n => n instanceof fake.module.Clock);
  const count = fake.calls.created.length;
  engine.playPrecipitation(.5);
  assert.equal(fake.calls.rates.at(-1), mapPrecipitation(.5));
  clock.callback(1.03);
  assert.equal(fake.calls.notes.at(-1), 'E3');
  engine.playPrecipitation(1);
  assert.equal(fake.calls.rates.at(-1), mapPrecipitation(1));
  clock.callback(1.03);
  assert.equal(fake.calls.notes.at(-1), "G4", "Amount changes the next drum stroke as well as its rate");
  assert.equal(fake.calls.created.length, count);
  engine.playPrecipitation(0);
  assert.equal(clock.state, 'stopped');
  engine.dispose();
  assert.equal(fake.calls.disposals, count);
});

test("ozone plays low and high valid concentrations without a threshold", async () => {
  const fake = fakeTone(), engine = createAudioEngine(async () => fake.module);
  await engine.enable();
  const track = { id: "clima-ozonio", unit: "ppbv" };
  for (const mean of [5, 35, 40, 41, 42, 50, 60]) {
    const before = fake.calls.plucks;
    assert.equal(engine.playFrame({ mean, norm: (mean - 5) / 55, coverage: .5 }, track), true);
    assert.equal(fake.calls.plucks, before + 1);
  }
  assert.equal(engine.playFrame({ mean: null, norm: null, coverage: 0 }, track), false);
  engine.dispose();
});

test("sound examples skip speech when spoken navigation is off", async () => {
  const originalWindow = globalThis.window;
  const tasks = [], events = [];
  globalThis.window = { setTimeout(fn) { tasks.push(fn); return tasks.length; }, clearTimeout() {} };
  try {
    const legend = createLegend({
      audio: { stop() { events.push('stop'); }, playNote(note) { events.push(note); return true; } },
      speech: { cancel() {}, speak() { assert.fail('Voice is off'); } },
      shouldNarrate: () => false,
      enableAudio: async () => {}, onBeforeStart() {}, onState() {}, onError: assert.fail,
    });
    await legend.toggle();
    assert.deepEqual(events, ['stop', 'C3']);
    tasks[0]();
    assert.deepEqual(events, ['stop', 'C3', 'stop', 'C5']);
    tasks[1]();
    assert.equal(legend.active, false);
  } finally { globalThis.window = originalWindow; }
});

test("each example stops audio before speech and waits for speech completion", async () => {
  const originalWindow = globalThis.window;
  const tasks = [], events = [], finishes = [];
  globalThis.window = { setTimeout(fn) { tasks.push(fn); return tasks.length; }, clearTimeout() {} };
  try {
    const legend = createLegend({
      audio: { stop() { events.push('stop'); }, playNote(note) { events.push(note); return true; } },
      speech: { cancel() {}, speak(text, interrupt, done) { events.push('speech'); finishes.push(done); return true; } },
      shouldNarrate: () => true,
      enableAudio: async () => {}, onBeforeStart() {}, onState() {}, onError: assert.fail,
    });
    await legend.toggle();
    assert.deepEqual(events, ['stop', 'speech']);
    finishes[0]();
    assert.deepEqual(events, ['stop', 'speech', 'C3']);
    tasks[0]();
    assert.deepEqual(events.slice(-2), ['stop', 'speech']);
    finishes[1]();
    assert.equal(events.at(-1), 'C5');
    legend.cancel();
  } finally { globalThis.window = originalWindow; }
});
