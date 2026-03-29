SYSTEM: Chronos Sentinel – Upgrades Roadmap

OBJECTIVE:
Define evolution from Stage 1 (Alpha) → Stage 2 (Beta) → Stage 3 (Production)

---

STAGE 1 — ALPHA (CURRENT)

GOAL:
Validate pipeline integrity and signal quality.

FEATURES:
- Source intake (RSS/scrape)
- Article extraction
- Story clustering
- Gemini synthesis (cluster-level)
- Latest output (Live + Sentinel view)
- Basic UI
- Manual validation

CONSTRAINTS:
- Strict token limits
- Limited sources (4–6)
- No public distribution

SUCCESS CRITERIA:
- Accurate clustering
- Useful synthesis
- Stable pipeline (no hangs)
- Controlled Gemini usage

---

STAGE 2 — BETA

GOAL:
Improve usability, trust, and consistency.

FEATURES:

1. Archive System (COMPLETE)
- Snapshot storage
- Archive index
- Archive viewer (date + run selection)

2. Timestamp Intelligence
- Each synthesis card shows:
  - cluster time window
  - last updated timestamp
- Each raw article shows:
  - full datetime (not just time)

3. Cache Control Fix
- Force JSON refresh (no stale data)
- Add cache-busting query param
- Ensure consistent updates across devices

4. Topic & Region Filters
- Global (default)
- Middle East (priority)
- Optional:
  - US
  - Asia
  - Europe

5. Signal Strength Indicator
- Show:
  - number of sources
  - confidence level

6. Alert System (BASIC)
- Trigger when:
  - high-score cluster appears
  - rapid multi-source coverage
- Output:
  - UI badge or highlight

7. UI Refinement
- Clear separation:
  - Snapshot (quick)
  - Intelligence (core)
  - Source links (deep)

SUCCESS CRITERIA:
- Stable multi-device experience
- Archive fully functional
- Clear timestamps
- Reduced user confusion

---

STAGE 3 — PRODUCTION

GOAL:
Monetization and scale.

FEATURES:

1. Advanced Alerts
- Topic-based alerts
- Region-based alerts
- “Breaking cluster” detection

2. Narrative Drift
- Compare:
  - yesterday vs today
  - source framing changes over time

3. Personalization (Optional)
- Saved topics
- Region preferences

4. API Layer (Optional)
- External access to clusters/synthesis

5. Monetization Layer
- Subscription access
- Premium features

---

MONETIZATION STRATEGY

DO NOT start with ads.

PHASE 1:
Free tool (validation phase)

PHASE 2:
Invite-only beta

PHASE 3:
Subscription model

TARGET USERS:
- Analysts
- Founders
- Researchers
- Information-sensitive professionals

PRICING MODEL (FUTURE):
- Free tier: limited clusters/day
- Paid tier:
  - full access
  - alerts
  - archive analytics

ADS:
- Only consider later
- Risk: degrades trust

---

REGIONAL STRATEGY

START WITH:
- Global
- Middle East (priority)

EXPAND LATER:
- US
- Asia
- Europe

Do NOT overload early.

---

SCALING RULE

Add:
- features AFTER stability
- sources AFTER signal quality proven
- users AFTER UX is clean

---

END ROADMAP