// AI-assisted: OpenAI Codex
import {setLocalizedText} from '../i18n/index.js';
export function announce(message) {
  const live = document.getElementById("live");
  setLocalizedText(live, message);
}

export function initKeyboard(player, target = document) {
  function onKeydown(event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.isComposing) return;
    // Preserve Space/Arrow behavior on every native or custom interactive control.
    if (event.target?.closest?.("input, textarea, select, button, a, summary, audio, video, .time-series-scroll, [contenteditable]:not([contenteditable='false']), [role='button'], [role='slider'], [role='textbox'], [role='combobox'], [role='spinbutton']")) return;
    if (event.key === " " && !event.repeat) {
      event.preventDefault();
      player.toggle();
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      player.step(event.key === "ArrowRight" ? 1 : -1);
    }
  }
  target.addEventListener("keydown", onKeydown);
  return () => target.removeEventListener("keydown", onKeydown);
}
