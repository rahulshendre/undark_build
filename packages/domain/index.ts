// Undark — shared domain types.
//
// One place for the vocabulary every layer agrees on: the API route, the AI
// helpers, the store, and the UI all import from here. Business logic never
// redefines these inline.
//
// A "Case" is one defaulted loan file. The AI produces two things from the
// uploaded documents: structured facts (ExtractedCase) and an analyst's read
// on them (CaseAnalysis). A Case is the union of both, plus metadata.

export type LoanType =
  | "personal"
  | "vehicle"
  | "business"
  | "gold"
  | "agriculture"
  | "unknown";

export type Security = "secured" | "unsecured" | "unknown";

export type Forum =
  | "lok_adalat"
  | "permanent_lok_adalat"
  | "civil_court"
  | "summary_suit"
  | "section_138_ni_act"
  | "drt"
  | "sarfaesi"
  | null;

export type Significance = "normal" | "important" | "critical";

export type Confidence = "high" | "medium" | "low";

export type CaseStatus = "processing" | "ready" | "error";

/** One event on the reconstructed case timeline. */
export type TimelineEvent = {
  date: string; // ISO-ish or free text the model found; we do not invent dates
  event: string;
  significance: Significance;
};

/** A document or piece of information the case needs but does not yet have. */
export type DocumentStatus = {
  document: string;
  blocking: boolean; // true => can't reasonably proceed without it
  why_needed: string;
};

/** An inconsistency or red flag found across the documents. */
export type Risk = {
  issue: string;
  severity: Significance;
  evidence: string;
};

/** The one practical next step, with reasoning and honest confidence. */
export type NextAction = {
  action: string;
  forum: Forum;
  why: string;
  estimated_settlement_min: number | null;
  estimated_settlement_max: number | null;
  estimated_days: number | null;
  confidence: Confidence;
  confidence_reason: string;
};

/** Structured facts pulled straight out of the documents. Nulls are honest. */
export type ExtractedCase = {
  borrower_name: string | null;
  loan_amount_original: number | null;
  loan_amount_outstanding: number | null;
  loan_type: LoanType;
  dpd: number | null;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  security: Security;
  state: string | null;
  lender_name: string | null;
  previous_notices: string[];
  previous_calls: number | null;
  key_events: { date: string; event: string }[];
  documents_present: string[];
  potential_missing_documents: string[];
};

/** The analyst's read on the extracted facts. */
export type CaseAnalysis = {
  summary_one_line: string;
  timeline: TimelineEvent[];
  missing_docs: DocumentStatus[];
  risks: Risk[];
  next_action: NextAction;
};

/** A persisted case: facts + analysis + metadata. */
export type Case = ExtractedCase &
  CaseAnalysis & {
    id: string;
    created_at: string;
    status: CaseStatus;
    documents_uploaded: string[];
    notice_draft: string | null;
  };

/** Notice types the draft generator knows how to produce. */
export type NoticeType =
  | "pre_litigation_lok_adalat"
  | "demand_notice"
  | "section_138_ni_act";

export const NOTICE_LABELS: Record<NoticeType, string> = {
  pre_litigation_lok_adalat: "Pre-litigation (Lok Adalat)",
  demand_notice: "Demand Notice",
  section_138_ni_act: "Section 138 NI Act Notice",
};
