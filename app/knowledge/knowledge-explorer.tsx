"use client";

import { useMemo, useState } from "react";
import type {
  ExplorerDoc,
  ExplorerChunk,
  CaseDebug,
  DebugChunk,
} from "@/lib/knowledge/explorer";

type Selection =
  | { kind: "doc"; key: string }
  | { kind: "case"; id: string }
  | null;

export function KnowledgeExplorer({
  docs,
  cases,
  categoryOrder,
}: {
  docs: ExplorerDoc[];
  cases: CaseDebug[];
  categoryOrder: string[];
}) {
  const [sel, setSel] = useState<Selection>(
    docs.length ? { kind: "doc", key: docs[0].key } : null,
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, ExplorerDoc[]>();
    for (const cat of categoryOrder) map.set(cat, []);
    for (const d of docs) {
      if (!map.has(d.category)) map.set(d.category, []);
      map.get(d.category)!.push(d);
    }
    return map;
  }, [docs, categoryOrder]);

  const totalChunks = useMemo(
    () => docs.reduce((n, d) => n + d.chunkCount, 0),
    [docs],
  );

  const activeDoc =
    sel?.kind === "doc" ? docs.find((d) => d.key === sel.key) ?? null : null;
  const activeCase =
    sel?.kind === "case" ? cases.find((c) => c.id === sel.id) ?? null : null;

  return (
    <div className="flex h-screen w-full overflow-hidden text-sm">
      {/* Sidebar */}
      <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold tracking-tight">
              Knowledge Explorer
            </span>
            <span className="rounded bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-faint">
              dev
            </span>
          </div>
          <p className="mt-1 text-[11px] text-faint">
            {docs.length} docs · {totalChunks} chunks · read-only
          </p>
        </div>

        {Array.from(byCategory.entries()).map(([cat, items]) => (
          <div key={cat} className="px-2 py-2">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
              {cat}
            </div>
            {items.length === 0 ? (
              <div className="px-2 py-1 text-[11px] italic text-faint/70">
                not yet ingested
              </div>
            ) : (
              items.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setSel({ kind: "doc", key: d.key })}
                  className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-[13px] leading-tight transition-colors hover:bg-foreground/5 ${
                    activeDoc?.key === d.key
                      ? "bg-accent/10 text-accent"
                      : "text-foreground"
                  }`}
                >
                  <span className="truncate">{shortTitle(d.title)}</span>
                  <span className="shrink-0 text-[10px] text-faint tnum">
                    {d.chunkCount}
                  </span>
                </button>
              ))
            )}
          </div>
        ))}

        {/* Retrieval debug section */}
        <div className="mt-auto border-t border-border px-2 py-2">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
            Retrieval Debug
          </div>
          {cases.length === 0 ? (
            <div className="px-2 py-1 text-[11px] italic text-faint/70">
              no processed cases
            </div>
          ) : (
            cases.map((c) => (
              <button
                key={c.id}
                onClick={() => setSel({ kind: "case", id: c.id })}
                className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-[13px] transition-colors hover:bg-foreground/5 ${
                  activeCase?.id === c.id
                    ? "bg-accent/10 text-accent"
                    : "text-foreground"
                }`}
              >
                <span className="truncate font-mono text-[11px]">{c.id}</span>
                <span className="shrink-0 text-[10px] text-faint">
                  {c.facts.loan_type}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 overflow-y-auto bg-background px-8 py-6">
        {activeDoc && <DocView doc={activeDoc} />}
        {activeCase && <CaseView c={activeCase} />}
        {!activeDoc && !activeCase && (
          <p className="text-faint">Select a document or a case.</p>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document view
// ---------------------------------------------------------------------------

function DocView({ doc }: { doc: ExplorerDoc }) {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-lg font-semibold tracking-tight">{doc.title}</h1>

      <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1.5 sm:grid-cols-3">
        <Meta label="Source" value={doc.source} mono />
        <Meta label="Category" value={doc.category} />
        <Meta label="Importance" value={`${doc.importance} / 5`} />
        <Meta label="Document type" value={doc.documentType} mono />
        <Meta label="Chunks" value={String(doc.chunkCount)} />
      </dl>

      <Section title={`Keywords (${doc.keywords.length})`}>
        <div className="flex flex-wrap gap-1.5">
          {doc.keywords.map((k) => (
            <Tag key={k}>{k}</Tag>
          ))}
        </div>
      </Section>

      <Section title="Generated markdown">
        {doc.markdown ? (
          <>
            <pre className="max-h-96 overflow-auto rounded border border-border bg-surface p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono text-muted">
              {doc.markdown}
            </pre>
            {doc.markdownTruncated && (
              <p className="mt-1 text-[11px] italic text-faint">
                Markdown truncated for display.
              </p>
            )}
          </>
        ) : (
          <p className="text-[12px] italic text-faint">
            No generated markdown on disk for this document.
          </p>
        )}
      </Section>

      <Section title={`Chunk inspector (${doc.chunks.length})`}>
        <div className="flex flex-col gap-3">
          {doc.chunks.map((ch) => (
            <ChunkCard key={ch.id} chunk={ch} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function ChunkCard({ chunk }: { chunk: ExplorerChunk }) {
  return (
    <div className="rounded border border-border bg-surface p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] text-accent">{chunk.id}</span>
        <span className="shrink-0 text-[10px] text-faint">
          imp {chunk.importance} · {chunk.wordCount} words
        </span>
      </div>
      <div className="mt-1 text-[12px] font-medium text-foreground">
        {chunk.heading}
      </div>
      {chunk.keywords.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {chunk.keywords.map((k) => (
            <Tag key={k} small>
              {k}
            </Tag>
          ))}
        </div>
      )}
      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[12px] leading-relaxed text-muted">
        {chunk.text}
      </pre>
      <div className="mt-1.5 text-[10px] text-faint">source: {chunk.source}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Case / retrieval-debug view
// ---------------------------------------------------------------------------

function CaseView({ c }: { c: CaseDebug }) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-2">
        <h1 className="font-mono text-base font-semibold tracking-tight">
          {c.id}
        </h1>
        <span className="rounded bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-faint">
          retrieval debug
        </span>
      </div>
      <p className="mt-1 text-[13px] text-muted">{c.summary}</p>

      <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1.5 sm:grid-cols-3">
        <Meta label="Loan type" value={c.facts.loan_type} />
        <Meta label="Security" value={c.facts.security} />
        <Meta label="State" value={c.facts.state ?? "—"} />
        <Meta label="DPD" value={c.facts.dpd != null ? String(c.facts.dpd) : "—"} />
        <Meta
          label="Outstanding"
          value={
            c.facts.loan_amount_outstanding != null
              ? `₹${c.facts.loan_amount_outstanding.toLocaleString("en-IN")}`
              : "—"
          }
        />
        <Meta label="Recommendation" value={c.recommendation ?? "—"} />
      </dl>

      <p className="mt-4 rounded border border-border bg-surface px-3 py-2 text-[11px] text-faint">
        These are the chunks the live retrieval engine returns for this case&apos;s
        facts (deterministic — same facts, same chunks). Scores and matched terms
        come from the existing scoring functions. This is the transparency layer
        behind &ldquo;why did Undark recommend {c.recommendation ?? "this"}?&rdquo;
      </p>

      <Section title={`Last retrieved chunks (${c.retrieved.length})`}>
        <div className="flex flex-col gap-3">
          {c.retrieved.map((d) => (
            <DebugCard key={`${d.rank}-${d.title}-${d.section}`} d={d} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function DebugCard({ d }: { d: DebugChunk }) {
  return (
    <div className="rounded border border-border bg-surface p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-medium text-foreground">
          <span className="mr-2 text-faint tnum">#{d.rank}</span>
          {d.title}
          {d.section ? (
            <span className="text-muted"> — {d.section}</span>
          ) : null}
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-accent tnum">
          score {d.score}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[10px] text-faint">
        <span className="rounded bg-foreground/5 px-1.5 py-0.5 uppercase tracking-wide">
          {d.category}
        </span>
      </div>
      {d.matched.length > 0 && (
        <div className="mt-1.5">
          <span className="text-[10px] uppercase tracking-wider text-faint">
            why matched:{" "}
          </span>
          <span className="inline-flex flex-wrap gap-1 align-middle">
            {d.matched.map((m) => (
              <Tag key={m} small>
                {m}
              </Tag>
            ))}
          </span>
        </div>
      )}
      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[12px] leading-relaxed text-muted">
        {d.text}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small primitives
// ---------------------------------------------------------------------------

function Meta({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-faint">
        {label}
      </dt>
      <dd className={`text-[12px] text-foreground ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Tag({
  children,
  small,
}: {
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <span
      className={`rounded border border-border bg-background text-muted ${
        small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"
      }`}
    >
      {children}
    </span>
  );
}

function shortTitle(t: string): string {
  return t.length > 34 ? t.slice(0, 33) + "…" : t;
}
