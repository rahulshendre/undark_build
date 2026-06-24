export function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-6">
      <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
        {title}
        {count != null && <span className="text-faint/70">· {count}</span>}
      </h2>
      {children}
    </section>
  );
}
