# LinkedIn Filter: Easy Apply + Promoted

A lightweight Chrome/Edge extension that hides LinkedIn Jobs cards labeled:

- `Easy Apply`
- `Promoted`
- `Reposted`

This is a client-side visual filter and does not modify your LinkedIn account or backend data.

## Features

- Hides matching job cards automatically on `linkedin.com/jobs/*`
- Handles dynamic loading/infinite scroll via `MutationObserver`
- Popup toggle to enable/disable filtering
- Persists preference with `chrome.storage.sync`
- Optional resume-based autofill for application pages (popup button)

## Folder Contents

- `manifest.json`: Manifest V3 config and permissions
- `content.js`: DOM filtering logic for job cards
- `popup.html`: extension popup UI
- `popup.js`: popup toggle state management

## Install (Developer Mode)

1. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder:
   `/Users/a20748/Desktop/Job/Resume_CL_generator/extensions/linkedin-no-easy-apply`
5. Open LinkedIn Jobs:
   `https://www.linkedin.com/jobs/`
6. Pin the extension and make sure the popup toggle is enabled.

## Update After Local Changes

1. Save your file changes.
2. Open your extensions page.
3. Click **Reload** on this extension.
4. Refresh the LinkedIn Jobs tab.

## How It Works

`content.js` scans likely LinkedIn job-card containers and checks card text/aria labels for blocked labels (`easy apply`, `promoted`). Matching cards get a hidden CSS class (`display: none !important`).

The popup also supports importing a JSON profile and running autofill on the active tab.
This uses `chrome.scripting.executeScript` only when you click **Autofill Current Page**.

## Autofill Setup

Default behavior:
- The extension auto-loads bundled `resume.default.json` on first use.
- No import is required for normal use.

Optional override:
1. Open the extension popup.
2. Click **Import `base_resume.json`**.
3. Select:
   `/Users/a20748/Desktop/Job/Resume_CL_Generator/data/base_resume.json`
4. Open a job application page and click **Autofill Current Page**.

Notes:
- Filter behavior is unchanged and independent from autofill.
- Autofill writes only to currently empty fields when it can match common labels
  (skills, summary, title, company, school, degree, location).

## Limitations

- LinkedIn may change DOM structure/class names; selectors may need updates.
- If a label is loaded late, it may appear briefly before being hidden.
- This extension hides cards visually only; it does not change search ranking.

## Privacy

- No external requests are made by this extension.
- No tracking or analytics.
- Only uses `chrome.storage.sync` for a single local/synced toggle state.
