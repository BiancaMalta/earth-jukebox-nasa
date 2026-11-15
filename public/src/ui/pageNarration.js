// AI-assisted: OpenAI Codex
const OFF_HELP = "Spoken navigation is off. Turn it on to hear focused controls. If your screen reader already reads the page, leave this off to avoid overlapping voices. Press Escape to stop spoken navigation.";
const ON_HELP = "Spoken navigation is on. Use Tab and Shift plus Tab to move between controls. Sections announce their name and whether they are expanded. Press Escape to turn the voice off.";

function textOf(element) {
  return (element?.innerText || element?.textContent || "").replace(/\s+/g, " ").trim();
}

function labelOf(element, doc) {
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const label = labelledBy.split(/\s+/).map(id => textOf(doc.getElementById(id))).filter(Boolean).join(". ");
    if (label) return label;
  }
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;
  if (element.labels?.length) return [...element.labels].map(textOf).filter(Boolean).join(". ");
  // Reading a select's textContent would announce its entire option list.
  if (element.matches("select")) return "Menu";
  if (element.matches("[role='group'], [role='region']")) return "Section";
  return textOf(element);
}

export function describeNavigationTarget(element, doc = element.ownerDocument ?? globalThis.document) {
  const parts = [labelOf(element, doc)];
  const tag = element.tagName.toLowerCase();
  if (tag === "summary") {
    // Never collect text from the parent details: it may contain 124 table rows.
    parts.push(element.parentElement?.open ? "Expanded" : "Collapsed", "Press Enter or Space to toggle");
  } else if (tag === "select") {
    parts.push("Menu");
    const selected = textOf(element.selectedOptions?.[0]);
    if (selected) parts.push(`Selected: ${selected}`);
  } else if (tag === "input") {
    if (["checkbox", "radio"].includes(element.type)) {
      parts.push(element.getAttribute("role") === "switch" ? (element.checked ? "On" : "Off") : (element.checked ? "Selected" : "Not selected"));
    } else if (["range", "number"].includes(element.type)) {
      parts.push(element.getAttribute("aria-valuetext") || `Value: ${element.value}${element.max ? ` of ${element.max}` : ""}`);
    }
  } else if (element.getAttribute("role") === "tab") {
    parts.push("Tab", element.getAttribute("aria-selected") === "true" ? "Selected" : "Not selected");
  } else if (tag === "button") {
    parts.push("Button");
  } else if (tag === "a") {
    parts.push("Link");
  }

  // Current readings are a small, explicitly requested group, unlike layer lists.
  if (element.id === "frame-readings") parts.push(textOf(element));
  if (element.matches("figure")) parts.push(textOf(element.querySelector("figcaption")));
  const describedBy = element.getAttribute("aria-describedby");
  if (describedBy && tag !== "summary" && element.id !== "frame-readings") {
    parts.push(...describedBy.split(/\s+/).map(id => textOf(doc.getElementById(id))).filter(Boolean));
  }
  if (element.hasAttribute("aria-pressed")) parts.push(element.getAttribute("aria-pressed") === "true" ? "On" : "Off");
  return [...new Set(parts.filter(Boolean))].join(". ");
}

export function describeCurrentTableRow(doc = document) {
  const row = doc.querySelector("#time-series-body tr[aria-current='true']");
  if (!row) return "No current frame row is available. Select a frame and try again.";
  const headers = [...doc.querySelectorAll(".time-series-table th")];
  return [...row.cells].map((cell, index) => `${textOf(headers[index])}: ${textOf(cell)}`).join(". ");
}

export function initPageNarration() {
  const toggle = document.getElementById("spoken-navigation-toggle");
  const decline = document.getElementById("spoken-navigation-no");
  const status = document.getElementById("spoken-navigation-status");
  const question = document.getElementById("spoken-navigation-question");
  if (!toggle || !decline || !status || !question) return;

  const synthesis = window.speechSynthesis;
  let enabled = false, requested = false, utterance, watchdog, utteranceId = 0;
  let lastElement, lastMessage, lastTime = 0;
  let suspended = false;

  function render() {
    const focusedVoiceControl = !enabled && document.activeElement?.matches("[data-spoken-only]") ? document.activeElement : null;
    toggle.setAttribute("aria-pressed", String(enabled));
    toggle.textContent = enabled ? "Turn off spoken navigation" : requested ? "Cancel voice check" : "Turn on spoken navigation";
    decline.hidden = requested;
    question.textContent = enabled ? ON_HELP : OFF_HELP;
    document.querySelectorAll("[data-spoken-only]").forEach(element => { element.hidden = !enabled; });
    focusedVoiceControl?.closest("details")?.querySelector(":scope > summary")?.focus();
  }

  function cancel() {
    ++utteranceId;
    clearTimeout(watchdog);
    if (utterance) {
      utterance.onstart = utterance.onend = utterance.onerror = null;
      utterance = undefined;
      synthesis?.cancel();
    }
  }

  function stop(message = "Spoken navigation is off.") {
    requested = enabled = false;
    cancel();
    lastElement = lastMessage = undefined;
    render();
    status.textContent = message;
  }

  function voice() {
    const language = (document.documentElement.lang || "en").toLowerCase().split(/[-_]/)[0];
    const voices = synthesis.getVoices();
    return voices.find(item => item.lang.toLowerCase() === (document.documentElement.lang || "en").toLowerCase())
      ?? voices.find(item => item.lang.toLowerCase().split(/[-_]/)[0] === language);
  }

  function speak(message, initial = false) {
    if (!requested || !message) return;
    cancel();
    const selected = voice();
    if (!selected) {
      stop("No voice for the page language is available. Install a system voice, fully restart the browser, and try again. Your screen reader can still read the page.");
      return;
    }
    const id = utteranceId;
    const current = new window.SpeechSynthesisUtterance(message);
    utterance = current;
    current.voice = selected;
    current.lang = selected.lang;
    current.onstart = () => {
      if (id !== utteranceId) return;
      clearTimeout(watchdog);
      if (initial) {
        enabled = true;
        render();
        status.textContent = "Spoken navigation is on. Tab moves to the next control. Escape turns the voice off.";
      }
    };
    current.onend = () => {
      if (id !== utteranceId) return;
      clearTimeout(watchdog);
      utterance = undefined;
    };
    current.onerror = event => {
      if (id === utteranceId) stop(`Spoken navigation could not play (${event.error || "unknown error"}). Check system voices and try again.`);
    };
    watchdog = setTimeout(() => {
      if (id === utteranceId) stop("The browser did not start the voice. Fully restart the browser after installing voices, then try again.");
    }, 5000);
    try {
      synthesis.resume();
      synthesis.speak(current);
    } catch {
      stop("Spoken navigation could not start. Check your browser and system voice settings.");
    }
  }

  function begin() {
    if (!requested) return;
    clearTimeout(watchdog);
    speak("Spoken navigation is on. Use Tab to move between controls. Press Escape to turn the voice off.", true);
  }

  toggle.addEventListener("click", () => {
    if (requested) { stop(); return; }
    if (!synthesis || !window.SpeechSynthesisUtterance) {
      status.textContent = "Spoken navigation is not available in this browser. Your screen reader can still read the page.";
      return;
    }
    requested = true;
    render();
    status.textContent = "Checking the browser voice…";
    if (voice()) begin();
    else watchdog = setTimeout(() => {
      if (requested && !enabled) begin();
    }, 3000);
  });

  synthesis?.addEventListener("voiceschanged", () => {
    if (requested && !enabled && !utterance && voice()) begin();
  });

  document.addEventListener("keydown", event => {
    if (requested && event.key === "Escape") stop();
  });
  decline.addEventListener("click", () => {
    stop("Spoken navigation was not enabled. Use your screen reader or the keyboard guide if needed.");
    decline.hidden = true;
    document.querySelector("#intro-start")?.focus();
  });

  function announce(element) {
    if (!enabled || suspended || element === toggle || element === decline) return;
    const message = describeNavigationTarget(element);
    const now = Date.now();
    if (element === lastElement && message === lastMessage && now - lastTime < 350) return;
    lastElement = element; lastMessage = message; lastTime = now;
    speak(message);
  }

  document.addEventListener("focusin", event => {
    if (event.target instanceof HTMLElement) announce(event.target);
  });
  document.addEventListener("change", event => {
    if (event.target instanceof HTMLElement && document.activeElement === event.target) announce(event.target);
  });
  document.addEventListener("toggle", event => {
    if (!event.target.matches?.("details")) return;
    const summary = event.target.querySelector(":scope > summary");
    if (document.activeElement === summary) announce(summary);
  }, true);
  document.addEventListener("click", event => {
    if (!enabled || suspended || !(event.target instanceof Element)) return;
    if (event.target.closest("#read-current-row")) {
      speak(describeCurrentTableRow());
      return;
    }
    const control = event.target.closest("button, a, input, select");
    if (control && document.activeElement === control) setTimeout(() => {
      if (document.activeElement === control) announce(control);
    }, 0);
  });
  window.addEventListener("pagehide", () => stop());
  return { refresh: render, setSuspended(value) { suspended = Boolean(value); if (suspended) cancel(); } };
}
