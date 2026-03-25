# Chronos Sentinel - Stage 2: Premium & Personalization

**Objective:** Transform the "utility" dashboard into a premium, PWA-enabled intelligence terminal with localized alerts and a high-end "Cyber-Noir" aesthetic.

---

## Proposed Changes

### 1. UI/UX Reboot (Premium Cyber-Noir)
- **Aesthetic**: Implement "Glassmorphism" (glass-blur panels, luminous borders, deep-space background).
- **Mobile First**:
  - Add a **Fixed Bottom Navigation Bar** for one-thumb access to Sentinel, Live, and Archive tabs on mobile.
  - Transform tables into "Stacked List Cards" on smaller screens.
- **Micro-animations**: Add CSS transitions for tab switching and hover states to make the interface feel alive.

### 2. PWA (Progressive Web App)
- **Manifest**: Create `manifest.json` so the app is installable on iOS/Android.
- **Service Worker**: Implement a service worker for **Offline Viewing** of the latest cached headlines/clusters.
- **Icons**: Generate 512x512 and 192x192 Sentinel branding icons.

### 3. Data Intelligence (Alerts & Localization)
- **Global Alert System**: 
  - Integrate **GDACS** (Global Disaster Alert and Coordination System) RSS feed into `LayerA`.
  - Add a "Global Threat Level" banner to the dashboard header that changes color (Green/Yellow/Red) based on active disaster severity.
- **Middle East Expansion**:
  - Add **Gulf News** and **Khaleej Times** (using direct API/RSS paths) to the `SOURCES` list.
- **Personalization**:
  - Add a "Focus Region" selector in the settings (defaulting to Global, selectable to Middle East/Dubai).
  - Use `localStorage` to persist the user's preference and filter/prioritize matching content in the Sentinel view.

### 4. synthesis Logic Refinement (The "Not Moving" Fix)
- Change the clustering logic to prioritize "Freshness" over "Volume."
- Add a "Minimum Overlap" bypass for high-priority Middle East sources to ensure the user always sees their selected region's specific updates in the Synthesis panel.

---

## Verification Plan

### Automated Tests
- Run `npm run layer:ab` to verify new ME sources and GDACS feed.
- Run `npm run layer:cde` to verify cluster generation with the new prioritization.

### Manual Verification
- **Lighthouse Audit**: Run a PWA audit in Chrome to ensure 100% installability.
- **Mobile Emulation**: Test the new Bottom Nav on various iPhone/Android screen sizes.
- **Persistence Check**: Select 'Middle East' focus, refresh page, and verify it stays selected.
