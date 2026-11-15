// AI-assisted: OpenAI Codex
// Discrete membrane strikes: amount controls repetition and pitched drum body.
import { precipitationNote } from "./mapping.js";
export function createPrecipitationSound(tone, destination) {
  const body = new tone.MembraneSynth({
    pitchDecay: 0.018, octaves: 0.7, oscillator: { type: 'triangle' },
    envelope: { attack: 0.003, decay: 0.09, sustain: 0, release: 0.035 },
  }).connect(destination);
  const stick = new tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.012, sustain: 0, release: 0.008 },
  });
  const filter = new tone.Filter({ frequency: 2800, type: 'bandpass', Q: 1.2 }).connect(destination);
  stick.connect(filter);
  let active = false, until = Infinity, note = "C3";
  const clock = new tone.Clock(time => {
    if (time >= until) return;
    body.triggerAttackRelease(note, 0.06, time, 0.55);
    stick.triggerAttackRelease(0.012, time, 0.09);
  }, 0.5);
  function stop() {
    clock.stop(); active = false; until = -Infinity;
    body.triggerRelease(); stick.triggerRelease();
  }
  return {
    ready: Promise.resolve(),
    update({ rate }, duration) {
      if (rate === 0) return stop();
      note = precipitationNote(rate);
      const now = tone.now();
      if (duration !== undefined || Number.isFinite(until)) stop();
      until = duration === undefined ? Infinity : now + duration;
      clock.frequency.setValueAtTime(rate, now);
      if (!active || clock.state !== 'started') { clock.start(now + 0.025); active = true; }
      if (duration !== undefined) clock.stop(until);
    },
    stop,
    dispose() { stop(); for (const node of [clock, body, stick, filter]) node.dispose(); },
  };
}
