// Disk loader for the knowledge corpus. Reads markdown + glossary from
// knowledge/ at runtime and builds the chunk list once (cached).
//
// No server-only guard here on purpose: it uses node:fs (server/test only by
// nature) and the retrieval tests import it directly under tsx/node.

import fs from "node:fs";
import path from "node:path";
import { chunkMarkdown, chunkGlossary, type Chunk } from "./corpus";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");

// Meta files / folders that are instructions, not retrievable knowledge.
const SKIP_BASENAMES = new Set(["README.md", "index.md"]);

function isSkippedDir(rel: string): boolean {
  const top = rel.split(path.sep)[0];
  // retrieval/, examples/ = docs. generated/, chunks/ = the offline ingestion
  // tool's output, surfaced only in the dev Knowledge Explorer — not wired into
  // live retrieval yet, so the retrieval engine behaves exactly as before.
  return (
    top === "retrieval" ||
    top === "examples" ||
    top === "generated" ||
    top === "chunks"
  );
}

/** Recursively collect markdown files under knowledge/, minus meta files. */
function walkMarkdown(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(base, abs);
    if (entry.isDirectory()) {
      out.push(...walkMarkdown(abs, base));
    } else if (entry.name.endsWith(".md")) {
      if (SKIP_BASENAMES.has(entry.name)) continue;
      if (isSkippedDir(rel)) continue;
      out.push(abs);
    }
  }
  return out;
}

let cache: Chunk[] | null = null;

/** Load (and cache) all knowledge chunks from disk. */
export function loadChunks(): Chunk[] {
  if (cache) return cache;
  const chunks: Chunk[] = [];

  // Markdown documents (rbi/, legal/, templates/, practitioner/*, sources/**.summary.md).
  for (const abs of walkMarkdown(KNOWLEDGE_DIR, KNOWLEDGE_DIR)) {
    const rel = path.relative(KNOWLEDGE_DIR, abs);
    chunks.push(...chunkMarkdown(rel, fs.readFileSync(abs, "utf-8")));
  }

  // Glossary.
  const glossaryPath = path.join(KNOWLEDGE_DIR, "glossary", "glossary.json");
  if (fs.existsSync(glossaryPath)) {
    const glossary = JSON.parse(fs.readFileSync(glossaryPath, "utf-8"));
    if (glossary?.terms) chunks.push(...chunkGlossary(glossary));
  }

  cache = chunks;
  return chunks;
}

/** Test/dev helper — drop the cache. */
export function _resetCache(): void {
  cache = null;
}
