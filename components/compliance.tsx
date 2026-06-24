import type { ComplianceFlag, ComplianceStatus } from "@/packages/domain";
import { Badge } from "@/components/ui/badge";

const TONE = {
  ok: "ok",
  attention: "warn",
  violation: "critical",
  unknown: "neutral",
} as const satisfies Record<ComplianceStatus, "ok" | "warn" | "critical" | "neutral">;

export function Compliance({ flags }: { flags: ComplianceFlag[] }) {
  if (!flags?.length) {
    return <p className="text-sm text-muted">No compliance checks returned.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {flags.map((f, i) => (
        <li key={i} className="flex items-start gap-3">
          <Badge tone={TONE[f.status]} className="mt-0.5">
            {f.status}
          </Badge>
          <div>
            <p className="text-sm font-medium">{f.rule}</p>
            <p className="text-xs text-muted">{f.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
