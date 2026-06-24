import "server-only";
import type { ExtractedCase } from "@/packages/domain";
import { buildQuery, rankChunks, type Chunk } from "./knowledge/corpus";
import { loadChunks } from "./knowledge/load";

// Knowledge retrieval — the "retrieve before reason" step.
//
// Deterministic keyword/tag scoring over the knowledge/ corpus. No embeddings,
// no vector store, no external service. Same facts → same chunks, every time.
// See lib/knowledge/corpus.ts for the scoring; lib/knowledge/load.ts for disk
// loading; knowledge/retrieval/README.md for the design.

export type KnowledgeSnippet = {
  source: string; // citeable document title (+ section)
  text: string;
};

function toSnippet(chunk: Chunk): KnowledgeSnippet {
  const source = chunk.section
    ? `${chunk.title} — ${chunk.section}`
    : chunk.title;
  return { source, text: chunk.text };
}

/** Retrieve the top reference chunks relevant to a case. */
export async function retrieve(
  facts: ExtractedCase,
  k = 5,
): Promise<KnowledgeSnippet[]> {
  const chunks = loadChunks();
  const query = buildQuery(facts);
  return rankChunks(chunks, query, k).map(toSnippet);
}

/** Render snippets for prompt injection. Empty input -> empty string. */
export function formatKnowledge(snippets: KnowledgeSnippet[]): string {
  if (snippets.length === 0) return "";
  const body = snippets
    .map((s, i) => `[${i + 1}] ${s.source}\n${s.text}`)
    .join("\n\n");
  return [
    "Relevant reference material retrieved from Undark's knowledge base.",
    "Prefer this over your own prior knowledge. Cite these document titles when you rely on them. Do not invent regulations, section numbers, or thresholds beyond what appears here.",
    "",
    body,
  ].join("\n");
}
