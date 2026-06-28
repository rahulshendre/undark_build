import Link from "next/link";

/**
 * Persistent app chrome. Same wordmark on every page; each page passes its own
 * `right` slot (case id, doc count, etc). Sticky so the practitioner always has
 * a way home. Hidden in print.
 */
export function TopBar({
  right,
  container = "max-w-3xl",
}: {
  right?: React.ReactNode;
  container?: string;
}) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-sm">
      <div
        className={`mx-auto flex h-12 w-full items-center justify-between px-6 ${container}`}
      >
        <Link
          href="/"
          className="flex items-baseline gap-2 transition-opacity hover:opacity-70"
        >
          <span className="text-sm font-semibold tracking-tight">Undark</span>
          <span className="hidden text-[11px] text-faint sm:inline">
            Case Intelligence
          </span>
        </Link>
        {right}
      </div>
    </header>
  );
}
