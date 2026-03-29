"}
SYSTEM: Chronos Sentinel – Prompt Versioning Protocol

OBJECTIVE:
Ensure consistency, traceability, and controlled evolution of all LLM prompts.

---

SECTION 1 — VERSION FORMAT

Each prompt must include:

VERSION: v1.0
DATE: YYYY-MM-DD
PURPOSE: (short description)

---

SECTION 2 — FILE STRUCTURE

Store prompts in:

/docs/prompts/

Example:

/docs/prompts/synthesis-v1.0.md
/docs/prompts/synthesis-v1.1.md

---

SECTION 3 — CHANGE RULES

A new version MUST be created when:
- output structure changes
- constraints are modified
- token limits adjusted
- logic behavior altered

DO NOT overwrite existing prompts.

---

SECTION 4 — CHANGE LOG

Each prompt must include:

CHANGELOG:

v1.1:
- Reduced word limit
- Improved difference detection

v1.0:
- Initial version

---

SECTION 5 — ACTIVE VERSION CONTROL

System must reference ONLY one active prompt:

Example:
active_prompt = synthesis-v1.1.md

---

SECTION 6 — ROLLBACK CAPABILITY

System must allow:
- reverting to previous prompt version
- testing outputs across versions

---

SECTION 7 — TESTING RULE

Before promoting new version:
- test on at least 3 clusters
- compare outputs with previous version

---

SECTION 8 — TOKEN DISCIPLINE

Each version must aim to:
- reduce tokens
- improve clarity
- maintain structure

---

END PROTOC