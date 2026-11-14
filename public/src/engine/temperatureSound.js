// AI-assisted: OpenAI Codex
// Expressive layer only. Scientific note selection stays in mapping.js.
export function createTemperatureSound(tone, destination) {
  const synth = new tone.Synth({
    oscillator: { type: "custom", partials: [1, 0.28, 0.09, 0.045, 0.015, 0.008] },
    envelope: { attack: 0.1, decay: 0.12, sustain: 1, release: 0.14 },
    portamento: 0.035,
  });
  const filter = new tone.Filter({ frequency: 1100, type: "lowpass", rolloff: -24, Q: 0.4 });
  const reverb = new tone.Reverb({ decay: 1.6, preDelay: 0.025, wet: 0 });
  synth.chain(filter, reverb, destination);
  let heldNote, ambience = true;
  function stop() {
    heldNote = undefined;
    synth.envelope.cancel(tone.now());
    synth.triggerRelease(tone.now());
    reverb.wet.value = 0;
  }
  return {
    ready: reverb.ready,
    update({ note }, duration) {
      const now = tone.now();
      if (duration !== undefined) {
        stop();
        reverb.wet.value = ambience ? 0.16 : 0;
        synth.triggerAttackRelease(note, duration, now, 0.5);
      } else if (heldNote === undefined) {
        stop();
        reverb.wet.value = ambience ? 0.16 : 0;
        synth.triggerAttack(note, now, 0.5);
        heldNote = note;
      } else if (note !== heldNote) {
        synth.setNote(note, now);
        heldNote = note;
      }
    },
    setAmbience(value) {
      ambience = Boolean(value);
      reverb.wet.rampTo(ambience && heldNote ? 0.16 : 0, 0.08);
    },
    stop,
    dispose() { synth.dispose(); filter.dispose(); reverb.dispose(); },
  };
}
