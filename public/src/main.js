// AI-assisted: OpenAI Codex
import { fetchJSON, describeDate } from "./data/features.js";
import { initPlayer } from "./ui/player.js";
import { describeReading, renderReading, describePixelFilters } from "./ui/readings.js";
import { createAudioEngine } from "./engine/audio.js";
import { mapFrameSound, soundKind } from "./engine/mapping.js";
import { describeExperience, renderExperience } from "./ui/experience.js";
import { createSpeechEngine } from "./engine/speech.js";
import { announce, initKeyboard } from "./ui/a11y.js";
import { createLegend } from "./ui/legend.js";
import { initRegionalExplorer } from "./ui/regions.js";
import { initCombined } from "./ui/combined.js";

const audio = createAudioEngine();
const speech = createSpeechEngine(window, (message) => { document.getElementById("speech-status").textContent = message; }, (speaking) => audio.setDucking(speaking));
const enable = document.getElementById("enable-sound");
const soundStatus = document.getElementById("sound-status");
const legendButton = document.getElementById("sound-legend");
const narrate = document.getElementById("narrate-dates");
const interval = document.getElementById("narration-interval");
let player, removeKeyboard, regions, lastNarratedIndex = null;
const combined = initCombined({
  audio,
  getFrame: () => player?.currentFrame,
  getRegion: () => regions?.selectionKey() ?? null,
  onVisuals: (entries) => player?.setCombinedFrames(entries),
  onChange: () => {
    legend.cancel();
    updateNoteStatus();
    const current = player?.currentFrame;
    if (!current) return;
    const selected = regions?.getFrame(current, player.currentIndex) ?? { frame: current, track: player.currentTrack };
    try { playFrameSound(selected.frame, selected.track, player.isPlaying ? undefined : 0.9); }
    catch { soundStatus.textContent = "Could not update the mix. Disable sound and retry."; audio.stop(); }
  },
});
function playFrameSound(frame, track, duration) {
  return combined.enabled ? combined.play(frame, duration) : audio.playFrame(frame, track, duration);
}


function updateNoteStatus(frame = player?.currentFrame, track = player?.currentTrack) {
  if (frame && regions) {
    const regional = regions.getFrame(frame, player?.currentIndex);
    frame = regional.frame;
    track = regional.track ?? track;
  }
  const element = document.getElementById("note-status");
  if (!element) return;
  combined.render(frame);
  if (combined.enabled) {
    element.textContent = !combined.ready ? "Combined datasets are loading."
      : !audio.enabled || audio.muted ? "Sound is off."
        : audio.volume === 0 ? "Music volume is zero."
          : legend.active ? "Selected instrument legend is playing alone."
            : player?.isPlaying ? "Combined experiment follows supplied timestamps." : "Combined experiment ready; playback is paused.";
    return;
  }
  const parameters = mapFrameSound(frame, track);
  element.textContent = !parameters ? "No sound for this frame."
    : parameters.kind === "precipitation" && parameters.rate === 0 ? "Zero precipitation amount; silent."
    : !audio.enabled || audio.muted ? "Sound is off."
      : audio.volume === 0 ? "Music volume is zero."
        : legend.active ? "Sound legend is playing."
          : player?.isPlaying ? "Music follows playback." : "Ready; playback is paused.";
}

function updateRegionalReading() {
  if (!regions) return;
  const tableData = regions.getTableData();
  player?.setRegionalTable(tableData);
  const frame = player?.currentFrame;
  if (!frame) return;
  const regional = regions.getFrame(frame, player.currentIndex);
  renderReading(document.getElementById("player"), regional.frame, regional.track);
  updateNoteStatus(regional.frame);
  if (tableData?.state === "ready") {
    announce("Regional values for " + tableData.name + " are ready. " + describeReading(regional.frame, regional.track).summary);
  }
}

async function enableAudio() {
  enable.disabled = true;
  soundStatus.textContent = "Enabling sound…";
  try {
    await audio.enable();
    audio.setMuted(false);
    enable.textContent = "Disable sound";
    enable.setAttribute("aria-pressed", "true");
    soundStatus.textContent = "Sound enabled. Play or change a frame to hear its sound.";
    updateNoteStatus();
  } catch (error) {
    enable.textContent = "Retry enabling sound";
    enable.setAttribute("aria-pressed", "false");
    audio.setMuted(true);
    updateNoteStatus();
    soundStatus.textContent = "Could not enable audio. Check your connection and browser audio permissions, then retry. The visual player still works.";
    throw error;
  } finally {
    enable.disabled = false;
  }
}

function releaseSound() {
  audio.stop();
  speech.cancel();
}

const legend = createLegend({
  audio, speech, enableAudio,
  getKind: () => player?.currentTrack?.sonification?.input === "visualSignal" ? "windVisual" : soundKind(player?.currentTrack),
  onBeforeStart: () => { player?.pause("Playback paused for the sound legend."); releaseSound(); },
  onState: (active) => {
    combined.setLegendMode(active);
    legendButton.textContent = active ? "Stop sound legend" : "Play sound legend";
    legendButton.setAttribute("aria-pressed", String(active));
    document.getElementById("legend-status").textContent = active ? "Preparing the sound legend…" : "Legend stopped. Play to hear it again.";
    updateNoteStatus();
  },
  onStep: (message) => { document.getElementById("legend-status").textContent = message; },
  onError: (message) => { document.getElementById("legend-status").textContent = `Could not play the legend. ${message || "Try enabling sound again."}`; },
});

enable.addEventListener("click", async () => {
  legend.cancel();
  if (audio.enabled && !audio.muted) {
    audio.setMuted(true);
    speech.cancel();
    enable.textContent = "Enable sound";
    enable.setAttribute("aria-pressed", "false");
    soundStatus.textContent = "Sound disabled. Visual playback continues.";
    updateNoteStatus();
    return;
  }
  try {
    await enableAudio();
    const current = player?.currentFrame;
    if (current) {
      const regional = regions?.getFrame(current, player.currentIndex) ?? { frame: current, track: player.currentTrack };
      playFrameSound(regional.frame, regional.track, player.isPlaying ? undefined : 0.9);
    }
  } catch { /* enableAudio provides the visible error and leaves the player usable. */ }
});
legendButton.addEventListener("click", () => { void legend.toggle(); });
document.getElementById("temperature-ambience").addEventListener("change", (event) => { audio.setAmbience(event.target.checked); });
document.getElementById("volume").addEventListener("input", (event) => {
  const value = Number(event.target.value);
  audio.setVolume(value);
  document.getElementById("volume-value").textContent = `${value}%`;
  event.target.setAttribute("aria-valuetext", `${value} percent`);
  updateNoteStatus();
});
if (!speech.supported) {
  narrate.disabled = interval.disabled = true;
  document.getElementById("speech-support").textContent = "Speech synthesis is unavailable in this browser. The legend's low and high notes and all date text remain available.";
}
speech.refreshVoices();
function speakCurrentDate() {
  if (audio.muted) {
    document.getElementById("speech-status").textContent = "Enable sound to hear spoken dates.";
    return;
  }
  const date = describeDate(player?.currentFrame?.date);
  if (!date) {
    document.getElementById("speech-status").textContent = "No valid date is available for the current frame.";
    return;
  }
  if (speech.speak(date, true)) lastNarratedIndex = player.currentIndex;
}
narrate.addEventListener("change", () => {
  if (!narrate.checked) speech.cancel();
  else { legend.cancel(); speakCurrentDate(); }
});
document.getElementById("test-voice").addEventListener("click", () => {
  legend.cancel();
  if (audio.muted) document.getElementById("speech-status").textContent = "Enable sound before testing the voice.";
  else speech.speak(describeExperience(player?.currentTrack).exampleSpeech, true);
});
interval.addEventListener("input", () => {
  speech.cancel();
  const value = Number(interval.value);
  interval.setCustomValidity(Number.isInteger(value) && value >= 1 && value <= 1000 ? "" : "Enter a whole number from 1 to 1000.");
});

function onFrame(frame, index, total, reason, track) {
  const parameters = mapFrameSound(frame, track);
  if ((!parameters && !combined.enabled) || reason === "paused") audio.stop();
  updateNoteStatus(frame, track);
  if (reason === "manual" || reason === "initial") announce((reason === "initial" ? "First frame loaded. " : "") + "Frame " + (index + 1) + " of " + total + ". " + (document.getElementById("demo-data").hidden ? "" : "Demo data. ") + describeReading(frame, track).summary);
  if (reason === "initial" || reason === "paused" || legend.active) return;
  try { if (parameters || combined.enabled) playFrameSound(frame, track, reason === "playback" && index < total - 1 ? undefined : 0.9); }
  catch { soundStatus.textContent = "Audio playback failed. Try enabling sound again; the visual player still works."; }
  const every = Number(interval.value);
  if (reason === "playback" && narrate.checked && !audio.muted && Number.isInteger(every) && every >= 1 && every <= 1000 && (lastNarratedIndex === null || index - lastNarratedIndex >= every)) {
    const date = describeDate(frame.date);
    if (date && speech.speak(date)) lastNarratedIndex = index;
  }
}

try {
  player = initPlayer(await fetchJSON("tracks/index.json"), {
    onTrackData: (context) => {
      document.getElementById("pixel-filter-method").textContent = describePixelFilters(context.colorbar);
      document.getElementById("mean-weighting-method").textContent = context.data.statistics?.mean === "area_weighted"
        ? "Mean = sum(decoded value × cosine latitude) ÷ sum(cosine latitude), using accepted pixels only. P90 remains an unweighted pixel percentile. Pixel inclusion remains a pixel-count ratio, not an area percentage."
        : "This dataset uses equal weights per decoded pixel. Its mean has not been area-weighted.";
      regions ??= initRegionalExplorer({ onSelection: () => { audio.stop(); updateRegionalReading(); }, onValueChange: () => {
        updateRegionalReading();
        if (player?.isPlaying && !legend.active) {
          const regional = regions.getFrame(player.currentFrame, player.currentIndex);
          playFrameSound(regional.frame, regional.track);
        }
      } });
      void regions.configure(context);
    },
    onPause: () => { releaseSound(); updateNoteStatus(); },
    onInteraction: () => { legend.cancel(); speech.cancel(); lastNarratedIndex = null; },
    onPlaybackState: () => updateNoteStatus(),
    onTrackLoading: () => { legendButton.disabled = true; audio.stop(); },
    onTrack: (track) => { renderExperience(track); legendButton.disabled = !soundKind(track); updateNoteStatus(null, track); },
    onFrame: (frame, index, total, reason, track) => {
      regions?.setFrame(index);
      const regional = regions?.getFrame(frame, index) ?? { frame, track };
      renderReading(document.getElementById("player"), regional.frame, regional.track);
      onFrame(regional.frame, index, total, reason, regional.track);
    },
  });
  removeKeyboard = initKeyboard(player);
} catch (error) {
  announce(`Could not load the player. ${error.message}`);
  const message = document.createElement("p");
  message.textContent = "The player could not load. Check your connection and reload this page.";
  document.getElementById("player").replaceChildren(message);
}

function suspend() { legend.cancel(); player?.pause(); releaseSound(); }
document.addEventListener("visibilitychange", () => { if (document.hidden) suspend(); });
window.addEventListener("pagehide", suspend);
window.addEventListener("beforeunload", () => {
  legend.cancel();
  speech.dispose();
  removeKeyboard?.();
  player?.destroy();
  regions?.destroy();
  combined.destroy();
  audio.dispose();
});
