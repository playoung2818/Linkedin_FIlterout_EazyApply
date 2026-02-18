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
  const value = normalizeText(text);
  return (
    value.includes("easy apply") ||
    value.includes("easy-apply") ||
    value.includes("easyapply")
  );
}

function isPromotedText(text) {
  const value = normalizeText(text);
  return value.includes("promoted");
}

function isRepostedText(text) {
  const value = normalizeText(text);
  return value.includes("reposted");
}

function isBlockedLabel(text) {
  return isEasyApplyText(text) || isPromotedText(text) || isRepostedText(text);
}

function cardHasEasyApply(card) {
  const cardText = normalizeText(card.textContent || "");
  if (
    cardText.includes("easy apply") ||
    cardText.includes("promoted") ||
    cardText.includes("reposted")
  ) {
    return true;
  }

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
  const cards = new Set();

  // Preferred: LinkedIn result list rows (evaluate once per row).
  const rowSelectors = [
    "li.jobs-search-results__list-item",
    "li.scaffold-layout__list-item",
    "ul.jobs-search__results-list > li"
  ];
  for (const selector of rowSelectors) {
    document.querySelectorAll(selector).forEach((el) => cards.add(el));
  }

  // Fallback: standalone card containers not wrapped by list rows.
  const standaloneSelectors = ["div.job-card-container", "li.occludable-update"];
  for (const selector of standaloneSelectors) {
    document.querySelectorAll(selector).forEach((el) => {
      if (!el.closest("li.jobs-search-results__list-item, li.scaffold-layout__list-item")) {
        cards.add(el);
      }
    });
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
