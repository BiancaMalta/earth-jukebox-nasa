// AI-assisted: OpenAI Codex
// Filtered pink noise forms slow rolling swells and a soft air current.
// The supplied log-scale position changes texture, never physical wind or wave speed.
export function createPm25Sound(tone, destination) {
  const wave = new tone.Noise({ type: "pink", fadeIn: 0.24, fadeOut: 0.38 });
  const waveFilter = new tone.Filter({ frequency: 220, type: "lowpass", rolloff: -24, Q: 0.5 });
  const waveLevel = new tone.Gain(0.24);
  const waveGate = new tone.Gain(0);
  const air = new tone.Noise({ type: "pink", fadeIn: 0.12, fadeOut: 0.24 });
  const airFilter = new tone.Filter({ frequency: 550, type: "bandpass", Q: 0.65 });
  const airLevel = new tone.Gain(0.12);
  const airGate = new tone.Gain(0);
  const mix = new tone.Gain(1);
  const soften = new tone.Filter({ frequency: 3000, type: "lowpass", rolloff: -24, Q: 0.4 });
  const wavePulse = new tone.LFO({ frequency: 0.07, min: 0, max: 1, type: "sine", phase: 90 });
  const airPulse = new tone.LFO({ frequency: 0.22, min: 0, max: 1, type: "sine", phase: 180 });
  const waveShape = new tone.Pow(3);
  const airShape = new tone.Pow(3);
  const envelope = new tone.AmplitudeEnvelope({ attack: 0.18, decay: 0.1, sustain: 1, release: 0.3 });
  const reverb = new tone.Reverb({ decay: 1.4, preDelay: 0.02, wet: 0 });

  wave.chain(waveFilter, waveLevel, waveGate, mix);
  air.chain(airFilter, airLevel, airGate, mix);
  mix.chain(soften, envelope, reverb, destination);
  wavePulse.chain(waveShape, waveGate.gain);
  airPulse.chain(airShape, airGate.gain);
  wave.start(); air.start(); wavePulse.start(); airPulse.start();

  let active = false;
  function stop() {
    envelope.cancel(tone.now());
    envelope.triggerRelease(tone.now());
    reverb.wet.value = 0;
    active = false;
  }

  return {
    ready: reverb.ready,
    update({ waveRate, airRate, openness }, duration) {
      wavePulse.frequency.rampTo(waveRate, 0.28);
      airPulse.frequency.rampTo(airRate, 0.28);
      waveFilter.frequency.rampTo(220 + 650 * openness, 0.28);
      airFilter.frequency.rampTo(550 + 1100 * openness, 0.28);
      if (duration !== undefined) {
        stop();
        reverb.wet.value = 0.08;
        envelope.triggerAttackRelease(duration, tone.now(), 0.65);
      } else if (!active) {
        envelope.cancel(tone.now());
        reverb.wet.value = 0.08;
        envelope.triggerAttack(tone.now(), 0.65);
        active = true;
      }
    },
    stop,
    dispose() {
      for (const node of [wave, waveFilter, waveLevel, waveGate, air, airFilter, airLevel, airGate, mix, soften, wavePulse, airPulse, waveShape, airShape, envelope, reverb]) node.dispose();
    },
  };
}
