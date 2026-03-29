SYSTEM: Chronos Sentinel – Data Schema Specification

OBJECTIVE:
Define the minimum production-grade data model for Stage 1.

SCHEMA PHILOSOPHY:
- JSON-first
- flat enough for GitHub storage
- structured enough for clustering, synthesis, archive, and UI
- optimized for low complexity and auditability

---

SECTION 1 — SOURCE OBJECT

Purpose:
Defines a monitored publisher/source.

Fields:
- source_id: string
- name: string
- region: string
- language: string
- intake_method: string
  Allowed:
  - rss
  - sitemap
  - scrape
- base_url: string
- active: boolean
- priority: integer
- notes: string (optional)

Example:
{
  "source_id": "fox-news",
  "name": "Fox News",
  "region": "US",
  "language": "en",
  "intake_method": "rss",
  "base_url": "https://www.foxnews.com",
  "active": true,
  "priority": 1
}

---

SECTION 2 — HEADLINE OBJECT

Purpose:
Represents a newly collected source item before or during extraction.

Fields:
- headline_id: string
- source_id: string
- title: string
- url: string
- canonical_url: string
- section: string|null
- published_at: string|null
- ingested_at: string
- seen_before: boolean
- extraction_status: string
  Allowed:
  - pending
  - success
  - failed
- hash: string

Example:
{
  "headline_id": "hl_20260326_001",
  "source_id": "fox-news",
  "title": "Example headline",
  "url": "https://example.com/article",
  "canonical_url": "https://example.com/article",
  "section": "world",
  "published_at": "2026-03-26T09:15:00Z",
  "ingested_at": "2026-03-26T09:18:00Z",
  "seen_before": false,
  "extraction_status": "pending",
  "hash": "abc123"
}

---

SECTION 3 — ARTICLE OBJECT

Purpose:
Represents cleaned article content after extraction.

Fields:
- article_id: string
- headline_id: string
- source_id: string
- title: string
- url: string
- canonical_url: string
- author: string|null
- published_at: string|null
- extracted_at: string
- excerpt: string
- body_text: string
- content_length: integer
- language: string
- entities: array
- geography: array
- extraction_status: string
  Allowed:
  - success
  - failed
- extraction_error: string|null

Example:
{
  "article_id": "art_20260326_001",
  "headline_id": "hl_20260326_001",
  "source_id": "fox-news",
  "title": "Example headline",
  "url": "https://example.com/article",
  "canonical_url": "https://example.com/article",
  "author": "John Doe",
  "published_at": "2026-03-26T09:15:00Z",
  "extracted_at": "2026-03-26T09:19:00Z",
  "excerpt": "A short cleaned excerpt from the article.",
  "body_text": "Full cleaned article text.",
  "content_length": 4820,
  "language": "en",
  "entities": ["Israel", "Gaza"],
  "geography": ["Middle East"],
  "extraction_status": "success",
  "extraction_error": null
}

---

SECTION 4 — CLUSTER OBJECT

Purpose:
Represents a group of articles believed to cover the same event.

Fields:
- cluster_id: string
- topic_label: string
- event_window_start: string
- event_window_end: string
- article_ids: array
- source_ids: array
- article_count: integer
- source_count: integer
- qualification_status: string
  Allowed:
  - qualified
  - rejected
  - pending
- qualification_score: integer
- primary_geography: string|null
- topic_type: string|null
- created_at: string
- updated_at: string

Example:
{
  "cluster_id": "cl_20260326_001",
  "topic_label": "Israel-Gaza ceasefire talks",
  "event_window_start": "2026-03-26T06:00:00Z",
  "event_window_end": "2026-03-26T10:00:00Z",
  "article_ids": ["art_001", "art_002", "art_003"],
  "source_ids": ["fox-news", "al-jazeera", "gulf-news"],
  "article_count": 3,
  "source_count": 3,
  "qualification_status": "qualified",
  "qualification_score": 7,
  "primary_geography": "Middle East",
  "topic_type": "geopolitics",
  "created_at": "2026-03-26T10:05:00Z",
  "updated_at": "2026-03-26T10:05:00Z"
}

---

SECTION 5 — SYNTHESIS OBJECT

Purpose:
Represents Gemini output for one qualified cluster.

Fields:
- synthesis_id: string
- cluster_id: string
- prompt_version: string
- generated_at: string
- selected_article_ids: array
- shared_facts: array
- source_differences: array
- neutral_summary: string
- confidence_status: string
  Allowed:
  - consistent
  - partially_conflicting
  - evolving
  - insufficient
- reused_from_cache: boolean

Example:
{
  "synthesis_id": "syn_20260326_001",
  "cluster_id": "cl_20260326_001",
  "prompt_version": "synthesis-v1.0",
  "generated_at": "2026-03-26T10:06:00Z",
  "selected_article_ids": ["art_001", "art_002", "art_003"],
  "shared_facts": [
    "Multiple outlets report renewed ceasefire talks.",
    "Talks are linked to regional diplomatic pressure."
  ],
  "source_differences": [
    "Fox News emphasizes security implications.",
    "Al Jazeera gives more space to humanitarian concerns.",
    "Gulf News foregrounds regional diplomacy."
  ],
  "neutral_summary": "Multiple outlets report active ceasefire discussions, though each emphasizes different dimensions of the negotiations.",
  "confidence_status": "partially_conflicting",
  "reused_from_cache": false
}

---

SECTION 6 — SNAPSHOT OBJECT

Purpose:
Represents one immutable run output for archive/history.

Fields:
- snapshot_id: string
- run_timestamp: string
- intake_window_hours: integer
- synthesis_window_hours: integer
- sources_checked: integer
- new_headlines_count: integer
- extracted_articles_count: integer
- qualified_clusters_count: integer
- synthesis_count: integer
- headline_ids: array
- article_ids: array
- cluster_ids: array
- synthesis_ids: array
- status: string
  Allowed:
  - success
  - partial
  - failed

Example:
{
  "snapshot_id": "snap_20260326_1000",
  "run_timestamp": "2026-03-26T10:00:00Z",
  "intake_window_hours": 6,
  "synthesis_window_hours": 24,
  "sources_checked": 6,
  "new_headlines_count": 14,
  "extracted_articles_count": 10,
  "qualified_clusters_count": 4,
  "synthesis_count": 4,
  "headline_ids": ["hl_001", "hl_002"],
  "article_ids": ["art_001", "art_002"],
  "cluster_ids": ["cl_001", "cl_002"],
  "synthesis_ids": ["syn_001", "syn_002"],
  "status": "success"
}

---

SECTION 7 — LATEST OUTPUT FILES

The frontend should read from:

1. /data/latest/headlines.json
- array of headline objects

2. /data/latest/articles.json
- optional for debugging/internal use

3. /data/latest/clusters.json
- array of cluster objects joined or paired with synthesis objects

4. /data/latest/snapshots.json
- optional lightweight recent run metadata

---

SECTION 8 — ARCHIVE FILES

Required archive structure:

- /data/archive/index.json
- /data/archive/latest.json
- /data/archive/YYYY-MM-DD/run-HHMM.json

index.json example:
{
  "dates": [
    {
      "date": "2026-03-26",
      "runs": ["run-0900.json", "run-1000.json"]
    }
  ]
}

latest.json example:
{
  "date": "2026-03-26",
  "run": "run-1000.json",
  "path": "/data/archive/2026-03-26/run-1000.json"
}

run-HHMM.json example:
{
  "snapshot": { ... },
  "headlines": [ ... ],
  "articles": [ ... ],
  "clusters": [ ... ],
  "syntheses": [ ... ]
}

---

SECTION 9 — ID RULES

All IDs must be deterministic or consistently generated.

Preferred prefixes:
- src_
- hl_
- art_
- cl_
- syn_
- snap_

IDs should remain stable enough for cache reuse and audit trails.

---

SECTION 10 — STAGE 1 NON-GOALS

Do NOT add yet:
- user accounts
- comments
- ratings
- personalized feeds
- vector DB complexity
- relational DB overhead

Stage 1 is:
- ingestion
- extraction
- clustering
- synthesis
- archive
- display

---

END SPEC