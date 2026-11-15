// Soft harp-like Karplus–Strong pluck; pitch follows the supplied norm.
export function createOzoneSound(tone, destination) {
  const pluck = new tone.PluckSynth({
    attackNoise: 0.9, dampening: 3500, resonance: 0.96, release: 0.18,
  });
  const filter = new tone.Filter({ frequency: 3000, type: "lowpass", rolloff: -24, Q: 0.5 });
  const reverb = new tone.Reverb({ decay: 1.1, preDelay: 0.02, wet: 0.1 });
  pluck.chain(filter, reverb, destination);

  return {
    ready: reverb.ready,
    update({ note }, duration) {
      pluck.triggerAttackRelease(note, duration ?? 0.34, tone.now(), 0.42);
    },
    stop() { pluck.triggerRelease(tone.now()); },
    dispose() { pluck.dispose(); filter.dispose(); reverb.dispose(); },
  };
}
