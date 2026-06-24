# Undark — Case Intelligence Copilot

## What we're building

An AI workspace that helps an experienced loan recovery professional understand
any case in under a minute — without opening seventeen tabs. The user uploads
messy documents (PDFs, call logs, bank statements, notices, WhatsApp exports).
The system reads everything, reconstructs the case as a clean timeline, finds
what's missing, flags inconsistencies, and recommends the next action.

The repo is named **Undark** on purpose. The product name stays undecided
internally and "loan recovery" is not baked into the architecture — so we can
expand into adjacent "case intelligence" domains (insurance, compliance, legal
ops) later without a rewrite.

This is NOT: a dialer, a CRM, a legal encyclopedia, or a borrower-facing app.
This IS: a document-intelligence layer that augments an expert, not replaces
them — the first screen a practitioner opens before working a case.

## The user

Recovery practitioners with 10–25 years of experience. They know the law and
the field terms. They do not need software to explain which Act applies. They
need software that removes the 30-minute case-setup ritual they do every
morning across Excel, WhatsApp, and a PDF reader before they can start thinking.

## Core hypothesis (the only success metric)

If we save an experienced practitioner 20–30 minutes per case in the intake
phase, they will use this daily. Nothing else matters in V0 — not ARR, not
dashboards, not prompt count. Only time saved. If a feature doesn't help
validate this, don't build it; push back.

## Architecture (boring on purpose)

- **Next.js 16 (App Router) + React 19 + Tailwind v4.** Light, dense,
  monochrome UI — lawyers/bankers/consultants software. No gradients, no
  decorative color, typography first.
- **All AI in `lib/ai.ts`.** One `MODEL` constant (`claude-opus-4-8`) — flip
  one line to trade cost for capability.
- **All prompts in `lib/prompts.ts`.** The real moat is the few-shot examples
  from a real practitioner's transcribed workflow — paste them into the marked
  slots there.
- **Shared types in `packages/domain`.** Every layer imports from there.
- **Business logic never lives in UI components.** Components render; `lib/*`
  thinks.
- **Persistence is `lib/store.ts`** — Supabase when configured, local JSON
  otherwise. The app runs with zero cloud accounts.

The flow: upload → `extractTextFromFiles` (pdf-parse / Tesseract OCR / mammoth)
→ `extractCase` (facts) → `analyzeCase` (analyst's read) → save → workspace.

## Engineering principles

Keep it readable. Prefer maintainability over cleverness. Delete code before
adding code. Every feature needs a reason: "Does this help the user understand
the case faster?" If not, cut it.

## AI principles

Behave like an experienced analyst. Never exaggerate, never invent. Always give
evidence, reasoning, and honest confidence. If confidence is low, say so. Being
correct beats sounding intelligent. Never auto-send anything — a human always
reviews drafts.

## Security

Financial documents are sensitive. Never log document contents. Avoid storing
Aadhaar/PAN in plain text. Process server-side, not in the browser.

## What we do NOT build in V0

Auth, team collaboration, CRM, dialer, analytics dashboard, mobile app, API
integrations, borrower communication, payment collection, notifications,
settings pages, marketing site. If asked for these, push back.
