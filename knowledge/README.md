# Undark Knowledge Repository

This folder is the intellectual property of Undark. The language model is
replaceable; this repository is not. Every recommendation Undark generates
should eventually be **grounded in this repository** via retrieval, not invented
by the model.

## What this is — and is not

This is an **operational** knowledge base for **Indian small-ticket loan
recovery** (primarily loans below ₹1 lakh). It exists to help the AI understand
real recovery workflows — which forum applies, what a notice must contain, what
RBI permits, what documents a step needs.

It is **not** a legal encyclopedia. We capture only what changes a
practitioner's decision. If a fact does not affect a recovery action, it does
not belong here.

## Who it serves

Loan recovery practitioners, collection agencies, legal recovery experts, and
NBFC collection managers working sub-₹1 lakh recovery.

## How it is organized

| Folder | Holds |
|---|---|
| `glossary/` | Recovery terminology (`glossary.json`) — definition, importance, related terms. |
| `rbi/` | RBI rules, distilled to operational form (rule → why → implication → evidence → penalty). |
| `legal/` | Recovery forums & procedures (Lok Adalat, civil suit, Order 37, SARFAESI, DRT, NI Act, arbitration). |
| `templates/` | Notice and letter templates — placeholders only, never real borrower data. |
| `statistics/` | Publicly-sourced figures as structured JSON (year, source, metric, value, notes). |
| `practitioner/` | Structured knowledge captured from real practitioners (the moat). Empty until captured. |
| `examples/` | Synthetic cases for testing prompts. |
| `retrieval/` | How retrieval should work — the pipeline that feeds this repo into Claude. |

## Hard rules

1. **Every document states its source.** No source → not in this repo.
2. **Never hallucinate.** Do not invent RBI guidelines, legal thresholds,
   citations, or statistics. When uncertain, write a `TODO:` with the
   authoritative source to check — never a made-up value.
3. **Operational only.** Distill rules into what a practitioner does, not the
   full text of a circular.
4. **Metadata on everything.** Every markdown file begins with the frontmatter
   block below. JSON files carry an equivalent `_meta` object.

## Required frontmatter (every markdown file)

```yaml
---
title:
source:
url:
last_updated:
summary:
tags:
---
```

## Verification status

Substantive frameworks here (which forum, what a notice needs, RBI conduct
rules) are well-established. **Exact citations — circular numbers, section
numbers, monetary thresholds, dates, and all statistics — are marked
`TODO: verify` where they were not confirmed against the primary source at time
of writing.** Treat any unverified number as provisional until checked against
the cited authority (rbi.org.in, indiacode.nic.in, nalsa.gov.in, the issuing
body's report).
