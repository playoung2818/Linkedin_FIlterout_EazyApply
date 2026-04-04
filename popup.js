const STORAGE_KEY = "filterEnabled";
const RESUME_DATA_KEY = "resumeData";
const DEFAULT_RESUME_RESOURCE = "resume.default.json";

const toggle = document.getElementById("toggle");
const loadResumeBtn = document.getElementById("loadResumeBtn");
const resumeFileInput = document.getElementById("resumeFileInput");
const autofillBtn = document.getElementById("autofillBtn");
const autofillStatus = document.getElementById("autofillStatus");

chrome.storage.sync.get({ [STORAGE_KEY]: true }, (result) => {
  toggle.checked = Boolean(result[STORAGE_KEY]);
});

toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ [STORAGE_KEY]: toggle.checked });
});

function setStatus(message, isOk) {
  autofillStatus.textContent = message;
  autofillStatus.classList.remove("ok", "warn");
  autofillStatus.classList.add(isOk ? "ok" : "warn");
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result || "{}")));
      } catch (err) {
        reject(new Error("Invalid JSON format."));
      }
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsText(file);
  });
}

function getLatestExperience(resumeData) {
  const exp = Array.isArray(resumeData.experience) ? resumeData.experience : [];
  return exp.length > 0 ? exp[0] : {};
}

function getLatestEducation(resumeData) {
  const edu = Array.isArray(resumeData.education) ? resumeData.education : [];
  return edu.length > 0 ? edu[0] : {};
}

function buildAutofillPayload(resumeData) {
  const latestExp = getLatestExperience(resumeData);
  const latestEdu = getLatestEducation(resumeData);
  const projects = Array.isArray(resumeData.projects) ? resumeData.projects : [];
  const firstProject = projects.length > 0 ? projects[0] : {};
  const skills = Array.isArray(resumeData.skills) ? resumeData.skills.join(", ") : "";
  const experiences = Array.isArray(resumeData.experience) ? resumeData.experience : [];
  const education = Array.isArray(resumeData.education) ? resumeData.education : [];

  return {
    summary: firstProject.summary || "",
    skills,
    currentTitle: latestExp.title || "",
    currentCompany: latestExp.company || "",
    location: latestExp.location || "",
    school: latestEdu.school || "",
    degree: latestEdu.degree || "",
    project: firstProject.name || "",
    experiences: experiences.map((e) => ({
      title: e.title || "",
      company: e.company || "",
      location: e.location || "",
      start: e.start || "",
      end: e.end || "",
      description: Array.isArray(e.bullets) ? e.bullets.join("\n") : ""
    })),
    education: education.map((e) => ({
      school: e.school || "",
      degree: e.degree || "",
      location: e.location || "",
      year: e.year || ""
    }))
  };
}

function fillApplicationForm(data) {
  const normalize = (s) => String(s || "").toLowerCase();
  const firstSentence = (s) => String(s || "").split(".")[0]?.trim() || "";
  const experiences = Array.isArray(data.experiences) ? data.experiences : [];
  const education = Array.isArray(data.education) ? data.education : [];

  const monthYear = (value) => {
    const v = String(value || "").trim();
    if (!v) return "";
    if (/^\d{4}-\d{2}$/.test(v)) {
      const [year, month] = v.split("-");
      return `${month}/${year}`;
    }
    if (/^\d{4}$/.test(v)) return `01/${v}`;
    return v;
  };

  const getLabelText = (el) => {
    const tokens = [];
    if (el.id) {
      const explicit = document.querySelector(`label[for="${el.id}"]`);
      if (explicit) tokens.push(explicit.textContent || "");
    }
    const closestLabel = el.closest("label");
    if (closestLabel) tokens.push(closestLabel.textContent || "");

    const container = el.closest(".fb-dash-form-element, .jobs-easy-apply-form-element, [role='group'], .artdeco-text-input");
    if (container) {
      container.querySelectorAll("label, legend, .artdeco-text-input__label, .fb-form-element-label").forEach((n) => {
        tokens.push(n.textContent || "");
      });
    }

    tokens.push(el.name || "");
    tokens.push(el.id || "");
    tokens.push(el.placeholder || "");
    tokens.push(el.getAttribute("aria-label") || "");
    return normalize(tokens.join(" "));
  };

  const candidates = {
    "skills": data.skills || "",
    "tech skills": data.skills || "",
    "technical skills": data.skills || "",
    "summary": data.summary || "",
    "about": data.summary || "",
    "cover letter": data.summary || "",
    "experience": `${data.currentTitle} at ${data.currentCompany}`.trim(),
    "current title": data.currentTitle || "",
    "job title": data.currentTitle || "",
    "company": data.currentCompany || "",
    "employer": data.currentCompany || "",
    "location": data.location || "",
    "city": data.location || "",
    "school": data.school || "",
    "education": `${data.degree} - ${data.school}`.trim(),
    "degree": data.degree || "",
    "project": data.project || "",
    "portfolio": data.project || "",
    "why": firstSentence(data.summary)
  };

  const fields = Array.from(document.querySelectorAll("input, textarea, select"));
  let filled = 0;
  const expCounter = {
    title: 0,
    company: 0,
    location: 0,
    from: 0,
    to: 0,
    description: 0,
    current: 0
  };
  const eduCounter = {
    school: 0,
    degree: 0,
    location: 0,
    year: 0
  };

  const setInputValue = (el, value) => {
    if (value === undefined || value === null || value === "") return false;
    if (el.tagName === "SELECT") {
      const options = Array.from(el.options || []);
      const match = options.find((o) => normalize(o.textContent).includes(normalize(value)));
      if (!match) return false;
      el.value = match.value;
    } else if (el.type === "checkbox") {
      const target = Boolean(value);
      if (el.checked === target) return false;
      el.checked = target;
    } else {
      if (el.value && String(el.value).trim().length > 0) return false;
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  };

  for (const el of fields) {
    if (el.disabled || el.readOnly) continue;
    const tag = getLabelText(el);

    let chosen = "";

    // Repeated experience block mapping (fill nth company/title/from/etc from nth experience item).
    if (tag.includes("job title")) {
      const exp = experiences[expCounter.title++] || {};
      chosen = exp.title || "";
    } else if (tag.includes("company")) {
      const exp = experiences[expCounter.company++] || {};
      chosen = exp.company || "";
    } else if (tag.includes("location")) {
      const exp = experiences[expCounter.location++] || {};
      chosen = exp.location || "";
      if (!chosen) {
        const edu = education[eduCounter.location++] || {};
        chosen = edu.location || "";
      }
    } else if (tag.includes("from")) {
      const exp = experiences[expCounter.from++] || {};
      chosen = monthYear(exp.start || "");
    } else if (tag.includes("to")) {
      const exp = experiences[expCounter.to++] || {};
      chosen = /present/i.test(String(exp.end || "")) ? "" : monthYear(exp.end || "");
    } else if (tag.includes("currently work") || tag.includes("currently employed")) {
      const exp = experiences[expCounter.current++] || {};
      chosen = /present/i.test(String(exp.end || ""));
    } else if (tag.includes("role description") || tag.includes("description")) {
      const exp = experiences[expCounter.description++] || {};
      chosen = exp.description || "";
    } else if (tag.includes("school")) {
      const edu = education[eduCounter.school++] || {};
      chosen = edu.school || "";
    } else if (tag.includes("degree")) {
      const edu = education[eduCounter.degree++] || {};
      chosen = edu.degree || "";
    } else if (tag.includes("graduation") || tag.includes("year")) {
      const edu = education[eduCounter.year++] || {};
      chosen = String(edu.year || "");
    }

    // Generic fallback for other fields.
    if (!chosen) {
      for (const [key, value] of Object.entries(candidates)) {
        if (tag.includes(key)) {
          chosen = value;
          break;
        }
      }
    }

    if (setInputValue(el, chosen)) {
      filled += 1;
    }
  }

  return { filled };
}

function loadStoredResume() {
  chrome.storage.local.get({ [RESUME_DATA_KEY]: null }, (res) => {
    const data = res[RESUME_DATA_KEY];
    if (data && typeof data === "object") {
      setStatus("Resume JSON loaded. Ready to autofill.", true);
    } else {
      fetch(chrome.runtime.getURL(DEFAULT_RESUME_RESOURCE))
        .then((resp) => {
          if (!resp.ok) {
            throw new Error("Default resume file not found.");
          }
          return resp.json();
        })
        .then((json) => {
          chrome.storage.local.set({ [RESUME_DATA_KEY]: json }, () => {
            setStatus("Default resume loaded from extension bundle.", true);
          });
        })
        .catch(() => {
          setStatus("No resume JSON loaded.", false);
        });
    }
  });
}

loadResumeBtn.addEventListener("click", () => {
  resumeFileInput.click();
});

resumeFileInput.addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    const json = await readJsonFile(file);
    chrome.storage.local.set({ [RESUME_DATA_KEY]: json }, () => {
      setStatus(`Loaded: ${file.name}`, true);
    });
  } catch (err) {
    setStatus(err.message || "Failed to load JSON.", false);
  }
});

autofillBtn.addEventListener("click", () => {
  chrome.storage.local.get({ [RESUME_DATA_KEY]: null }, async (res) => {
    if (!res[RESUME_DATA_KEY]) {
      setStatus("Import base_resume.json first.", false);
      return;
    }

    const payload = buildAutofillPayload(res[RESUME_DATA_KEY]);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      setStatus("No active tab found.", false);
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: fillApplicationForm,
        args: [payload]
      },
      (results) => {
        if (chrome.runtime.lastError) {
          setStatus(`Autofill failed: ${chrome.runtime.lastError.message}`, false);
          return;
        }
        const count = results && results[0] && results[0].result ? results[0].result.filled : 0;
        setStatus(`Autofilled ${count} field(s).`, true);
      }
    );
  });
});

loadStoredResume();
