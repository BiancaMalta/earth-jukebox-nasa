const COPY = {
  steps: [
    ["1. Choose an experience", "Use the Experience menu to choose one of seven NASA Earth variables, such as temperature, wind, precipitation, humidity, or air quality. Each variable turns its changing data into a distinct sound."],
    ["2. Focus on a place, or keep the whole planet", "The optional place section is below the map. First choose Continent or Country, then choose one from the next menu. With no place selected, the sound and readings use the whole map. A selection changes both to that continent or country."],
    ["3. Move through time", "Play and Pause move through frames in order. Previous and Next move one frame at a time; the Frame position slider jumps to a point in the sequence. Use Tab and Shift plus Tab to reach controls, then Enter or Space to activate them. With focus outside controls, Space plays or pauses and the left and right arrows change frames."],
    ["4. Listen to a frame's readings", "Pause, then use your screen reader to explore the current date and time, data value and unit, and its sound description. Open View values by time for a table of mean, ninetieth percentile, and pixel coverage. Automatic playback does not announce every frame; selecting frames manually announces their readings."],
    ["5. Learn how values become sound", "Beside the player, From data to music explains how values map to notes or sound textures. Play sound legend gives a short comparison. Below the player, About the values and methods explains image-derived estimates, pixel coverage, and calculation limits."],
    ["6. Compare variables", "In the Listening mode section beside the player, turn on Combined. Choose which variables to include with the checkboxes; their sounds are mixed and their maps appear in the Combination preview tab above the player. Playback and place controls still apply, and the layer list gives each variable's readings. You can return to one variable by turning Combined off."],
  ],
  actions: [
    [["experience", "Go to the Experience menu"]],
    [["region", "Open the place controls"]],
    [["playback", "Go to playback controls"]],
    [["readings", "Go to current readings"], ["table", "Open the values-by-time table"]],
    [["sound", "Go to the sound guide"], ["methods", "Open values and methods"]],
    [["combined", "Go to Combined mode"], ["enable-layers", "Turn on Combined and go to variable choices"], ["preview", "Open the combination map preview"]],
  ],
};

export function initGuidedIntro() {
  const start = document.getElementById("intro-start");
  if (!start) return;
  const previous = document.getElementById("intro-prev");
  const next = document.getElementById("intro-next");
  const stop = document.getElementById("intro-stop");
  const content = document.getElementById("intro-content");
  const heading = document.getElementById("intro-step-heading");
  const text = document.getElementById("intro-step-text");
  const progress = document.getElementById("guided-intro-progress");
  const status = document.getElementById("intro-status");
  const actions = document.getElementById("intro-actions");
  let index = -1;

  function render(focusHeading = false) {
    const [title, description] = COPY.steps[index];
    heading.textContent = title;
    text.textContent = description;
    actions.replaceChildren(...COPY.actions[index].map(([action, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.dataset.introAction = action;
      return button;
    }));
    progress.textContent = `Step ${index + 1} of ${COPY.steps.length}. Use Next step to continue; the complete introduction takes about one minute.`;
    content.hidden = false;
    start.hidden = true;
    previous.disabled = index === 0;
    previous.hidden = false;
    next.hidden = false;
    next.textContent = index === COPY.steps.length - 1 ? "Finish introduction" : "Next step";
    stop.hidden = false;
    if (focusHeading) heading.focus();
  }

  function end() {
    index = -1;
    content.hidden = true;
    start.hidden = false;
    previous.hidden = next.hidden = stop.hidden = true;
    previous.disabled = true;
    progress.textContent = "Six short steps. Use the buttons to move at your own pace.";
    status.textContent = "Introduction ended.";
    start.focus();
  }

  start.addEventListener("click", () => { index = 0; render(true); });
  previous.addEventListener("click", () => { if (index > 0) { index--; render(true); } });
  next.addEventListener("click", () => {
    if (index === COPY.steps.length - 1) end();
    else { index++; render(true); }
  });
  stop.addEventListener("click", end);
  actions.addEventListener("click", (event) => {
    const action = event.target.closest("button[data-intro-action]")?.dataset.introAction;
    if (!action) return;
    const focus = (target) => {
      if (!target || target.hidden || target.closest("[hidden]")) {
        status.textContent = "This section is currently unavailable for the selected experience or mode.";
        return;
      }
      target.focus();
    };
    const combined = document.getElementById("combine-sounds");
    if (action === "experience") {
      focus(combined.checked ? document.querySelector("#combined-layers input[type=checkbox]") : document.getElementById("track-select"));
    } else if (action === "region") {
      const section = document.getElementById("region-options");
      if (section.hidden) { status.textContent = "Place controls are unavailable for this visualization."; return; }
      section.open = true;
      focus(document.getElementById("region-level"));
    } else if (action === "playback") {
      focus(document.getElementById("transport-controls"));
    } else if (action === "readings") {
      focus(combined.checked ? document.getElementById("combined-layers") : document.getElementById("frame-readings"));
    } else if (action === "table") {
      const panel = document.getElementById("time-series-panel");
      if (panel.hidden) { status.textContent = "The time-series table is unavailable in combined mode."; return; }
      panel.open = true;
      focus(panel.querySelector(".time-series-scroll"));
    } else if (action === "sound") {
      focus(document.getElementById("guide-heading"));
    } else if (action === "methods") {
      const panel = document.getElementById("explanation-details");
      panel.open = true;
      focus(panel.querySelector(":scope > summary"));
    } else if (action === "combined") {
      focus(combined);
    } else if (action === "enable-layers") {
      if (!combined.checked) {
        combined.checked = true;
        combined.dispatchEvent(new Event("change", { bubbles: true }));
      }
      focus(document.querySelector("#combined-layers input[type=checkbox]"));
    } else if (action === "preview") {
      const tab = document.getElementById("combined-preview-tab");
      tab.click();
      focus(tab);
    }
  });
}
