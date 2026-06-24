import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase is OPTIONAL in V0. If the env vars are absent we return null and
// the store falls back to local JSON on disk — so the app runs with zero
// cloud accounts. Set the two vars to persist to Postgres instead.
//
// Table (run once in the Supabase SQL editor):
//   create table cases (
//     id text primary key,
//     created_at timestamptz default now(),
//     data jsonb not null
//   );

let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  cached = url && key ? createClient(url, key) : null;
  return cached;
}
