import { initI18n } from "./i18n/index.js";
// AI-assisted: OpenAI Codex
import { fetchJSON } from "./data/features.js";
import { initPlayer } from "./ui/player.js";
import { describeReading, renderReading, describePixelFilters } from "./ui/readings.js";
import { createTimePulseTracker } from "./engine/timePulse.js";
import { createAudioEngine } from "./engine/audio.js";
import { mapFrameSound, soundKind } from "./engine/mapping.js";
import { describeExperience, renderExperience } from "./ui/experience.js";
import { createSpeechEngine } from "./engine/speech.js";
import { announce, initKeyboard } from "./ui/a11y.js";
import { createLegend } from "./ui/legend.js";
import { initRegionalExplorer } from "./ui/regions.js";
import { initCombined } from "./ui/combined.js";
import { initGuidedIntro } from "./ui/guidedIntro.js";
import { initPageNarration } from "./ui/pageNarration.js";

await initI18n();
const pageNarration = initPageNarration();
initGuidedIntro();

// Elements from the removed sound panel may not exist; look them up through an inert fallback.
const inert = () => ({ textContent: "", checked: false, value: "", disabled: false, hidden: false, setAttribute() {}, removeAttribute() {}, addEventListener() {}, setCustomValidity() {} });
const el = (id) => document.getElementById(id) ?? inert();
// Local copies keep this file independent of other modules being updated at the same time.
function describeNormalizationRange(data) {
  if (!data) return "Normalization limits are unavailable.";
  if (data.sonification?.input === "visualSignal") return `Pixel color legend: ${data.vmin} to ${data.vmax} ${data.unit}. The visible signal index is dimensionless (0–1), not a physical concentration or speed.`;
  if (data.vmin === null || data.vmin === undefined) return "Normalization limits are unavailable.";
  return `The supplied range is ${data.vmin} to ${data.vmax} ${data.unit}${data.mock ? " (demo values)" : ""}.`;
}
function describeMeanWeighting(data) {
  return data?.statistics?.mean === "area_weighted"
    ? "Mean = sum(decoded value × cosine latitude) ÷ sum(cosine latitude), using accepted pixels only. P90 remains an unweighted pixel percentile. Pixel inclusion remains a pixel-count ratio, not an area percentage."
    : "This dataset uses equal weights per decoded pixel. Its mean has not been area-weighted.";
}

const audio = createAudioEngine();
const speech = createSpeechEngine(window, (message) => { el("speech-status").textContent = message; }, (speaking) => audio.setDucking(speaking));
const enable = el("enable-sound");
const soundStatus = el("sound-status");
const legendButton = el("sound-legend");
const combinedLegendButton = el("combined-sound-legend");
const legendButtons = [legendButton, combinedLegendButton];
const combinedLegendStatus = el("combined-legend-status");
const timePulse = createTimePulseTracker();
const pulseEnabled = el("time-pulse-enabled");
const pulsePeriod = el("time-pulse-period");
let player, removeKeyboard, regions, trackContext = null;
function showTrackMethods(context) {
  byId("pixel-filter-method").textContent = describePixelFilters(context.colorbar);
  byId("mean-weighting-method").textContent = describeMeanWeighting(context.data);
  byId("normalization-range").textContent = describeNormalizationRange(context.data);
}
const byId = (id) => document.getElementById(id) ?? { textContent: "" };
const combined = initCombined({
  audio,
  getFrame: () => player?.currentFrame,
  restoreSingle: () => {
    if (player?.currentTrack) renderExperience(player.currentTrack);
    if (trackContext) showTrackMethods(trackContext);
  },
  getRegion: () => regions?.selectionKey() ?? null,
  onVisuals: (entries) => player?.setCombinedFrames(entries),
  onChange: () => {
    legend.cancel();
    if (player?.currentTrack || combined.enabled) legendButton.disabled = combined.enabled ? !combined.ready : !soundKind(player.currentTrack);
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


function updateNoteStatus(frame = player?.currentFrame, track = player?.currentTrack, updateVisuals = true) {
  if (frame && regions) {
    const regional = regions.getFrame(frame, player?.currentIndex);
    frame = regional.frame;
    track = regional.track ?? track;
  }
  const element = document.getElementById("note-status");
  if (!element) return;
  if (updateVisuals) combined.render(frame);
  if (combined.enabled) {
    element.textContent = !combined.ready ? "Combined datasets are loading."
      : !audio.enabled || audio.muted ? "Sound is off."
          : legend.active ? "Selected instrument legend is playing alone."
            : player?.isPlaying ? "Combined experiment follows supplied timestamps." : "Combined experiment ready; playback is paused.";
    return;
  }
  const parameters = mapFrameSound(frame, track);
  element.textContent = !parameters ? "No sound for this frame."
    : parameters.kind === "precipitation" && parameters.rate === 0 ? "Zero precipitation amount; silent."
    : !audio.enabled || audio.muted ? "Sound is off."
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
  shouldNarrate: () => pageNarration?.enabled === true,
  getKind: () => combined.enabled ? combined.legendKind : player?.currentTrack?.sonification?.input === "visualSignal" ? (soundKind(player?.currentTrack) === "pm25" ? "pm25Visual" : "windVisual") : soundKind(player?.currentTrack),
  onBeforeStart: () => { player?.pause("Playback paused for sound examples."); releaseSound(); },
  onState: (active) => {
    pageNarration?.setSuspended(active);
    combined.setLegendMode(active);
    legendButtons.forEach((button) => {
      button.textContent = active ? "Stop sound examples" : "Hear sound examples";
      button.setAttribute("aria-pressed", String(active));
    });
    const message = active ? "Preparing sound examples…" : "Sound examples stopped. Choose Hear sound examples to listen again.";
    el("legend-status").textContent = message;
    combinedLegendStatus.textContent = message;
    combinedLegendStatus.hidden = !active || !combined.enabled;
    updateNoteStatus();
  },
  onStep: (message) => {
    el("legend-status").textContent = message;
    combinedLegendStatus.textContent = message;
    combinedLegendStatus.hidden = !combined.enabled;
  },
  onError: (message) => {
    const error = `Could not play sound examples. ${message || "Try enabling sound again."}`;
    el("legend-status").textContent = error;
    combinedLegendStatus.textContent = error;
    combinedLegendStatus.hidden = !combined.enabled;
  },
});
document.addEventListener("jukebox:languagechange", () => {
  legend.cancel(); speech.cancel(); speech.refreshVoices(); pageNarration?.refreshLanguage();
});
for (const button of legendButtons) button.addEventListener("click", () => { void legend.toggle(); });

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
speech.refreshVoices();

pulsePeriod.addEventListener("change", () => {
  timePulse.reset();
  timePulse.advance(player?.currentFrame?.date, pulsePeriod.value, false);
});
pulseEnabled.addEventListener("change", () => {
  timePulse.reset();
  timePulse.advance(player?.currentFrame?.date, pulsePeriod.value, false);
});
el("preview-time-pulse").addEventListener("click", async () => {
  legend.cancel();
  try { await enableAudio(); audio.playTimePulse(); }
  catch { soundStatus.textContent = "Could not play the time pulse. Try enabling sound again."; }
});

function onFrame(frame, index, total, reason, track) {
  const boundary = timePulse.advance(frame.date, pulsePeriod.value, reason === "playback");
  if (boundary && pulseEnabled.checked && !legend.active) audio.playTimePulse();
  const parameters = mapFrameSound(frame, track);
  if ((!parameters && !combined.enabled) || reason === "paused") audio.stop();
  updateNoteStatus(frame, track, false);
  if (reason === "manual" || reason === "initial") announce((reason === "initial" ? "First frame loaded. " : "") + "Frame " + (index + 1) + " of " + total + ". " + (document.getElementById("demo-data").hidden ? "" : "Demo data. ") + describeReading(frame, track).summary);
  if (reason === "initial" || reason === "paused" || legend.active) return;
  try { if (parameters || combined.enabled) playFrameSound(frame, track, reason === "playback" && index < total - 1 ? undefined : 0.9); }
  catch { soundStatus.textContent = "Audio playback failed. Try enabling sound again; the visual player still works."; }

}

try {
  player = initPlayer(await fetchJSON("tracks/index.json"), {
    onTrackData: (context) => {
      trackContext = context;
      showTrackMethods(context);
      regions ??= initRegionalExplorer({
        onPreviewRequest: () => { legend.cancel(); player?.pause(); return enableAudio(); },
        onPreviewReady: () => { if (!player?.isPlaying) void player?.toggle(); },
        onSelection: () => { audio.stop(); updateRegionalReading(); }, onValueChange: () => {
        updateRegionalReading();
        if (player?.isPlaying && !legend.active) {
          const regional = regions.getFrame(player.currentFrame, player.currentIndex);
          playFrameSound(regional.frame, regional.track);
        }
      } });
      void regions.configure(context);
    },
    onPause: () => { releaseSound(); updateNoteStatus(); },
    onInteraction: () => {
      legend.cancel(); speech.cancel(); timePulse.reset();
      if ((!audio.enabled || audio.muted) && navigator.userActivation?.isActive) {
        void enableAudio().then(() => {
          const current = player?.currentFrame;
          if (!current) return;
          const regional = regions?.getFrame(current, player.currentIndex) ?? { frame: current, track: player.currentTrack };
          playFrameSound(regional.frame, regional.track, player.isPlaying ? undefined : 0.9);
        }).catch(() => { /* enableAudio reports the problem; the visual player keeps working. */ });
      }
    },
    onPlaybackState: () => updateNoteStatus(),
    onTrackLoading: () => { legendButton.disabled = true; audio.stop(); },
    onTrack: (track) => { renderExperience(track); legendButton.disabled = !soundKind(track); combinedLegendButton.disabled = false; updateNoteStatus(null, track); },
    onFrame: (frame, index, total, reason, track, isCurrent = () => true) => {
      const applyFrame = () => {
        if (!isCurrent()) return;
        const regional = regions?.getFrame(frame, index) ?? { frame, track };
        regions?.setFrame(index);
        renderReading(document.getElementById("player"), regional.frame, regional.track);
        const currentReason = reason === "playback" && !player?.isPlaying ? "paused" : reason;
        onFrame(regional.frame, index, total, currentReason, regional.track);
      };
      return combined.enabled ? combined.render(frame).then(applyFrame) : applyFrame();
    },
  });
  removeKeyboard = initKeyboard(player);
  pageNarration?.refresh();
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
