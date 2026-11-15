// AI-assisted: OpenAI Codex
// Reference examples explain mappings; these timers never advance dataset time.
export function createLegend({ audio, speech, enableAudio, onBeforeStart, onState, onStep = () => {}, onError, getKind = () => "temperature" }) {
  let active = false, generation = 0, timers = [];
  function cancel() {
    if (!active) return;
    ++generation; active = false;
    timers.forEach((timer) => window.clearTimeout(timer)); timers = [];
    audio.stop(); speech.cancel(); onState(false);
  }
  async function toggle() {
    if (active) return cancel();
    const id = ++generation;
    active = true; onBeforeStart(); onState(true);
    try {
      await enableAudio();
      if (!active || id !== generation) return;
      const examples = {
        temperature: { play: (high) => audio.playNote(high ? "C5" : "C3", 1.8), low: "Low values — lower pitch (C3).", high: "High values — higher pitch (C5).", meaning: "Higher normalized temperature means higher pitch" },
        windVisual: { play: (high) => audio.playWindActivity(high ? 0.1 : 0.01, 1.8), low: "Visual signal index 0.01 — slower pulse.", high: "Visual signal index 0.10 — faster pulse.", meaning: "More intense and extensive visible wind colors mean faster pulses; this is not a wind-speed measurement" },
        wind: { play: (high) => audio.playWind(high ? 25 : 5, 1.8), low: "Example 5 m/s — slower musical pulse.", high: "Example 25 m/s — faster musical pulse.", meaning: "Higher wind speed means faster musical pulses" },
        precipitation: { play: (high) => audio.playPrecipitation(high ? 10 : 0.5, 1.8), low: "Example 0.5 mm — slower dry drum strokes.", high: "Example 10 mm — faster dry drum strokes.", meaning: "Higher precipitation amount means faster drum strokes, not millimeters per hour" },
        humidity: { play: (high) => audio.playHumidity(high ? 22 : 0, 1.8), low: "Example 0 g/kg — dark, thin string pad.", high: "Example 22 g/kg — bright, rich string pad.", meaning: "Higher specific humidity means richer string harmonics, not rainfall" },
        pm25Visual: { play: (high) => audio.playPm25(high ? 1 : 0, 1.8), low: "Visual PM2.5 index 0 — lower, darker sustained tone (C4).", high: "Visual PM2.5 index 1 — higher, brighter sustained tone (C6).", meaning: "More intense and extensive detected PM2.5 colors mean a higher, brighter tone at the same loudness; the index is not a concentration measurement" },
        pm25: { play: (high) => audio.playPm25(high ? 1 : 0, 1.8), low: "Example 0.4 µg/m³ — lower, darker sustained tone (C4).", high: "Example 409.6 µg/m³ — higher, brighter sustained tone (C6).", meaning: "Higher log-scaled PM2.5 position raises the metallic tone and brightens its filter without changing loudness or adding a beat; this is not a health-risk rating" },
        carbonMonoxide: { play: (high) => audio.playCarbonMonoxide(high ? 1 : 0, 1.8), low: "Example 40 ppbv — lower brass note (C3).", high: "Example 500 ppbv — higher brass note (C5).", meaning: "Higher supplied carbon monoxide concentration means higher pitch; the note is not a health-risk rating" },
        ozone: { play: (high) => audio.playOzone(high ? 1 : 0, 1.8), low: "Example 5 ppbv — lower plucked note (C4).", high: "Example 60 ppbv — higher plucked note (C6).", meaning: "Higher supplied ozone concentration means higher pitch; the note is not a health-risk rating" },
      };
      const example = examples[getKind()];
      if (!example) throw new Error("No sound mapping is available for this experience.");
      const later = (delay, action) => timers.push(window.setTimeout(() => {
        if (!active || id !== generation) return;
        try { action(); } catch (error) { cancel(); onError(error.message); }
      }, delay));
      const present = (high) => {
        const text = high ? example.high : example.low;
        onStep(text, high ? 2 : 1);
        let played = false;
        const play = () => {
          if (played || !active || id !== generation) return;
          played = true;
          try {
            if (!example.play(high)) throw new Error("Enable sound to hear the legend.");
            later(2500, () => {
              if (!high) present(true);
              else { cancel(); onStep(`Legend complete. ${example.meaning}. Examples are not current measurements.`, 0); }
            });
          } catch (error) { cancel(); onError(error.message); }
        };
        if (!speech.speak(text, true, play)) play();
      };
      present(false);
    } catch (error) { if (id === generation) { cancel(); onError(error.message); } }
  }
  return { toggle, cancel, get active() { return active; } };
}
