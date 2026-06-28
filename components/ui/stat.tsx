import { cn } from "@/lib/utils";

type Tone = "default" | "critical" | "warn" | "ok";

const toneClass: Record<Tone, string> = {
  default: "text-foreground",
  critical: "text-critical",
  warn: "text-warn",
  ok: "text-ok",
};

/** A labeled metric — the unit of the case header grid. Dense, tabular, quiet. */
export function Stat({
  label,
  value,
  tone = "default",
  emphasis = false,
  mono = true,
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  emphasis?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-faint">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1",
          emphasis ? "text-lg font-semibold leading-none" : "text-sm",
          mono && "tnum",
          toneClass[tone],
        )}
      >
        {value}
      </dd>
    </div>
  );
}
