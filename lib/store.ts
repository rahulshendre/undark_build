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
