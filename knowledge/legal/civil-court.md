---
title: Civil suit for recovery (ordinary)
source: Code of Civil Procedure, 1908
url: "https://www.indiacode.nic.in"
last_updated: 2026-06-24
summary: The ordinary money-recovery suit; the fallback when faster tracks are unavailable.
tags: [legal, civil-suit, recovery]
note: "Framework is well-established. TODO: verify current court-fee structure and limitation period (recovery of money is generally 3 years from cause of action under the Limitation Act, 1963 — verify) against the primary source."
---

# Civil suit for recovery (ordinary)

## When used
To obtain a money **decree** for the outstanding debt when settlement/Lok Adalat
fails and faster routes (SARFAESI, DRT, Order 37, NI Act §138) do not apply. The
general-purpose fallback.

## Who files
The creditor (lender, via authorized representative/practitioner) in the civil
court with appropriate pecuniary and territorial jurisdiction.

## Eligibility
- A legally enforceable debt within the **limitation period** (generally 3 years
  from when the cause of action arose — TODO: verify under the Limitation Act, 1963).
- Proper jurisdiction (amount + place).

## Required documents
- Loan agreement / sanction letter
- Statement of account and computation of dues
- Demand / pre-litigation notice + proof of dispatch
- KYC; guarantor documents if any
- Authorization to sue

## Expected timeline
Slow relative to the other routes — ordinary suits can run for a long time. This
is the main reason small tickets prefer settlement/Lok Adalat. TODO: verify
typical durations; they vary widely by court.

## Limitations
- Slow and relatively costly — often disproportionate for sub-₹1 lakh unless used selectively.
- Outcome is a decree that must then be **executed** to actually recover.

## Typical use cases
- Unsecured debt with no cheque and no clean written instrument for Order 37.
- Where the borrower contests and a contested adjudication is unavoidable.

## Decision tree
```
Faster route available?
  ├─ Secured + eligible            → SARFAESI (legal/sarfaesi.md)
  ├─ Claim above DRT threshold     → DRT (legal/drt.md)
  ├─ Cheque bounced                → NI Act §138
  ├─ Fixed sum on PN/written contract → Order 37 summary suit
  └─ none of the above             → ordinary civil suit (this file)
```

## Common mistakes
- Filing after the limitation period has expired.
- Suing for an unreconciled amount.
- Treating the decree as the end — without execution there is no money.
- Choosing a slow ordinary suit when Order 37 / NI Act would have been faster.
