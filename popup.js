const FILTER_KEY = "filterEnabled";
const PROFILE_KEY = "autofillProfile";
const BASE_PROFILE_URL = chrome.runtime.getURL("seed/base_profile.json");
const BASE_RESUME_URL = chrome.runtime.getURL("seed/base_resume.json");

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

function writeProfileToForm(profile = {}) {
  for (const [key, input] of Object.entries(profileFields)) {
    input.value = profile[key] || "";
  }
}

function splitName(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function computeYearsExperience(resume) {
  const currentYear = new Date().getFullYear();
  const starts = (resume.experience || [])
    .map((role) => String(role.start || ""))
    .map((v) => {
      const match = v.match(/(\d{4})/);
      return match ? Number(match[1]) : null;
    })
    .filter((v) => Number.isFinite(v));

  if (!starts.length) return "";
  const earliest = Math.min(...starts);
  return String(Math.max(0, currentYear - earliest));
}

function linksToProfile(links) {
  const arr = Array.isArray(links) ? links.map((v) => String(v || "")) : [];
  const linkedin = arr.find((v) => v.toLowerCase().includes("linkedin.com")) || "";
  const github = arr.find((v) => v.toLowerCase().includes("github.com")) || "";
  const website = arr.find((v) => v && v !== linkedin && v !== github) || "";
  return { linkedin, github, website };
}

async function loadProfileFromSeedFiles() {
  const [profileResp, resumeResp] = await Promise.all([
    fetch(BASE_PROFILE_URL),
    fetch(BASE_RESUME_URL)
  ]);

  if (!profileResp.ok || !resumeResp.ok) {
    throw new Error("Could not load base profile files.");
  }

  const baseProfile = await profileResp.json();
  const baseResume = await resumeResp.json();
  const fullName = String(baseProfile.name || "").trim();
  const nameParts = splitName(fullName);
  const linkParts = linksToProfile(baseProfile.links);

  return {
    fullName,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    email: String(baseProfile.email || "").trim(),
    phone: String(baseProfile.phone || "").trim(),
    location: String(baseProfile.location || "").trim(),
    linkedin: linkParts.linkedin,
    github: linkParts.github,
    website: linkParts.website,
    yearsExperience: computeYearsExperience(baseResume)
  };
}

async function syncFromSeedFiles() {
  const profile = await loadProfileFromSeedFiles();
  writeProfileToForm(profile);
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [PROFILE_KEY]: profile }, () => resolve(profile));
  });
}

for (const input of Object.values(profileFields)) {
  input.readOnly = true;
}

chrome.storage.sync.get({ [FILTER_KEY]: true }, async (result) => {
  toggle.checked = Boolean(result[FILTER_KEY]);
  try {
    await syncFromSeedFiles();
    setStatus("Loaded profile from base JSON files.");
  } catch (err) {
    setStatus(String(err && err.message ? err.message : err), true);
  }
});

toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ [FILTER_KEY]: toggle.checked });
});

saveBtn.addEventListener("click", () => {
  syncFromSeedFiles()
    .then(() => setStatus("Refreshed from base JSON files."))
    .catch((err) =>
      setStatus(String(err && err.message ? err.message : err), true)
    );
});

autofillBtn.addEventListener("click", () => {
  syncFromSeedFiles()
    .then(() => {
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
    })
    .catch((err) =>
      setStatus(String(err && err.message ? err.message : err), true)
    );
});
