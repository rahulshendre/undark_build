---
title: Knowledge sources index
source: Undark corpus
url: ""
last_updated: 2026-06-24
summary: Every authoritative source document collected for the Undark knowledge corpus, with its status and confidence.
tags: [index, sources, corpus]
---

# Knowledge Sources — Index

Authoritative, publicly-sourced documents collected for retrieval. Each entry
lists the saved original, its companion summary, the official URL, and status.
Originals are never modified. Unverified items carry `TODO_VERIFY` in their
summaries.

Status legend: **downloaded** = original artifact saved · **page-saved** =
official landing/notification HTML saved (true PDF pending) · **summarized** =
companion `.summary.md` written · **extracted** = figures parsed into
`statistics/`.

## RBI (priority 1)

| Document | Date | Reference | Original | Summary | Status | Confidence |
|---|---|---|---|---|---|---|
| Outsourcing of Financial Services — Recovery Agents | 2022-08-12 | RBI/2022-23/108 | `rbi/recovery_agents_outsourcing_2022.source.html` | ✓ | downloaded · summarized | high |
| RBI (Digital Lending) Directions, 2025 | 2025-05-08 | RBI/2025-26/36 | `rbi/digital_lending_directions_2025.source.html` | ✓ | downloaded · summarized | high |
| NBFC Scale Based Regulation MD (Fair Practices Code) | 2023-10-19 | RBI/DoR/2023-24/106 | `rbi/nbfc_scale_based_regulation_2023.source.html` | ✓ | page-saved · summarized | medium |

> RBI canonical PDFs on `rbidocs.rbi.org.in` block non-browser download — the SBR
> Master Direction PDF needs a manual save (see its summary's `TODO_VERIFY`).

## NALSA / Lok Adalat (priority 2)

| Document | Date | Original | Summary | Status | Confidence |
|---|---|---|---|---|---|
| National Lok Adalat disposal (all cases) | 2026-03-14 | `nalsa/national_lok_adalat_2026-03-14.pdf` | ✓ | downloaded · summarized · extracted | high |

> Grand-total figures extracted into `statistics/lok-adalat.json` (arithmetic-verified).
> Earlier dates (13.12.2025, 13.09.2025) have known URLs — pending.

## MFIN (priority 3)

| Document | Date | Original | Summary | Status | Confidence |
|---|---|---|---|---|---|
| MFIN Micrometer Synopsis, 48th issue (Q3 FY23-24) | 2023-12-31 | `mfin/micrometer_synopsis_q3_fy23-24.pdf` | ✓ | downloaded · summarized · extracted | high (Dec-23 portfolio) |

> Per-lender Dec-2023 portfolio extracted into `statistics/mfi.json`. Latest Q4-FY26
> headline held at medium confidence (news) pending the primary 57th Micrometer.

## RBI Financial Stability Reports (priority 4) — pending
## IBBI (priority 5) — pending
## Legal notice templates (priority 6) — see `knowledge/templates/` (synthetic, not sourced)
## Public court process documentation (priority 7) — pending

---

## Collection log / next targets
- [ ] RBI SBR Master Direction — manual PDF download (rbidocs blocks automation).
- [ ] RBI KFS circular DOR.STR.REC.13/13.03.00/2024-25 (referenced by Digital Lending 2025).
- [ ] NALSA — earlier National Lok Adalat dates for a time series.
- [ ] RBI "Report on Trend and Progress of Banking in India" — recovery-rate-by-channel table (feeds `statistics/drt.json`, `sarfaesi.json`, `industry.json`).
- [ ] RBI Financial Stability Report — GNPA figures.
- [ ] IBBI quarterly newsletter — IBC recovery data.
- [ ] MFIN Micrometer 57th issue (primary) — refresh Q4-FY26 figures.
