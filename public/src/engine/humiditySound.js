// AI-assisted: OpenAI Codex
// Specific humidity controls spectral body, never rain, rhythmic events or pitch.
// A fixed detuned C3 ensemble is one composite instrument, not new frame voices.
export function createHumiditySound(tone, destination) {
  const breath = new tone.Noise({ type: "pink", fadeIn: 0.1, fadeOut: 0.2 });
  const body = new tone.Filter({ frequency: 650, type: "bandpass", Q: 650 / 160 });
  const breathLevel = new tone.Gain(0.06);
  const strings = new tone.FatOscillator({ frequency: "C3", type: "sawtooth", count: 3, spread: 8 });
  const color = new tone.Filter({ frequency: 180, type: "lowpass", rolloff: -24, Q: 0.5 });
  const stringLevel = new tone.Gain(0.55);
  const mix = new tone.Gain(1);
  const soften = new tone.Filter({ frequency: 3800, type: "lowpass", rolloff: -24, Q: 0.4 });
  const envelope = new tone.AmplitudeEnvelope({ attack: 0.22, decay: 0.1, sustain: 1, release: 0.22 });
  const reverb = new tone.Reverb({ decay: 1.8, preDelay: 0.025, wet: 0 });
  breath.chain(body, breathLevel, mix);
  strings.chain(color, stringLevel, mix);
  mix.chain(soften, envelope, reverb, destination);
  breath.start(); strings.start();
  let active = false;
  function stop() { envelope.cancel(tone.now()); envelope.triggerRelease(tone.now()); reverb.wet.value = 0; active = false; }
  return {
    ready: reverb.ready,
    update({ bandwidth }, duration) {
      // Fixed expressive transfer from the existing scientific mapping. No local
      // data-range stretching: bandwidth 160..1600 -> cutoff 180..3600 Hz.
      const openness = (bandwidth - 160) / 1440;
      body.Q.rampTo(650 / bandwidth, 0.2);
      color.frequency.rampTo(180 * Math.pow(20, openness), 0.2);
      // Keep the richer spectrum from becoming a loudness demonstration.
      stringLevel.gain.rampTo(0.55 / (1 + 0.8 * openness), 0.2);
      if (duration !== undefined) {
        stop(); reverb.wet.value = 0.14;
        envelope.triggerAttackRelease(duration, tone.now(), 0.8);
      } else if (!active) {
        envelope.cancel(tone.now()); reverb.wet.value = 0.14;
        envelope.triggerAttack(tone.now(), 0.8); active = true;
      }
    },
    stop,
    dispose() { for (const node of [breath, body, breathLevel, strings, color, stringLevel, mix, soften, envelope, reverb]) node.dispose(); },
  };
}
