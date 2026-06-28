import { UploadZone } from "@/components/upload-zone";
import { RecentCases } from "@/components/recent-cases";
import { TopBar } from "@/components/ui/top-bar";
import { listCases } from "@/lib/store";

export default async function Home() {
  const recent = await listCases();

  return (
    <>
      <TopBar container="max-w-2xl" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
        <div className="flex flex-1 flex-col justify-center pb-20 pt-12">
          <h1 className="mb-1 text-lg font-semibold tracking-tight">
            Understand a case in under a minute
          </h1>
          <p className="mb-6 text-sm text-muted">
            Upload everything you have. Undark reads it, reconstructs the case,
            and tells you what is missing and what to do next.
          </p>
          <UploadZone />
          {recent.length > 0 && <RecentCases cases={recent} />}
        </div>
      </main>
    </>
  );
}
