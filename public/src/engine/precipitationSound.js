// AI-assisted: OpenAI Codex
// Fixed G4 glass-like plucks. Their density codes precipitation AMOUNT in mm,
// not mm/hour, actual raindrops, or local rainfall events.
export function createPrecipitationSound(tone, destination) {
  const carrier = new tone.FMOscillator({ frequency: "G4", type: "sine", modulationType: "sine", harmonicity: 3, modulationIndex: 0.8 });
  const level = new tone.Gain(0.4);
  const soften = new tone.Filter({ frequency: 1800, type: "lowpass", rolloff: -24, Q: 0.4 });
  const pulseGain = new tone.Gain(0);
  const pulse = new tone.LFO({ frequency: 0.5, min: 0, max: 1, type: "sine", phase: 90 });
  const shape = new tone.Pow(8);
  const envelope = new tone.AmplitudeEnvelope({ attack: 0.08, decay: 0.1, sustain: 1, release: 0.14 });
  const reverb = new tone.Reverb({ decay: 1.1, preDelay: 0.015, wet: 0 });
  carrier.chain(level, soften, pulseGain, envelope, reverb, destination);
  pulse.chain(shape, pulseGain.gain);
  carrier.start(); pulse.start();
  let active = false;
  function stop() { envelope.cancel(tone.now()); envelope.triggerRelease(tone.now()); reverb.wet.value = 0; active = false; }
  return {
    ready: reverb.ready,
    update({ rate }, duration) {
      if (rate === 0) return stop();
      pulse.frequency.rampTo(rate, 0.18);
      if (duration !== undefined) {
        stop(); reverb.wet.value = 0.12;
        envelope.triggerAttackRelease(duration, tone.now(), 0.7);
      } else if (!active) {
        envelope.cancel(tone.now()); reverb.wet.value = 0.12;
        envelope.triggerAttack(tone.now(), 0.7); active = true;
      }
    },
    stop,
    dispose() { for (const node of [carrier, level, soften, pulseGain, pulse, shape, envelope, reverb]) node.dispose(); },
  };
}
