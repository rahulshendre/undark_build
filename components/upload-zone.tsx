"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt,.csv,.md";

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    setFiles((prev) => {
      const byKey = new Map(prev.map((f) => [f.name + f.size, f]));
      for (const f of Array.from(incoming)) byKey.set(f.name + f.size, f);
      return Array.from(byKey.values());
    });
  }

  function removeFile(target: File) {
    setFiles((prev) => prev.filter((f) => f !== target));
  }

  async function analyse() {
    if (files.length === 0 || busy) return;
    setBusy(true);
    setError(null);

    const body = new FormData();
    for (const f of files) body.append("files", f);

    try {
      const res = await fetch("/api/process", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Processing failed.");
      router.push(`/case/${json.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center transition-colors",
          dragging
            ? "border-accent bg-surface"
            : "border-border-strong bg-surface/60 hover:border-faint",
        )}
      >
        <Upload className="mb-3 h-5 w-5 text-faint" strokeWidth={1.5} />
        <p className="text-sm font-medium">Drop case documents here</p>
        <p className="mt-1 text-xs text-muted">
          PDFs, images, Word docs, WhatsApp exports, bank statements
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
          {files.map((f) => (
            <li
              key={f.name + f.size}
              className="flex items-center justify-between px-3.5 py-2.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText
                  className="h-4 w-4 shrink-0 text-faint"
                  strokeWidth={1.5}
                />
                <span className="truncate">{f.name}</span>
              </span>
              <button
                onClick={() => removeFile(f)}
                className="ml-3 text-faint hover:text-critical"
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-critical">{error}</p>}

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={analyse} disabled={files.length === 0 || busy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Reading documents…
            </>
          ) : (
            "Analyse case"
          )}
        </Button>
        {files.length > 0 && !busy && (
          <span className="text-xs text-muted">
            {files.length} file{files.length > 1 ? "s" : ""} ready
          </span>
        )}
      </div>
    </div>
  );
}
