# SOUL CHRONICLES (HISTORICAL LOG)
## Project: Chronos Sentinel (CS)

This document is the historical record of the journey. It captures challenges encountered and the logic used to overcome them.

---

### [2026-03-23] STAGE 1: THE INTAKE FOUNDATION (MVP)
**Outcome**: Success. Pipeline functional from RSS to Cloudflare.
- **Challenge: SDK Breaking Change**. The Gemini SDK `res.text()` method became a property `res.text`.
  - *Fix*: Switched to property access in `LayerCD_Synthesis.ts`.
- **Challenge: GitHub Actions Race Conditions**. Concurrent runs caused push failures.
  - *Fix*: Implemented `git pull --rebase` before every push in the `.yml` workflow.

### [2026-03-24] STAGE 1.5: ARCHIVE DISCOVERY
**Outcome**: Success. Frontend can now discover daily logs.
- **Challenge: Static File Discovery**. Browsers cannot list directories on a server.
  - *Fix*: Implemented `LayerE_Archive.ts` to generate a `manifest.json` file acting as a central index for all snapshot files.

### [2026-03-25] STAGE 2: PREMIUM INTELLIGENCE TERMINAL
**Outcome**: Success. Dashboard upgraded to Cyber-Noir / PWA standards.
- **Challenge: Brittle Content-Type Checks**. Cloudflare served JSON as `octet-stream`, causing `fetch` failures in `app.js`.
  - *Fix*: Removed header-based validation and switched to a `try...catch(JSON.parse)` pattern.
- **Challenge: RSS Feed Stability**. Gulf News and Khaleej Times RSS feeds returned 404s or hung.
  - *Fix*: Swapped for **Arabian Business** (stable RSS) and **GDACS** (reliable alert feed).
- **Challenge: UI Responsiveness**. Tables were unreadable on mobile.
    - *Fix*: Implemented a fixed **Bottom Navigation Bar** with a high `z-index` (9999) and PWA-specific `env(safe-area-inset-bottom)` padding to avoid overlapping with OS home bars.
- **Challenge: Viewport Height Jumps**. Mobile browsers often resize when the address bar hides, causing UI jitter.
  - *Fix*: Switched to **svh** (Small Viewport Height) units for the body container.

### [2026-03-26] STAGE 2.1: EMERGENCY RECOVERY
**Outcome**: Success. PWA cache flushed and bottom-nav forced to 100% consistency.
- **Challenge: Aggressive PWA Caching (Cache-First)**. The `v2` service worker was stuck serving old HTML/JS/CSS, causing the "7 PM stall" and "still on top" UI regressions.
    - *Fix*: Incremented to **sw.js v3**, implemented **Network-First** strategy for data, and forced a cache purge on activation.
- **Challenge: Structural Navigation Conflicts**. Sticky headers were capturing the navigation even on mobile.
    - *Fix*: Decoupled `.view-controls` from the header and re-anchored them to the `body` root for reliable multi-viewport fixed positioning.
- **Challenge: Archive "Stats Only" Phantoms**. Synthesis failures left archives feeling empty.
    - *Fix*: Re-engineered `app.js` to render historical headlines as a primary archive feature, ensuring value even when clusters are building.

---
*History Refined by UncleGravity AI | Strategic Intelligence Log*
