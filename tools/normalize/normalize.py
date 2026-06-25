#!/usr/bin/env python3
"""
Undark knowledge normalizer.

Converts clean Markdown documents (knowledge/generated/*.md) into structured
"knowledge chunks" (knowledge/chunks/<filename>.json) that retrieval can use
more effectively.

Fully deterministic. No AI, no embeddings, no vector DB, no LangChain, no
external APIs. This only prepares cleaner knowledge for FUTURE retrieval — it
does not change application behavior.

Usage:
    python normalize.py                      # normalize every generated md
    python normalize.py knowledge/generated/recovery_agent.md   # one file
    python normalize.py --input-dir knowledge/generated --output-dir knowledge/chunks

Each document becomes a JSON array of chunks. Chunk schema:
    id, title, section, category, text, keywords[], document_type,
    jurisdiction ("India"), source, importance (1-5)
"""

import argparse
import glob
import json
import os
import re
import sys
from collections import Counter

TOOL_VERSION = "0.1.0"

# Target chunk size (words). Soft bounds — atomic numbered procedures may exceed
# the max rather than be split (see rule 3).
MIN_WORDS = 300
MAX_WORDS = 800

# Importance by category. 5 = RBI circulars / primary Acts, 4 = legal
# procedures, 3 = templates, 2 = statistics, 1 = glossary. Practitioner cases
# are the moat and rank highest (5); flip here if you disagree.
IMPORTANCE = {
    "RBI": 5,
    "Legal": 4,          # raised to 5 for primary Acts/statutes (see below)
    "Template": 3,
    "Statistics": 2,
    "Glossary": 1,
    "Practitioner": 5,
}

JURISDICTION = "India"

# ---------------------------------------------------------------------------
# Vocabulary
# ---------------------------------------------------------------------------

# Forum references -> canonical keyword. First matching pattern wins; all that
# match are recorded.
FORUM_PATTERNS = {
    "lok adalat": [r"lok\s+adalat"],
    "drt": [r"\bdrt\b", r"debts?\s+recovery\s+tribunal", r"recovery of debts"],
    "sarfaesi": [r"sarfaesi", r"securitisation", r"enforcement of security interest"],
    "civil court": [r"civil\s+court", r"civil\s+suit", r"code of civil procedure"],
    "order 37": [r"order\s+37", r"order\s+xxxvii", r"summary\s+suit"],
    "ni act": [r"\bni\s+act\b", r"section\s+138", r"negotiable\s+instruments", r"cheque"],
    "arbitration": [r"arbitration"],
}

# Legal/operational terms worth surfacing when they REPEAT in a chunk.
LEGAL_TERMS = [
    "demand notice", "pre-litigation notice", "settlement", "secured",
    "unsecured", "collateral", "default", "outstanding", "borrower",
    "guarantor", "interest", "penalty", "possession", "decree", "jurisdiction",
    "limitation", "dishonour", "recovery agent", "grievance", "ombudsman",
    "disbursement", "provisioning", "npa", "kyc", "notice", "leave to defend",
    "promissory note", "moratorium", "compromise", "award",
]

STOPWORDS = {
    "the", "and", "for", "are", "was", "were", "from", "this", "that", "with",
    "any", "all", "not", "may", "shall", "such", "under", "into", "their",
    "which", "have", "has", "had", "been", "its", "his", "her", "they", "them",
    "you", "your", "our", "but", "out", "per", "via", "etc", "who", "what",
    "when", "where", "how", "why", "than", "then", "also", "each", "other",
    "must", "should", "would", "could", "about", "after", "before", "between",
    "section", "sub", "clause", "act", "of", "to", "in", "on", "as", "is", "be",
    "or", "an", "a", "by", "at", "it", "if", "no", "do", "we", "us",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def slugify(name):
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "doc"


def word_count(text):
    return len(text.split())


def split_front_matter(raw):
    """Return (meta dict, body). Parses a leading '--- ... ---' YAML-ish block."""
    meta = {}
    if raw.startswith("---"):
        end = raw.find("\n---", 3)
        if end != -1:
            fm = raw[3:end].strip("\n")
            body = raw[end + 4:].lstrip("\n")
            for line in fm.splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    meta[k.strip()] = v.strip()
            return meta, body
    return meta, raw


_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*\S)\s*$")
_NUMBERED_RE = re.compile(
    r"^\s*(\(?\d+[A-Za-z]?[\.\)]|\([a-z]\)|\([ivxlcdm]+\))\s+",
    re.IGNORECASE,
)


def parse_blocks(body):
    """
    Split body into blocks at headings. Each block:
        {level, title, breadcrumb, major, lines}
    'breadcrumb' is the heading hierarchy ("H1 > H2"); 'major' is the top-level
    heading used to avoid packing across unrelated sections.
    """
    blocks = []
    stack = []  # list of (level, title)
    cur = {"level": 0, "title": None, "lines": []}

    def breadcrumb_of(stack):
        return " > ".join(t for (_l, t) in stack)

    def push(block):
        if block["title"] is not None or any(l.strip() for l in block["lines"]):
            blocks.append(block)

    for line in body.splitlines():
        m = _HEADING_RE.match(line)
        if m:
            push(cur)
            level = len(m.group(1))
            title = m.group(2).strip()
            while stack and stack[-1][0] >= level:
                stack.pop()
            stack.append((level, title))
            cur = {
                "level": level,
                "title": title,
                "breadcrumb": breadcrumb_of(stack),
                "major": stack[0][1] if stack else title,
                "lines": [],
            }
        else:
            cur["lines"].append(line)
    push(cur)

    # Preamble block (level 0) has no breadcrumb yet.
    for b in blocks:
        b.setdefault("breadcrumb", "")
        b.setdefault("major", b.get("title") or "")
    return blocks


def split_paragraphs(lines):
    paras, buf = [], []
    for line in lines:
        if line.strip():
            buf.append(line.rstrip())
        else:
            if buf:
                paras.append("\n".join(buf))
                buf = []
    if buf:
        paras.append("\n".join(buf))
    return paras


def group_numbered(paras):
    """
    Merge consecutive numbered/lettered paragraphs into one atomic unit so a
    numbered legal procedure is never split mid-way (rule 3).
    """
    out, i = [], 0
    while i < len(paras):
        first_line = paras[i].splitlines()[0] if paras[i].splitlines() else ""
        if _NUMBERED_RE.match(first_line):
            run = [paras[i]]
            i += 1
            while i < len(paras):
                fl = paras[i].splitlines()[0] if paras[i].splitlines() else ""
                if _NUMBERED_RE.match(fl):
                    run.append(paras[i])
                    i += 1
                else:
                    break
            out.append("\n\n".join(run))
        else:
            out.append(paras[i])
            i += 1
    return out


def block_to_units(block):
    """Turn a block into ordered text units, attaching the heading to the first."""
    heading_md = ""
    if block["title"]:
        heading_md = "#" * max(block["level"], 1) + " " + block["title"]
    grouped = group_numbered(split_paragraphs(block["lines"]))
    units = []
    if not grouped:
        if heading_md:
            units.append(_unit(heading_md, block))
        return units
    for idx, g in enumerate(grouped):
        text = (heading_md + "\n\n" + g) if (idx == 0 and heading_md) else g
        units.append(_unit(text, block))
    return units


def _unit(text, block):
    return {
        "text": text,
        "words": word_count(text),
        "section": block["breadcrumb"] or (block["title"] or ""),
        "major": block["major"],
    }


def pack_units(units):
    """Greedily pack units into chunks of ~MIN..MAX words, never splitting a unit."""
    chunks = []
    buf, bw, bsection, bmajor = [], 0, None, None

    def flush():
        nonlocal buf, bw, bsection, bmajor
        if buf:
            chunks.append({"text": "\n\n".join(buf), "section": bsection or ""})
            buf, bw, bsection, bmajor = [], 0, None, None

    for u in units:
        if buf and (u["major"] != bmajor or bw + u["words"] > MAX_WORDS):
            flush()
        if not buf:
            bsection, bmajor = u["section"], u["major"]
        buf.append(u["text"])
        bw += u["words"]
        if bw >= MIN_WORDS:
            flush()
    flush()
    return chunks

# ---------------------------------------------------------------------------
# Classification (deterministic)
# ---------------------------------------------------------------------------

def _looks_rbi(filename, title, body):
    """RBI source only if it carries real RBI circular/direction markers —
    not merely because the text mentions the Reserve Bank."""
    fl = filename.lower()
    bl = body.lower()
    tl = (title or "").lower()
    if "rbi" in fl or "reserve-bank" in fl or "reserve bank of india" in tl:
        return True
    if re.search(r"\brbi\s*/\s*\d", bl):
        return True
    if "master direction" in bl:
        return True
    if re.search(r"\b(dbod|dnbr|dor|dbr|dpss|idmd|rpcd|cepd)\b", bl):
        return True
    if "reserve bank of india" in bl and re.search(r"\b(circular|notification|direction|directions)\b", bl):
        return True
    return False


def _statistics_filename(filename):
    fl = filename.lower()
    return bool(re.search(
        r"(annual[-\s]?report|micrometer|mfin|nalsa|sa[-\s]?dhan|statistics|synopsis|report)",
        fl))


def detect_category(filename, title, body):
    fl = filename.lower()
    tl = (title or "").lower()
    bl = body.lower()

    # Order matters: most specific / strongest signal first.
    if "glossary" in fl or "glossary" in tl:
        return "Glossary"
    if "practitioner" in fl or "practitioner" in tl:
        return "Practitioner"
    # A primary statute is Legal even though it carries amendment brackets
    # ([substituted]/[inserted]) or names the RBI throughout.
    if is_primary_act(filename, title, body):
        return "Legal"
    # Templates use UPPERCASE placeholders ([BORROWER_NAME]); lowercase brackets
    # in statutes are amendment markers, not placeholders.
    if ("template" in fl or "template" in tl
            or "compliance checklist" in bl
            or re.search(r"\[[A-Z][A-Z_]{2,}\]", body)):
        return "Template"
    # A clearly-named report (annual report, micrometer, NALSA) is Statistics
    # even though it cites the RBI.
    if _statistics_filename(filename):
        return "Statistics"
    if _looks_rbi(filename, title, body):
        return "RBI"
    if _digit_ratio(body) > 0.06:
        return "Statistics"
    if ("negotiable instruments" in bl or "sarfaesi" in bl or "arbitration" in bl
            or "lok adalat" in bl or "debts recovery" in bl
            or len(re.findall(r"\bsection\s+\d", bl)) >= 3):
        return "Legal"
    return "Legal"


def is_primary_act(filename, title, body):
    blob = (filename + " " + (title or "")).lower()
    return bool(re.search(r"act,?\s*\d{4}", blob)) or "code of civil procedure" in blob


def _digit_ratio(text):
    if not text:
        return 0.0
    digits = sum(c.isdigit() for c in text)
    return digits / max(len(text), 1)


def detect_document_type(category, primary_act):
    return {
        "RBI": "rbi_circular",
        "Template": "template",
        "Statistics": "statistics_report",
        "Glossary": "glossary",
        "Practitioner": "practitioner_case",
        "Legal": "act" if primary_act else "legal_procedure",
    }.get(category, "document")


def compute_importance(category, primary_act):
    if category == "Legal" and primary_act:
        return 5
    return IMPORTANCE.get(category, 3)

# ---------------------------------------------------------------------------
# Keyword extraction (deterministic)
# ---------------------------------------------------------------------------

def extract_keywords(chunk_text, section):
    text_l = chunk_text.lower()
    found = set()

    # 1. Forum references.
    for canonical, patterns in FORUM_PATTERNS.items():
        if any(re.search(p, text_l) for p in patterns):
            found.add(canonical)

    # 2. Heading words (section breadcrumb + any heading lines in the chunk).
    heading_text = section + " "
    for line in chunk_text.splitlines():
        if line.startswith("#"):
            heading_text += " " + line.lstrip("# ").strip()
    for tok in re.findall(r"[a-zA-Z][a-zA-Z\-]{2,}", heading_text.lower()):
        if tok not in STOPWORDS and len(tok) >= 3:
            found.add(tok)

    # 3. Repeated legal terms (appear at least twice).
    for term in LEGAL_TERMS:
        if len(re.findall(re.escape(term), text_l)) >= 2:
            found.add(term)

    return sorted(found)

# ---------------------------------------------------------------------------
# Per-document normalization
# ---------------------------------------------------------------------------

def normalize_document(path):
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()
    meta, body = split_front_matter(raw)

    filename = os.path.splitext(os.path.basename(path))[0]
    title = meta.get("title") or filename
    source = meta.get("source_pdf") or os.path.basename(path)

    category = detect_category(filename, title, body)
    primary_act = is_primary_act(filename, title, body)
    document_type = detect_document_type(category, primary_act)
    importance = compute_importance(category, primary_act)

    blocks = parse_blocks(body)
    units = []
    for b in blocks:
        units.extend(block_to_units(b))
    raw_chunks = pack_units(units)

    slug = slugify(filename)
    chunks = []
    for i, rc in enumerate(raw_chunks):
        text = rc["text"].strip()
        if not text:
            continue
        chunks.append({
            "id": f"{slug}-{i:04d}",
            "title": title,
            "section": rc["section"],
            "category": category,
            "text": text,
            "keywords": extract_keywords(text, rc["section"]),
            "document_type": document_type,
            "jurisdiction": JURISDICTION,
            "source": source,
            "importance": importance,
        })
    return chunks

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Normalize generated Markdown into structured knowledge "
                    "chunks. Deterministic; no AI."
    )
    parser.add_argument("files", nargs="*",
                        help="Specific .md files (default: all in --input-dir).")
    parser.add_argument("--input-dir", default="knowledge/generated")
    parser.add_argument("--output-dir", default="knowledge/chunks")
    args = parser.parse_args(argv)

    if args.files:
        paths = args.files
    else:
        paths = sorted(glob.glob(os.path.join(args.input_dir, "*.md")))

    if not paths:
        print(f"no markdown found in {args.input_dir}", file=sys.stderr)
        return 1

    os.makedirs(args.output_dir, exist_ok=True)
    total_chunks = 0
    for path in paths:
        if not os.path.isfile(path):
            print(f"skip (not found): {path}", file=sys.stderr)
            continue
        chunks = normalize_document(path)
        out_name = os.path.splitext(os.path.basename(path))[0] + ".json"
        out_path = os.path.join(args.output_dir, out_name)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False, indent=2)
        total_chunks += len(chunks)
        cat = chunks[0]["category"] if chunks else "?"
        imp = chunks[0]["importance"] if chunks else "?"
        print(f"{path} -> {out_path}  ({len(chunks)} chunks, {cat}, importance {imp})")

    print(f"done: {len(paths)} docs, {total_chunks} chunks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
