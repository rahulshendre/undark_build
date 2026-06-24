import type { TimelineEvent } from "@/packages/domain";
import { Badge, toneForSignificance } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events?.length) {
    return <p className="text-sm text-muted">No events reconstructed.</p>;
  }

  return (
    <ol className="space-y-0">
      {events.map((e, i) => (
        <li key={i} className="flex gap-4 py-2">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                e.significance === "critical"
                  ? "bg-critical"
                  : e.significance === "important"
                    ? "bg-warn"
                    : "bg-border-strong",
              )}
            />
            {i < events.length - 1 && (
              <span className="w-px flex-1 bg-border" />
            )}
          </div>
          <div className="flex-1 pb-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-medium tnum text-muted">
                {e.date}
              </span>
              {e.significance !== "normal" && (
                <Badge tone={toneForSignificance(e.significance)}>
                  {e.significance}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm">{e.event}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
