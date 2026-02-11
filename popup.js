const FILTER_KEY = "filterEnabled";
const PROFILE_KEY = "autofillProfile";

const toggle = document.getElementById("toggle");
const saveBtn = document.getElementById("save-btn");
const autofillBtn = document.getElementById("autofill-btn");
const statusEl = document.getElementById("status");

const profileFields = {
  fullName: document.getElementById("full-name"),
  firstName: document.getElementById("first-name"),
  lastName: document.getElementById("last-name"),
  email: document.getElementById("email"),
  phone: document.getElementById("phone"),
  location: document.getElementById("location"),
  linkedin: document.getElementById("linkedin"),
  github: document.getElementById("github"),
  website: document.getElementById("website"),
  yearsExperience: document.getElementById("years-experience")
};

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#b42318" : "#486581";
}

function readProfileFromForm() {
  return {
    fullName: profileFields.fullName.value.trim(),
    firstName: profileFields.firstName.value.trim(),
    lastName: profileFields.lastName.value.trim(),
    email: profileFields.email.value.trim(),
    phone: profileFields.phone.value.trim(),
    location: profileFields.location.value.trim(),
    linkedin: profileFields.linkedin.value.trim(),
    github: profileFields.github.value.trim(),
    website: profileFields.website.value.trim(),
    yearsExperience: profileFields.yearsExperience.value.trim()
  };
}

function writeProfileToForm(profile = {}) {
  for (const [key, input] of Object.entries(profileFields)) {
    input.value = profile[key] || "";
  }
}

chrome.storage.sync.get({ [FILTER_KEY]: true, [PROFILE_KEY]: {} }, (result) => {
  toggle.checked = Boolean(result[FILTER_KEY]);
  writeProfileToForm(result[PROFILE_KEY] || {});
});

toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ [FILTER_KEY]: toggle.checked });
});

saveBtn.addEventListener("click", () => {
  const profile = readProfileFromForm();
  chrome.storage.sync.set({ [PROFILE_KEY]: profile }, () => {
    setStatus("Profile saved.");
  });
});

autofillBtn.addEventListener("click", () => {
  const profile = readProfileFromForm();
  chrome.storage.sync.set({ [PROFILE_KEY]: profile }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id || !tab.url || !tab.url.includes("linkedin.com/jobs")) {
        setStatus("Open a LinkedIn Jobs tab first.", true);
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: "RUN_AUTOFILL" }, (response) => {
        if (chrome.runtime.lastError) {
          setStatus("Could not access this tab. Refresh page and try again.", true);
          return;
        }
        if (!response || !response.ok) {
          setStatus("Autofill failed.", true);
          return;
        }
        setStatus(`Autofill complete. Filled ${response.filledCount} field(s).`);
      });
    });
  });
});
