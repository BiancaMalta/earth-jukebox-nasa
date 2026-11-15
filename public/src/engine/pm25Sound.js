// A sustained metallic FM tone glides with PM2.5; it has no per-frame beat.
import { PM25_PITCH_RANGE } from "./mapping.js";
export function createPm25Sound(tone, destination) {
  const synth = new tone.FMSynth({
    harmonicity: 2.4,
    modulationIndex: 4.2,
    oscillator: { type: "sine" },
    modulation: { type: "sine" },
    envelope: { attack: 0.28, decay: 0.2, sustain: 0.5, release: 0.4 },
    modulationEnvelope: { attack: 0.24, decay: 0.24, sustain: 0.35, release: 0.4 },
    portamento: 0.22,
  });
  synth.volume.value = -3;
  const filter = new tone.Filter({ frequency: 3100, type: "lowpass", rolloff: -24, Q: 0.45 });
  const reverb = new tone.Reverb({ decay: 0.9, preDelay: 0.02, wet: 0.08 });
  synth.chain(filter, reverb, destination);
  let active = false;

  function stop() {
    synth.triggerRelease(tone.now());
    active = false;
  }

  return {
    ready: reverb.ready,
    update({ frequency, brightness }, duration) {
      if (!Number.isFinite(frequency) || frequency < PM25_PITCH_RANGE.min || frequency > PM25_PITCH_RANGE.max
        || !Number.isFinite(brightness) || brightness < 0 || brightness > 1) return;
      const now = tone.now();
      filter.frequency.rampTo(1400 + 4800 * brightness, 0.24);
      if (duration !== undefined) {
        stop();
        synth.triggerAttackRelease(frequency, duration, now, 0.32);
      } else if (!active) {
        synth.triggerAttack(frequency, now, 0.32);
        active = true;
      } else {
        synth.setNote(frequency, now);
      }
    },
    stop,
    dispose() { synth.dispose(); filter.dispose(); reverb.dispose(); },
  };
}
