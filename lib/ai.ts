import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type {
  ExtractedCase,
  CaseAnalysis,
  NoticeType,
} from "@/packages/domain";
import { NOTICE_LABELS } from "@/packages/domain";
import {
  DOCUMENT_EXTRACTION_PROMPT,
  CASE_ANALYSIS_PROMPT,
  NOTICE_DRAFT_PROMPT,
  fillPrompt,
} from "@/lib/prompts";
import { retrieve, formatKnowledge } from "@/lib/retrieve";

// One model constant for the whole app. Flip this single line to trade cost
// for capability:
//   claude-opus-4-8   — most capable (default). $5 / $25 per 1M tokens.
//   claude-sonnet-4-6 — balanced.            $3 / $15 per 1M tokens.
//   claude-haiku-4-5  — cheapest/fastest.    $1 / $5  per 1M tokens.
// For high-volume per-case extraction you may want haiku/sonnet here; keep
// analysis on opus. Measured first, then decide.
export const MODEL = "claude-opus-4-8";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

/** Pull the first text block out of a response. */
function textOf(message: Anthropic.Message): string {
  for (const block of message.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

/** Tolerantly parse JSON the model returned (strips ``` fences, trims slop). */
function parseJSON<T>(raw: string): T {
  let s = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` fences if present.
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  // Fall back to the outermost braces.
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1) s = s.slice(first, last + 1);
  return JSON.parse(s) as T;
}

/** One model call. Adaptive thinking — extraction/analysis benefit from it. */
async function complete(prompt: string, maxTokens = 4000): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: prompt }],
  });
  return textOf(message);
}

/** Step 1 — structured facts out of the combined document text. */
export async function extractCase(documentText: string): Promise<ExtractedCase> {
  const raw = await complete(
    `${DOCUMENT_EXTRACTION_PROMPT}\n\nDocuments:\n${documentText}`,
    4000,
  );
  return parseJSON<ExtractedCase>(raw);
}

/** Step 2 — retrieve reference material, then the analyst's read on the facts. */
export async function analyzeCase(
  facts: ExtractedCase,
): Promise<CaseAnalysis> {
  // Retrieve-before-reason seam. V0 returns nothing, so KNOWLEDGE is empty and
  // analysis is unchanged; a real corpus plugs in here without touching this.
  const knowledge = await retrieve(facts);
  const prompt = fillPrompt(CASE_ANALYSIS_PROMPT, {
    CASE_DATA: JSON.stringify(facts, null, 2),
    KNOWLEDGE: formatKnowledge(knowledge),
  });
  const raw = await complete(prompt, 5000);
  return parseJSON<CaseAnalysis>(raw);
}

/** Step 3 — an editable notice draft. Human always reviews before sending. */
export async function draftNotice(
  facts: ExtractedCase,
  type: NoticeType,
): Promise<string> {
  const prompt = fillPrompt(NOTICE_DRAFT_PROMPT, {
    CASE_DATA: JSON.stringify(facts, null, 2),
    NOTICE_TYPE: NOTICE_LABELS[type],
  });
  return (await complete(prompt, 3000)).trim();
}
