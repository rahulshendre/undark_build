import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Case, ExtractedCase } from "@/packages/domain";
import { loadChunks } from "./load";
import { buildQuery, rankChunks, scoreChunk, type Chunk } from "./corpus";

// Read-only data layer for the developer Knowledge Explorer (/knowledge).
//
// It inspects what Undark has ingested and what live retrieval actually does.
// It regenerates NOTHING and changes no retrieval behavior — it only reads
// files already on disk and reuses the existing, deterministic scoring
// functions (buildQuery / rankChunks / scoreChunk) for display.

const CHUNKS_DIR = path.join(process.cwd(), "knowledge", "chunks");
const GENERATED_DIR = path.join(process.cwd(), "knowledge", "generated");
const CASES_DIR = path.join(process.cwd(), ".data", "cases");

const MARKDOWN_CAP = 120_000; // keep the client payload sane for huge Acts

// Category display order in the sidebar.
export const CATEGORY_ORDER = [
  "RBI",
  "Legal",
  "Statistics",
  "Template",
  "Glossary",
  "Practitioner",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One normalized chunk as written by tools/normalize/normalize.py. */
type NormalizerChunk = {
  id: string;
  title: string;
  section: string;
  category: string;
  text: string;
  keywords: string[];
  document_type: string;
  jurisdiction: string;
  source: string;
  importance: number;
};

export type ExplorerChunk = {
  id: string;
  heading: string;
  keywords: string[];
  text: string;
  wordCount: number;
  importance: number;
  source: string;
};

export type ExplorerDoc = {
  key: string; // unique id = base filename
  title: string;
  source: string;
  category: string;
  importance: number;
  documentType: string;
  chunkCount: number;
  keywords: string[]; // union across chunks (capped)
  markdown: string | null;
  markdownTruncated: boolean;
  chunks: ExplorerChunk[];
};

export type DebugChunk = {
  rank: number;
  title: string;
  section: string;
  category: string;
  score: number;
  matched: string[];
  text: string;
};

export type CaseDebug = {
  id: string;
  createdAt: string;
  summary: string;
  recommendation: string | null;
  facts: {
    borrower_name: string | null;
    loan_type: string;
    security: string;
    state: string | null;
    dpd: number | null;
    loan_amount_outstanding: number | null;
    documents_present: string[];
  };
  retrieved: DebugChunk[];
};

// ---------------------------------------------------------------------------
// Document browser (ingested corpus = knowledge/chunks + knowledge/generated)
// ---------------------------------------------------------------------------

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function readMarkdown(base: string): { md: string | null; truncated: boolean } {
  const p = path.join(GENERATED_DIR, `${base}.md`);
  if (!fs.existsSync(p)) return { md: null, truncated: false };
  const raw = fs.readFileSync(p, "utf-8");
  if (raw.length > MARKDOWN_CAP) {
    return { md: raw.slice(0, MARKDOWN_CAP), truncated: true };
  }
  return { md: raw, truncated: false };
}

export function loadExplorerDocs(): ExplorerDoc[] {
  if (!fs.existsSync(CHUNKS_DIR)) return [];
  const docs: ExplorerDoc[] = [];

  for (const entry of fs.readdirSync(CHUNKS_DIR)) {
    if (!entry.endsWith(".json")) continue;
    const base = entry.replace(/\.json$/, "");
    let chunks: NormalizerChunk[];
    try {
      chunks = JSON.parse(fs.readFileSync(path.join(CHUNKS_DIR, entry), "utf-8"));
    } catch {
      continue;
    }
    if (!Array.isArray(chunks) || chunks.length === 0) continue;

    const first = chunks[0];
    const keywordUnion = new Set<string>();
    const explorerChunks: ExplorerChunk[] = chunks.map((c) => {
      for (const k of c.keywords ?? []) keywordUnion.add(k);
      return {
        id: c.id,
        heading: c.section || "(document body)",
        keywords: c.keywords ?? [],
        text: c.text,
        wordCount: wordCount(c.text),
        importance: c.importance,
        source: c.source,
      };
    });

    const { md, truncated } = readMarkdown(base);
    docs.push({
      key: base,
      title: first.title,
      source: first.source,
      category: first.category,
      importance: first.importance,
      documentType: first.document_type,
      chunkCount: chunks.length,
      keywords: Array.from(keywordUnion).sort().slice(0, 40),
      markdown: md,
      markdownTruncated: truncated,
      chunks: explorerChunks,
    });
  }

  docs.sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    if (ca !== cb) return (ca < 0 ? 99 : ca) - (cb < 0 ? 99 : cb);
    return a.title.localeCompare(b.title);
  });
  return docs;
}

// ---------------------------------------------------------------------------
// Retrieval debug (live corpus = knowledge/, via the real retrieval functions)
// ---------------------------------------------------------------------------

/** Which query terms a chunk actually matched — display-only, no scoring change. */
function matchedTerms(chunk: Chunk, facts: ExtractedCase): string[] {
  const q = buildQuery(facts);
  const haystack = new Set<string>([
    ...chunk.keywords.map((k) => k.toLowerCase()),
    ...chunk.tags.map((t) => t.toLowerCase()),
  ]);
  const text = `${chunk.title} ${chunk.section} ${chunk.text}`.toLowerCase();
  const matched = new Set<string>();

  for (const f of q.forums) {
    if (text.includes(f.toLowerCase())) matched.add(`forum:${f}`);
  }
  if (q.loanType && (haystack.has(q.loanType) || text.includes(q.loanType))) {
    matched.add(`loan:${q.loanType}`);
  }
  for (const t of q.tags) if (haystack.has(t.toLowerCase())) matched.add(`tag:${t}`);
  for (const t of q.coreTerms) {
    if (haystack.has(t.toLowerCase()) || text.includes(t.toLowerCase())) {
      matched.add(`term:${t}`);
    }
  }
  for (const k of q.keywords) if (haystack.has(k.toLowerCase())) matched.add(k);

  return Array.from(matched).slice(0, 12);
}

function caseToDebug(c: Case): CaseDebug {
  const facts = c as ExtractedCase;
  const chunks = loadChunks();
  const q = buildQuery(facts);
  const ranked = rankChunks(chunks, q, 6);

  const retrieved: DebugChunk[] = ranked.map((chunk, i) => ({
    rank: i + 1,
    title: chunk.title,
    section: chunk.section,
    category: chunk.category,
    score: scoreChunk(chunk, q),
    matched: matchedTerms(chunk, facts),
    text: chunk.text,
  }));

  const rec =
    c.next_action && typeof c.next_action === "object"
      ? // show whatever forum/label the analysis recorded, defensively
        ((c.next_action as Record<string, unknown>).forum as string) ??
        ((c.next_action as Record<string, unknown>).recommendation as string) ??
        ((c.next_action as Record<string, unknown>).action as string) ??
        null
      : null;

  return {
    id: c.id,
    createdAt: c.created_at,
    summary: c.summary_one_line ?? "",
    recommendation: rec,
    facts: {
      borrower_name: c.borrower_name,
      loan_type: c.loan_type,
      security: c.security,
      state: c.state,
      dpd: c.dpd,
      loan_amount_outstanding: c.loan_amount_outstanding,
      documents_present: c.documents_present ?? [],
    },
    retrieved,
  };
}

export function loadCaseDebug(): CaseDebug[] {
  if (!fs.existsSync(CASES_DIR)) return [];
  const out: CaseDebug[] = [];
  for (const entry of fs.readdirSync(CASES_DIR)) {
    if (!entry.endsWith(".json")) continue;
    try {
      const c = JSON.parse(
        fs.readFileSync(path.join(CASES_DIR, entry), "utf-8"),
      ) as Case;
      out.push(caseToDebug(c));
    } catch {
      continue;
    }
  }
  out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return out;
}
