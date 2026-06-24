---
title: Practitioner knowledge
source: Undark internal (captured from design partners)
url: ""
last_updated: 2026-06-24
summary: Structured knowledge captured from experienced recovery practitioners. The moat.
tags: [practitioner, moat, captured-knowledge]
---

# Practitioner Knowledge

This folder stores structured knowledge captured from experienced recovery
practitioners — how they actually work a case, not what a textbook says. This is
the most valuable part of the repository and the hardest to copy.

**Empty by design.** It fills only from real capture sessions (watch a
practitioner work 8–10 anonymized cases, transcribe, structure). Never invent a
practitioner case.

## Schema (one markdown file per case)

Each captured case should contain:

```yaml
---
title:
source:        # which practitioner / session (anonymized)
url: ""
last_updated:
summary:
tags:
---
```

- **Case Summary** — borrower profile, loan type, amount, DPD, state, security.
- **Timeline** — what happened, in order.
- **Documents Used** — exactly which documents the practitioner opened.
- **What the practitioner looked at** — the specific fields/signals they checked.
- **Why** — their reasoning for looking at each.
- **Decision** — the action they chose (forum, notice, settlement target).
- **Outcome** — what actually happened (if known).
- **Lessons** — the transferable rule of thumb.

## Capture rules

1. **Anonymize.** No real borrower names, account numbers, Aadhaar, or PAN.
2. **Capture reasoning, not just the answer.** The "why they looked at X" is
   the value — that is what the model cannot derive from law alone.
3. **One case per file.** Keep them retrievable.
4. **Source every case** to its capture session.
