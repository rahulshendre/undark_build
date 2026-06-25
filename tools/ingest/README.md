# Undark PDF → Markdown ingestion tool

Offline preprocessing only. Converts an official PDF (RBI circular, an Act,
NALSA / MFIN / Sa-Dhan report, etc.) into a clean Markdown file that Undark's
retrieval engine can consume.

This is **not** a RAG pipeline. No embeddings, no vector database, no LangChain.
It does one thing: faithfully turn a PDF into Markdown. It does **not**
summarize, paraphrase, or rewrite legal language — the output represents the
original document as closely as the extraction allows.

## Install

System dependency — Tesseract (for image OCR):

```bash
# macOS
brew install tesseract
# Debian / Ubuntu
sudo apt-get install tesseract-ocr
```

Python dependencies:

```bash
pip install -r tools/ingest/requirements.txt
```

If `pytesseract` / `Pillow` are missing, the tool still runs — it extracts all
selectable text and just skips image OCR (with a warning).

## Usage

```bash
python tools/ingest/ingest.py file.pdf
```

The Markdown is written to:

```
knowledge/generated/<filename>.md
```

`<filename>` is the input PDF's base name. For example,
`knowledge_v2/recovery_agent.pdf` becomes
`knowledge/generated/recovery_agent.md`.

Override the output directory with `--output-dir`:

```bash
python tools/ingest/ingest.py knowledge_v2/recovery_agent.pdf --output-dir knowledge/generated
```

## What it does

1. Extracts all selectable text with PyMuPDF, preserving reading order.
2. Extracts every embedded image and runs Tesseract OCR on it.
3. Merges OCR text under an **Extracted Images (OCR)** section (placement is
   approximate, so it is appended rather than risk corrupting the text flow).
4. Removes page numbers, repeated running headers/footers, blank pages, and
   duplicate whitespace.
5. Preserves headings (font-size heuristic), numbering, bullet lists, tables
   (best effort), and section hierarchy.

Every generated file starts with front matter:

```yaml
---
title:
source_pdf:
generated_at:
tool_version:
---
```

## Notes

- **Deterministic** except `generated_at` (a UTC timestamp of the run). The
  document body is reproducible for the same input.
- **Best-effort tables.** PyMuPDF's table finder works well on ruled tables and
  poorly on free-form columns. Always eyeball generated tables.
- **Review before use.** This is a preprocessing step. A human should skim each
  generated Markdown before it enters `knowledge/`, especially the OCR section
  and any tables.
