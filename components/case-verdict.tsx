import type { Case, Forum } from "@/packages/domain";
import { Badge, toneForConfidence } from "@/components/ui/badge";
import { formatINR, cn } from "@/lib/utils";
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

function Chip({
  href,
  n,
  label,
  tone,
}: {
  href: string;
  n: number;
  label: string;
  tone: "critical" | "warn";
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium transition-colors",
        tone === "critical"
          ? "border-critical/30 text-critical hover:bg-critical/5"
          : "border-warn/30 text-warn hover:bg-warn/5",
      )}
    >
      <span className="tnum">{n}</span>
      <span className="uppercase tracking-wide">{label}</span>
    </a>
  );
}

/**
 * The payoff, surfaced first. The recommended action with its reasoning, plus
 * quick-scan chips that jump to the items the practitioner must clear, plus the
 * draft-notice action. An accent edge marks it as the answer.
 */
export function CaseVerdict({ c }: { c: Case }) {
  const a = c.next_action;
  const hasRange =
    a.estimated_settlement_min != null || a.estimated_settlement_max != null;

  const blocking = c.missing_docs?.filter((d) => d.blocking).length ?? 0;
  const riskCount = c.risks?.length ?? 0;
  const complianceIssues =
    c.compliance_flags?.filter(
      (f) => f.status === "violation" || f.status === "attention",
    ).length ?? 0;
  const hasChips = blocking > 0 || riskCount > 0 || complianceIssues > 0;

  return (
    <div className="print-block rounded-lg border border-l-2 border-border border-l-accent bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">
          Recommended next action
        </p>
        <Badge tone={toneForConfidence(a.confidence)}>
          {a.confidence} confidence
        </Badge>
      </div>

      <p className="mt-2 text-sm font-medium leading-relaxed">{a.action}</p>

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

      <p className="mt-3 text-sm leading-relaxed">
        <span className="text-faint">Why: </span>
        {a.why}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        <span className="text-faint">Confidence: </span>
        {a.confidence_reason}
      </p>

      {hasChips && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-faint">
            Clear first
          </span>
          {blocking > 0 && (
            <Chip href="#missing" n={blocking} label="blocking" tone="critical" />
          )}
          {riskCount > 0 && (
            <Chip
              href="#risks"
              n={riskCount}
              label={riskCount > 1 ? "risks" : "risk"}
              tone="warn"
            />
          )}
          {complianceIssues > 0 && (
            <Chip
              href="#compliance"
              n={complianceIssues}
              label="compliance"
              tone="warn"
            />
          )}
        </div>
      )}

      <div className="no-print mt-4">
        <NoticeGenerator caseId={c.id} initialDraft={c.notice_draft} />
      </div>
    </div>
  );
}
