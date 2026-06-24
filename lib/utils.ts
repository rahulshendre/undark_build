import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes without conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Short, sortable, human-typable id. e.g. "k3f9a2". Good enough for V0. */
export function newId(): string {
  return (
    Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 6)
  );
}

/** Format an INR amount. null -> em dash. */
export function formatINR(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Show a value or an em dash if missing. */
export function orDash(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  return String(value);
}
