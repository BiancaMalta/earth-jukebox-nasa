// Bright synthesized trumpet-like lead; pitch follows the supplied norm.
export function createCarbonMonoxideSound(tone, destination) {
  const synth = new tone.MonoSynth({
    oscillator: { type: "pulse", width: 0.38 },
    filter: { type: "lowpass", frequency: 2100, rolloff: -24, Q: 0.8 },
    envelope: { attack: 0.035, decay: 0.13, sustain: 0.55, release: 0.16 },
    filterEnvelope: {
      attack: 0.025, decay: 0.16, sustain: 0.18, release: 0.16,
      baseFrequency: 300, octaves: 2.2, exponent: 1,
    },
    portamento: 0.025,
  }).connect(destination);
  let heldNote;

  function stop() {
    if (heldNote === undefined) return;
    synth.triggerRelease(tone.now());
    heldNote = undefined;
  }

  return {
    ready: Promise.resolve(),
    update({ note }, duration) {
      const now = tone.now();
      if (duration !== undefined) {
        stop();
        synth.triggerAttackRelease(note, duration, now, 0.38);
      } else if (heldNote === undefined) {
        synth.triggerAttack(note, now, 0.38);
        heldNote = note;
      } else if (note !== heldNote) {
        synth.setNote(note, now);
        heldNote = note;
      }
    },
    stop,
    dispose() { synth.dispose(); },
  };
}
