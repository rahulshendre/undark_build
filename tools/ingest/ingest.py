#!/usr/bin/env python3
"""
Undark knowledge ingestion tool.

Offline preprocessing only. Converts an official PDF (RBI circular, Act, NALSA /
MFIN report, etc.) into a clean Markdown file the retrieval engine can consume.

This is NOT a RAG pipeline. No embeddings, no vector DB, no LangChain. It does
exactly one thing: faithfully turn a PDF into Markdown.

Usage:
    python ingest.py input.pdf
    python ingest.py input.pdf --output-dir knowledge/generated

Output:
    knowledge/generated/<filename>.md

The output is a faithful representation of the source. It does NOT summarize,
paraphrase, or rewrite legal language.
"""

import argparse
import datetime
import io
import os
import re
import sys
from collections import Counter

import fitz  # PyMuPDF

try:
    import pytesseract
    from PIL import Image

    _OCR_AVAILABLE = True
except ImportError:  # OCR is optional; selectable text still works without it.
    _OCR_AVAILABLE = False


TOOL_VERSION = "0.1.0"

# Images smaller than this (in pixels, either dimension) are treated as icons /
# logos / decorations and skipped for OCR. Keeps OCR fast and avoids garbage
# text from tiny decorative graphics.
_MIN_OCR_IMAGE_PX = 200

# A page-number line is a bare number, "Page 3", "Page 3 of 40", "- 3 -", etc.
_PAGE_NUMBER_RE = re.compile(
    r"^\s*(?:-\s*)?(?:page\s+)?\d+(?:\s+of\s+\d+)?(?:\s*-)?\s*$",
    re.IGNORECASE,
)
# Collapse 3+ blank lines into one blank line.
_MULTI_BLANK_RE = re.compile(r"\n{3,}")
# Collapse runs of spaces/tabs.
_MULTI_SPACE_RE = re.compile(r"[ \t]{2,}")


def normalize_line(line):
    """Trim and collapse internal whitespace for header/footer comparison."""
    return _MULTI_SPACE_RE.sub(" ", line.strip())


# ---------------------------------------------------------------------------
# Repeated header / footer detection
# ---------------------------------------------------------------------------

def find_repeated_edges(pages_lines, edge_count=3, min_fraction=0.5):
    """
    Find lines that repeat across many pages near the top (header) or bottom
    (footer) of each page. Such lines are running headers/footers, not content.

    pages_lines: list of (list of lines) per page.
    Returns a set of normalized lines to strip.
    """
    n_pages = len([p for p in pages_lines if p])
    if n_pages < 3:
        # Too few pages to reliably tell a running header from real content.
        return set()

    top_counter = Counter()
    bottom_counter = Counter()
    for lines in pages_lines:
        if not lines:
            continue
        top = [normalize_line(l) for l in lines[:edge_count] if normalize_line(l)]
        bottom = [normalize_line(l) for l in lines[-edge_count:] if normalize_line(l)]
        # Count each distinct line once per page.
        for l in set(top):
            top_counter[l] += 1
        for l in set(bottom):
            bottom_counter[l] += 1

    threshold = max(3, int(n_pages * min_fraction))
    repeated = set()
    for line, count in top_counter.items():
        if count >= threshold:
            repeated.add(line)
    for line, count in bottom_counter.items():
        if count >= threshold:
            repeated.add(line)
    return repeated


# ---------------------------------------------------------------------------
# Heading detection (font-size heuristic)
# ---------------------------------------------------------------------------

def compute_body_size(doc):
    """Most common span font size across the document = body text size."""
    sizes = Counter()
    for page in doc:
        data = page.get_text("dict")
        for block in data.get("blocks", []):
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    if text:
                        # Round to reduce float noise.
                        sizes[round(span["size"], 1)] += len(text)
    if not sizes:
        return None
    return sizes.most_common(1)[0][0]


def heading_level(line_size, body_size):
    """
    Map a line's font size to a Markdown heading level, or None for body text.
    Deterministic thresholds relative to body size.
    """
    if body_size is None or line_size is None:
        return None
    ratio = line_size / body_size
    if ratio >= 1.5:
        return 2  # ## — reserve # for the document title in front matter
    if ratio >= 1.25:
        return 3  # ###
    if ratio >= 1.12:
        return 4  # ####
    return None


# ---------------------------------------------------------------------------
# Page text extraction with structure
# ---------------------------------------------------------------------------

def extract_page_lines(page, body_size):
    """
    Extract page text as a list of (text, max_span_size) tuples, preserving
    reading order. One entry per visual line.
    """
    data = page.get_text("dict")
    out = []
    for block in data.get("blocks", []):
        if block.get("type", 0) != 0:
            continue  # skip image blocks here; handled separately
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            text = "".join(s.get("text", "") for s in spans)
            text = text.rstrip()
            if not text.strip():
                continue
            max_size = max((s.get("size", 0) for s in spans if s.get("text", "").strip()),
                           default=0)
            out.append((text, max_size))
    return out


def render_line(text, size, body_size, repeated_edges):
    """Turn one extracted line into a Markdown line, or None to drop it."""
    norm = normalize_line(text)
    if not norm:
        return None
    if norm in repeated_edges:
        return None
    if _PAGE_NUMBER_RE.match(norm):
        return None

    level = heading_level(size, body_size)
    if level:
        return "#" * level + " " + norm
    return _MULTI_SPACE_RE.sub(" ", text.strip())


# ---------------------------------------------------------------------------
# Table extraction (best effort)
# ---------------------------------------------------------------------------

def extract_tables_markdown(page):
    """Return a list of Markdown table strings found on the page (best effort)."""
    tables_md = []
    try:
        finder = page.find_tables()
    except Exception:
        return tables_md
    for table in getattr(finder, "tables", []):
        try:
            rows = table.extract()
        except Exception:
            continue
        rows = [[("" if c is None else str(c).replace("\n", " ").strip()) for c in row]
                for row in rows if row]
        if not rows:
            continue
        width = max(len(r) for r in rows)
        rows = [r + [""] * (width - len(r)) for r in rows]
        header = rows[0]
        md = ["| " + " | ".join(header) + " |",
              "| " + " | ".join(["---"] * width) + " |"]
        for r in rows[1:]:
            md.append("| " + " | ".join(r) + " |")
        tables_md.append("\n".join(md))
    return tables_md


# ---------------------------------------------------------------------------
# Image OCR
# ---------------------------------------------------------------------------

def ocr_page_images(doc, page):
    """
    Extract embedded images on the page, OCR them, and return a list of
    non-empty OCR text blocks. Returns [] if OCR unavailable.
    """
    if not _OCR_AVAILABLE:
        return []
    results = []
    for img in page.get_images(full=True):
        xref = img[0]
        try:
            base = doc.extract_image(xref)
        except Exception:
            continue
        image_bytes = base.get("image")
        if not image_bytes:
            continue
        # Skip decorative icons/logos to keep OCR fast and clean.
        if base.get("width", 0) < _MIN_OCR_IMAGE_PX or base.get("height", 0) < _MIN_OCR_IMAGE_PX:
            continue
        try:
            pil = Image.open(io.BytesIO(image_bytes))
        except Exception:
            continue
        try:
            text = pytesseract.image_to_string(pil)
        except Exception:
            continue
        text = text.strip()
        if text:
            results.append(text)
    return results


# ---------------------------------------------------------------------------
# Main conversion
# ---------------------------------------------------------------------------

def convert(pdf_path, output_dir):
    doc = fitz.open(pdf_path)
    body_size = compute_body_size(doc)

    # First pass: collect plain lines per page for header/footer detection.
    pages_lines = []
    for page in doc:
        lines = [t for (t, _s) in extract_page_lines(page, body_size)]
        pages_lines.append(lines)
    repeated_edges = find_repeated_edges(pages_lines)

    # Second pass: render markdown.
    body_parts = []
    image_ocr_sections = []
    for page_index, page in enumerate(doc):
        page_lines = extract_page_lines(page, body_size)
        rendered = []
        for text, size in page_lines:
            md_line = render_line(text, size, body_size, repeated_edges)
            if md_line is not None:
                rendered.append(md_line)

        tables_md = extract_tables_markdown(page)

        ocr_blocks = ocr_page_images(doc, page)

        # Blank page: no text, no tables, no OCR — skip entirely.
        if not rendered and not tables_md and not ocr_blocks:
            continue

        if rendered:
            body_parts.append("\n\n".join(rendered))
        for tmd in tables_md:
            body_parts.append(tmd)

        # OCR text placement is approximate; collect under a per-page section
        # appended at the end so we never corrupt the faithful text flow.
        for block in ocr_blocks:
            image_ocr_sections.append((page_index + 1, block))

    doc.close()

    body = "\n\n".join(p for p in body_parts if p.strip())
    body = _MULTI_BLANK_RE.sub("\n\n", body).strip()

    if image_ocr_sections:
        lines = ["", "## Extracted Images (OCR)", ""]
        for page_no, block in image_ocr_sections:
            lines.append(f"### Page {page_no}")
            lines.append("")
            lines.append(block.strip())
            lines.append("")
        body = body + "\n\n" + "\n".join(lines)
        body = body.strip() + "\n"

    title = os.path.splitext(os.path.basename(pdf_path))[0]
    front_matter = (
        "---\n"
        f"title: {title}\n"
        f"source_pdf: {os.path.basename(pdf_path)}\n"
        f"generated_at: {datetime.datetime.now(datetime.timezone.utc).isoformat()}\n"
        f"tool_version: {TOOL_VERSION}\n"
        "---\n\n"
    )

    os.makedirs(output_dir, exist_ok=True)
    out_name = title + ".md"
    out_path = os.path.join(output_dir, out_name)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(front_matter + body + ("\n" if not body.endswith("\n") else ""))

    return out_path


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Convert an official PDF into clean Markdown for Undark's "
                    "knowledge base. Offline preprocessing only — no RAG."
    )
    parser.add_argument("pdf", help="Path to the input PDF.")
    parser.add_argument(
        "--output-dir",
        default="knowledge/generated",
        help="Directory for the generated Markdown (default: knowledge/generated).",
    )
    args = parser.parse_args(argv)

    if not os.path.isfile(args.pdf):
        print(f"error: file not found: {args.pdf}", file=sys.stderr)
        return 1
    if not _OCR_AVAILABLE:
        print("warning: pytesseract/Pillow not available — image OCR skipped. "
              "Selectable text is still extracted.", file=sys.stderr)

    out_path = convert(args.pdf, args.output_dir)
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
