SYSTEM: Chronos Sentinel – Stage 1 Optimization Directive

OBJECTIVE:
Stabilize pipeline, reduce Gemini usage, enforce strict processing boundaries, and complete missing architecture layers.

---

SECTION 1 — CORE PIPELINE (MANDATORY ORDER)

The system MUST operate in this sequence:

1. Intake (recent items only)
2. Deduplication
3. Article Extraction (only unseen items)
4. Working Pool Update (recent window only)
5. Story Clustering
6. Cluster Qualification
7. Synthesis (cluster-level only)
8. Latest Output Write
9. Archive Snapshot Write

No step may be skipped or reordered.

---

SECTION 2 — INTAKE CONSTRAINTS

Per source:
- Fetch ONLY latest 10–20 items (RSS or equivalent)
- DO NOT scan entire history

New item definition:
- URL not previously seen
- OR published after last successful run

---

SECTION 3 — EXTRACTION CONSTRAINTS

- Extract full article text ONLY for new unseen items
- DO NOT re-extract existing articles
- Cache extracted content by URL

---

SECTION 4 — WORKING POOL WINDOW

Maintain a rolling window:
- Include only articles from last 24 hours
- Prefer weighting toward last 6–12 hours

Remove:
- stale articles outside window
- irrelevant or low-signal entries

---

SECTION 5 — CLUSTERING RULES

Group articles into clusters based on:
- semantic similarity
- time proximity
- shared entities/location

Each cluster MUST:
- have at least 2 articles to qualify
- represent one real-world event

---

SECTION 6 — SYNTHESIS CONSTRAINTS (CRITICAL)

DO NOT:
- summarize every article individually
- send all articles into Gemini blindly

ONLY:
- run ONE Gemini call per qualified cluster

Input to Gemini:
- MAX 3–5 articles per cluster
- Use trimmed article text (not full raw bodies)

Output required:
1. Shared facts
2. Source distinctions
3. Neutral summary
4. Confidence note

---

SECTION 7 — TOKEN OPTIMIZATION

- Limit input text length per article
- Prefer excerpts over full content
- Avoid re-synthesizing unchanged clusters
- Cache previous cluster outputs if identical

---

SECTION 8 — LATEST OUTPUT FILES

Update after each run:
- /data/latest/headlines.json
- /data/latest/clusters.json

Ensure frontend paths match EXACTLY.

---

SECTION 9 — ARCHIVE LAYER (MANDATORY)

After each successful run:

Write snapshot:
- /data/archive/YYYY-MM-DD/run-HHMM.json

Also maintain:
- /data/archive/latest.json
- /data/archive/index.json

index.json format:

{
  "dates": [
    {
      "date": "YYYY-MM-DD",
      "runs": ["run-HHMM.json"]
    }
  ]
}

---

SECTION 10 — FAILURE HANDLING

- Skip failed sources (do not stall pipeline)
- Log all errors clearly
- Ensure workflow exits cleanly

---

SECTION 11 — PERFORMANCE TARGET

- Max runtime: under 5 minutes per run
- Gemini calls: minimized (cluster-based only)
- No redundant processing

---

SECTION 12 — VALIDATION CHECK

System is correct ONLY if:
- new headlines appear incrementally
- synthesis reflects recent stories only
- Gemini usage remains within free tier
- Archive tab loads real snapshots
- no infinite “initializing” states

---

END DIRECTIVE