import "server-only";
import type { ExtractedCase } from "@/packages/domain";

// Knowledge retrieval seam — the "retrieve before reason" step.
//
// V0 is a deliberate no-op: it returns no snippets, so analysis behaves exactly
// as before. The point is that the architecture already matches the target
// flow — Documents → Extraction → RETRIEVAL → Claude — so when we have a real
// corpus we wire it in here and nothing else moves.
//
// FUTURE: vector search over a curated corpus keyed on the case facts
// (loan_type, state, dpd, security, likely forum):
//   - RBI guidelines & Fair Practices Code
//   - Legal Services Authorities Act (Lok Adalat), SARFAESI, NI Act §138
//   - notice templates
//   - transcribed practitioner examples (the moat)
// We do NOT build this before the uncle session proves few-shot output is
// legally thin — a half-built legal RAG that retrieves the wrong section is
// worse than honest zero-shot, because it breaks "never pretend certainty".

export type KnowledgeSnippet = {
  source: string; // human-readable citation, e.g. "RBI FPC 2025 §6"
  text: string;
};

/** Retrieve reference material relevant to a case. V0: returns nothing. */
export async function retrieve(
  _facts: ExtractedCase,
): Promise<KnowledgeSnippet[]> {
  return [];
}

/** Render snippets for prompt injection. Empty input -> empty string. */
export function formatKnowledge(snippets: KnowledgeSnippet[]): string {
  if (snippets.length === 0) return "";
  const body = snippets
    .map((s) => `[${s.source}]\n${s.text}`)
    .join("\n\n");
  return `Relevant reference material (cite these where they apply; do not invent citations):\n${body}`;
}
