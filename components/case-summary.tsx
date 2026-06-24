import type { Case } from "@/packages/domain";
import { formatINR, orDash } from "@/lib/utils";

const LOAN_LABEL: Record<string, string> = {
  personal: "Personal Loan",
  vehicle: "Vehicle Loan",
  business: "Business Loan",
  gold: "Gold Loan",
  agriculture: "Agriculture Loan",
  unknown: "Loan",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-faint">{label}</dt>
      <dd className="mt-0.5 text-sm tnum">{value}</dd>
    </div>
  );
}

export function CaseSummary({ c }: { c: Case }) {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">
        {orDash(c.borrower_name)}
        <span className="ml-2 font-normal text-muted">
          {LOAN_LABEL[c.loan_type] ?? "Loan"}
        </span>
      </h1>
      <p className="mt-1 text-sm text-muted">{c.summary_one_line}</p>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="Outstanding" value={formatINR(c.loan_amount_outstanding)} />
        <Field label="Original" value={formatINR(c.loan_amount_original)} />
        <Field label="DPD" value={orDash(c.dpd)} />
        <Field
          label="Security"
          value={c.security === "unknown" ? "—" : c.security}
        />
        <Field label="State" value={orDash(c.state)} />
        <Field label="Lender" value={orDash(c.lender_name)} />
        <Field
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
        <Field
          label="Contact history"
          value={`${c.previous_calls ?? 0} calls · ${
            c.previous_notices?.length ?? 0
          } notices`}
        />
      </dl>
    </div>
  );
}
