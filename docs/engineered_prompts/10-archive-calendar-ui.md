SYSTEM: Chronos Sentinel – Archive Calendar UI

OBJECTIVE:
Provide a scalable, intuitive, and visually compressed archive navigation system.

---

SECTION 1 — STRUCTURE

The Archive page must have:

1. Header:
   - "Browse Intelligence Timeline"

2. Year Selector:
   - Left/right arrows OR dropdown
   - Example:
     ← 2026 →

3. Month View:
   - Display current month (e.g. March)

4. Calendar Grid:
   - 7 columns (Mon–Sun)
   - Standard calendar layout

5. Day Detail Panel (below calendar):
   - Shows selected day’s snapshots

---

SECTION 2 — DAY CELL DESIGN

Each day cell contains:

- Day number (top right or top left)
- Activity indicators (bottom)

Activity indicators:
- Horizontal bars OR dots

Max 3 indicators per day.

---

SECTION 3 — ACTIVITY LOGIC

Each day displays intensity based on:

- number of qualified clusters
- number of synthesis outputs

Mapping:

0 → no indicator  
1–2 → 1 bar  
3–5 → 2 bars  
6+ → 3 bars  

Color logic:
- green → low activity  
- orange → moderate  
- red → high / critical  

---

SECTION 4 — INTERACTION

When user clicks a day:

1. Highlight selected day
2. Load day detail panel
3. Scroll into view if needed

---

SECTION 5 — DAY DETAIL PANEL

Displays:

Header:
- "Mar 27, 2026"

Content:
- list of runs

Example:

Run 09:00  
- 3 clusters  
- 2 alerts  

Run 12:00  
- 5 clusters  
- 1 alert  

---

SECTION 6 — RUN INTERACTION

Clicking a run:
- loads snapshot data
- displays:
  - synthesis cards
  - clusters
  - sources

---

SECTION 7 — EMPTY STATE

If no data for a day:

Display:
"No intelligence recorded for this date."

---

SECTION 8 — PERFORMANCE RULE

Calendar must:
- load instantly
- not fetch full archive at once
- use index.json for mapping

---

SECTION 9 — MOBILE BEHAVIOR

- calendar scrollable
- day panel collapsible
- tap-friendly spacing

---

SECTION 10 — DESIGN RULES

- minimal visual noise
- no heavy borders
- subtle indicators only
- consistent dark theme

---

END SYSTEM