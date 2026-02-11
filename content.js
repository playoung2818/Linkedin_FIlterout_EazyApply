const HIDE_CLASS = "li-no-easy-apply-hidden";
const STYLE_ID = "li-no-easy-apply-style";
const STORAGE_KEY = "filterEnabled";
const PROFILE_KEY = "autofillProfile";

let filterEnabled = true;
let observer = null;
let scheduled = false;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${HIDE_CLASS} {
      display: none !important;
    }
  `;
  document.documentElement.appendChild(style);
}

function normalizeText(text) {
  return (text || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function isEasyApplyText(text) {
  return normalizeText(text) === "easy apply";
}

function isPromotedText(text) {
  return normalizeText(text) === "promoted";
}

function isBlockedLabel(text) {
  return isEasyApplyText(text) || isPromotedText(text);
}

function cardHasEasyApply(card) {
  const labeled = card.querySelectorAll("button, span, strong, div, p");
  for (const node of labeled) {
    if (isBlockedLabel(node.textContent)) {
      return true;
    }
  }

  const aria = card.querySelectorAll("[aria-label]");
  for (const node of aria) {
    const ariaLabel = normalizeText(node.getAttribute("aria-label"));
    if (ariaLabel.includes("easy apply") || ariaLabel.includes("promoted")) {
      return true;
    }
  }

  return false;
}

function getJobCards() {
  const selectors = [
    "li.scaffold-layout__list-item",
    "ul.jobs-search__results-list li",
    "li.jobs-search-results__list-item",
    "div.job-card-container",
    "li.occludable-update"
  ];

  const cards = new Set();
  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((el) => cards.add(el));
  }
  return [...cards];
}

function applyFilter() {
  const cards = getJobCards();
  for (const card of cards) {
    if (!filterEnabled) {
      card.classList.remove(HIDE_CLASS);
      continue;
    }

    if (cardHasEasyApply(card)) {
      card.classList.add(HIDE_CLASS);
    } else {
      card.classList.remove(HIDE_CLASS);
    }
  }
}

function scheduleApplyFilter() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    applyFilter();
  });
}

function setEnabled(enabled) {
  filterEnabled = Boolean(enabled);
  scheduleApplyFilter();
}

function initializeStorage() {
  chrome.storage.sync.get({ [STORAGE_KEY]: true }, (result) => {
    setEnabled(result[STORAGE_KEY]);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes[STORAGE_KEY]) return;
    setEnabled(changes[STORAGE_KEY].newValue);
  });
}

function initializeObserver() {
  observer = new MutationObserver(() => {
    scheduleApplyFilter();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function boot() {
  ensureStyle();
  initializeStorage();
  initializeObserver();
  scheduleApplyFilter();
}

function dispatchFieldEvents(el) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
}

function labelForInput(input) {
  const parts = [];
  const id = input.getAttribute("id");
  if (id) {
    const explicitLabel = document.querySelector(`label[for="${id}"]`);
    if (explicitLabel) {
      parts.push(explicitLabel.textContent || "");
    }
  }
  const closestLabel = input.closest("label");
  if (closestLabel) {
    parts.push(closestLabel.textContent || "");
  }
  parts.push(input.getAttribute("aria-label") || "");
  parts.push(input.getAttribute("placeholder") || "");
  parts.push(input.getAttribute("name") || "");
  return normalizeText(parts.join(" "));
}

function valueForLabel(label, profile) {
  if (!label) return "";

  if (
    label.includes("first name") &&
    !label.includes("last name") &&
    profile.firstName
  ) {
    return profile.firstName;
  }
  if (label.includes("last name") && profile.lastName) {
    return profile.lastName;
  }
  if (label.includes("full name") && profile.fullName) {
    return profile.fullName;
  }
  if (label.includes("name") && profile.fullName) {
    return profile.fullName;
  }
  if (label.includes("email") && profile.email) {
    return profile.email;
  }
  if (
    (label.includes("phone") || label.includes("mobile")) &&
    profile.phone
  ) {
    return profile.phone;
  }
  if (
    (label.includes("city") ||
      label.includes("location") ||
      label.includes("address")) &&
    profile.location
  ) {
    return profile.location;
  }
  if (label.includes("linkedin") && profile.linkedin) {
    return profile.linkedin;
  }
  if (
    (label.includes("website") || label.includes("portfolio")) &&
    profile.website
  ) {
    return profile.website;
  }
  if (label.includes("github") && profile.github) {
    return profile.github;
  }
  if (label.includes("years") && profile.yearsExperience) {
    return String(profile.yearsExperience);
  }
  return "";
}

function findAutofillInputs() {
  const scopeSelectors = [
    ".jobs-easy-apply-content",
    ".jobs-easy-apply-modal",
    ".jobs-apply-form-section",
    ".artdeco-modal",
    "form"
  ];

  const roots = [];
  for (const selector of scopeSelectors) {
    document.querySelectorAll(selector).forEach((node) => {
      roots.push(node);
    });
  }

  if (!roots.length) {
    roots.push(document);
  }

  const inputs = [];
  for (const root of roots) {
    root
      .querySelectorAll(
        "input[type='text'], input[type='email'], input[type='tel'], input[type='url'], input[type='number'], textarea"
      )
      .forEach((input) => inputs.push(input));
  }

  return Array.from(new Set(inputs));
}

function fillInput(input, value) {
  if (!value) return false;
  if (input.disabled || input.readOnly) return false;
  if (input.type === "hidden") return false;
  if ((input.value || "").trim()) return false;
  input.focus();
  input.value = value;
  dispatchFieldEvents(input);
  return true;
}

function runAutofill(profile) {
  const inputs = findAutofillInputs();
  let filledCount = 0;
  for (const input of inputs) {
    const label = labelForInput(input);
    const value = valueForLabel(label, profile);
    if (fillInput(input, value)) {
      filledCount += 1;
    }
  }
  return filledCount;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "RUN_AUTOFILL") {
    return;
  }

  chrome.storage.sync.get({ [PROFILE_KEY]: {} }, (result) => {
    const profile = result[PROFILE_KEY] || {};
    const filledCount = runAutofill(profile);
    sendResponse({ ok: true, filledCount });
  });
  return true;
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
