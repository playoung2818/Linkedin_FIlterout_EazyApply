# LinkedIn Filter: Easy Apply + Promoted + Autofill

A lightweight Chrome/Edge extension that hides LinkedIn Jobs cards labeled:

- `Easy Apply`
- `Promoted`

This is a client-side visual filter and does not modify your LinkedIn account or backend data.

## Features

- Hides matching job cards automatically on `linkedin.com/jobs/*`
- Handles dynamic loading/infinite scroll via `MutationObserver`
- Popup toggle to enable/disable filtering
- Persists preference with `chrome.storage.sync`
- Stores a reusable autofill profile in extension storage
- One-click autofill for open Easy Apply forms

## Folder Contents

- `manifest.json`: Manifest V3 config and permissions
- `content.js`: DOM filtering logic for job cards
- `popup.html`: popup UI for filtering and profile fields
- `popup.js`: popup state management + autofill trigger

## Install (Developer Mode)

1. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder:
   `/Users/a20748/Desktop/Job/Resume_CL_generator/extensions/linkedin-no-easy-apply`
5. Open LinkedIn Jobs:
   `https://www.linkedin.com/jobs/`
6. Pin the extension and make sure the popup toggle is enabled.

## Autofill Usage

1. Open the extension popup.
2. Fill out your profile fields and click **Save Profile**.
3. Open a LinkedIn job and click **Easy Apply** so the form is visible.
4. Click **Autofill Current Page** in the popup.
5. Review every answer before submitting.

## Update After Local Changes

1. Save your file changes.
2. Open your extensions page.
3. Click **Reload** on this extension.
4. Refresh the LinkedIn Jobs tab.

## How It Works

`content.js` scans likely LinkedIn job-card containers and checks card text/aria labels for blocked labels (`easy apply`, `promoted`). Matching cards get a hidden CSS class (`display: none !important`).

For autofill, the script reads saved profile fields and fills common text inputs in Easy Apply modals (name, email, phone, location, links, years of experience) based on label matching.

## Limitations

- LinkedIn may change DOM structure/class names; selectors may need updates.
- If a label is loaded late, it may appear briefly before being hidden.
- This extension hides cards visually only; it does not change search ranking.
- Autofill currently targets common text-like fields only; custom question types may still need manual input.
- You must verify all autofilled values before submitting any application.

## Privacy

- No external requests are made by this extension.
- No tracking or analytics.
- Only uses `chrome.storage.sync` for a single local/synced toggle state.
