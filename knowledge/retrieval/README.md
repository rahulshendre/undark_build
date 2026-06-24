---
title: Retrieval pipeline
source: Undark internal architecture
url: ""
last_updated: 2026-06-24
summary: How the knowledge repository is retrieved and fed to Claude before analysis.
tags: [retrieval, rag, architecture, pipeline]
---

# Retrieval

The core thesis: **retrieve before you reason.** The model never sees only the
user's documents. It sees the user's documents plus the relevant slice of this
repository. The knowledge compounds; the model is swappable.

## Target pipeline

```
Uploaded documents
        ↓
Document extraction            (lib/extract.ts — pdf / OCR / docx → text)
        ↓
Structured facts               (lib/ai.ts → extractCase → ExtractedCase)
        ↓
Retrieve relevant RBI rules    (rbi/)        keyed on lender type, contact stage
        ↓
Retrieve relevant legal knowledge (legal/)   keyed on amount, security, cheque?
        ↓
Retrieve relevant templates    (templates/)  keyed on chosen next action
        ↓
Retrieve similar practitioner cases (practitioner/) keyed on loan_type, state, dpd
        ↓
Provide context to Claude      (lib/retrieve.ts → formatKnowledge → {KNOWLEDGE})
        ↓
Generate analysis              (lib/ai.ts → analyzeCase)
```

## Where it plugs into the code

`lib/retrieve.ts` already defines the seam:

- `retrieve(facts: ExtractedCase) => KnowledgeSnippet[]`
- `formatKnowledge(snippets) => string` injected into the `{KNOWLEDGE}` slot of
  `CASE_ANALYSIS_PROMPT`.

In V0 `retrieve()` returns `[]` (no-op) so behavior is unchanged. This folder
documents how it should grow.

## Retrieval keys (what facts drive what we fetch)

| Fact | Drives retrieval of |
|---|---|
| `loan_amount_outstanding` | forum eligibility (SARFAESI ≥ threshold? DRT ≥ threshold? else Lok Adalat / civil / Order 37) |
| `security` | secured → SARFAESI path; unsecured → notice + suit / Lok Adalat |
| cheque present in docs | NI Act §138 path + its strict timelines |
| `loan_type`, `state`, `dpd` | similar practitioner cases; state Lok Adalat practice |
| chosen `next_action` | the matching template |
| contact stage (calls/notices so far) | RBI communication & fair-practice rules |

## Design rules

1. **Retrieve facts, not vibes.** Key retrieval on the extracted structured
   facts, not on raw document text.
2. **Cite what you retrieve.** Every snippet carries its `source`; the prompt
   instructs Claude to cite it and to invent nothing.
3. **Empty is honest.** If nothing relevant is retrieved, send nothing and let
   the model lower its confidence on legal specifics — never pad with
   irrelevant rules.
4. **Practitioner cases rank highest.** Once captured, similar real cases are
   the strongest grounding we have. They are the moat.

## TODO (build order)

- [ ] Decide chunking unit (per-rule for `rbi/`, per-file for `legal/`, per-case for `practitioner/`).
- [ ] Choose store: keyword/BM25 first (small corpus), embeddings later.
- [ ] Write an eval set in `examples/` before turning retrieval on.
- [ ] Only switch `retrieve()` off no-op once retrieval beats few-shot on the eval set.
