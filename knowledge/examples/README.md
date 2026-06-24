---
title: Synthetic test cases
source: Undark internal (synthetic)
url: ""
last_updated: 2026-06-24
summary: Synthetic cases used to test and evaluate prompts and retrieval. Not real data.
tags: [examples, synthetic, eval, testing]
---

# Examples

Synthetic cases for testing prompts and retrieval. **Synthetic only** — clearly
fictional, never real borrower data, never presented as real practitioner
knowledge (that lives in `practitioner/`).

## Purpose

- Regression-test prompt changes (does the analysis still pick the right forum?).
- Build the eval set that must beat few-shot before retrieval is turned on.
- Exercise edge cases: missing documents, conflicting outstanding amounts,
  cheque present (NI Act path), secured vs unsecured, amount near a threshold.

## Schema (one file per synthetic case)

```yaml
---
title:
source: synthetic
url: ""
last_updated:
summary:
tags: [example, synthetic]
---
```

Body: the raw inputs (simulated document text) plus the **expected** structured
facts and the **expected** correct next action, so a run can be scored.

## Rules

1. Mark every file `synthetic` in `source` and `tags`. No ambiguity.
2. Cover the decision boundaries that matter for sub-₹1 lakh recovery
   (thresholds where SARFAESI/DRT drop out, cheque vs no cheque, secured vs
   unsecured).
3. Keep expected answers grounded in `legal/` and `rbi/` — if an example's
   "correct" answer isn't supported by the repo, fix the repo or the example.
