// AI-assisted: OpenAI Codex
export function createSpeechEngine(scope = window, onStatus = () => {}, onSpeaking = () => {}) {
  const supported = Boolean(scope.speechSynthesis && scope.SpeechSynthesisUtterance);
  let utterance, watchdog, voice, lastStatus, completion;
  function complete() { const callback = completion; completion = undefined; callback?.(); }
  function report(message) {
    if (message !== lastStatus) { lastStatus = message; onStatus(message); }
  }
  function refreshVoices() {
    const voices = supported ? scope.speechSynthesis.getVoices() : [];
    voice = voices.find((item) => /^en-US$/i.test(item.lang)) ?? voices.find((item) => /^en[-_]/i.test(item.lang) || item.lang === "en");
    report(!supported ? "Speech synthesis is unavailable in this browser. Dates and legend text remain available."
      : voice ? `English voice ready: ${voice.name}. Use Test voice to check speech.`
        : "No English speech voice is available in this browser. Enable a system voice or try a browser with English voices. Music and date text still work.");
    return voice;
  }
  function cancel() {
    clearTimeout(watchdog);
    if (!supported || !utterance) return;
    utterance.onstart = utterance.onend = utterance.onerror = null;
    scope.speechSynthesis.cancel();
    utterance = undefined;
    onSpeaking(false);
    complete();
  }
  scope.speechSynthesis?.addEventListener?.("voiceschanged", refreshVoices);
  return {
    supported, cancel, refreshVoices,
    speak(text, interrupt = false, onComplete) {
      if (!supported || typeof text !== "string" || !text) { if (!supported) refreshVoices(); return false; }
      const synthesis = scope.speechSynthesis;
      if (!interrupt && (utterance || synthesis.speaking || synthesis.pending)) return false;
      if (interrupt) cancel();
      if (!refreshVoices()) return false;
      synthesis.resume();
      const current = new scope.SpeechSynthesisUtterance(text);
      utterance = current;
      completion = onComplete;
      current.voice = voice;
      current.lang = voice.lang;
      current.rate = 1;
      current.volume = 0.8;
      current.onstart = () => { clearTimeout(watchdog); if (utterance === current) onSpeaking(true); };
      current.onend = () => { clearTimeout(watchdog); if (utterance === current) { utterance = undefined; onSpeaking(false); complete(); } };
      current.onerror = (event) => {
        clearTimeout(watchdog);
        if (utterance !== current) return;
        utterance = undefined;
        onSpeaking(false);
        report(`Speech could not play (${event.error || "unknown error"}). Try Test voice or another browser. Date text remains available.`);
        complete();
      };
      watchdog = setTimeout(() => {
        if (utterance !== current) return;
        cancel();
        report("The browser did not start speech. Try Test voice; if no voice is heard, check system voices or use another browser.");
      }, 3000);
      try { synthesis.speak(current); return true; }
      catch { cancel(); report("Speech could not start. Check your browser and system voice settings."); return false; }
    },
    dispose() {
      cancel();
      scope.speechSynthesis?.removeEventListener?.("voiceschanged", refreshVoices);
    },
  };
}
