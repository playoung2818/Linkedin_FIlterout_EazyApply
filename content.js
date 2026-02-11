const HIDE_CLASS = "li-no-easy-apply-hidden";
const STYLE_ID = "li-no-easy-apply-style";
const STORAGE_KEY = "filterEnabled";

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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
