# Undark — Session Chatlog, Architecture Notes & Production Readiness Audit

> Single source document capturing the full working session: what was discussed,
> what was built, what the codebase actually contains (verified, not remembered),
> the Staff-Engineer production audit, and the decisions/open threads going
> forward.
>
> Generated: 2026-06-27. Repo state at audit time: commit `0becb19`.
> Source of truth = the repository, not chat memory.

---

## 0. What Undark is (one paragraph)

An AI **Case Intelligence Copilot** for Indian small-ticket (**< ₹1 lakh**) loan
recovery. A practitioner uploads a messy pile of documents (PDFs, call logs, bank
statements, notices, WhatsApp exports). Undark reads everything, reconstructs the
case as a clean timeline, finds what's missing, flags inconsistencies and RBI
compliance issues, and recommends the next action (forum + settlement range +
honest confidence) — then drafts an editable, compliant legal notice. The single
success metric: **save an experienced practitioner 20–30 minutes of intake per
case.** Nothing else matters in V0.

- **NOT:** a dialer, CRM, legal encyclopedia, or borrower-facing app.
- **IS:** a document-intelligence layer that augments an expert, not replaces them.
- Repo named **Undark** on purpose — product name undecided, "loan recovery" not
  baked into architecture so it can expand into adjacent case-intelligence domains
  (insurance, compliance, legal ops) later without a rewrite.

**The user:** recovery practitioners with 10–25 years experience. They know the
law and field terms. They do not need software to explain which Act applies. They
need software that removes the 30-minute morning case-setup ritual across Excel,
WhatsApp, and a PDF reader.

---

## 1. Architecture (boring on purpose)

- **Next.js 16 (App Router, Turbopack) + React 19 + Tailwind v4.** Light, dense,
  monochrome UI. No gradients, no decorative color, typography first.
- **All AI in `lib/ai.ts`.** One `MODEL` constant (`claude-opus-4-8`) — flip one
  line to trade cost for capability. Adaptive thinking.
- **All prompts in `lib/prompts.ts`.** The real moat is the few-shot examples from
  a real practitioner's transcribed workflow (the "uncle session") — pasted into
  the marked slots there.
- **Shared types in `packages/domain`.** Every layer imports from there.
- **Business logic never lives in UI components.** Components render; `lib/*` thinks.
- **Persistence is `lib/store.ts`** — Supabase when configured, local JSON otherwise.
  Runs with zero cloud accounts.

**The flow:** upload → `extractTextFromFiles` (pdf-parse / Tesseract OCR / mammoth)
→ `extractCase` (facts) → `analyzeCase` (analyst's read) → save → workspace.

### Engineering principles
Keep it readable. Maintainability over cleverness. Delete code before adding code.
Every feature needs a reason: "Does this help the user understand the case faster?"
If not, cut it.

### AI principles
Behave like an experienced analyst. Never exaggerate, never invent. Always give
evidence, reasoning, honest confidence. If confidence is low, say so. Being correct
beats sounding intelligent. Never auto-send anything — a human always reviews drafts.

### Security
Financial documents are sensitive. Never log document contents. Avoid storing
Aadhaar/PAN in plain text. Process server-side, not in the browser.

### What we do NOT build in V0
Auth, team collaboration, CRM, dialer, analytics dashboard, mobile app, API
integrations, borrower communication, payment collection, notifications, settings
pages, marketing site.

---

## 2. Repository map (verified)

```
app/
  api/notice/route.ts       — POST: draft a notice for a saved case
  api/process/route.ts      — POST: upload → extract → analyze → save
  case/[id]/page.tsx        — case workspace (server-rendered)
  knowledge/page.tsx        — dev-only Knowledge Explorer (noindex)
  knowledge/knowledge-explorer.tsx
  page.tsx                  — upload home
  layout.tsx, globals.css
components/
  case-summary, timeline, missing-docs, risks, compliance,
  next-action, notice-generator, upload-zone
  ui/ (badge, button, section)
lib/
  ai.ts                     — MODEL constant + extractCase / analyzeCase / draftNotice
  extract.ts                — pdf-parse / tesseract.js / mammoth / raw text
  prompts.ts                — all prompts; FEW_SHOT slots (currently EMPTY)
  retrieve.ts               — retrieve() + formatKnowledge()
  store.ts                  — Supabase or local JSON
  supabase.ts               — optional client (null when unconfigured)
  utils.ts
  knowledge/
    corpus.ts               — pure deterministic scoring (buildQuery/scoreChunk/rankChunks)
    load.ts                 — disk loader; SKIPS generated/ + chunks/
    explorer.ts             — read-only data layer for /knowledge
    retrieve.test.ts        — 2 retrieval assertions (the ONLY runnable test)
packages/domain/index.ts    — shared types (ExtractedCase, CaseAnalysis, Case, …)
knowledge/
  rbi/ (5 md)               — curated, LIVE in retrieval
  legal/ (7 md)             — curated, LIVE
  templates/ (6 md)         — curated, LIVE
  glossary/glossary.json    — 37 terms, LIVE
  statistics/ (5 json)      — present, NOT wired into retrieval
  practitioner/README.md    — EMPTY body (the moat, by design)
  generated/ (11 md)        — PDF→md output, NOT wired into retrieval
  chunks/ (11 json)         — normalized chunks (1377), NOT wired into retrieval
  sources/                  — raw source PDFs/HTML + .summary.md
tools/
  ingest/ingest.py          — offline PDF → clean Markdown (PyMuPDF + Tesseract)
  normalize/normalize.py    — deterministic Markdown → structured JSON chunks
tests/fixtures/             — case_001..004 with expected_output.json (NO HARNESS reads them)
```

---

## 3. Session chatlog (chronological, this session)

This is a faithful log of the working session, condensed but complete in intent.

### Turn 1 — Technical summary request
**User:** "give me a technical summary please, don't make it too long, but make it
very very good, 7 points should do the job, also a whole summary as well."

**Assistant:** Produced a 7-point technical summary of the knowledge/ingestion work
plus a whole summary. Key points captured:
1. Two-stage offline pipeline: `ingest.py` (PDF→Markdown) + `normalize.py`
   (Markdown→JSON chunks). Deterministic, no AI/RAG/embeddings/LangChain.
2. Ingest = faithful, not summarized. OCRs embedded images (skips <200px icons),
   strips repeated headers/footers/page numbers, detects headings by font-size,
   preserves tables/numbering. Front matter keeps provenance.
3. Normalize = atomic legal chunks. 300–800 words, never splits numbered legal
   procedures, deterministic category detection, importance 1–5.
4. New 1377-chunk corpus is built but **NOT wired into `retrieve()`** —
   `load.ts` skips `generated/` + `chunks/`. Zero behavior change shipped.
5. Schema mismatch is the migration blocker: normalizer chunks
   (`category:"Legal"`, no `tags`, empty `section`) ≠ live `corpus.ts` Chunk
   (`category:"legal"`, weighted `tags`, forum bonus on lowercase).
6. Dev-only Knowledge Explorer at `/knowledge` reuses the real
   `buildQuery → rankChunks → scoreChunk` to show "why did Undark recommend X?".
7. Architecture review concluded: **do NOT migrate** the generated corpus into
   retrieval yet. Path forward is a weighted hybrid gated on an eval set.

### Turn 2 — Production readiness audit (the main event)
**User:** "I want you to stop implementing features. Your job now is to act as a
Staff Engineer performing a production readiness audit of the entire Undark
codebase. Assume NOTHING. Do NOT trust previous chat messages. Do NOT trust your
own memory. Only trust the current repository… I want brutal honesty." Followed by
a 6-step spec: (1) read entire repo, (2) verify every subsystem with
✅/🟡/❌, (3) compare against the vision, (4) list material gaps with
why/effort/priority, (5) score 7 axes /10, (6) answer 3 demo-day questions.

**Assistant:** Read the repository directly (not memory). Ran `npm run
test:retrieval` (passed) and `npm run build` (clean). Verified the generated chunk
schema by inspecting a real chunk file. Produced the full audit (reproduced in
§5–§9 below).

### Turn 3 — This document
**User:** "make a .md file, put everything we have talked in the chat in it okay,
everything, so a chatlog and it also should contain a lot more stuff which is
needed, go. and after you are done, close localhost 3k and commit and push."

**Assistant:** This file. Then kill the dev server on port 3000, commit, push.

---

## 4. Verification commands run during the audit (and results)

| Command | Result |
|---|---|
| `git log --oneline` | 6 commits, HEAD = `0becb19`. |
| `npm run test:retrieval` | **PASS** — case1 + case2. The only runnable test. |
| `npm run build` | **Clean.** Compiled in ~1.6s, TS passed, 6 routes. |
| `grep -rln "fixtures\|expected_output" lib app tools tests` | **No matches** — fixtures are never read by any harness. |
| Inspect `knowledge/chunks/SARFAESI Act, 2002.json` | Confirms `section:""`, `category:"Legal"`, no `tags` → migration blocker is real. |
| `grep -rn NoticeGenerator` | Wired via `next-action.tsx` → `notice-generator.tsx`. |
| `cat knowledge/practitioner/README.md` | Body empty. "Empty by design." |

Build routes:
```
○ /                  (static)
○ /_not-found        (static)
ƒ /api/notice        (dynamic)
ƒ /api/process       (dynamic)
ƒ /case/[id]         (dynamic)
ƒ /knowledge         (dynamic)
```

---

## 5. Subsystem verification (✅ COMPLETE · 🟡 PARTIAL · ❌ NOT IMPLEMENTED)

### Core Product
| Subsystem | Status | Note |
|---|---|---|
| Upload flow | ✅ | drag/drop, multi-file, dedupe, error+busy states |
| Document extraction | ✅ | pdf-parse, mammoth, raw text, `[FILE: name]` boundaries |
| OCR | 🟡 | tesseract.js, **English-only** (`"eng"` hardcoded) — PRD wants Hindi/English |
| Case extraction | ✅ | `extractCase()` → structured `ExtractedCase` |
| Timeline generation | ✅ | from `analyzeCase`, rendered by `timeline.tsx` |
| Missing-document detection | ✅ | `missing_docs[]` w/ `blocking` + `why_needed` |
| Risk detection | ✅ | `risks[]` w/ severity + evidence |
| Compliance detection | ✅ | `compliance_flags[]`, kept distinct from risks |
| Recommendation engine | 🟡 | structurally complete; reasoning is 100% zero-shot, no eval |
| Notice generation | ✅ | editable, .txt/.docx/clipboard, human-review warning — best surface |

### Knowledge
| Subsystem | Status | Note |
|---|---|---|
| Knowledge corpus (curated, live) | ✅ | rbi/legal/templates/glossary used by retrieval |
| RBI documents | ✅ | 5 curated md |
| Legal Acts | ✅ | 7 curated forum guides |
| Statistics | ✅ | 5 JSON present, **not wired into retrieval** |
| Templates | ✅ | 6 notice templates |
| Glossary | ✅ | 37 terms, retrievable |
| Practitioner knowledge | ❌ | README only, body empty — the declared moat does not exist yet |
| Knowledge ingestion (PDF→md) | ✅ | `tools/ingest/ingest.py`, ran on 11 docs |
| Knowledge normalization | ✅ | `tools/normalize/normalize.py` → 1377 chunks |
| Retrieval | ✅ curated / 🟡 generated | generated 1377 chunks NOT used by live retrieval |
| Retrieval scoring | ✅ | deterministic, category-aware, tests pass |
| Knowledge Explorer | ✅ | `/knowledge` dev tool, read-only, noindex |

### AI
| Subsystem | Status | Note |
|---|---|---|
| Prompt architecture | 🟡 | clean + centralized, but **few-shot slots EMPTY** → runs zero-shot |
| JSON parsing | 🟡 | tolerant `parseJSON`, **no schema validation** (no zod/strict output) |
| Confidence scoring | 🟡 | model self-reports; not calibrated/derived |
| Citation support | 🟡 | prompt instructs citing; nothing enforces/checks |
| Evidence grounding | 🟡 | `evidence` is free text, not linked to a document span |
| Hallucination safeguards | 🟡 | prompt-level only, no programmatic guard on numbers/sections |

### UI
| Subsystem | Status | Note |
|---|---|---|
| Upload page | ✅ | `app/page.tsx` + upload-zone |
| Workspace (case page) | ✅ | server-rendered, clean sections |
| Timeline | ✅ | |
| Risks | ✅ | |
| Compliance | ✅ | |
| Notice editor | ✅ | modal, editable, export |
| Overall UX quality | 🟡 | tasteful; no progress feedback on 30–90s call, no case list |

### Engineering
| Subsystem | Status | Note |
|---|---|---|
| Types | ✅ | `packages/domain` single vocabulary, strict TS |
| Testing | 🟡→❌ | only retrieval test; **fixtures 001–004 unused**, no pipeline test |
| Build | ✅ | `next build` clean |
| Error handling | ✅ | typed 400/404/500, per-file catch, UI error states |
| Local persistence | ✅ | `.data/cases/*.json`, zero-config |
| Supabase support | 🟡 | code path complete, **unverified against live instance** |
| Environment variables | ✅ | `.env.example` documents all 4 |
| Repository structure | ✅ | matches CLAUDE.md exactly |

---

## 6. Did we build the stated vision?

**Vision:** "An AI Case Intelligence Copilot for sub-₹1 lakh legal loan recovery"
that saves a practitioner 20–30 min of intake per case.

**What exists:** a competent generic case-intelligence shell — upload → extract →
analyze → timeline/risks/compliance/next-action → notice. The plumbing matches the
vision. On three axes it is **not yet** the stated product:

1. **Not yet "for the experienced practitioner."** Output is zero-shot Claude. No
   captured practitioner reasoning, no few-shot. The differentiator is specified,
   scaffolded, and **empty**.
2. **Not yet "sub-₹1 lakh specific."** Almost no small-ticket-specific logic — only
   the `DRT_THRESHOLD` heuristic. The "<₹1 lakh" focus lives in prompt prose, not
   in behavior.
3. **The time-saved hypothesis is untestable as built.** No eval harness, no fixture
   runner, no measurement. The one metric that matters cannot currently be shown.

**Honest summary:** ~75% of the *engine*, ~10% of the *moat*. A strong skeleton
wearing the right clothes — not yet the expert copilot. Nothing faked or off-track;
it is front-loaded on infrastructure and empty where defensibility was meant to be.

---

## 7. Material gaps (why · effort · priority)

**P0 — Practitioner few-shot / captured knowledge is empty → output isn't expert-grade.**
The entire moat and the "saves an expert time" claim. Without it, a thin wrapper
over Claude. *Effort:* low-code/high-human — 1 capture session + 1–2 days
structuring into `practitioner/` and the two few-shot slots.

**P0 — No automated validation of AI output (fixtures unused).**
4 ground-truth fixtures exist and run none. Cannot detect regressions, prove
accuracy, or tune prompts safely. *Effort:* 1–2 days — `tests/evaluation/run.ts`
that runs extract/analyze over fixtures and diffs key fields.

**P0/P1 — Hallucination/grounding is prompt-only, no enforcement.**
Product gives forums, section numbers, ₹ ranges to pros who act on them. Nothing
checks cited titles/sections exist in retrieved material. *Effort:* 2–3 days —
validate citations against retrieved chunks; flag ungrounded numbers/sections.

**P1 — No progress feedback on a 30–90s blocking request.**
Core action is a long opaque spinner; feels broken, risks abandonment. *Effort:*
1–2 days — stream stages (reading → extracting → analyzing) via SSE/staged status.

**P1 — No case list / retrieval of past cases.**
Can create a case but only reopen via remembered URL. *Effort:* 0.5–1 day —
`getCases()` + a list on `/`.

**P2 — Generated corpus (1377 chunks) is dead weight to live retrieval.**
Schema mismatch (capitalized `Legal`, empty `section`, no `tags`). Either wire via
adapter or it's misleading inventory. *Effort:* 2–3 days adapter + eval gate. Do
NOT do before P0s.

**P2 — OCR is English-only.**
PRD names Hindi/English mix; real scans will be Devanagari. *Effort:* 0.5 day —
add `hin+eng`.

---

## 8. Scores (/10)

| Axis | Score | One-line |
|---|---|---|
| Engineering | 8 | Clean, disciplined, builds, well-typed; near-zero pipeline test coverage. |
| Product | 5 | Right shape, differentiating layer empty; generic shell today. |
| UX | 6 | Tasteful, on-brief; hurt by long opaque processing + no case list. |
| Trustworthiness | 4 | Grounding prompt-only, citations unenforced, no eval. |
| Knowledge | 6 | Strong curated corpus + glossary; moat empty, generated corpus unused. |
| Demo readiness | 7 | Scripted single-case demo lands well. |
| **Overall** | **6** | Solid skeleton, empty moat, untested brain. |

---

## 9. Demo-day answers

**1. What would impress people?**
The end-to-end flow: drop a messy pile → ~60s later a clean timeline,
missing-docs, risks, RBI compliance flags, and a specific next-action (forum +
settlement range + honest confidence) → one-click editable, compliant notice as
.docx. The UI taste and structured discipline (facts vs. analysis, risks vs.
compliance) read as a real product. The `/knowledge` retrieval-debug view ("why
did Undark recommend Lok Adalat?") is a credibility flex.

**2. What would they criticize?**
- "How do I know it's right?" — no grounding enforcement, no eval, self-reported
  confidence.
- "This is just Claude with a prompt." — with empty few-shot, largely fair today.
- The 60–90s opaque spinner.
- "Where are my other cases?" — no list.
- A domain expert spots generalist analysis, not battle-tested practitioner judgment.

**3. One more week before Demo Day — what to build?**
1. **Run the uncle session and load the few-shot slots** (Mon–Tue). Highest
   leverage — converts "Claude wrapper" into "expert copilot", already scaffolded.
2. **Build the fixture eval runner** (Tue–Wed) over `case_001–004` — tune prompts
   safely and show measured accuracy on stage.
3. **Citation/number grounding validation** (Wed–Thu) — reject/flag any section or
   ₹ figure not in facts-or-retrieved-knowledge. Kills "how do I trust it?".
4. **Stream processing stages + case list on `/`** (Fri). Feels like a daily tool.

Do **not** spend the week wiring the generated corpus — a P2 trap that adds text
volume, not trust. The bottleneck is trust and moat, not corpus size.

---

## 10. Known stale / sharp edges (for the next engineer)

- **`lib/ai.ts` comment is stale.** It says "V0 returns nothing, so KNOWLEDGE is
  empty" — but `retrieve.ts` *does* return curated chunks now. Comment, not bug.
- **Two corpora exist.** Curated `knowledge/{rbi,legal,templates,glossary}` is LIVE.
  Generated `knowledge/{generated,chunks}` is built but quarantined by
  `load.ts isSkippedDir`. Don't assume the 1377 chunks affect recommendations.
- **`statistics/` is not wired into retrieval** — present but unused by scoring.
- **Fixtures are inert.** `tests/fixtures/case_00x/expected_output.json` are not
  read by anything. They are intent, not coverage.
- **Secrets:** `.env.local` holds a live `ANTHROPIC_API_KEY`. Gitignored. Never
  commit. Always secret-scan staged diffs (`grep -iE 'sk-ant|ANTHROPIC_API_KEY'`)
  before committing.
- **Raw PDFs** under `knowledge_v2/` (untracked) are deliberately not committed —
  large binaries; provenance preserved via `source_pdf` front matter.

---

## 11. Decisions on record

- **Do NOT migrate the generated corpus into live retrieval yet.** Reason: schema
  mismatch makes a naive migration inert/broken; goal is recommendation quality and
  trustworthiness, not retrieved text volume. Migrate only behind a weighted-hybrid
  adapter gated on the fixture eval set.
- **Retrieval stays deterministic.** No embeddings, no vector DB, no LangChain, no
  external APIs. Same facts → same chunks, every time.
- **Never auto-send.** Notices are always human-reviewed drafts.

---

*End of document.*
