# SOUL MANIFEST
## Project: Chronos Sentinel (CS)
### Current Revision: v2.1.0 (Stage 2 Stable)

---

## 1. ENVIRONMENT & TOOLING
- **Runtime**: Node.js (TypeScript)
- **Deployment**: Cloudflare Pages (Public directory: `/public`)
- **Pipeline**: GitHub Actions (`.github/workflows/`)
  - `intake.yml`: Layer A+B (15 min interval)
  - `synthesis.yml`: Layer C+D+E (60 min interval)
- **Environment Variables**:
  - `GEMINI_API_KEY`: Required for Layer CD.

## 2. CORE SCHEMAS
### Headlines (`headlines.json`)
- Array of `HeadlineRecord`: `{ id, sourceId, title, url, publishTime, ingestTime }`

### Clusters (`clusters.json`)
- Array of `StoryCluster`: `{ clusterId, topic, memberArticles[], comparison: { sharedFacts, sourceDistinctions, synthesisSummary, confidenceNote } }`

### Alerts (`alerts.json`)
- Array of `GlobalAlert`: `{ id, title, description, severity, link, pubDate }`

## 3. ACTIVE LOGIC (ANTI-AMNESIA)
- **Clustering**: Gemini-2.5-Flash slices the top 8 recent clusters.
- **Filtering**: `app.js` filters by `localStorage:sentinel_region`.
- **PWA**: Service Worker (`sw.js`) caches data for offline access.

## 4. NEXT STEPS (WHERE WE LEFT OFF)
- [ ] Monitor Synthesis Diversity: Ensure Arabian Business and GDACS integration triggers meaningful clusters.
- [ ] Visual Refinement: Adjust threat-level colors if they clash with the cyber-blue theme.
- [ ] Soul Protocol: Finalize versioning of design docs.

---
*End of Manifest*
