import type { DocumentStatus } from "@/packages/domain";
import { Badge } from "@/components/ui/badge";

export function MissingDocs({ docs }: { docs: DocumentStatus[] }) {
  if (!docs?.length) {
    return <p className="text-sm text-muted">Nothing flagged as missing.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {docs.map((d, i) => (
        <li key={i} className="flex items-start gap-3">
          <Badge tone={d.blocking ? "critical" : "warn"} className="mt-0.5">
            {d.blocking ? "blocking" : "needed"}
          </Badge>
          <div>
            <p className="text-sm font-medium">{d.document}</p>
            <p className="text-xs text-muted">{d.why_needed}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
