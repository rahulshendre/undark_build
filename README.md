# Undark

Case Intelligence Copilot for loan recovery. Upload a messy case file (PDFs,
images, WhatsApp exports, bank statements); Undark reconstructs it into a clean
workspace — summary, timeline, missing documents, risks, and a recommended next
action — and drafts an editable notice. The goal: understand a case in under a
minute instead of thirty.

## Run it

```bash
cp .env.example .env.local      # add ANTHROPIC_API_KEY (only required var)
npm run dev                     # http://localhost:3000
```

That's it. With no Supabase configured, cases persist to local JSON under
`.data/cases/`. Add the two `NEXT_PUBLIC_SUPABASE_*` vars to persist to Postgres
instead (table DDL is in `.env.example`).

## How it works

```
upload  →  /api/process  →  extract text  →  extractCase  →  analyzeCase  →  save
(screen 1)                 (pdf-parse,       (facts)         (analyst read)   ↓
                            tesseract, mammoth)                          /case/[id]
                                                                         (screen 2)
```

- `lib/ai.ts` — Anthropic calls. **One `MODEL` constant** (`claude-opus-4-8`);
  flip it for `claude-sonnet-4-6` or `claude-haiku-4-5` to cut per-case cost.
- `lib/prompts.ts` — every prompt, in one place. The few-shot slots are where
  the real practitioner workflow goes (the moat).
- `packages/domain` — shared types.
- `lib/store.ts` / `lib/supabase.ts` — persistence with local fallback.

## Knowledge layer (the moat)

Undark is built around a structured knowledge repository (`knowledge/`) that
**grounds the AI's reasoning rather than relying solely on the language model** —
the model is replaceable, this repository is not. It is an operational knowledge
base for Indian small-ticket loan recovery: glossary, distilled RBI rules,
recovery forums (Lok Adalat / SARFAESI / DRT / NI Act §138 / Order 37 / civil /
arbitration), notice templates, sourced statistics, captured practitioner cases,
and synthetic test cases. Every document carries a source; unverified citations
and numbers are marked `TODO`, never fabricated.

Target retrieval flow: Documents → Extraction → structured facts → retrieve
relevant RBI rules + legal knowledge + templates + similar practitioner cases →
context to Claude → analysis. The seam is `lib/retrieve.ts` (the `{KNOWLEDGE}`
slot in the analysis prompt). V0 returns nothing, so the model runs without it
until the corpus and retrieval are wired. See `knowledge/README.md`.

## Layout

```
app/
  page.tsx               upload screen
  case/[id]/page.tsx     case workspace
  api/process/route.ts   upload -> AI -> save
  api/notice/route.ts    draft a notice
components/               UI (rendering only)
lib/                      ai, prompts, extract, store, supabase, utils
packages/domain/         shared types
```

## V0 deviations from the original PRD

- **Direct multipart upload** instead of Uploadthing — Uploadthing needs a
  cloud token to run; direct upload lets the local V0 run with zero accounts.
  Swap in Uploadthing when this goes multi-user.
- **pdf-parse v2** (`PDFParse` class API) for PDF text. Tesseract.js handles
  scanned images; `mammoth` handles `.docx`.

## Not in V0

No auth, CRM, dialer, dashboards, mobile app, integrations, or borrower side.
A human reviews every draft — Undark never sends anything.
