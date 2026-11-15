export function initPageNarration() {
  const toggle = document.getElementById("spoken-navigation-toggle");
  const decline = document.getElementById("spoken-navigation-no");
  const status = document.getElementById("spoken-navigation-status");
  const question = document.getElementById("spoken-navigation-question");
  if (!toggle || !decline) return;

  let enabled = false;
  let utteranceId = 0;

  function speak(message) {
    if (!enabled || !message || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    const id = ++utteranceId;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = document.documentElement.lang || "en";
    utterance.onend = () => { if (id === utteranceId) utteranceId += 1; };
    window.speechSynthesis.speak(utterance);
  }

  function textOf(element) {
    return (element?.innerText || element?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function labelOf(element) {
    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      const label = labelledBy.split(/\s+/).map((id) => textOf(document.getElementById(id))).filter(Boolean).join(". ");
      if (label) return label;
    }
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) return ariaLabel;
    if (element.labels?.length) return [...element.labels].map(textOf).filter(Boolean).join(". ");
    return textOf(element);
  }

  function describe(element) {
    const label = labelOf(element);
    const tag = element.tagName.toLowerCase();
    const parts = [label];
    if (tag === "select") {
      const selected = element.selectedOptions?.[0]?.textContent?.trim();
      if (selected) parts.push(`Selected: ${selected}`);
    } else if (tag === "input") {
      if (element.type === "checkbox" || element.type === "radio") parts.push(element.checked ? "Selected" : "Not selected");
      if (element.type === "range" || element.type === "number") parts.push(`Value: ${element.value}`);
      if (element.type === "range" && element.max) parts.push(`of ${element.max}`);
    }
    const describedBy = element.getAttribute("aria-describedby");
    if (describedBy) {
      const detail = describedBy.split(/\s+/).map((id) => textOf(document.getElementById(id))).filter(Boolean).join(". ");
      if (detail) parts.push(detail);
    }
    if (element.matches("summary") && element.parentElement?.open) {
      const detailsText = textOf(element.parentElement);
      if (detailsText && detailsText !== label) parts.push(detailsText);
    }
    if (element.matches("[role='group']") && !element.matches("#transport-controls")) {
      const contents = textOf(element);
      if (contents && contents !== label) parts.push(contents);
    }
    if (element.matches(".time-series-scroll")) {
      const caption = textOf(element.querySelector("caption"));
      const firstRow = textOf(element.querySelector("tbody tr"));
      if (caption) parts.push(caption);
      if (firstRow) parts.push(`First row: ${firstRow}`);
    }
    if (element.matches("figure")) {
      const caption = textOf(element.querySelector("figcaption"));
      if (caption) parts.push(caption);
    }
    if (element.getAttribute("aria-pressed") === "true") parts.push("On");
    else if (element.getAttribute("aria-pressed") === "false") parts.push("Off");
    return [...new Set(parts.filter(Boolean))].join(". ");
  }

  toggle.addEventListener("click", () => {
    if (!enabled && (!window.speechSynthesis || !window.SpeechSynthesisUtterance)) {
      status.textContent = "Spoken navigation is not available in this browser. Your screen reader can still read the page.";
      return;
    }
    enabled = !enabled;
    toggle.setAttribute("aria-pressed", String(enabled));
    toggle.textContent = enabled ? "Turn off spoken navigation" : "Turn on spoken navigation";
    decline.hidden = enabled;
    if (enabled) {
      question.textContent = "Spoken navigation is on. Move through controls with Tab and Shift plus Tab. Focused controls and their instructions will be spoken. Activate the toggle again to turn it off.";
      status.textContent = "Spoken navigation is on. Move through page controls with Tab and Shift plus Tab. Activate a control with Enter or Space.";
      speak(status.textContent);
    } else {
      decline.hidden = false;
      question.textContent = "Spoken navigation is off. Activate the first button to turn it on. If your screen reader already reads the page aloud, leave spoken navigation off to avoid overlapping voices. The voice reads focused controls; press Escape at any time to stop it and turn it off.";
      utteranceId += 1;
      window.speechSynthesis?.cancel();
      status.textContent = "Spoken navigation is off. Your screen reader can still read the page.";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!enabled || event.key !== "Escape") return;
    enabled = false;
    utteranceId += 1;
    window.speechSynthesis?.cancel();
    toggle.setAttribute("aria-pressed", "false");
    toggle.textContent = "Turn on spoken navigation";
    decline.hidden = false;
    question.textContent = "Spoken navigation is off. Activate the first button to turn it on. If your screen reader already reads the page aloud, leave spoken navigation off to avoid overlapping voices. The voice reads focused controls; press Escape at any time to stop it and turn it off.";
    status.textContent = "Spoken navigation is off.";
  });

  decline.addEventListener("click", () => {
    decline.hidden = true;
    status.textContent = "Spoken navigation was not enabled. Use your screen reader or the page's keyboard guide if needed.";
    document.querySelector("#intro-start")?.focus();
  });

  document.addEventListener("focusin", (event) => {
    if (!enabled) return;
    const element = event.target;
    if (!(element instanceof HTMLElement) || element === toggle || element === decline) return;
    speak(describe(element));
  });

  document.addEventListener("change", (event) => {
    if (enabled && event.target instanceof HTMLElement && document.activeElement === event.target) {
      speak(describe(event.target));
    }
  });

  document.addEventListener("click", (event) => {
    if (!enabled || !(event.target instanceof Element)) return;
    const control = event.target.closest("button, summary, a, input, select");
    if (control === toggle || control === decline) return;
    if (control && document.activeElement === control) setTimeout(() => speak(describe(control)), 0);
  });
}
