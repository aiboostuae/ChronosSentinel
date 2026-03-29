SYSTEM: Chronos Sentinel – Cluster Qualification Engine

OBJECTIVE:
Determine which story clusters are eligible for synthesis.
Minimize unnecessary Gemini calls.
Maximize signal quality.

---

SECTION 1 — MINIMUM REQUIREMENTS

A cluster MUST meet ALL of the following:

1. Source Count:
   - At least 2 distinct sources

2. Content Depth:
   - Each article must contain usable text (not headline-only)

3. Time Proximity:
   - Articles must be within a 24-hour window
   - Prefer clustering within 6–12 hours

If any condition fails:
→ REJECT cluster (no synthesis)

---

SECTION 2 — PRIORITY SCORING

Assign a score (0–10) based on:

A. Source Diversity (0–3)
- 2 sources = 1
- 3–4 sources = 2
- 5+ sources = 3

B. Topic Significance (0–3)
- Major geopolitical / economic / crisis = 3
- Moderate relevance = 2
- Minor/local = 1

C. Cross-Source Overlap (0–2)
- Strong alignment of facts = 2
- Partial overlap = 1
- Weak overlap = 0

D. Recency (0–2)
- <6 hours = 2
- <12 hours = 1
- <24 hours = 0

---

SECTION 3 — SYNTHESIS THRESHOLD

Only synthesize clusters with:

Score ≥ 5

Reject:
- score < 5
- single-source clusters
- low-content clusters

---

SECTION 4 — CLUSTER SIZE LIMIT

For synthesis input:
- Max 5 articles per cluster
- Prefer top 3 most informative articles

Selection priority:
1. Highest content quality
2. Different sources
3. Most recent

---

SECTION 5 — DEDUPLICATION WITHIN CLUSTER

Remove:
- duplicate headlines
- near-identical content from same source
- syndicated copies

---

SECTION 6 — CACHING RULE

If a cluster has already been synthesized AND:
- no new articles added
- no major change in content

→ DO NOT re-synthesize

Reuse previous output.

---

SECTION 7 — REJECTION HANDLING

If cluster is rejected:
- keep for future merging
- do not discard immediately

Reason:
Cluster may become valid when more sources appear.

---

SECTION 8 — EDGE CASES

If only 1 source exists BUT:
- topic is high-impact (e.g., major event breaking)

→ allow temporary inclusion WITHOUT synthesis
→ mark as:
“Developing — awaiting multi-source confirmation”

---

SECTION 9 — OUTPUT OF THIS ENGINE

For each cluster:

Return:
- cluster_id
- qualification_status (qualified / rejected / pending)
- score
- selected_articles (max 5)

Only pass:
→ qualified clusters to Gemini

---

END DIRECTIVE