import type { Risk } from "@/packages/domain";
import { Badge, toneForSignificance } from "@/components/ui/badge";

export function Risks({ risks }: { risks: Risk[] }) {
  if (!risks?.length) {
    return <p className="text-sm text-muted">No inconsistencies found.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {risks.map((r, i) => (
        <li key={i} className="flex items-start gap-3">
          <Badge tone={toneForSignificance(r.severity)} className="mt-0.5">
            {r.severity}
          </Badge>
          <div>
            <p className="text-sm font-medium">{r.issue}</p>
            <p className="text-xs text-muted">{r.evidence}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
