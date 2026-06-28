import { notFound } from "next/navigation";
import { getCase } from "@/lib/store";
import { CaseSummary } from "@/components/case-summary";
import { CaseVerdict } from "@/components/case-verdict";
import { Timeline } from "@/components/timeline";
import { MissingDocs } from "@/components/missing-docs";
import { Risks } from "@/components/risks";
import { Compliance } from "@/components/compliance";
import { Section } from "@/components/ui/section";
import { TopBar } from "@/components/ui/top-bar";

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();

  return (
    <>
      <TopBar
        right={
          <span className="tnum text-[11px] text-faint">
            Case #{c.id} · {c.documents_uploaded.length} docs
          </span>
        }
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-24 pt-6">
        {/* Header — who and how much, at a glance. */}
        <CaseSummary c={c} />

        {/* The answer, first. Reasoning + jump-chips to what must be cleared. */}
        <div className="mt-5">
          <CaseVerdict c={c} />
        </div>

        {/* Supporting detail, in the order you act on it. */}
        <Section
          id="missing"
          title="Missing information"
          count={c.missing_docs?.length}
        >
          <MissingDocs docs={c.missing_docs} />
        </Section>

        <Section
          id="risks"
          title="Risks & inconsistencies"
          count={c.risks?.length}
        >
          <Risks risks={c.risks} />
        </Section>

        <Section id="compliance" title="Compliance" count={c.compliance_flags?.length}>
          <Compliance flags={c.compliance_flags} />
        </Section>

        <Section id="timeline" title="Timeline" count={c.timeline?.length}>
          <Timeline events={c.timeline} />
        </Section>
      </main>
    </>
  );
}
