SYSTEM: Chronos Sentinel – Region Filter and UI State Fix

OBJECTIVE:
Make the region selector functional, persistent, and fully bound to both data and labels.

PROBLEM:
Current region switch (Global ↔ Middle East) appears cosmetic only.
The selected region does not update:
- fetched data
- visible cards
- section headings
- tab content

This must be fixed permanently.

---

SECTION 1 — SINGLE SOURCE OF TRUTH

Create one active UI state variable:

- activeRegion

Allowed values:
- global
- middle-east

All region-dependent rendering must derive from this state.
No hardcoded labels.

---

SECTION 2 — DATA REQUIREMENT

Every headline, cluster, synthesis card, and impact card must include:

- region_tag

Allowed values for Stage 1:
- global
- middle-east

If an item belongs to both, allow:
- global
- middle-east
as array OR assign by primary region rule

But the frontend must always be able to filter by region.

---

SECTION 3 — FILTER BEHAVIOR

When user changes region:

1. update activeRegion
2. filter all displayed datasets by activeRegion
3. rerender visible sections
4. update all headings and labels
5. persist selection locally

This applies to:
- Synthesis
- Live Feed
- Impact
- Archive

---

SECTION 4 — LABEL BINDING

Do NOT hardcode titles like:
- Raw Global Headlines

Replace with dynamic label binding.

Examples:

If activeRegion = global:
- "Raw Global Headlines"
- "Global Sentinel Synthesis"
- "Global High-Impact Intelligence"

If activeRegion = middle-east:
- "Raw Middle East Headlines"
- "Middle East Sentinel Synthesis"
- "Middle East High-Impact Intelligence"

All section titles must change automatically with region state.

---

SECTION 5 — EMPTY STATE

If a region has no data for a tab, show:

- "No items available for this region yet."

Do NOT leave stale cards from previous region.
Do NOT keep old titles.

---

SECTION 6 — LOCAL PERSISTENCE

Persist last selected region in browser storage.

On page load:
1. read saved region
2. restore region selection
3. render matching content

Fallback default:
- global

---

SECTION 7 — URL STATE (OPTIONAL BUT RECOMMENDED)

Support region in query string or hash.

Examples:
- ?region=global
- ?region=middle-east

This enables:
- direct sharing
- reliable reload behavior
- easier debugging

---

SECTION 8 — ARCHIVE FILTERING

Archive must also respect activeRegion.

Archive view should show:
- only snapshots/cards relevant to selected region
OR
- snapshot plus filtered region contents inside that snapshot

But region switching must visibly affect archive results.

---

SECTION 9 — TESTING ACCEPTANCE

The feature is correct only if all of the following work:

1. Changing region updates visible cards immediately
2. Section titles update immediately
3. Live Feed updates immediately
4. Impact updates immediately
5. Archive updates immediately
6. Refresh preserves region selection
7. Empty regions show proper empty state
8. No stale content remains from previous region

---

SECTION 10 — NON-NEGOTIABLE RULE

Region selector must not be cosmetic.
It must control:
- data
- labels
- rendering
- persistence

END DIRECTIVE