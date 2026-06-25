# Undark knowledge normalizer

Converts clean Markdown documents into structured **knowledge chunks** that the
retrieval engine can use more effectively.

Fully deterministic. **No AI, no embeddings, no vector database, no LangChain,
no external APIs.** This only prepares cleaner knowledge for *future* retrieval —
it does **not** change application behavior. The retrieval engine keeps working
exactly as before until someone wires these chunks in.

## Pipeline

```
knowledge/generated/*.md   →   normalize.py   →   knowledge/chunks/<filename>.json
```

One input document becomes one JSON file containing an **array of chunks**.

### Steps

1. **Parse front matter** (`title`, `source_pdf`) if present.
2. **Split on headings** (`#`, `##`, `###`, …). Each chunk carries a `section`
   breadcrumb of its heading hierarchy (e.g. `Eligibility > Required documents`).
3. **Pack to ~300–800 words.** Small sections are merged with following
   siblings; large sections are split on paragraph boundaries. Packing never
   crosses a top-level heading boundary.
4. **Never split numbered legal procedures.** A run of consecutive numbered /
   lettered paragraphs (`1.`, `(a)`, `(iv)`, `13A.`) is treated as one atomic
   unit and kept whole, even if it pushes a chunk past 800 words.
5. **Extract keywords** deterministically from:
   - heading words (minus stopwords),
   - repeated legal terms (appearing ≥2× in the chunk),
   - detected **forum references**.
6. **Detect category and importance** (see below).

## Run

```bash
# normalize every generated markdown
python tools/normalize/normalize.py

# normalize specific files
python tools/normalize/normalize.py knowledge/generated/recovery_agent.md

# custom dirs
python tools/normalize/normalize.py --input-dir knowledge/generated --output-dir knowledge/chunks
```

## Chunk schema

```json
{
  "id": "sarfaesi-act-2002-0003",
  "title": "SARFAESI Act, 2002",
  "section": "Enforcement of security interest",
  "category": "Legal",
  "text": "...",
  "keywords": ["sarfaesi", "possession", "secured", "demand notice"],
  "document_type": "act",
  "jurisdiction": "India",
  "source": "SARFAESI Act, 2002.pdf",
  "importance": 5
}
```

## Category detection (deterministic, ordered)

Checked most-specific first. A document mentioning the RBI is **not** auto-RBI —
RBI requires real circular markers (`RBI/2007-2008/...`, "Master Direction",
department codes like DBOD/DNBR/DOR, or an RBI-named source). Primary statutes
and named reports are classified before RBI so an Act or an annual report that
cites the RBI is not mislabelled.

| Category       | Signal                                                        |
| -------------- | ------------------------------------------------------------- |
| Glossary       | "glossary" in filename/title                                  |
| Template       | "template", `[PLACEHOLDER]` brackets, "compliance checklist"  |
| Practitioner   | "practitioner" in filename/title                              |
| Legal (Act)    | `Act, <year>` / Code of Civil Procedure → primary statute     |
| Statistics     | report / micrometer / NALSA / annual-report filename          |
| RBI            | RBI circular code, Master Direction, dept codes, RBI source   |
| Statistics     | digit-heavy fallback                                          |
| Legal          | forum / section references                                    |

### Forum references → stored in `keywords`

Lok Adalat · DRT · SARFAESI · Civil Court · Order 37 · NI Act · Arbitration.

## Importance (1–5)

| Importance | Applies to                          |
| ---------- | ----------------------------------- |
| 5          | RBI circulars, primary Acts/statutes |
| 5          | Practitioner cases (the moat)        |
| 4          | Legal procedure notes                |
| 3          | Templates                            |
| 2          | Statistics                           |
| 1          | Glossary                             |

Practitioner = 5 is a deliberate choice (Undark's retrieval design ranks real
practitioner cases highest). Flip the `IMPORTANCE` / `compute_importance`
constants in `normalize.py` if you want a different scheme.

## Notes

- **Deterministic.** Same input → identical output. No timestamps in the chunks.
- **Best-effort.** Heading-based sectioning and keyword extraction are
  heuristics; review the output before trusting a new document type.
- **Non-invasive.** Writes only to `knowledge/chunks/`. Touches no application
  code and changes no runtime behavior.
```
