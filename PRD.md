# Undark — PRD (V0, build-ready)

**Status:** building. **Metric that matters:** does an experienced practitioner
understand a case meaningfully faster than before? Target: 30 min → under 5.

## Problem

Recovery practitioners reconstruct each case by hand from scattered sources —
loan agreements, bank statements, WhatsApp chats, notices, call notes, KYC,
Excel trackers. They spend 30–45 minutes searching for information before they
can think about the case. Undark removes that ritual.

## Users

Experienced recovery practitioners (10–25 yrs) at banks, NBFCs, MFIs, or
agencies, working small-ticket (sub-₹1 lakh) legal recovery — the underserved
supply side the big lender-facing platforms ignore. Assume the user is smarter
than the software.

## V0 scope (only this)

1. **Upload** — multiple files at once: PDF, images, Word, WhatsApp exports,
   text/CSV.
2. **Document intelligence** — read every file, extract structured facts, find
   relationships and chronology. Never hallucinate; say so when uncertain.
3. **Case workspace** (the product), one screen:
   - **Summary** — borrower, outstanding, loan type, DPD, state, security,
     lender, last payment, contact history.
   - **Timeline** — chronological events stitched across all documents. The
     heart of the product.
   - **Missing information** — what's absent and why it matters.
   - **Risks** — inconsistencies (different amounts, unsigned agreement,
     partial statements).
   - **Recommended next action** — one action, with forum, why, evidence,
     settlement range, and honest confidence.
4. **Draft generator** — editable notice (.docx / .txt). Human reviews before
   use. Never auto-send.

## Explicitly NOT built

CRM, dialer, analytics dashboard, borrower portal, mobile app, notifications,
team collaboration, workflow automation, integrations, payment collection, AI
voice, agent assignment, marketing site, settings, feature flags.

## Tech

Next.js 16 + React 19 + Tailwind v4. Claude via the Anthropic SDK (`MODEL` in
`lib/ai.ts`). pdf-parse v2 + Tesseract.js + mammoth for extraction. `docx` for
notice export. Supabase (Postgres + Storage) with local-JSON fallback so V0
runs with no cloud accounts. Prompts in `lib/prompts.ts`; types in
`packages/domain`.

## The single next step

Run a real "uncle session": watch a practitioner work 8–10 anonymized cases,
transcribe it, and turn that into the few-shot examples in `lib/prompts.ts`.
Then measure one number: did Undark save 20+ minutes per case? If yes, get 4
more practitioners. If no, fix the one thing that still hurt.
