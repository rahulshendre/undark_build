import { cn } from "@/lib/utils";
import type { Significance, Confidence } from "@/packages/domain";

const tones = {
  neutral: "border-border-strong text-muted",
  ok: "border-ok/30 text-ok",
  warn: "border-warn/30 text-warn",
  critical: "border-critical/30 text-critical",
} as const;

type Tone = keyof typeof tones;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Map a timeline/risk significance to a badge tone. */
export function toneForSignificance(s: Significance): Tone {
  return s === "critical" ? "critical" : s === "important" ? "warn" : "neutral";
}

/** Map a confidence level to a badge tone. */
export function toneForConfidence(c: Confidence): Tone {
  return c === "high" ? "ok" : c === "medium" ? "warn" : "critical";
}
