import { UploadZone } from "@/components/upload-zone";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
      <header className="flex items-center justify-between py-5">
        <span className="text-sm font-semibold tracking-tight">Undark</span>
        <span className="text-xs text-faint">Case Intelligence</span>
      </header>

      <div className="flex flex-1 flex-col justify-center pb-24">
        <h1 className="mb-1 text-lg font-semibold tracking-tight">
          Understand a case in under a minute
        </h1>
        <p className="mb-6 text-sm text-muted">
          Upload everything you have. Undark reads it, reconstructs the case,
          and tells you what is missing and what to do next.
        </p>
        <UploadZone />
      </div>
    </main>
  );
}
