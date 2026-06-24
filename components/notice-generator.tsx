"use client";

import { useState } from "react";
import { Loader2, X, AlertTriangle } from "lucide-react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { Button } from "@/components/ui/button";
import { NOTICE_LABELS, type NoticeType } from "@/packages/domain";

const NOTICE_OPTIONS = Object.entries(NOTICE_LABELS) as [NoticeType, string][];

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function toDocxBlob(text: string): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        children: text.split("\n").map(
          (line) =>
            new Paragraph({ children: [new TextRun(line)] }),
        ),
      },
    ],
  });
  return Packer.toBlob(doc);
}

export function NoticeGenerator({
  caseId,
  initialDraft,
}: {
  caseId: string;
  initialDraft: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<NoticeType>("pre_litigation_lok_adalat");
  const [draft, setDraft] = useState(initialDraft ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, noticeType: type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Draft failed.");
      setDraft(json.text);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Generate draft notice
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">Draft notice</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-faint hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex flex-col gap-3 overflow-y-auto p-4">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as NoticeType)}
                  className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm"
                >
                  {NOTICE_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <Button onClick={generate} disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Drafting…
                    </>
                  ) : draft ? (
                    "Regenerate"
                  ) : (
                    "Generate"
                  )}
                </Button>
              </div>

              {error && <p className="text-sm text-critical">{error}</p>}

              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="The generated notice will appear here — fully editable before you download."
                className="h-72 w-full resize-y rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed"
              />

              <div className="flex items-start gap-2 rounded-md border border-warn/30 bg-warn/5 p-2.5 text-xs text-warn">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  AI-generated draft. Review and verify with your legal team
                  before sending. Undark never sends anything itself.
                </p>
              </div>
            </div>

            <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
              <Button
                variant="ghost"
                disabled={!draft}
                onClick={() => navigator.clipboard.writeText(draft)}
              >
                Copy text
              </Button>
              <Button
                variant="outline"
                disabled={!draft}
                onClick={() =>
                  download(
                    new Blob([draft], { type: "text/plain" }),
                    "undark-notice.txt",
                  )
                }
              >
                Download .txt
              </Button>
              <Button
                disabled={!draft}
                onClick={async () =>
                  download(await toDocxBlob(draft), "undark-notice.docx")
                }
              >
                Download .docx
              </Button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
