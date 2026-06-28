export function Section({
  title,
  count,
  id,
  children,
}: {
  title: string;
  count?: number;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 border-t border-border py-6">
      <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
        {title}
        {count != null && <span className="text-faint/70">· {count}</span>}
      </h2>
      {children}
    </section>
  );
}
