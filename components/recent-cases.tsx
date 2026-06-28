import Link from "next/link";
import type { CaseSummaryRow } from "@/lib/store";
import { formatINR, orDash } from "@/lib/utils";

const LOAN_LABEL: Record<string, string> = {
  personal: "Personal",
  vehicle: "Vehicle",
  business: "Business",
  gold: "Gold",
  agriculture: "Agriculture",
  unknown: "Loan",
};

/** A way back into work already done — the first thing missing from a one-shot upload. */
export function RecentCases({ cases }: { cases: CaseSummaryRow[] }) {
  return (
    <div className="mt-10">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
        Recent cases
      </h2>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {cases.map((c) => (
          <li key={c.id}>
            <Link
              href={`/case/${c.id}`}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 transition-colors hover:bg-background"
            >
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="truncate text-sm font-medium">
                  {orDash(c.borrower_name)}
                </span>
                <span className="shrink-0 text-xs text-faint">
                  {LOAN_LABEL[c.loan_type] ?? "Loan"}
                </span>
              </span>
              <span className="tnum shrink-0 text-xs text-muted">
                {formatINR(c.loan_amount_outstanding)}
                {c.dpd != null && ` · ${c.dpd} DPD`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
