const STORAGE_KEY = "filterEnabled";

const toggle = document.getElementById("toggle");

chrome.storage.sync.get({ [STORAGE_KEY]: true }, (result) => {
  toggle.checked = Boolean(result[STORAGE_KEY]);
});

toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ [STORAGE_KEY]: toggle.checked });
});
