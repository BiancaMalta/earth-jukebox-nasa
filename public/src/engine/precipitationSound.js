// AI-assisted: OpenAI Codex
// Bright hand-drum/snare-like strokes with a dry, audible attack, not literal rain sounds.
// Only the unchanged repetition rate carries precipitation AMOUNT in mm.
export function createPrecipitationSound(tone, destination) {
  const carrier = new tone.Oscillator({ frequency: "G3", type: "custom", partials: [0.45, 1, 0.75, 0.35, 0.15] });
  const level = new tone.Gain(0.4);
  const stroke = new tone.Noise({ type: "white", fadeIn: 0.008, fadeOut: 0.08 });
  const strokeFilter = new tone.Filter({ frequency: 2300, type: "bandpass", Q: 0.9 });
  const strokeLevel = new tone.Gain(0.6);
  const mix = new tone.Gain(1);
  const soften = new tone.Filter({ frequency: 3200, type: "lowpass", rolloff: -24, Q: 0.4 });
  const pulseGain = new tone.Gain(0);
  const pulse = new tone.LFO({ frequency: 0.5, min: 0, max: 1, type: "sine", phase: 90 });
  // Narrow nonnegative windows give rounded, short strokes without sharp edges.
  // The LFO is an audio envelope source; it never advances dataset frames.
  const shape = new tone.Pow(32);
  const envelope = new tone.AmplitudeEnvelope({ attack: 0.008, decay: 0.1, sustain: 1, release: 0.12 });
  const reverb = new tone.Reverb({ decay: 0.35, preDelay: 0.008, wet: 0 });
  carrier.chain(level, mix);
  stroke.chain(strokeFilter, strokeLevel, mix);
  mix.chain(soften, pulseGain, envelope, reverb, destination);
  pulse.chain(shape, pulseGain.gain);
  carrier.start(); stroke.start(); pulse.start();
  let active = false;
  function stop() { envelope.cancel(tone.now()); envelope.triggerRelease(tone.now()); reverb.wet.value = 0; active = false; }
  return {
    ready: reverb.ready,
    update({ rate }, duration) {
      if (rate === 0) return stop();
      pulse.frequency.rampTo(rate, 0.18);
      if (duration !== undefined) {
        stop(); reverb.wet.value = 0.025;
        envelope.triggerAttackRelease(duration, tone.now(), 0.7);
      } else if (!active) {
        envelope.cancel(tone.now()); reverb.wet.value = 0.025;
        envelope.triggerAttack(tone.now(), 0.7); active = true;
      }
    },
    stop,
    dispose() { for (const node of [carrier, level, stroke, strokeFilter, strokeLevel, mix, soften, pulseGain, pulse, shape, envelope, reverb]) node.dispose(); },
  };
}
