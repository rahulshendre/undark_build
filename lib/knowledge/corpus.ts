// Pure retrieval core — no fs, no server-only, no network. Fully unit-testable.
//
// Deterministic keyword/tag scoring over knowledge chunks. No embeddings, no
// vector store. The whole point is that it is explainable and reproducible:
// the same facts always retrieve the same chunks in the same order.

import type { ExtractedCase } from "@/packages/domain";

export type Chunk = {
  id: string;
  source: string; // file path or "glossary" — provenance
  category: string; // rbi | legal | templates | glossary | practitioner | ...
  title: string; // document title (what Claude cites)
  section: string; // heading within the document
  tags: string[];
  text: string;
  /** Precomputed lowercase keyword set (vocab terms present + tags + section). */
  keywords: string[];
};

/** Category retrieval priority — we want one of each, not global top-N. */
export const CATEGORY_SEQUENCE = [
  "legal",
  "rbi",
  "templates",
  "glossary",
  "rbi", // a second RBI rule is usually worth it
  "practitioner",
];

/** Derive a category from a document's path relative to knowledge/. */
export function categoryOf(relPath: string): string {
  const parts = relPath.split(/[\\/]/);
  if (parts[0] === "sources") return parts[1] ?? "source";
  return parts[0];
}

/**
 * Controlled vocabulary. Retrieval only reasons over these domain terms, which
 * keeps the index tiny and the scoring legible. Multi-word phrases are matched
 * as substrings against lowercased text.
 */
export const VOCAB: string[] = [
  // forums
  "lok adalat",
  "permanent lok adalat",
  "sarfaesi",
  "drt",
  "civil suit",
  "civil court",
  "order 37",
  "summary suit",
  "ni act",
  "section 138",
  "arbitration",
  // rbi / conduct
  "fair practices",
  "recovery agent",
  "communication",
  "harassment",
  "digital lending",
  "kfs",
  "grievance",
  "outsourcing",
  "cooling-off",
  // loans / terms
  "personal loan",
  "vehicle loan",
  "business loan",
  "gold loan",
  "agriculture",
  "mfi",
  "nbfc",
  "unsecured",
  "secured",
  "dpd",
  "npa",
  "par",
  "settlement",
  "demand notice",
  "reminder",
  "pre-litigation",
  "write-off",
  "provisioning",
  "guarantor",
  // document types
  "cheque",
  "bank statement",
  "loan agreement",
  "kyc",
];

/** Forum terms — matches on a chunk's title/section score much higher. */
export const FORUMS = [
  "lok adalat",
  "permanent lok adalat",
  "sarfaesi",
  "drt",
  "civil suit",
  "civil court",
  "order 37",
  "summary suit",
  "ni act",
  "section 138",
  "arbitration",
];

const LOAN_TYPE_TERM: Record<string, string> = {
  personal: "personal loan",
  vehicle: "vehicle loan",
  business: "business loan",
  gold: "gold loan",
  agriculture: "agriculture",
};

/** DRT pecuniary threshold heuristic (rupees). Sub-threshold → DRT not a candidate. */
export const DRT_THRESHOLD = 2000000;

function lc(s: string): string {
  return s.toLowerCase();
}

/** Which VOCAB terms appear in a blob of text. */
export function extractKeywords(text: string): string[] {
  const hay = lc(text);
  return VOCAB.filter((term) => hay.includes(term));
}

// ---- Query construction -----------------------------------------------------

export type Query = {
  keywords: Set<string>; // weighted at +1 each on keyword overlap
  forums: Set<string>; // weighted strongly on title/section match
  loanType: string | null; // weighted +3
  docTypes: Set<string>; // weighted +2
  tags: Set<string>; // weighted +3 on tag overlap
  coreTerms: Set<string>; // case's own attributes (dpd, loan type, security) — boost glossary
  boosts: Set<string>; // keywords to weight x2 for this case (stage/security-dependent)
};

/** Map a present-document filename/label to the vocab document-type term it implies. */
function docToTerms(doc: string): string[] {
  const d = lc(doc);
  const out: string[] = [];
  if (d.includes("cheque")) out.push("cheque", "ni act", "section 138");
  if (d.includes("statement")) out.push("bank statement");
  if (d.includes("agreement")) out.push("loan agreement");
  if (d.includes("kyc")) out.push("kyc");
  if (d.includes("notice")) out.push("demand notice");
  if (d.includes("guarantor")) out.push("guarantor");
  return out;
}

/**
 * Build a retrieval query from the extracted case facts.
 * Inputs used: loan_type, security, state, dpd, documents_present, and the
 * outstanding amount (to derive forum candidates — the "next_action_candidates").
 */
export function buildQuery(facts: ExtractedCase): Query {
  const keywords = new Set<string>();
  const forums = new Set<string>();
  const docTypes = new Set<string>();

  const loanType = LOAN_TYPE_TERM[facts.loan_type] ?? null;
  if (loanType) keywords.add(loanType);

  // Security
  if (facts.security === "secured") keywords.add("secured");
  else if (facts.security === "unsecured") keywords.add("unsecured");

  // DPD present
  if (facts.dpd != null) keywords.add("dpd");

  // Documents present -> document-type terms
  for (const doc of facts.documents_present ?? []) {
    for (const t of docToTerms(doc)) {
      keywords.add(t);
      docTypes.add(t);
    }
  }

  // Forum candidates (derived next-action candidates). Keep the PRIMARY forum
  // tight so it does not flood the results with every fallback option.
  const hasCheque = docTypes.has("ni act");
  // Stage/security-dependent emphasis: unsecured soft recovery leans on
  // communication conduct; secured enforcement leans on recovery-agent rules.
  const boosts = new Set<string>();
  if (facts.security === "secured") {
    forums.add("sarfaesi");
    boosts.add("recovery agent");
  } else {
    // unsecured (or unknown) small-ticket → settlement via Lok Adalat is primary
    forums.add("lok adalat");
    boosts.add("communication");
  }
  if (hasCheque) {
    forums.add("ni act");
    forums.add("section 138");
  }
  const outstanding = facts.loan_amount_outstanding ?? 0;
  if (outstanding >= DRT_THRESHOLD) forums.add("drt");

  // Conduct knowledge is always relevant once recovery starts.
  keywords.add("fair practices");
  keywords.add("recovery agent");
  keywords.add("communication");
  keywords.add("demand notice");

  // Forums also count as keywords.
  for (const f of forums) keywords.add(f);

  // Tags mirror the keyword intent (chunk tags are kebab-ish; we match loosely).
  const tags = new Set<string>();
  for (const k of keywords) tags.add(k.replace(/\s+/g, "-"));
  if (loanType) tags.add(facts.loan_type);

  // The case's own attributes — used to make the matching glossary entry (e.g.
  // DPD when the case has a DPD) the one that surfaces.
  const coreTerms = new Set<string>();
  if (loanType) coreTerms.add(loanType);
  if (facts.dpd != null) coreTerms.add("dpd");
  if (facts.security === "secured") coreTerms.add("secured");
  else if (facts.security === "unsecured") coreTerms.add("unsecured");

  return { keywords, forums, loanType, docTypes, tags, coreTerms, boosts };
}

// ---- Scoring ----------------------------------------------------------------

const W = {
  forumTitle: 5, // forum term in chunk title/section
  forumKeyword: 2, // forum term only in body keywords
  loanType: 3,
  tag: 3,
  keyword: 1,
  docType: 2,
  sectionTerm: 2, // glossary/section heading exactly matches a query term
  coreGlossary: 4, // glossary term naming a core case attribute (dpd, loan type, security)
  demandDefault: 2, // demand notice = default first formal recovery instrument
};

/** Normalize a tag for tolerant comparison (ignore trailing plural 's'). */
function normTag(t: string): string {
  return lc(t).replace(/s$/, "");
}

function chunkHasTag(chunk: Chunk, tag: string): boolean {
  return chunk.tags.some((t) => normTag(t) === normTag(tag));
}

/** Deterministic relevance score for one chunk against a query. */
export function scoreChunk(chunk: Chunk, q: Query): number {
  let s = 0;
  const titleHay = lc(chunk.title + " " + chunk.section);
  const isGlossary = chunk.source === "glossary";

  // Forum match — only the legal-workflow guides earn the forum bonus, so a
  // template or summary that merely names the forum can't outrank the actual
  // procedure document on its own topic.
  if (chunk.category === "legal") {
    for (const f of q.forums) {
      if (titleHay.includes(f)) s += W.forumTitle;
      else if (chunk.keywords.includes(f)) s += W.forumKeyword;
    }
  }

  // Loan type.
  if (q.loanType && (titleHay.includes(q.loanType) || chunk.keywords.includes(q.loanType))) {
    s += W.loanType;
  }

  // Tag overlap.
  for (const t of q.tags) if (chunkHasTag(chunk, t)) s += W.tag;

  // Keyword overlap (some keywords are boosted x2 for this case).
  for (const k of q.keywords) {
    if (chunk.keywords.includes(k)) s += q.boosts.has(k) ? 2 : W.keyword;
  }

  // Document-type overlap.
  for (const d of q.docTypes) if (chunk.keywords.includes(d)) s += W.docType;

  // Section heading exactly matches a query term (helps glossary entries like "DPD").
  const sectionTerm = lc(chunk.section).trim();
  if (sectionTerm && q.keywords.has(sectionTerm)) s += W.sectionTerm;

  // A glossary entry naming a core case attribute (the case's DPD, loan type,
  // security) is highly relevant — surface it over incidental glossary hits.
  if (isGlossary && sectionTerm && q.coreTerms.has(sectionTerm)) s += W.coreGlossary;

  // The demand notice is the default first formal recovery instrument — give the
  // demand-notice template a baseline edge so it is the template of record.
  if (chunk.category === "templates" && chunkHasTag(chunk, "demand-notice")) {
    s += W.demandDefault;
  }

  return s;
}

/**
 * Rank and select the top k chunks. Selection is category-aware: we want a
 * diverse set — a legal forum, RBI rules, a template, a glossary entry, a
 * practitioner case — not five sections of one document. We pick the best from
 * each category in CATEGORY_SEQUENCE order, then fill any remaining slots with
 * the next-highest-scoring chunks globally. Deduped by document title.
 * Deterministic: ties break by id.
 */
export function rankChunks(chunks: Chunk[], q: Query, k = 5): Chunk[] {
  const scored = chunks
    .map((c) => ({ c, s: scoreChunk(c, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => (b.s !== a.s ? b.s - a.s : a.c.id < b.c.id ? -1 : 1));

  // Dedupe by title, keeping the best-scoring chunk per document.
  const byTitle = new Set<string>();
  const uniq = scored.filter((x) =>
    byTitle.has(x.c.title) ? false : (byTitle.add(x.c.title), true),
  );

  const used = new Set<string>();
  const picks: Chunk[] = [];

  const takeFrom = (cat: string) => {
    const next = uniq.find((x) => x.c.category === cat && !used.has(x.c.id));
    if (next) {
      used.add(next.c.id);
      picks.push(next.c);
    }
  };

  for (const cat of CATEGORY_SEQUENCE) {
    if (picks.length >= k) break;
    takeFrom(cat);
  }
  // Fill remaining slots by global score.
  for (const x of uniq) {
    if (picks.length >= k) break;
    if (!used.has(x.c.id)) {
      used.add(x.c.id);
      picks.push(x.c);
    }
  }
  return picks.slice(0, k);
}

// ---- Markdown chunking ------------------------------------------------------

export type FrontMatter = {
  title: string;
  tags: string[];
  source: string;
};

/** Minimal frontmatter parser — handles `title:`, `tags: [a, b]` / list, `source:`. */
export function parseFrontMatter(md: string): { meta: FrontMatter; body: string } {
  const meta: FrontMatter = { title: "", tags: [], source: "" };
  if (!md.startsWith("---")) return { meta, body: md };
  const end = md.indexOf("\n---", 3);
  if (end === -1) return { meta, body: md };
  const fm = md.slice(3, end);
  const body = md.slice(end + 4);

  for (const raw of fm.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("title:")) meta.title = line.slice(6).trim();
    else if (line.startsWith("source:")) meta.source = line.slice(7).trim();
    else if (line.startsWith("tags:")) {
      const v = line.slice(5).trim();
      const inner = v.replace(/^\[/, "").replace(/\]$/, "");
      meta.tags = inner
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }
  return { meta, body };
}

const MAX_CHUNK = 1500;

/** Split one markdown document into section chunks. */
export function chunkMarkdown(relPath: string, md: string): Chunk[] {
  const { meta, body } = parseFrontMatter(md);
  const title = meta.title || relPath;

  // Split on level-2 headings.
  const parts = body.split(/\n(?=## )/);
  const chunks: Chunk[] = [];
  parts.forEach((part, i) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const headingMatch = trimmed.match(/^##\s+(.*)/);
    const section = headingMatch ? headingMatch[1].trim() : "";
    const text = trimmed.slice(0, MAX_CHUNK);
    chunks.push({
      id: `${relPath}#${i}`,
      source: meta.source || relPath,
      category: categoryOf(relPath),
      title,
      section,
      tags: meta.tags,
      text,
      keywords: extractKeywords(`${title} ${section} ${meta.tags.join(" ")} ${text}`),
    });
  });
  return chunks;
}

/** Convert a glossary.json `terms` map into one chunk per term. */
export function chunkGlossary(glossary: {
  terms: Record<string, { definition: string; importance: string; related_terms?: string[] }>;
}): Chunk[] {
  return Object.entries(glossary.terms).map(([term, entry]) => {
    const text = `${entry.definition} ${entry.importance}`;
    const tags = ["glossary", ...(entry.related_terms ?? [])];
    return {
      id: `glossary#${term}`,
      source: "glossary",
      category: "glossary",
      title: `Glossary: ${term}`,
      section: term,
      tags,
      text,
      keywords: extractKeywords(`${term} ${text} ${tags.join(" ")}`),
    };
  });
}
