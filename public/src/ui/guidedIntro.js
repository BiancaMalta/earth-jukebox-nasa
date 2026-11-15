const COPY = {
  steps: [
    ["1. Choose a record", "Choose one of seven records, such as temperature, wind, precipitation, humidity, or air quality. Use arrow keys within the record collection to change your selection. Each variable turns its changing data into a distinct sound."],
    ["2. Focus on a place, or keep the whole planet", "Below playback, Where do you want to listen lets you choose Whole map, Region, or Country. Pick a place from the menus or try a suggested group. The highlighted place determines both readings and sound. Back to whole map clears the selection."],
    ["3. Move through time", "Play and Pause move through frames in order. Previous and Next move one frame at a time; the Timeline slider jumps to a point in the sequence. Use Tab and Shift plus Tab to reach controls, then Enter or Space to activate them. With focus outside controls, Space plays or pauses and the left and right arrows change frames."],
    ["4. Listen to a frame's readings", "Pause, then use your screen reader to explore the current date and time, data value and unit, and its sound description. Open Values over time for a table of mean, ninetieth percentile, and pixel coverage. Automatic playback does not announce every frame; selecting frames manually announces their readings."],
    ["5. Learn how values become sound", "Beside the player, From data to music explains how values map to notes or sound textures. Hear sound examples gives a short comparison. Below the sound guide, About the values and methods explains image-derived estimates, pixel coverage, and calculation limits."],
    ["6. Combine variables", "Above the player, activate Combine variables. Choose the records to include with the checkboxes. Their sounds play together and their maps appear in the display. Playback and place controls still apply. Activate One variable to return to an individual variable."],
  ],
  actions: [
    [["experience", "Go to the record collection"]],
    [["region", "Open the place controls"]],
    [["playback", "Go to playback controls"]],
    [["readings", "Go to current readings"], ["table", "Open the values-by-time table"]],
    [["sound", "Go to the sound guide"], ["methods", "Open values and methods"]],
    [["enable-layers", "Open Combine variables and go to variable choices"]],
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
      focus(combined.checked ? document.querySelector("#combined-layers input[type=checkbox]") : document.querySelector('input[name="earth-record"]:checked'));
    } else if (action === "region") {
      const section = document.getElementById("region-options");
      if (section.hidden) { status.textContent = "Place controls are unavailable for this visualization."; return; }
      focus(document.querySelector('input[name="region-scope"]:checked'));
    } else if (action === "playback") {
      focus(document.getElementById("play-pause"));
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
    } else if (action === "enable-layers") {
      if (!combined.checked) {
        combined.checked = true;
        combined.dispatchEvent(new Event("change", { bubbles: true }));
      }
      focus(document.querySelector("#combined-layers input[type=checkbox]"));
    }
  });
}
