import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Case } from "@/packages/domain";
import { getSupabase } from "@/lib/supabase";

// Persistence with a graceful fallback:
//   - Supabase configured  -> table `cases` (jsonb).
//   - Otherwise             -> local JSON files under .data/cases/.
// Same interface either way, so the rest of the app never branches on this.

const LOCAL_DIR = path.join(process.cwd(), ".data", "cases");

async function localSave(c: Case): Promise<void> {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(
    path.join(LOCAL_DIR, `${c.id}.json`),
    JSON.stringify(c, null, 2),
    "utf-8",
  );
}

async function localGet(id: string): Promise<Case | null> {
  try {
    const raw = await fs.readFile(path.join(LOCAL_DIR, `${id}.json`), "utf-8");
    return JSON.parse(raw) as Case;
  } catch {
    return null;
  }
}

export async function saveCase(c: Case): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return localSave(c);

  const { error } = await supabase
    .from("cases")
    .upsert({ id: c.id, created_at: c.created_at, data: c });
  if (error) throw new Error(`supabase save failed: ${error.message}`);
}

export async function getCase(id: string): Promise<Case | null> {
  const supabase = getSupabase();
  if (!supabase) return localGet(id);

  const { data, error } = await supabase
    .from("cases")
    .select("data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`supabase read failed: ${error.message}`);
  return (data?.data as Case) ?? null;
}

/** Lightweight row for listings — never ship a full Case to a list view. */
export type CaseSummaryRow = Pick<
  Case,
  | "id"
  | "borrower_name"
  | "loan_amount_outstanding"
  | "dpd"
  | "loan_type"
  | "created_at"
>;

function toRow(c: Case): CaseSummaryRow {
  return {
    id: c.id,
    borrower_name: c.borrower_name,
    loan_amount_outstanding: c.loan_amount_outstanding,
    dpd: c.dpd,
    loan_type: c.loan_type,
    created_at: c.created_at,
  };
}

async function localList(): Promise<CaseSummaryRow[]> {
  try {
    const files = await fs.readdir(LOCAL_DIR);
    const rows: CaseSummaryRow[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(LOCAL_DIR, f), "utf-8");
        rows.push(toRow(JSON.parse(raw) as Case));
      } catch {
        // skip unreadable/corrupt files rather than fail the whole list
      }
    }
    return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  } catch {
    return [];
  }
}

/** Most-recent cases first. Used by the home screen so work stays reachable. */
export async function listCases(limit = 8): Promise<CaseSummaryRow[]> {
  const supabase = getSupabase();
  if (!supabase) return (await localList()).slice(0, limit);

  const { data, error } = await supabase
    .from("cases")
    .select("data")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`supabase list failed: ${error.message}`);
  return (data ?? []).map((r) => toRow(r.data as Case));
}
