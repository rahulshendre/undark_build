import Link from "next/link";
import { notFound } from "next/navigation";
import { getCase } from "@/lib/store";
import { CaseSummary } from "@/components/case-summary";
import { Timeline } from "@/components/timeline";
import { MissingDocs } from "@/components/missing-docs";
import { Risks } from "@/components/risks";
import { Compliance } from "@/components/compliance";
import { NextAction } from "@/components/next-action";
import { Section } from "@/components/ui/section";

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-24">
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Undark
        </Link>
        <span className="text-xs tnum text-faint">
          Case #{c.id} · {c.documents_uploaded.length} docs
        </span>
      </header>

      <CaseSummary c={c} />

      <Section title="Timeline" count={c.timeline?.length}>
        <Timeline events={c.timeline} />
      </Section>

      <Section title="Missing information" count={c.missing_docs?.length}>
        <MissingDocs docs={c.missing_docs} />
      </Section>

      <Section title="Risks & inconsistencies" count={c.risks?.length}>
        <Risks risks={c.risks} />
      </Section>

      <Section title="Compliance" count={c.compliance_flags?.length}>
        <Compliance flags={c.compliance_flags} />
      </Section>

      <Section title="Recommended next action">
        <NextAction c={c} />
      </Section>
    </main>
  );
}
