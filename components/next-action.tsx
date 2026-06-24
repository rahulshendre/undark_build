import type { Case, Forum } from "@/packages/domain";
import { Badge, toneForConfidence } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { NoticeGenerator } from "@/components/notice-generator";

const FORUM_LABEL: Record<NonNullable<Forum>, string> = {
  lok_adalat: "Lok Adalat",
  permanent_lok_adalat: "Permanent Lok Adalat",
  civil_court: "Civil Court",
  summary_suit: "Summary Suit",
  section_138_ni_act: "Section 138 NI Act",
  drt: "DRT",
  sarfaesi: "SARFAESI",
};

export function NextAction({ c }: { c: Case }) {
  const a = c.next_action;
  const hasRange =
    a.estimated_settlement_min != null || a.estimated_settlement_max != null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{a.action}</p>
        <Badge tone={toneForConfidence(a.confidence)}>
          {a.confidence} confidence
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
        {a.forum && (
          <span>
            <span className="text-faint">Forum: </span>
            {FORUM_LABEL[a.forum]}
          </span>
        )}
        {hasRange && (
          <span className="tnum">
            <span className="text-faint">Settlement: </span>
            {formatINR(a.estimated_settlement_min)} –{" "}
            {formatINR(a.estimated_settlement_max)}
          </span>
        )}
        {a.estimated_days != null && (
          <span className="tnum">
            <span className="text-faint">Est. </span>
            {a.estimated_days} days
          </span>
        )}
      </div>

      <p className="mt-3 text-sm">
        <span className="text-faint">Why: </span>
        {a.why}
      </p>
      <p className="mt-1 text-xs text-muted">
        <span className="text-faint">Confidence: </span>
        {a.confidence_reason}
      </p>

      <div className="mt-4">
        <NoticeGenerator caseId={c.id} initialDraft={c.notice_draft} />
      </div>
    </div>
  );
}
