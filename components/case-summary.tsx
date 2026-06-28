import type { Case } from "@/packages/domain";
import { formatINR, orDash } from "@/lib/utils";
import { Stat } from "@/components/ui/stat";

const LOAN_LABEL: Record<string, string> = {
  personal: "Personal Loan",
  vehicle: "Vehicle Loan",
  business: "Business Loan",
  gold: "Gold Loan",
  agriculture: "Agriculture Loan",
  unknown: "Loan",
};

export function CaseSummary({ c }: { c: Case }) {
  // DPD is the one number that should change color: past 90 days the forum
  // options narrow and limitation pressure rises.
  const dpdTone: "default" | "warn" | "critical" =
    c.dpd == null
      ? "default"
      : c.dpd >= 90
        ? "critical"
        : c.dpd >= 30
          ? "warn"
          : "default";

  return (
    <div className="print-block">
      <h1 className="text-xl font-semibold tracking-tight">
        {orDash(c.borrower_name)}
        <span className="ml-2 font-normal text-muted">
          {LOAN_LABEL[c.loan_type] ?? "Loan"}
        </span>
      </h1>
      <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">
        {c.summary_one_line}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 rounded-lg border border-border bg-surface p-4 sm:grid-cols-3 lg:grid-cols-4">
        <Stat
          label="Outstanding"
          value={formatINR(c.loan_amount_outstanding)}
          emphasis
        />
        <Stat label="DPD" value={orDash(c.dpd)} tone={dpdTone} emphasis />
        <Stat label="Original" value={formatINR(c.loan_amount_original)} />
        <Stat
          label="Security"
          value={c.security === "unknown" ? "—" : c.security}
          mono={false}
        />
        <Stat label="State" value={orDash(c.state)} mono={false} />
        <Stat label="Lender" value={orDash(c.lender_name)} mono={false} />
        <Stat
          label="Last payment"
          value={
            c.last_payment_date
              ? `${c.last_payment_date}${
                  c.last_payment_amount
                    ? ` · ${formatINR(c.last_payment_amount)}`
                    : ""
                }`
              : "—"
          }
        />
        <Stat
          label="Contact history"
          value={`${c.previous_calls ?? 0} calls · ${
            c.previous_notices?.length ?? 0
          } notices`}
        />
      </dl>
    </div>
  );
}
