// AI-assisted: OpenAI Codex
// A single fixed-pitch flute-like carrier + quiet breath, shaped into pulses.
// Speed determines pulse rate only; C3 is a timbral reference, not wind pitch.
export function createWindSound(tone, destination) {
  const flute = new tone.Oscillator({ frequency: "C3", type: "custom", partials: [1, 0.06, 0.12, 0.02] });
  const fluteLevel = new tone.Gain(0.42);
  const breath = new tone.Noise({ type: "pink", fadeIn: 0.08, fadeOut: 0.12 });
  const breathFilter = new tone.Filter({ frequency: 650, type: "bandpass", Q: 0.65 });
  const breathLevel = new tone.Gain(0.15);
  const mix = new tone.Gain(1);
  const soften = new tone.Filter({ frequency: 1400, type: "lowpass", rolloff: -24, Q: 0.4 });
  const pulseGain = new tone.Gain(0);
  const pulse = new tone.LFO({ frequency: 0.3, min: 0, max: 1, type: "sine", phase: 90 });
  // A cubed, nonnegative sine opens short, rounded windows with quiet gaps.
  // No square-wave edges/clicks and no JS note scheduler or extra frame clock.
  const shape = new tone.Pow(3);
  const envelope = new tone.AmplitudeEnvelope({ attack: 0.12, decay: 0.1, sustain: 1, release: 0.16 });
  const reverb = new tone.Reverb({ decay: 1.2, preDelay: 0.015, wet: 0 });
  flute.chain(fluteLevel, mix);
  breath.chain(breathFilter, breathLevel, mix);
  mix.chain(soften, pulseGain, envelope, reverb, destination);
  pulse.chain(shape, pulseGain.gain);
  flute.start(); breath.start(); pulse.start();
  let active = false;
  function stop() {
    envelope.cancel(tone.now());
    envelope.triggerRelease(tone.now());
    reverb.wet.value = 0;
    active = false;
  }
  return {
    ready: reverb.ready,
    update({ rate }, duration) {
      pulse.frequency.rampTo(rate, 0.18);
      if (duration !== undefined) {
        stop();
        reverb.wet.value = 0.12;
        envelope.triggerAttackRelease(duration, tone.now(), 0.8);
      } else if (!active) {
        envelope.cancel(tone.now());
        reverb.wet.value = 0.12;
        envelope.triggerAttack(tone.now(), 0.8);
        active = true;
      }
    },
    stop,
    dispose() {
      for (const node of [flute, fluteLevel, breath, breathFilter, breathLevel, mix, soften, pulseGain, pulse, shape, envelope, reverb]) node.dispose();
    },
  };
}
