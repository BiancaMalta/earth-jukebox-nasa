// AI-assisted: OpenAI Codex
// Specific humidity changes nominal spectral WIDTH, not rain sounds or pitch.
// Q = center / bandwidth controls the body of a steady filtered-noise pad.
export function createHumiditySound(tone, destination) {
  const breath = new tone.Noise({ type: "pink", fadeIn: 0.1, fadeOut: 0.2 });
  const body = new tone.Filter({ frequency: 650, type: "bandpass", Q: 650 / 160 });
  const breathLevel = new tone.Gain(0.65);
  const carrier = new tone.Oscillator({ frequency: "C4", type: "custom", partials: [1, 0.06, 0.04] });
  const carrierLevel = new tone.Gain(0.18);
  const mix = new tone.Gain(1);
  const soften = new tone.Filter({ frequency: 1800, type: "lowpass", rolloff: -24, Q: 0.4 });
  const envelope = new tone.AmplitudeEnvelope({ attack: 0.3, decay: 0.1, sustain: 1, release: 0.25 });
  const reverb = new tone.Reverb({ decay: 1.8, preDelay: 0.025, wet: 0 });
  breath.chain(body, breathLevel, mix);
  carrier.chain(carrierLevel, mix);
  mix.chain(soften, envelope, reverb, destination);
  breath.start(); carrier.start();
  let active = false;
  function stop() { envelope.cancel(tone.now()); envelope.triggerRelease(tone.now()); reverb.wet.value = 0; active = false; }
  return {
    ready: reverb.ready,
    update({ bandwidth }, duration) {
      body.Q.rampTo(650 / bandwidth, 0.2);
      if (duration !== undefined) {
        stop(); reverb.wet.value = 0.18;
        envelope.triggerAttackRelease(duration, tone.now(), 0.8);
      } else if (!active) {
        envelope.cancel(tone.now()); reverb.wet.value = 0.18;
        envelope.triggerAttack(tone.now(), 0.8); active = true;
      }
    },
    stop,
    dispose() { for (const node of [breath, body, breathLevel, carrier, carrierLevel, mix, soften, envelope, reverb]) node.dispose(); },
  };
}
