// Deterministic retrieval tests. Run: `npm run test:retrieval`.
//
// No test framework — pure assertions over the real knowledge corpus. Imports
// the pure core + disk loader directly (no server-only), so it runs under tsx.

import type { ExtractedCase } from "@/packages/domain";
import { buildQuery, rankChunks } from "./corpus";
import { loadChunks } from "./load";

const BASE: ExtractedCase = {
  borrower_name: null,
  loan_amount_original: null,
  loan_amount_outstanding: null,
  loan_type: "unknown",
  dpd: null,
  last_payment_date: null,
  last_payment_amount: null,
  security: "unknown",
  state: null,
  lender_name: null,
  previous_notices: [],
  previous_calls: null,
  key_events: [],
  documents_present: [],
  potential_missing_documents: [],
};

function facts(p: Partial<ExtractedCase>): ExtractedCase {
  return { ...BASE, ...p };
}

function retrieveTitles(f: ExtractedCase): string[] {
  return rankChunks(loadChunks(), buildQuery(f), 5).map(
    (c) => `${c.title}${c.section ? " — " + c.section : ""}`,
  );
}

let failures = 0;
function check(name: string, titles: string[], expected: RegExp[]) {
  const missing = expected.filter((re) => !titles.some((t) => re.test(t)));
  if (missing.length === 0) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}`);
    console.log(`      missing: ${missing.map((re) => re.source).join(", ")}`);
    console.log(`      got top-5:`);
    titles.forEach((t, i) => console.log(`        ${i + 1}. ${t}`));
  }
}

// --- Case 1: ₹45k unsecured personal loan, 94 DPD, Maharashtra ---------------
const case1 = facts({
  loan_type: "personal",
  security: "unsecured",
  loan_amount_outstanding: 45000,
  dpd: 94,
  state: "Maharashtra",
  documents_present: ["Loan Agreement", "Bank Statement"],
});
check("case1 unsecured personal 45k/94dpd", retrieveTitles(case1), [
  /lok adalat/i,
  /communication/i,
  /demand notice/i,
  /glossary: dpd/i,
]);

// --- Case 2: ₹8 lakh secured vehicle loan ------------------------------------
const case2 = facts({
  loan_type: "vehicle",
  security: "secured",
  loan_amount_outstanding: 800000,
  documents_present: ["Loan Agreement", "Hypothecation"],
});
check("case2 secured vehicle 8L", retrieveTitles(case2), [
  /sarfaesi/i,
  /fair practices/i,
  /recovery agent/i,
]);

console.log(failures === 0 ? "\nAll retrieval tests passed." : `\n${failures} test(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
