---
title: SARFAESI Act, 2002
source: Securitisation and Reconstruction of Financial Assets and Enforcement of Security Interest Act, 2002
url: "https://www.indiacode.nic.in"
last_updated: 2026-06-24
summary: Secured-creditor enforcement without court; usually UNAVAILABLE for sub-₹1 lakh unsecured recovery.
tags: [legal, sarfaesi, secured, enforcement]
note: "Framework is well-established. TODO: verify the current minimum loan amount, the secured-asset/notification conditions, NBFC applicability thresholds, and the §13(2)/§13(4) day counts against the bare Act and RBI notifications."
---

# SARFAESI Act, 2002

## When used
When a **secured** creditor wants to enforce security (take possession and sell
the collateral) **without going to court**, after a statutory demand notice.

## Who files / acts
A secured creditor eligible under the Act (banks and notified NBFCs/FIs) acting
on its own — no court order is needed to initiate.

## Eligibility (why it usually does NOT fit small-ticket)
- There must be a **secured asset** (mortgage/hypothecation/charge). Most
  small-ticket and MFI loans are **unsecured** → SARFAESI does not apply.
- A **minimum loan amount** applies; small tickets fall below it. TODO: verify
  the current minimum (historically cited around ₹1 lakh) and any NBFC-specific
  asset-size thresholds.
- The lender must be a notified/eligible entity.

## Required documents
- Security/mortgage/hypothecation documents creating the charge
- Loan agreement and statement of account
- §13(2) demand notice + proof of service
- Records of the secured asset

## Expected timeline
- §13(2) **demand notice** giving the borrower **60 days** to pay.
- On default after 60 days, §13(4) measures (possession/sale).
- Borrower can challenge before the DRT. TODO: verify the exact counts and the challenge route.

## Limitations
- **Secured assets only** — no security, no SARFAESI.
- Below the minimum amount it is unavailable.
- Procedural rigor; errors in the notice/possession steps are challengeable.

## Typical use cases
- Secured loans (property, sometimes vehicles) above the threshold — i.e.
  generally **outside** Undark's core sub-₹1 lakh unsecured segment.

## Decision tree
```
Is the loan secured AND above the SARFAESI minimum AND lender eligible?
  ├─ yes → SARFAESI enforcement (§13(2) notice → §13(4))
  └─ no  → SARFAESI not available → Lok Adalat / NI Act / Order 37 / civil suit
```

## Common mistakes
- Attempting SARFAESI on an unsecured or sub-threshold loan (it simply does not apply).
- Defective §13(2) notice or possession steps (challengeable before DRT).

## Operational takeaway for Undark
For the core segment, the useful output is usually the **negative**: "SARFAESI
is not available here (unsecured / below threshold), so the realistic routes are
Lok Adalat, NI Act §138, Order 37, or an ordinary suit." Stating that clearly
saves the practitioner time.
